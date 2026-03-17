import { Link, useNavigate } from "react-router-dom";
import { getApiErrorMessage, getValidationError } from "../api/errors";
import { useCreateDeckMutation } from "../api/decks";
import { DeckForm } from "../components/DeckForm";
import { PageScaffold } from "../components/PageScaffold";

export const DeckCreateRoute = () => {
  const navigate = useNavigate();
  const mutation = useCreateDeckMutation();

  return (
    <PageScaffold title="Create new deck" subtitle="Set up a focused container for your next study unit.">
      <div style={{ marginBottom: "1rem" }}>
        <Link to="/decks" className="link-inline">
          Back to decks
        </Link>
      </div>

      <DeckForm
        submitLabel="Create deck"
        isSubmitting={mutation.isPending}
        formError={mutation.isError ? getApiErrorMessage(mutation.error) : undefined}
        fieldErrors={{
          name: getValidationError(mutation.error, "name"),
          description: getValidationError(mutation.error, "description"),
        }}
        onSubmit={(payload) => {
          mutation.mutate(payload, {
            onSuccess: (createdDeck) => {
              navigate(`/decks/${createdDeck.id}`);
            },
          });
        }}
      />
    </PageScaffold>
  );
};
