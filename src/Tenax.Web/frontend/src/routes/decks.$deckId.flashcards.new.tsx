import { Link, useNavigate, useParams } from "react-router-dom";
import { getApiErrorMessage, getValidationError } from "../api/errors";
import { useCreateFlashcardMutation } from "../api/flashcards";
import { FlashcardForm } from "../components/FlashcardForm";
import { PageScaffold } from "../components/PageScaffold";

export const FlashcardCreateRoute = () => {
  const navigate = useNavigate();
  const { deckId = "" } = useParams();
  const mutation = useCreateFlashcardMutation(deckId);

  return (
    <PageScaffold title="Create flashcard" subtitle="Add a new study card to this deck.">
      <div style={{ marginBottom: "1rem" }}>
        <Link to={`/decks/${deckId}/flashcards`} className="link-inline">
          Back to flashcards
        </Link>
      </div>
      <FlashcardForm
        submitLabel="Create flashcard"
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
              navigate(`/decks/${deckId}/flashcards`);
            },
          });
        }}
      />
    </PageScaffold>
  );
};
