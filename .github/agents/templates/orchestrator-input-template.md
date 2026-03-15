# Tech Lead Orchestrator Input Template

Use this template when invoking the Tech Lead Orchestrator agent.

## Required
```yaml
project_context:
  summary: "Short context for this change"
  constraints:
    - "Architecture or business constraints"

technical_design:
  problem_statement: "What is being solved"
  proposed_solution: "High-level implementation approach"
  architecture_notes:
    - "Layer boundaries, dependencies, and design choices"

acceptance_criteria:
  - id: "AC-1"
    requirement: "Behavioral requirement"
    verification: "How this will be validated"

delivery_priority:
  order:
    - "Most important objective"
    - "Secondary objective"

quality_gates:
  tdd_required: true
  scoped_tests_first: true
  full_suite_before_handoff: true
  final_code_review_gate: true

handoff_requirements:
  use_contract: ".github/agents/templates/handoff-contract.md"
  issue_task_contract: ".github/agents/templates/issue-task-report-template.md"
  frontend_qa_extension: ".github/agents/templates/frontend-qa-handoff-extension.md"
  adr_template: ".github/agents/templates/adr-template.md"
  api_response_contract_template: ".github/agents/templates/api-response-contract-template.md"
  required_agents:
    - "architect"
    - "Backend Developer"
    - "Frontend Developer"
    - "techwriter"
    - "qa"
    - "release-notes"
```

## Optional
```yaml
out_of_scope:
  - "Explicitly excluded items"

dependencies:
  - "External systems, packages, migrations"

risk_watchlist:
  - "Known risk or unknown area"

frontend_visual_qa_expectations:
  required_viewports: [375, 768, 1440]
  required_browsers: ["chromium"]
  accessibility_checks_required: true

architecture_outputs_required:
  adr_directory: "docs/adr/"
  api_contract_directory: "docs/contracts/api/"
  strict_contract_required_before_parallel_dev: true

timeline:
  target: "Date or sprint window"
```

## Example Prompt
Provide a plan and execute this delivery workflow using the template below. Delegate in strict sequence and enforce stage gates.

```yaml
project_context:
  summary: "Add deck progress endpoint for study sessions"
  constraints:
    - "Keep clean architecture boundaries"
technical_design:
  problem_statement: "Clients cannot retrieve progress summary per deck"
  proposed_solution: "Add query + endpoint + persistence projection"
  architecture_notes:
    - "Web -> Application -> Domain flow only"
acceptance_criteria:
  - id: "AC-1"
    requirement: "GET endpoint returns progress summary for valid deck"
    verification: "Integration test + HTTP autotest"
delivery_priority:
  order:
    - "Correctness"
    - "Regression safety"
quality_gates:
  tdd_required: true
  scoped_tests_first: true
  full_suite_before_handoff: true
  final_code_review_gate: true
handoff_requirements:
  use_contract: ".github/agents/templates/handoff-contract.md"
  issue_task_contract: ".github/agents/templates/issue-task-report-template.md"
  frontend_qa_extension: ".github/agents/templates/frontend-qa-handoff-extension.md"
  adr_template: ".github/agents/templates/adr-template.md"
  api_response_contract_template: ".github/agents/templates/api-response-contract-template.md"
  required_agents:
    - "architect"
    - "Backend Developer"
    - "Frontend Developer"
    - "techwriter"
    - "qa"
    - "release-notes"
```