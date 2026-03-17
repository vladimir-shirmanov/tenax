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

const deckFixture = {
  id: "deck_123",
  name: "Spanish Basics",
  description: "Everyday greetings",
  flashcardCount: 3,
  createdAtUtc: "2026-03-17T09:00:00Z",
  updatedAtUtc: "2026-03-17T09:45:00Z",
  createdByUserId: "usr_42",
  updatedByUserId: "usr_42",
};

const installApiMocks = async (page: Page) => {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (method === "GET" && path === "/api/decks") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [deckFixture],
          page: 1,
          pageSize: 20,
          totalCount: 1,
        }),
      });
      return;
    }

    if (method === "POST" && path === "/api/decks") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          ...deckFixture,
          id: "deck_created",
          name: "Created Deck",
          description: "Created in e2e",
        }),
      });
      return;
    }

    if (method === "GET" && path === "/api/decks/deck_123") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(deckFixture),
      });
      return;
    }

    if (method === "PUT" && path === "/api/decks/deck_123") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...deckFixture,
          name: "Spanish Basics Updated",
          updatedAtUtc: "2026-03-17T10:00:00Z",
        }),
      });
      return;
    }

    await route.fallback();
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
    test(`validates shell and deck CRUD route surfaces at ${viewportCase.width}px`, async ({ page }) => {
      await page.setViewportSize({ width: viewportCase.width, height: viewportCase.height });

      await page.goto("/");
      await expect(page.getByRole("link", { name: /tenax home/i })).toBeVisible();
      await expect(page.getByRole("heading", { level: 1, name: /welcome to tenax/i })).toBeVisible();
      await assertNoHorizontalOverflow(page);

      await page.goto("/decks");
      await expect(page.getByRole("heading", { level: 1, name: /my decks/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /create deck/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /spanish basics/i })).toBeVisible();
      await assertNoHorizontalOverflow(page);

      await page.goto("/decks/new");
      await expect(page.getByRole("heading", { level: 1, name: /create new deck/i })).toBeVisible();
      await expect(page.getByLabel(/deck name/i)).toBeVisible();
      await expect(page.getByLabel(/description/i)).toBeVisible();
      await assertNoHorizontalOverflow(page);

      await page.goto("/decks/deck_123");
      await expect(page.getByRole("heading", { level: 1, name: /deck detail/i })).toBeVisible();
      await expect(page.getByRole("heading", { level: 2, name: /spanish basics/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /edit deck/i })).toBeVisible();
      await assertNoHorizontalOverflow(page);

      await page.goto("/decks/deck_123/edit");
      await expect(page.getByRole("heading", { level: 1, name: /edit deck/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /save changes/i })).toBeDisabled();
      await assertNoHorizontalOverflow(page);
    });
  }

  test("validates keyboard navigation and labeled controls on deck create/edit routes", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto("/decks/new");
    const nameInput = page.getByLabel(/deck name/i);
    const descriptionInput = page.getByLabel(/description/i);

    await nameInput.focus();
    await expect(nameInput).toBeFocused();
    await page.keyboard.type("Keyboard Deck");
    await expect(nameInput).toHaveValue("Keyboard Deck");

    await page.keyboard.press("Tab");
    await expect(descriptionInput).toBeFocused();

    await page.goto("/decks/deck_123/edit");
    const saveButton = page.getByRole("button", { name: /save changes/i });
    await expect(saveButton).toBeDisabled();

    await page.getByLabel(/description/i).fill("Everyday greetings updated");
    await expect(saveButton).toBeEnabled();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: /save changes/i })).toBeFocused();
  });
});
