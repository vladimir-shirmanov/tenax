# ADR 0002: PostgreSQL EF Core Persistence Migration and Solution Hygiene Boundaries

- Status: Accepted
- Date: 2026-03-15
- Owners: Architecture
- Related Contracts:
  - docs/contracts/api/flashcards-create-contract.yaml
  - docs/contracts/api/flashcards-list-contract.yaml
  - docs/contracts/api/flashcards-get-detail-contract.yaml
  - docs/contracts/api/flashcards-update-contract.yaml
  - docs/contracts/api/flashcards-delete-contract.yaml

## Context
- Current backend behavior uses in-memory persistence, which loses data across restarts and masks relational behaviors that will exist in durable environments.
- Existing flashcard authoring/management flows require durable storage to avoid behavioral drift between local/testing and production-like environments.
- Tenax must preserve Clean Architecture boundaries: Web -> Application -> Domain; Infrastructure provides persistence implementations.
- Domain and Application abstractions must not depend on EF Core implementation types.
- The solution currently includes template placeholder noise that weakens maintainability and architecture clarity.

## Decision
- Adopt PostgreSQL as the only persistence target for this epic and implement persistence in Infrastructure using EF Core.
- Keep architecture boundaries strict:
  - Web: endpoint mapping, DI composition, auth/authz integration, and transport contracts.
  - Application: use cases, validation, and persistence abstractions (interfaces only).
  - Domain: entities/value objects/rules only, with no EF Core or provider types.
  - Infrastructure: DbContext, entity mappings, migrations, repository implementations, and provider wiring.
- Define migration workflow conventions as a required guardrail:
  - Add migration from workspace root:
    - `dotnet ef migrations add <Name> --project src/Tenax.Infrastructure --startup-project src/Tenax.Web --output-dir Persistence/Migrations`
  - Apply migrations:
    - `dotnet ef database update --project src/Tenax.Infrastructure --startup-project src/Tenax.Web`
  - List migrations:
    - `dotnet ef migrations list --project src/Tenax.Infrastructure --startup-project src/Tenax.Web`
- Require startup behavior to fail fast with clear diagnostics when PostgreSQL connectivity or schema compatibility fails.
- Align API contracts to PostgreSQL-backed behavior before implementation, including durability expectations and persistence-failure error semantics.
- Apply solution hygiene policy as part of implementation scope:
  - Remove generated placeholder files when they are not required by feature architecture.
  - Keep solution/project references synchronized and layer-aligned after cleanup.

## Implementation Snapshot (2026-03-15)
- Baseline migration artifacts are committed under `src/Tenax.Infrastructure/Persistence/Migrations`:
  - `20260315170635_BaselinePostgres.cs`
  - `20260315170635_BaselinePostgres.Designer.cs`
  - `TenaxDbContextModelSnapshot.cs`
- `Tenax.Web` applies pending EF Core migrations during startup before endpoint handling.
- EF Core design-time support is present via `Microsoft.EntityFrameworkCore.Design` package references in both `Tenax.Infrastructure` and `Tenax.Web`.
- Integration tests for persistence-backed behavior run against PostgreSQL containers via `Testcontainers.PostgreSql` and therefore require a Docker runtime.
- Solution hygiene cleanup for this epic is completed for production projects by removing template placeholder source artifacts and preserving layer-aligned project wiring.

## Alternatives Considered
1. Continue with in-memory persistence and defer relational persistence to a later epic.
2. Use SQLite as an interim relational provider for local and test workflows.
3. Introduce a hybrid multi-provider runtime switch (in-memory + PostgreSQL).

## Consequences
- Positive impacts:
  - Durable flashcard data across restarts.
  - Earlier detection of relational constraints and migration defects.
  - Repeatable schema evolution using `dotnet ef`.
  - Cleaner solution structure with reduced scaffolding noise.
- Trade-offs and risks:
  - Local setup complexity increases (PostgreSQL dependency required).
  - Migration ordering and merge conflicts may increase in active parallel work.
  - Persistence outages now become observable API failure modes that clients must handle.
- Follow-up tasks:
  - Keep future migrations additive and ordered to reduce merge conflicts.
  - Maintain PostgreSQL container availability in CI/local test workflows.
  - Continue replacing placeholder test templates (`UnitTest1`) with feature-focused test suites.

## Parallel Delivery Notes
- Backend track deliverables:
  - Infrastructure persistence implementation using PostgreSQL + EF Core.
  - DI and configuration wiring in startup.
  - Migration generation/apply workflow and troubleshooting guidance in developer docs.
  - Test-first workflow: add/adjust failing scoped tests before implementation.
- Frontend track deliverables:
  - No route or payload shape redesign required.
  - Treat persistence outage (`503 persistence_unavailable`) and conflict (`409 concurrency_conflict`) as first-class states in data layer handling.
  - Keep existing TanStack Query keys and invalidation behavior aligned to unchanged endpoint contracts.
- Shared contract milestones:
  - Backend and frontend must align to updated contract error semantics before implementation begins.
  - Contract compatibility remains additive-only unless a new ADR approves breaking changes.

## Migration Failure Diagnostics Expectations
- Connection/authentication failures:
  - Expected signals: startup exception or migration CLI failure with provider connection error.
  - Required diagnostics: include host/database/user and failure category in logs, excluding secrets.
- Missing or unapplied migrations:
  - Expected signals: runtime schema mismatch errors or pending migrations in CLI output.
  - Required diagnostics: log pending migration names and recommended remediation command.
- Migration execution failures:
  - Expected signals: SQL/provider exception during `database update`.
  - Required diagnostics: include migration name, failed operation summary, and transaction rollback result.
- Misconfiguration failures:
  - Expected signals: missing connection string or invalid provider options at startup.
  - Required diagnostics: explicit configuration key names and environment source hints.
