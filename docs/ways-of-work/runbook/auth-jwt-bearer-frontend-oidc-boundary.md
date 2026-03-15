# ADR 0006 Authentication Boundary Runbook

## Purpose

This runbook documents the implemented authentication boundary from ADR 0006.
Use it to maintain backend JWT resource-server behavior and frontend `oidc-client-ts` browser auth behavior without reintroducing superseded backend auth-flow endpoints.

## Boundary Summary

- Backend scope:
  - Validate bearer JWTs using configured OIDC authority metadata discovery.
  - Enforce audience and standard token validation on protected APIs.
  - Return contract-aligned `401` and `403` error envelopes for unauthorized/forbidden access.
- Frontend scope:
  - Own OIDC Authorization Code + PKCE login and logout flow in browser via `oidc-client-ts` `UserManager`.
  - Derive homepage authenticated state from frontend-managed token/session state.
  - Show homepage learning menu links (decks, flashcards) only when authenticated.
  - Attach bearer access token to protected API calls.
  - Clear local auth session when API responds with `401` or `403`.

## Explicitly Out Of Scope

The following backend endpoints remain out of scope and must not be implemented unless a new ADR approves them:

- `GET /api/auth/session`
- `POST /api/auth/oidc/login/start`
- `GET /api/auth/oidc/callback`
- `POST /api/auth/logout`

## Backend Configuration Notes

Backend JWT settings are configured under:

- `Authentication:JwtBearer:Authority`
- `Authentication:JwtBearer:Audience`
- `Authentication:JwtBearer:RequireHttpsMetadata`

Current local defaults are defined in Tenax Web app settings and should be overridden per environment as needed.

Operational expectation:

- Missing required authority or audience configuration should fail startup early.
- Protected endpoints continue using existing endpoint contracts for response payloads.

## Frontend Behavior Notes

Frontend auth session behavior is local-session based and client-managed:

- Access token storage key: `tenax.auth.session.v1`
- `oidc-client-ts` transient state uses browser `sessionStorage` through `WebStorageStateStore`; do not rely on hard-coded library key names in docs or app logic.
- React Query auth session key: `['auth', 'clientSession']`
- Login behavior:
  - Homepage sign-in calls `UserManager.signinRedirect()` with `state.returnTo` set to the current route.
  - No backend `/api/auth/*` request is part of login start.
- Callback behavior:
  - `useAuthSessionQuery` detects callback query parameters and executes `signinRedirectCallback()` before reading the current user.
  - Successful callback handling persists the active token snapshot to `tenax.auth.session.v1` and replaces the browser URL with the saved `returnTo` path.
  - Callback failures surface `oidc_callback_invalid` through the homepage error state.
- Logout behavior:
  - `tenax.auth.session.v1` is cleared before `UserManager.signoutRedirect()` starts.
  - The logout mutation applies an optimistic anonymous session locally, then invalidates the auth session query.
  - If sign-out redirect start fails, the browser falls back to `window.location.assign(postLogoutRedirectUri)` when possible.
- API client behavior:
  - Adds `Authorization: Bearer <token>` when an active access token is available.
  - Clears local auth session storage on `401` and `403` responses.

Homepage behavior expectations:

- Anonymous users see sign-in affordance and no learning menu.
- Authenticated users see learning menu links to:
  - `/decks`
  - `/decks/{defaultDeckId}/flashcards`

## Contract and ADR References

- `docs/adr/0006-frontend-pkce-backend-jwt-bearer-boundary.md`
- `docs/adr/0008-frontend-oidc-client-ts-auth-flow.md`
- `docs/contracts/api/auth-jwt-bearer-discovery-validation-boundary-contract.yaml`
- `docs/contracts/api/frontend-oidc-client-ts-auth-session-interaction-contract.yaml`
- `docs/contracts/api/auth-session-contract.yaml` (superseded)
- `docs/contracts/api/auth-oidc-login-start-contract.yaml` (superseded)
- `docs/contracts/api/auth-oidc-callback-contract.yaml` (superseded)
- `docs/contracts/api/auth-logout-contract.yaml` (superseded)

## Maintenance Guardrails

- Do not add backend auth-flow transport endpoints under `/api/auth/*` in this scope.
- Keep `401`/`403` behavior aligned with protected-resource contracts.
- If auth boundary changes are needed:
  - Create/update ADR first.
  - Update or add endpoint contract files.
  - Then implement runtime changes.
