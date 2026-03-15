# API Contracts Directory

This folder stores strict API response contracts used as implementation source of truth.

## Rules
- One contract file per endpoint or endpoint family.
- Use `.github/agents/templates/api-response-contract-template.md`.
- Backend and frontend implementations must follow these contracts.
- Any breaking response change requires ADR update and orchestrator approval.
