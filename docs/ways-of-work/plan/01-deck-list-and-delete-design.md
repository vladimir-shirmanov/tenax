```yaml
batch: 1
title: "Deck List & Delete Interface"
detail_level: "standard"
objective: "Design the primary entry point for managing language learning decks, including safe deletion."
deliverables:
  - "Empty state and loading skeleton designs"
  - "Deck grid/list layout with flashcard counts"
  - "Delete confirmation flow with optimistic UI"
  - "Error state recovery for failed fetches or deletions"
acceptance_criteria:
  - "Users can clearly see their existing decks or an encouraging empty state"
  - "Delete action requires intentional confirmation (preventing accidental loss of learning materials)"
  - "Loading states prevent layout shift during data fetching"
  - "Optimistic deletion masks network latency but gracefully rolls back on failure"
dependencies:
  - "API Contract: decks-list-contract.yaml"
  - "API Contract: decks-delete-contract.yaml"
visual_direction:
  mood: "Organized, encouraging, and uncluttered"
  references:
    - "Library or bookshelf metaphor without being strictly skeuomorphic"
  constraints:
    - "Keep deck cards scannable; do not overload with metadata"
layout_blueprint:
  - "Page Header: Title ('My Decks') and primary 'Create Deck' CTA"
  - "Content Area: Responsive grid of deck cards (or list view)"
  - "Deck Card: Name, description snippet, flashcard count badge, and a context menu (Edit/Delete)"
  - "Empty State: Illustration/Icon, supportive copy ('Start your language journey'), and a prominent CTA"
  - "Delete Modal: Critical warning dialog with 'Cancel' and 'Delete Deck' actions"
style_tokens:
  color:
    - "Background: default app background"
    - "Surface: elevated card background with slight border"
    - "Accent: primary brand color for 'Create Deck'"
    - "Destructive: red/danger hue for the Delete action"
    - "Text: high-contrast for names, subdued for descriptions"
  typography:
    - "Page Heading: H1, prominent"
    - "Card Heading: H3, medium weight, truncated if too long"
    - "Meta text: Small, for flashcard count and timestamps"
  spacing:
    - "Grid gap: comfortable padding (e.g., 24px/1.5rem) to avoid clutter"
  shape:
    - "Cards: rounded corners matching brand default, subtle hover elevation"
interaction_notes:
  - "Hover on deck card shows a subtle lift/shadow increase."
  - "Context menu (kebab icon) opens an accessible dropdown for Edit/Delete."
  - "Delete trigger opens a modal dialog (traps focus, overlay background)."
  - "Optimistic UI: On delete confirmation, immediately remove the card from the active list. If API fails, restore the card and show a toast error."
responsive_notes:
  - "Mobile (375px): 1-column stack, cards take full width. Header stacks title and CTA."
  - "Tablet (768px): 2-column or 3-column grid depending on container width."
  - "Desktop (1440px): 3 to 4-column grid. Max-width constraint to maintain readability."
content_notes:
  - "Empty State Title: 'Ready to build your vocabulary?'"
  - "Delete Warning: 'Are you sure you want to delete \"{Deck Name}\"? This will also permanently remove all {N} flashcards inside. This action cannot be undone.'"
accessibility_checklist:
  - "Heading hierarchy is explicit (H1 for page, H2/H3 for cards)"
  - "Interactive states include focus visibility for keyboard negotiation"
  - "Context menu trigger and menu items have proper aria-roles"
  - "Delete modal traps focus and announces itself via aria-dialog"
  - "Motion guidance includes reduced-motion fallback (disable hover lifts and modal scale animations if prefers-reduced-motion is true)"
frontend_handoff:
  - "Implement PageScaffold for the layout frame"
  - "Build the list route using React Router loaders/Zustand or React Query for the list contract"
  - "Implement the optimistic delete mutation flow with a manual rollback if the promise rejects"
  - "Use skeleton loaders matching the card dimensions for the loading state"
open_questions:
  - "Does the API support pagination cursors or standard offset for future 'Load More'?"
```

## Implementation Status (2026-03-17)

- Implemented in frontend route `routes/decks.tsx` with contract-backed list + delete confirmation behavior.
- Query parameters currently use offset-style pagination (`page`, `pageSize`) with defaults of `1` and `20`.
- Delete flow uses optimistic list removal with rollback and refetch on conflict/unavailable persistence errors.