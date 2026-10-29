import { NextRequest } from "next/server";
import { requireAdminAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return new Response(access.error, {
      status: access.status,
      headers: { "Cache-Control": "private, no-store", "Content-Type": "text/plain; charset=utf-8" }
    });
  }

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return new Response("Not found", { status: 404 });

  const { data: item, error } = await access.client
    .from("gamevault_submissions")
    .select("id,kind,storage_path,status")
    .eq("id", id)
    .maybeSingle();

  if (error || !item || item.kind !== "html" || !item.storage_path) {
    return new Response("Source not found", { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }

  const { data: file, error: downloadError } = await access.client.storage
    .from("gamevault-quarantine")
    .download(item.storage_path);

  if (downloadError || !file) {
    return new Response("Source unavailable", { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }

  return new Response(await file.text(), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="game-source-' + id + '.txt"',
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, no-store, max-age=0",
      "Referrer-Policy": "no-referrer"
    }
  });
}
