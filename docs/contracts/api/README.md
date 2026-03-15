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

- `aspire-dynamic-oidc-integration-no-api-response-changes-contract.yaml`
	- Epic scope: dynamic Aspire endpoint-safe frontend OIDC redirect alignment and callback-state safety.
	- Contract posture: no backend HTTP response schema changes are introduced; changes are limited to runtime config and frontend callback interaction semantics.
	- Compatibility rule: backend `/api/*` response payload contracts remain unchanged and authoritative.
	- Related ADR: `docs/adr/0010-dynamic-aspire-oidc-endpoint-alignment-and-callback-state-safety.md`.

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

## Homepage Auth Coverage (Revised Boundary)

The homepage/auth epic is now aligned to frontend-owned OIDC PKCE and backend JWT resource-server behavior:

- `auth-jwt-bearer-discovery-validation-boundary-contract.yaml`
	- API endpoint family: `ANY /api/*`
	- Purpose: define that backend validates bearer JWTs via authority discovery + audience checks and does not introduce backend OIDC flow endpoints in current scope.
	- Implemented behavior: protected API requests include bearer tokens from frontend local auth session storage; frontend clears local auth session when protected API calls return `401` or `403`.
- `auth-session-contract.yaml`
	- Contract status: superseded and out of scope in current delivery.
- `auth-oidc-login-start-contract.yaml`
	- Contract status: superseded and out of scope in current delivery.
- `auth-oidc-callback-contract.yaml`
	- Contract status: superseded and out of scope in current delivery.
- `auth-logout-contract.yaml`
	- Contract status: superseded and out of scope in current delivery.

Related ADRs:

- `docs/adr/0006-frontend-pkce-backend-jwt-bearer-boundary.md` (accepted)
- `docs/adr/0005-oidc-pkce-homepage-auth-session-contract-first.md` (superseded)

Operational reference:

- `docs/ways-of-work/runbook/auth-jwt-bearer-frontend-oidc-boundary.md`
	- Maintainer runbook for backend JWT authority/audience configuration and frontend homepage/auth client behavior under ADR 0006.

### Contract-First Alignment Notes

- Backend and frontend tracks continue parallel delivery using ADR-backed contract files as source of truth.
- Auth scope now explicitly forbids backend login/callback/logout/session endpoints unless a future ADR reintroduces them with new contracts.
- Homepage route exposes decks/flashcards navigation only when frontend-managed auth session is authenticated.
- TanStack Query and route behavior must follow the `frontend_contract_notes` policies defined in active contracts.

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

- See stage handoff payloads for authoritative test command outcomes.
- For ADR 0006 documentation updates, this directory records contract and behavior documentation only.

### Test Strategy and Prerequisites (Current)

- Integration and persistence-focused tests rely on PostgreSQL containers via `Testcontainers.PostgreSql`.
- Docker runtime is required to execute container-backed integration tests.
- EF migration tooling requires `dotnet-ef` and `Microsoft.EntityFrameworkCore.Design` dependencies in migration/startup projects.

### Known Follow-Ups and Risks

- HTTP autotests are still needed to harden endpoint-level contract regression detection.
- Add a contract-facing migration troubleshooting quick-reference with sample failure signatures after CI pipeline migration checks are standardized.
- Manual frontend visual QA browser matrix has not yet been completed.
