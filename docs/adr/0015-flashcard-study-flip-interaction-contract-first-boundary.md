# ADR 0015: Flashcard Study Flip Interaction Contract-First Boundary

- Status: Accepted
- Date: 2026-03-18
- Owners: Architecture
- Related Contracts:
  - docs/contracts/api/flashcards-get-detail-contract.yaml

## Context
- The current flashcard detail route renders term, definition, and optional image as static content in a single view.
- Product intent for study behavior is interactive flashcard usage: front side shows term with optional image, click or keyboard action reveals back side with definition, and transition includes motion.
- Existing backend flashcard detail endpoint already returns required fields for this interaction: `term`, `definition`, `imageUrl`, and metadata.
- Tenax must preserve clean architecture boundaries: Web -> Application -> Domain, with frontend behavior changes isolated to the frontend module unless contract changes are required.
- Accessibility requirements are in-scope for this feature: keyboard operability and reduced-motion compatibility.

## Decision
- Keep backend API and persistence model unchanged for this scope:
  - Continue using `GET /api/decks/{deckId}/flashcards/{flashcardId}` as the source for study card content.
  - Preserve existing response shape and error envelope semantics.
  - Treat this feature as frontend interaction behavior over existing detail data.
- Define study interaction contract expectations in frontend scope:
  - Front side renders `term` and optional `imageUrl` when present.
  - Back side renders `definition` after explicit user interaction.
  - Flip/reveal action is available through pointer and keyboard (`Enter`/`Space`) on a focusable semantic control.
  - When reduced motion is requested (`prefers-reduced-motion: reduce`), avoid spatial flip animation and use a non-motion or minimal-motion state swap.
- Maintain compatibility policy:
  - API response evolution remains additive-only.
  - Any breaking change to response fields, status semantics, or error schema requires contract update and ADR amendment before implementation.

## Alternatives Considered
1. Introduce a new study-specific backend endpoint that omits metadata and returns only front/back card payload.
2. Persist explicit card-side state on backend and expose side-transition events via API.
3. Keep current static detail rendering and treat study behavior as out-of-scope.

## Consequences
- Positive impacts:
  - Frontend and backend can proceed in parallel without backend implementation churn.
  - Existing flashcard detail API remains authoritative and stable for both detail and study use.
  - Accessibility and reduced-motion behavior are explicitly part of delivery scope.
- Trade-offs and risks:
  - Interaction quality depends on frontend implementation discipline for semantics, focus visibility, and keyboard parity.
  - Without explicit frontend tests, regressions in flip state behavior and reduced-motion handling are likely.
  - Optional image loading failure handling must be implemented defensively to avoid degraded study UX.
- Follow-up tasks:
  - Frontend Developer implements interactive study card presentation in detail route using existing contract fields.
  - Frontend Developer adds route/component tests for click, keyboard, and reduced-motion behavior.
  - QA adds acceptance checks for accessibility and interaction parity.

## Parallel Delivery Notes
- Backend track deliverables:
  - No endpoint, DTO, domain model, or persistence changes unless contract drift is discovered.
  - Ensure existing endpoint behavior remains contract-compliant.
- Frontend track deliverables:
  - Replace static combined rendering with two-state card interaction in route `routes/decks.$deckId.flashcards.$flashcardId.tsx`.
  - Ensure accessible interactive surface and reduced-motion fallback behavior.
  - Keep existing query keys and detail data-loading behavior aligned to contract notes.
- Shared contract milestones:
  - `flashcards-get-detail-contract.yaml` remains source of truth for response schema and errors.
  - Any proposed response change pauses implementation until ADR + contract update is approved.

## Acceptance Criteria Coverage
- AC-1 Flashcard study front/back behavior:
  - Covered by frontend interaction scope requiring front term + optional image and back definition reveal.
- AC-2 Keyboard and reduced-motion compatibility:
  - Covered by required keyboard-trigger semantics and reduced-motion fallback constraints.
- AC-3 API contract non-breaking documentation:
  - Covered by explicit additive-only compatibility and unchanged endpoint schema policy in related contract.
- AC-4 Frontend scope boundary with backend out-of-scope by default:
  - Covered by decision that backend changes are not required unless API contract changes are discovered.

## Implementation Guidance
- Backend Developer:
  - Treat this feature as no-op for application/domain/infrastructure unless a contract mismatch is identified.
  - If mismatch appears, stop and request contract/ADR amendment before coding.
- Frontend Developer:
  - Implement a single, focusable card interaction surface with clear state semantics for front and back content.
  - Ensure click and keyboard triggers are equivalent.
  - Respect `prefers-reduced-motion` and avoid 3D flip animation for reduced-motion users.
  - Preserve existing fetch/error handling behavior for detail route and keep API payload assumptions unchanged.