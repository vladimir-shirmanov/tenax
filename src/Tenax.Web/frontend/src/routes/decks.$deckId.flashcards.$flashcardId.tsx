import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
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
  const detailQuery = useFlashcardDetailQuery(deckId, flashcardId);
  const deleteMutation = useDeleteFlashcardMutation(deckId, flashcardId);

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
          <dl>
            <dt>Term</dt>
            <dd style={{ fontSize: "1.3rem", fontWeight: 700 }}>{detailQuery.data.term}</dd>
            <dt>Definition</dt>
            <dd className="whitespace-pre-wrap">{detailQuery.data.definition}</dd>
          </dl>
          {detailQuery.data.imageUrl ? (
            <img src={detailQuery.data.imageUrl} alt="Flashcard" className="max-h-52 rounded-lg object-cover" />
          ) : null}
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
