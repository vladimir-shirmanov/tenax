import { useNavigate } from "react-router-dom";
import { getApiErrorMessage, getValidationError } from "../api/errors";
import { useCreateDeckMutation } from "../api/decks";
import { Breadcrumb } from "../components/Breadcrumb";
import { DeckForm } from "../components/DeckForm";
import { PageScaffold } from "../components/PageScaffold";

export const DeckCreateRoute = () => {
  const navigate = useNavigate();
  const mutation = useCreateDeckMutation();

  return (
    <PageScaffold
      title="Create new deck"
      subtitle="Set up a focused container for your next study unit."
      breadcrumb={<Breadcrumb items={[{ label: "Decks", href: "/decks" }, { label: "New deck" }]} />}
    >
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
