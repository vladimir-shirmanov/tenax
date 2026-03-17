import {
  keepPreviousData,
  QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { requestJson } from "./client";
import {
  DeckDeleteResponse,
  DeckDetail,
  DeckListResponse,
  DeckWriteRequest,
} from "./types";
import {
  isConcurrencyConflictError,
  isPersistenceUnavailableError,
} from "./errors";

export const deckKeys = {
  all: ["decks"] as const,
  listRoot: () => [...deckKeys.all, "list"] as const,
  list: (page: number, pageSize: number) =>
    [...deckKeys.listRoot(), page, pageSize] as const,
  detail: (deckId: string) => [...deckKeys.all, "detail", deckId] as const,
};

export const useDeckListQuery = (page: number, pageSize: number) =>
  useQuery({
    queryKey: deckKeys.list(page, pageSize),
    queryFn: () => requestJson<DeckListResponse>(`/api/decks?page=${page}&pageSize=${pageSize}`),
    staleTime: 30_000,
    retry: 1,
    placeholderData: keepPreviousData,
  });

export const useDeckDetailQuery = (deckId: string) =>
  useQuery({
    queryKey: deckKeys.detail(deckId),
    queryFn: () => requestJson<DeckDetail>(`/api/decks/${deckId}`),
    staleTime: 30_000,
    retry: 1,
    enabled: Boolean(deckId),
  });

export const useCreateDeckMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: DeckWriteRequest) =>
      requestJson<DeckDetail>("/api/decks", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: async (createdDeck) => {
      queryClient.setQueryData(deckKeys.detail(createdDeck.id), createdDeck);
      await queryClient.invalidateQueries({ queryKey: deckKeys.listRoot() });
    },
  });
};

export const useUpdateDeckMutation = (deckId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: DeckWriteRequest) =>
      requestJson<DeckDetail>(`/api/decks/${deckId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: async (updatedDeck) => {
      queryClient.setQueryData(deckKeys.detail(deckId), updatedDeck);
      await queryClient.invalidateQueries({ queryKey: deckKeys.listRoot() });
      await queryClient.invalidateQueries({ queryKey: deckKeys.detail(deckId) });
    },
    onError: async (error) => {
      if (!isConcurrencyConflictError(error)) {
        return;
      }

      await queryClient.invalidateQueries({ queryKey: deckKeys.detail(deckId) });
    },
  });
};

type OptimisticDeckListSnapshot = [QueryKey, DeckListResponse | undefined][];

export const useDeleteDeckMutation = (deckId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      requestJson<DeckDeleteResponse>(`/api/decks/${deckId}`, {
        method: "DELETE",
      }),
    onMutate: async (): Promise<OptimisticDeckListSnapshot> => {
      await queryClient.cancelQueries({ queryKey: deckKeys.listRoot() });
      const snapshots = queryClient.getQueriesData<DeckListResponse>({
        queryKey: deckKeys.listRoot(),
      });

      snapshots.forEach(([key, value]) => {
        if (!value) {
          return;
        }

        queryClient.setQueryData<DeckListResponse>(key, {
          ...value,
          items: value.items.filter((item) => item.id !== deckId),
          totalCount: Math.max(0, value.totalCount - 1),
        });
      });

      return snapshots;
    },
    onError: async (error, _variables, context) => {
      context?.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });

      if (isConcurrencyConflictError(error) || isPersistenceUnavailableError(error)) {
        await queryClient.invalidateQueries({ queryKey: deckKeys.listRoot() });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: deckKeys.listRoot() });
      queryClient.removeQueries({ queryKey: deckKeys.detail(deckId) });
    },
  });
};
