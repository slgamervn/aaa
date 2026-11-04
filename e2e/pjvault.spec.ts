import { expect, test, type Page } from "@playwright/test";

const BASE_URL = new URL(
  process.env.PLAYWRIGHT_BASE_URL ?? "https://pjvault-git-design-humanized-library-slg-7f71.vercel.app"
).origin;
type PublishedProject = {
  id: string;
  title: string;
  kind: "html" | "url";
  sourceUrl: string | null;
  genre: string;
};

async function getPublishedUrlProject(page: Page): Promise<PublishedProject> {
  const response = await page.request.get(`${BASE_URL}/api/games`);
  expect(response.ok(), "The published catalogue API should be available").toBeTruthy();

  const body = await response.json() as { games?: PublishedProject[] };
  const project = (body.games ?? []).find(
    (item) => item.kind === "url" && typeof item.sourceUrl === "string"
  );

  expect(project, "At least one published URL project is needed for preview tests").toBeTruthy();
  return project!;
}

async function getPublishedHtmlProject(page: Page): Promise<PublishedProject> {
  const response = await page.request.get(`${BASE_URL}/api/games`);
  expect(response.ok(), "The published catalogue API should be available").toBeTruthy();

  const body = await response.json() as { games?: PublishedProject[] };
  const project = (body.games ?? []).find((item) => item.kind === "html");

  expect(project, "At least one published HTML project is needed for sandbox tests").toBeTruthy();
  return project!;
}

async function openProjectDetail(page: Page, project: PublishedProject) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Thư viện dự án" })).toBeVisible();

  const card = page.locator("article.game-card").filter({ hasText: project.title });
  await expect(card).toBeVisible();
  await card.getByRole("link", { name: "Mở dự án" }).click();

  await expect(page).toHaveURL(new RegExp(`/projects/${project.id}$`));
  await expect(page.getByRole("heading", { name: project.title, exact: true })).toBeVisible();
  // The detail page is server-rendered; wait for its client effect before testing click handlers.
  await expect(page.locator("html")).toHaveAttribute("data-theme", /^(paper|night)$/);
}

test.describe("PJVault library", () => {
  test("search and genre filters update the visible project cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Thư viện dự án" })).toBeVisible();

    const cards = page.locator("article.game-card");
    await expect(cards.first()).toBeVisible();

    const search = page.getByRole("textbox", { name: "Tìm dự án" });
    await search.fill("pjvault-e2e-no-such-project");
    await expect(cards).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Không tìm thấy kết quả/ })).toBeVisible();

    await search.clear();
    const actionGroup = page.getByRole("group", { name: "Lọc thể loại" });
    await actionGroup.getByRole("button", { name: "Hành động" }).click();

    const response = await page.request.get(`${BASE_URL}/api/games`);
    const body = await response.json() as { games?: PublishedProject[] };
    const actionProject = (body.games ?? []).find((item) => item.genre === "action");

    expect(actionProject, "The current catalogue should contain an action project").toBeTruthy();
    await expect(cards.filter({ hasText: actionProject!.title })).toBeVisible();
    await expect(cards).toHaveCount(1);
  });

  test("language and appearance preferences persist after reload", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Thư viện dự án" })).toBeVisible();

    await page.getByRole("button", { name: "Switch to English" }).click();
    await expect(page.getByRole("heading", { name: "Project library" })).toBeVisible();

    await page.locator("summary.settings-trigger").click();
    await page.getByRole("button", { name: "Dark appearance" }).click();
    await expect(page.locator(".app-shell")).toHaveAttribute("data-theme", "night");

    await page.reload();
    await expect(page.getByRole("heading", { name: "Project library" })).toBeVisible();
    await expect(page.locator(".app-shell")).toHaveAttribute("data-theme", "night");
  });
});

test.describe("PJVault HTML isolation", () => {
  test("published HTML and download endpoints return their own restrictive headers", async ({ page }) => {
    const project = await getPublishedHtmlProject(page);

    // Inspect stored user HTML over HTTP only; never execute the uploaded source in this test.
    const previewResponse = await page.request.get(`${BASE_URL}/api/games/${project.id}`);
    expect(previewResponse.status()).toBe(200);
    const previewHeaders = await previewResponse.headersArray();
    const previewCsp = previewHeaders.filter((header) => header.name.toLowerCase() === "content-security-policy");
    expect(previewCsp).toHaveLength(1);
    expect(previewCsp[0].value).toContain("sandbox allow-scripts");
    expect(previewCsp[0].value).toContain("frame-ancestors 'self'");
    expect(previewCsp[0].value).not.toContain("frame-ancestors 'none'");
    expect(previewHeaders.find((header) => header.name.toLowerCase() === "x-frame-options")?.value).toBe("SAMEORIGIN");
    expect(previewHeaders.find((header) => header.name.toLowerCase() === "content-type")?.value).toContain("text/html");
    expect(previewHeaders.find((header) => header.name.toLowerCase() === "cache-control")?.value).toContain("no-store");

    const downloadResponse = await page.request.get(`${BASE_URL}/api/games/${project.id}/download`);
    expect(downloadResponse.status()).toBe(200);
    const downloadHeaders = await downloadResponse.headersArray();
    expect(downloadHeaders.find((header) => header.name.toLowerCase() === "content-disposition")?.value).toContain("attachment;");
    expect(downloadHeaders.find((header) => header.name.toLowerCase() === "content-type")?.value).toContain("application/octet-stream");
    const downloadCsp = downloadHeaders.filter((header) => header.name.toLowerCase() === "content-security-policy");
    expect(downloadCsp).toHaveLength(1);
    expect(downloadCsp[0].value).toContain("default-src 'none'");
    expect(downloadCsp[0].value).toContain("sandbox");
  });

  test("HTML preview runs only in an opaque-origin sandbox", async ({ page }) => {
    const project = await getPublishedHtmlProject(page);
    await page.addInitScript(() => {
      window.addEventListener("message", (event) => {
        if (event.data?.type === "pjvault-sandbox-proof") {
          (window as Window & { __pjvaultSandboxProof?: unknown }).__pjvaultSandboxProof = {
            ...event.data,
            eventOrigin: event.origin
          };
        }
      });
    });

    await page.route(`${BASE_URL}/api/games/${project.id}`, (route) => route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      headers: {
        "Content-Security-Policy": "default-src 'none'; sandbox allow-scripts; script-src 'unsafe-inline'; frame-ancestors 'self'",
        "X-Frame-Options": "SAMEORIGIN",
        "X-Content-Type-Options": "nosniff"
      },
      body: `<!doctype html><html><body><script>
        let parentDocumentBlocked = false;
        try { void window.parent.document.documentElement; } catch { parentDocumentBlocked = true; }
        window.parent.postMessage({
          type: "pjvault-sandbox-proof",
          parentDocumentBlocked,
          childOrigin: window.location.origin
        }, "*");
      </script></body></html>`
    }));

    await openProjectDetail(page, project);
    await expect(page.locator("iframe.project-preview-frame")).toHaveCount(0);
    await page.getByRole("button", { name: "Xem trước dự án" }).click();

    const frame = page.locator("iframe.project-preview-frame");
    await expect(frame).toBeVisible();
    const sandbox = (await frame.getAttribute("sandbox") ?? "").split(/\s+/);
    expect(sandbox).toContain("allow-scripts");
    expect(sandbox).not.toContain("allow-same-origin");
    expect(sandbox).not.toContain("allow-forms");

    await expect.poll(() => page.evaluate(
      () => (window as Window & { __pjvaultSandboxProof?: { type?: string; parentDocumentBlocked?: boolean; childOrigin?: string; eventOrigin?: string } }).__pjvaultSandboxProof ?? null
    )).toEqual({
      type: "pjvault-sandbox-proof",
      parentDocumentBlocked: true,
      childOrigin: "null",
      eventOrigin: "null"
    });
  });
});

test.describe("PJVault project preview", () => {
  test("project details do not load the iframe until the visitor opens the preview", async ({ page }) => {
    const project = await getPublishedUrlProject(page);
    if (project.sourceUrl) {
      const origin = new URL(project.sourceUrl).origin;
      await page.route(`${origin}/**`, (route) => route.abort());
    }

    await openProjectDetail(page, project);
    await expect(page.getByRole("heading", { name: "Xem trước dự án" })).toBeVisible();
    await expect(page.locator("iframe.project-preview-frame")).toHaveCount(0);

    await page.getByRole("button", { name: "Xem trước dự án" }).click();
    const frame = page.locator("iframe.project-preview-frame");
    await expect(frame).toBeVisible();
    await expect(frame).toHaveAttribute("src", project.sourceUrl!);
  });

  test("fullscreen fallback fills portrait and landscape viewports and exits cleanly", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await page.addInitScript(() => {
      Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
        configurable: true,
        value: undefined
      });
    });

    const project = await getPublishedUrlProject(page);
    if (project.sourceUrl) {
      const origin = new URL(project.sourceUrl).origin;
      await page.route(`${origin}/**`, (route) => route.abort());
    }

    await openProjectDetail(page, project);
    await page.getByRole("button", { name: "Xem trước dự án" }).click();
    const frame = page.locator("iframe.project-preview-frame");
    await expect(frame).toBeVisible();

    await page.getByRole("button", { name: "Toàn màn hình" }).click();
    const shell = page.locator(".project-preview-shell");
    await expect(shell).toHaveClass(/is-fallback-fullscreen/);
    await expect(shell).toHaveCSS("position", "fixed");
    await expect(shell).toHaveCSS("padding", "0px");

    const assertViewportCoverage = async (width: number, height: number) => {
      await expect.poll(() => shell.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return {
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          documentWidth: document.documentElement.scrollWidth
        };
      })).toEqual({
        top: 0,
        left: 0,
        width,
        height,
        viewportWidth: width,
        viewportHeight: height,
        documentWidth: width
      });
    };

    await assertViewportCoverage(393, 852);
    expect(await page.evaluate(() => matchMedia("(orientation: portrait)").matches)).toBe(true);

    // Simulate rotating the phone while the fallback fullscreen is active.
    await page.setViewportSize({ width: 852, height: 393 });
    await assertViewportCoverage(852, 393);
    expect(await page.evaluate(() => matchMedia("(orientation: landscape)").matches)).toBe(true);
    await expect(shell).toHaveCSS("padding", "0px");

    await page.keyboard.press("Escape");
    await expect(shell).not.toHaveClass(/is-fallback-fullscreen/);
    await expect(frame).toBeVisible();
    await expect.poll(() => page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )).toBe(true);
  });

  test("native fullscreen enters and exits when supported", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "Native fullscreen is verified on desktop Chromium; mobile fallback is covered separately.");

    const project = await getPublishedUrlProject(page);
    if (project.sourceUrl) {
      const origin = new URL(project.sourceUrl).origin;
      await page.route(`${origin}/**`, (route) => route.abort());
    }

    await openProjectDetail(page, project);
    await page.getByRole("button", { name: "Xem trước dự án" }).click();

    const supported = await page.evaluate(
      () => document.fullscreenEnabled && typeof HTMLElement.prototype.requestFullscreen === "function"
    );
    test.skip(!supported, "This browser does not expose the native Fullscreen API.");

    await page.getByRole("button", { name: "Toàn màn hình" }).click();
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);

    await page.getByRole("button", { name: "Thoát toàn màn hình" }).click();
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
  });
});

test.describe("PJVault admin API protection", () => {
  test("admin APIs reject requests without an authenticated session", async ({ page }) => {
    const id = "00000000-0000-4000-8000-000000000001";
    const endpoints = [
      `${BASE_URL}/api/admin/submissions`,
      `${BASE_URL}/api/admin/submissions/${id}/source`,
      `${BASE_URL}/api/admin/submissions/${id}/review-history`
    ];

    for (const endpoint of endpoints) {
      const response = await page.request.get(endpoint);
      expect([401, 503], `Unauthenticated access must not succeed: ${endpoint}`).toContain(response.status());
      expect(response.status()).not.toBe(200);
      expect(response.headers()["cache-control"] ?? "").toContain("no-store");
    }
  });

  test("login and submission mutations reject cross-origin requests before authentication", async ({ page }) => {
    const loginResponse = await page.request.post(`${BASE_URL}/api/admin/login`, {
      headers: {
        "Origin": "https://attacker.invalid",
        "Content-Type": "application/json"
      },
      data: { username: "e2e-review-user", password: "NotARealPassword123" }
    });
    expect(loginResponse.status()).toBe(403);

    const patchResponse = await page.request.patch(
      `${BASE_URL}/api/admin/submissions/00000000-0000-4000-8000-000000000001`,
      {
        headers: {
          "Origin": "https://attacker.invalid",
          "Content-Type": "application/json"
        },
        data: { action: "approve" }
      }
    );
    expect(patchResponse.status()).toBe(403);
  });
});

test.describe("PJVault admin access", () => {
  test("login form explains a rate-limited sign-in", async ({ page }) => {
    await page.route("**/api/admin/login", (route) => route.fulfill({
      status: 429,
      headers: { "Retry-After": "900" },
      contentType: "application/json",
      body: JSON.stringify({ error: "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng đợi 15 phút rồi thử lại." })
    }));

    await page.goto("/admin/login");
    await page.getByLabel("Tên đăng nhập").fill("e2e-review-user");
    await page.getByLabel("Mật khẩu").fill("NotARealPassword123");
    await page.getByRole("button", { name: "Đăng nhập an toàn" }).click();

    await expect(page.getByRole("alert")).toContainText("đợi 15 phút");
  });

  test("login form reports a rejected sign-in without contacting the real auth service", async ({ page }) => {
    await page.route("**/api/admin/login", (route) => route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "Tên đăng nhập hoặc mật khẩu không đúng." })
    }));

    await page.goto("/admin/login");
    await expect(page.getByRole("heading", { name: "Đăng nhập quản trị" })).toBeVisible();
    await page.getByLabel("Tên đăng nhập").fill("e2e-review-user");
    await page.getByLabel("Mật khẩu").fill("NotARealPassword123");
    await page.getByRole("button", { name: "Đăng nhập an toàn" }).click();

    await expect(page.getByText("Tên đăng nhập hoặc mật khẩu không đúng.", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});
