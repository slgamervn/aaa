import { expect, test } from "@playwright/test";
import { getTrustedVercelClientIp } from "../lib/trusted-client-ip";

test.describe("trusted Vercel client IP selection", () => {
  test("prefers the Vercel-namespaced header over other IP headers", () => {
    const headers = new Headers({
      "x-vercel-forwarded-for": "198.51.100.10",
      "x-forwarded-for": "198.51.100.20",
      "x-real-ip": "198.51.100.30"
    });

    expect(getTrustedVercelClientIp(headers)).toBe("198.51.100.10");
  });

  test("uses Vercel-overwritten X-Forwarded-For when the namespaced header is absent", () => {
    const headers = new Headers({
      "x-forwarded-for": "2001:db8::10",
      "x-real-ip": "198.51.100.30"
    });

    expect(getTrustedVercelClientIp(headers)).toBe("2001:db8::10");
  });

  test("rejects missing or malformed trusted IP headers", () => {
    expect(getTrustedVercelClientIp(new Headers({
      "x-real-ip": "198.51.100.30"
    }))).toBeNull();

    expect(getTrustedVercelClientIp(new Headers({
      "x-vercel-forwarded-for": "not-an-ip",
      "x-forwarded-for": "also-not-an-ip"
    }))).toBeNull();
  });
});
