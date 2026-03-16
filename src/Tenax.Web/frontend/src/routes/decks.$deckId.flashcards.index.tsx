import { Link, useParams, useSearchParams } from "react-router-dom";
import { getApiErrorMessage, isPersistenceUnavailableError } from "../api/errors";
import { useFlashcardListQuery } from "../api/flashcards";
import { PageScaffold } from "../components/PageScaffold";

export const FlashcardListRoute = () => {
  const [searchParams] = useSearchParams();
  const { deckId = "" } = useParams();
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const pageSize = Number(searchParams.get("pageSize") ?? "50") || 50;

  const query = useFlashcardListQuery(deckId, page, pageSize);

  return (
    <PageScaffold
      title="Flashcards"
      subtitle="Create and maintain your deck content with quick edit and delete actions."
    >
      <div className="section-row">
        <p className="text-muted" style={{ margin: 0 }}>Deck: {deckId}</p>
        <Link
          to={`/decks/${deckId}/flashcards/new`}
          className="button button--primary"
        >
          New flashcard
        </Link>
      </div>

      {query.isLoading ? <p className="text-muted">Loading flashcards...</p> : null}

      {query.isError ? (
        <div role="alert" className="alert">
          <p>{getApiErrorMessage(query.error)}</p>
          {isPersistenceUnavailableError(query.error) ? (
            <button
              type="button"
              className="button button--ghost"
              onClick={() => {
                void query.refetch();
              }}
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      {query.isSuccess && query.data.items.length === 0 ? (
        <p className="text-muted">No flashcards found for this deck yet.</p>
      ) : null}

      {query.isSuccess && query.data.items.length > 0 ? (
        <ul className="flat-list" aria-label="flashcard list">
          {query.data.items.map((item) => (
            <li key={item.id} className="flat-list__item">
              <Link
                to={`/decks/${deckId}/flashcards/${item.id}`}
                className="flat-list__title"
              >
                {item.term}
              </Link>
              <p className="flat-list__meta">{item.definitionPreview}</p>
              <p className="flat-list__meta">
                Updated: {new Date(item.updatedAtUtc).toLocaleString()} {item.hasImage ? "| image" : ""}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </PageScaffold>
  );
};
