# ADR 0009: Frontend Runtime Auth Config Bootstrap for AppHost and Hosted SPA Delivery

- Status: Accepted
- Date: 2026-03-15
- Owners: Architecture
- Related Contracts:
  - docs/contracts/api/frontend-runtime-auth-config-bootstrap-contract.yaml
  - docs/contracts/api/frontend-oidc-client-ts-auth-session-interaction-contract.yaml
  - docs/contracts/api/auth-jwt-bearer-discovery-validation-boundary-contract.yaml

## Context
- The SPA OIDC flow is frontend-owned per ADR 0006 and implemented with `oidc-client-ts` per ADR 0008.
- The current frontend auth client reads `window.TENAX_AUTH_CONFIG`, but the browser bootstrap never populates that object.
- `Tenax.Web` remains API-only in this scope and must not add `/api/auth/*` transport endpoints for login, callback, logout, or runtime config lookup.
- In local development, Aspire AppHost launches the Vite dev server with `AddViteApp`, but it does not currently project frontend auth settings into the frontend process.
- The bug presents as `Missing OIDC authority, client id, or redirect URI.` because the frontend has no valid runtime auth configuration when login starts.
- The fix must stay small, preserve current backend JWT bearer validation behavior, and remain compatible with future hosted frontend builds.

## Decision
- Standardize the SPA auth bootstrap contract on `window.TENAX_AUTH_CONFIG` as the only browser-visible Tenax auth config object consumed by `auth.ts`.
- Define two delivery mechanisms behind that single browser contract:
  - Local/AppHost + Vite dev delivery: AppHost projects `VITE_TENAX_AUTH_*` environment variables into the Vite process, and frontend bootstrap code maps those values into `window.TENAX_AUTH_CONFIG` before React mounts.
  - Future hosted frontend delivery: the host may populate `window.TENAX_AUTH_CONFIG` directly before app bootstrap, using the same field names and validation rules.
- Frontend bootstrap precedence rule:
  - If `window.TENAX_AUTH_CONFIG` is already present and valid, preserve it as authoritative.
  - Otherwise, initialize it from `import.meta.env.VITE_TENAX_AUTH_*`.
- Required runtime-safe fields for an enabled login flow:
  - `authority`
  - `clientId`
  - `redirectUri`
- Optional fields carried through when present:
  - `postLogoutRedirectUri`
  - `audience`
  - `defaultDeckId`
  - `scope`
- Validation and normalization rules:
  - Required fields must be non-empty strings after trimming.
  - `authority` is normalized by trimming a trailing slash.
  - `postLogoutRedirectUri` defaults to `redirectUri` when omitted.
  - `defaultDeckId` defaults to `default` when omitted.
  - Blank optional values are treated as absent.
  - If required fields are missing after bootstrap, the frontend remains unable to start login and existing `oidc_configuration_invalid` behavior remains the observable failure contract.
- Boundary rules:
  - No backend runtime config endpoint is introduced.
  - `Tenax.Web` backend API surface and JWT bearer resource-server behavior remain unchanged.
  - AppHost owns local frontend env projection only; frontend owns browser bootstrap and validation.

## Alternatives Considered
1. Add a backend `/api/auth/config` or `/api/auth/session` endpoint to serve SPA auth settings.
2. Inject raw config directly into `index.html` only, without a stable browser contract or Vite env mapping.
3. Read `import.meta.env` directly inside `auth.ts` and remove `window.TENAX_AUTH_CONFIG`.

## Consequences
- Positive impacts:
  - Fixes the current login failure without widening backend auth scope.
  - Keeps ADR 0006 and ADR 0008 intact by preserving frontend-owned OIDC flow and backend JWT validation-only responsibility.
  - Creates one stable browser contract that works for both AppHost/Vite dev and future hosted SPA delivery models.
- Implemented local-development alignment:
  - AppHost now projects the contract-defined `VITE_TENAX_AUTH_*` values in Development through `src/Tenax.AppHost/FrontendAuthEnvironment.cs`.
  - AppHost projects `VITE_TENAX_AUTH_FRONTEND_ORIGIN` from the frontend endpoint origin assigned at runtime and projects redirect URIs from that effective origin.
  - Frontend bootstrap derives `redirectUri` from `VITE_TENAX_AUTH_FRONTEND_ORIGIN` when explicit redirect URI values are absent.
  - The imported dev Keycloak realm permits loopback wildcard port patterns for `localhost` and `127.0.0.1` to match dynamic local ports.
  - The development realm import includes a public `tenax-spa` client aligned with the projected authority, audience, and redirect-origin expectations.
- Trade-offs and risks:
  - Vite env values are available during dev/build, so future hosted deployments still need a host-level bootstrap mechanism if config must vary without rebuild.
  - Misaligned AppHost and frontend env naming would still break login until covered by regression tests.
  - Runtime config remains public browser configuration and must never include secrets.
- Follow-up tasks:
  - AppHost projects frontend-safe auth env vars to the Vite app in local development.
  - Frontend adds a bootstrap initializer that validates and publishes `window.TENAX_AUTH_CONFIG` before rendering the React tree.
  - Tests cover successful config initialization and the missing-config failure path.

## Out Of Scope
- Adding backend auth orchestration or runtime config transport endpoints.
- Changing JWT bearer validation settings or protected API response schemas.
- Introducing secrets, token exchange, or confidential client behavior in the SPA.

## Parallel Delivery Notes
- Backend track deliverables:
  - In AppHost only, project frontend-safe `VITE_TENAX_AUTH_*` values to the Vite app using the existing development authority/client settings.
  - Keep `Tenax.Web` API configuration and `/api/*` surface unchanged.
- Frontend track deliverables:
  - Add a dedicated bootstrap module that resolves runtime auth config from `window` first, then Vite env fallback, validates it, and assigns `window.TENAX_AUTH_CONFIG` before app render.
  - Keep `auth.ts` as the sole consumer of the browser contract; do not add direct backend config fetches.
- Shared contract milestones:
  - Treat `docs/contracts/api/frontend-runtime-auth-config-bootstrap-contract.yaml` as the source of truth for field names, source precedence, and failure semantics.
  - Any future move to a different runtime delivery channel requires a contract update and ADR amendment before implementation.

## Implementation Evidence

- AppHost development env projection is implemented in `src/Tenax.AppHost/Program.cs` and `src/Tenax.AppHost/FrontendAuthEnvironment.cs`.
- Frontend bootstrap is implemented in `src/Tenax.Web/frontend/src/api/auth-config.ts` and invoked before render from `src/Tenax.Web/frontend/src/main.tsx`.
- The local Keycloak realm alignment is implemented in `src/Tenax.AppHost/keycloak/import/tenax-realm-dev.json` with a public `tenax-spa` client.
- Regression coverage exists in `tests/Tenax.AppHost.Tests/FrontendAuthEnvironmentTests.cs`, `tests/Tenax.AppHost.Tests/DevelopmentRealmImportTests.cs`, `src/Tenax.Web/frontend/src/api/auth-config.test.ts`, and `src/Tenax.Web/frontend/src/routes/home.route.test.tsx`.