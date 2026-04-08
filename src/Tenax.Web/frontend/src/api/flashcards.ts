import {
  keepPreviousData,
  QueryKey,
  useMutation,
  useQuery,
  UseQueryResult,
  useQueryClient,
} from "@tanstack/react-query";
import { requestJson } from "./client";
import {
  FlashcardDeleteResponse,
  FlashcardDetail,
  FlashcardListResponse,
  FlashcardWriteRequest,
} from "./types";
import {
  isConcurrencyConflictError,
  isPersistenceUnavailableError,
} from "./errors";

export const flashcardKeys = {
  all: ["flashcards"] as const,
  listRoot: (deckId: string) => [...flashcardKeys.all, "list", deckId] as const,
  list: (deckId: string, page: number, pageSize: number, shuffle = false, shuffleSeed?: string) => {
    const normalizedShuffleSeed = shuffle ? shuffleSeed : undefined;
    return [...flashcardKeys.listRoot(deckId), { page, pageSize, shuffle, shuffleSeed: normalizedShuffleSeed }] as const;
  },
  detail: (deckId: string, flashcardId: string) =>
    [...flashcardKeys.all, "detail", deckId, flashcardId] as const,
};

type FlashcardListOptions = {
  page?: number;
  pageSize?: number;
  shuffle?: boolean;
  shuffleSeed?: string;
};

export function useFlashcardListQuery(
  deckId: string,
  page: number,
  pageSize?: number,
  options?: FlashcardListOptions
): UseQueryResult<FlashcardListResponse>;
export function useFlashcardListQuery(
  deckId: string,
  options: FlashcardListOptions
): UseQueryResult<FlashcardListResponse>;
export function useFlashcardListQuery(
  deckId: string,
  pageOrOptions: number | FlashcardListOptions,
  pageSize?: number,
  options?: FlashcardListOptions
) {
  const resolvedOptions =
    typeof pageOrOptions === "number"
      ? {
          page: pageOrOptions,
          pageSize: pageSize ?? 20,
          shuffle: options?.shuffle,
          shuffleSeed: options?.shuffleSeed,
        }
      : {
          page: pageOrOptions.page ?? 1,
          pageSize: pageOrOptions.pageSize ?? 20,
          shuffle: pageOrOptions.shuffle,
          shuffleSeed: pageOrOptions.shuffleSeed,
        };
  const page = resolvedOptions.page;
  const resolvedPageSize = resolvedOptions.pageSize;
  const shuffle = resolvedOptions.shuffle ?? false;
  // Normalize: exclude shuffleSeed from key and params when shuffle is false
  const shuffleSeed = shuffle ? resolvedOptions.shuffleSeed : undefined;
  const shuffleParams = shuffle
    ? `&shuffle=true${shuffleSeed != null ? `&shuffleSeed=${encodeURIComponent(shuffleSeed)}` : ""}`
    : "";

  return useQuery({
    queryKey: flashcardKeys.list(deckId, page, resolvedPageSize, shuffle, shuffleSeed),
    queryFn: () =>
      requestJson<FlashcardListResponse>(
        `/api/decks/${deckId}/flashcards?page=${page}&pageSize=${resolvedPageSize}${shuffleParams}`
      ),
    staleTime: 30_000,
    retry: 1,
    placeholderData: keepPreviousData,
  });
};

export const useFlashcardDetailQuery = (deckId: string, flashcardId: string) =>
  useQuery({
    queryKey: flashcardKeys.detail(deckId, flashcardId),
    queryFn: () =>
      requestJson<FlashcardDetail>(
        `/api/decks/${deckId}/flashcards/${flashcardId}`
      ),
    staleTime: 30_000,
    retry: 1,
    enabled: Boolean(deckId && flashcardId),
  });

export const useCreateFlashcardMutation = (deckId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: FlashcardWriteRequest) =>
      requestJson<FlashcardDetail>(`/api/decks/${deckId}/flashcards`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: flashcardKeys.listRoot(deckId) });
    },
  });
};

export const useUpdateFlashcardMutation = (deckId: string, flashcardId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: FlashcardWriteRequest) =>
      requestJson<FlashcardDetail>(
        `/api/decks/${deckId}/flashcards/${flashcardId}`,
        {
          method: "PUT",
          body: JSON.stringify(body),
        }
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: flashcardKeys.listRoot(deckId) });
      await queryClient.invalidateQueries({
        queryKey: flashcardKeys.detail(deckId, flashcardId),
      });
    },
    onError: async (error) => {
      if (!isConcurrencyConflictError(error)) {
        return;
      }

      await queryClient.invalidateQueries({ queryKey: flashcardKeys.listRoot(deckId) });
      await queryClient.invalidateQueries({
        queryKey: flashcardKeys.detail(deckId, flashcardId),
      });
    },
  });
};

type OptimisticListSnapshot = [QueryKey, FlashcardListResponse | undefined][];

export const useDeleteFlashcardMutation = (deckId: string, flashcardId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      requestJson<FlashcardDeleteResponse>(
        `/api/decks/${deckId}/flashcards/${flashcardId}`,
        { method: "DELETE" }
      ),
    onMutate: async (): Promise<OptimisticListSnapshot> => {
      await queryClient.cancelQueries({ queryKey: flashcardKeys.listRoot(deckId) });
      const snapshots = queryClient.getQueriesData<FlashcardListResponse>({
        queryKey: flashcardKeys.listRoot(deckId),
      });

      snapshots.forEach(([key, value]) => {
        if (!value) {
          return;
        }

        queryClient.setQueryData<FlashcardListResponse>(key, {
          ...value,
          items: value.items.filter((item) => item.id !== flashcardId),
          totalCount: Math.max(0, value.totalCount - 1),
        });
      });

      return snapshots;
    },
    onError: async (error, _variables, context) => {
      context?.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });

      if (
        isConcurrencyConflictError(error) ||
        isPersistenceUnavailableError(error)
      ) {
        await queryClient.invalidateQueries({
          queryKey: flashcardKeys.listRoot(deckId),
        });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: flashcardKeys.listRoot(deckId) });
      queryClient.removeQueries({
        queryKey: flashcardKeys.detail(deckId, flashcardId),
      });
    },
  });
};
