# ADR 0014: Frontend Form Validation Blur-Touched Error Reveal

- Status: Accepted
- Date: 2026-03-18
- Owners: Architecture
- Supersedes:
  - docs/adr/0013-frontend-form-validation-zod-and-dirty-field-error-reveal.md
- Related Contracts:
  - docs/contracts/api/frontend-form-validation-no-api-response-changes-contract.yaml
  - docs/contracts/api/decks-create-contract.yaml
  - docs/contracts/api/decks-update-contract.yaml
  - docs/contracts/api/flashcards-create-contract.yaml
  - docs/contracts/api/flashcards-update-contract.yaml

## Context
- The current implementation already standardizes `DeckForm` and `FlashcardForm` on `react-hook-form`, `zod`, and `@hookform/resolvers/zod`.
- Visible field errors are currently gated by `dirtyFields` only.
- In the current implementation, a user can focus an empty required field, leave it unchanged, blur the field, and see no validation message because the field never becomes dirty.
- Product expectation for in-scope forms is that validation guidance appears after meaningful interaction, including focus-out from an invalid field even when no character change occurred.
- Scope remains frontend-only behavior. Existing deck and flashcard request payloads, endpoint contracts, status codes, and error schemas stay unchanged.

## Decision
- Preserve the existing validation stack:
  - Form state and orchestration: `react-hook-form`.
  - Schema validation: `zod`.
  - Resolver bridge: `@hookform/resolvers/zod`.
- Revise the field error reveal rule for in-scope forms:
  - Field-level validation messages are visible when the field is invalid and either dirty or touched by blur.
  - Initial render remains free of field-level validation text.
  - A blur interaction without a value mutation must still refresh resolver-backed validation state so an invalid touched field can show its current error.
  - Dirty-based reveal remains valid and continues to show errors after value changes.
- Preserve submit and transport behavior:
  - Invalid forms continue to block submission.
  - No request payload shape, endpoint path, response schema, or server-side validation contract changes are introduced.
- Keep the scope narrow:
  - This decision applies to `DeckForm` and `FlashcardForm` under `src/Tenax.Web/frontend/src/components`.
  - Broader form-validation policy changes outside these forms require follow-up architecture review.

## Alternatives Considered
1. Keep dirty-only error reveal and accept that blur without mutation shows no error.
2. Show field errors for all invalid touched fields on first focus, including before blur.
3. Show all field errors only after submit and keep blur interactions silent.

## Consequences
- Positive impacts:
  - Users receive validation feedback immediately after leaving an invalid field, even when they typed nothing.
  - The existing `react-hook-form` plus `zod` stack remains intact, avoiding payload and API regression risk.
  - Error visibility becomes more consistent with typical form UX expectations while still avoiding noisy first-render errors.
- Trade-offs and risks:
  - Frontend implementation must ensure blur events propagate through registered inputs so `touchedFields` and validation state stay accurate.
  - Teams must avoid rendering server field errors on untouched pristine fields at initial render unless a future ADR explicitly broadens that behavior.
  - Regression tests must cover the blur-without-change path, not only dirty-after-change paths.
- Follow-up tasks:
  - Frontend Developer updates `DeckForm` and `FlashcardForm` to reveal field errors using invalid plus dirty-or-touched semantics.
  - Frontend Developer adds regression tests for blur-triggered error visibility without value mutation.
  - QA validates unchanged deck and flashcard create/edit payloads and unchanged endpoint behavior.

## Parallel Delivery Notes
- Backend track deliverables:
  - No endpoint implementation, request contract, response schema, or persistence changes in this scope.
  - Preserve existing deck and flashcard CRUD contracts as the source of truth.
- Frontend track deliverables:
  - Keep `react-hook-form` with `zodResolver` in `DeckForm` and `FlashcardForm`.
  - Update field error reveal logic to show errors when a field is invalid and either dirty or touched after blur.
  - Ensure blur without value mutation can surface the current resolver error state.
  - Preserve payload normalization, submit blocking, and route behavior already defined by active contracts.
- Shared contract milestones:
  - This ADR and `frontend-form-validation-no-api-response-changes-contract.yaml` are the source of truth for this narrow update.
  - Any discovered need for API response or request contract change pauses implementation until contracts are updated.

## Acceptance Criteria Coverage
- AC-1 Stack preservation:
  - `DeckForm` and `FlashcardForm` continue using `react-hook-form` with `zod` and `@hookform/resolvers/zod`.
- AC-2 Blur-triggered visibility:
  - When a user focuses an invalid field, leaves its value unchanged, and blurs the field, the field-level error becomes visible.
- AC-3 Dirty-path preservation:
  - When a user changes a field into an invalid state, the field-level error becomes visible through the existing dirty-path behavior.
- AC-4 Initial quiet state:
  - Field-level validation text is not shown on initial render before interaction.
- AC-5 No contract drift:
  - Existing deck and flashcard request and response contracts remain unchanged for this update.

## Implementation Guidance
- Backend Developer:
  - No code changes are expected.
  - Review only for accidental API, DTO, or validation-payload drift if frontend implementation work touches shared clients.
- Frontend Developer:
  - Treat the root cause as both a reveal-policy change and a validation-trigger requirement on blur.
  - Keep the existing resolver stack and current payload shaping logic.
  - Prefer a single reusable field-error visibility rule across both forms so behavior stays consistent.
  - Add component coverage for blur-without-change invalid required fields and for unchanged submit blocking semantics.