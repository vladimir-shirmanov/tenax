import { createBrowserRouter } from "react-router-dom";
import { HomeRoute } from "../routes/home";
import { DecksRoute } from "../routes/decks";
import { DeckCreateRoute } from "../routes/decks.new";
import { DeckDetailRoute } from "../routes/decks.$deckId";
import { DeckEditRoute } from "../routes/decks.$deckId.edit";
import { FlashcardListRoute } from "../routes/decks.$deckId.flashcards.index";
import { FlashcardCreateRoute } from "../routes/decks.$deckId.flashcards.new";
import { FlashcardDetailRoute } from "../routes/decks.$deckId.flashcards.$flashcardId";
import { FlashcardEditRoute } from "../routes/decks.$deckId.flashcards.$flashcardId.edit";
import { AppShell } from "../components/AppShell";

const routerFutureFlags = {
  v7_startTransition: true,
} as unknown as NonNullable<Parameters<typeof createBrowserRouter>[1]>["future"];

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <HomeRoute />,
      },
      {
        path: "decks",
        element: <DecksRoute />,
      },
      {
        path: "decks/new",
        element: <DeckCreateRoute />,
      },
      {
        path: "decks/:deckId",
        element: <DeckDetailRoute />,
      },
      {
        path: "decks/:deckId/edit",
        element: <DeckEditRoute />,
      },
      {
        path: "decks/:deckId/flashcards",
        element: <FlashcardListRoute />,
      },
      {
        path: "decks/:deckId/flashcards/new",
        element: <FlashcardCreateRoute />,
      },
      {
        path: "decks/:deckId/flashcards/:flashcardId",
        element: <FlashcardDetailRoute />,
      },
      {
        path: "decks/:deckId/flashcards/:flashcardId/edit",
        element: <FlashcardEditRoute />,
      },
    ],
  },
], {
  future: routerFutureFlags,
});
