import { isIP } from "node:net";

/**
 * Return only a client IP forwarded by Vercel's edge.
 *
 * Do not trust X-Real-IP or arbitrary request headers here. Vercel overwrites
 * X-Forwarded-For at the edge; prefer its namespaced equivalent when present.
 */
export function getTrustedVercelClientIp(
  headers: Pick<Headers, "get">
): string | null {
  const candidates = [
    headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim(),
    headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  ];

  return candidates.find(
    (value): value is string => Boolean(value && isIP(value) !== 0)
  ) ?? null;
}
