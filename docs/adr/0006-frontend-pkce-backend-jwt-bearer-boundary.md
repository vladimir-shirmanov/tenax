# ADR 0006: Frontend PKCE with Backend JWT Bearer Validation Boundary

- Status: Accepted
- Date: 2026-03-15
- Owners: Architecture
- Supersedes:
  - docs/adr/0005-oidc-pkce-homepage-auth-session-contract-first.md
- Related Contracts:
  - docs/contracts/api/auth-jwt-bearer-discovery-validation-boundary-contract.yaml
  - docs/contracts/api/auth-session-contract.yaml
  - docs/contracts/api/auth-oidc-login-start-contract.yaml
  - docs/contracts/api/auth-oidc-callback-contract.yaml
  - docs/contracts/api/auth-logout-contract.yaml
  - docs/contracts/api/flashcards-create-contract.yaml
  - docs/contracts/api/flashcards-list-contract.yaml
  - docs/contracts/api/flashcards-get-detail-contract.yaml
  - docs/contracts/api/flashcards-update-contract.yaml
  - docs/contracts/api/flashcards-delete-contract.yaml

## Context
- Tenax requires a homepage with a simple authenticated navigation menu to decks and flashcards.
- Scope has changed: backend OIDC flow orchestration endpoints are explicitly out of scope.
- Backend must only accept bearer JWT tokens and validate them using standards-based OpenID Connect/OAuth2 metadata discovery (`/.well-known/openid-configuration`) and issuer/audience checks.
- Architecture must remain provider-neutral and compatible with future Keycloak and Aspire Keycloak integration guidance.
- Existing ADR 0005 and planned `/api/auth/oidc/*` + `/api/auth/logout` contracts are now misaligned and must be superseded.
- Clean Architecture boundaries remain mandatory: Web -> Application -> Domain, with Infrastructure implementing external dependencies.

## Decision
- Adopt frontend-owned OIDC Authorization Code + PKCE flow for login and logout initiation.
- Backend responsibility is limited to resource-server behavior:
  - Validate inbound bearer JWTs using configured authority metadata/discovery.
  - Validate token issuer, audience, expiry, and signature per standard JWT bearer middleware behavior.
  - Enforce authorization policies for protected resources and return contract-defined `401`/`403` errors.
- Do not implement backend endpoints for auth flow transport in this scope:
  - `POST /api/auth/oidc/login/start`
  - `GET /api/auth/oidc/callback`
  - `POST /api/auth/logout`
  - `GET /api/auth/session`
- Homepage behavior contract:
  - Frontend determines authenticated state from frontend OIDC client session/token state and protected API outcomes.
  - When authenticated, homepage menu exposes links to decks and flashcards.
  - When anonymous or token validation fails, homepage hides protected menu actions and presents login affordance.
- Security constraints:
  - Tokens are never minted, exchanged, or persisted by backend auth-flow endpoints in this scope.
  - Frontend must avoid storing long-lived secrets; PKCE and standards-compliant browser OIDC client behavior are required.
  - Backend authorization decisions must not depend on frontend UI state.
- Compatibility rules:
  - API response evolution is additive-only unless a new ADR explicitly approves a breaking change.
  - Any future reintroduction of backend auth-flow endpoints requires a new ADR and new endpoint contracts before implementation.

## Alternatives Considered
1. Keep backend-managed OIDC callback/session endpoint family from ADR 0005.
2. Implement hybrid login start in backend and callback in frontend.
3. Build Keycloak-specific backend auth endpoints now and generalize later.

## Consequences
- Positive impacts:
  - Removes backend complexity around PKCE verifier/session state and callback redirect safety in current scope.
  - Aligns backend with standard resource-server responsibility and future IdP portability.
  - Allows frontend and backend to work in parallel with clear boundary ownership.
- Trade-offs and risks:
  - Frontend now carries more responsibility for auth UX state transitions and token lifecycle handling.
  - Provider-specific browser logout nuances remain frontend integration concerns.
  - Requires disciplined configuration management for authority/audience values across local and future environments.
- Follow-up tasks:
  - Update docs contracts to supersede backend auth-flow endpoint contracts.
  - Keep protected-resource contracts authoritative for `401`/`403` behavior.
  - Add implementation handoff for backend JWT configuration and frontend auth-gated homepage behavior.

## Out Of Scope
- Backend login-start, callback, logout, or session transport endpoints.
- Backend-issued cookies or server-side auth-session state management for homepage gating.
- IdP realm/client provisioning automation details.

## Parallel Delivery Notes
- Backend track deliverables:
  - Configure JWT bearer authentication with discovery-based authority metadata, issuer validation, and audience validation.
  - Apply authorization on protected APIs and preserve existing `401`/`403` contract semantics.
  - Keep auth provider-specific client credentials/configuration in environment/app settings, not Domain/Application business logic.
- Frontend track deliverables:
  - Integrate standards-based OIDC client for PKCE flow.
  - Implement homepage auth-gated menu for decks/flashcards based on frontend auth state.
  - Attach bearer access tokens to protected API calls and handle `401`/`403` by clearing/refreshing auth state per frontend policy.
- Shared contract milestones:
  - Treat superseded auth endpoint contracts as non-implementable in this scope.
  - Treat protected-resource contracts as source of truth for runtime API behavior.
  - Any contract drift requires contract file updates and ADR amendment before merge.
