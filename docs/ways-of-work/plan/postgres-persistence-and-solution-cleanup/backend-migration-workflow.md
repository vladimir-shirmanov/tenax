# Backend Migration Workflow (PostgreSQL + EF Core)

## Prerequisites
- .NET SDK 10 installed.
- Local PostgreSQL instance reachable from the backend runtime.
- Connection string configured via `ConnectionStrings:Tenax` (appsettings, user-secrets, or environment variable).
- `dotnet-ef` available (`dotnet tool install --global dotnet-ef` if missing).
- EF design-time package available in persistence/startup projects (`Microsoft.EntityFrameworkCore.Design` in `src/Tenax.Infrastructure/Tenax.Infrastructure.csproj` and `src/Tenax.Web/Tenax.Web.csproj`).
- Docker runtime required for integration tests that use `Testcontainers.PostgreSql` (`tests/Tenax.Web.Tests` and `tests/Tenax.Infrastructure.Tests`).

## Required Connection String Key
- Configuration key: `ConnectionStrings:Tenax`
- No secrets are hardcoded in source.
- Recommended local pattern:
  - Host/port/database/user in `appsettings.Development.json`
  - Password via environment variable or user-secrets

## Commands
Run from repository root:

```bash
dotnet ef migrations add <Name> --project src/Tenax.Infrastructure --startup-project src/Tenax.Web --output-dir Persistence/Migrations
```

```bash
dotnet ef database update --project src/Tenax.Infrastructure --startup-project src/Tenax.Web
```

```bash
dotnet ef migrations list --project src/Tenax.Infrastructure --startup-project src/Tenax.Web
```

## Baseline Migration Artifacts
- Migration directory: `src/Tenax.Infrastructure/Persistence/Migrations`
- Baseline files:
  - `20260315170635_BaselinePostgres.cs`
  - `20260315170635_BaselinePostgres.Designer.cs`
  - `TenaxDbContextModelSnapshot.cs`

## Startup Behavior
- `Tenax.Web` applies pending migrations at startup.
- If configuration is missing or PostgreSQL is unreachable, startup fails fast.
- Logs include host/database/user and failure category without printing secrets.

## Troubleshooting
- Missing connection string:
  - Symptom: startup throws an invalid operation error for `ConnectionStrings:Tenax`.
  - Fix: add the key in environment/user-secrets/appsettings.
- Connection/authentication failures:
  - Symptom: startup migration failure with PostgreSQL provider exception.
  - Fix: verify host, port, database, username, password, network reachability.
- Pending migrations not applied:
  - Symptom: runtime schema mismatch.
  - Fix: run `dotnet ef migrations list` and `dotnet ef database update`.
- Migration command cannot run:
  - Symptom: `dotnet ef` command missing.
  - Fix: install the EF CLI tool and retry.
- EF design-time dependency missing:
  - Symptom: design-time `DbContext` creation or migration command fails with design package/tooling errors.
  - Fix: ensure `Microsoft.EntityFrameworkCore.Design` is referenced in startup and migration projects, then restore packages.
- Docker unavailable for integration tests:
  - Symptom: testcontainer startup errors/timeouts (daemon not reachable).
  - Fix: start Docker Desktop/Engine and verify container runtime access before running integration tests.
- Migration assembly mismatch:
  - Symptom: startup/test runtime cannot find migrations.
  - Fix: keep migrations in `src/Tenax.Infrastructure/Persistence/Migrations` and verify Npgsql options set migration assembly to `Tenax.Infrastructure`.
