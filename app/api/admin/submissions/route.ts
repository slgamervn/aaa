import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, {
      status: access.status,
      headers: { "Cache-Control": "private, no-store" }
    });
  }

  const { data, error } = await access.client
    .from("gamevault_submissions")
    .select("id,title,description,genre,kind,source_url,original_filename,file_size,content_sha256,scan_verdict,scan_score,scan_findings,scan_version,status,submitted_at,reviewed_at,reviewed_by,review_note,published_at,published_path,published_commit_sha,updated_at")
    .order("submitted_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("GameVault admin queue read failed:", error.code);
    return NextResponse.json({ error: "The review queue is temporarily unavailable." }, {
      status: 503,
      headers: { "Cache-Control": "private, no-store" }
    });
  }

  return NextResponse.json({ submissions: data ?? [], adminEmail: access.email }, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
