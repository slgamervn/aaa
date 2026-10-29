import { createHash, createHmac, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_HTML_BYTES, SCAN_VERSION, scanHtml, scanRemoteUrl, scanUrl } from "@/lib/scanner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const MAX_REQUEST_BYTES = 1_100_000;
const BUCKET = "gamevault-quarantine";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function cleanText(value: FormDataEntryValue | null, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function getFingerprint(request: NextRequest, secret: string): string {
  const forwarded = request.headers.get("x-real-ip") ??
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unavailable";
  return createHmac("sha256", secret).update(forwarded).digest("hex");
}

async function logEvent(
  admin: ReturnType<typeof createAdminClient>,
  submissionId: string,
  action: "submitted" | "scan_failed",
  details: Record<string, unknown> = {},
  note?: string
) {
  const { error } = await admin.from("gamevault_submission_events").insert({
    submission_id: submissionId,
    action,
    details,
    note: note?.slice(0, 1000) ?? null
  });
  if (error) console.error("GameVault audit event write failed:", error.code);
}

export async function POST(request: NextRequest) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_REQUEST_BYTES) return json({ error: "The request exceeds the 1 MB upload limit." }, 413);

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    return json({ error: "Send a multipart form with an HTML file or a URL." }, 415);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "The submission form could not be read." }, 400);
  }

  if (cleanText(form.get("website"), 200)) {
    return json({ error: "The submission could not be processed." }, 400);
  }

  const kind = cleanText(form.get("kind"), 12);
  if (kind !== "html" && kind !== "url") return json({ error: "Choose an HTML file or a URL." }, 400);
  if (form.get("rightsConfirmed") !== "true") return json({ error: "Please confirm that you have permission to share this content." }, 400);

  const titleInput = cleanText(form.get("title"), 80);
  const description = cleanText(form.get("description"), 240);
  const allowedGenres = new Set(["arcade", "strategy", "puzzle", "action", "simulation", "educational", "other"]);
  const submittedGenre = cleanText(form.get("genre"), 24);
  const genre = allowedGenres.has(submittedGenre) ? submittedGenre : "other";

  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) return json({ error: "Server storage is not configured. Please try again later." }, 503);

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return json({ error: "Server storage is not configured. Please try again later." }, 503);
  }

  const requestFingerprint = getFingerprint(request, secret);
  const { data: allowed, error: limitError } = await admin.rpc("gamevault_consume_rate_limit", {
    p_key_hash: requestFingerprint,
    p_max_hits: 6,
    p_window_seconds: 3600
  });
  if (limitError) {
    console.error("GameVault rate-limit check failed:", limitError.code);
    return json({ error: "Submissions are temporarily unavailable. Please try again later." }, 503);
  }
  if (allowed !== true) {
    return json({ error: "Too many submissions from this connection. Please try again in about an hour." }, 429);
  }

  const id = randomUUID();
  const submittedAt = new Date().toISOString();
  let row: Record<string, unknown>;
  let scan: ReturnType<typeof scanHtml> | ReturnType<typeof scanUrl>["result"];
  let originalFilename: string | null = null;
  let htmlBytes: Buffer | null = null;
  let storagePath: string | null = null;
  let sourceUrl: string | null = null;
  let resolvedTitle = titleInput;

  if (kind === "html") {
    const file = form.get("file");
    if (!(file instanceof File)) return json({ error: "Choose an .html or .htm file first." }, 400);
    if (!/\.html?$/i.test(file.name)) return json({ error: "Only .html and .htm files are accepted." }, 415);
    if (file.size <= 0) return json({ error: "The selected HTML file is empty." }, 400);
    if (file.size > MAX_HTML_BYTES) return json({ error: "The HTML file exceeds the 1 MB limit." }, 413);

    originalFilename = file.name.replace(/[\\/]/g, "_").replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 180) || "game.html";
    htmlBytes = Buffer.from(await file.arrayBuffer());
    if (htmlBytes.byteLength > MAX_HTML_BYTES) return json({ error: "The HTML file exceeds the 1 MB limit." }, 413);
    const html = htmlBytes.toString("utf8");
    scan = scanHtml(html);
    resolvedTitle = resolvedTitle || originalFilename.slice(0, 80);
    storagePath = id + "/index.html";
    row = {
      id, title: resolvedTitle, description, genre, kind,
      source_url: null, storage_path: storagePath, original_filename: originalFilename,
      file_size: htmlBytes.byteLength, content_sha256: createHash("sha256").update(htmlBytes).digest("hex"),
      scan_verdict: scan.verdict, scan_score: scan.score, scan_findings: scan.findings,
      scan_version: SCAN_VERSION, status: "pending_review", rights_confirmed: true,
      request_fingerprint: requestFingerprint, submitted_at: submittedAt, updated_at: submittedAt
    };
  } else {
    const inputUrl = cleanText(form.get("url"), 2048);
    if (!inputUrl) return json({ error: "Enter the game URL to check." }, 400);
    let checked: ReturnType<typeof scanUrl>;
    try {
      checked = scanUrl(inputUrl);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "The URL is invalid." }, 400);
    }
    sourceUrl = checked.url;
    // Fetch and analyse the public page server-side. The scanner validates and
    // pins each public IP, revalidates every redirect, and never executes HTML/JS.
    scan = await scanRemoteUrl(checked.url);
    resolvedTitle = resolvedTitle || checked.host.slice(0, 80);
    row = {
      id, title: resolvedTitle, description, genre, kind,
      source_url: sourceUrl, storage_path: null, original_filename: null,
      file_size: 0, content_sha256: null,
      scan_verdict: scan.verdict, scan_score: scan.score, scan_findings: scan.findings,
      scan_version: SCAN_VERSION, status: "pending_review", rights_confirmed: true,
      request_fingerprint: requestFingerprint, submitted_at: submittedAt, updated_at: submittedAt
    };
  }

  const { error: insertError } = await admin.from("gamevault_submissions").insert(row);
  if (insertError) {
    console.error("GameVault submission insert failed:", insertError.code);
    return json({ error: "The submission could not be saved. Please try again later." }, 503);
  }

  if (kind === "html" && htmlBytes && storagePath) {
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(storagePath, htmlBytes, {
      contentType: "text/html",
      cacheControl: "0",
      upsert: false
    });

    if (uploadError) {
      await admin.from("gamevault_submissions").update({ status: "scan_failed", updated_at: new Date().toISOString() }).eq("id", id);
      await logEvent(admin, id, "scan_failed", { reason: "quarantine_upload_failed" });
      console.error("GameVault quarantine upload failed:", uploadError.message);
      return json({ error: "The file could not be placed in private quarantine. No publication occurred." }, 503);
    }
  }

  await logEvent(admin, id, "submitted", {
    kind,
    bytes: typeof row.file_size === "number" ? row.file_size : 0,
    scan_version: SCAN_VERSION
  });

  return json({
    mode: scan.mode,
    verdict: scan.verdict,
    score: scan.score,
    findings: scan.findings,
    message: scan.message,
    bytes: scan.bytes ?? 0,
    contentScanned: scan.contentScanned ?? (scan.mode === "html"),
    scannedResources: scan.scannedResources ?? (scan.mode === "html" ? 1 : 0),
    submission: { id, status: "pending_review", submittedAt, title: resolvedTitle }
  }, 201);
}
