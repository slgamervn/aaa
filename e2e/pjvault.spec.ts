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
    await expect(page.evaluate(() => matchMedia("(orientation: portrait)").matches)).resolves.toBe(true);

    // Simulate rotating the phone while the fallback fullscreen is active.
    await page.setViewportSize({ width: 852, height: 393 });
    await assertViewportCoverage(852, 393);
    await expect(page.evaluate(() => matchMedia("(orientation: landscape)").matches)).resolves.toBe(true);
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

test.describe("PJVault admin access", () => {
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
