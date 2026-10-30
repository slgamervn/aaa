import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BUCKET = "gamevault-quarantine";

function textResponse(message: string, status: number) {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer"
    }
  });
}

function makeDownloadFilename(originalFilename: string | null, title: string | null): {
  filename: string;
  headerValue: string;
} {
  const rawName = (originalFilename || title || "project")
    .normalize("NFKC")
    .replace(/[\\/\u0000-\u001f\u007f]/g, "_")
    .replace(/[<>:"|?*]/g, "_")
    .trim()
    .slice(0, 160);

  const filename = /\.html?$/i.test(rawName) ? rawName : (rawName || "project") + ".html";
  const asciiFallback = filename
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\;]/g, "_")
    .replace(/[^A-Za-z0-9._ -]/g, "_")
    .slice(0, 140) || "project.html";
  const encodedFilename = encodeURIComponent(filename).replace(/['()*]/g, (character) =>
    "%" + character.charCodeAt(0).toString(16).toUpperCase()
  );

  return {
    filename,
    headerValue: 'attachment; filename="' + asciiFallback + '"; filename*=UTF-8\'\'' + encodedFilename
  };
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return textResponse("Project not found.", 404);

  try {
    const admin = createAdminClient();
    const { data: project, error: queryError } = await admin
      .from("gamevault_submissions")
      .select("id,title,kind,storage_path,original_filename,status")
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle();

    if (queryError) {
      console.error("GameVault project download query failed:", queryError.code);
      return textResponse("The project is temporarily unavailable.", 503);
    }

    if (!project || project.kind !== "html" || !project.storage_path) {
      return textResponse("Published HTML project not found.", 404);
    }

    const { data: file, error: downloadError } = await admin.storage
      .from(BUCKET)
      .download(project.storage_path);

    if (downloadError || !file) {
      console.error("GameVault project file download failed:", downloadError?.message);
      return textResponse("The project file is temporarily unavailable.", 503);
    }

    const bytes = await file.arrayBuffer();
    const attachment = makeDownloadFilename(project.original_filename, project.title);

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": attachment.headerValue,
        "Content-Length": String(bytes.byteLength),
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Cache-Control": "private, no-store, max-age=0",
        "Referrer-Policy": "no-referrer"
      }
    });
  } catch {
    return textResponse("Project downloads are not configured yet.", 503);
  }
}
