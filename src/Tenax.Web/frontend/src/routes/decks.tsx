import { Link } from "react-router-dom";
import { PageScaffold } from "../components/PageScaffold";

export const DecksRoute = () => (
  <PageScaffold
    title="Decks"
    subtitle="Choose a deck and continue authoring or reviewing without visual noise."
  >
    <ul className="flat-list" role="list" aria-label="deck list">
      <li className="flat-list__item">
        <h2 className="flat-list__title">Default deck</h2>
        <p className="flat-list__meta">Deck management is not implemented in this slice yet.</p>
        <p className="flat-list__meta">
          <Link to="/decks/default/flashcards" className="link-inline">
            Open default deck flashcards
          </Link>
        </p>
      </li>
    </ul>
  </PageScaffold>
);
