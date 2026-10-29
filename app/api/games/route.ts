import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("gamevault_submissions")
      .select("id,title,description,genre,kind,source_url,original_filename,published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(60);

    if (error) {
      console.error("GameVault public catalog query failed:", error.code);
      return NextResponse.json({ error: "The public catalog is temporarily unavailable." }, { status: 503 });
    }

    return NextResponse.json({
      games: (data ?? []).map((game) => ({
        id: game.id,
        title: game.title,
        description: game.description,
        genre: game.genre,
        kind: game.kind,
        sourceUrl: game.source_url,
        originalFilename: game.original_filename,
        publishedAt: game.published_at
      }))
    }, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return NextResponse.json({ error: "The public catalog is not configured yet." }, { status: 503 });
  }
}
