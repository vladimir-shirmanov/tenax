import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import {
  STUDY_BATCH_PAGE_SIZE,
  StudyModeRoute,
  accumulateStudyCards,
  getNextPrefetchPage,
} from "./decks.$deckId.study";
import { createTestQueryClient } from "../test/test-utils";

const mockUseDeckDetailQuery = jest.fn();
const mockUseFlashcardListQuery = jest.fn();
const mockUseFlashcardDetailQuery = jest.fn();
const mockPrefetchQuery = jest.fn();

jest.mock("../api/decks", () => ({
  useDeckDetailQuery: (...args: unknown[]) => mockUseDeckDetailQuery(...args),
}));

jest.mock("../api/flashcards", () => ({
  flashcardKeys: {
    detail: (deckId: string, flashcardId: string) => ["flashcards", "detail", deckId, flashcardId],
  },
  useFlashcardListQuery: (...args: unknown[]) => mockUseFlashcardListQuery(...args),
  useFlashcardDetailQuery: (...args: unknown[]) => mockUseFlashcardDetailQuery(...args),
}));

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
  return {
    ...actual,
    useQueryClient: () => ({
      prefetchQuery: mockPrefetchQuery,
    }),
  };
});

const card = (id: string, term: string) => ({
  id,
  deckId: "deck_123",
  term,
  definitionPreview: `${term} preview`,
  hasImage: false,
  updatedAtUtc: "2026-03-15T12:00:00Z",
  updatedByUserId: "usr_1",
});

const renderStudyRoute = (queryClient: QueryClient) =>
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/decks/deck_123/study"]}>
        <Routes>
          <Route path="/decks/:deckId/study" element={<StudyModeRoute />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );

describe("study mode route lazy batching", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    mockUseDeckDetailQuery.mockReturnValue({
      data: { id: "deck_123", name: "Spanish Basics" },
    });
    mockUseFlashcardDetailQuery.mockReturnValue({ data: undefined });
    mockPrefetchQuery.mockResolvedValue(undefined);
    jest
      .spyOn(global.crypto, "randomUUID")
      .mockReturnValue("11111111-1111-1111-1111-111111111111");
  });

  it("keeps shuffle seed stable across renders", async () => {
    const firstPageData = {
      items: [card("fc_1", "hola"), card("fc_2", "adios"), card("fc_3", "gracias"), card("fc_4", "por favor")],
      page: 1,
      pageSize: STUDY_BATCH_PAGE_SIZE,
      totalCount: 40,
    };

    mockUseFlashcardListQuery.mockImplementation(
      (_deckId: string, options: { page: number; pageSize: number; shuffle?: boolean; shuffleSeed?: string }) => ({
        data: firstPageData,
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        options,
      })
    );

    const queryClient = createTestQueryClient();
    renderStudyRoute(queryClient);

    expect(await screen.findByText("hola", { selector: ".flashcard-study-card__term" })).toBeInTheDocument();
    const shuffleButton = screen.getByRole("button", { name: /shuffle cards/i });
    await userEvent.click(shuffleButton);
    await userEvent.click(shuffleButton);

    const calls = mockUseFlashcardListQuery.mock.calls.map(([, options]) => options);
    const shuffledCalls = calls.filter((options) => options.shuffle === true);
    expect(shuffledCalls.length).toBeGreaterThan(0);
    expect(new Set(shuffledCalls.map((options) => options.shuffleSeed))).toEqual(
      new Set(["11111111-1111-1111-1111-111111111111"])
    );
  });

  it("prefetch threshold triggers at >= floor(loaded*0.75) when more cards exist", () => {
    expect(getNextPrefetchPage(20, 45, 14, new Set([1]))).toBeNull();
    expect(getNextPrefetchPage(20, 45, 15, new Set([1]))).toBe(2);
    expect(getNextPrefetchPage(20, 45, 19, new Set([1, 2]))).toBeNull();
  });

  it("shuffle toggle resets currentCardIndex, loadedCards and currentPage", async () => {
    const firstPageData = {
      items: [card("fc_1", "hola"), card("fc_2", "adios"), card("fc_3", "gracias"), card("fc_4", "por favor")],
      page: 1,
      pageSize: STUDY_BATCH_PAGE_SIZE,
      totalCount: 40,
    };

    let callCount = 0;
    mockUseFlashcardListQuery.mockImplementation(
      (_deckId: string, options: { page: number; pageSize: number; shuffle?: boolean }) => {
        callCount += 1;
        return {
          data: {
            ...firstPageData,
            items: [...firstPageData.items],
          },
          isLoading: false,
          isError: false,
          refetch: jest.fn(),
          options,
          isFetching: callCount > 1 && options.page === 1,
        };
      }
    );

    const queryClient = createTestQueryClient();
    renderStudyRoute(queryClient);

    expect(await screen.findByText("hola", { selector: ".flashcard-study-card__term" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("adios", { selector: ".flashcard-study-card__term" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /shuffle cards/i }));
    await waitFor(() => {
      const lastCall = mockUseFlashcardListQuery.mock.calls.at(-1)?.[1];
      expect(lastCall).toMatchObject({ page: 1, pageSize: STUDY_BATCH_PAGE_SIZE, shuffle: true });
      expect(screen.getByText("1 / 40")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    });
  });

  it("totalCount from first page drives progress", async () => {
    const firstPageData = {
      items: [card("fc_1", "hola"), card("fc_2", "adios")],
      page: 1,
      pageSize: STUDY_BATCH_PAGE_SIZE,
      totalCount: 40,
    };

    mockUseFlashcardListQuery.mockReturnValue({
      data: firstPageData,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    const queryClient = createTestQueryClient();
    renderStudyRoute(queryClient);

    expect(await screen.findByText("1 / 40")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("2 / 40")).toBeInTheDocument();
  });

  it("accumulates by replacing on page1 and appending on page>1", () => {
    const previous = [card("fc_1", "hola"), card("fc_2", "adios")];
    const page1 = [card("fc_3", "gracias")];
    const page2 = [card("fc_4", "por favor")];

    expect(accumulateStudyCards(previous, page1, 1)).toEqual(page1);
    expect(accumulateStudyCards(previous, page2, 2)).toEqual([...previous, ...page2]);
  });

  it("requests next page at threshold with loop guard during navigation", async () => {
    const page1 = {
      items: Array.from({ length: STUDY_BATCH_PAGE_SIZE }, (_, index) => card(`fc_${index + 1}`, `term${index + 1}`)),
      page: 1,
      pageSize: STUDY_BATCH_PAGE_SIZE,
      totalCount: 40,
    };
    const page2 = {
      items: Array.from({ length: STUDY_BATCH_PAGE_SIZE }, (_, index) =>
        card(`fc_${index + 21}`, `term${index + 21}`)
      ),
      page: 2,
      pageSize: STUDY_BATCH_PAGE_SIZE,
      totalCount: 40,
    };

    mockUseFlashcardListQuery.mockImplementation(
      (_deckId: string, options: { page: number; pageSize: number; shuffle?: boolean }) => {
        if (options.page === 2) {
          return { data: page2, isLoading: false, isError: false, refetch: jest.fn() };
        }

        return { data: page1, isLoading: false, isError: false, refetch: jest.fn() };
      }
    );

    const queryClient = createTestQueryClient();
    renderStudyRoute(queryClient);

    await screen.findByText("term1", { selector: ".flashcard-study-card__term" });

    for (let i = 0; i < 15; i += 1) {
      await userEvent.click(screen.getByRole("button", { name: /next/i }));
    }

    await waitFor(() => {
      const requestedPages = mockUseFlashcardListQuery.mock.calls.map(([, options]) => options.page);
      expect(requestedPages).toContain(2);
    });
  });

  it("shows completion screen when all cards are seen", async () => {
    const firstPageData = {
      items: [card("fc_1", "hola"), card("fc_2", "adios")],
      page: 1,
      pageSize: STUDY_BATCH_PAGE_SIZE,
      totalCount: 2,
    };

    mockUseFlashcardListQuery.mockReturnValue({
      data: firstPageData,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    const queryClient = createTestQueryClient();
    renderStudyRoute(queryClient);

    expect(await screen.findByText("hola", { selector: ".flashcard-study-card__term" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(await screen.findByRole("heading", { name: /you finished!/i })).toBeInTheDocument();
  });
});
