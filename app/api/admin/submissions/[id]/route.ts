import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess, sameOriginRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

function githubHeaders(token: string) {
  return {
    "Accept": "application/vnd.github+json",
    "Authorization": "Bearer " + token,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json"
  };
}

async function pushApprovedContent(
  repo: string,
  branch: string,
  token: string,
  path: string,
  content: Buffer,
  title: string
): Promise<{ commitSha: string; browseUrl: string }> {
  const segments = path.split("/").map(encodeURIComponent).join("/");
  const endpoint = "https://api.github.com/repos/" + repo + "/contents/" + segments;
  const headers = githubHeaders(token);

  // Support a safe retry if GitHub accepted a previous write but the database update failed.
  const existingResponse = await fetch(endpoint + "?ref=" + encodeURIComponent(branch), {
    headers,
    cache: "no-store"
  });
  let existingSha: string | undefined;
  if (existingResponse.ok) {
    const existing = await existingResponse.json() as { sha?: string };
    existingSha = existing.sha;
  } else if (existingResponse.status !== 404) {
    throw new Error("GitHub could not verify the target path.");
  }

  const payload: Record<string, unknown> = {
    message: "Publish reviewed GameVault submission: " + title.slice(0, 80),
    content: content.toString("base64"),
    branch
  };
  if (existingSha) payload.sha = existingSha;

  const response = await fetch(endpoint, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("GameVault GitHub publish failed:", response.status, detail.slice(0, 400));
    throw new Error("GitHub rejected the publication request. Check the token's repository permissions and branch.");
  }

  const result = await response.json() as { commit?: { sha?: string } };
  const commitSha = result.commit?.sha;
  if (!commitSha) throw new Error("GitHub did not return a commit identifier.");

  return {
    commitSha,
    browseUrl: "https://github.com/" + repo + "/blob/" + encodeURIComponent(branch) + "/" + path
  };
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!sameOriginRequest(request)) return json({ error: "Cross-origin requests are not accepted." }, 403);
  if (!(request.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    return json({ error: "Send a JSON action." }, 415);
  }
  const bodySize = Number(request.headers.get("content-length") ?? 0);
  if (bodySize > 5000) return json({ error: "The request is too large." }, 413);

  const access = await requireAdminAccess();
  if (!access.ok) return json({ error: access.error }, access.status);

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return json({ error: "Submission not found." }, 404);

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return json({ error: "The request could not be read." }, 400);
  }
  if (Buffer.byteLength(rawBody, "utf8") > 5000) return json({ error: "The request is too large." }, 413);

  let body: { action?: unknown; note?: unknown };
  try {
    body = JSON.parse(rawBody) as { action?: unknown; note?: unknown };
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid request body");
  } catch {
    return json({ error: "The request is not valid JSON." }, 400);
  }

  const action = typeof body.action === "string" ? body.action : "";
  const note = typeof body.note === "string" ? body.note.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 1000) : "";

  if (action === "approve" || action === "reject") {
    const { data: item, error: readError } = await access.client
      .from("gamevault_submissions")
      .select("id,kind,storage_path,status")
      .eq("id", id)
      .maybeSingle();

    if (readError || !item) return json({ error: "Submission not found." }, 404);
    if (action === "approve" && item.status !== "pending_review") {
      return json({ error: "Only a submission awaiting review can be approved." }, 409);
    }
    if (action === "reject" && item.status !== "pending_review" && item.status !== "scan_failed") {
      return json({ error: "This submission can no longer be rejected from the review queue." }, 409);
    }

    if (action === "approve" && item.kind === "html") {
      if (!item.storage_path) return json({ error: "The private source file is missing; this submission cannot be approved." }, 409);
      const { data: source, error: sourceError } = await access.client.storage
        .from("gamevault-quarantine")
        .download(item.storage_path);
      if (sourceError || !source) return json({ error: "The private source file is missing; this submission cannot be approved." }, 409);
    }

    const { data, error } = await access.client.rpc("gamevault_review_submission", {
      p_submission_id: id,
      p_action: action,
      p_actor_email: access.email,
      p_note: note || null
    });
    if (error) {
      if (error.message.includes("SUBMISSION_NOT_PENDING")) {
        return json({ error: "The submission changed before this review completed. Refresh the queue and try again." }, 409);
      }
      console.error("GameVault review transition failed:", error.code);
      return json({ error: "The review action could not be saved." }, 503);
    }
    return json({ submission: data });
  }

  if (action === "unpublish") {
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_PUBLISH_REPO || "slgamervn/aaa";
    const branch = process.env.GITHUB_PUBLISH_BRANCH || "main";
    if (!token) return json({ error: "GitHub removal is not configured. Add GITHUB_TOKEN in Vercel before removing a published game." }, 503);
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
      return json({ error: "GITHUB_PUBLISH_REPO must use owner/repository format." }, 503);
    }

    const { data: item, error: readError } = await access.client
      .from("gamevault_submissions")
      .select("id,title,kind,status,published_path,updated_at")
      .eq("id", id)
      .maybeSingle();
    if (readError || !item) return json({ error: "Submission not found." }, 404);

    if (item.status === "unpublishing") {
      const updatedAt = Date.parse(item.updated_at);
      const stale = Number.isFinite(updatedAt) && Date.now() - updatedAt > 10 * 60 * 1000;
      if (!stale) return json({ error: "This game is already being removed. Refresh the queue and try again shortly." }, 409);
    } else if (item.status !== "published") {
      return json({ error: "Only a published game can be removed from the public library." }, 409);
    }

    const expectedPath = "gamevault-submissions/" + id + (item.kind === "html" ? "/index.html" : "/submission.json");
    if (item.published_path !== expectedPath) {
      return json({ error: "The published path does not match this submission. No GitHub file was changed." }, 409);
    }

    if (item.status === "published") {
      const { data: locked, error: lockError } = await access.client
        .from("gamevault_submissions")
        .update({ status: "unpublishing", updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("status", "published")
        .select("id")
        .maybeSingle();
      if (lockError || !locked) return json({ error: "The game changed before removal could start. Refresh and try again." }, 409);
    } else {
      const { error: relockError } = await access.client
        .from("gamevault_submissions")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("status", "unpublishing");
      if (relockError) return json({ error: "The removal could not be resumed. Please try again." }, 503);
    }

    const segments = expectedPath.split("/").map(encodeURIComponent).join("/");
    const endpoint = "https://api.github.com/repos/" + repo + "/contents/" + segments;
    const headers = githubHeaders(token);
    let removalConfirmed = false;

    try {
      const existingResponse = await fetch(endpoint + "?ref=" + encodeURIComponent(branch), {
        headers,
        cache: "no-store"
      });

      if (existingResponse.status === 404) {
        // GitHub may have accepted a previous delete even if the database update failed.
        removalConfirmed = true;
      } else if (!existingResponse.ok) {
        throw new Error("GitHub could not verify the published file.");
      } else {
        const existing = await existingResponse.json() as { sha?: string };
        if (!existing.sha) throw new Error("GitHub did not return the published file identifier.");

        const deleteResponse = await fetch(endpoint, {
          method: "DELETE",
          headers,
          body: JSON.stringify({
            message: "Unpublish GameVault submission: " + item.title.slice(0, 80),
            sha: existing.sha,
            branch
          }),
          cache: "no-store"
        });
        if (!deleteResponse.ok && deleteResponse.status !== 404) {
          const detail = await deleteResponse.text();
          console.error("GameVault GitHub removal failed:", deleteResponse.status, detail.slice(0, 400));
          throw new Error("GitHub rejected the removal request. Check the token's repository permissions and branch.");
        }
        removalConfirmed = true;
      }

      const now = new Date().toISOString();
      const { error: updateError } = await access.client
        .from("gamevault_submissions")
        .update({
          status: "approved",
          published_at: null,
          published_path: null,
          published_commit_sha: null,
          updated_at: now
        })
        .eq("id", id)
        .eq("status", "unpublishing");

      if (updateError) {
        console.error("GameVault unpublish status update failed:", updateError.code);
        return json({ error: "The GitHub file was removed, but the database status could not be updated. Retry removal to reconcile it." }, 503);
      }

      const { error: eventError } = await access.client.from("gamevault_submission_events").insert({
        submission_id: id,
        action: "unpublished",
        actor_email: access.email,
        note: note || null,
        details: { repository: repo, branch, path: expectedPath }
      });
      if (eventError) console.error("GameVault unpublish audit event failed:", eventError.code);

      return json({ unpublished: true, status: "approved" });
    } catch (error) {
      if (!removalConfirmed) {
        await access.client.from("gamevault_submissions")
          .update({ status: "published", updated_at: new Date().toISOString() })
          .eq("id", id)
          .eq("status", "unpublishing");
      }
      const message = error instanceof Error ? error.message : "Removal failed.";
      return json({ error: message }, 502);
    }
  }

  if (action !== "publish") return json({ error: "Unknown submission action." }, 400);

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_PUBLISH_REPO || "slgamervn/aaa";
  const branch = process.env.GITHUB_PUBLISH_BRANCH || "main";
  if (!token) return json({ error: "GitHub publishing is not configured. Add GITHUB_TOKEN in Vercel before publishing." }, 503);
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    return json({ error: "GITHUB_PUBLISH_REPO must use owner/repository format." }, 503);
  }

  const { data: item, error: readError } = await access.client
    .from("gamevault_submissions")
    .select("id,title,description,genre,kind,source_url,storage_path,status,updated_at")
    .eq("id", id)
    .maybeSingle();

  if (readError || !item) return json({ error: "Submission not found." }, 404);

  if (item.status === "publishing") {
    const updatedAt = Date.parse(item.updated_at);
    const stale = Number.isFinite(updatedAt) && Date.now() - updatedAt > 10 * 60 * 1000;
    if (!stale) return json({ error: "This submission is already being published." }, 409);
    await access.client.from("gamevault_submissions")
      .update({ status: "publish_failed", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "publishing");
  } else if (item.status !== "approved" && item.status !== "publish_failed") {
    return json({ error: "Approve this submission first. Publication is a separate, explicit action." }, 409);
  }

  const { data: locked, error: lockError } = await access.client
    .from("gamevault_submissions")
    .update({ status: "publishing", updated_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["approved", "publish_failed"])
    .select("id")
    .maybeSingle();

  if (lockError || !locked) return json({ error: "This submission changed before publication could start. Refresh and try again." }, 409);

  await access.client.from("gamevault_submission_events").insert({
    submission_id: id,
    action: "publish_started",
    actor_email: access.email,
    note: note || null,
    details: { repository: repo, branch }
  });

  try {
    let content: Buffer;
    let outputPath: string;

    if (item.kind === "html") {
      if (!item.storage_path) throw new Error("The private HTML source is missing.");
      const { data: file, error: downloadError } = await access.client.storage.from("gamevault-quarantine").download(item.storage_path);
      if (downloadError || !file) throw new Error("The private HTML source is missing.");
      content = Buffer.from(await file.arrayBuffer());
      if (content.byteLength > 1_000_000) throw new Error("The stored HTML exceeds the publication limit.");
      outputPath = "gamevault-submissions/" + id + "/index.html";
    } else {
      const metadata = {
        schemaVersion: 1,
        submissionId: item.id,
        title: item.title,
        description: item.description,
        genre: item.genre,
        kind: "url",
        sourceUrl: item.source_url,
        note: "Submitted as an external link. GameVault did not fetch, execute, or copy the external page."
      };
      content = Buffer.from(JSON.stringify(metadata, null, 2) + "\n", "utf8");
      outputPath = "gamevault-submissions/" + id + "/submission.json";
    }

    const pushed = await pushApprovedContent(repo, branch, token, outputPath, content, item.title);
    const publishedAt = new Date().toISOString();
    const { error: updateError } = await access.client.from("gamevault_submissions").update({
      status: "published",
      published_at: publishedAt,
      published_path: outputPath,
      published_commit_sha: pushed.commitSha,
      updated_at: publishedAt
    }).eq("id", id).eq("status", "publishing");

    if (updateError) {
      console.error("GameVault publish status update failed:", updateError.code);
      return json({ error: "The GitHub commit succeeded, but the status update did not. Retry publication to reconcile it." }, 503);
    }

    await access.client.from("gamevault_submission_events").insert({
      submission_id: id,
      action: "published",
      actor_email: access.email,
      details: { repository: repo, branch, path: outputPath, commit_sha: pushed.commitSha }
    });

    return json({ published: true, commitSha: pushed.commitSha, sourceUrl: pushed.browseUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publication failed.";
    const now = new Date().toISOString();
    await access.client.from("gamevault_submissions").update({
      status: "publish_failed",
      review_note: note || null,
      updated_at: now
    }).eq("id", id).eq("status", "publishing");
    await access.client.from("gamevault_submission_events").insert({
      submission_id: id,
      action: "publish_failed",
      actor_email: access.email,
      note: message.slice(0, 1000),
      details: { repository: repo, branch }
    });
    return json({ error: message }, 502);
  }
}
