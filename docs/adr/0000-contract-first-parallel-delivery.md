# ADR 0000: Contract-First Parallel Backend and Frontend Delivery

- Status: Accepted
- Date: 2026-03-15
- Owners: Architecture
- Related Contracts:
  - docs/contracts/api/contract-template-example.yaml

## Context
- Backend and frontend work must proceed in parallel without blocking each other.
- Ambiguous endpoint response payloads cause rework and integration drift.
- Tenax requires clean architecture boundaries and predictable delivery stages.

## Decision
- Adopt a contract-first workflow for all endpoint-facing features.
- Require strict API response contract documents in `docs/contracts/api/` before implementation starts.
- Require Backend Developer and Frontend Developer to implement against the same approved contracts.
- Use orchestrator stage gates to prevent implementation before architecture artifacts are complete.

## Alternatives Considered
1. Backend-first implementation with frontend adapting later.
2. Informal contract descriptions in issue text.

## Consequences
- Positive impacts:
  - Enables parallel delivery with lower integration risk.
  - Improves testability and traceability.
- Trade-offs and risks:
  - Additional upfront architecture effort.
  - Contract updates require explicit change control.
- Follow-up tasks:
  - Add feature-specific ADR and contract files for each new endpoint-facing feature.

## Parallel Delivery Notes
- Backend track deliverables:
  - Endpoint implementation matching contract status codes and payload schemas.
- Frontend track deliverables:
  - Query/mutation handling and route states aligned with contract examples.
- Shared contract milestones:
  - Contract approved before implementation.
  - Contract compatibility validated during QA.
