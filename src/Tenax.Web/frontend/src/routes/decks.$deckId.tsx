import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getApiErrorMessage,
  isConcurrencyConflictError,
  isDeckNotFoundError,
  isForbiddenError,
  isPersistenceUnavailableError as isPersistenceUnavailableApiError,
  isPersistenceUnavailableError,
} from "../api/errors";
import { useFlashcardListQuery } from "../api/flashcards";
import { useDeckDetailQuery, useDeleteDeckMutation } from "../api/decks";
import { Breadcrumb } from "../components/Breadcrumb";
import { PageScaffold } from "../components/PageScaffold";
import { pluralize } from "../lib/format";

export const DeckDetailRoute = () => {
  const navigate = useNavigate();
  const { deckId = "" } = useParams();
  const [previewPage, setPreviewPage] = useState(1);
  const [deleteState, setDeleteState] = useState<
    "idle" | "confirming" | "error_concurrency" | "error_persistence" | "error_generic"
  >("idle");
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);
  const confirmDeleteRef = useRef<HTMLButtonElement>(null);
  const previousDeleteStateRef = useRef(deleteState);
  const detailQuery = useDeckDetailQuery(deckId);
  const previewQuery = useFlashcardListQuery(deckId, previewPage, 10);
  const deleteMutation = useDeleteDeckMutation(deckId);

  useEffect(() => {
    setPreviewPage(1);
    setDeleteState("idle");
  }, [deckId]);

  useEffect(() => {
    const previousDeleteState = previousDeleteStateRef.current;
    if (deleteState === "confirming") {
      confirmDeleteRef.current?.focus();
    }
    if (deleteState === "idle" && previousDeleteState !== "idle") {
      deleteTriggerRef.current?.focus();
    }
    previousDeleteStateRef.current = deleteState;
  }, [deleteState]);

  useEffect(() => {
    const escapableStates = ["confirming", "error_concurrency", "error_persistence", "error_generic"] as const;
    if (!(escapableStates as readonly string[]).includes(deleteState)) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDeleteState("idle");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [deleteState]);

  const totalPreviewCount = previewQuery.data?.totalCount ?? 0;
  const showingStart = totalPreviewCount > 0 ? (previewPage - 1) * 10 + 1 : 0;
  const showingEnd = totalPreviewCount > 0 ? Math.min(previewPage * 10, totalPreviewCount) : 0;
  const canGoPrevious = previewPage > 1;
  const canGoNext = previewPage * 10 < totalPreviewCount;
  const isDeleting = deleteMutation.isPending;

  const handleConfirmDelete = () => {
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        navigate("/decks");
      },
      onError: (error) => {
        if (isConcurrencyConflictError(error)) {
          setDeleteState("error_concurrency");
          return;
        }
        if (isPersistenceUnavailableApiError(error)) {
          setDeleteState("error_persistence");
          return;
        }
        setDeleteState("error_generic");
      },
    });
  };

  return (
    <PageScaffold
      title={detailQuery.data?.name ?? "Deck detail"}
      subtitle="Review this deck and continue studying or authoring."
      breadcrumb={<Breadcrumb items={[{ label: "Decks", href: "/decks" }, { label: detailQuery.data?.name ?? deckId }]} />}
    >
      {detailQuery.isLoading ? <p className="text-muted">Loading deck...</p> : null}

      {detailQuery.isError ? (
        <div role="alert" className="alert">
          {isForbiddenError(detailQuery.error) ? (
            <p>You do not have access to view this deck.</p>
          ) : null}
          {isDeckNotFoundError(detailQuery.error) ? (
            <p>We couldn't find this deck. It may have been deleted or the link is incorrect.</p>
          ) : null}
          {!isForbiddenError(detailQuery.error) && !isDeckNotFoundError(detailQuery.error) ? (
            <p>{getApiErrorMessage(detailQuery.error)}</p>
          ) : null}
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
        <article className="stack" style={{ gap: "0.8rem" }}>
          <p className="text-muted" style={{ margin: 0, maxWidth: "65ch" }}>
            {detailQuery.data.description ?? "No description yet."}
          </p>
          <p className="flat-list__meta" style={{ margin: 0 }}>
            {typeof detailQuery.data.flashcardCount === "number"
              ? pluralize(detailQuery.data.flashcardCount, "flashcard")
              : "Flashcard count unavailable"}
          </p>

          <div className="section-row" style={{ justifyContent: "flex-start", gap: "0.6rem" }}>
            <Link to={`/decks/${deckId}/study`} className="button button--primary" aria-disabled={false}>
              Study now
            </Link>
            <Link to={`/decks/${deckId}/flashcards/new`} className="button button--ghost">
              Add flashcards
            </Link>
            <Link to={`/decks/${deckId}/edit`} className="button button--ghost">
              Edit deck
            </Link>
          </div>

          {detailQuery.data.flashcardCount === 0 ? (
            <p className="text-muted" style={{ marginBottom: 0 }}>
              This deck is a blank canvas. Start adding words and phrases to learn.
            </p>
          ) : null}

          <section aria-labelledby="preview-heading">
            <div className="section-row" style={{ justifyContent: "space-between" }}>
              <h2 id="preview-heading" style={{ margin: 0 }}>
                Flashcards
              </h2>
              {totalPreviewCount > 0 ? (
                <Link to={`/decks/${deckId}/flashcards`} className="link-inline">
                  View all flashcards →
                </Link>
              ) : null}
            </div>

            {previewQuery.isLoading ? (
              <p className="text-muted">Loading flashcards...</p>
            ) : null}

            {previewQuery.isError ? (
              <div role="alert" className="alert">
                <p style={{ margin: "0 0 0.5rem" }}>
                  Could not load flashcards. Check your connection and try again.
                </p>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => {
                    void previewQuery.refetch();
                  }}
                >
                  Retry
                </button>
              </div>
            ) : null}

            {previewQuery.isSuccess && previewQuery.data.totalCount === 0 ? (
              <div>
                <p className="text-muted" style={{ marginBottom: "0.6rem" }}>
                  No flashcards in this deck yet.
                </p>
                <Link to={`/decks/${deckId}/flashcards/new`} className="link-inline">
                  Add your first flashcard →
                </Link>
              </div>
            ) : null}

            {previewQuery.isSuccess && previewQuery.data.items.length > 0 ? (
              <ul className="flat-list">
                {previewQuery.data.items.map((item) => (
                  <li key={item.id} className="flat-list__item">
                    <Link to={`/decks/${deckId}/flashcards/${item.id}`} className="flat-list__title">
                      {item.term}
                    </Link>
                    <p className="flat-list__meta">
                      {item.definitionPreview}
                      {item.hasImage ? <span className="flashcard-preview__image-badge">image</span> : null}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}

            {totalPreviewCount > 0 ? (
              <div className="section-row" style={{ justifyContent: "flex-start" }}>
                <button
                  type="button"
                  className="button button--ghost"
                  disabled={!canGoPrevious}
                  onClick={() => setPreviewPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </button>
                <p className="text-muted" style={{ margin: 0 }}>
                  Showing {showingStart}–{showingEnd} of {totalPreviewCount} flashcards
                </p>
                <button
                  type="button"
                  className="button button--ghost"
                  disabled={!canGoNext}
                  onClick={() => setPreviewPage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            ) : null}
          </section>

          <hr aria-hidden="true" />

          {deleteState === "idle" ? (
            <button
              ref={deleteTriggerRef}
              type="button"
              className="button button--danger"
              onClick={() => {
                setDeleteState("confirming");
              }}
            >
              Delete deck
            </button>
          ) : (
            <div
              style={{
                border: "1px solid color-mix(in srgb, var(--danger) 35%, var(--border-subtle))",
                background: "color-mix(in srgb, var(--danger) 4%, var(--surface-elevated))",
                borderRadius: "0.5rem",
                padding: "0.8rem 0.95rem",
              }}
            >
              <p style={{ margin: "0 0 0.75rem" }}>
                Are you sure you want to delete this deck? This action cannot be undone.
              </p>
              <div className="section-row" style={{ justifyContent: "flex-start", gap: "0.6rem" }}>
                <button
                  ref={confirmDeleteRef}
                  type="button"
                  className="button button--danger"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Confirm delete"}
                </button>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => setDeleteState("idle")}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
              </div>

              {deleteState === "error_concurrency" ? (
                <div role="alert" className="alert" style={{ marginTop: "0.75rem" }}>
                  <p style={{ margin: "0 0 0.5rem" }}>
                    This deck was modified by another action. Refresh the page to see the latest state before
                    retrying.
                  </p>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => setDeleteState("idle")}
                  >
                    Dismiss
                  </button>
                </div>
              ) : null}

              {deleteState === "error_persistence" ? (
                <div role="alert" className="alert" style={{ marginTop: "0.75rem" }}>
                  <p style={{ margin: "0 0 0.5rem" }}>
                    Service temporarily unavailable. Please try again.
                  </p>
                  <div className="section-row" style={{ justifyContent: "flex-start", gap: "0.6rem" }}>
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => setDeleteState("confirming")}
                    >
                      Try again
                    </button>
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => setDeleteState("idle")}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ) : null}

              {deleteState === "error_generic" ? (
                <div role="alert" className="alert" style={{ marginTop: "0.75rem" }}>
                  <p style={{ margin: "0 0 0.5rem" }}>
                    Failed to delete deck. Please try again.
                  </p>
                  <div className="section-row" style={{ justifyContent: "flex-start", gap: "0.6rem" }}>
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => setDeleteState("confirming")}
                    >
                      Try again
                    </button>
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => setDeleteState("idle")}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </article>
      ) : null}
    </PageScaffold>
  );
};
