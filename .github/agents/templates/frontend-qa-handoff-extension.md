# Frontend QA Handoff Extension

Use this extension in addition to the base handoff contract when frontend scope exists.

## Required
```yaml
frontend_visual_qa:
  responsive_matrix:
    - viewport: "mobile"
      width: 375
      status: "pass" # pass | fail | not-tested
      notes: ""
    - viewport: "tablet"
      width: 768
      status: "pass"
      notes: ""
    - viewport: "desktop"
      width: 1440
      status: "pass"
      notes: ""

  accessibility_checks:
    keyboard_navigation: "pass"  # pass | fail | not-tested
    focus_visibility: "pass"
    semantic_roles_labels: "pass"
    color_contrast: "pass"
    notes: []

  route_state_coverage:
    loading_state: "pass"
    empty_state: "pass"
    error_state: "pass"
    success_state: "pass"

  data_layer_checks:
    tanstack_query_cache_behavior: "pass"
    mutation_invalidation_behavior: "pass"
    zustand_state_reset_between_views: "pass"

  browser_matrix:
    - browser: "chromium"
      status: "pass"
      notes: ""
```

## Optional
```yaml
browser_matrix:
  - browser: "firefox"
    status: "pass"
    notes: ""
  - browser: "webkit"
    status: "pass"
    notes: ""

visual_diffs:
  baseline: "path-or-link"
  current: "path-or-link"
  summary: ""
```

## Rules
- If any required check fails, include a linked issue task in `issue-task-report-template.md`.
- Use `not-tested` only with an explicit blocker note.
- QA should not return final pass for frontend scope without this extension payload.
