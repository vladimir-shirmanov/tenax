import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DecksRoute } from "./decks";
import { DeckCreateRoute } from "./decks.new";
import { DeckDetailRoute } from "./decks.$deckId";
import { DeckEditRoute } from "./decks.$deckId.edit";
import { renderRoute } from "../test/test-utils";

const jsonResponse = (status: number, body: unknown) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response);

const deckDetailPayload = {
  id: "deck_123",
  name: "Spanish Basics",
  description: "Everyday greetings",
  flashcardCount: 12,
  createdAtUtc: "2026-03-17T09:00:00Z",
  updatedAtUtc: "2026-03-17T09:45:00Z",
  createdByUserId: "usr_42",
  updatedByUserId: "usr_42",
};

describe("deck routes", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("renders deck list loading and success state", async () => {
    jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/api/decks?page=1&pageSize=20")) {
        return jsonResponse(200, {
          items: [
            {
              id: "deck_123",
              name: "Spanish Basics",
              description: "Everyday greetings",
              flashcardCount: 42,
              createdAtUtc: "2026-03-17T09:00:00Z",
              updatedAtUtc: "2026-03-17T09:45:00Z",
              createdByUserId: "usr_42",
              updatedByUserId: "usr_42",
            },
          ],
          page: 1,
          pageSize: 20,
          totalCount: 1,
        });
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute("/decks", <DecksRoute />, "/decks");

    expect(screen.getByText(/loading decks/i)).toBeInTheDocument();
    expect(await screen.findByText("Spanish Basics")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create deck/i })).toBeInTheDocument();
    expect(screen.getByText("42 flashcards")).toBeInTheDocument();
    expect(screen.getByText(/showing 1–1 of 1/i)).toBeInTheDocument();
  });

  it("renders deck list empty state", async () => {
    jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/api/decks?page=1&pageSize=20")) {
        return jsonResponse(200, {
          items: [],
          page: 1,
          pageSize: 20,
          totalCount: 0,
        });
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute("/decks", <DecksRoute />, "/decks");

    expect(await screen.findByText(/ready to build your vocabulary/i)).toBeInTheDocument();
  });

  it("renders singular flashcard count in list and delete confirmation", async () => {
    jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/api/decks?page=1&pageSize=20")) {
        return jsonResponse(200, {
          items: [
            {
              id: "deck_123",
              name: "Spanish Basics",
              description: "Everyday greetings",
              flashcardCount: 1,
              createdAtUtc: "2026-03-17T09:00:00Z",
              updatedAtUtc: "2026-03-17T09:45:00Z",
              createdByUserId: "usr_42",
              updatedByUserId: "usr_42",
            },
          ],
          page: 1,
          pageSize: 20,
          totalCount: 1,
        });
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute("/decks", <DecksRoute />, "/decks");

    expect(await screen.findByText("1 flashcard")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(await screen.findByText(/remove all 1 flashcard inside/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^cancel$/i })).toHaveFocus();
  });

  it("renders deck list error and supports retry for persistence outage", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockImplementationOnce((input) => {
        const url = String(input);
        if (url.includes("/api/decks?page=1&pageSize=20")) {
          return jsonResponse(503, {
            code: "persistence_unavailable",
            message: "Persistence service is temporarily unavailable",
          });
        }

        return jsonResponse(404, { code: "not_found", message: "not found" });
      })
      .mockImplementationOnce((input) => {
        const url = String(input);
        if (url.includes("/api/decks?page=1&pageSize=20")) {
          return jsonResponse(503, {
            code: "persistence_unavailable",
            message: "Persistence service is temporarily unavailable",
          });
        }

        return jsonResponse(404, { code: "not_found", message: "not found" });
      })
      .mockImplementationOnce((input) => {
        const url = String(input);
        if (url.includes("/api/decks?page=1&pageSize=20")) {
          return jsonResponse(200, {
            items: [],
            page: 1,
            pageSize: 20,
            totalCount: 0,
          });
        }

        return jsonResponse(404, { code: "not_found", message: "not found" });
      });

    renderRoute("/decks", <DecksRoute />, "/decks");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    }, { timeout: 5000 });

    await userEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(await screen.findByText(/ready to build your vocabulary/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("shows create validation errors and submits successfully", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockImplementationOnce((input, init) => {
        const url = String(input);
        if (url.endsWith("/api/decks") && init?.method === "POST") {
          return jsonResponse(400, {
            code: "validation_error",
            message: "Request validation failed",
            errors: {
              name: ["name is required"],
            },
          });
        }

        return jsonResponse(404, { code: "not_found", message: "not found" });
      })
      .mockImplementation((input, init) => {
      const url = String(input);
      if (url.endsWith("/api/decks") && init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        return jsonResponse(201, {
          id: "deck_123",
          name: body.name,
          description: body.description || null,
          createdAtUtc: "2026-03-17T09:00:00Z",
          updatedAtUtc: "2026-03-17T09:00:00Z",
          createdByUserId: "usr_42",
          updatedByUserId: "usr_42",
        });
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute("/decks/new", <DeckCreateRoute />, "/decks/new");

    await userEvent.type(screen.getByLabelText(/deck name/i), "Spanish Basics");
    await userEvent.click(screen.getByRole("button", { name: /create deck/i }));

    expect(await screen.findByText(/request validation failed/i)).toBeInTheDocument();
    expect(screen.getByText(/name is required/i)).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText(/deck name/i));
    await userEvent.type(screen.getByLabelText(/deck name/i), "Spanish Basics updated");
    await userEvent.click(screen.getByRole("button", { name: /create deck/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/decks"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("renders deck detail success state", async () => {
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

      return jsonResponse(404, { code: "deck_not_found", message: "Deck not found" });
    });

    renderRoute("/decks/:deckId", <DeckDetailRoute />, "/decks/deck_123");

    expect(await screen.findByRole("heading", { name: "Spanish Basics" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /deck detail/i })).not.toBeInTheDocument();
    expect(screen.getByText(/blank canvas/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /study now/i })).toHaveAttribute("href", "/decks/deck_123/study");
  });

  it("renders deck detail forbidden and not-found messages", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/api/decks/deck_123")) {
        return jsonResponse(403, {
          code: "forbidden",
          message: "You do not have permission to view this deck",
        });
      }

      if (url.endsWith("/api/decks/deck_404")) {
        return jsonResponse(404, {
          code: "deck_not_found",
          message: "Deck not found",
        });
      }

      return jsonResponse(404, { code: "deck_not_found", message: "Deck not found" });
    });

    const firstRender = renderRoute("/decks/:deckId", <DeckDetailRoute />, "/decks/deck_123");
    expect(
      await screen.findByText(/do not have access to view this deck/i, {}, { timeout: 5000 })
    ).toBeInTheDocument();
    firstRender.unmount();

    renderRoute("/decks/:deckId", <DeckDetailRoute />, "/decks/deck_404");
    expect(
      await screen.findByText(/couldn't find this deck/i, {}, { timeout: 5000 })
    ).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalled();
  });

  it("disables edit submit until dirty and handles concurrency conflict", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url.endsWith("/api/decks/deck_123") && !init?.method) {
        return jsonResponse(200, {
          id: "deck_123",
          name: "Spanish Basics",
          description: "Everyday greetings",
          flashcardCount: 5,
          createdAtUtc: "2026-03-17T09:00:00Z",
          updatedAtUtc: "2026-03-17T09:45:00Z",
          createdByUserId: "usr_42",
          updatedByUserId: "usr_42",
        });
      }

      if (url.endsWith("/api/decks/deck_123") && init?.method === "PUT") {
        return jsonResponse(409, {
          code: "concurrency_conflict",
          message: "Deck was modified by another operation. Reload and retry.",
        });
      }

      return jsonResponse(404, { code: "deck_not_found", message: "Deck not found" });
    });

    renderRoute("/decks/:deckId/edit", <DeckEditRoute />, "/decks/deck_123/edit");

    const saveButton = await screen.findByRole("button", { name: /save changes/i });
    expect(saveButton).toBeDisabled();

    const descriptionInput = screen.getByLabelText(/description/i);
    await userEvent.type(descriptionInput, " now with polite responses");
    expect(saveButton).toBeEnabled();

    await userEvent.click(saveButton);

    expect(await screen.findByText(/reload latest deck and retry/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /reload latest/i }));

    await waitFor(() => {
      const detailCalls = fetchMock.mock.calls.filter(
        (call) => String(call[0]).endsWith("/api/decks/deck_123") && !(call[1] as RequestInit | undefined)?.method
      );
      expect(detailCalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("shows edit deck page title in sentence case", async () => {
    jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url.endsWith("/api/decks/deck_123")) {
        return jsonResponse(200, {
          id: "deck_123",
          name: "Spanish Basics",
          description: "Everyday greetings",
          flashcardCount: 5,
          createdAtUtc: "2026-03-17T09:00:00Z",
          updatedAtUtc: "2026-03-17T09:45:00Z",
          createdByUserId: "usr_42",
          updatedByUserId: "usr_42",
        });
      }

      return jsonResponse(404, { code: "deck_not_found", message: "Deck not found" });
    });

    renderRoute("/decks/:deckId/edit", <DeckEditRoute />, "/decks/deck_123/edit");
    expect(await screen.findByRole("heading", { name: "Edit deck" })).toBeInTheDocument();
  });

  it("navigates away on edit cancel without calling update", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url.endsWith("/api/decks/deck_123")) {
        return jsonResponse(200, {
          id: "deck_123",
          name: "Spanish Basics",
          description: "Everyday greetings",
          flashcardCount: 5,
          createdAtUtc: "2026-03-17T09:00:00Z",
          updatedAtUtc: "2026-03-17T09:45:00Z",
          createdByUserId: "usr_42",
          updatedByUserId: "usr_42",
        });
      }

      return jsonResponse(404, { code: "deck_not_found", message: "Deck not found" });
    });

    renderRoute("/decks/:deckId/edit", <DeckEditRoute />, "/decks/deck_123/edit");

    await screen.findByRole("button", { name: /save changes/i });
    await userEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(await screen.findByText("navigated")).toBeInTheDocument();
    const putCalls = fetchMock.mock.calls.filter(
      (call) => (call[1] as RequestInit | undefined)?.method === "PUT"
    );
    expect(putCalls).toHaveLength(0);
  });

  it("renders flashcard preview loading state", async () => {
    jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/api/decks/deck_123")) {
        return jsonResponse(200, deckDetailPayload);
      }

      if (url.includes("/api/decks/deck_123/flashcards?page=1&pageSize=10")) {
        return new Promise(() => undefined) as Promise<Response>;
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute("/decks/:deckId", <DeckDetailRoute />, "/decks/deck_123");

    expect(await screen.findByText(/loading flashcards/i)).toBeInTheDocument();
  });

  it("renders flashcard preview empty state with add link", async () => {
    jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/api/decks/deck_123")) {
        return jsonResponse(200, { ...deckDetailPayload, flashcardCount: 0 });
      }

      if (url.includes("/api/decks/deck_123/flashcards?page=1&pageSize=10")) {
        return jsonResponse(200, { items: [], page: 1, pageSize: 10, totalCount: 0 });
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute("/decks/:deckId", <DeckDetailRoute />, "/decks/deck_123");

    expect(await screen.findByText(/no flashcards in this deck yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /add your first flashcard/i })).toHaveAttribute(
      "href",
      "/decks/deck_123/flashcards/new"
    );
  });

  it("renders flashcard preview error state and retries", async () => {
    let listAttempts = 0;
    const fetchMock = jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/api/decks/deck_123")) {
        return jsonResponse(200, deckDetailPayload);
      }

      if (url.includes("/api/decks/deck_123/flashcards?page=1&pageSize=10")) {
        listAttempts += 1;
        if (listAttempts < 3) {
          return jsonResponse(500, { code: "server_error", message: "Something failed" });
        }

        return jsonResponse(200, {
          items: [],
          page: 1,
          pageSize: 10,
          totalCount: 0,
        });
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute("/decks/:deckId", <DeckDetailRoute />, "/decks/deck_123");

    expect(
      await screen.findByText(/could not load flashcards/i, {}, { timeout: 5000 })
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(await screen.findByText(/no flashcards in this deck yet/i)).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter((call) => String(call[0]).includes("pageSize=10")).length).toBeGreaterThanOrEqual(2);
  });

  it("renders flashcard preview list, image badge, pagination, and view all link", async () => {
    jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/api/decks/deck_123")) {
        return jsonResponse(200, deckDetailPayload);
      }

      if (url.includes("/api/decks/deck_123/flashcards?page=1&pageSize=10")) {
        return jsonResponse(200, {
          items: Array.from({ length: 10 }).map((_, index) => ({
            id: `fc_${index + 1}`,
            deckId: "deck_123",
            term: `term ${index + 1}`,
            definitionPreview: `definition ${index + 1}`,
            hasImage: index === 0,
            updatedAtUtc: "2026-03-15T12:00:00Z",
            updatedByUserId: "usr_1",
          })),
          page: 1,
          pageSize: 10,
          totalCount: 12,
        });
      }

      if (url.includes("/api/decks/deck_123/flashcards?page=2&pageSize=10")) {
        return jsonResponse(200, {
          items: [
            {
              id: "fc_11",
              deckId: "deck_123",
              term: "term 11",
              definitionPreview: "definition 11",
              hasImage: false,
              updatedAtUtc: "2026-03-15T12:00:00Z",
              updatedByUserId: "usr_1",
            },
            {
              id: "fc_12",
              deckId: "deck_123",
              term: "term 12",
              definitionPreview: "definition 12",
              hasImage: false,
              updatedAtUtc: "2026-03-15T12:00:00Z",
              updatedByUserId: "usr_1",
            },
          ],
          page: 2,
          pageSize: 10,
          totalCount: 12,
        });
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute("/decks/:deckId", <DeckDetailRoute />, "/decks/deck_123");

    expect(await screen.findByRole("heading", { name: "Flashcards" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view all flashcards/i })).toHaveAttribute(
      "href",
      "/decks/deck_123/flashcards"
    );
    expect(screen.getByRole("link", { name: "term 1" })).toHaveClass("flat-list__title");
    expect(screen.getByText("definition 1")).toBeInTheDocument();
    expect(screen.getByText("image")).toHaveClass("flashcard-preview__image-badge");
    expect(screen.getByText("Showing 1–10 of 12 flashcards")).toBeInTheDocument();

    const previousButton = screen.getByRole("button", { name: /previous/i });
    const nextButton = screen.getByRole("button", { name: /next/i });
    expect(previousButton).toBeDisabled();
    expect(nextButton).toBeEnabled();

    await userEvent.click(nextButton);

    expect(await screen.findByText("Showing 11–12 of 12 flashcards")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("handles inline delete flow states", async () => {
    let deleteAttempt = 0;
    const fetchMock = jest.spyOn(global, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url.endsWith("/api/decks/deck_123") && !init?.method) {
        return jsonResponse(200, deckDetailPayload);
      }

      if (url.includes("/api/decks/deck_123/flashcards?page=1&pageSize=10")) {
        return jsonResponse(200, {
          items: [],
          page: 1,
          pageSize: 10,
          totalCount: 0,
        });
      }

      if (url.endsWith("/api/decks/deck_123") && init?.method === "DELETE") {
        deleteAttempt += 1;
        if (deleteAttempt === 1) {
          return jsonResponse(409, {
            code: "concurrency_conflict",
            message: "Conflict",
          });
        }

        return jsonResponse(503, {
          code: "persistence_unavailable",
          message: "Service unavailable",
        });
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute("/decks/:deckId", <DeckDetailRoute />, "/decks/deck_123");

    expect(await screen.findByRole("button", { name: /delete deck/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /delete deck/i }));
    expect(
      screen.getByText(/are you sure you want to delete this deck\? this action cannot be undone\./i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm delete/i })).toHaveFocus();

    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.getByRole("button", { name: /delete deck/i })).toHaveFocus();

    await userEvent.click(screen.getByRole("button", { name: /delete deck/i }));
    await userEvent.click(screen.getByRole("button", { name: /confirm delete/i }));
    expect(
      await screen.findByText(/this deck was modified by another action\. refresh the page to see the latest state before retrying\./i)
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.getByRole("button", { name: /delete deck/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /delete deck/i }));
    await userEvent.click(screen.getByRole("button", { name: /confirm delete/i }));
    expect(
      await screen.findByText(/service temporarily unavailable\. please try again\./i)
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(screen.getByRole("button", { name: /confirm delete/i })).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: /delete deck/i })).toBeInTheDocument();

    const deleteCalls = fetchMock.mock.calls.filter(
      (call) => String(call[0]).endsWith("/api/decks/deck_123") && (call[1] as RequestInit | undefined)?.method === "DELETE"
    );
    expect(deleteCalls).toHaveLength(2);
  });

  it("navigates to /decks after successful deck delete", async () => {
    jest.spyOn(global, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url.endsWith("/api/decks/deck_123") && !init?.method) {
        return jsonResponse(200, deckDetailPayload);
      }

      if (url.includes("/api/decks/deck_123/flashcards?page=1&pageSize=10")) {
        return jsonResponse(200, { items: [], page: 1, pageSize: 10, totalCount: 0 });
      }

      if (url.endsWith("/api/decks/deck_123") && init?.method === "DELETE") {
        return jsonResponse(200, {
          deleted: true,
          id: "deck_123",
          deletedAtUtc: "2026-04-01T10:00:00Z",
        });
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute("/decks/:deckId", <DeckDetailRoute />, "/decks/deck_123");

    await screen.findByRole("button", { name: /delete deck/i });
    await userEvent.click(screen.getByRole("button", { name: /delete deck/i }));
    await userEvent.click(screen.getByRole("button", { name: /confirm delete/i }));

    expect(await screen.findByText("navigated")).toBeInTheDocument();
  });

  it("disables confirm delete and cancel buttons while delete mutation is pending", async () => {
    jest.spyOn(global, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url.endsWith("/api/decks/deck_123") && !init?.method) {
        return jsonResponse(200, deckDetailPayload);
      }

      if (url.includes("/api/decks/deck_123/flashcards?page=1&pageSize=10")) {
        return jsonResponse(200, { items: [], page: 1, pageSize: 10, totalCount: 0 });
      }

      if (url.endsWith("/api/decks/deck_123") && init?.method === "DELETE") {
        return new Promise(() => undefined) as Promise<Response>;
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute("/decks/:deckId", <DeckDetailRoute />, "/decks/deck_123");

    await screen.findByRole("button", { name: /delete deck/i });
    await userEvent.click(screen.getByRole("button", { name: /delete deck/i }));
    await userEvent.click(screen.getByRole("button", { name: /confirm delete/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /deleting/i })).toBeDisabled();
    });
    expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
  });

  it("error_generic: shows generic error panel, Try again returns to confirming, Dismiss returns to idle", async () => {
    let deleteAttempt = 0;
    jest.spyOn(global, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url.endsWith("/api/decks/deck_123") && !init?.method) {
        return jsonResponse(200, deckDetailPayload);
      }

      if (url.includes("/api/decks/deck_123/flashcards?page=1&pageSize=10")) {
        return jsonResponse(200, { items: [], page: 1, pageSize: 10, totalCount: 0 });
      }

      if (url.endsWith("/api/decks/deck_123") && init?.method === "DELETE") {
        deleteAttempt += 1;
        if (deleteAttempt === 1) {
          return jsonResponse(500, { code: "server_error", message: "Unexpected server error" });
        }

        return jsonResponse(200, {
          deleted: true,
          id: "deck_123",
          deletedAtUtc: "2026-04-01T10:00:00Z",
        });
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute("/decks/:deckId", <DeckDetailRoute />, "/decks/deck_123");

    await screen.findByRole("button", { name: /delete deck/i });
    await userEvent.click(screen.getByRole("button", { name: /delete deck/i }));
    await userEvent.click(screen.getByRole("button", { name: /confirm delete/i }));

    expect(await screen.findByText(/failed to delete deck\. please try again\./i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^try again$/i }));
    expect(screen.getByRole("button", { name: /confirm delete/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /confirm delete/i }));
    expect(await screen.findByText("navigated")).toBeInTheDocument();
  });
});
