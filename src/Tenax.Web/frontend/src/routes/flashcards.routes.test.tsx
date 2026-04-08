import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FlashcardListRoute } from "./decks.$deckId.flashcards.index";
import { FlashcardCreateRoute } from "./decks.$deckId.flashcards.new";
import { FlashcardDetailRoute } from "./decks.$deckId.flashcards.$flashcardId";
import { FlashcardEditRoute } from "./decks.$deckId.flashcards.$flashcardId.edit";
import { renderRoute } from "../test/test-utils";

const jsonResponse = (status: number, body: unknown) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response);

describe("flashcard routes", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  const mockDeckDetail = (url: string) => {
    if (url.endsWith("/api/decks/deck_123")) {
      return jsonResponse(200, {
        id: "deck_123",
        name: "Spanish Basics",
        description: "Everyday greetings",
        flashcardCount: 1,
        createdAtUtc: "2026-03-17T09:00:00Z",
        updatedAtUtc: "2026-03-17T09:45:00Z",
        createdByUserId: "usr_42",
        updatedByUserId: "usr_42",
      });
    }

    return null;
  };

  it("renders flashcard list success state", async () => {
    jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      const deckDetailResponse = mockDeckDetail(url);
      if (deckDetailResponse) {
        return deckDetailResponse;
      }

      if (url.includes("/api/decks/deck_123/flashcards?page=1&pageSize=50")) {
        return jsonResponse(200, {
          items: [
            {
              id: "fc_1",
              deckId: "deck_123",
              term: "hola",
              definitionPreview: "hello",
              hasImage: false,
              updatedAtUtc: "2026-03-15T12:00:00Z",
              updatedByUserId: "usr_1",
            },
          ],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        });
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute(
      "/decks/:deckId/flashcards",
      <FlashcardListRoute />,
      "/decks/deck_123/flashcards"
    );

    expect(screen.getByText(/loading flashcards/i)).toBeInTheDocument();
    expect(await screen.findByText("hola")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /new flashcard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Spanish Basics" })).toBeInTheDocument();
    expect(screen.getByText(/showing 1–1 of 1/i)).toBeInTheDocument();
  });

  it("renders flashcard list empty state", async () => {
    jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      const deckDetailResponse = mockDeckDetail(url);
      if (deckDetailResponse) {
        return deckDetailResponse;
      }

      if (url.includes("/api/decks/deck_123/flashcards?page=1&pageSize=50")) {
        return jsonResponse(200, {
          items: [],
          page: 1,
          pageSize: 50,
          totalCount: 0,
        });
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute(
      "/decks/:deckId/flashcards",
      <FlashcardListRoute />,
      "/decks/deck_123/flashcards"
    );

    expect(await screen.findByText(/no flashcards found for this deck yet/i)).toBeInTheDocument();
  });

  it("renders flashcard list error state", async () => {
    jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      const deckDetailResponse = mockDeckDetail(url);
      if (deckDetailResponse) {
        return deckDetailResponse;
      }

      if (url.includes("/api/decks/deck_123/flashcards?page=1&pageSize=50")) {
        return jsonResponse(500, {
          code: "server_error",
          message: "Something failed",
        });
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute(
      "/decks/:deckId/flashcards",
      <FlashcardListRoute />,
      "/decks/deck_123/flashcards"
    );

    await waitFor(
      () => {
        expect(screen.getByRole("alert")).toHaveTextContent(/something failed/i);
      },
      { timeout: 5000 }
    );
  });

  it("renders recoverable list error for persistence outage with retry", async () => {
    let listCallCount = 0;
    const fetchMock = jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      const deckDetailResponse = mockDeckDetail(url);
      if (deckDetailResponse) {
        return deckDetailResponse;
      }

      if (url.includes("/api/decks/deck_123/flashcards?page=1&pageSize=50")) {
        listCallCount += 1;

        if (listCallCount < 3) {
          return jsonResponse(503, {
            code: "persistence_unavailable",
            message: "Persistence service is temporarily unavailable",
          });
        }

        return jsonResponse(200, {
          items: [
            {
              id: "fc_1",
              deckId: "deck_123",
              term: "hola",
              definitionPreview: "hello",
              hasImage: false,
              updatedAtUtc: "2026-03-15T12:00:00Z",
              updatedByUserId: "usr_1",
            },
          ],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        });
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute(
      "/decks/:deckId/flashcards",
      <FlashcardListRoute />,
      "/decks/deck_123/flashcards"
    );

    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(await screen.findByText("hola", { selector: ".flat-list__title" })).toBeInTheDocument();
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("shows contract validation errors on create", async () => {
    jest.spyOn(global, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url.endsWith("/api/decks/deck_123/flashcards") && init?.method === "POST") {
        return jsonResponse(400, {
          code: "validation_error",
          message: "Request validation failed",
          errors: {
            term: ["term must be at least 1 character"],
            definition: ["definition must be at least 1 character"],
          },
        });
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute(
      "/decks/:deckId/flashcards/new",
      <FlashcardCreateRoute />,
      "/decks/deck_123/flashcards/new"
    );

    await userEvent.type(screen.getByLabelText(/term or phrase/i), "hola");
    await userEvent.type(screen.getByLabelText(/definition/i), "hello");
    await userEvent.click(screen.getByRole("button", { name: /create flashcard/i }));

    expect(await screen.findByText(/request validation failed/i)).toBeInTheDocument();
    expect(screen.getByText(/term must be at least 1 character/i)).toBeInTheDocument();
    expect(screen.getByText(/definition must be at least 1 character/i)).toBeInTheDocument();
  });

  it("uses deck name breadcrumb in create route", async () => {
    jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      const deckDetailResponse = mockDeckDetail(url);
      if (deckDetailResponse) {
        return deckDetailResponse;
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute(
      "/decks/:deckId/flashcards/new",
      <FlashcardCreateRoute />,
      "/decks/deck_123/flashcards/new"
    );

    expect(await screen.findByRole("link", { name: "Spanish Basics" })).toHaveAttribute("href", "/decks/deck_123");
    expect(screen.queryByRole("link", { name: "deck_123" })).not.toBeInTheDocument();
  });

  it("deletes a flashcard from detail route with confirmation", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url.endsWith("/api/decks/deck_123/flashcards/fc_1") && !init?.method) {
        return jsonResponse(200, {
          id: "fc_1",
          deckId: "deck_123",
          term: "hola",
          definition: "hello",
          imageUrl: null,
          createdAtUtc: "2026-03-15T12:00:00Z",
          updatedAtUtc: "2026-03-15T12:00:00Z",
          createdByUserId: "usr_1",
          updatedByUserId: "usr_1",
        });
      }

      if (url.endsWith("/api/decks/deck_123/flashcards/fc_1") && init?.method === "DELETE") {
        return jsonResponse(200, {
          deleted: true,
          id: "fc_1",
          deckId: "deck_123",
          deletedAtUtc: "2026-03-15T12:20:00Z",
        });
      }

      if (url.endsWith("/api/decks/deck_123/flashcards?page=1&pageSize=50")) {
        return jsonResponse(200, { items: [], page: 1, pageSize: 50, totalCount: 0 });
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute(
      "/decks/:deckId/flashcards/:flashcardId",
      <FlashcardDetailRoute />,
      "/decks/deck_123/flashcards/fc_1"
    );

    expect(await screen.findByText("hola", { selector: ".flashcard-study-card__term" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(screen.getByRole("dialog", { name: /confirm delete flashcard/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^cancel$/i })).toHaveFocus();

    await userEvent.click(screen.getByRole("button", { name: /confirm delete/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/decks/deck_123/flashcards/fc_1"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  it("renders flashcard detail error state", async () => {
    jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/api/decks/deck_123/flashcards/fc_1")) {
        return jsonResponse(404, {
          code: "not_found",
          message: "Flashcard not found",
        });
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute(
      "/decks/:deckId/flashcards/:flashcardId",
      <FlashcardDetailRoute />,
      "/decks/deck_123/flashcards/fc_1"
    );

    await waitFor(
      () => {
        expect(screen.getByRole("alert")).toHaveTextContent(/flashcard not found/i);
      },
      { timeout: 5000 }
    );
  });

  it("uses deck name breadcrumb in detail route", async () => {
    jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      const deckDetailResponse = mockDeckDetail(url);
      if (deckDetailResponse) {
        return deckDetailResponse;
      }

      if (url.endsWith("/api/decks/deck_123/flashcards/fc_1")) {
        return jsonResponse(200, {
          id: "fc_1",
          deckId: "deck_123",
          term: "hola",
          definition: "hello",
          imageUrl: null,
          createdAtUtc: "2026-03-15T12:00:00Z",
          updatedAtUtc: "2026-03-15T12:00:00Z",
          createdByUserId: "usr_1",
          updatedByUserId: "usr_1",
        });
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute(
      "/decks/:deckId/flashcards/:flashcardId",
      <FlashcardDetailRoute />,
      "/decks/deck_123/flashcards/fc_1"
    );

    expect(await screen.findByRole("link", { name: "Spanish Basics" })).toHaveAttribute("href", "/decks/deck_123");
    expect(screen.queryByRole("link", { name: "deck_123" })).not.toBeInTheDocument();
  });

  it("toggles from term front to definition back on click", async () => {
    jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/api/decks/deck_123/flashcards/fc_1")) {
        return jsonResponse(200, {
          id: "fc_1",
          deckId: "deck_123",
          term: "hola",
          definition: "hello",
          imageUrl: null,
          createdAtUtc: "2026-03-15T12:00:00Z",
          updatedAtUtc: "2026-03-15T12:00:00Z",
          createdByUserId: "usr_1",
          updatedByUserId: "usr_1",
        });
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute(
      "/decks/:deckId/flashcards/:flashcardId",
      <FlashcardDetailRoute />,
      "/decks/deck_123/flashcards/fc_1"
    );

    const studyCard = await screen.findByRole("button", { name: /press enter or space to flip the flashcard/i });
    expect(screen.getByText("hola", { selector: ".flashcard-study-card__term" })).toBeInTheDocument();
    expect(screen.queryByText("hello")).not.toBeInTheDocument();

    await userEvent.click(studyCard);

    expect(await screen.findByText("hello")).toBeInTheDocument();
    expect(screen.queryByText("hola", { selector: ".flashcard-study-card__term" })).not.toBeInTheDocument();
  });

  it("toggles front and back with enter and space keyboard controls", async () => {
    jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/api/decks/deck_123/flashcards/fc_1")) {
        return jsonResponse(200, {
          id: "fc_1",
          deckId: "deck_123",
          term: "hola",
          definition: "hello",
          imageUrl: null,
          createdAtUtc: "2026-03-15T12:00:00Z",
          updatedAtUtc: "2026-03-15T12:00:00Z",
          createdByUserId: "usr_1",
          updatedByUserId: "usr_1",
        });
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute(
      "/decks/:deckId/flashcards/:flashcardId",
      <FlashcardDetailRoute />,
      "/decks/deck_123/flashcards/fc_1"
    );

    const studyCard = await screen.findByRole("button", { name: /press enter or space to flip the flashcard/i });
    studyCard.focus();
    await userEvent.keyboard("{Enter}");

    expect(await screen.findByText("hello")).toBeInTheDocument();
    expect(screen.queryByText("hola", { selector: ".flashcard-study-card__term" })).not.toBeInTheDocument();

    await userEvent.keyboard(" ");

    expect(await screen.findByText("hola", { selector: ".flashcard-study-card__term" })).toBeInTheDocument();
    expect(screen.queryByText("hello")).not.toBeInTheDocument();
  });

  it("renders optional image only on front side when provided", async () => {
    jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/api/decks/deck_123/flashcards/fc_1")) {
        return jsonResponse(200, {
          id: "fc_1",
          deckId: "deck_123",
          term: "hola",
          definition: "hello",
          imageUrl: "https://cdn.tenax.dev/media/flashcards/fc_1.png",
          createdAtUtc: "2026-03-15T12:00:00Z",
          updatedAtUtc: "2026-03-15T12:00:00Z",
          createdByUserId: "usr_1",
          updatedByUserId: "usr_1",
        });
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute(
      "/decks/:deckId/flashcards/:flashcardId",
      <FlashcardDetailRoute />,
      "/decks/deck_123/flashcards/fc_1"
    );

    const studyCard = await screen.findByRole("button", { name: /press enter or space to flip the flashcard/i });
    expect(screen.getByRole("img", { name: /flashcard illustration/i })).toBeInTheDocument();

    await userEvent.click(studyCard);

    expect(await screen.findByText("hello")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /flashcard illustration/i })).not.toBeInTheDocument();
  });

  it("applies reduced-motion fallback class when user prefers reduced motion", async () => {
    const previousMatchMedia = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/api/decks/deck_123/flashcards/fc_1")) {
        return jsonResponse(200, {
          id: "fc_1",
          deckId: "deck_123",
          term: "hola",
          definition: "hello",
          imageUrl: null,
          createdAtUtc: "2026-03-15T12:00:00Z",
          updatedAtUtc: "2026-03-15T12:00:00Z",
          createdByUserId: "usr_1",
          updatedByUserId: "usr_1",
        });
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute(
      "/decks/:deckId/flashcards/:flashcardId",
      <FlashcardDetailRoute />,
      "/decks/deck_123/flashcards/fc_1"
    );

    const studyCard = await screen.findByRole("button", { name: /press enter or space to flip the flashcard/i });
    expect(studyCard).toHaveClass("flashcard-study-card--reduced-motion");

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: previousMatchMedia,
    });
  });

  it("updates a flashcard via edit route", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url.endsWith("/api/decks/deck_123/flashcards/fc_1") && !init?.method) {
        return jsonResponse(200, {
          id: "fc_1",
          deckId: "deck_123",
          term: "hola",
          definition: "hello",
          imageUrl: null,
          createdAtUtc: "2026-03-15T12:00:00Z",
          updatedAtUtc: "2026-03-15T12:00:00Z",
          createdByUserId: "usr_1",
          updatedByUserId: "usr_1",
        });
      }

      if (url.endsWith("/api/decks/deck_123/flashcards/fc_1") && init?.method === "PUT") {
        return jsonResponse(200, {
          id: "fc_1",
          deckId: "deck_123",
          term: "hola",
          definition: "hello informal",
          imageUrl: null,
          createdAtUtc: "2026-03-15T12:00:00Z",
          updatedAtUtc: "2026-03-15T12:10:00Z",
          createdByUserId: "usr_1",
          updatedByUserId: "usr_1",
        });
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute(
      "/decks/:deckId/flashcards/:flashcardId/edit",
      <FlashcardEditRoute />,
      "/decks/deck_123/flashcards/fc_1/edit"
    );

    const definitionInput = await screen.findByLabelText(/definition/i);
    await userEvent.clear(definitionInput);
    await userEvent.type(definitionInput, "hello informal");
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/decks/deck_123/flashcards/fc_1"),
        expect.objectContaining({ method: "PUT" })
      );
    });
  });

  it("guides retry on update concurrency conflict and reloads canonical state", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);

        if (url.endsWith("/api/decks/deck_123/flashcards/fc_1") && !init?.method) {
          return jsonResponse(200, {
            id: "fc_1",
            deckId: "deck_123",
            term: "hola",
            definition: "hello",
            imageUrl: null,
            createdAtUtc: "2026-03-15T12:00:00Z",
            updatedAtUtc: "2026-03-15T12:00:00Z",
            createdByUserId: "usr_1",
            updatedByUserId: "usr_1",
          });
        }

        if (url.endsWith("/api/decks/deck_123/flashcards/fc_1") && init?.method === "PUT") {
          return jsonResponse(409, {
            code: "concurrency_conflict",
            message: "Flashcard was modified by another operation. Reload and retry.",
          });
        }

        return jsonResponse(404, { code: "not_found", message: "not found" });
      });

    renderRoute(
      "/decks/:deckId/flashcards/:flashcardId/edit",
      <FlashcardEditRoute />,
      "/decks/deck_123/flashcards/fc_1/edit"
    );

    const definitionInput = await screen.findByLabelText(/definition/i);
    await userEvent.clear(definitionInput);
    await userEvent.type(definitionInput, "hello informal");
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText(/reload latest flashcard and retry/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /reload latest/i }));

    await waitFor(() => {
      const detailCalls = fetchMock.mock.calls.filter(
        (call) =>
          String(call[0]).endsWith("/api/decks/deck_123/flashcards/fc_1") &&
          !(call[1] as RequestInit | undefined)?.method
      );
      expect(detailCalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("disables flashcard edit save until form changes", async () => {
    jest.spyOn(global, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url.endsWith("/api/decks/deck_123/flashcards/fc_1") && !init?.method) {
        return jsonResponse(200, {
          id: "fc_1",
          deckId: "deck_123",
          term: "hola",
          definition: "hello",
          imageUrl: null,
          createdAtUtc: "2026-03-15T12:00:00Z",
          updatedAtUtc: "2026-03-15T12:00:00Z",
          createdByUserId: "usr_1",
          updatedByUserId: "usr_1",
        });
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute(
      "/decks/:deckId/flashcards/:flashcardId/edit",
      <FlashcardEditRoute />,
      "/decks/deck_123/flashcards/fc_1/edit"
    );

    expect(await screen.findByRole("button", { name: /save changes/i })).toBeDisabled();
  });

  it("uses deck name breadcrumb in edit route", async () => {
    jest.spyOn(global, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      const deckDetailResponse = mockDeckDetail(url);
      if (deckDetailResponse) {
        return deckDetailResponse;
      }

      if (url.endsWith("/api/decks/deck_123/flashcards/fc_1") && !init?.method) {
        return jsonResponse(200, {
          id: "fc_1",
          deckId: "deck_123",
          term: "hola",
          definition: "hello",
          imageUrl: null,
          createdAtUtc: "2026-03-15T12:00:00Z",
          updatedAtUtc: "2026-03-15T12:00:00Z",
          createdByUserId: "usr_1",
          updatedByUserId: "usr_1",
        });
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute(
      "/decks/:deckId/flashcards/:flashcardId/edit",
      <FlashcardEditRoute />,
      "/decks/deck_123/flashcards/fc_1/edit"
    );

    expect(await screen.findByRole("link", { name: "Spanish Basics" })).toHaveAttribute("href", "/decks/deck_123");
    expect(screen.queryByRole("link", { name: "deck_123" })).not.toBeInTheDocument();
  });

  it("navigates away on flashcard edit cancel without calling update", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      const deckDetailResponse = mockDeckDetail(url);
      if (deckDetailResponse) {
        return deckDetailResponse;
      }

      if (url.endsWith("/api/decks/deck_123/flashcards/fc_1") && !init?.method) {
        return jsonResponse(200, {
          id: "fc_1",
          deckId: "deck_123",
          term: "hola",
          definition: "hello",
          imageUrl: null,
          createdAtUtc: "2026-03-15T12:00:00Z",
          updatedAtUtc: "2026-03-15T12:00:00Z",
          createdByUserId: "usr_1",
          updatedByUserId: "usr_1",
        });
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute(
      "/decks/:deckId/flashcards/:flashcardId/edit",
      <FlashcardEditRoute />,
      "/decks/deck_123/flashcards/fc_1/edit"
    );

    await screen.findByRole("button", { name: /save changes/i });
    await userEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(await screen.findByText("navigated")).toBeInTheDocument();
    const putCalls = fetchMock.mock.calls.filter(
      (call) => (call[1] as RequestInit | undefined)?.method === "PUT"
    );
    expect(putCalls).toHaveLength(0);
  });

  it("navigates away on flashcard create cancel without calling create", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      const deckDetailResponse = mockDeckDetail(url);
      if (deckDetailResponse) {
        return deckDetailResponse;
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute(
      "/decks/:deckId/flashcards/new",
      <FlashcardCreateRoute />,
      "/decks/deck_123/flashcards/new"
    );

    await screen.findByRole("button", { name: /create flashcard/i });
    await userEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(await screen.findByText("navigated")).toBeInTheDocument();
    const postCalls = fetchMock.mock.calls.filter(
      (call) => (call[1] as RequestInit | undefined)?.method === "POST"
    );
    expect(postCalls).toHaveLength(0);
  });
});
