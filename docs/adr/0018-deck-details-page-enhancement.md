# ADR 0018: Deck Details Page Enhancement

- Status: Accepted
- Date: 2026-04-04
- Owners: Frontend Developer
- Related Contracts:
  - docs/contracts/api/deck-details-page-no-new-api-contract.yaml
- Related Design Handoff:
  - docs/design-handoffs/deck-details-page-2026-04.md
- GitHub Issue: #3

## Context

- The Deck Details page lacked navigational escape hatches on edit and create forms; users had no Cancel button and were forced to use the browser back control.
- The page also lacked an at-a-glance summary of its flashcard content; users had to navigate away to the full flashcard list to see any cards.
- Deleting a deck required navigating to an external confirmation route; there was no inline destructive-action flow consistent with the existing flashcard delete pattern in `FlashcardDetailRoute`.
- All required data is already available through existing API contracts (`GET /api/decks/{deckId}` and `GET /api/decks/{deckId}/flashcards`); no backend or infrastructure changes are needed.
- Tenax maintains a clean architecture boundary: frontend behavior changes must be isolated to the frontend module unless an API contract change is required.

## Decision

### Scope
Deliver three independent, additive enhancements to the Deck Details page and its associated forms — all entirely within the frontend. No new API endpoints, DTOs, backend service changes, or database migrations are required.

### Batch 1 — Cancel Button on DeckForm and FlashcardForm
- Add an optional `onCancel?: () => void` prop to both `DeckFormProps` and `FlashcardFormProps`.
- When the prop is provided, render a `button--ghost` Cancel button alongside the existing submit button inside a `.section-row` wrapper.
- When the prop is absent, existing consumers are completely unaffected (backward-compatible extension).
- Cancel is disabled during form submission (`isSubmitting`) to prevent mid-request navigation.
- Wire `onCancel` at the route level:
  - `decks.$deckId.edit.tsx` → `navigate(\`/decks/${deckId}\`)`
  - `decks.$deckId.flashcards.$flashcardId.edit.tsx` → `navigate(\`/decks/${deckId}/flashcards/${flashcardId}\`)`
  - `decks.$deckId.flashcards.new.tsx` → `navigate(\`/decks/${deckId}\`)`

### Batch 2 — Embedded Flashcard Preview on Deck Detail
- Add a paginated flashcard preview `<section>` inside `DeckDetailRoute`, rendered below the primary action row within the existing `.stack` article.
- Reuse `useFlashcardListQuery` with `pageSize=10`; page state is local (`useState(1)`).
- Render four states: loading (3 skeleton rows), error (`.alert` + Retry), empty (message + CTA link), and populated (`.flat-list` items).
- Pagination controls (`Previous` / `Showing X–Y of Z` / `Next`) are shown only when `totalCount > 0`.
- "View all flashcards →" link to `/decks/:deckId/flashcards` is shown whenever `totalCount > 0`.
- Display a `.flashcard-preview__image-badge` pill in each item's meta row when `item.hasImage` is `true`.
- Add all new CSS under the `.flashcard-preview` namespace to `styles.css`.

### Batch 3 — Inline Delete Deck Confirmation
- Replace any external delete-confirmation route with a fully inline state machine inside `DeckDetailRoute`.
- States: `idle → confirming → deleting → success/error`.
  - **Idle:** "Delete deck" (`button--danger`) rendered below the preview section, separated by a visual `<hr>`.
  - **Confirming:** inline `.deck-detail__confirm-panel` (`role="group"`) with warning copy, "Confirm delete" (`button--danger`), and "Cancel" (`button--ghost`).
  - **Deleting:** buttons disabled; label changes to "Deleting..."; panel remains visible to prevent layout jump.
  - **Error:** `.alert` with classified error copy (409 concurrency / 503 unavailable / generic) and a "Try again" retry path.
- On `Cancel` click or `Escape` key: transition to idle and return focus to the "Delete deck" trigger (`deleteTriggerRef`).
- On mutation success: navigate to `/decks`.

### Compatibility and Boundary Policy
- No backend request/response contract changes; `GET /api/decks/{deckId}` and `GET /api/decks/{deckId}/flashcards` are consumed as-is.
- Any future change to those response shapes must follow the existing ADR + contract-update process before implementation.
- The additive-only response evolution policy from ADR 0012 remains in force.

## Alternatives Considered

1. **External delete-confirmation route** — consistent with early deck CRUD behavior, but adds a navigation round-trip for a common destructive action and diverges from the inline pattern established in `FlashcardDetailRoute`. Rejected.
2. **`<dialog>` element for delete confirmation** — provides browser-native focus-trap; rejected because the design system does not yet have a `<dialog>` component, and an inline panel avoids a new pattern dependency for a single flow.
3. **Embedding the full `FlashcardListRoute` in an iframe or portal on the detail page** — overly complex, breaks query isolation, and introduces duplicate scroll context. Rejected; a dedicated preview query with `pageSize=10` is sufficient.
4. **Shared `onCancel` higher-order component** — unnecessary abstraction for a two-consumer prop addition; a simple optional prop is transparent and backward-compatible.

## Consequences

- Positive impacts:
  - Users have a safe, always-visible Cancel path on all edit and create forms.
  - The deck detail page now surfaces flashcard content inline, reducing navigation friction for deck review.
  - The inline delete flow is consistent with the flashcard delete pattern and avoids a round-trip route change.
  - No backend effort required; no API contract risk.
- Trade-offs and risks:
  - The `.flashcard-preview__image-badge` uses `color-mix()` CSS, which requires a modern browser baseline; contrast in dark mode has not been formally verified via automated tooling at delivery time.
  - The inline delete confirm panel adds local state complexity to `DeckDetailRoute`; this is acceptable at current scale but may warrant extraction to a dedicated hook if the file grows further.
  - Preview section shows `totalCount` derived from the preview query, which may briefly diverge from the deck-level `flashcardCount` field if a flashcard is added or deleted in a separate tab between renders.
- Follow-up tasks:
  - Dark mode contrast QA for `.flashcard-preview__image-badge` (`.accent-tertiary` on `color-mix` background).
  - Playwright visual regression check for the confirm panel and image badge.
  - Consider extracting the delete state machine to a `useDeleteDeckFlow` custom hook if `DeckDetailRoute` grows further.

## Parallel Delivery Notes

- Backend track deliverables:
  - No endpoint, DTO, domain model, or persistence changes required or delivered.
  - Existing `GET /api/decks/{deckId}` and `GET /api/decks/{deckId}/flashcards` endpoints are consumed without modification.
- Frontend track deliverables:
  - Implement all three batches against existing API contracts and hooks.
  - Extend `DeckForm` and `FlashcardForm` component APIs with backward-compatible `onCancel` prop.
  - Add flashcard preview section and inline delete flow to `DeckDetailRoute`.
  - Add CSS namespace `.flashcard-preview` and `.deck-detail__confirm-panel` to `styles.css`.
- Shared contract milestones:
  - `deck-details-page-no-new-api-contract.yaml` confirms no backend contract changes — serves as the guard against accidental scope creep into backend territory.

## Acceptance Criteria Coverage

- AC-1 `onCancel` prop on `DeckForm` — Cancel renders only when prop is provided; existing consumers unaffected:
  - Covered by backward-compatible optional prop addition and component tests confirming conditional render.
- AC-2 `onCancel` prop on `FlashcardForm` — same contract as AC-1:
  - Covered by identical prop extension and parallel component test coverage.
- AC-3 Route-level Cancel wiring on deck edit, flashcard edit, and flashcard new routes:
  - Covered by `useNavigate()` wiring at each route with the correct navigation target per route.
- AC-4 Embedded flashcard preview (pageSize=10, all four states, pagination, "View all" link, image badge):
  - Covered by preview section implementation in `decks.$deckId.tsx` and `.flashcard-preview__image-badge` in `styles.css`.
- AC-5 Inline delete-deck confirmation state machine (idle → confirming → deleting → success/error):
  - Covered by state machine implementation in `decks.$deckId.tsx` using `useDeleteDeckMutation`.
- AC-6 Focus management and Escape key support for inline delete flow:
  - Covered by `deleteTriggerRef` focus restoration on Cancel/Escape and `keydown` Escape handler registered in confirming and error states.

## Implementation Outcome (2026-04-08)

- All 6 acceptance criteria delivered by frontend-only implementation; no backend or contract changes were required.
- Three batches shipped in a single frontend delivery:
  - **Batch 1:** `onCancel` optional prop added to `DeckForm` and `FlashcardForm`; Cancel button wired at three route sites.
  - **Batch 2:** Paginated flashcard preview section added to `DeckDetailRoute`; `.flashcard-preview__image-badge` CSS class added.
  - **Batch 3:** Inline delete-deck confirmation state machine implemented in `DeckDetailRoute` with focus management and Escape key support.
- Test evidence:
  - 14 test suites, 93 tests passed; build passed.
  - Component tests cover: Cancel renders when prop provided / absent, Cancel calls `onCancel` on click, Cancel disabled during submit, preview loading/error/empty/list/pagination states, delete state machine transitions, focus restoration on Cancel/Escape.
- Files changed:
  - `src/Tenax.Web/frontend/src/components/DeckForm.tsx`
  - `src/Tenax.Web/frontend/src/components/FlashcardForm.tsx`
  - `src/Tenax.Web/frontend/src/routes/decks.$deckId.edit.tsx`
  - `src/Tenax.Web/frontend/src/routes/decks.$deckId.flashcards.$flashcardId.edit.tsx`
  - `src/Tenax.Web/frontend/src/routes/decks.$deckId.flashcards.new.tsx`
  - `src/Tenax.Web/frontend/src/routes/decks.$deckId.tsx`
  - `src/Tenax.Web/frontend/src/styles.css`
- Known remaining work:
  - Dark mode contrast QA for `.flashcard-preview__image-badge` (Playwright visual check against dark theme tokens has not been run).
  - Playwright visual regression check for the inline delete confirm panel across light and dark themes.

### Post-Release Follow-Ups (2026-04-08)
- Dark mode WCAG AA contrast fix: `--accent-tertiary` and `--focus-ring` overridden to `#818fff` in `[data-theme="dark"]` (commit `9e23899`).
- Delete state machine extracted to `useDeleteDeckFlow` hook in `decks.$deckId.delete-flow.ts` with hook-level unit tests (commit `76c42ba`).
- Final test count: **104 tests passing**, build passing. All four originally-flagged non-blocking items closed (Playwright baselines and HTTP E2E execution remain infrastructure-gated).
