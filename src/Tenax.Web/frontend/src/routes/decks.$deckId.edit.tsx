import { useNavigate, useParams } from "react-router-dom";
import {
  getApiErrorMessage,
  getValidationError,
  isConcurrencyConflictError,
} from "../api/errors";
import { useDeckDetailQuery, useUpdateDeckMutation } from "../api/decks";
import { Breadcrumb } from "../components/Breadcrumb";
import { DeckForm } from "../components/DeckForm";
import { PageScaffold } from "../components/PageScaffold";

export const DeckEditRoute = () => {
  const { deckId = "" } = useParams();
  const navigate = useNavigate();
  const detailQuery = useDeckDetailQuery(deckId);
  const mutation = useUpdateDeckMutation(deckId);

  return (
    <PageScaffold
      title="Edit deck"
      subtitle="Update deck metadata and keep your library accurate."
      breadcrumb={
        <Breadcrumb
          items={[
            { label: "Decks", href: "/decks" },
            { label: detailQuery.data?.name ?? deckId, href: `/decks/${deckId}` },
            { label: "Edit" },
          ]}
        />
      }
    >
      {detailQuery.isLoading ? <p className="text-muted">Loading deck...</p> : null}
      {detailQuery.isError ? (
        <div role="alert" className="alert">
          {getApiErrorMessage(detailQuery.error)}
        </div>
      ) : null}

      {isConcurrencyConflictError(mutation.error) ? (
        <div className="alert" style={{ marginTop: 0, marginBottom: "1rem" }}>
          <p className="text-muted" style={{ margin: 0 }}>
            Reload latest deck and retry your changes.
          </p>
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
        <DeckForm
          initialValues={{
            name: detailQuery.data.name,
            description: detailQuery.data.description ?? "",
          }}
          submitLabel="Save changes"
          isSubmitting={mutation.isPending}
          formError={mutation.isError ? getApiErrorMessage(mutation.error) : undefined}
          fieldErrors={{
            name: getValidationError(mutation.error, "name"),
            description: getValidationError(mutation.error, "description"),
          }}
          disableIfUnchanged
          onSubmit={(payload) => {
            mutation.mutate(payload, {
              onSuccess: () => {
                navigate(`/decks/${deckId}`);
              },
            });
          }}
        />
      ) : null}
    </PageScaffold>
  );
};
