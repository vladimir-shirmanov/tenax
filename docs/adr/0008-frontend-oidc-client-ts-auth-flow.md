# ADR 0008: Replace Custom Frontend PKCE Flow with oidc-client-ts

- Status: Accepted
- Date: 2026-03-15
- Owners: Architecture
- Related Contracts:
  - docs/contracts/api/frontend-oidc-client-ts-auth-session-interaction-contract.yaml
  - docs/contracts/api/auth-jwt-bearer-discovery-validation-boundary-contract.yaml

## Context
- The frontend auth flow is now implemented in `src/Tenax.Web/frontend/src/api/auth.ts` with `oidc-client-ts` and a cached `UserManager` instance.
- `src/Tenax.Web/frontend/package.json` includes `oidc-client-ts`, making the library choice part of the delivered frontend dependency set.
- Route-level tests in `src/Tenax.Web/frontend/src/routes/home.route.test.tsx` cover login redirect start, callback completion with `returnTo` restoration, callback failure handling, and logout back to anonymous state.
- Existing architecture decisions keep auth session orchestration frontend-owned and keep backend focused on JWT bearer validation boundaries.

## Decision
- Standardize frontend OIDC Authorization Code + PKCE lifecycle on `oidc-client-ts` (`UserManager` as the single authority for redirect start, callback processing, token lifecycle, and logout redirect).
- Manual OIDC discovery, authorization URL construction, and token exchange logic are removed from the active frontend path.
- Keep backend boundary unchanged:
  - Backend does not implement login-start, callback, logout, or auth-session transport endpoints.
  - Backend remains responsible for JWT bearer token validation for protected API routes.
- Define strict interaction contract for frontend auth session behavior in `docs/contracts/api/frontend-oidc-client-ts-auth-session-interaction-contract.yaml` as implementation source of truth.
- Store transient OIDC library state in browser `sessionStorage` through `WebStorageStateStore` and persist the active token snapshot under `tenax.auth.session.v1` for API client consumption.

## Alternatives Considered
1. Keep custom manual PKCE implementation and add logging/debug hooks.
2. Move OIDC choreography to backend BFF endpoints.
3. Adopt another SPA OIDC library (for example, AppAuth-JS).

## Consequences
- Positive impacts:
  - Uses a mature OIDC client with built-in PKCE and redirect callback handling, reducing protocol-level implementation risk.
  - Produces explicit and testable observable signals for login start, callback success/failure, logout, and session query behavior.
  - Preserves clean architecture boundary from ADR 0006: frontend owns browser auth flow; backend owns token validation.
- Trade-offs and risks:
  - Incorrect client configuration (authority, client id, redirect URI, optional post-logout redirect URI) still fails the flow, now through `ApiError` surfaces raised from `UserManager` operations.
  - Library-managed transient storage keys are intentionally opaque and should not be documented as stable implementation details.
  - Logout behavior still depends on provider logout support; the frontend falls back to browser navigation to the configured post-logout redirect target if redirect start fails.
- Follow-up tasks:
  - Keep runbook and contract notes aligned if `oidc-client-ts` configuration or storage strategy changes.
  - Extend route coverage if dedicated callback or silent-renew routes are introduced later.

## Implementation Notes
- Login start uses `UserManager.signinRedirect({ state: { returnTo } })` and preserves the current route when `returnTo` is not provided explicitly.
- Callback handling runs inside `useAuthSessionQuery`; when `code` or `error` query parameters are present, `signinRedirectCallback()` is attempted before reading current user state.
- Successful callback processing persists the active token snapshot to `tenax.auth.session.v1` and removes callback parameters from the browser URL by replacing history with the saved `returnTo` path.
- Logout clears `tenax.auth.session.v1` before calling `signoutRedirect()` and invalidates the React Query auth session after the mutation settles.

## Evidence
- Dependency evidence: `src/Tenax.Web/frontend/package.json` includes `oidc-client-ts`.
- Implementation evidence: `src/Tenax.Web/frontend/src/api/auth.ts` owns login, callback, logout, and session reads through `UserManager`.
- Test evidence: `src/Tenax.Web/frontend/src/routes/home.route.test.tsx` asserts redirect start without backend `/api/auth/*` calls, callback success storage/redirect behavior, explicit callback error rendering, and logout returning the home route to anonymous UI.
