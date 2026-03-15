# ADR 0004: Aspire PostgreSQL EF Core Client Registration Boundary

- Status: Accepted
- Date: 2026-03-15
- Owners: Architecture
- Related Contracts:
  - docs/contracts/api/aspire-local-orchestration-no-api-response-changes-contract.yaml
  - docs/contracts/api/flashcards-create-contract.yaml
  - docs/contracts/api/flashcards-list-contract.yaml
  - docs/contracts/api/flashcards-get-detail-contract.yaml
  - docs/contracts/api/flashcards-update-contract.yaml
  - docs/contracts/api/flashcards-delete-contract.yaml

## Context
- Tenax currently wires PostgreSQL EF Core registration in Infrastructure through `AddInfrastructure(configuration)` with manual connection string resolution and `UseNpgsql` setup.
- App Host already defines PostgreSQL resource wiring (`postgres` + `Tenax` database) and references Tenax.Web.
- Aspire PostgreSQL EF Core client guidance favors host composition-root registration for DbContext where resource binding is resolved from application configuration produced by Aspire references.
- Tenax must keep Clean Architecture boundaries intact: Web -> Application -> Domain, with Infrastructure implementing persistence details.
- This migration is runtime wiring only and must not change endpoint behavior or response payloads.

## Decision
- Move DbContext provider registration responsibility to Tenax.Web composition root using Aspire PostgreSQL EF Core client integration pattern.
- Keep Infrastructure as owner of persistence implementation details, but not connection-source policy:
  - Keep `TenaxDbContext` type, EF mappings, repositories, migration assembly, and persistence exception handling in Infrastructure.
  - Remove manual connection-string lookup responsibility from Infrastructure DI registration.
- Update Infrastructure DI contract to avoid configuration coupling:
  - `AddInfrastructure()` should register repositories and persistence services only.
  - Web startup owns registration order and composes:
    1. Aspire-managed Npgsql DbContext registration for `TenaxDbContext` with logical connection name `Tenax`.
    2. Infrastructure service registration.
- Preserve migration workflow and startup migration application behavior:
  - Existing migration commands and migration assembly remain unchanged.
  - `ApplyMigrationsAsync(...)` remains executed by Web at startup.
- Preserve API response contracts and semantics; no endpoint request/response shape changes are allowed in this migration.

## Alternatives Considered
1. Keep current manual `UseNpgsql` registration in Infrastructure and only consume Aspire for container orchestration.
2. Introduce a dual registration mode (manual fallback plus Aspire-first) inside Infrastructure.
3. Move all persistence registration and repositories into Web.

## Consequences
- Positive impacts:
  - Aligns backend configuration pattern with Aspire PostgreSQL EF Core client guidance.
  - Reduces Infrastructure coupling to environment-specific connection-string key conventions.
  - Makes App Host resource wiring the single source of local connection truth.
- Trade-offs and risks:
  - Incorrect registration order in Web can produce duplicate or conflicting DbContext options.
  - Direct non-Aspire backend runs still require explicit connection configuration strategy.
  - Migration tooling must continue to resolve the same DbContext/assembly wiring after refactor.
- Follow-up tasks:
  - Backend implementation updates in Web and Infrastructure DI extension signatures.
  - Regression validation: build, tests, and App Host local startup smoke check.

## Parallel Delivery Notes
- Backend track deliverables:
  - Add Aspire PostgreSQL EF Core client package to Web.
  - Register `TenaxDbContext` via Aspire client integration in Web with logical connection name `Tenax`.
  - Refactor Infrastructure DI to remove manual connection-string/provider registration while preserving repository registrations and health checks.
  - Keep `ApplyMigrationsAsync(...)` behavior and migration assembly compatibility intact.
- Frontend track deliverables:
  - No endpoint contract or payload parser changes.
  - No query key, cache policy, or route contract updates.
  - Validate local app behavior only as smoke confirmation after backend migration.
- Shared contract milestones:
  - Continue treating existing flashcard contract files and orchestration no-change contract as source of truth.
  - Any detected HTTP response shape drift requires contract file update and ADR amendment before merge.
