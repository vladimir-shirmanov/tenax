import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { getApiErrorMessage } from "../api/errors";
import {
  useDeleteFlashcardMutation,
  useFlashcardDetailQuery,
} from "../api/flashcards";
import { PageScaffold } from "../components/PageScaffold";

export const FlashcardDetailRoute = () => {
  const { deckId = "", flashcardId = "" } = useParams();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const detailQuery = useFlashcardDetailQuery(deckId, flashcardId);
  const deleteMutation = useDeleteFlashcardMutation(deckId, flashcardId);

  return (
    <PageScaffold title="Flashcard detail" subtitle="Review full content and metadata.">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link to={`/decks/${deckId}/flashcards`} className="text-sm font-semibold text-pine hover:underline">
          Back to flashcards
        </Link>
        <Link
          to={`/decks/${deckId}/flashcards/${flashcardId}/edit`}
          className="rounded-lg bg-ink px-3 py-1.5 text-sm font-semibold text-white"
        >
          Edit
        </Link>
        <button
          type="button"
          className="rounded-lg border border-ember px-3 py-1.5 text-sm font-semibold text-ember"
          onClick={() => setConfirmDelete(true)}
        >
          Delete
        </button>
      </div>

      {detailQuery.isLoading ? <p>Loading flashcard...</p> : null}
      {detailQuery.isError ? (
        <div role="alert" className="rounded-lg border border-ember bg-orange-50 p-3 text-sm">
          {getApiErrorMessage(detailQuery.error)}
        </div>
      ) : null}

      {detailQuery.isSuccess ? (
        <article className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-600">Term</h2>
            <p className="text-xl font-semibold text-ink">{detailQuery.data.term}</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-600">Definition</h2>
            <p className="whitespace-pre-wrap">{detailQuery.data.definition}</p>
          </div>
          {detailQuery.data.imageUrl ? (
            <img src={detailQuery.data.imageUrl} alt="Flashcard" className="max-h-52 rounded-lg object-cover" />
          ) : null}
          <p className="text-xs text-stone-500">
            Updated {new Date(detailQuery.data.updatedAtUtc).toLocaleString()}
          </p>
        </article>
      ) : null}

      {confirmDelete ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm delete flashcard"
          className="mt-6 rounded-lg border border-stone-300 bg-stone-100 p-4"
        >
          <p className="text-sm">Delete this flashcard? This cannot be undone.</p>
          {deleteMutation.isError ? (
            <p role="alert" className="mt-2 text-sm text-ember">
              {getApiErrorMessage(deleteMutation.error)}
            </p>
          ) : null}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="rounded-lg bg-ember px-3 py-1.5 text-sm font-semibold text-white"
              onClick={() => {
                deleteMutation.mutate(undefined, {
                  onSuccess: () => {
                    navigate(`/decks/${deckId}/flashcards`);
                  },
                });
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Confirm delete"}
            </button>
            <button
              type="button"
              className="rounded-lg border border-stone-400 px-3 py-1.5 text-sm"
              onClick={() => setConfirmDelete(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </PageScaffold>
  );
};
