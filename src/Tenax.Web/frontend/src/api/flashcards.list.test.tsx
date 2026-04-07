import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import { flashcardKeys, useFlashcardListQuery } from "./flashcards";

const jsonResponse = (status: number, body: unknown) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response);

const wrapperFactory = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

describe("flashcard list query", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("builds query key with paging and shuffle params", () => {
    expect(flashcardKeys.list("deck_123", 1, 20, false, undefined)).toEqual([
      "flashcards",
      "list",
      "deck_123",
      { page: 1, pageSize: 20, shuffle: false, shuffleSeed: undefined },
    ]);

    expect(flashcardKeys.list("deck_123", 1, 20, false, "seed-ignored")).toEqual([
      "flashcards",
      "list",
      "deck_123",
      { page: 1, pageSize: 20, shuffle: false, shuffleSeed: undefined },
    ]);

    expect(flashcardKeys.list("deck_123", 2, 20, true, "seed-1")).toEqual([
      "flashcards",
      "list",
      "deck_123",
      { page: 2, pageSize: 20, shuffle: true, shuffleSeed: "seed-1" },
    ]);
  });

  it("omits shuffleSeed and shuffle query params when shuffle is false", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockImplementation(() =>
      jsonResponse(200, { items: [], page: 1, pageSize: 20, totalCount: 0 })
    );
    const queryClient = new QueryClient();

    renderHook(() => useFlashcardListQuery("deck_123", 1, 20, { shuffleSeed: "seed-1" }), {
      wrapper: wrapperFactory(queryClient),
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    const requestedUrl = String(fetchSpy.mock.calls[0][0]);
    expect(requestedUrl).toContain("/api/decks/deck_123/flashcards?page=1&pageSize=20");
    expect(requestedUrl).not.toContain("shuffle=true");
    expect(requestedUrl).not.toContain("shuffleSeed=");
  });

  it("sends shuffle=true and shuffleSeed when shuffle is true", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockImplementation(() =>
      jsonResponse(200, { items: [], page: 1, pageSize: 20, totalCount: 0 })
    );
    const queryClient = new QueryClient();

    renderHook(
      () =>
        useFlashcardListQuery("deck_123", 1, 20, {
          shuffle: true,
          shuffleSeed: "seed-1",
        }),
      {
        wrapper: wrapperFactory(queryClient),
      }
    );

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    const requestedUrl = String(fetchSpy.mock.calls[0][0]);
    expect(requestedUrl).toContain(
      "/api/decks/deck_123/flashcards?page=1&pageSize=20&shuffle=true&shuffleSeed=seed-1"
    );
  });
});
