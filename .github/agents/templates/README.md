# Agent Templates Quick Start

This folder contains reusable templates for the Tenax multi-agent delivery workflow.

## Files
- `orchestrator-input-template.md`: required input schema for the Tech Lead Orchestrator.
- `adr-template.md`: ADR template for architect outputs in `docs/adr/`.
- `api-response-contract-template.md`: strict API response contract template for `docs/contracts/api/`.
- `handoff-contract.md`: required cross-agent handoff schema.
- `issue-task-report-template.md`: required issue/report schema from QA and code-review.
- `frontend-qa-handoff-extension.md`: required visual/accessibility/route-state QA payload when frontend scope exists.

## Typical Flow
1. Invoke Tech Lead Orchestrator with `orchestrator-input-template.md`.
2. Orchestrator delegates to architect first to create ADRs and API response contracts.
3. Orchestrator delegates implementation tracks in parallel when applicable: Backend Developer + Frontend Developer.
4. After implementation tracks pass stage gates, orchestrator delegates: techwriter -> qa -> release-notes.
5. Every stage uses `handoff-contract.md`.
6. QA and code-review produce `issue-task-report-template.md` output.
7. Orchestrator routes issue tasks to the appropriate agent and tracks closure.
8. For frontend scope, QA includes `frontend-qa-handoff-extension.md` payload before final pass.

## Notes
- Full suite must pass before final handoff.
- release-notes must call code-review for final quality gate.
- Use regular commits with clear, scoped commit messages in implementation/documentation/QA agents.
