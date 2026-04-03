---
name: jest-frontend-testing
description: Use this skill when creating or improving frontend test coverage in Tenax with Jest.
---

# Skill: jest-frontend-testing

Use this skill when creating or improving frontend test coverage in Tenax with Jest.

## Goals
- Validate user-visible behavior reliably.
- Protect against regressions in component, route, and state logic.

## Guidance
- Prefer React Testing Library queries by role/label/text.
- Avoid brittle snapshot-only strategies.
- Cover happy path plus validation/error paths.
- Reset shared state between tests (stores, query client, mocks).
- Add regression tests for all bug fixes.

## Deliverables
- New or updated Jest tests
- Test utilities only when repeated patterns justify extraction
- Clear red-green summary in implementation reports
