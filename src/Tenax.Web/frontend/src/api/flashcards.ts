import {
  keepPreviousData,
  QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { requestJson } from "./client";
import {
  FlashcardDeleteResponse,
  FlashcardDetail,
  FlashcardListResponse,
  FlashcardWriteRequest,
} from "./types";

export const flashcardKeys = {
  all: ["flashcards"] as const,
  listRoot: (deckId: string) => [...flashcardKeys.all, "list", deckId] as const,
  list: (deckId: string, page: number, pageSize: number) =>
    [...flashcardKeys.listRoot(deckId), page, pageSize] as const,
  detail: (deckId: string, flashcardId: string) =>
    [...flashcardKeys.all, "detail", deckId, flashcardId] as const,
};

export const useFlashcardListQuery = (
  deckId: string,
  page: number,
  pageSize: number
) =>
  useQuery({
    queryKey: flashcardKeys.list(deckId, page, pageSize),
    queryFn: () =>
      requestJson<FlashcardListResponse>(
        `/api/decks/${deckId}/flashcards?page=${page}&pageSize=${pageSize}`
      ),
    staleTime: 30_000,
    retry: 1,
    placeholderData: keepPreviousData,
  });

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
    onError: (_error, _variables, context) => {
      context?.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: flashcardKeys.listRoot(deckId) });
      queryClient.removeQueries({
        queryKey: flashcardKeys.detail(deckId, flashcardId),
      });
    },
  });
};
