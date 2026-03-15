import { Link, useParams, useSearchParams } from "react-router-dom";
import { getApiErrorMessage } from "../api/errors";
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
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-sm text-stone-600">Deck: {deckId}</p>
        <Link
          to={`/decks/${deckId}/flashcards/new`}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white"
        >
          New flashcard
        </Link>
      </div>

      {query.isLoading ? <p>Loading flashcards...</p> : null}

      {query.isError ? (
        <div role="alert" className="rounded-lg border border-ember bg-orange-50 p-3 text-sm">
          {getApiErrorMessage(query.error)}
        </div>
      ) : null}

      {query.isSuccess && query.data.items.length === 0 ? (
        <p>No flashcards found for this deck yet.</p>
      ) : null}

      {query.isSuccess && query.data.items.length > 0 ? (
        <ul className="space-y-3" aria-label="flashcard list">
          {query.data.items.map((item) => (
            <li key={item.id} className="rounded-lg border border-stone-200 p-3">
              <Link
                to={`/decks/${deckId}/flashcards/${item.id}`}
                className="font-semibold text-ink hover:underline"
              >
                {item.term}
              </Link>
              <p className="mt-1 text-sm text-stone-700">{item.definitionPreview}</p>
              <p className="mt-1 text-xs text-stone-500">
                Updated: {new Date(item.updatedAtUtc).toLocaleString()} {item.hasImage ? "| image" : ""}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </PageScaffold>
  );
};
