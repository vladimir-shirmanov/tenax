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
- Local SPA login now also depends on a repeatable public frontend client that matches the AppHost-projected runtime auth defaults.
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
- Required development realm alignment:
  - The imported realm includes a public `tenax-spa` OpenID Connect client for SPA Authorization Code + PKCE login.
  - The client enables standard flow, disables implicit flow and service accounts, and carries an audience mapper for `tenax-web-api`.
  - Allowed redirect URIs and web origins include loopback-only wildcard port patterns for both `localhost` and `127.0.0.1` so Aspire-assigned dynamic local ports are accepted without manual realm edits.
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
  - Maintain the imported `tenax-spa` client and AppHost-projected frontend defaults together when local auth settings change.
  - Keep runbook troubleshooting notes aligned with realm import redirect URI and audience mapper changes.
  - Extend deterministic dev realm coverage if additional local clients or seeded users are introduced.

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
  - Verify the imported realm exposes the public `tenax-spa` client with `tenax-web-api` audience mapping and local redirect URIs for both `127.0.0.1` and `localhost`.
- QA targeted checks:
  - Execute `tests/http/auth-jwt-boundary.http` against AppHost-launched stack.
  - Verify `401/403` behavior unchanged from existing auth boundary contracts.
  - Verify protected API success path with JWT issued by imported `tenax` realm client.

## Implementation Evidence

- AppHost projects development frontend auth settings through `src/Tenax.AppHost/FrontendAuthEnvironment.cs` and `src/Tenax.AppHost/Program.cs`.
- The development realm import now includes the public `tenax-spa` client in `src/Tenax.AppHost/keycloak/import/tenax-realm-dev.json`.
- Regression coverage exists in `tests/Tenax.AppHost.Tests/FrontendAuthEnvironmentTests.cs` and `tests/Tenax.AppHost.Tests/DevelopmentRealmImportTests.cs`.
