```yaml
batch: 3
title: "Deck Detail Interface"
detail_level: "standard"
objective: "Provide an overview of a specific deck, showing its metadata and providing a gateway to its flashcards and study sessions."
deliverables:
  - "Deck header with title, description, and metadata"
  - "Empty state for a deck with zero flashcards"
  - "Actions for editing, deleting, or adding flashcards"
acceptance_criteria:
  - "User can easily read the deck name and description"
  - "User can clearly see the total flashcard count"
  - "Clear calls to action for managing flashcards and starting a study session"
  - "404 and 403 error states are gracefully handled"
dependencies:
  - "API Contract: decks-get-detail-contract.yaml"
visual_direction:
  mood: "Immersive, informative, focused"
  references:
    - "Dashboard header or profile overview"
  constraints:
    - "Do not display the actual flashcards list yet (unless asked), just the deck summary and entry points"
layout_blueprint:
  - "Breadcrumb or Back Navigation: 'Back to Decks'"
  - "Hero Header: Large Deck Title, Description text, and flashcard count badge"
  - "Primary Action Bar: 'Study Now' (if count > 0) / 'Add Flashcards'"
  - "Secondary Actions: Edit Deck, Delete Deck (via dropdown or subtle icon buttons)"
  - "Content Area: (Reserved for Flashcard List/Grid in a separate feature, but showing an empty state if count === 0)"
style_tokens:
  color:
    - "Header Area: Subtle surface tint or standard background to distinguish it from the cards below."
    - "Count Badge: Neutral or slightly accented pill."
  typography:
    - "Deck Title: H1, prominent, wraps gracefully on long names."
    - "Description: Body large, readable measure (max 65ch)."
  spacing:
    - "Generous padding in the hero header to establish hierarchy."
  shape:
    - "Buttons and Badges follow standard rounded corners."
interaction_notes:
  - "If studying is disabled due to zero cards, the 'Study Now' button should be visually disabled with a tooltip explaining why."
  - "Secondary actions (Edit/Delete) use standard hover hints."
responsive_notes:
  - "Mobile (375px): Header text scales down. Study Action becomes full width fixed at the bottom of the viewport or prominent under the description."
  - "Desktop (1440px): Layout is contained to max-width to ensure the description doesn't span too wide."
content_notes:
  - "Empty Deck Message: 'This deck is a blank canvas. Start adding words and phrases to learn.'"
  - "Forbidden State (403): 'You do not have access to view this deck.'"
  - "Not Found State (404): 'We couldn’t find this deck. It may have been deleted or the link is incorrect.'"
accessibility_checklist:
  - "Heading hierarchy is explicit"
  - "Disabled buttons communicate state correctly (aria-disabled) and avoid focus traps"
  - "Error states (404/403) provide clear navigational escape hatches (e.g., 'Go back home')"
frontend_handoff:
  - "Fetch deck details using the deckId from the URL params."
  - "Implement specific error boundary fallback views for 403 and 404 responses."
  - "Ensure the 'Study Now' action is conditionally rendered or disabled based on `flashcardCount`."
open_questions:
  - "Will the flashcards list be rendered on this exact page, or is it a separate nested route?"
```

## Implementation Status (2026-03-17)

- Implemented in frontend route `routes/decks.$deckId.tsx` with dedicated 403/404 messaging and retry action for persistence-unavailable failures.
- Flashcard browsing/editing is linked as separate routes from deck detail (`/decks/{deckId}/flashcards` and related child routes).
- Detail payload currently treats `flashcardCount` as optional on this screen; UI falls back when the field is not present.