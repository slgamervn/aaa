import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GAME_CSP = [
  "default-src 'none'",
  "sandbox allow-scripts",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  "font-src data:",
  "media-src data: blob:",
  "frame-src 'none'",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'self'"
].join("; ");

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return new Response("Not found", { status: 404 });

  try {
    const admin = createAdminClient();
    const { data: game, error } = await admin
      .from("gamevault_submissions")
      .select("id,kind,storage_path,status")
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle();

    if (error || !game || game.kind !== "html" || !game.storage_path) {
      return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    const { data: file, error: downloadError } = await admin.storage
      .from("gamevault-quarantine")
      .download(game.storage_path);

    if (downloadError || !file) {
      console.error("GameVault published source download failed:", downloadError?.message);
      return new Response("Game content is temporarily unavailable", {
        status: 503,
        headers: { "Cache-Control": "no-store" }
      });
    }

    const bytes = await file.arrayBuffer();
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": GAME_CSP,
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
        "Cross-Origin-Resource-Policy": "same-origin",
        "Referrer-Policy": "no-referrer",
        "Cache-Control": "no-store, max-age=0"
      }
    });
  } catch {
    return new Response("Game content is not configured yet", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
