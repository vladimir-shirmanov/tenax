import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useDeckDetailQuery } from "../api/decks";
import { getApiErrorMessage, isPersistenceUnavailableError } from "../api/errors";
import { flashcardKeys, useFlashcardDetailQuery, useFlashcardListQuery } from "../api/flashcards";
import { requestJson } from "../api/client";
import { FlashcardDetail, FlashcardListItem } from "../api/types";
import { Breadcrumb } from "../components/Breadcrumb";

export const STUDY_BATCH_PAGE_SIZE = 20;

export const accumulateStudyCards = (
  previousCards: FlashcardListItem[],
  incomingCards: FlashcardListItem[],
  page: number
) => (page === 1 ? incomingCards : [...previousCards, ...incomingCards]);

export const getNextPrefetchPage = (
  loadedCardsLength: number,
  totalCount: number,
  currentCardIndex: number,
  requestedPages: Set<number>,
  pageSize: number = STUDY_BATCH_PAGE_SIZE
) => {
  if (loadedCardsLength === 0 || totalCount === 0 || loadedCardsLength >= totalCount) {
    return null;
  }

  const threshold = Math.floor(loadedCardsLength * 0.75);
  if (currentCardIndex < threshold) {
    return null;
  }

  const nextPage = Math.floor(loadedCardsLength / pageSize) + 1;
  if (requestedPages.has(nextPage)) {
    return null;
  }

  return nextPage;
};

const ShuffleIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M2 4h9l3 4-3 4H2" />
    <path d="M2 12h9" />
    <polyline points="11 2 14 4 11 6" />
    <polyline points="11 10 14 12 11 14" />
  </svg>
);

export const StudyModeRoute = () => {
  const { deckId = "" } = useParams();
  const queryClient = useQueryClient();
  const deckQuery = useDeckDetailQuery(deckId);
  const shuffleSeedRef = useRef(crypto.randomUUID());
  const requestedPagesRef = useRef(new Set([1]));
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadedCards, setLoadedCards] = useState<FlashcardListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const flashcardQuery = useFlashcardListQuery(deckId, {
    page: currentPage,
    pageSize: STUDY_BATCH_PAGE_SIZE,
    shuffle: shuffleEnabled,
    shuffleSeed: shuffleEnabled ? shuffleSeedRef.current : undefined,
  });
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const loadedLengthRef = useRef(0);
  const totalCountRef = useRef(0);
  loadedLengthRef.current = loadedCards.length;
  totalCountRef.current = totalCount;

  const deckName = deckQuery.data?.name ?? deckId;
  const activeCard = loadedCards[currentCardIndex];
  const activeFlashcardId = activeCard?.id ?? "";
  const detailQuery = useFlashcardDetailQuery(deckId, activeFlashcardId);
  const isComplete = currentCardIndex >= totalCount - 1 && loadedCards.length >= totalCount;

  const handleNext = useCallback(() => {
    if (isComplete || loadedCards.length === 0) {
      return;
    }

    if (currentCardIndex >= loadedCards.length - 1) {
      return;
    }

    setCurrentCardIndex((index) => index + 1);
    setIsFlipped(false);
  }, [currentCardIndex, isComplete, loadedCards.length]);

  const handlePrevious = useCallback(() => {
    if (isComplete || currentCardIndex === 0) {
      return;
    }

    setCurrentCardIndex((index) => index - 1);
    setIsFlipped(false);
  }, [currentCardIndex, isComplete]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => {
        mediaQuery.removeEventListener("change", handleChange);
      };
    }

    mediaQuery.addListener(handleChange);
    return () => {
      mediaQuery.removeListener(handleChange);
    };
  }, []);

  useEffect(() => {
    if (!flashcardQuery.data?.items) {
      return;
    }

    if (flashcardQuery.data.page === 1) {
      setLoadedCards(flashcardQuery.data.items);
      setTotalCount(flashcardQuery.data.totalCount);
      return;
    }

    setLoadedCards((previousCards) =>
      accumulateStudyCards(previousCards, flashcardQuery.data?.items ?? [], flashcardQuery.data?.page ?? 1)
    );
  }, [flashcardQuery.data]);

  useEffect(() => {
    if (!activeCard || isComplete || currentCardIndex >= loadedCards.length - 1) {
      return;
    }

    const nextCard = loadedCards[currentCardIndex + 1];
    if (!nextCard?.id) {
      return;
    }

    void queryClient.prefetchQuery({
        queryKey: flashcardKeys.detail(deckId, nextCard.id),
        queryFn: () => requestJson<FlashcardDetail>(`/api/decks/${deckId}/flashcards/${nextCard.id}`),
    });
  }, [activeCard, currentCardIndex, deckId, isComplete, loadedCards, queryClient]);

  useEffect(() => {
    const nextPage = getNextPrefetchPage(
      loadedLengthRef.current,
      totalCountRef.current,
      currentCardIndex,
      requestedPagesRef.current
    );
    if (nextPage == null) {
      return;
    }

    requestedPagesRef.current.add(nextPage);
    setCurrentPage(nextPage);
  }, [currentCardIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isComplete) {
        return;
      }

      const tagName = (document.activeElement as HTMLElement | null)?.tagName;
      const isButtonOrLink = tagName === "BUTTON" || tagName === "A";

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        handleNext();
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        handlePrevious();
        return;
      }

      if ((event.key === " " || event.key === "Enter") && !isButtonOrLink) {
        event.preventDefault();
        setIsFlipped((current) => !current);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleNext, handlePrevious, isComplete]);

  const handleToggleShuffle = () => {
    setShuffleEnabled((current) => !current);
    setCurrentCardIndex(0);
    setLoadedCards([]);
    setCurrentPage(1);
    requestedPagesRef.current = new Set([1]);
    setIsFlipped(false);
  };

  const handleStudyAgain = () => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setLoadedCards([]);
    setCurrentPage(1);
    requestedPagesRef.current = new Set([1]);
  };

  if (flashcardQuery.isLoading) {
    return (
      <main className="study-mode">
        <div className="page__breadcrumb">
          <Breadcrumb items={[{ label: "Decks", href: "/decks" }, { label: deckName, href: `/decks/${deckId}` }, { label: "Study" }]} />
        </div>
        <p className="text-muted" style={{ textAlign: "center", padding: "3rem 0" }}>Loading cards…</p>
      </main>
    );
  }

  if (flashcardQuery.isError) {
    return (
      <main className="study-mode">
        <div className="page__breadcrumb">
          <Breadcrumb items={[{ label: "Decks", href: "/decks" }, { label: deckName, href: `/decks/${deckId}` }, { label: "Study" }]} />
        </div>
        <div role="alert" className="alert">
          <p>{getApiErrorMessage(flashcardQuery.error)}</p>
          {isPersistenceUnavailableError(flashcardQuery.error) ? (
            <button
              type="button"
              className="button button--ghost"
              onClick={() => {
                void flashcardQuery.refetch();
              }}
            >
              Retry
            </button>
          ) : null}
        </div>
      </main>
    );
  }

  if (loadedCards.length === 0 && totalCount === 0) {
    return (
      <main className="study-mode">
        <div className="page__breadcrumb">
          <Breadcrumb items={[{ label: "Decks", href: "/decks" }, { label: deckName, href: `/decks/${deckId}` }, { label: "Study" }]} />
        </div>
        <div className="page__surface" style={{ textAlign: "center", padding: "3rem 2rem" }}>
          <p className="text-muted">This deck has no flashcards yet.</p>
          <Link to={`/decks/${deckId}/flashcards/new`} className="button button--primary">
            Add flashcards
          </Link>
        </div>
      </main>
    );
  }

  const activeTerm = detailQuery.data?.term ?? activeCard?.term ?? "";
  const activeDefinition = detailQuery.data?.definition ?? activeCard?.definitionPreview ?? "";

  return (
    <main className="study-mode">
      <div className="page__breadcrumb">
        <Breadcrumb items={[{ label: "Decks", href: "/decks" }, { label: deckName, href: `/decks/${deckId}` }, { label: "Study" }]} />
      </div>

      <header className="study-mode__header">
        <p className="study-mode__deck-name">{deckName}</p>
        <p className="study-mode__progress" aria-live="polite" aria-atomic="true">
          {Math.min(currentCardIndex + 1, totalCount)} / {totalCount}
        </p>
        <button
          type="button"
          className={`button button--ghost study-mode__shuffle${shuffleEnabled ? " is-active" : ""}`}
          aria-pressed={shuffleEnabled}
          aria-label="Shuffle cards"
          title="Shuffle cards"
          onClick={handleToggleShuffle}
        >
          <ShuffleIcon />
          Shuffle
        </button>
      </header>

      {isComplete ? (
        <div className="page__surface study-mode__completion">
          <span className="study-mode__completion-icon" aria-hidden="true">✓</span>
          <h2 className="page__title">You finished!</h2>
          <p className="text-muted">
            You studied {totalCount} card{totalCount === 1 ? "" : "s"} from {deckName}.
          </p>
          <div className="study-mode__completion-actions">
            <button type="button" className="button button--primary" onClick={handleStudyAgain}>
              Study again
            </button>
            <Link to={`/decks/${deckId}`} className="button button--ghost">
              Back to deck
            </Link>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            aria-pressed={isFlipped}
              className={`flashcard-study-card${isFlipped ? " is-flipped" : ""}${prefersReducedMotion ? " flashcard-study-card--reduced-motion" : ""}`}
            onClick={() => {
              setIsFlipped((current) => !current);
            }}
          >
            <span className="sr-only">Press Enter or Space to flip the flashcard</span>
            <div className="flashcard-study-card__inner">
              <div className="flashcard-study-card__face flashcard-study-card__face--front" aria-hidden={isFlipped}>
                {!isFlipped ? (
                  <>
                    {detailQuery.data?.imageUrl ? (
                      <img
                        src={detailQuery.data.imageUrl}
                        alt="Flashcard illustration"
                        className="flashcard-study-card__image"
                      />
                    ) : null}
                    <p className="flashcard-study-card__term">{activeTerm}</p>
                  </>
                ) : null}
              </div>
              <div className="flashcard-study-card__face flashcard-study-card__face--back" aria-hidden={!isFlipped}>
                {isFlipped ? (
                  <p className="flashcard-study-card__definition whitespace-pre-wrap">{activeDefinition}</p>
                ) : null}
              </div>
            </div>
          </button>

          <div className="study-mode__controls">
            <button
              type="button"
              className="button button--ghost"
              onClick={handlePrevious}
              disabled={currentCardIndex === 0}
            >
              ← Previous
            </button>
            {loadedCards.length <= 20 ? (
              <div className="study-mode__dots" aria-hidden="true">
                {loadedCards.map((card, index) => (
                  <span key={card.id} className={`study-mode__dot${index === currentCardIndex ? " is-active" : ""}`} />
                ))}
              </div>
            ) : null}
            <button type="button" className="button button--primary" onClick={handleNext}>
              {currentCardIndex >= totalCount - 1 ? "Finish" : "Next →"}
            </button>
          </div>
        </>
      )}
    </main>
  );
};
