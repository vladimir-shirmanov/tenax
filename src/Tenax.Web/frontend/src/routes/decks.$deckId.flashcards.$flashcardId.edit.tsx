import { useNavigate, useParams } from "react-router-dom";
import {
  getApiErrorMessage,
  getValidationError,
  isConcurrencyConflictError,
} from "../api/errors";
import {
  useFlashcardDetailQuery,
  useUpdateFlashcardMutation,
} from "../api/flashcards";
import { useDeckDetailQuery } from "../api/decks";
import { Breadcrumb } from "../components/Breadcrumb";
import { FlashcardForm } from "../components/FlashcardForm";
import { PageScaffold } from "../components/PageScaffold";

export const FlashcardEditRoute = () => {
  const { deckId = "", flashcardId = "" } = useParams();
  const navigate = useNavigate();
  const deckQuery = useDeckDetailQuery(deckId);
  const deckName = deckQuery.data?.name ?? deckId;
  const detailQuery = useFlashcardDetailQuery(deckId, flashcardId);
  const mutation = useUpdateFlashcardMutation(deckId, flashcardId);

  return (
    <PageScaffold
      title="Edit flashcard"
      subtitle="Update content and keep this card accurate."
      breadcrumb={
        <Breadcrumb
          items={[
            { label: "Decks", href: "/decks" },
            { label: deckName, href: `/decks/${deckId}` },
            { label: "Flashcards", href: `/decks/${deckId}/flashcards` },
            { label: detailQuery.data?.term ?? flashcardId, href: `/decks/${deckId}/flashcards/${flashcardId}` },
            { label: "Edit" },
          ]}
        />
      }
    >
      {detailQuery.isLoading ? <p className="text-muted">Loading flashcard...</p> : null}
      {detailQuery.isError ? (
        <div role="alert" className="alert">
          {getApiErrorMessage(detailQuery.error)}
        </div>
      ) : null}
      {isConcurrencyConflictError(mutation.error) ? (
        <div className="alert" style={{ marginTop: 0, marginBottom: "1rem" }}>
          <p className="text-muted" style={{ margin: 0 }}>Reload latest flashcard and retry your changes.</p>
          <button
            type="button"
            className="button button--ghost"
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
          disableIfUnchanged
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
