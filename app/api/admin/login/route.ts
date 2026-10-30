import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sameOriginRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function usernameMatches(input: string, expected: string): boolean {
  const inputBytes = Buffer.from(input.trim().toLowerCase(), "utf8");
  const expectedBytes = Buffer.from(expected.trim().toLowerCase(), "utf8");
  return inputBytes.length === expectedBytes.length && timingSafeEqual(inputBytes, expectedBytes);
}

export async function POST(request: NextRequest) {
  if (!sameOriginRequest(request)) {
    return json({ error: "Yêu cầu đăng nhập không hợp lệ." }, 403);
  }

  if (!(request.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    return json({ error: "Yêu cầu đăng nhập không hợp lệ." }, 415);
  }

  const declaredSize = Number(request.headers.get("content-length") ?? 0);
  if (declaredSize > 2048) {
    return json({ error: "Thông tin đăng nhập quá dài." }, 413);
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return json({ error: "Không thể đọc thông tin đăng nhập." }, 400);
  }
  if (Buffer.byteLength(rawBody, "utf8") > 2048) {
    return json({ error: "Thông tin đăng nhập quá dài." }, 413);
  }

  let body: { username?: unknown; password?: unknown };
  try {
    body = JSON.parse(rawBody) as { username?: unknown; password?: unknown };
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid login body");
  } catch {
    return json({ error: "Thông tin đăng nhập không hợp lệ." }, 400);
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username) || password.length < 8 || password.length > 256) {
    return json({ error: "Tên đăng nhập hoặc mật khẩu không đúng." }, 401);
  }

  const configuredUsername = process.env.GAMEVAULT_ADMIN_USERNAME ?? "";
  const allowedEmails = (process.env.GAMEVAULT_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  // This login alias intentionally maps to one existing, allowlisted Supabase Auth identity.
  if (!configuredUsername || allowedEmails.length !== 1) {
    return json({ error: "Đăng nhập quản trị chưa được cấu hình đầy đủ." }, 503);
  }

  if (!usernameMatches(username, configuredUsername)) {
    return json({ error: "Tên đăng nhập hoặc mật khẩu không đúng." }, 401);
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: allowedEmails[0],
      password
    });

    if (error || !data.user?.email || data.user.email.trim().toLowerCase() !== allowedEmails[0]) {
      if (data.session) await supabase.auth.signOut();
      return json({ error: "Tên đăng nhập hoặc mật khẩu không đúng." }, 401);
    }

    return json({ ok: true });
  } catch {
    return json({ error: "Không thể đăng nhập lúc này. Hãy thử lại sau." }, 503);
  }
}
