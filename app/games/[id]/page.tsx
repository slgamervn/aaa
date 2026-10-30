import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import GamePlayer from "./game-player";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseExternalUrl(value: string | null): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();

  let game: { id: string; title: string; description: string; kind: string; source_url: string | null; published_at: string | null } | null = null;
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("gamevault_submissions")
      .select("id,title,description,kind,source_url,published_at")
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle();
    game = data;
  } catch {
    notFound();
  }

  if (!game || (game.kind !== "html" && game.kind !== "url")) notFound();

  const isHtml = game.kind === "html";
  const externalUrl = parseExternalUrl(game.source_url);
  const embeddedUrl = isHtml ? "/api/games/" + game.id : externalUrl?.protocol === "https:" ? externalUrl.toString() : null;
  const sourceUrl = isHtml
    ? "https://github.com/slgamervn/aaa/tree/main/gamevault-submissions/" + game.id
    : null;

  return (
    <GamePlayer
      game={{
        title: game.title,
        description: game.description,
        kind: isHtml ? "html" : "url",
        externalUrl: externalUrl?.toString() ?? null,
        embeddedUrl,
        sourceUrl
      }}
    />
  );
}
