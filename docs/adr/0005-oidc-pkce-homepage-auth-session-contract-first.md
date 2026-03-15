# ADR 0005: OIDC PKCE Homepage Authentication Session and Navigation Gating

- Status: Superseded
- Date: 2026-03-15
- Owners: Architecture
- Superseded By:
  - docs/adr/0006-frontend-pkce-backend-jwt-bearer-boundary.md
- Related Contracts:
  - docs/contracts/api/auth-session-contract.yaml
  - docs/contracts/api/auth-oidc-login-start-contract.yaml
  - docs/contracts/api/auth-oidc-callback-contract.yaml
  - docs/contracts/api/auth-logout-contract.yaml

## Context
- Historical decision record retained for traceability.
- Tenax frontend currently has no homepage route and no standards-based authentication integration path for gating navigation.
- Existing backend authentication is a temporary bearer-token handler intended for development-only behavior.
- Delivery must be contract-first so backend and frontend can implement in parallel without endpoint drift.
- Clean architecture boundaries are mandatory: Web -> Application -> Domain, with Infrastructure implementing external integrations.
- Authentication integration must remain vendor-neutral and compatible with OpenID Connect providers, including likely future Keycloak adoption.

## Decision
- Adopt an OIDC-compatible OAuth 2.0 Authorization Code + PKCE architecture with backend-managed session state exposed through explicit auth contracts.
- Introduce a homepage-first frontend flow:
  - Homepage route renders anonymous and authenticated variants.
  - Authenticated variant displays navigation links (menu) to decks and flashcards.
  - Frontend derives login state from `GET /api/auth/session` only.
- Define a strict auth endpoint family:
  - `GET /api/auth/session` for current login state and navigation gating metadata.
  - `POST /api/auth/oidc/login/start` to create PKCE challenge context and return provider authorization URL.
  - `GET /api/auth/oidc/callback` to process authorization code callback and establish backend session.
  - `POST /api/auth/logout` to clear local session and optionally provide provider logout redirect URL.
- Boundary ownership:
  - Web: endpoint mapping, cookie/session transport, OIDC challenge/callback HTTP handling.
  - Application: auth-session use cases, redirect safety rules, provider-agnostic abstractions, DTOs/validators.
  - Domain: auth-related policies/invariants that are business meaningful (for example, allowed return-path invariants).
  - Infrastructure: OIDC provider client, token exchange implementation, and external IdP protocol adapters.
- Compatibility and versioning:
  - Contracts are API v1 behavior under `/api`.
  - Additive response fields are allowed.
  - Breaking schema/semantic changes require ADR update and explicit versioning plan.

## Alternatives Considered
1. Continue temporary bearer-token auth and defer OIDC design.
2. Frontend-only OIDC implementation with direct token handling in browser.
3. Keycloak-specific endpoint payloads and claim model in first iteration.

## Consequences
- Positive impacts:
  - Enables standards-compliant auth design aligned with future Keycloak integration.
  - Allows frontend and backend to proceed independently using strict contracts.
  - Centralizes auth session truth in backend endpoint contracts, reducing frontend/provider coupling.
- Trade-offs and risks:
  - Additional backend complexity for PKCE state management and callback safety checks.
  - Requires careful redirect allow-list validation to prevent open-redirect vulnerabilities.
  - Requires explicit handling for partial login failures and stale callback state.
- Follow-up tasks:
  - Implement auth route group and OIDC adapter behind Application abstractions.
  - Add frontend homepage route and auth-aware navigation using session query contract.
  - Add integration and frontend route tests for anonymous/authenticated variants and auth flow transitions.

## Out Of Scope
- Final production IdP provisioning and operational Keycloak realm/client setup.
- Advanced role/claims-based authorization UI and role-specific menu composition.
- Refresh token background rotation and multi-device session management UX.

## Parallel Delivery Notes
- Backend track deliverables:
  - Implement contract-accurate auth endpoints with deterministic status codes/payloads.
  - Enforce secure callback validation (`state`, redirect safety, replay prevention).
  - Keep provider-specific details behind Infrastructure adapter interfaces.
- Frontend track deliverables:
  - Add homepage route with anonymous and authenticated rendering modes.
  - Use `auth.session` query as single source of truth for menu visibility.
  - Wire login/logout actions to contract endpoints and handle callback completion via redirected session refresh.
- Shared contract milestones:
  - Contract approval before implementation starts.
  - Contract examples used for integration tests and frontend fixture mocks.
  - Any schema drift requires contract update + ADR amendment before merge.
