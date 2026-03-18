# ADR 0013: Frontend Form Validation Stack and Dirty-Field Error Reveal

- Status: Superseded
- Date: 2026-03-17
- Owners: Architecture
- Superseded By:
  - docs/adr/0014-frontend-form-validation-blur-touched-error-reveal.md
- Related Contracts:
  - docs/contracts/api/frontend-form-validation-no-api-response-changes-contract.yaml
  - docs/contracts/api/decks-create-contract.yaml
  - docs/contracts/api/decks-update-contract.yaml
  - docs/contracts/api/flashcards-create-contract.yaml
  - docs/contracts/api/flashcards-update-contract.yaml

## Context
- The frontend currently uses custom form state and custom validation logic in deck and flashcard forms.
- The implemented migration standardizes in-scope forms on `zod` plus `@hookform/resolvers`.
- Validation errors must be shown only after the corresponding field becomes dirty.
- Scope is frontend-only behavior and consistency. No backend behavior or API response schema changes are expected.
- The current API contract set for deck and flashcard CRUD is already established and implemented.

## Decision
- Standardize in-scope frontend forms on the following validation stack:
  - Form state/orchestration: `react-hook-form`.
  - Schema validation: `zod`.
  - Resolver bridge: `@hookform/resolvers/zod`.
- Standardize validation visibility policy for in-scope forms:
  - Field-level error messages are rendered only when that specific field is dirty.
  - Non-dirty fields do not show validation messages before user interaction.
  - After submit, forms may still block submission with validation errors, but visual field-level error text remains gated by field dirtiness unless product requirements explicitly introduce a global submit summary in a future ADR.
- Establish migration scope:
  - `DeckForm` and `FlashcardForm` are migrated in this delivery.
- Maintain contract-first boundary:
  - Existing backend endpoint payloads, status codes, and error schemas remain authoritative and unchanged.
  - Any future server-side validation contract change requires endpoint contract updates and, if breaking, a new ADR.

## Alternatives Considered
1. Keep custom form state and ad hoc validation per form.
2. Use `yup` resolver instead of `zod`.
3. Show all validation errors immediately on first render.

## Consequences
- Positive impacts:
  - Predictable form behavior across the SPA with less duplicated validation logic.
  - Better UX: users see validation guidance after interacting with a field, reducing initial noise.
  - Easier testability via consistent dirty/touched/error state semantics.
- Trade-offs and risks:
  - Migration requires careful parity checks so existing submit and API error handling behavior does not regress.
  - Teams must align on one canonical pattern for optional fields, trimming, and string normalization in zod schemas.
  - Dirty-only field error reveal can hide problems in untouched fields until interaction; implementation must ensure submit blocking remains correct.
- Follow-up tasks:
  - QA validates no API payload drift and no regression in create/edit flows.

## Parallel Delivery Notes
- Backend track deliverables:
  - No endpoint or response schema implementation changes in this scope.
  - Keep existing deck/flashcard contracts and auth behavior unchanged.
- Frontend track deliverables:
  - Replace custom form state/validation in `DeckForm` and `FlashcardForm` with `react-hook-form` + `zodResolver`.
  - Implement error rendering conditions using per-field dirty state.
  - Preserve request payload shapes and route/query behavior already defined by active contracts.
- Shared contract milestones:
  - This ADR plus `frontend-form-validation-no-api-response-changes-contract.yaml` are the source of truth for this request.
  - Any discovered need for API response change halts implementation until contract updates are approved.

## Acceptance Criteria Coverage
- AC-1 Validation stack standardization:
  - `DeckForm` and `FlashcardForm` use `react-hook-form` with `zod` and `@hookform/resolvers/zod`.
- AC-2 Dirty-field error visibility:
  - For each validated input, field error text is absent before that field is dirty.
  - After the field becomes dirty and validation fails, field error text is shown.
- AC-3 No backend/API contract drift:
  - Existing deck and flashcard API response contracts remain unchanged for this request.

## Implementation and Test Notes
- Implemented component migrations:
  - `src/Tenax.Web/frontend/src/components/DeckForm.tsx`
  - `src/Tenax.Web/frontend/src/components/FlashcardForm.tsx`
- Added component tests for dirty-gated behavior and invalid-submit blocking:
  - `src/Tenax.Web/frontend/src/components/DeckForm.test.tsx`
  - `src/Tenax.Web/frontend/src/components/FlashcardForm.test.tsx`
- Test expectation for this ADR:
  - Dirty-gated validation behavior must remain covered by component tests when form validation logic is changed.

## Supersession Note
- ADR 0014 supersedes the dirty-only field error reveal rule.
- The validation stack decision in this ADR remains in force: in-scope forms continue to use `react-hook-form` with `zod` and `@hookform/resolvers/zod`.
- Historical note: this ADR records the original migration posture and should not be used as the source of truth for current field error reveal semantics.
