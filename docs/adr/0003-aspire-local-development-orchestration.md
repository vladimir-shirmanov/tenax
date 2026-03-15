# ADR 0003: Aspire Local Development Orchestration for Tenax Monolith

- Status: Accepted
- Date: 2026-03-15
- Owners: Architecture
- Related Contracts:
  - docs/contracts/api/aspire-local-orchestration-no-api-response-changes-contract.yaml

## Context
- Tenax developers currently coordinate backend, frontend, and PostgreSQL manually, causing onboarding friction and inconsistent local behavior.
- The epic requires a single local startup workflow that orchestrates Tenax.Web, React frontend, and PostgreSQL with dependency readiness.
- Tenax must remain a monolith with clean boundaries: Web -> Application -> Domain, with Infrastructure depending inward for persistence implementations.
- Existing HTTP response contracts for flashcard APIs are already versioned and consumed by frontend flows; the orchestration epic targets runtime composition, not endpoint payload redesign.

## Decision
- Introduce a dedicated .NET Aspire App Host project as the local orchestration entry point for:
  - Tenax.Web (backend API host)
  - React frontend development host
  - PostgreSQL container resource
- Use Aspire resource references for database configuration propagation to Tenax.Web so local DB connectivity does not require manual connection string edits per developer machine.
- Enforce service dependency ordering in orchestration so backend startup is gated by PostgreSQL readiness before DB-dependent operations are considered available.
- Preserve monolith architecture boundaries:
  - No domain or application logic moves into App Host.
  - App Host owns only local orchestration and environment composition.
  - Infrastructure remains the only layer implementing EF Core and repository persistence details.
- Keep current API response contracts unchanged for this epic; contract compatibility remains additive-only unless superseded by a new ADR.
- Require developer documentation to define prerequisites, startup command(s), default local endpoints/resource names, and troubleshooting flow.

## Alternatives Considered
1. Continue with independent startup scripts and manual environment variables.
2. Use docker-compose as the primary orchestrator instead of Aspire.
3. Introduce a split-service architecture for backend/frontend orchestration.

## Consequences
- Positive impacts:
  - Single startup workflow for full local stack improves onboarding and daily iteration speed.
  - Startup readiness ordering reduces transient backend failures caused by delayed PostgreSQL availability.
  - Centralized local resource visibility through Aspire improves troubleshooting.
- Trade-offs and risks:
  - Additional project and orchestration metadata increase solution complexity.
  - Local workflow now depends on Docker runtime availability and compatible Aspire tooling.
  - Misconfigured resource names/references can break backend DB binding.
- Follow-up tasks:
  - Add App Host and wiring implementation in dedicated feature branch.
  - Add developer runbook updates and troubleshooting matrix in docs.
  - Add targeted integration checks to validate orchestration-level startup expectations.

## Parallel Delivery Notes
- Backend track deliverables:
  - Add App Host project and resource graph for backend + frontend + PostgreSQL.
  - Bind Tenax.Web EF Core connectivity through Aspire-managed configuration.
  - Ensure readiness/dependency ordering is explicit and deterministic.
- Frontend track deliverables:
  - Align local dev startup with App Host-managed frontend resource.
  - Preserve existing API response parsing logic; no payload contract migration is required in this epic.
  - Validate local API base URL and CORS/proxy assumptions under Aspire-run workflow.
- Shared contract milestones:
  - Treat docs/contracts/api/aspire-local-orchestration-no-api-response-changes-contract.yaml as source of truth for this epic's API compatibility posture.
  - Any future response-shape modification discovered during implementation requires a new endpoint contract update and ADR amendment before merge.