import { Link, useParams } from "react-router-dom";
import {
  getApiErrorMessage,
  isDeckNotFoundError,
  isForbiddenError,
  isPersistenceUnavailableError,
} from "../api/errors";
import { useDeckDetailQuery } from "../api/decks";
import { PageScaffold } from "../components/PageScaffold";

export const DeckDetailRoute = () => {
  const { deckId = "" } = useParams();
  const detailQuery = useDeckDetailQuery(deckId);

  return (
    <PageScaffold title="Deck detail" subtitle="Review this deck and continue studying or authoring.">
      <div style={{ marginBottom: "1rem" }}>
        <Link to="/decks" className="link-inline">
          Back to decks
        </Link>
      </div>

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
          <p className="flat-list__meta" style={{ marginTop: "0.6rem" }}>
            <Link to="/decks" className="link-inline">
              Go back to decks
            </Link>
          </p>
        </div>
      ) : null}

      {detailQuery.data ? (
        <article className="stack" style={{ gap: "0.8rem" }}>
          <h2 className="page__title" style={{ fontSize: "clamp(1.45rem, 2vw, 2rem)" }}>
            {detailQuery.data.name}
          </h2>
          <p className="text-muted" style={{ margin: 0, maxWidth: "65ch" }}>
            {detailQuery.data.description ?? "No description yet."}
          </p>
          <p className="flat-list__meta" style={{ margin: 0 }}>
            {typeof detailQuery.data.flashcardCount === "number"
              ? `${detailQuery.data.flashcardCount} flashcards`
              : "Flashcard count unavailable"}
          </p>

          <div className="section-row" style={{ justifyContent: "flex-start", gap: "0.6rem" }}>
            <Link to={`/decks/${deckId}/flashcards`} className="button button--primary" aria-disabled={false}>
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
        </article>
      ) : null}
    </PageScaffold>
  );
};
