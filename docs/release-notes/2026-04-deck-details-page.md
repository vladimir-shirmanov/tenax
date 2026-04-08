# Release Notes: Deck Details Page Enhancement

- **GitHub Issue:** #3
- **ADR:** `docs/adr/0018-deck-details-page-enhancement.md`
- **Delivery date:** 2026-04-08
- **Scope:** Frontend-only — no backend or API contract changes
- **Gate status:** ✅ READY — all gates passed, code-review sign-off 2026-04-08

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

**Post-release follow-ups (3 files):**
- `src/Tenax.Web/frontend/src/styles.css` (dark mode contrast fix)
- `src/Tenax.Web/frontend/src/routes/decks.$deckId.delete-flow.ts` (new hook)
- `src/Tenax.Web/frontend/src/routes/decks.$deckId.delete-flow.test.ts` (new hook tests)

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
| ISSUE-001 fix (+1 Escape-from-error-state test) | 14 | 97 | ✅ Pass |
| Post-release follow-ups (+7 hook tests) | 14 | 104 | ✅ Pass |
| Build | — | — | ✅ Pass |

Test scope includes: Cancel renders/absent prop, Cancel click calls `onCancel`, Cancel
disabled during submit, preview loading/error/empty/list/pagination states, delete state
machine transitions, focus restoration on Cancel/Escape (confirming **and** error states),
image badge render, route-level navigation targets, `pageSize=10` HTTP autotest.

---

## ISSUE-001: Escape Key in Error States — Resolved

**Discovered by:** code-review (initial gate)  
**Fixed in:** commit `2c9bb2d`  
**Status:** ✅ Closed — verified by final code-review gate (2026-04-08)

The initial code-review pass identified that the Escape key handler in `DeckDetailRoute`
only checked `deleteState !== 'confirming'`, causing it to silently exit for all three
error states (`error_concurrency`, `error_persistence`, `error_generic`). This directly
violated AC-6 and ADR 0018 line 108, which both mandate Escape support while the
confirmation/error panel is visible.

**Fix applied (commit `2c9bb2d`):**
- Guard widened to cover `confirming` **and** all error states (equivalent to `isDeleteActive(deleteState)`)
- Focus restoration to `deleteTriggerRef` improved to fire on every panel dismissal, not only from `confirming`
- One new test added: Escape from `error_generic` → idle + focus restored to trigger button

**Final code-review verdict:** APPROVED FOR RELEASE — `issue_tasks: []`

---

## Known Non-Blocking Follow-Up Items

1. ~~**Dark mode badge contrast**~~ — ✅ Resolved in commit `9e23899`: `--accent-tertiary` and `--focus-ring` overridden in dark theme to `#818fff` (5.54:1 contrast ratio, WCAG AA pass).

2. **Playwright visual regression baselines** — Inline delete confirm panel and image badge
   appearances across light and dark themes have no captured visual regression baselines.
   Recommended before next major release.

3. **HTTP E2E tests require running server** — `tests/http/flashcards-authoring-management.http`
   and the Postman collection were not exercised in this delivery. Manual execution against
   a running instance is recommended before the next QA cycle.

4. ~~**Delete state machine extraction**~~ — ✅ Resolved in commit `76c42ba`: `useDeleteDeckFlow` hook extracted to `decks.$deckId.delete-flow.ts` with 7 unit tests.

---

## Stage Gates Summary

| Stage | Agent | Status |
|-------|-------|--------|
| Architecture + ADR | Architect | ✅ |
| Design handoff (3 batches) | Design Handoff | ✅ |
| Frontend implementation (6 ACs) | Frontend Developer | ✅ |
| Documentation | Techwriter | ✅ (commit `7ec89bf`) |
| QA verification (96 tests, `issue_tasks: []`) | QA | ✅ |
| Code quality gate (initial) | code-review | 🔴 FAIL → ISSUE-001 opened |
| ISSUE-001 fix (Escape + focus; +1 test → 97 total) | Frontend Developer | ✅ (commit `2c9bb2d`) |
| Code quality gate (final) | code-review | ✅ PASS — `issue_tasks: []` — signed off 2026-04-08 |

---

## Final Recommendation

**✅ READY FOR RELEASE**

All 7 pipeline stage gates satisfied. One blocking defect (ISSUE-001) was discovered during
the initial code-review pass, triaged immediately, fixed by Frontend Developer in commit
`2c9bb2d`, and confirmed closed by the final code-review gate on 2026-04-08.

- **14 test suites · 104 tests · build passing**
- No API, backend, data model, or configuration changes
- Backward-compatible optional-prop addition only
- `issue_tasks: []` from both QA and final code-review
- ADR 0018 fully satisfied including AC-6 (Escape + focus restoration in all active states)
