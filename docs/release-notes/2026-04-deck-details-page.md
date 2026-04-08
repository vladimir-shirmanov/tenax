# Release Notes: Deck Details Page Enhancement

- **GitHub Issue:** #3
- **ADR:** `docs/adr/0018-deck-details-page-enhancement.md`
- **Delivery date:** 2026-04-08
- **Scope:** Frontend-only — no backend or API contract changes
- **Gate status:** 🔴 BLOCKED — pending AC-6 Escape key fix (see Blocking Items)

---

## Feature Summary

Three independent, additive enhancements to the Deck Details page and its associated forms.
All changes are confined to `src/Tenax.Web/frontend`. No new API endpoints, DTOs, backend
service changes, or database migrations were introduced.

---

## User-Facing Improvements

### 1. Cancel Button on Deck and Flashcard Forms

Users editing a deck or creating/editing a flashcard now have a visible **Cancel** button
alongside the submit button. Clicking Cancel navigates back to the originating page without
performing any mutation. The Cancel button is disabled during active form submission to
prevent mid-request navigation.

- **Deck edit** (`/decks/:deckId/edit`) → Cancel navigates to `/decks/:deckId`
- **Flashcard edit** (`/decks/:deckId/flashcards/:flashcardId/edit`) → Cancel navigates to
  `/decks/:deckId/flashcards/:flashcardId`
- **Flashcard new** (`/decks/:deckId/flashcards/new`) → Cancel navigates to `/decks/:deckId`

Existing consumers that do not pass `onCancel` are unaffected (backward-compatible
optional prop addition).

### 2. Embedded Flashcard Preview on Deck Detail Page

The Deck Detail page now surfaces a paginated preview of the deck's flashcards inline,
eliminating the need to navigate away for an at-a-glance content check.

- Displays up to **10 flashcards per page** using the existing `useFlashcardListQuery` hook
- Four rendered states: loading (skeleton rows), error (classified copy + Retry), empty
  (message + "Add your first flashcard" CTA), and populated list
- Pagination controls (`Previous` / `Showing X–Y of Z` / `Next`) when `totalCount > 0`
- **"View all flashcards →"** link to `/decks/:deckId/flashcards` when `totalCount > 0`
- **Image badge** (`.flashcard-preview__image-badge`) displayed per item when
  `item.hasImage` is `true`

### 3. Inline Delete Deck Confirmation

Deck deletion is now handled entirely inline on the Deck Detail page without a
navigation round-trip. The flow matches the established inline flashcard delete pattern.

- **Idle:** "Delete deck" danger button below a horizontal separator
- **Confirming:** inline confirmation panel with warning copy, "Confirm delete", and "Cancel"
- **Deleting:** panel remains visible with buttons disabled and label "Deleting..."
- **Error:** classified error copy (409 concurrency / 503 unavailable / generic) with retry path
- On success: navigates to `/decks`
- **Keyboard:** Cancel or Escape key returns to idle and restores focus to the delete trigger

---

## Behavioral Impact

| Category | Impact |
|----------|--------|
| API / backend contracts | **None** — `GET /api/decks/{deckId}`, `GET /api/decks/{deckId}/flashcards`, and `DELETE /api/decks/{deckId}` are consumed unchanged |
| Data model / migrations | **None** |
| Configuration / environment | **None** |
| Existing form consumers | **None** — `onCancel` is an optional prop; omitting it preserves pre-existing behavior exactly |

---

## Files Changed

**Frontend implementation (11 files):**
- `src/Tenax.Web/frontend/src/components/DeckForm.tsx`
- `src/Tenax.Web/frontend/src/components/DeckForm.test.tsx`
- `src/Tenax.Web/frontend/src/components/FlashcardForm.tsx`
- `src/Tenax.Web/frontend/src/components/FlashcardForm.test.tsx`
- `src/Tenax.Web/frontend/src/routes/decks.$deckId.tsx`
- `src/Tenax.Web/frontend/src/routes/decks.$deckId.edit.tsx`
- `src/Tenax.Web/frontend/src/routes/decks.$deckId.flashcards.$flashcardId.edit.tsx`
- `src/Tenax.Web/frontend/src/routes/decks.$deckId.flashcards.new.tsx`
- `src/Tenax.Web/frontend/src/routes/decks.routes.test.tsx`
- `src/Tenax.Web/frontend/src/routes/flashcards.routes.test.tsx`
- `src/Tenax.Web/frontend/src/styles.css`

**QA additions (2 files):**
- `tests/http/flashcards-authoring-management.http`
- `tests/http/flashcards-authoring-management.postman_collection.json`

**Documentation (4 files):**
- `docs/adr/0018-deck-details-page-enhancement.md`
- `docs/contracts/api/deck-details-page-no-new-api-contract.yaml`
- `docs/design-handoffs/deck-details-page-2026-04.md`
- `docs/api-notes/deck-details-page-frontend-changes.md`

---

## Test Coverage

| Stage | Suites | Tests | Result |
|-------|--------|-------|--------|
| Frontend implementation | 14 | 93 | ✅ Pass |
| QA additions (+3 route + HTTP autotest) | 14 | 96 | ✅ Pass |
| Build | — | — | ✅ Pass |

Test scope includes: Cancel renders/absent prop, Cancel click calls `onCancel`, Cancel
disabled during submit, preview loading/error/empty/list/pagination states, delete state
machine transitions, focus restoration on Cancel/Escape (confirming state), image badge
render, route-level navigation targets, `pageSize=10` HTTP autotest.

---

## Blocking Items (Quality Gate)

> **Gate status: FAIL — 1 blocking defect found by code-review**

```yaml
issue_tasks:
  - id: "ISSUE-001"
    source_agent: "code-review"
    severity: "high"
    type: "bug"
    title: "Escape key handler not active in error states"
    description: >
      The Escape key handler in DeckDetailRoute only guards against states that are not
      'confirming', so it exits early when deleteState is any error state
      (error_concurrency, error_persistence, error_generic). AC-6 and ADR 0018 explicitly
      require Escape support in both confirming and error states. Users who encounter a
      deletion error cannot use Escape to dismiss the panel — they must click Cancel,
      creating an accessibility gap and a direct AC-6 violation.
    evidence:
      - "src/Tenax.Web/frontend/src/routes/decks.$deckId.tsx — Escape handler guard: `if (deleteState !== 'confirming') { return; }`"
      - "ADR 0018 line 108: 'keydown listener for Escape is active while deleteState is confirming or error'"
      - "decks.routes.test.tsx — Escape tested only from confirming state; no test for Escape from error states"
    acceptance_fix:
      - "Escape key handler must dismiss the panel and restore focus to deleteTriggerRef when deleteState is confirming OR any error state (error_concurrency, error_persistence, error_generic)"
      - "At least one test must verify Escape from an error state (e.g., error_generic) returns to idle and restores focus"
    recommended_owner_agent: "Frontend Developer"
    blocking_release: true
```

---

## Known Non-Blocking Follow-Up Items

1. **Dark mode badge contrast** — `.flashcard-preview__image-badge` uses
   `color-mix(in srgb, var(--accent-tertiary) 10%, transparent)`; contrast against dark
   theme tokens has not been formally verified via automated tooling. QA visual check
   recommended before next major release.

2. **Playwright visual regression baselines** — Inline delete confirm panel and image badge
   appearances across light and dark themes have no captured visual regression baselines.
   Recommended before next major release.

3. **HTTP E2E tests require running server** — `tests/http/flashcards-authoring-management.http`
   and the Postman collection were not exercised in this delivery. Manual execution against
   a running instance is recommended before the next QA cycle.

4. **Delete state machine extraction** — Consider extracting the inline delete flow to a
   `useDeleteDeckFlow` custom hook if `DeckDetailRoute` grows further.

---

## Stage Gates Summary

| Stage | Agent | Status |
|-------|-------|--------|
| Architecture + ADR | Architect | ✅ |
| Design handoff (3 batches) | Design Handoff | ✅ |
| Frontend implementation (6 ACs) | Frontend Developer | ✅ |
| Documentation | Techwriter | ✅ |
| QA verification (96 tests, `issue_tasks: []`) | QA | ✅ |
| Code quality gate | code-review | 🔴 FAIL (ISSUE-001) |

---

## Final Recommendation

**NOT READY** — blocked on ISSUE-001 (Escape key handler not active in error states).

Once `Frontend Developer` delivers the AC-6 fix (Escape support from error states + test
coverage), re-run the full test suite, re-execute the `code-review` gate, and update this
document before merging.
