import { Link } from "react-router-dom";
import { PageScaffold } from "../components/PageScaffold";

export const DecksRoute = () => (
  <PageScaffold
    title="Decks"
    subtitle="Choose a deck to continue your flashcard authoring flow."
  >
    <p className="mb-4 text-sm text-stone-700">
      Deck management is not implemented in this slice yet.
    </p>
    <Link
      to="/decks/default/flashcards"
      className="inline-flex rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-stone-100"
    >
      Open default deck flashcards
    </Link>
  </PageScaffold>
);
