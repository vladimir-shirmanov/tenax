import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import {
  deckKeys,
  useCreateDeckMutation,
  useDeleteDeckMutation,
  useUpdateDeckMutation,
} from "./decks";

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

describe("deck mutation cache behavior", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("invalidates list on create success and seeds detail cache", async () => {
    jest.spyOn(global, "fetch").mockImplementation(() =>
      jsonResponse(201, {
        id: "deck_1",
        name: "Spanish Basics",
        description: "Everyday greetings",
        createdAtUtc: "2026-03-17T09:00:00Z",
        updatedAtUtc: "2026-03-17T09:00:00Z",
        createdByUserId: "usr_1",
        updatedByUserId: "usr_1",
      })
    );

    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateDeckMutation(), {
      wrapper: wrapperFactory(queryClient),
    });

    result.current.mutate({ name: "Spanish Basics", description: "Everyday greetings" });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: deckKeys.listRoot() })
      );
      expect(queryClient.getQueryData(deckKeys.detail("deck_1"))).toEqual(
        expect.objectContaining({ id: "deck_1", name: "Spanish Basics" })
      );
    });
  });

  it("invalidates list and detail on update success", async () => {
    jest.spyOn(global, "fetch").mockImplementation(() =>
      jsonResponse(200, {
        id: "deck_1",
        name: "Spanish Basics A1",
        description: "Updated",
        createdAtUtc: "2026-03-17T09:00:00Z",
        updatedAtUtc: "2026-03-17T10:15:00Z",
        createdByUserId: "usr_1",
        updatedByUserId: "usr_1",
      })
    );

    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateDeckMutation("deck_1"), {
      wrapper: wrapperFactory(queryClient),
    });

    result.current.mutate({ name: "Spanish Basics A1", description: "Updated" });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: deckKeys.listRoot() })
      );
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: deckKeys.detail("deck_1") })
      );
    });
  });

  it("forces canonical refetch on update concurrency conflict", async () => {
    jest.spyOn(global, "fetch").mockImplementation(() =>
      jsonResponse(409, {
        code: "concurrency_conflict",
        message: "Deck was modified by another operation. Reload and retry.",
      })
    );

    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateDeckMutation("deck_1"), {
      wrapper: wrapperFactory(queryClient),
    });

    result.current.mutate({ name: "Spanish Basics A1", description: "Updated" });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: deckKeys.detail("deck_1") })
      );
    });
  });

  it("optimistically removes then invalidates and clears detail on delete", async () => {
    jest.spyOn(global, "fetch").mockImplementation(() =>
      jsonResponse(200, {
        deleted: true,
        id: "deck_1",
        deletedAtUtc: "2026-03-17T11:05:00Z",
      })
    );

    const queryClient = new QueryClient();
    queryClient.setQueryData(deckKeys.list(1, 20), {
      items: [
        {
          id: "deck_1",
          name: "Spanish Basics",
          description: "Everyday greetings",
          flashcardCount: 42,
          createdAtUtc: "2026-03-17T09:00:00Z",
          updatedAtUtc: "2026-03-17T09:45:00Z",
          createdByUserId: "usr_1",
          updatedByUserId: "usr_1",
        },
      ],
      page: 1,
      pageSize: 20,
      totalCount: 1,
    });

    const removeSpy = jest.spyOn(queryClient, "removeQueries");
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeleteDeckMutation("deck_1"), {
      wrapper: wrapperFactory(queryClient),
    });

    result.current.mutate();

    await waitFor(() => {
      const optimistic = queryClient.getQueryData<{ items: Array<{ id: string }>; totalCount: number }>(
        deckKeys.list(1, 20)
      );

      expect(optimistic?.items).toHaveLength(0);
      expect(optimistic?.totalCount).toBe(0);
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: deckKeys.listRoot() })
      );
      expect(removeSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: deckKeys.detail("deck_1") })
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
    queryClient.setQueryData(deckKeys.list(1, 20), {
      items: [
        {
          id: "deck_1",
          name: "Spanish Basics",
          description: "Everyday greetings",
          flashcardCount: 42,
          createdAtUtc: "2026-03-17T09:00:00Z",
          updatedAtUtc: "2026-03-17T09:45:00Z",
          createdByUserId: "usr_1",
          updatedByUserId: "usr_1",
        },
      ],
      page: 1,
      pageSize: 20,
      totalCount: 1,
    });

    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeleteDeckMutation("deck_1"), {
      wrapper: wrapperFactory(queryClient),
    });

    result.current.mutate();

    await waitFor(() => {
      const rolledBack = queryClient.getQueryData<{ items: Array<{ id: string }>; totalCount: number }>(
        deckKeys.list(1, 20)
      );

      expect(rolledBack?.items).toHaveLength(1);
      expect(rolledBack?.totalCount).toBe(1);
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: deckKeys.listRoot() })
      );
    });
  });
});
