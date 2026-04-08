# ADR 0018: Deck Details Page Enhancement

- Status: Accepted
- Date: 2026-06-19
- Owners: Architecture, Frontend Developer
- Related Contracts:
  - docs/contracts/api/decks-get-detail-contract.yaml
  - docs/contracts/api/flashcards-list-contract.yaml
  - docs/contracts/api/decks-delete-contract.yaml
  - docs/contracts/api/deck-details-page-no-new-api-contract.yaml

## Context

- GitHub Issue #3 identified three improvements to the existing deck detail page (`/decks/:deckId`):
  1. Cancel navigation buttons on `DeckEditRoute`, `FlashcardEditRoute`, and `FlashcardCreateRoute`.
  2. An embedded, paginated flashcard preview section on the deck detail page.
  3. A delete deck action accessible directly from the deck detail page.
- All backend API endpoints required by these improvements already exist and are fully contracted:
  - `GET /api/decks/{deckId}` → `decks-get-detail-contract.yaml`
  - `GET /api/decks/{deckId}/flashcards?page&pageSize` → `flashcards-list-contract.yaml`
  - `DELETE /api/decks/{deckId}` → `decks-delete-contract.yaml`
- The existing TanStack Query hooks (`useDeckDetailQuery`, `useFlashcardListQuery`, `useDeleteDeckMutation`) already encapsulate the API calls; no new hooks are required.
- `DeckForm` and `FlashcardForm` components currently have no `onCancel` prop; adding one is the only component API surface change.
- The separate `FlashcardListRoute` (`/decks/:deckId/flashcards`) must remain unaffected; the embedded preview is a compact supplement, not a replacement.
- Tenax clean architecture boundaries remain unchanged: the feature involves only frontend route/component work with no Application, Domain, or Infrastructure layer changes.

## Decision

### 1. Frontend-Only Enhancement — No New Backend Work

All three improvements are implemented entirely in the frontend. The backend API inventory, endpoint contracts, and response schemas remain frozen. This is validated by referencing `docs/contracts/api/deck-details-page-no-new-api-contract.yaml`.

### 2. Cancel Navigation Targets

Each form route receives a deterministic cancel target defined at the route level. The `onCancel` callback is passed to the shared form component, which renders a Cancel button only when the prop is provided.

| Route | Component | Cancel Target |
|---|---|---|
| `routes/decks.$deckId.edit.tsx` | `DeckForm` | `/decks/:deckId` |
| `routes/decks.$deckId.flashcards.$flashcardId.edit.tsx` | `FlashcardForm` | `/decks/:deckId/flashcards/:flashcardId` |
| `routes/decks.$deckId.flashcards.new.tsx` | `FlashcardForm` | `/decks/:deckId` |

Cancel navigation is a pure client-side `navigate()` call — no mutation is triggered, no confirmation dialog is shown.

### 3. DeckForm and FlashcardForm Component API Extension

Both components receive an optional `onCancel?: () => void` prop. When the prop is present, a Cancel button is rendered alongside the submit button. When absent (i.e., in any other context that does not yet wire cancel behavior), no Cancel button renders. This preserves backward compatibility with any existing usages of these components.

### 4. Embedded Flashcard Preview on Deck Detail

The `DeckDetailRoute` renders a paginated flashcard preview section below deck metadata, using `useFlashcardListQuery(deckId, page, 10)` with a fixed `pageSize=10`.

Rendering contract:
- Each list item renders: `term` as a link to `/decks/:deckId/flashcards/:flashcardId`, `definitionPreview` truncated to ≤100 characters, and a visual image indicator driven by `hasImage`.
- Pagination controls show Previous/Next buttons and a "Showing X–Y of Z" label derived from `page`, `pageSize`, and `totalCount`.
- A "View all flashcards →" link navigates to `/decks/:deckId/flashcards` (the full `FlashcardListRoute`).
- Loading, empty, and error states are rendered inline within the preview section; error state includes a manual retry action.
- No search, filter, or sort controls are included in the preview.
- The separate `FlashcardListRoute` at `/decks/:deckId/flashcards` is entirely unaffected.

The fixed `pageSize=10` was chosen to keep the preview compact and avoid per-page query key proliferation. The full management route continues to use its own page/pageSize parameters independently.

### 5. Inline Delete Confirmation — No Separate Modal Route

Delete deck is surfaced in the actions row of `DeckDetailRoute`. Pressing "Delete deck" transitions the UI into an inline confirming state showing a warning message, a Confirm delete button, and a Cancel button — all rendered in place without route change or modal overlay.

Delete flow state machine:
```
idle → confirming → deleting → success (navigate /decks)
                              → error (inline, with retry or dismiss)
```

On successful deletion, the frontend navigates to `/decks`. On `409 concurrency_conflict` or `503 persistence_unavailable`, an inline error message is shown with a retry action; the state returns to `idle` after dismiss.

The existing `useDeleteDeckMutation` hook is used without modification.

## Alternatives Considered

1. **Separate modal route for delete confirmation** — Rejected. A route-based modal (e.g., `/decks/:deckId/delete`) would add route surface area with no user experience benefit. Inline confirmation is consistent with the existing flashcard delete confirmation pattern and requires no new route registration.

2. **Client-side pagination for embedded preview** — Rejected. Fetching all flashcards and paginating in-memory would bypass the existing `useFlashcardListQuery` contract, create an unbounded initial fetch for large decks, and diverge from the contracted `page`/`pageSize` query parameters. Server-side pagination via the existing API is used instead.

3. **Merge embedded preview into the existing FlashcardListRoute** — Rejected. The full management route and the detail preview serve different user intents (bulk management vs. quick orientation). Keeping them separate preserves route cohesion and avoids coupling the detail page load to the full flashcard list load.

4. **Always-visible Cancel button via DeckForm/FlashcardForm default** — Rejected. Defaulting to a rendered Cancel button could break existing contexts (e.g., standalone create pages embedded in other surfaces). The opt-in `onCancel` prop is safer and preserves backward compatibility.

5. **Global state or context for delete confirmation** — Rejected. Local component state for the delete flow state machine is sufficient; global state would introduce unnecessary coupling and complexity for a single-page interaction.

6. **Inline delete on flashcard preview items** — Rejected (out of scope). Flashcard deletion remains exclusive to the flashcard detail/edit page to prevent accidental mass deletion from a preview context.

## Consequences

### Positive Impacts
- No backend work is required; the feature ships entirely within the frontend track.
- Reuse of existing API hooks and contracts eliminates integration risk.
- The `onCancel` prop pattern is extensible to future form contexts without contract changes.
- The inline delete confirmation pattern is consistent with established UX patterns in the codebase.
- The fixed `pageSize=10` preview keeps TanStack Query cache keys predictable (`flashcards.list(deckId, page, 10)`) and separate from the full list route's cache entries.

### Trade-offs and Risks
- The preview uses a separate cache entry (`pageSize=10`) from the full flashcard list (`pageSize=50` default), which means mutations that invalidate `flashcards.list(deckId, ...)` must invalidate both cache families. Ensure `useDeleteDeckMutation` and flashcard create/update/delete mutations invalidate by `deckId` prefix, not exact key match.
- The inline delete state machine lives in `DeckDetailRoute` component state; a page refresh while in `confirming` state resets to `idle` — this is the desired behavior and requires no persistence.
- `definitionPreview` truncation (≤100 chars) is a render-layer concern: the API already returns `definitionPreview` as a pre-truncated field per `flashcards-list-contract.yaml`. The frontend should not re-truncate; it should render the field directly.
- Cancel navigation does not guard against unsaved changes (no dirty-field check before navigating away). This is consistent with existing navigation behavior elsewhere in the app and is explicitly out of scope for this issue.

### Follow-up Tasks
- Frontend Developer: implement all three improvements per AC-1 through AC-6.
- QA: add test scenarios as detailed in `docs/contracts/api/deck-details-page-no-new-api-contract.yaml`.
- Monitor TanStack Query cache invalidation in integration tests to confirm `pageSize=10` preview refreshes correctly after flashcard mutations.

## Parallel Delivery Notes

- **Backend track deliverables:** None. All required endpoints exist. No backend changes.
- **Frontend track deliverables:**
  - Add `onCancel?: () => void` to `DeckForm` and `FlashcardForm` components.
  - Wire cancel targets in `DeckEditRoute`, `FlashcardEditRoute`, and `FlashcardCreateRoute`.
  - Implement embedded flashcard preview section in `DeckDetailRoute` using `useFlashcardListQuery(deckId, page, 10)`.
  - Implement inline delete confirmation state machine in `DeckDetailRoute`.
- **Shared contract milestones:**
  - ADR 0018 and `deck-details-page-no-new-api-contract.yaml` approved before coding starts.
  - AC-1 through AC-6 validated via integration and E2E tests before merge.
