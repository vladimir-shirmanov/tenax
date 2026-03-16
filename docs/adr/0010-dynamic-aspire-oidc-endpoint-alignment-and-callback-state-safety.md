# ADR 0010: Dynamic Aspire OIDC Endpoint Alignment and Callback State Safety

- Status: Accepted
- Date: 2026-03-16
- Owners: Architecture
- Related Contracts:
  - docs/contracts/api/aspire-dynamic-oidc-integration-no-api-response-changes-contract.yaml
  - docs/contracts/api/frontend-runtime-auth-config-bootstrap-contract.yaml
  - docs/contracts/api/frontend-oidc-client-ts-auth-session-interaction-contract.yaml

## Context
- Tenax local development runs through Aspire where service endpoints may be assigned dynamically at runtime.
- Current local OIDC defaults still assume fixed frontend redirect origins such as http://127.0.0.1:5173 and Keycloak host port 8080 in parts of AppHost config and realm import assumptions.
- When redirect URI and callback origin drift from the origin used to start login, oidc-client-ts callback processing can fail with "No matching state found in storage".
- Current callback detection in frontend auth flow is broad and can attempt callback completion in states that are not safe to process.
- ADR 0006, ADR 0008, and ADR 0009 keep backend auth transport endpoints out of scope and assign browser OIDC orchestration to the frontend.

## Decision
- Standardize dynamic endpoint-safe runtime auth configuration for local Aspire orchestration:
  - Frontend redirect URI and post-logout redirect URI must be derived from the actual frontend public origin selected by Aspire at runtime, not from hardcoded development ports.
  - Backend JWT authority and frontend OIDC authority remain explicitly configured values, but must be projected through one contract surface and validated for consistency.
  - Keycloak development realm import must allow loopback redirect and web origin patterns that are compatible with dynamic local ports.
- Add callback state safety contract requirements in frontend OIDC flow:
  - Callback processing for sign-in must execute only when callback query has both code and state parameters.
  - If callback parameters are present but stored state is missing or expired, frontend must surface a dedicated callback-state-mismatch error contract and clear local session snapshot.
  - Login initiation and callback completion must use the same effective UserManager configuration key set (authority, clientId, redirectUri, scope, audience).
- Preserve architectural boundaries:
  - No backend /api/auth/* login, callback, logout, or session transport endpoints are introduced.
  - No protected API response payload schema changes are introduced by this decision.

## Alternatives Considered
1. Keep fixed development redirect ports and rely on manual environment overrides when Aspire assigns different ports.
2. Add backend callback/session endpoints to recover from frontend callback-state mismatch.
3. Keep frontend callback handling broad and retry callback blindly when state lookup fails.

## Consequences
- Positive impacts:
  - Removes the primary source of local callback-state mismatch by making redirect URI origin runtime-accurate.
  - Keeps Tenax aligned with frontend-owned OIDC orchestration and backend JWT resource-server boundary.
  - Makes callback errors diagnosable by separating generic callback failures from state-mismatch failures.
- Trade-offs and risks:
  - Dynamic-origin projection needs deterministic runtime wiring in AppHost and reliable normalization in frontend bootstrap.
  - Overly broad Keycloak wildcard patterns can weaken local security posture if not constrained to loopback only.
  - Existing tests that assume fixed 5173 redirects must be updated to contract-driven dynamic expectations.
- Follow-up tasks:
  - Backend Developer updates AppHost and development realm import according to the contracts.
  - Frontend Developer updates auth callback guard and error mapping according to the interaction contract.
  - QA adds regression tests for dynamic origin callback success and callback-state mismatch behavior.

## Parallel Delivery Notes
- Backend track deliverables:
  - Project runtime auth env values from AppHost using the frontend endpoint actually assigned by Aspire.
  - Keep Authentication__JwtBearer settings scoped to backend validation only.
  - Ensure Keycloak dev realm redirect and web origin rules cover loopback dynamic ports used by AppHost local runs.
- Frontend track deliverables:
  - Resolve callback handling only for valid sign-in callback signatures.
  - Add explicit error mapping for callback-state mismatch and clear stale local auth snapshot.
  - Keep no-network runtime config bootstrap and no backend auth-flow endpoint calls.
- Shared contract milestones:
  - Update contracts first, then implementation in parallel.
  - Treat this ADR and related contracts as source of truth for callback-state error semantics and dynamic redirect origin behavior.

## Acceptance Criteria
- AppHost-local login and callback succeed when frontend runs on non-default dynamic port without manual redirect URI edits.
- Callback processing is not attempted when state is absent for sign-in callback query.
- Missing or expired oidc-client-ts state during callback produces the dedicated state-mismatch error contract and leaves session anonymous.
- No new backend auth-flow endpoints are added.
- Existing protected API response schemas remain unchanged.

## Implementation Evidence
- AppHost projects frontend runtime auth values from the frontend endpoint origin selected at runtime in `src/Tenax.AppHost/Program.cs`.
- Frontend runtime bootstrap derives redirect URI from `VITE_TENAX_AUTH_FRONTEND_ORIGIN` when explicit redirect URI is not provided in `src/Tenax.Web/frontend/src/api/auth-config.ts`.
- Development realm import allows loopback wildcard dynamic-port redirect/web-origin patterns in `src/Tenax.AppHost/keycloak/import/tenax-realm-dev.json`.
- Frontend callback handling enforces strict sign-in callback signature and maps missing/expired state to `oidc_callback_state_mismatch` in `src/Tenax.Web/frontend/src/api/auth.ts`.
