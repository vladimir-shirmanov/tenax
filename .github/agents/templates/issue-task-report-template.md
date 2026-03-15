# Issue Task Report Template

Use this template when QA or code-review finds defects, risks, or follow-up tasks that require additional work.

## Required
```yaml
issue_tasks:
  - id: "ISSUE-001"
    source_agent: "qa" # qa | code-review
    severity: "high"   # critical | high | medium | low
    type: "bug"        # bug | regression | test-gap | docs-gap | architecture-risk | security-risk
    title: "Short actionable title"
    description: "What failed and why it matters"
    evidence:
      - "Failed test/output/log reference"
    acceptance_fix:
      - "Concrete condition that must be true after fix"
    recommended_owner_agent: "Backend Developer" # Backend Developer | Frontend Developer | qa | techwriter
    blocking_release: true
```

## Optional
```yaml
context_files:
  - "src/..."
repro_steps:
  - "Step 1"
  - "Step 2"
related_criteria:
  - "AC-1"
```

## Rules
- Every item must be actionable and testable.
- Use `blocking_release: true` for any unresolved high-risk defect.
- If there are no issues, return `issue_tasks: []` explicitly.
