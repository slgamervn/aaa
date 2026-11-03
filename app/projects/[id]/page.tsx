import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import ProjectDetails from "../../games/[id]/game-player";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseExternalUrl(value: string | null): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) return null;
    return url;
  } catch { return null; }
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();
  let project: { id: string; title: string; description: string; kind: string; source_url: string | null; published_at: string | null; published_path: string | null; published_commit_sha: string | null; orientation: "auto" | "landscape" | "portrait" } | null = null;
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("gamevault_submissions")
      .select("id,title,description,kind,source_url,published_at,published_path,published_commit_sha,orientation")
      .eq("id", id).eq("status", "published").maybeSingle();
    project = data;
  } catch { notFound(); }
  if (!project || (project.kind !== "html" && project.kind !== "url")) notFound();
  const isHtml = project.kind === "html";
  const externalUrl = parseExternalUrl(project.source_url);
  const expectedPublishedPath = "gamevault-submissions/" + project.id + "/index.html";
  const repository = process.env.GITHUB_PUBLISH_REPO || "slgamervn/aaa";
  const branch = process.env.GITHUB_PUBLISH_BRANCH || "main";
  const validRepository = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository);
  const commitRef = /^[a-f0-9]{40}$/i.test(project.published_commit_sha ?? "")
    ? project.published_commit_sha!
    : branch;
  const sourceUrl = isHtml && validRepository && project.published_path === expectedPublishedPath
    ? "https://github.com/" + repository + "/blob/" +
      commitRef.split("/").map(encodeURIComponent).join("/") + "/" +
      expectedPublishedPath.split("/").map(encodeURIComponent).join("/")
    : null;
  return <ProjectDetails project={{
    title: project.title, description: project.description,
    kind: isHtml ? "html" : "url",
    externalUrl: externalUrl?.toString() ?? null,
    embeddedUrl: isHtml ? "/api/games/" + project.id : externalUrl?.toString() ?? null,
    orientation: project.orientation === "landscape" || project.orientation === "portrait" ? project.orientation : "auto",
    sourceUrl, downloadUrl: isHtml ? "/api/games/" + project.id + "/download" : null
  }} />;
}
