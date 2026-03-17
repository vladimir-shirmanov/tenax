# ADR 0012: Deck CRUD Contract-First API and Ownership Boundaries

- Status: Accepted
- Date: 2026-03-17
- Owners: Architecture
- Related Contracts:
  - docs/contracts/api/decks-list-contract.yaml
  - docs/contracts/api/decks-create-contract.yaml
  - docs/contracts/api/decks-get-detail-contract.yaml
  - docs/contracts/api/decks-update-contract.yaml
  - docs/contracts/api/decks-delete-contract.yaml

## Context
- At decision time, deck management was a placeholder in frontend route surfaces while flashcard CRUD under `/api/decks/{deckId}/flashcards` was already implemented.
- Tenax requires contract-first parallel delivery so Backend Developer and Frontend Developer can implement without payload ambiguity.
- Clean architecture boundaries remain mandatory: Web -> Application -> Domain with Infrastructure providing persistence implementations.
- Authorization behavior must match existing flashcard patterns: authenticated requests only, with ownership checks for deck-scoped operations.
- Error envelope behavior must stay aligned with current web-layer style (`code`, `message`, `traceId`, optional `errors`).
- Out of scope for this decision: study session logic, sharing/collaboration, deck import/export, and billing behavior.

## Decision
- Adopt strict endpoint contracts for deck CRUD under `/api/decks`:
  - `GET /api/decks?page=&pageSize=`
  - `POST /api/decks`
  - `GET /api/decks/{deckId}`
  - `PUT /api/decks/{deckId}`
  - `DELETE /api/decks/{deckId}`
- Define contract DTO shape for deck management as:
  - Deck detail: `id`, `name`, `description`, `createdAtUtc`, `updatedAtUtc`, `createdByUserId`, `updatedByUserId`.
  - Deck list item: detail fields plus `flashcardCount` for list rendering without extra queries.
- Require ownership enforcement semantics:
  - List returns only decks owned by authenticated user.
  - Detail/update/delete return `403 forbidden` when requester is authenticated but does not own the target deck.
  - Detail/update/delete return `404 deck_not_found` when the deck id does not exist.
- Require validation contract semantics:
  - `page >= 1`, `1 <= pageSize <= 100`.
  - `name` required, trimmed, length 1..120.
  - `description` optional, max length 1000.
- Compatibility and versioning policy:
  - Additive-only response evolution for current v1 endpoint family under `/api`.
  - Any breaking response shape/semantic change requires ADR update and contract versioning action before implementation.
- Contract ownership policy:
  - Architecture owns schemas and compatibility rules.
  - Backend Developer owns endpoint/runtime fidelity and auth/ownership enforcement.
  - Frontend Developer owns route integration, query key usage, and cache invalidation behavior.

## Alternatives Considered
1. Backend-first implementation with contract documentation written after endpoint completion.
2. Single aggregated contract file for all deck endpoints.
3. Reusing flashcard DTO shape for decks to minimize new schema definitions.

## Consequences
- Positive impacts:
  - Backend and frontend tracks can proceed in parallel with strict payload and status-code expectations.
  - Deck route implementation can replace placeholder UI without backend guesswork.
  - Consistent error envelope and ownership semantics reduce integration regressions.
- Trade-offs and risks:
  - Upfront schema definition may require follow-up ADR if product requirements expand deck metadata.
  - `403` vs `404` ownership semantics can leak deck existence if not consistently applied; implementation must follow contracts exactly.
  - `flashcardCount` in list adds read responsibility that may require indexing/query optimization.
- Follow-up tasks:
  - Backend Developer implements Application use cases, validators, endpoint mappings, repository updates, and tests to satisfy contracts.
  - Frontend Developer implements decks list/create/detail/edit/delete route surfaces and query/mutation wiring from contract notes.
  - QA adds endpoint contract regression coverage for success and error paths.

## Parallel Delivery Notes
- Backend track deliverables:
  - Implement 5 deck endpoints with contract-accurate success/error payloads.
  - Enforce authorization and per-resource ownership checks.
  - Persist and return deck metadata and timestamps exactly as contracted.
- Frontend track deliverables:
  - Implement deck management route surfaces against contracted request/response schemas.
  - Follow query key, stale policy, and invalidation notes in each endpoint contract.
  - Preserve existing flashcard route behavior while adding deck CRUD UX.
- Shared contract milestones:
  - Contract files approved before coding starts.
  - Integration verification and HTTP contract tests before merge.

## Acceptance Criteria Coverage
- AC-1 Users can create/list/detail/update/delete only their own decks:
  - Covered by endpoint inventory plus ownership and auth semantics.
- AC-2 Validation and error behavior are contract-defined:
  - Covered by explicit request constraints, status codes, and error envelope schemas/examples.
- AC-3 Frontend can implement screens without guessing:
  - Covered by strict schemas, examples, query keys, cache policy, and route usage notes per endpoint.

## Implementation Outcome (2026-03-17)
- Backend implementation delivered all five `/api/decks` CRUD endpoints with contract-aligned status families and owner-bound authorization behavior.
- Application and Infrastructure layers include deck service/repository wiring and persistence migration support for contracted deck metadata fields.
- Frontend implementation delivered route surfaces for deck list/create/detail/edit and delete-confirm flow, with TanStack Query keys/invalidation/optimistic delete behavior aligned to contract notes.
- High-level evidence from prior handoffs:
  - Backend: targeted and suite-level test evidence provided in backend stage handoff.
  - Frontend: route/API hook test and E2E evidence provided in frontend stage handoff.
- Known remaining work:
  - Keep HTTP contract autotests expanding for deck error-path regressions (`400`, `401`, `403`, `404`, `409`, `503`).
  - Continue manual browser/accessibility QA hardening as part of QA stage.
