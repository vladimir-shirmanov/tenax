import { createBrowserRouter } from "react-router-dom";
import { FlashcardListRoute } from "../routes/decks.$deckId.flashcards.index";
import { FlashcardCreateRoute } from "../routes/decks.$deckId.flashcards.new";
import { FlashcardDetailRoute } from "../routes/decks.$deckId.flashcards.$flashcardId";
import { FlashcardEditRoute } from "../routes/decks.$deckId.flashcards.$flashcardId.edit";

export const router = createBrowserRouter([
  {
    path: "/decks/:deckId/flashcards",
    element: <FlashcardListRoute />,
  },
  {
    path: "/decks/:deckId/flashcards/new",
    element: <FlashcardCreateRoute />,
  },
  {
    path: "/decks/:deckId/flashcards/:flashcardId",
    element: <FlashcardDetailRoute />,
  },
  {
    path: "/decks/:deckId/flashcards/:flashcardId/edit",
    element: <FlashcardEditRoute />,
  },
]);
