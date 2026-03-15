# ADR 0007: Development-Only Keycloak Orchestration and Realm Import in Aspire AppHost

- Status: Accepted
- Date: 2026-03-15
- Owners: Architecture
- Related Contracts:
  - docs/contracts/api/aspire-keycloak-development-orchestration-no-api-response-changes-contract.yaml
  - docs/contracts/api/auth-jwt-bearer-discovery-validation-boundary-contract.yaml

## Context
- Tenax Web already validates bearer JWTs and defaults local authority to `http://localhost:8080/realms/tenax`.
- Current AppHost orchestrates PostgreSQL, Tenax.Web, and optional frontend Vite app, but does not provision an identity provider.
- Developer onboarding and deterministic auth testing require a local IdP with repeatable realm/client/role bootstrap data.
- Scope is orchestration and local infrastructure only. Domain/Application/Web feature behavior and API payload schemas are out of scope.
- Key requirement: Keycloak resource must run only in Development and must not affect non-development environments.

## Decision
- Add Keycloak as a Development-only Aspire AppHost resource using Aspire Keycloak hosting integration.
- Keep Keycloak provisioning in AppHost composition root only. No Keycloak-specific logic is added to Domain or Application.
- Use Keycloak startup import flow for realm bootstrap:
  - Mount a repository-owned import directory into the Keycloak container at `/opt/keycloak/data/import`.
  - Start Keycloak with import-enabled startup arguments using `start-dev --import-realm` semantics.
  - Store one or more realm export JSON files in source control for deterministic development bootstrap.
- Dev-only gating rule in AppHost:
  - Provision Keycloak only when `builder.Environment.IsDevelopment()` is true.
  - In non-development environments, AppHost must not create or start the Keycloak resource.
- AppHost to Tenax.Web configuration propagation:
  - When Keycloak is provisioned, AppHost injects runtime configuration for Tenax.Web auth settings via environment variables.
  - Required propagated values:
    - `Authentication__JwtBearer__Authority=http://<keycloak-resource-host>:<keycloak-port>/realms/tenax`
    - `Authentication__JwtBearer__Audience=tenax-web-api` (or realm-import client audience if renamed)
    - `Authentication__JwtBearer__RequireHttpsMetadata=false` for local HTTP development.
  - In non-development environments, existing Tenax.Web configuration sources remain authoritative.
- Standard local Keycloak admin bootstrap variables are allowed in AppHost environment wiring:
  - `KC_BOOTSTRAP_ADMIN_USERNAME`
  - `KC_BOOTSTRAP_ADMIN_PASSWORD`
  - Optional database/vendor tuning remains out of scope unless needed for startup reliability.
- File placement conventions for realm import data:
  - Primary location: `src/Tenax.AppHost/keycloak/import/`
  - Required base file: `src/Tenax.AppHost/keycloak/import/tenax-realm-dev.json`
  - Additional files may be added for split exports, but must remain deterministic and development-safe.
- Explicit boundary rule:
  - AppHost owns container orchestration, import mounting, and development-time env projection.
  - Tenax.Web continues to consume generic JWT bearer configuration keys only; no direct dependency on Keycloak SDKs is introduced.

## Alternatives Considered
1. Manual standalone Keycloak startup outside Aspire with README-only instructions.
2. Always-on Keycloak resource for all environments.
3. Runtime realm creation through ad hoc admin API scripts instead of import-at-startup.

## Consequences
- Positive impacts:
  - Deterministic local auth environment aligned with JWT authority/audience expectations.
  - Faster onboarding and fewer environment-drift issues for backend and QA.
  - Keeps clean architecture boundaries intact by isolating IdP orchestration in AppHost.
- Trade-offs and risks:
  - Realm JSON can drift from intended contracts if edited manually without review discipline.
  - Import-on-startup can fail if malformed JSON is committed, blocking local auth flows.
  - Secrets for local admin bootstrap must remain development-only and not reused outside local stacks.
- Follow-up tasks:
  - Backend Developer implements AppHost Keycloak resource wiring, mount/import flags, and Tenax.Web env propagation.
  - QA adds/updates auth boundary smoke tests to execute against AppHost-provisioned Keycloak.
  - Docs/runbook update for local startup and realm import troubleshooting.

## Out Of Scope
- Production Keycloak deployment topology and secrets management.
- Frontend OIDC UX changes.
- API endpoint request/response schema changes.

## Parallel Delivery Notes
- Backend track deliverables:
  - Add Aspire Keycloak hosting package to AppHost and wire a Development-only Keycloak resource.
  - Mount `src/Tenax.AppHost/keycloak/import/` to `/opt/keycloak/data/import` and enable `start-dev --import-realm` startup behavior.
  - Inject Keycloak-derived `Authentication__JwtBearer__*` environment settings into Tenax.Web only in Development.
  - Keep existing PostgreSQL/web/frontend orchestration behavior unchanged except dependency ordering needed for auth readiness.
- Frontend track deliverables:
  - No contract or route schema changes required.
  - Continue frontend-owned OIDC/JWT behavior against authority values provided by backend configuration/runtime.
- Shared contract milestones:
  - Treat `docs/contracts/api/aspire-keycloak-development-orchestration-no-api-response-changes-contract.yaml` as the scope contract for API invariance.
  - Any HTTP response payload drift requires endpoint-specific contract updates and ADR amendment before merge.

## Verification Plan (for Implementation Phase)
- Backend Developer targeted checks:
  - `dotnet build Tenax.slnx`
  - `dotnet run --project src/Tenax.AppHost/Tenax.AppHost.csproj` with Development environment and verify Keycloak resource is present.
  - Confirm Tenax.Web effective auth config points to AppHost-provisioned Keycloak authority.
  - Restart AppHost and verify realm import remains deterministic (expected clients/realm available).
- QA targeted checks:
  - Execute `tests/http/auth-jwt-boundary.http` against AppHost-launched stack.
  - Verify `401/403` behavior unchanged from existing auth boundary contracts.
  - Verify protected API success path with JWT issued by imported `tenax` realm client.
