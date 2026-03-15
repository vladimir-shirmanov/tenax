# ADR Template

Use this template for architecture decision records under `docs/adr/`.

## File Naming
- `NNNN-short-kebab-title.md` (example: `0007-study-session-completion-contract.md`)

## Template
```md
# ADR NNNN: <Decision Title>

- Status: Proposed | Accepted | Superseded
- Date: YYYY-MM-DD
- Owners: <team or role>
- Related Contracts:
  - docs/contracts/api/<file>.yaml

## Context
- Problem statement
- Constraints (technical, business, timeline)
- Existing system assumptions

## Decision
- Chosen approach
- Architectural boundaries (Web -> Application -> Domain, frontend module boundaries)
- API contract ownership and versioning strategy

## Alternatives Considered
1. <option>
2. <option>

## Consequences
- Positive impacts
- Trade-offs and risks
- Follow-up tasks

## Parallel Delivery Notes
- Backend track deliverables
- Frontend track deliverables
- Shared contract milestones
```
