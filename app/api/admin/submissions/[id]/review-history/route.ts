import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const access = await requireAdminAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { data, error } = await access.client
    .from("gamevault_submission_events")
    .select("id,action,actor_email,note,details,created_at")
    .eq("submission_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: "Review history is unavailable." }, { status: 503 });
  return NextResponse.json({ events: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}
