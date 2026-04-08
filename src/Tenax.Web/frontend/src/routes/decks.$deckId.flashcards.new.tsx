import { useNavigate, useParams } from "react-router-dom";
import { getApiErrorMessage, getValidationError } from "../api/errors";
import { useCreateFlashcardMutation } from "../api/flashcards";
import { useDeckDetailQuery } from "../api/decks";
import { Breadcrumb } from "../components/Breadcrumb";
import { FlashcardForm } from "../components/FlashcardForm";
import { PageScaffold } from "../components/PageScaffold";

export const FlashcardCreateRoute = () => {
  const navigate = useNavigate();
  const { deckId = "" } = useParams();
  const deckQuery = useDeckDetailQuery(deckId);
  const deckName = deckQuery.data?.name ?? deckId;
  const mutation = useCreateFlashcardMutation(deckId);

  return (
    <PageScaffold
      title="Create flashcard"
      subtitle="Add a new study card to this deck."
      breadcrumb={
        <Breadcrumb
          items={[
            { label: "Decks", href: "/decks" },
            { label: deckName, href: `/decks/${deckId}` },
            { label: "Flashcards", href: `/decks/${deckId}/flashcards` },
            { label: "New flashcard" },
          ]}
        />
      }
    >
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
        onCancel={() => {
          navigate(`/decks/${deckId}`);
        }}
      />
    </PageScaffold>
  );
};
