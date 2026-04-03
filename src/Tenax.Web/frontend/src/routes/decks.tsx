import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getApiErrorMessage,
  isConcurrencyConflictError,
  isPersistenceUnavailableError,
} from "../api/errors";
import { useDeckListQuery, useDeleteDeckMutation } from "../api/decks";
import { PageScaffold } from "../components/PageScaffold";
import { pluralize } from "../lib/format";

export const DecksRoute = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const pageSize = Number(searchParams.get("pageSize") ?? "20") || 20;
  const [pendingDeleteDeckId, setPendingDeleteDeckId] = useState<string | null>(null);
  const deleteDialogRef = useRef<HTMLDialogElement | null>(null);

  const listQuery = useDeckListQuery(page, pageSize);
  const deleteMutation = useDeleteDeckMutation(pendingDeleteDeckId ?? "");

  const pendingDeleteDeck = useMemo(
    () => listQuery.data?.items.find((item) => item.id === pendingDeleteDeckId),
    [listQuery.data?.items, pendingDeleteDeckId]
  );

  const totalPages = listQuery.data ? Math.max(1, Math.ceil(listQuery.data.totalCount / pageSize)) : 1;
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;
  const showingStart =
    listQuery.data && listQuery.data.totalCount > 0 ? (listQuery.data.page - 1) * listQuery.data.pageSize + 1 : 0;
  const showingEnd =
    listQuery.data && listQuery.data.totalCount > 0
      ? Math.min(listQuery.data.page * listQuery.data.pageSize, listQuery.data.totalCount)
      : 0;

  useEffect(() => {
    const dialog = deleteDialogRef.current;
    if (!dialog) {
      return;
    }

      if (pendingDeleteDeck) {
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
  }, [pendingDeleteDeck]);

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
                {pluralize(item.flashcardCount, "flashcard")}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {listQuery.isSuccess && listQuery.data.totalCount > 0 ? (
        <div className="section-row" style={{ marginTop: "1rem", justifyContent: "flex-start" }}>
          <button
            type="button"
            className="button button--ghost"
            disabled={!canGoPrevious}
            onClick={() => {
              setSearchParams({ page: String(page - 1), pageSize: String(pageSize) });
            }}
          >
            Previous
          </button>
          <p className="text-muted" style={{ margin: 0 }}>
            Showing {showingStart}–{showingEnd} of {listQuery.data.totalCount}
          </p>
          <button
            type="button"
            className="button button--ghost"
            disabled={!canGoNext}
            onClick={() => {
              setSearchParams({ page: String(page + 1), pageSize: String(pageSize) });
            }}
          >
            Next
          </button>
        </div>
      ) : null}

      {pendingDeleteDeck ? (
        <dialog
          ref={deleteDialogRef}
          aria-labelledby="delete-deck-heading"
          onCancel={(event) => {
            event.preventDefault();
            if (!deleteMutation.isPending) {
              setPendingDeleteDeckId(null);
            }
          }}
        >
          <h2 id="delete-deck-heading" className="flat-list__title" style={{ marginBottom: "0.6rem" }}>
            Delete deck confirmation
          </h2>
          <p className="text-muted" style={{ margin: 0 }}>
            Are you sure you want to delete "{pendingDeleteDeck.name}"? This will also permanently remove all{" "}
            {pluralize(pendingDeleteDeck.flashcardCount, "flashcard")} inside. This action cannot be undone.
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
              data-dialog-cancel
              className="button button--ghost"
              onClick={() => setPendingDeleteDeckId(null)}
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
