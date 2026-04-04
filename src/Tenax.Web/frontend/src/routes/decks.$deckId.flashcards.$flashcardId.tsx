import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  getApiErrorMessage,
  isConcurrencyConflictError,
  isPersistenceUnavailableError,
} from "../api/errors";
import {
  useDeleteFlashcardMutation,
  useFlashcardDetailQuery,
} from "../api/flashcards";
import { useDeckDetailQuery } from "../api/decks";
import { Breadcrumb } from "../components/Breadcrumb";
import { PageScaffold } from "../components/PageScaffold";
import { formatRelativeTime } from "../lib/format";

export const FlashcardDetailRoute = () => {
  const { deckId = "", flashcardId = "" } = useParams();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const detailQuery = useFlashcardDetailQuery(deckId, flashcardId);
  const deckQuery = useDeckDetailQuery(deckId);
  const deckName = deckQuery.data?.name ?? deckId;
  const deleteMutation = useDeleteFlashcardMutation(deckId, flashcardId);
  const deleteDialogRef = useRef<HTMLDialogElement | null>(null);

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

  useEffect(() => {
    const dialog = deleteDialogRef.current;
    if (!dialog) {
      return;
    }

      if (confirmDelete) {
        if (!dialog.open && typeof dialog.showModal === "function") {
          dialog.showModal();
        } else if (!dialog.open) {
          dialog.setAttribute("open", "true");
        }
        dialog.querySelector<HTMLButtonElement>("[data-dialog-cancel]")?.focus();

      return () => {
        if (dialog.open && typeof dialog.close === "function") {
          dialog.close();
        } else {
          dialog.removeAttribute("open");
        }
      };
    }

    if (dialog.open && typeof dialog.close === "function") {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
    }
  }, [confirmDelete]);

  return (
    <PageScaffold
      title="Flashcard detail"
      subtitle="Review full content and metadata."
      breadcrumb={
        <Breadcrumb
          items={[
            { label: "Decks", href: "/decks" },
            { label: deckName, href: `/decks/${deckId}` },
            { label: "Flashcards", href: `/decks/${deckId}/flashcards` },
            { label: detailQuery.data?.term ?? flashcardId },
          ]}
        />
      }
    >
      <div className="section-row" style={{ marginBottom: "1rem" }}>
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
        <article>
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
            <time dateTime={detailQuery.data.updatedAtUtc}>
              Updated {formatRelativeTime(detailQuery.data.updatedAtUtc)}
            </time>
          </p>
        </article>
      ) : null}

      {confirmDelete ? (
        <dialog
          ref={deleteDialogRef}
          aria-labelledby="delete-flashcard-heading"
          onCancel={(event) => {
            event.preventDefault();
            if (!deleteMutation.isPending) {
              setConfirmDelete(false);
            }
          }}
        >
          <h2 id="delete-flashcard-heading" className="flat-list__title" style={{ marginBottom: "0.6rem" }}>
            Confirm delete flashcard
          </h2>
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
              data-dialog-cancel
              className="button button--ghost"
              onClick={() => setConfirmDelete(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </button>
          </div>
        </dialog>
      ) : null}
    </PageScaffold>
  );
};
