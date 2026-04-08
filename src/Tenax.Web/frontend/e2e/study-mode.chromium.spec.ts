import { expect, test, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

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

const makeListItem = (id: string, term: string, preview: string) => ({
  id,
  deckId: "deck_123",
  term,
  definitionPreview: preview,
  hasImage: false,
  updatedAtUtc: "2026-03-15T12:00:00Z",
  updatedByUserId: "usr_1",
});

const makeDetail = (id: string, term: string, definition: string, imageUrl: string | null = null) => ({
  id,
  deckId: "deck_123",
  term,
  definition,
  imageUrl,
  createdAtUtc: "2026-03-15T12:00:00Z",
  updatedAtUtc: "2026-03-15T12:00:00Z",
  createdByUserId: "usr_1",
  updatedByUserId: "usr_1",
});

const twoCardList = [
  makeListItem("fc_1", "hola", "hello preview"),
  makeListItem("fc_2", "adios", "bye preview"),
];

const threeCardList = [
  makeListItem("fc_1", "hola", "hello preview"),
  makeListItem("fc_2", "adios", "bye preview"),
  makeListItem("fc_3", "gracias", "thank you preview"),
];

const installStudyApiMocks = async (
  page: Page,
  opts: { cards?: typeof threeCardList; imageUrl?: string | null } = {},
) => {
  const cards = opts.cards ?? twoCardList;
  const imageUrl = opts.imageUrl ?? null;

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (method === "GET" && path === "/api/decks/deck_123") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...deckFixture, flashcardCount: cards.length }),
      });
      return;
    }

    if (method === "GET" && path === "/api/decks/deck_123/flashcards" && url.searchParams.get("pageSize") === "20") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: cards, page: 1, pageSize: 20, totalCount: cards.length }),
      });
      return;
    }

    // individual flashcard detail endpoints
    for (const card of cards) {
      if (method === "GET" && path === `/api/decks/deck_123/flashcards/${card.id}`) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            makeDetail(card.id, card.term, card.definitionPreview.replace(" preview", ""), imageUrl),
          ),
        });
        return;
      }
    }

    await route.fallback();
  });
};

const installEmptyDeckMocks = async (page: Page) => {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (method === "GET" && path === "/api/decks/deck_123") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...deckFixture, flashcardCount: 0 }),
      });
      return;
    }

    if (method === "GET" && path === "/api/decks/deck_123/flashcards" && url.searchParams.get("pageSize") === "20") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], page: 1, pageSize: 20, totalCount: 0 }),
      });
      return;
    }

    await route.fallback();
  });
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const assertNoHorizontalOverflow = async (page: Page) => {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasOverflow).toBe(false);
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("study mode — routing and entry point", () => {
  test.beforeEach(async ({ page }) => {
    await installStudyApiMocks(page);
    await page.addInitScript(() => {
      localStorage.removeItem("tenax.theme.preference");
      sessionStorage.clear();
    });
  });

  test("deck detail page: Study now button href points to /decks/:id/study", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/decks/deck_123");

    const studyLink = page.getByRole("link", { name: /study now/i });
    await expect(studyLink).toBeVisible();
    await expect(studyLink).toHaveAttribute("href", "/decks/deck_123/study");
  });

  test("clicking Study now navigates to /decks/:id/study route", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/decks/deck_123");

    await page.getByRole("link", { name: /study now/i }).click();
    await expect(page).toHaveURL(/\/decks\/deck_123\/study/);
    await expect(page.locator(".study-mode")).toBeVisible();
  });
});

test.describe("study mode — layout and breadcrumb", () => {
  test.beforeEach(async ({ page }) => {
    await installStudyApiMocks(page);
    await page.addInitScript(() => {
      localStorage.removeItem("tenax.theme.preference");
      sessionStorage.clear();
    });
  });

  test("breadcrumb shows Decks › <deck name> › Study (not raw ID)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/decks/deck_123/study");

    const breadcrumbNav = page.getByRole("navigation", { name: /breadcrumb/i });
    await expect(breadcrumbNav).toBeVisible();
    await expect(breadcrumbNav.getByRole("link", { name: "Decks" })).toBeVisible();
    await expect(breadcrumbNav.getByRole("link", { name: "Spanish Basics" })).toBeVisible();
    await expect(breadcrumbNav.locator('[aria-current="page"]')).toHaveText("Study");
  });

  test("header shows deck name, progress, and shuffle button with SVG icon", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/decks/deck_123/study");

    await expect(page.locator(".study-mode__deck-name")).toContainText("Spanish Basics");
    await expect(page.locator(".study-mode__progress")).toContainText(/\d+\s*\/\s*\d+/);

    const shuffleBtn = page.getByRole("button", { name: /shuffle cards/i });
    await expect(shuffleBtn).toBeVisible();
    // SVG icon must be present inside shuffle button
    await expect(shuffleBtn.locator("svg")).toBeVisible();
  });

  test("flip card renders with term on front face", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/decks/deck_123/study");

    const flipCard = page.getByRole("button", { name: /flip the flashcard/i });
    await expect(flipCard).toBeVisible();
    await expect(flipCard).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".flashcard-study-card__term")).toBeVisible();
    await expect(page.locator(".flashcard-study-card__definition")).not.toBeVisible();
  });

  test("Previous button disabled on first card, Next button present", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/decks/deck_123/study");

    await expect(page.getByRole("button", { name: /flip the flashcard/i })).toBeVisible();

    const prevBtn = page.getByRole("button", { name: /← previous/i });
    await expect(prevBtn).toBeDisabled();

    const nextBtn = page.getByRole("button", { name: /next →/i });
    await expect(nextBtn).toBeVisible();
    await expect(nextBtn).not.toBeDisabled();
  });

  test("no horizontal overflow at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/decks/deck_123/study");
    await expect(page.getByRole("button", { name: /flip the flashcard/i })).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });
});

test.describe("study mode — card navigation", () => {
  test.beforeEach(async ({ page }) => {
    await installStudyApiMocks(page);
    await page.addInitScript(() => {
      localStorage.removeItem("tenax.theme.preference");
      sessionStorage.clear();
    });
  });

  test("clicking Next advances card and resets flip to front", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/decks/deck_123/study");

    // Flip the card first
    await page.getByRole("button", { name: /flip the flashcard/i }).click();
    await expect(page.getByRole("button", { name: /flip the flashcard/i })).toHaveAttribute("aria-pressed", "true");

    // Click Next
    await page.getByRole("button", { name: /next →/i }).click();

    // Progress should now be 2 / 2
    await expect(page.locator(".study-mode__progress")).toContainText("2 / 2");

    // Flip must be reset to front face
    await expect(page.getByRole("button", { name: /flip the flashcard/i })).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".flashcard-study-card__term")).toBeVisible();
  });

  test("clicking Previous goes back and resets flip", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/decks/deck_123/study");

    // Advance to card 2
    await page.getByRole("button", { name: /next →/i }).click();
    await expect(page.locator(".study-mode__progress")).toContainText("2 / 2");

    // Flip card 2
    await page.getByRole("button", { name: /flip the flashcard/i }).click();

    // Go back
    await page.getByRole("button", { name: /← previous/i }).click();

    // Should be card 1 again, front face
    await expect(page.locator(".study-mode__progress")).toContainText("1 / 2");
    await expect(page.getByRole("button", { name: /flip the flashcard/i })).toHaveAttribute("aria-pressed", "false");
  });

  test("last card shows Finish button; clicking Finish shows completion screen", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/decks/deck_123/study");

    // Navigate to last card
    await page.getByRole("button", { name: /next →/i }).click();
    await expect(page.locator(".study-mode__progress")).toContainText("2 / 2");

    // Button text should change to "Finish"
    await expect(page.getByRole("button", { name: /^finish$/i })).toBeVisible();

    // Click Finish
    await page.getByRole("button", { name: /^finish$/i }).click();

    // Completion screen
    await expect(page.getByRole("heading", { name: /you finished!/i })).toBeVisible();
    await expect(page.locator(".study-mode__completion")).toContainText("Spanish Basics");
    await expect(page.locator(".study-mode__completion")).toContainText("2 cards");
  });

  test("Study again resets to card 1", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/decks/deck_123/study");

    // Go to last and finish
    await page.getByRole("button", { name: /next →/i }).click();
    await page.getByRole("button", { name: /^finish$/i }).click();
    await expect(page.getByRole("heading", { name: /you finished!/i })).toBeVisible();

    // Study again
    await page.getByRole("button", { name: /study again/i }).click();

    // Back to card 1
    await expect(page.locator(".study-mode__progress")).toContainText("1 / 2");
    await expect(page.getByRole("button", { name: /flip the flashcard/i })).toBeVisible();
  });

  test("completion screen has Back to deck link", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/decks/deck_123/study");

    await page.getByRole("button", { name: /next →/i }).click();
    await page.getByRole("button", { name: /^finish$/i }).click();

    await expect(page.getByRole("link", { name: /back to deck/i })).toHaveAttribute("href", "/decks/deck_123");
  });
});

test.describe("study mode — flip behaviour", () => {
  test.beforeEach(async ({ page }) => {
    await installStudyApiMocks(page);
    await page.addInitScript(() => {
      localStorage.removeItem("tenax.theme.preference");
      sessionStorage.clear();
    });
  });

  test("clicking card flips to show definition; clicking again flips back to term", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/decks/deck_123/study");

    const flipCard = page.getByRole("button", { name: /flip the flashcard/i });
    await expect(flipCard).toHaveAttribute("aria-pressed", "false");

    // Flip to back
    await flipCard.click();
    await expect(flipCard).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".flashcard-study-card__definition")).toBeVisible();
    await expect(page.locator(".flashcard-study-card__term")).not.toBeVisible();

    // Flip back to front
    await flipCard.click();
    await expect(flipCard).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".flashcard-study-card__term")).toBeVisible();
    await expect(page.locator(".flashcard-study-card__definition")).not.toBeVisible();
  });

  test("navigating away while flipped shows next card on front face", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/decks/deck_123/study");

    // Flip card 1
    await page.getByRole("button", { name: /flip the flashcard/i }).click();
    await expect(page.getByRole("button", { name: /flip the flashcard/i })).toHaveAttribute("aria-pressed", "true");

    // Navigate to next card
    await page.getByRole("button", { name: /next →/i }).click();

    // Next card must show front face
    await expect(page.getByRole("button", { name: /flip the flashcard/i })).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".flashcard-study-card__term")).toBeVisible();
  });
});

test.describe("study mode — shuffle toggle", () => {
  test.beforeEach(async ({ page }) => {
    await installStudyApiMocks(page);
    await page.addInitScript(() => {
      localStorage.removeItem("tenax.theme.preference");
      sessionStorage.clear();
    });
  });

  test("shuffle button toggles aria-pressed and is-active class", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/decks/deck_123/study");

    const shuffleBtn = page.getByRole("button", { name: /shuffle cards/i });
    await expect(shuffleBtn).toHaveAttribute("aria-pressed", "false");

    // Enable shuffle
    await shuffleBtn.click();
    await expect(shuffleBtn).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".study-mode__shuffle.is-active")).toBeVisible();

    // Disable shuffle
    await shuffleBtn.click();
    await expect(shuffleBtn).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".study-mode__shuffle.is-active")).not.toBeVisible();
  });

  test("toggling shuffle off resets position to card 1", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/decks/deck_123/study");

    // Advance to card 2
    await page.getByRole("button", { name: /next →/i }).click();
    await expect(page.locator(".study-mode__progress")).toContainText("2 / 2");

    // Enable shuffle — resets to card 1
    await page.getByRole("button", { name: /shuffle cards/i }).click();
    await expect(page.locator(".study-mode__progress")).toContainText("1 / 2");

    // Disable shuffle — still at card 1
    await page.getByRole("button", { name: /shuffle cards/i }).click();
    await expect(page.locator(".study-mode__progress")).toContainText("1 / 2");
  });
});

test.describe("study mode — dot indicators", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("tenax.theme.preference");
      sessionStorage.clear();
    });
  });

  test("dots appear for deck with ≤20 cards; active dot has is-active class", async ({ page }) => {
    await installStudyApiMocks(page, { cards: twoCardList });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/decks/deck_123/study");

    await expect(page.getByRole("button", { name: /flip the flashcard/i })).toBeVisible();

    const dotsContainer = page.locator(".study-mode__dots");
    await expect(dotsContainer).toBeVisible();

    const dots = page.locator(".study-mode__dot");
    await expect(dots).toHaveCount(2);

    const activeDot = page.locator(".study-mode__dot.is-active");
    await expect(activeDot).toHaveCount(1);
  });

  test("active dot index advances when navigating to next card", async ({ page }) => {
    await installStudyApiMocks(page, { cards: twoCardList });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/decks/deck_123/study");

    await expect(page.getByRole("button", { name: /flip the flashcard/i })).toBeVisible();

    // First dot should be active initially
    const firstDot = page.locator(".study-mode__dot").nth(0);
    await expect(firstDot).toHaveClass(/is-active/);

    await page.getByRole("button", { name: /next →/i }).click();

    // Second dot should be active
    const secondDot = page.locator(".study-mode__dot").nth(1);
    await expect(secondDot).toHaveClass(/is-active/);
    await expect(firstDot).not.toHaveClass(/is-active/);
  });
});

test.describe("study mode — keyboard navigation", () => {
  test.beforeEach(async ({ page }) => {
    await installStudyApiMocks(page);
    await page.addInitScript(() => {
      localStorage.removeItem("tenax.theme.preference");
      sessionStorage.clear();
    });
  });

  test("ArrowRight advances card; ArrowLeft goes back", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/decks/deck_123/study");

    await expect(page.getByRole("button", { name: /flip the flashcard/i })).toBeVisible();

    // Focus body (blur any button)
    await page.locator("main").click({ position: { x: 400, y: 50 } });

    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".study-mode__progress")).toContainText("2 / 2");

    await page.keyboard.press("ArrowLeft");
    await expect(page.locator(".study-mode__progress")).toContainText("1 / 2");
  });

  test("Space flips card when focus is NOT on a button", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/decks/deck_123/study");

    await expect(page.getByRole("button", { name: /flip the flashcard/i })).toBeVisible();

    // Click non-button area to blur buttons
    await page.locator("main").click({ position: { x: 400, y: 50 } });

    await page.keyboard.press(" ");
    await expect(page.getByRole("button", { name: /flip the flashcard/i })).toHaveAttribute("aria-pressed", "true");
  });

  test("Space on a button does NOT flip the card", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/decks/deck_123/study");

    const flipCard = page.getByRole("button", { name: /flip the flashcard/i });
    await expect(flipCard).toBeVisible();

    // Focus the Previous button (it's disabled but still focusable per aria)
    const shuffleBtn = page.getByRole("button", { name: /shuffle cards/i });
    await shuffleBtn.focus();
    await expect(shuffleBtn).toBeFocused();

    const ariaBeforeSpace = await flipCard.getAttribute("aria-pressed");
    // Space on shuffle button should activate it, not flip card
    await page.keyboard.press(" ");
    // Shuffle activates — check card is still front face (aria-pressed unchanged or still false)
    // The shuffle button activates (aria-pressed="true"), but the flip card should remain untouched
    const flipAriaAfter = await flipCard.getAttribute("aria-pressed");
    // The flip state must match what it was before (unflipped = "false")
    expect(flipAriaAfter).toBe(ariaBeforeSpace);
  });
});

test.describe("study mode — empty deck state", () => {
  test.beforeEach(async ({ page }) => {
    await installEmptyDeckMocks(page);
    await page.addInitScript(() => {
      localStorage.removeItem("tenax.theme.preference");
      sessionStorage.clear();
    });
  });

  test("navigating to study route for empty deck shows empty state message and Add flashcards link", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/decks/deck_123/study");

    await expect(page.getByText(/this deck has no flashcards yet/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /add flashcards/i })).toHaveAttribute(
      "href",
      "/decks/deck_123/flashcards/new",
    );
  });

  test("empty state breadcrumb still shows deck name not raw ID", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/decks/deck_123/study");

    const breadcrumbNav = page.getByRole("navigation", { name: /breadcrumb/i });
    await expect(breadcrumbNav.getByRole("link", { name: "Spanish Basics" })).toBeVisible();
    await expect(breadcrumbNav.locator('[aria-current="page"]')).toHaveText("Study");
  });
});

test.describe("study mode — image CSS", () => {
  test.beforeEach(async ({ page }) => {
    await installStudyApiMocks(page, {
      imageUrl: "https://example.com/image.png",
    });
    await page.addInitScript(() => {
      localStorage.removeItem("tenax.theme.preference");
      sessionStorage.clear();
    });
  });

  test(".flashcard-study-card__image max-height uses clamp, not fixed 256px", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/decks/deck_123/study");

    await expect(page.getByRole("button", { name: /flip the flashcard/i })).toBeVisible();

    const imageMaxHeight = await page.evaluate(() => {
      const img = document.querySelector(".flashcard-study-card__image");
      if (!img) return null;
      return window.getComputedStyle(img).maxHeight;
    });

    expect(imageMaxHeight).not.toBeNull();
    // Must NOT be the old fixed 256px value
    expect(imageMaxHeight).not.toBe("256px");
    // Must not be "none"
    expect(imageMaxHeight).not.toBe("none");
  });

  test(".flashcard-study-card__image max-width is 32rem (512px at default 16px root)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/decks/deck_123/study");

    await expect(page.getByRole("button", { name: /flip the flashcard/i })).toBeVisible();

    const imageMaxWidth = await page.evaluate(() => {
      const img = document.querySelector(".flashcard-study-card__image");
      if (!img) return null;
      return window.getComputedStyle(img).maxWidth;
    });

    expect(imageMaxWidth).not.toBeNull();
    expect(imageMaxWidth).not.toBe("none");
    // 32rem at 16px root = 512px
    expect(imageMaxWidth).toBe("512px");
  });
});

test.describe("study mode — breadcrumb deck name on flashcard sub-routes", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname;
      const method = request.method();

      if (method === "GET" && path === "/api/decks/deck_123") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(deckFixture),
        });
        return;
      }

      if (method === "GET" && path === "/api/decks/deck_123/flashcards/fc_1") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(makeDetail("fc_1", "hola", "hello", null)),
        });
        return;
      }

      if (method === "GET" && path === "/api/decks/deck_123/flashcards") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [makeListItem("fc_1", "hola", "hello preview")],
            page: 1,
            pageSize: 50,
            totalCount: 1,
          }),
        });
        return;
      }

      await route.fallback();
    });

    await page.addInitScript(() => {
      localStorage.removeItem("tenax.theme.preference");
      sessionStorage.clear();
    });
  });

  test("/decks/:id/flashcards/new breadcrumb shows deck name not raw ID", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/decks/deck_123/flashcards/new");

    const breadcrumbNav = page.getByRole("navigation", { name: /breadcrumb/i });
    await expect(breadcrumbNav.getByRole("link", { name: "Spanish Basics" })).toBeVisible();
    // Confirm the raw deckId is NOT displayed as a breadcrumb segment
    await expect(breadcrumbNav.getByRole("link", { name: "deck_123" })).not.toBeVisible();
  });

  test("/decks/:id/flashcards/:fid breadcrumb shows deck name not raw ID", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/decks/deck_123/flashcards/fc_1");

    const breadcrumbNav = page.getByRole("navigation", { name: /breadcrumb/i });
    await expect(breadcrumbNav.getByRole("link", { name: "Spanish Basics" })).toBeVisible();
    await expect(breadcrumbNav.getByRole("link", { name: "deck_123" })).not.toBeVisible();
  });

  test("/decks/:id/flashcards/:fid/edit breadcrumb shows deck name not raw ID", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/decks/deck_123/flashcards/fc_1/edit");

    const breadcrumbNav = page.getByRole("navigation", { name: /breadcrumb/i });
    await expect(breadcrumbNav.getByRole("link", { name: "Spanish Basics" })).toBeVisible();
    await expect(breadcrumbNav.getByRole("link", { name: "deck_123" })).not.toBeVisible();
  });
});
