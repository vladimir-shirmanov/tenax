# API Notes: Deck Details Page Frontend Changes

> **Feature:** Deck Details Page Enhancement (GitHub Issue #3)
> **Delivery date:** 2026-04-08
> **Scope:** Frontend-only — no new API endpoints, no backend contract changes
> **Related ADR:** `docs/adr/0018-deck-details-page-enhancement.md`
> **Related contract:** `docs/contracts/api/deck-details-page-no-new-api-contract.yaml`

---

## Overview

This note documents the frontend behavior introduced by the Deck Details page enhancement. All
changes are confined to the `src/Tenax.Web/frontend` module. Existing backend endpoints are
consumed unchanged; no DTO fields, status codes, or error envelopes were modified.

---

## 1. `onCancel` Prop on `DeckForm` and `FlashcardForm`

### What changed

Both `DeckFormProps` and `FlashcardFormProps` gained an optional callback prop:

```ts
onCancel?: () => void
```

### Behavior

| Condition | Rendered output |
|-----------|----------------|
| `onCancel` is **provided** | A `button--ghost` Cancel button is rendered alongside the submit button inside a `.section-row` wrapper |
| `onCancel` is **absent** (default) | No Cancel button is rendered; layout and behavior are identical to the pre-change state |

- The Cancel button label is exactly **"Cancel"** — no variant copy.
- Clicking Cancel calls `onCancel()` immediately with no confirmation step, no dirty-field guard, and no async operation.
- Cancel is **disabled** while the form is submitting (`isSubmitting = true`) to prevent navigation away mid-request.
- DOM order: submit button appears first (left on desktop, top on mobile). On viewports ≤ 480 px both buttons stretch to full width via a `@media (max-width: 30rem)` rule in `styles.css`.

### Route wiring

| Route file | Component | `onCancel` target |
|------------|-----------|-------------------|
| `routes/decks.$deckId.edit.tsx` | `DeckForm` | `/decks/:deckId` |
| `routes/decks.$deckId.flashcards.$flashcardId.edit.tsx` | `FlashcardForm` | `/decks/:deckId/flashcards/:flashcardId` |
| `routes/decks.$deckId.flashcards.new.tsx` | `FlashcardForm` | `/decks/:deckId` |

Each route obtains `navigate` from `useNavigate()` and passes `onCancel={() => navigate(target)}`.

### API impact

None. Cancel is a client-side navigation action; no API call is made.

---

## 2. Embedded Flashcard Preview on the Deck Detail Page

### What changed

`DeckDetailRoute` (`routes/decks.$deckId.tsx`) now contains a `<section>` element rendered below
the primary action row that displays a paginated preview of the deck's flashcards.

### Data source

| Hook | Query params | Notes |
|------|-------------|-------|
| `useFlashcardListQuery(deckId, page, 10)` | `deckId` from route params; `page` from local `useState(1)`; `pageSize` hardcoded to `10` | Reuses the existing hook — no new hook or API call shape |

- TanStack Query key shape: `["decks", deckId, "flashcards", { page, pageSize: 10 }]`
- `page` resets to `1` via `useEffect([deckId])` when the user navigates between deck detail pages.

### Four rendered states

| State | Trigger | Output |
|-------|---------|--------|
| **Loading** | `previewQuery.isLoading` | 3 skeleton rows (`aria-hidden="true"`) + SR-only `aria-live` announcement |
| **Error** | `previewQuery.isError` | `.alert` div with classified copy + Retry button (`previewQuery.refetch()`) |
| **Empty** | `isSuccess && items.length === 0` | Text message + "Add your first flashcard →" link to `/decks/:deckId/flashcards/new` |
| **Populated** | `isSuccess && items.length > 0` | `.flat-list` using the established `.flat-list__item` / `.flat-list__title` / `.flat-list__meta` pattern |

### Pagination

Rendered only when `totalCount > 0`:

```
[Previous]  Showing X–Y of Z  [Next]
```

- Label uses an **en dash** (U+2013), not a hyphen.
- `start = (page - 1) * 10 + 1`, `end = Math.min(page * 10, totalCount)`, `totalPages = Math.ceil(totalCount / 10)`.
- Previous disabled when `page === 1`; Next disabled when `page === totalPages`.

### "View all flashcards →" link

Rendered in the section header whenever `totalCount > 0`, linking to `/decks/:deckId/flashcards`.

### Image badge (`.flashcard-preview__image-badge`)

When `item.hasImage` is `true`, a small inline pill is rendered in the meta row after the updated
timestamp:

```html
<span class="flashcard-preview__image-badge">image</span>
```

- Styled with a blue-tinted (`var(--accent-tertiary)`) background/border at low opacity.
- Added to `styles.css` under the `.flashcard-preview` CSS namespace.

### Error copy classification

| Error type | Copy |
|-----------|------|
| `isPersistenceUnavailableError` (503) | "The flashcard service is temporarily unavailable. Try again in a moment." |
| All other errors | "Could not load flashcards. Check your connection and try again." |

### API impact

None. `GET /api/decks/{deckId}/flashcards` is consumed with existing contract parameters; no new
query parameters are introduced by this section (distinct from the shuffle params in ADR 0017).

---

## 3. Inline Delete Deck Confirmation Flow

### What changed

`DeckDetailRoute` now handles deck deletion inline, without navigating to a separate confirmation
route or opening a `<dialog>`. The flow is driven by a local state variable in the component.

### State machine

```
idle
  └─ [Click "Delete deck"]        → confirming
confirming
  └─ [Click "Confirm delete"]     → deleting
  └─ [Click "Cancel"]             → idle  (focus → Delete deck trigger)
  └─ [Press Escape]               → idle  (focus → Delete deck trigger)
deleting
  └─ [mutation.onSuccess]         → navigate /decks
  └─ [mutation.onError]           → error
error
  └─ [Click "Try again"]          → deleting
  └─ [Click "Cancel"]             → idle  (focus → Delete deck trigger)
  └─ [Press Escape]               → idle  (focus → Delete deck trigger)
```

### UI elements

| State | Rendered element | Notes |
|-------|-----------------|-------|
| `idle` | `<button class="button button--danger">Delete deck</button>` below a `<hr>` separator | `ref={deleteTriggerRef}` for focus restoration |
| `confirming` | `.deck-detail__confirm-panel` (`role="group"`) with warning copy, "Confirm delete", and "Cancel" | Panel is inline `<div>`, not `<dialog>` |
| `deleting` | Same panel, both buttons disabled, label "Deleting..." | Panel remains visible to prevent layout jump |
| `error` | Panel + `.alert` with error copy; "Try again" button (retryable errors only) | Buttons re-enabled for retry |

### Focus management

- `deleteTriggerRef` (a `useRef`) is attached to the "Delete deck" trigger button.
- On Cancel click or Escape key press from `confirming` or `error` states: `deleteState` returns to
  `'idle'` and `deleteTriggerRef.current.focus()` is called to restore keyboard position.
- `confirmButtonRef` receives programmatic focus when transitioning to `confirming` state.

### Keyboard support

- `keydown` listener for `Escape` is active while `deleteState` is `'confirming'` or `'error'`.
- Pressing Escape behaves identically to clicking Cancel.

### Error classification

| Helper | Error type | Copy |
|--------|-----------|------|
| `isConcurrencyConflictError` | 409 Conflict | "This deck was modified by another session. Refresh the page and try again." |
| `isPersistenceUnavailableError` | 503 Service Unavailable | "The service is temporarily unavailable. Try again in a moment." |
| All other errors | — | "Something went wrong. Try again." |

### Mutation hook

Uses `useDeleteDeckMutation` (pre-existing in `src/api/decks`). On success the route navigates to
`/decks` via `useNavigate()`.

### API impact

None. `DELETE /api/decks/{deckId}` is consumed with the existing contract — request shape, response
shape, and error envelope are unchanged.

---

## No Backend / API Changes

All changes in this feature are confined to the frontend module. The following contracts are
consumed but **not modified**:

- `decks-get-detail-contract.yaml` — read by `DeckDetailRoute` for deck metadata
- `decks-delete-contract.yaml` — invoked by the inline delete flow
- `flashcards-list-contract.yaml` — read by the embedded preview section

Any future change to these contracts requires the standard ADR + contract-update process (see
`docs/adr/0000-contract-first-parallel-delivery.md`) before implementation.

---

## Known Gaps (Pending QA)

| Item | Type | Notes |
|------|------|-------|
| Dark mode contrast for `.flashcard-preview__image-badge` | Visual QA | `color-mix(in srgb, var(--accent-tertiary) 10%, transparent)` tint has not been verified against dark theme tokens via automated tooling |
| Playwright visual regression for confirm panel | Visual QA | Inline confirm panel appearance across light and dark themes is pending E2E visual coverage |
