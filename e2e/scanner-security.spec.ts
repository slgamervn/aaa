import { expect, test } from "@playwright/test";
import { isPrivateOrLocalHost } from "../lib/scanner";

test.describe("scanner IPv6 address filtering", () => {
  test("rejects the IANA 2001::/23 special-purpose reservation", () => {
    for (const address of [
      "2001::1",
      "2001:0:1::1",
      "2001:1::1",
      "2001:2::1",
      "2001:db8::1"
    ]) {
      expect(isPrivateOrLocalHost(address), `${address} must not be treated as a public fetch target`).toBe(true);
    }
  });

  test("continues to accept ordinary global-unicast IPv6 addresses", () => {
    expect(isPrivateOrLocalHost("2606:4700:4700::1111")).toBe(false);
  });
});
