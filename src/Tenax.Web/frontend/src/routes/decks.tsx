import { Link, useSearchParams } from "react-router-dom";
import { useMemo, useState } from "react";
import {
  getApiErrorMessage,
  isConcurrencyConflictError,
  isPersistenceUnavailableError,
} from "../api/errors";
import { useDeckListQuery, useDeleteDeckMutation } from "../api/decks";
import { PageScaffold } from "../components/PageScaffold";

export const DecksRoute = () => {
  const [searchParams] = useSearchParams();
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const pageSize = Number(searchParams.get("pageSize") ?? "20") || 20;
  const [pendingDeleteDeckId, setPendingDeleteDeckId] = useState<string | null>(null);

  const listQuery = useDeckListQuery(page, pageSize);
  const deleteMutation = useDeleteDeckMutation(pendingDeleteDeckId ?? "");

  const pendingDeleteDeck = useMemo(
    () => listQuery.data?.items.find((item) => item.id === pendingDeleteDeckId),
    [listQuery.data?.items, pendingDeleteDeckId]
  );

  return (
    <PageScaffold
      title="My Decks"
      subtitle="Manage your language decks, keep your catalog tidy, and jump back into study fast."
    >
      <div className="section-row" style={{ marginBottom: "1rem" }}>
        <p className="text-muted" style={{ margin: 0 }}>
          {listQuery.data ? `${listQuery.data.totalCount} total` : ""}
        </p>
        <Link to="/decks/new" className="button button--primary">
          Create deck
        </Link>
      </div>

      {listQuery.isLoading ? <p className="text-muted">Loading decks...</p> : null}

      {listQuery.isError ? (
        <div role="alert" className="alert">
          <p>{getApiErrorMessage(listQuery.error)}</p>
          {isPersistenceUnavailableError(listQuery.error) ? (
            <button
              type="button"
              className="button button--ghost"
              onClick={() => {
                void listQuery.refetch();
              }}
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      {listQuery.isSuccess && listQuery.data.items.length === 0 ? (
        <section className="stack" aria-label="empty decks state">
          <h2 className="flat-list__title" style={{ fontSize: "1.2rem" }}>
            Ready to build your vocabulary?
          </h2>
          <p className="text-muted" style={{ margin: 0 }}>
            Start your language journey by creating your first deck.
          </p>
          <div>
            <Link to="/decks/new" className="button button--primary">
              Create your first deck
            </Link>
          </div>
        </section>
      ) : null}

      {listQuery.isSuccess && listQuery.data.items.length > 0 ? (
        <ul className="deck-grid" role="list" aria-label="deck list">
          {listQuery.data.items.map((item) => (
            <li key={item.id} className="deck-card">
              <div className="section-row" style={{ alignItems: "flex-start" }}>
                <Link to={`/decks/${item.id}`} className="flat-list__title" style={{ marginRight: "0.5rem" }}>
                  {item.name}
                </Link>
                <div className="section-row" style={{ gap: "0.5rem" }}>
                  <Link to={`/decks/${item.id}/edit`} className="button button--ghost">
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="button button--danger"
                    onClick={() => setPendingDeleteDeckId(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="flat-list__meta" style={{ marginTop: "0.6rem" }}>
                {item.description ?? "No description yet."}
              </p>
              <p className="flat-list__meta" style={{ marginTop: "0.6rem" }}>
                {item.flashcardCount} flashcards
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {pendingDeleteDeck ? (
        <div role="dialog" aria-modal="true" aria-label="Delete deck confirmation" className="dialog">
          <p className="text-muted" style={{ margin: 0 }}>
            Are you sure you want to delete "{pendingDeleteDeck.name}"? This will also permanently remove all {pendingDeleteDeck.flashcardCount} flashcards inside. This action cannot be undone.
          </p>
          {deleteMutation.isError ? (
            <p role="alert" className="field-error">
              {getApiErrorMessage(deleteMutation.error)}
            </p>
          ) : null}
          {isConcurrencyConflictError(deleteMutation.error) ||
          isPersistenceUnavailableError(deleteMutation.error) ? (
            <p className="text-muted" style={{ fontSize: "0.82rem" }}>
              The latest state is being refreshed. Review the deck list and retry delete.
            </p>
          ) : null}
          <div className="section-row" style={{ justifyContent: "flex-start", marginTop: "0.75rem" }}>
            <button
              type="button"
              className="button button--danger"
              onClick={() => {
                deleteMutation.mutate(undefined, {
                  onSuccess: () => {
                    setPendingDeleteDeckId(null);
                  },
                });
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete deck"}
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setPendingDeleteDeckId(null)}
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
