import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AdminAccess =
  | { ok: true; client: SupabaseClient; email: string }
  | { ok: false; status: 401 | 403 | 503; error: string };

export async function requireAdminAccess(): Promise<AdminAccess> {
  const allowlist = (process.env.GAMEVAULT_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.length === 0) {
    return {
      ok: false,
      status: 503,
      error: "Admin access is not configured. Set GAMEVAULT_ADMIN_EMAILS in Vercel."
    };
  }

  try {
    const authClient = await createServerSupabaseClient();
    const { data, error } = await authClient.auth.getUser();

    if (error || !data.user?.email) {
      return { ok: false, status: 401, error: "Please sign in as a GameVault administrator." };
    }

    const email = data.user.email.trim().toLowerCase();
    if (!allowlist.includes(email)) {
      return { ok: false, status: 403, error: "This account is not authorized to manage GameVault." };
    }

    return { ok: true, client: createAdminClient(), email };
  } catch {
    return { ok: false, status: 503, error: "Server authentication or storage is not configured." };
  }
}

export function sameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}
