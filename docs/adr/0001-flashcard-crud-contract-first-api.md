# ADR 0001: Flashcard CRUD Contract-First API and Ownership Boundaries

- Status: Proposed
- Date: 2026-03-15
- Owners: Architecture
- Related Contracts:
  - docs/contracts/api/flashcards-create-contract.yaml
  - docs/contracts/api/flashcards-list-contract.yaml
  - docs/contracts/api/flashcards-get-detail-contract.yaml
  - docs/contracts/api/flashcards-update-contract.yaml
  - docs/contracts/api/flashcards-delete-contract.yaml

## Context
- Tenax needs flashcard authoring and management to unblock the core study workflow.
- Delivery must support parallel backend and frontend implementation with minimal integration drift.
- Clean architecture boundaries are mandatory: Web -> Application -> Domain; Infrastructure provides implementations of abstractions.
- Flashcards belong to decks and operations must enforce authenticated and authorized access.
- Optional image data must be represented as an image URL/media reference, without leaking storage internals.
- Error responses must be consistent and actionable across validation, authentication, authorization, and missing-resource cases.
- Out of scope for this feature: spaced repetition, bulk import/export, AI generation, audio, rich text, and billing.

## Decision
- Adopt a strict contract-first endpoint family for flashcard CRUD under deck ownership:
  - POST /api/decks/{deckId}/flashcards
  - GET /api/decks/{deckId}/flashcards
  - GET /api/decks/{deckId}/flashcards/{flashcardId}
  - PUT /api/decks/{deckId}/flashcards/{flashcardId}
  - DELETE /api/decks/{deckId}/flashcards/{flashcardId}
- Use a consistent response envelope for errors with machine-readable code and actionable details for validation.
- Capture auditable metadata in success responses where relevant: createdAtUtc, updatedAtUtc, createdByUserId, updatedByUserId.
- Enforce AuthN and AuthZ on all endpoints; ownership/permission checks are required at deck and flashcard level.
- Versioning assumptions:
  - Current contract set is API v1 behavior exposed under /api without explicit version path.
  - Additive response changes are allowed without a version bump.
  - Breaking response or semantic changes require a new ADR and explicit v2 strategy (for example /api/v2/...).
- Contract ownership:
  - Architecture owns schema and compatibility rules.
  - Backend Developer owns endpoint implementation fidelity.
  - Frontend Developer owns route/query integration fidelity and cache invalidation behavior.

## Alternatives Considered
1. A single aggregated contract file for all flashcard endpoints.
2. Backend-first implementation with frontend adaptation after implementation completion.
3. Non-nested routes such as /api/flashcards/{flashcardId} without deck-scoped endpoints.

## Consequences
- Positive impacts:
  - Parallel implementation is possible with clear status codes, payloads, and cache expectations.
  - Deck-scoped endpoints make authorization checks explicit and easier to reason about.
  - Consistent error contracts reduce UI ambiguity and validation handling complexity.
- Trade-offs and risks:
  - More upfront architecture documentation work.
  - Route nesting can duplicate deck existence checks across endpoints.
  - Implicit v1 versioning under /api requires disciplined change control to avoid accidental breaks.
- Follow-up tasks:
  - Implement minimal API route group contracts in Web layer.
  - Implement Application validators and use-case handlers matching request constraints.
  - Add integration tests for success and failure paths (401, 403, 404, 400).

## Parallel Delivery Notes
- Backend track deliverables:
  - Implement five endpoints with contract-accurate success and error payloads.
  - Enforce authentication and per-deck/per-card authorization checks.
  - Persist auditable metadata and return it according to contracts.
- Frontend track deliverables:
  - Build deck-level flashcard list/detail/create/edit/delete flows using contract schemas.
  - Implement TanStack Query keys and invalidation rules exactly as specified in frontend_contract_notes.
  - Support delete confirmation flow using contract-defined delete success payload.
- Shared contract milestones:
  - Contract approval before coding starts.
  - Integration verification against contract examples before merge.
