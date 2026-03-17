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
    expect(screen.getByText(/blank canvas/i)).toBeInTheDocument();
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
});
