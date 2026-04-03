import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  getApiErrorMessage,
  isConcurrencyConflictError,
  isPersistenceUnavailableError,
} from "../api/errors";
import {
  useDeleteFlashcardMutation,
  useFlashcardDetailQuery,
} from "../api/flashcards";
import { PageScaffold } from "../components/PageScaffold";

export const FlashcardDetailRoute = () => {
  const { deckId = "", flashcardId = "" } = useParams();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const detailQuery = useFlashcardDetailQuery(deckId, flashcardId);
  const deleteMutation = useDeleteFlashcardMutation(deckId, flashcardId);

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
    setIsFlipped(false);
  }, [deckId, flashcardId, detailQuery.data?.id]);

  return (
    <PageScaffold title="Flashcard detail" subtitle="Review full content and metadata.">
      <div className="section-row" style={{ marginBottom: "1rem" }}>
        <Link to={`/decks/${deckId}/flashcards`} className="link-inline">
          Back to flashcards
        </Link>
        <div className="section-row">
          <Link to={`/decks/${deckId}/flashcards/${flashcardId}/edit`} className="button button--primary">
            Edit
          </Link>
          <button type="button" className="button button--danger" onClick={() => setConfirmDelete(true)}>
            Delete
          </button>
        </div>
      </div>

      {detailQuery.isLoading ? <p className="text-muted">Loading flashcard...</p> : null}
      {detailQuery.isError ? (
        <div role="alert" className="alert">
          <p>{getApiErrorMessage(detailQuery.error)}</p>
          {isPersistenceUnavailableError(detailQuery.error) ? (
            <button
              type="button"
              className="button button--ghost"
              onClick={() => {
                void detailQuery.refetch();
              }}
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      {detailQuery.data ? (
        <article className="flashcard-content">
          <button
            type="button"
            aria-pressed={isFlipped}
            aria-label={isFlipped ? "Show term" : "Show definition"}
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
                    {detailQuery.data.imageUrl ? (
                      <img
                        src={detailQuery.data.imageUrl}
                        alt="Flashcard illustration"
                        className="flashcard-study-card__image"
                      />
                    ) : null}
                    <p className="flashcard-study-card__term">{detailQuery.data.term}</p>
                  </>
                ) : null}
              </div>

              <div className="flashcard-study-card__face flashcard-study-card__face--back" aria-hidden={!isFlipped}>
                {isFlipped ? (
                  <p className="flashcard-study-card__definition whitespace-pre-wrap">{detailQuery.data.definition}</p>
                ) : null}
              </div>
            </div>
          </button>

          <p className="text-muted" style={{ fontSize: "0.82rem" }}>
            Updated {new Date(detailQuery.data.updatedAtUtc).toLocaleString()}
          </p>
        </article>
      ) : null}

      {confirmDelete ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm delete flashcard"
          className="dialog"
        >
          <p className="text-muted" style={{ margin: 0 }}>Delete this flashcard? This cannot be undone.</p>
          {deleteMutation.isError ? (
            <p role="alert" className="field-error">
              {getApiErrorMessage(deleteMutation.error)}
            </p>
          ) : null}
          {isConcurrencyConflictError(deleteMutation.error) ||
          isPersistenceUnavailableError(deleteMutation.error) ? (
            <p className="text-muted" style={{ fontSize: "0.82rem" }}>
              Refreshing canonical state is in progress. Review the latest content, then retry delete.
            </p>
          ) : null}
          <div className="section-row" style={{ justifyContent: "flex-start", marginTop: "0.75rem" }}>
            <button
              type="button"
              className="button button--danger"
              onClick={() => {
                deleteMutation.mutate(undefined, {
                  onSuccess: () => {
                    navigate(`/decks/${deckId}/flashcards`);
                  },
                });
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Confirm delete"}
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setConfirmDelete(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </PageScaffold>
  );
};
