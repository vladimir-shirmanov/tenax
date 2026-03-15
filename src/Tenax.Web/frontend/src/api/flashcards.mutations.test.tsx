import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import {
  flashcardKeys,
  useCreateFlashcardMutation,
  useDeleteFlashcardMutation,
  useUpdateFlashcardMutation,
} from "./flashcards";

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

describe("flashcard mutation cache behavior", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("invalidates list on create success", async () => {
    jest.spyOn(global, "fetch").mockImplementation(() =>
      jsonResponse(201, {
        id: "fc_1",
        deckId: "deck_123",
        term: "hola",
        definition: "hello",
        imageUrl: null,
        createdAtUtc: "2026-03-15T12:00:00Z",
        updatedAtUtc: "2026-03-15T12:00:00Z",
        createdByUserId: "usr_1",
        updatedByUserId: "usr_1",
      })
    );

    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateFlashcardMutation("deck_123"), {
      wrapper: wrapperFactory(queryClient),
    });

    result.current.mutate({ term: "hola", definition: "hello", imageUrl: null });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: flashcardKeys.listRoot("deck_123") })
      );
    });
  });

  it("invalidates list and detail on update success", async () => {
    jest.spyOn(global, "fetch").mockImplementation(() =>
      jsonResponse(200, {
        id: "fc_1",
        deckId: "deck_123",
        term: "hola",
        definition: "hello2",
        imageUrl: null,
        createdAtUtc: "2026-03-15T12:00:00Z",
        updatedAtUtc: "2026-03-15T12:10:00Z",
        createdByUserId: "usr_1",
        updatedByUserId: "usr_1",
      })
    );

    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () => useUpdateFlashcardMutation("deck_123", "fc_1"),
      {
        wrapper: wrapperFactory(queryClient),
      }
    );

    result.current.mutate({ term: "hola", definition: "hello2", imageUrl: null });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: flashcardKeys.listRoot("deck_123") })
      );
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: flashcardKeys.detail("deck_123", "fc_1") })
      );
    });
  });

  it("refetches canonical state on update concurrency conflict", async () => {
    jest.spyOn(global, "fetch").mockImplementation(() =>
      jsonResponse(409, {
        code: "concurrency_conflict",
        message: "Flashcard was modified by another operation. Reload and retry.",
      })
    );

    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () => useUpdateFlashcardMutation("deck_123", "fc_1"),
      {
        wrapper: wrapperFactory(queryClient),
      }
    );

    result.current.mutate({ term: "hola", definition: "hello2", imageUrl: null });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: flashcardKeys.listRoot("deck_123") })
      );
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: flashcardKeys.detail("deck_123", "fc_1") })
      );
    });
  });

  it("optimistically removes then invalidates and clears detail on delete", async () => {
    jest.spyOn(global, "fetch").mockImplementation(() =>
      jsonResponse(200, {
        deleted: true,
        id: "fc_1",
        deckId: "deck_123",
        deletedAtUtc: "2026-03-15T12:20:00Z",
      })
    );

    const queryClient = new QueryClient();
    queryClient.setQueryData(flashcardKeys.list("deck_123", 1, 50), {
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

    const removeSpy = jest.spyOn(queryClient, "removeQueries");
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () => useDeleteFlashcardMutation("deck_123", "fc_1"),
      {
        wrapper: wrapperFactory(queryClient),
      }
    );

    result.current.mutate();

    await waitFor(() => {
      const optimistic = queryClient.getQueryData<{
        items: Array<{ id: string }>;
        totalCount: number;
      }>(flashcardKeys.list("deck_123", 1, 50));

      expect(optimistic?.items).toHaveLength(0);
      expect(optimistic?.totalCount).toBe(0);
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: flashcardKeys.listRoot("deck_123") })
      );
      expect(removeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: flashcardKeys.detail("deck_123", "fc_1"),
        })
      );
    });
  });

  it("rolls back and refetches list on delete persistence outage", async () => {
    jest.spyOn(global, "fetch").mockImplementation(() =>
      jsonResponse(503, {
        code: "persistence_unavailable",
        message: "Persistence service is temporarily unavailable",
      })
    );

    const queryClient = new QueryClient();
    queryClient.setQueryData(flashcardKeys.list("deck_123", 1, 50), {
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

    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () => useDeleteFlashcardMutation("deck_123", "fc_1"),
      {
        wrapper: wrapperFactory(queryClient),
      }
    );

    result.current.mutate();

    await waitFor(() => {
      const rolledBack = queryClient.getQueryData<{
        items: Array<{ id: string }>;
        totalCount: number;
      }>(flashcardKeys.list("deck_123", 1, 50));

      expect(rolledBack?.items).toHaveLength(1);
      expect(rolledBack?.totalCount).toBe(1);
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: flashcardKeys.listRoot("deck_123") })
      );
    });
  });
});
