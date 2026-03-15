# Aspire Local Development Orchestration Runbook

## Purpose

This runbook documents the implemented local orchestration workflow for the Aspire epic.
Use it as the default developer path for running Tenax backend, frontend, and PostgreSQL together.

## Scope and Contract Posture

- Scope: local runtime composition only (App Host + Web + frontend + PostgreSQL).
- API contract posture: no existing `/api/*` response schema changes are introduced by this orchestration work.
- Source of truth for this posture: `docs/contracts/api/aspire-local-orchestration-no-api-response-changes-contract.yaml`.
- Note: operational health routes `/health` and `/health/ready` are infrastructure endpoints and do not modify flashcard API response contracts.

## Prerequisites

1. .NET SDK 10.x.
2. Node.js 20+ with npm (for `src/Tenax.Web/frontend`).
3. Docker Desktop/Engine running Linux containers (required by local PostgreSQL resource).
4. Optional but recommended for local tooling parity: `dotnet workload install aspire`.

## Setup and Startup Workflow

### One-time local setup

From repository root:

```powershell
dotnet restore Tenax.slnx
npm install --prefix src/Tenax.Web/frontend
```

### Daily startup (single command)

From repository root:

```powershell
dotnet run --project src/Tenax.AppHost/Tenax.AppHost.csproj
```

What the App Host orchestrates:

- PostgreSQL resource: `postgres`.
- PostgreSQL database resource: logical name `Tenax`, database `tenax`.
- Backend project resource: `tenax-web` (waits for `Tenax` database readiness).
- Frontend resource: `tenax-frontend` running `npm run dev` from `src/Tenax.Web/frontend` (waits for backend readiness).

The App Host also self-seeds local Aspire dashboard environment defaults when they are not already present, so a plain `dotnet run --project src/Tenax.AppHost/Tenax.AppHost.csproj` does not require manual setup of `ASPNETCORE_URLS`, `ASPIRE_ALLOW_UNSECURED_TRANSPORT`, or `ASPIRE_DASHBOARD_OTLP_*` variables.

## Implemented Defaults

### Backend and Health

- Default local backend URL used by project launch profile: `http://localhost:5062`.
- Default local Aspire dashboard URLs used by App Host when no environment overrides are present:
  - `ASPNETCORE_URLS=http://127.0.0.1:18888`
  - `ASPIRE_ALLOW_UNSECURED_TRANSPORT=true`
  - `ASPIRE_DASHBOARD_OTLP_HTTP_ENDPOINT_URL=http://127.0.0.1:18889`
- Health endpoints exposed by service defaults:
  - `GET /health`
  - `GET /health/ready`

### Frontend Dev Server and API Proxy

Defined in `src/Tenax.Web/frontend/vite.config.ts`:

- `TENAX_FRONTEND_HOST` (default: `127.0.0.1`)
- `TENAX_FRONTEND_PORT` (default: `5173`, strict port enabled)
- `TENAX_API_PROXY_TARGET` (default: `http://localhost:5062`)

### Database Connection Binding

Backend connection resolution (`Tenax.Infrastructure.Persistence.PersistenceStartupExtensions`):

- primary key: `ConnectionStrings:Tenax`
- fallback key: `ConnectionStrings__Tenax`

When running through App Host, the database reference wiring provides the backend connection configuration.

## EF Core Migration Workflow

### Day-to-day

- On backend startup, pending migrations are applied automatically by `ApplyMigrationsAsync(...)` in `Tenax.Web` startup.
- This is the normal path when running via App Host.

### Creating a new migration

From repository root:

```powershell
dotnet ef migrations add <MigrationName> --project src/Tenax.Infrastructure/Tenax.Infrastructure.csproj --startup-project src/Tenax.Web/Tenax.Web.csproj --output-dir Persistence/Migrations
```

### Applying migrations manually

```powershell
dotnet ef database update --project src/Tenax.Infrastructure/Tenax.Infrastructure.csproj --startup-project src/Tenax.Web/Tenax.Web.csproj
```

## Troubleshooting

### Docker/PostgreSQL not available

Symptoms:

- App Host shows PostgreSQL resource unhealthy/not started.
- Backend startup logs contain critical persistence connectivity or migration failures.

Actions:

1. Start Docker Desktop/Engine and ensure Linux containers are enabled.
2. Restart App Host.
3. Re-check backend and DB resource state in Aspire dashboard.

### Frontend dev server fails to bind

Symptoms:

- Vite exits on startup with port binding errors.

Reason:

- `strictPort: true` is enabled; the configured/default port must be available.

Actions:

1. Free the occupied port.
2. Or set `TENAX_FRONTEND_PORT` to an unused port and restart App Host.

### API calls fail from frontend

Symptoms:

- Frontend requests to `/api/*` fail locally.

Actions:

1. Confirm backend is healthy and reachable.
2. Confirm `TENAX_API_PROXY_TARGET` points to the actual backend URL.
3. If running backend outside App Host, keep frontend proxy target aligned with that backend URL.

### Missing connection string when running backend directly

Symptoms:

- `InvalidOperationException` indicating required connection string is missing.

Actions:

1. Run via App Host (preferred) so connection details are wired automatically.
2. Or set one of the supported keys for direct backend execution:
   - `ConnectionStrings:Tenax`
   - `ConnectionStrings__Tenax`

## Validation Notes

- Local orchestration implementation includes App Host + ServiceDefaults projects and frontend Vite env knobs.
- Health endpoints are mapped in backend startup through `MapTenaxDefaultEndpoints()`.
- Contract alignment is maintained: flashcard API response contracts remain unchanged for this epic.