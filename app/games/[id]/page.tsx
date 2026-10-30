import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import GameFrame from "./game-frame";

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

  return (
    <main className="play-page">
      <header className="play-header">
        <a href="/" className="play-back"><ArrowLeft size={16} /> GameVault</a>
        <span className="play-safe"><ShieldCheck size={15} /> Isolated game view</span>
      </header>
      <section className="play-intro">
        <div className="section-kicker">{isHtml ? "PUBLISHED HTML GAME" : "EXTERNAL WEB GAME"}</div>
        <h1>{game.title}</h1>
        {game.description ? <p>{game.description}</p> : <p>This game is displayed in a restricted frame. The external site may limit embedding or require features that the sandbox disables.</p>}
        {externalUrl ? <a className="play-open-source" href={externalUrl.toString()} target="_blank" rel="noopener noreferrer nofollow"><ExternalLink size={15} /> Open original website</a> : null}
        {isHtml ? <a className="play-open-source" href={"https://github.com/slgamervn/aaa/tree/main/gamevault-submissions/" + game.id} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> View published source on GitHub</a> : null}
      </section>
      <GameFrame
        title={game.title}
        src={embeddedUrl}
        sandbox={isHtml ? "allow-scripts" : "allow-scripts allow-forms"}
        unavailableMessage="GameVault chỉ nhúng đường dẫn HTTPS. Bạn vẫn có thể mở trang gốc bằng nút phía trên."
      />
      <p className="play-disclaimer">{isHtml
        ? "The uploaded HTML runs in a restricted sandbox. Network requests and form submissions are disabled. Some games that require external APIs or persistent browser storage may not work."
        : "The original website is embedded in a restricted sandbox. Some websites prohibit iframe embedding or require cookies, storage, popups, or other permissions; if the game does not appear, use “Open original website” above."}</p>
    </main>
  );
}
