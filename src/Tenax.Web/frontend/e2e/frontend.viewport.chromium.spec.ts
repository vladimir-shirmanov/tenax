import { expect, test, type Page } from "@playwright/test";

type ViewportCase = {
  label: string;
  width: number;
  height: number;
};

const viewportCases: ViewportCase[] = [
  { label: "mobile", width: 375, height: 812 },
  { label: "tablet", width: 768, height: 1024 },
  { label: "desktop", width: 1440, height: 900 },
];

const flashcardFixture = {
  id: "fc_1",
  deckId: "default",
  term: "hola",
  definition: "hello",
  imageUrl: null,
  createdAtUtc: "2026-03-15T12:00:00Z",
  updatedAtUtc: "2026-03-15T12:00:00Z",
  createdByUserId: "usr_1",
  updatedByUserId: "usr_1",
};

const installApiMocks = async (page: Page) => {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (method === "GET" && path === "/api/decks/default/flashcards") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              id: flashcardFixture.id,
              deckId: flashcardFixture.deckId,
              term: flashcardFixture.term,
              definitionPreview: flashcardFixture.definition,
              hasImage: false,
              updatedAtUtc: flashcardFixture.updatedAtUtc,
              updatedByUserId: flashcardFixture.updatedByUserId,
            },
          ],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      });
      return;
    }

    if (method === "GET" && path === "/api/decks/default/flashcards/fc_1") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(flashcardFixture),
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ code: "not_found", message: "not found" }),
    });
  });
};

const assertNoHorizontalOverflow = async (page: Page) => {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });

  expect(hasOverflow).toBe(false);
};

test.describe("runtime viewport validation in Chromium", () => {
  test.beforeEach(async ({ page }) => {
    await installApiMocks(page);
    await page.addInitScript(() => {
      localStorage.removeItem("tenax.theme.preference");
      sessionStorage.clear();
    });
  });

  for (const viewportCase of viewportCases) {
    test(`validates shell, home, decks, and flashcards surfaces at ${viewportCase.width}px`, async ({ page }) => {
      await page.setViewportSize({ width: viewportCase.width, height: viewportCase.height });

      await page.goto("/");
      await expect(page.getByRole("link", { name: /tenax home/i })).toBeVisible();
      await expect(page.getByRole("heading", { level: 1, name: /welcome to tenax/i })).toBeVisible();
      await assertNoHorizontalOverflow(page);

      await page.goto("/decks");
      await expect(page.getByRole("heading", { level: 1, name: "Decks" })).toBeVisible();
      await expect(page.getByRole("link", { name: /open default deck flashcards/i })).toBeVisible();
      await assertNoHorizontalOverflow(page);

      await page.goto("/decks/default/flashcards");
      await expect(page.getByRole("heading", { level: 1, name: "Flashcards" })).toBeVisible();
      await expect(page.getByRole("link", { name: "hola" })).toBeVisible();
      await assertNoHorizontalOverflow(page);

      await page.goto("/decks/default/flashcards/new");
      await expect(page.getByRole("heading", { level: 1, name: /create flashcard/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /create flashcard/i })).toBeVisible();
      await assertNoHorizontalOverflow(page);

      await page.goto("/decks/default/flashcards/fc_1");
      await expect(page.getByRole("heading", { level: 1, name: /flashcard detail/i })).toBeVisible();
      await expect(page.getByText("hola")).toBeVisible();
      await assertNoHorizontalOverflow(page);
    });
  }

  test("validates system/light/dark toggle behavior and persistence across reload", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ colorScheme: "dark" });

    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.getByRole("button", { name: /light theme/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect.poll(async () => {
      return page.evaluate(() => localStorage.getItem("tenax.theme.preference"));
    }).toBe("light");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await page.getByRole("button", { name: /dark theme/i }).click();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.getByRole("button", { name: /system theme/i }).click();
    await expect.poll(async () => {
      return page.evaluate(() => localStorage.getItem("tenax.theme.preference"));
    }).toBe("system");

    await page.emulateMedia({ colorScheme: "light" });
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await page.emulateMedia({ colorScheme: "dark" });
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});
