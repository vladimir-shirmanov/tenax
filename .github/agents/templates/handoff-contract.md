# Handoff Contract

Use this contract for every cross-agent handoff in the Tenax backend workflow.

## Required Fields
1. `stage`
- Allowed values: `backend`, `docs`, `qa`, `release`

2. `scope`
- Short description of delivered change
- Included features and explicitly out-of-scope items

3. `acceptance_criteria`
- List of criteria being validated for this handoff

4. `files_changed`
- List of changed files

5. `test_evidence`
- `targeted`: commands and outcomes
- `full_suite`: commands and outcomes (required before release handoff)

6. `behavioral_impact`
- API/contract changes
- Data model or migration impact
- Configuration/environment impact

7. `risks`
- Known risks, limitations, and follow-up tasks

8. `next_agent_expectations`
- Exact expectations for the receiving agent

## Optional Fields
- `rollback_notes`
- `feature_flags`
- `observability_notes`

## Example Skeleton
```yaml
stage: backend
scope:
  summary: "Implement study session completion endpoint"
  out_of_scope:
    - "Billing flow"
acceptance_criteria:
  - "Completing a due card records progress"
files_changed:
  - "src/Tenax.Application/StudySessions/CompleteSessionCommand.cs"
test_evidence:
  targeted:
    - command: "dotnet test tests/Tenax.Application.Tests --filter CompleteSession"
      outcome: "Passed"
  full_suite:
    - command: "dotnet test Tenax.slnx"
      outcome: "Passed"
behavioral_impact:
  api_changes:
    - "POST /api/study-sessions/{id}/complete returns 200 with summary payload"
  data_changes:
    - "No migration"
  config_changes:
    - "None"
risks:
  - "No load test yet"
next_agent_expectations:
  - "techwriter: document endpoint contract and examples"
  - "qa: add HTTP autotests for success and validation failure"
```
