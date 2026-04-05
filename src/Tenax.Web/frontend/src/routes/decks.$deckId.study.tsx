import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useDeckDetailQuery } from "../api/decks";
import { getApiErrorMessage, isPersistenceUnavailableError } from "../api/errors";
import { flashcardKeys, useFlashcardDetailQuery, useFlashcardListQuery } from "../api/flashcards";
import { requestJson } from "../api/client";
import { FlashcardDetail, FlashcardListItem } from "../api/types";
import { Breadcrumb } from "../components/Breadcrumb";

const shuffle = <T,>(arr: T[]): T[] => {
  const next = [...arr];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
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
  // Fetch all cards in a single request (up to 500). A prior paginated design
  // contained a feedback loop: loadedCards.length changing re-triggered the
  // prefetch effect → setCurrentPage incremented → query resolved → repeat (OOM).
  // Loading everything up-front eliminates that reactive dep chain entirely.
  const flashcardQuery = useFlashcardListQuery(deckId, 1, 500);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [cards, setCards] = useState<FlashcardListItem[]>([]);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const originalOrderRef = useRef<FlashcardListItem[]>([]);

  const deckName = deckQuery.data?.name ?? deckId;
  const activeCard = cards[currentIndex];
  const activeFlashcardId = activeCard?.id ?? "";
  const detailQuery = useFlashcardDetailQuery(deckId, activeFlashcardId);

  const handleNext = useCallback(() => {
    if (isComplete || cards.length === 0) {
      return;
    }

    if (currentIndex === cards.length - 1) {
      setIsComplete(true);
      return;
    }

    setCurrentIndex((index) => index + 1);
    setIsFlipped(false);
  }, [cards.length, currentIndex, isComplete]);

  const handlePrevious = useCallback(() => {
    if (isComplete || currentIndex === 0) {
      return;
    }

    setCurrentIndex((index) => index - 1);
    setIsFlipped(false);
  }, [currentIndex, isComplete]);

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

    originalOrderRef.current = flashcardQuery.data.items;
    setCards(flashcardQuery.data.items);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsComplete(false);
  }, [flashcardQuery.data?.items]);

  useEffect(() => {
    if (!activeCard || isComplete || currentIndex >= cards.length - 1) {
      return;
    }

    const nextCard = cards[currentIndex + 1];
    if (!nextCard?.id) {
      return;
    }

    void queryClient.prefetchQuery({
      queryKey: flashcardKeys.detail(deckId, nextCard.id),
      queryFn: () => requestJson<FlashcardDetail>(`/api/decks/${deckId}/flashcards/${nextCard.id}`),
    });
  }, [activeCard, cards, currentIndex, deckId, isComplete, queryClient]);

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
    setIsShuffled((current) => {
      const next = !current;
      setCards(next ? shuffle(originalOrderRef.current) : [...originalOrderRef.current]);
      setCurrentIndex(0);
      setIsFlipped(false);
      setIsComplete(false);
      return next;
    });
  };

  const handleStudyAgain = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsComplete(false);
    setCards(isShuffled ? shuffle(originalOrderRef.current) : [...originalOrderRef.current]);
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

  if (cards.length === 0) {
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
          {Math.min(currentIndex + 1, cards.length)} / {cards.length}
        </p>
        <button
          type="button"
          className={`button button--ghost study-mode__shuffle${isShuffled ? " is-active" : ""}`}
          aria-pressed={isShuffled}
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
            You studied {cards.length} card{cards.length === 1 ? "" : "s"} from {deckName}.
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
              disabled={currentIndex === 0}
            >
              ← Previous
            </button>
            {cards.length <= 20 ? (
              <div className="study-mode__dots" aria-hidden="true">
                {cards.map((card, index) => (
                  <span key={card.id} className={`study-mode__dot${index === currentIndex ? " is-active" : ""}`} />
                ))}
              </div>
            ) : null}
            <button type="button" className="button button--primary" onClick={handleNext}>
              {currentIndex === cards.length - 1 ? "Finish" : "Next →"}
            </button>
          </div>
        </>
      )}
    </main>
  );
};
