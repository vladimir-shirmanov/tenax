# API Contracts Directory

This folder stores strict API response contracts used as implementation source of truth.

## Rules
- One contract file per endpoint or endpoint family.
- Use `.github/agents/templates/api-response-contract-template.md`.
- Backend and frontend implementations must follow these contracts.
- Any breaking response change requires ADR update and orchestrator approval.

## Aspire Local Orchestration Coverage (Contract-Only)

- `aspire-local-orchestration-no-api-response-changes-contract.yaml`
	- Epic scope: Aspire-based local orchestration for backend, frontend, and PostgreSQL.
	- Contract posture: no runtime HTTP response schema changes are introduced by this epic.
	- Compatibility rule: existing endpoint contracts remain authoritative unless superseded by ADR-backed contract updates.
	- Implemented outcome: orchestration wiring added in App Host/ServiceDefaults and frontend Vite configuration without changing flashcard response schemas.
	- Developer operations reference: `docs/ways-of-work/runbook/aspire-local-development-orchestration.md`.

## Flashcard Authoring Coverage (Implemented)

The flashcard authoring and management epic is implemented against these contract files:

- `flashcards-create-contract.yaml`
	- API endpoint: `POST /api/decks/{deckId}/flashcards`
	- Frontend route usage: `routes/decks.$deckId.flashcards.new.tsx`
- `flashcards-list-contract.yaml`
	- API endpoint: `GET /api/decks/{deckId}/flashcards`
	- Frontend route usage: `routes/decks.$deckId.flashcards.index.tsx`
- `flashcards-get-detail-contract.yaml`
	- API endpoint: `GET /api/decks/{deckId}/flashcards/{flashcardId}`
	- Frontend route usage: `routes/decks.$deckId.flashcards.$flashcardId.tsx`
- `flashcards-update-contract.yaml`
	- API endpoint: `PUT /api/decks/{deckId}/flashcards/{flashcardId}`
	- Frontend route usage: `routes/decks.$deckId.flashcards.$flashcardId.edit.tsx`
- `flashcards-delete-contract.yaml`
	- API endpoint: `DELETE /api/decks/{deckId}/flashcards/{flashcardId}`
	- Frontend route usage: `routes/decks.$deckId.flashcards.$flashcardId.tsx` (delete confirmation flow)

### Contract-First Alignment Notes

- Backend and frontend tracks were delivered in parallel using ADR 0001 and these contracts as the shared source of truth.
- TanStack Query cache behavior in frontend implementation follows the `frontend_contract_notes` policies in each contract file.

### Persistence Error Behavior Highlights (Implemented)

- `409 concurrency_conflict`
	- Used for mutation conflict scenarios where an update/delete collides with a concurrent operation.
	- Implemented in mutation contracts where conflict handling is required (`flashcards-update-contract.yaml`, `flashcards-delete-contract.yaml`).
	- Frontend contract notes require refetch/rollback flows before retry.
- `503 persistence_unavailable`
	- Used when PostgreSQL persistence is temporarily unavailable.
	- Present across CRUD contracts as a recoverable service-unavailable state.
	- Frontend contract notes require non-destructive retry guidance and avoidance of unsafe optimistic persistence assumptions.

### Test Evidence (High-Level)

- Backend handoff reports successful build and passing backend automated tests for flashcard CRUD.
- Frontend handoff reports successful build and passing frontend automated tests for flashcard list/create/detail/edit/delete flows.

### Test Strategy and Prerequisites (Current)

- Integration and persistence-focused tests rely on PostgreSQL containers via `Testcontainers.PostgreSql`.
- Docker runtime is required to execute container-backed integration tests.
- EF migration tooling requires `dotnet-ef` and `Microsoft.EntityFrameworkCore.Design` dependencies in migration/startup projects.

### Known Follow-Ups and Risks

- HTTP autotests are still needed to harden endpoint-level contract regression detection.
- Add a contract-facing migration troubleshooting quick-reference with sample failure signatures after CI pipeline migration checks are standardized.
- Manual frontend visual QA browser matrix has not yet been completed.
