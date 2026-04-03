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

const flashcardFixture = {
  id: "fc_1",
  deckId: "deck_123",
  term: "hola",
  definition: "hello (informal greeting)",
  definitionPreview: "hello (informal greeting)",
  imageUrl: null,
  hasImage: false,
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

    if (method === "GET" && path === "/api/decks/deck_123/flashcards") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [flashcardFixture],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      });
      return;
    }

    if (method === "GET" && path === "/api/decks/deck_123/flashcards/fc_1") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(flashcardFixture),
      });
      return;
    }

    await route.fallback();
  });
};

const installEmptyDecksApiMocks = async (page: Page) => {
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
          items: [],
          page: 1,
          pageSize: 20,
          totalCount: 0,
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
      await expect(page.getByRole("heading", { level: 1, name: /spanish basics/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /edit deck/i })).toBeVisible();
      await assertNoHorizontalOverflow(page);

      await page.goto("/decks/deck_123/edit");
      await expect(page.getByRole("heading", { level: 1, name: /^edit deck$/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /save changes/i })).toBeDisabled();
      await assertNoHorizontalOverflow(page);
    });
  }

  test("keeps header compact to two rows on 375px viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    const templateAreas = await page.locator(".app-header__inner").evaluate((element) =>
      window.getComputedStyle(element).gridTemplateAreas
    );

    expect(templateAreas).toContain("brand controls");
    expect(templateAreas).toContain("nav nav");
  });

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

test.describe("flashcard route surfaces", () => {
  test.beforeEach(async ({ page }) => {
    await installApiMocks(page);
    await page.addInitScript(() => {
      localStorage.removeItem("tenax.theme.preference");
      sessionStorage.clear();
    });
  });

  test("renders flashcard list with items and no horizontal overflow at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/decks/deck_123/flashcards");

    await expect(page.getByRole("heading", { level: 1, name: /flashcards/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /new flashcard/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /hola/i })).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test("renders flashcard detail with flip card and no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/decks/deck_123/flashcards/fc_1");

    await expect(page.getByRole("heading", { level: 1, name: /flashcard detail/i })).toBeVisible();

    // Card starts on front face showing term
    const studyCard = page.getByRole("button", { name: /press enter or space to flip the flashcard/i });
    await expect(studyCard).toBeVisible();
    await expect(page.getByText("hola")).toBeVisible();
    await expect(page.getByText("hello (informal greeting)")).not.toBeVisible();

    // Click to flip to back face
    await studyCard.click();
    await expect(page.getByRole("button", { name: /press enter or space to flip the flashcard/i })).toBeVisible();
    await expect(page.getByText("hello (informal greeting)")).toBeVisible();
    await expect(page.getByText("hola")).not.toBeVisible();

    await assertNoHorizontalOverflow(page);
  });

  test("flip card is keyboard accessible via Enter and Space", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/decks/deck_123/flashcards/fc_1");

    const studyCard = page.getByRole("button", { name: /press enter or space to flip the flashcard/i });
    await expect(studyCard).toBeVisible();
    await studyCard.focus();
    await expect(studyCard).toBeFocused();

    // Enter flips to back
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: /press enter or space to flip the flashcard/i })).toBeVisible();
    await expect(page.getByText("hello (informal greeting)")).toBeVisible();

    // Space flips back to front
    await page.keyboard.press(" ");
    await expect(page.getByRole("button", { name: /press enter or space to flip the flashcard/i })).toBeVisible();
    await expect(page.getByText("hola")).toBeVisible();
  });

  test("renders flashcard create route with labeled form fields and no overflow at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/decks/deck_123/flashcards/new");

    await expect(page.getByRole("heading", { level: 1, name: /create flashcard/i })).toBeVisible();
    await expect(page.getByLabel(/term or phrase/i)).toBeVisible();
    await expect(page.getByLabel(/definition/i)).toBeVisible();
    await expect(page.getByLabel(/image url/i)).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });
});

test.describe("empty deck state", () => {
  test.beforeEach(async ({ page }) => {
    await installEmptyDecksApiMocks(page);
    await page.addInitScript(() => {
      localStorage.removeItem("tenax.theme.preference");
      sessionStorage.clear();
    });
  });

  test("renders empty state call to action on deck list when no decks exist", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/decks");

    await expect(page.getByRole("heading", { level: 1, name: /my decks/i })).toBeVisible();
    // Empty state heading and CTA must be present
    await expect(page.getByRole("heading", { name: /ready to build your vocabulary/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /create your first deck/i })).toBeVisible();
    // No deck cards should be in the list
    await expect(page.getByRole("link", { name: /spanish basics/i })).not.toBeVisible();
    await assertNoHorizontalOverflow(page);
  });
});

test.describe("theme toggle", () => {
  test.beforeEach(async ({ page }) => {
    await installApiMocks(page);
    await page.addInitScript(() => {
      localStorage.removeItem("tenax.theme.preference");
      sessionStorage.clear();
    });
  });

  test("theme toggle switches between light and dark modes and persists preference", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    // Verify theme toggle group is present with all three options
    const themeGroup = page.getByRole("group", { name: /theme preference/i });
    await expect(themeGroup).toBeVisible();
    await expect(page.getByRole("button", { name: /system theme/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /light theme/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /dark theme/i })).toBeVisible();

    // Default: System is active (aria-pressed=true)
    await expect(page.getByRole("button", { name: /system theme/i })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: /dark theme/i })).toHaveAttribute("aria-pressed", "false");

    // Switch to Dark
    await page.getByRole("button", { name: /dark theme/i }).click();
    await expect(page.getByRole("button", { name: /dark theme/i })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: /system theme/i })).toHaveAttribute("aria-pressed", "false");

    // data-theme attribute on <html> must switch to dark
    const htmlTheme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme")
    );
    expect(htmlTheme).toBe("dark");

    // Preference must be stored in localStorage
    const stored = await page.evaluate(() =>
      localStorage.getItem("tenax.theme.preference")
    );
    expect(stored).toBe("dark");

    // Switch to Light
    await page.getByRole("button", { name: /light theme/i }).click();
    await expect(page.getByRole("button", { name: /light theme/i })).toHaveAttribute("aria-pressed", "true");

    const lightTheme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme")
    );
    expect(lightTheme).toBe("light");
  });

  test("theme preference is restored from localStorage on page reload", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Pre-seed dark preference before navigation
    await page.addInitScript(() => {
      localStorage.setItem("tenax.theme.preference", "dark");
    });

    await page.goto("/");

    // Dark button must be active
    await expect(page.getByRole("button", { name: /dark theme/i })).toHaveAttribute("aria-pressed", "true");

    // HTML element must have data-theme=dark
    const htmlTheme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme")
    );
    expect(htmlTheme).toBe("dark");
  });
});
