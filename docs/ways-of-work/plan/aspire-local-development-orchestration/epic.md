# 1. Epic Name

Aspire-Based Local Development Orchestration (Web API, React App, EF Core, PostgreSQL)

# 2. Goal

## Problem
Developers currently need to manually coordinate multiple local components to run Tenax end to end, including the ASP.NET Core web host, frontend application, database container, and configuration values between services. This setup is error-prone, slow to onboard, and inconsistent across machines, which reduces engineering velocity and increases environment-related defects. Database startup timing, connection string mismatches, and independent process management can cause frequent local failures. Without a unified local app host, the team lacks a reliable way to run, observe, and troubleshoot the full stack during development.

## Solution
Introduce a .NET Aspire App Host that orchestrates local dependencies and application projects as a single developer entry point. The host will run Tenax.Web and the React frontend together, provision PostgreSQL through a Docker image, and provide shared configuration so EF Core in the backend uses the Aspire-managed database connection. This epic will establish a repeatable local development workflow with clear startup order, health visibility, and minimal manual setup.

## Impact
Expected outcomes include faster onboarding for new developers, reduced local environment failures, and improved delivery throughput for features that span frontend and backend. It should decrease time-to-first-successful-run, reduce configuration drift across team members, and improve confidence in local integration testing before CI execution.

# 3. User Personas

- Backend Developer: Needs reliable local API and database orchestration to build and debug EF Core-backed endpoints.
- Frontend Developer: Needs React app and API running together with predictable local URLs and minimal setup overhead.
- Full-Stack Developer: Needs one command/workflow to run the complete application stack and validate cross-layer behavior quickly.
- QA Engineer (Local Verification): Needs deterministic local environment startup to reproduce defects consistently.
- DevOps/Platform Contributor: Needs standardized local topology that mirrors key runtime dependencies and is easy to maintain.

# 4. High-Level User Journeys

- First-Time Setup Journey:
  Developer clones repository, restores dependencies, starts the Aspire App Host, and reaches a healthy state where backend, frontend, and PostgreSQL are available without manual container wiring.
- Daily Development Journey:
  Developer starts one local host process, edits backend or frontend code, and validates changes while services remain connected through Aspire-managed configuration.
- Database-Backed Feature Journey:
  Developer applies EF Core migrations against local PostgreSQL and verifies API behavior using real persistence in Docker-backed infrastructure.
- Troubleshooting Journey:
  Developer uses Aspire dashboard/resource status to identify failing services (for example DB not healthy) and resolves issues quickly using centralized logs and health signals.
- Team Consistency Journey:
  Multiple team members follow the same orchestration workflow and get consistent local URLs, dependency startup behavior, and environment variables.

# 5. Business Requirements

## Functional Requirements

- The solution must include an Aspire App Host project dedicated to local orchestration.
- The App Host must run the Tenax backend web application as a managed resource.
- The App Host must run the React frontend app as a managed resource for local development.
- The App Host must provision PostgreSQL via Docker image for local execution.
- The App Host must pass database configuration/connection details to the backend in a way compatible with EF Core.
- The backend must be able to start and connect to the Aspire-managed PostgreSQL resource without manual connection string edits.
- The local development workflow must support bringing up the full stack through a single host startup action.
- The App Host must define explicit dependency ordering so backend waits for PostgreSQL readiness before serving DB-dependent operations.
- The local stack must support EF Core migration execution workflow for schema creation and updates.
- Local configuration defaults (ports, service names, connection identifiers) must be documented and consistent.
- The epic must include developer documentation for setup, run commands, common failure modes, and troubleshooting.
- The solution must preserve existing Clean Architecture boundaries in Tenax (Web/Application/Domain/Infrastructure).

## Non-Functional Requirements

- Developer Experience:
  - Time to launch full local stack from clean checkout should be minimized and repeatable.
  - Setup instructions should target minimal prerequisite steps beyond .NET SDK, Node tooling, and Docker.
- Reliability:
  - Local orchestration should recover predictably from transient startup issues (for example delayed DB container startup).
  - Service dependency state should be visible to developers.
- Performance:
  - Cold startup should be acceptable for daily iteration and not require excessive manual retries.
  - Database connection establishment should not block indefinitely when dependency is unavailable.
- Security:
  - Local secrets and credentials must not be committed to source control.
  - Default local credentials should be scoped to development use only.
- Maintainability:
  - Host wiring should be modular and easy to extend for future local dependencies (for example cache, message broker).
  - Configuration should avoid hard-coded machine-specific paths.
- Observability:
  - Developers should have access to centralized local resource status/log visibility through Aspire tooling.

# 6. Success Metrics

- Onboarding KPI: Median time for a new engineer to run backend + frontend + database locally is reduced by at least 40%.
- Reliability KPI: Local environment startup success rate on first attempt is at least 90% across active developers.
- Productivity KPI: Reduction in local environment-related blockers/tickets reported per sprint.
- Consistency KPI: At least 90% of engineering contributors adopt Aspire host workflow as primary local run path.
- Quality KPI: Decrease in integration defects caused by local configuration mismatch between frontend, backend, and database.

# 7. Out of Scope

- Production deployment orchestration, Kubernetes manifests, or cloud runtime topology changes.
- CI/CD pipeline redesign beyond minor updates required to keep existing checks passing.
- Multi-database support beyond PostgreSQL for this epic.
- Introduction of distributed microservices architecture; Tenax remains a monolith with Clean Architecture boundaries.
- Feature-level domain changes unrelated to local orchestration (for example spaced repetition logic updates).
- Advanced local observability platform replacement beyond standard Aspire-provided local dashboard capabilities.

# 8. Business Value

High.

This epic materially improves engineering throughput and delivery predictability by reducing local setup friction and integration instability. A unified Aspire-based local stack shortens feedback loops for both frontend and backend development, decreases onboarding cost, and lowers defect risk caused by inconsistent developer environments. It provides foundational platform leverage for all upcoming Tenax feature epics that require coordinated full-stack development.

# 9. Implementation Status and Runbook

- Status: Implemented (backend + frontend orchestration wiring delivered).
- Single local startup entry point: `src/Tenax.AppHost`.
- Contract posture: no existing flashcard API response schema changes introduced by this epic.
- Operational health routes implemented: `/health`, `/health/ready`.
- Developer runbook: `docs/ways-of-work/runbook/aspire-local-development-orchestration.md`.