import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getApiErrorMessage,
  getValidationError,
  isConcurrencyConflictError,
} from "../api/errors";
import {
  useFlashcardDetailQuery,
  useUpdateFlashcardMutation,
} from "../api/flashcards";
import { FlashcardForm } from "../components/FlashcardForm";
import { PageScaffold } from "../components/PageScaffold";

export const FlashcardEditRoute = () => {
  const { deckId = "", flashcardId = "" } = useParams();
  const navigate = useNavigate();
  const detailQuery = useFlashcardDetailQuery(deckId, flashcardId);
  const mutation = useUpdateFlashcardMutation(deckId, flashcardId);

  return (
    <PageScaffold title="Edit flashcard" subtitle="Update content and keep this card accurate.">
      <div className="mb-4">
        <Link
          to={`/decks/${deckId}/flashcards/${flashcardId}`}
          className="text-sm font-semibold text-pine hover:underline"
        >
          Back to detail
        </Link>
      </div>
      {detailQuery.isLoading ? <p>Loading flashcard...</p> : null}
      {detailQuery.isError ? (
        <div role="alert" className="rounded-lg border border-ember bg-orange-50 p-3 text-sm">
          {getApiErrorMessage(detailQuery.error)}
        </div>
      ) : null}
      {isConcurrencyConflictError(mutation.error) ? (
        <div className="mb-4 rounded-lg border border-stone-300 bg-stone-100 p-3 text-sm">
          <p>Reload latest flashcard and retry your changes.</p>
          <button
            type="button"
            className="mt-2 rounded-lg border border-stone-500 px-3 py-1.5 text-xs font-semibold"
            onClick={() => {
              void detailQuery.refetch();
            }}
          >
            Reload latest
          </button>
        </div>
      ) : null}
      {detailQuery.isSuccess ? (
        <FlashcardForm
          initialValues={{
            term: detailQuery.data.term,
            definition: detailQuery.data.definition,
            imageUrl: detailQuery.data.imageUrl ?? "",
          }}
          submitLabel="Save changes"
          isSubmitting={mutation.isPending}
          formError={mutation.isError ? getApiErrorMessage(mutation.error) : undefined}
          fieldErrors={{
            term: getValidationError(mutation.error, "term"),
            definition: getValidationError(mutation.error, "definition"),
            imageUrl: getValidationError(mutation.error, "imageUrl"),
          }}
          onSubmit={(payload) => {
            mutation.mutate(payload, {
              onSuccess: () => {
                navigate(`/decks/${deckId}/flashcards/${flashcardId}`);
              },
            });
          }}
        />
      ) : null}
    </PageScaffold>
  );
};
