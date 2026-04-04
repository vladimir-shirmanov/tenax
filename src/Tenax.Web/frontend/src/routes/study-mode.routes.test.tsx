import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudyModeRoute } from "./decks.$deckId.study";
import { renderRoute } from "../test/test-utils";

const jsonResponse = (status: number, body: unknown) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response);

describe("study mode route", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("renders loading then first card", async () => {
    jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url.endsWith("/api/decks/deck_123")) {
        return jsonResponse(200, {
          id: "deck_123",
          name: "Spanish Basics",
          description: "Everyday greetings",
          flashcardCount: 2,
          createdAtUtc: "2026-03-17T09:00:00Z",
          updatedAtUtc: "2026-03-17T09:45:00Z",
          createdByUserId: "usr_42",
          updatedByUserId: "usr_42",
        });
      }

      if (url.includes("/api/decks/deck_123/flashcards?page=1&pageSize=500")) {
        return jsonResponse(200, {
          items: [
            {
              id: "fc_1",
              deckId: "deck_123",
              term: "hola",
              definitionPreview: "hello preview",
              hasImage: false,
              updatedAtUtc: "2026-03-15T12:00:00Z",
              updatedByUserId: "usr_1",
            },
            {
              id: "fc_2",
              deckId: "deck_123",
              term: "adios",
              definitionPreview: "bye preview",
              hasImage: false,
              updatedAtUtc: "2026-03-15T12:00:00Z",
              updatedByUserId: "usr_1",
            },
          ],
          page: 1,
          pageSize: 500,
          totalCount: 2,
        });
      }

      if (url.endsWith("/api/decks/deck_123/flashcards/fc_1")) {
        return jsonResponse(200, {
          id: "fc_1",
          deckId: "deck_123",
          term: "hola detail",
          definition: "hello detail",
          imageUrl: null,
          createdAtUtc: "2026-03-15T12:00:00Z",
          updatedAtUtc: "2026-03-15T12:00:00Z",
          createdByUserId: "usr_1",
          updatedByUserId: "usr_1",
        });
      }

      if (url.endsWith("/api/decks/deck_123/flashcards/fc_2")) {
        return jsonResponse(200, {
          id: "fc_2",
          deckId: "deck_123",
          term: "adios detail",
          definition: "bye detail",
          imageUrl: null,
          createdAtUtc: "2026-03-15T12:00:00Z",
          updatedAtUtc: "2026-03-15T12:00:00Z",
          createdByUserId: "usr_1",
          updatedByUserId: "usr_1",
        });
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute("/decks/:deckId/study", <StudyModeRoute />, "/decks/deck_123/study");

    expect(screen.getByText(/loading cards/i)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /press enter or space to flip the flashcard/i })).toBeInTheDocument();
    expect(screen.getByText("hola", { selector: ".flashcard-study-card__term" })).toBeInTheDocument();
  });

  it("renders breadcrumb deck name and shuffle toggle aria state", async () => {
    jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
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
      if (url.includes("/api/decks/deck_123/flashcards?page=1&pageSize=500")) {
        return jsonResponse(200, {
          items: [
            {
              id: "fc_1",
              deckId: "deck_123",
              term: "hola",
              definitionPreview: "hello preview",
              hasImage: false,
              updatedAtUtc: "2026-03-15T12:00:00Z",
              updatedByUserId: "usr_1",
            },
          ],
          page: 1,
          pageSize: 500,
          totalCount: 1,
        });
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

    renderRoute("/decks/:deckId/study", <StudyModeRoute />, "/decks/deck_123/study");

    expect(await screen.findByRole("link", { name: "Spanish Basics" })).toHaveAttribute("href", "/decks/deck_123");
    const shuffleButton = screen.getByRole("button", { name: /shuffle cards/i });
    expect(shuffleButton).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(shuffleButton);
    expect(shuffleButton).toHaveAttribute("aria-pressed", "true");
  });

  it("disables previous on first card and finishes on last card", async () => {
    jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/api/decks/deck_123")) {
        return jsonResponse(200, {
          id: "deck_123",
          name: "Spanish Basics",
          description: "Everyday greetings",
          flashcardCount: 2,
          createdAtUtc: "2026-03-17T09:00:00Z",
          updatedAtUtc: "2026-03-17T09:45:00Z",
          createdByUserId: "usr_42",
          updatedByUserId: "usr_42",
        });
      }
      if (url.includes("/api/decks/deck_123/flashcards?page=1&pageSize=500")) {
        return jsonResponse(200, {
          items: [
            {
              id: "fc_1",
              deckId: "deck_123",
              term: "hola",
              definitionPreview: "hello preview",
              hasImage: false,
              updatedAtUtc: "2026-03-15T12:00:00Z",
              updatedByUserId: "usr_1",
            },
            {
              id: "fc_2",
              deckId: "deck_123",
              term: "adios",
              definitionPreview: "bye preview",
              hasImage: false,
              updatedAtUtc: "2026-03-15T12:00:00Z",
              updatedByUserId: "usr_1",
            },
          ],
          page: 1,
          pageSize: 500,
          totalCount: 2,
        });
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
      if (url.endsWith("/api/decks/deck_123/flashcards/fc_2")) {
        return jsonResponse(200, {
          id: "fc_2",
          deckId: "deck_123",
          term: "adios",
          definition: "bye",
          imageUrl: null,
          createdAtUtc: "2026-03-15T12:00:00Z",
          updatedAtUtc: "2026-03-15T12:00:00Z",
          createdByUserId: "usr_1",
          updatedByUserId: "usr_1",
        });
      }
      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute("/decks/:deckId/study", <StudyModeRoute />, "/decks/deck_123/study");

    expect(await screen.findByRole("button", { name: /next/i })).toBeInTheDocument();
    const previousButton = screen.getByRole("button", { name: /previous/i });
    expect(previousButton).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByRole("button", { name: /^finish$/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^finish$/i }));
    expect(await screen.findByRole("heading", { name: /you finished/i })).toBeInTheDocument();
  });

  it("renders empty state", async () => {
    jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/api/decks/deck_123")) {
        return jsonResponse(200, {
          id: "deck_123",
          name: "Spanish Basics",
          description: "Everyday greetings",
          flashcardCount: 0,
          createdAtUtc: "2026-03-17T09:00:00Z",
          updatedAtUtc: "2026-03-17T09:45:00Z",
          createdByUserId: "usr_42",
          updatedByUserId: "usr_42",
        });
      }
      if (url.includes("/api/decks/deck_123/flashcards?page=1&pageSize=500")) {
        return jsonResponse(200, {
          items: [],
          page: 1,
          pageSize: 500,
          totalCount: 0,
        });
      }
      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute("/decks/:deckId/study", <StudyModeRoute />, "/decks/deck_123/study");

    expect(await screen.findByText(/this deck has no flashcards yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /add flashcards/i })).toHaveAttribute("href", "/decks/deck_123/flashcards/new");
  });

  it("supports keyboard navigation and flip", async () => {
    jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/api/decks/deck_123")) {
        return jsonResponse(200, {
          id: "deck_123",
          name: "Spanish Basics",
          description: "Everyday greetings",
          flashcardCount: 2,
          createdAtUtc: "2026-03-17T09:00:00Z",
          updatedAtUtc: "2026-03-17T09:45:00Z",
          createdByUserId: "usr_42",
          updatedByUserId: "usr_42",
        });
      }
      if (url.includes("/api/decks/deck_123/flashcards?page=1&pageSize=500")) {
        return jsonResponse(200, {
          items: [
            {
              id: "fc_1",
              deckId: "deck_123",
              term: "hola",
              definitionPreview: "hello preview",
              hasImage: false,
              updatedAtUtc: "2026-03-15T12:00:00Z",
              updatedByUserId: "usr_1",
            },
            {
              id: "fc_2",
              deckId: "deck_123",
              term: "adios",
              definitionPreview: "bye preview",
              hasImage: false,
              updatedAtUtc: "2026-03-15T12:00:00Z",
              updatedByUserId: "usr_1",
            },
          ],
          page: 1,
          pageSize: 500,
          totalCount: 2,
        });
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
      if (url.endsWith("/api/decks/deck_123/flashcards/fc_2")) {
        return jsonResponse(200, {
          id: "fc_2",
          deckId: "deck_123",
          term: "adios",
          definition: "bye",
          imageUrl: null,
          createdAtUtc: "2026-03-15T12:00:00Z",
          updatedAtUtc: "2026-03-15T12:00:00Z",
          createdByUserId: "usr_1",
          updatedByUserId: "usr_1",
        });
      }
      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute("/decks/:deckId/study", <StudyModeRoute />, "/decks/deck_123/study");

    await screen.findByText("hola", { selector: ".flashcard-study-card__term" });
    await userEvent.keyboard(" ");
    expect(await screen.findByText("hello")).toBeInTheDocument();
    await userEvent.keyboard("{ArrowRight}");
    expect(await screen.findByText("adios", { selector: ".flashcard-study-card__term" })).toBeInTheDocument();
    await userEvent.keyboard("{ArrowLeft}");
    expect(await screen.findByText("hola", { selector: ".flashcard-study-card__term" })).toBeInTheDocument();
  });

  it("falls back to list values before detail and then uses detail values", async () => {
    jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
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
      if (url.includes("/api/decks/deck_123/flashcards?page=1&pageSize=500")) {
        return jsonResponse(200, {
          items: [
            {
              id: "fc_1",
              deckId: "deck_123",
              term: "hola list",
              definitionPreview: "hello preview list",
              hasImage: false,
              updatedAtUtc: "2026-03-15T12:00:00Z",
              updatedByUserId: "usr_1",
            },
          ],
          page: 1,
          pageSize: 500,
          totalCount: 1,
        });
      }
      if (url.endsWith("/api/decks/deck_123/flashcards/fc_1")) {
        return new Promise<Response>((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              text: async () =>
                JSON.stringify({
                  id: "fc_1",
                  deckId: "deck_123",
                  term: "hola detail",
                  definition: "hello detail",
                  imageUrl: null,
                  createdAtUtc: "2026-03-15T12:00:00Z",
                  updatedAtUtc: "2026-03-15T12:00:00Z",
                  createdByUserId: "usr_1",
                  updatedByUserId: "usr_1",
                }),
            } as Response);
          }, 20);
        });
      }
      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute("/decks/:deckId/study", <StudyModeRoute />, "/decks/deck_123/study");

    expect(await screen.findByText("hola list", { selector: ".flashcard-study-card__term" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("hola detail", { selector: ".flashcard-study-card__term" })).toBeInTheDocument();
    });
  });
});
