import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  if (!game || game.kind !== "html") notFound();

  return (
    <main className="play-page">
      <header className="play-header">
        <a href="/" className="play-back"><ArrowLeft size={16} /> GameVault</a>
        <span className="play-safe"><ShieldCheck size={15} /> Isolated game view</span>
      </header>
      <section className="play-intro">
        <div className="section-kicker">PUBLISHED GAME</div>
        <h1>{game.title}</h1>
        {game.description ? <p>{game.description}</p> : <p>This game runs in an isolated sandbox. It cannot access the main GameVault page's origin or storage.</p>}
        <a className="play-open-source" href={"https://github.com/slgamervn/aaa/tree/main/gamevault-submissions/" + game.id} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> View published source on GitHub</a>
      </section>
      <section className="play-frame-wrap" aria-label="Game frame">
        <iframe
          title={game.title}
          src={"/api/games/" + game.id}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          allow="fullscreen; gamepad"
          allowFullScreen
        />
      </section>
      <p className="play-disclaimer">The game runs in a restricted sandbox. Network requests and form submissions are disabled. Some games that require external APIs or persistent browser storage may not work.</p>
    </main>
  );
}
