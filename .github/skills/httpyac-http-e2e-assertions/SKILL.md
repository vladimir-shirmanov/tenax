---
name: httpyac-http-e2e-assertions
description: 'Write robust httpyac-based HTTP E2E tests with executable assertions. Use when QA adds or updates .http autotests under tests/http and needs reliable status, header, body, and timing checks.'
argument-hint: 'Describe the endpoint scenarios, expected status/body/headers, follow-up requests, and any IDs or variables that must flow between requests.'
---

# httpyac HTTP E2E Assertions

Use this skill when creating or updating HTTP end-to-end test files in `tests/http`.

## Goals

- Convert request collections into executable checks instead of comment-only examples.
- Prefer inline `??` assertions for simple and readable verification.
- Use extended `{{ ... }}` test blocks only when inline assertions are not expressive enough.
- Keep assertions focused on API contract behavior that should remain stable.

## Workflow

1. Start from the acceptance criteria, API contract, and QA handoff.
2. Split the `.http` file into explicit scenarios: happy path, validation failure, auth failure, not found, forbidden, and conflict/unavailable cases when applicable.
3. After each request, add executable assertions for status first, then headers, then body shape/content.
4. For JSON responses, prefer field-level assertions over full-body string equality.
5. For multi-step flows, reuse IDs and response data across requests only when the scenario requires it.
6. Use broader script-based assertions only for array length checks, derived comparisons, or logic that would be awkward in a single inline assert.
7. Keep the matching Postman collection aligned when the `.http` scenarios change.

## Decision Rules

- Use inline asserts when checking status codes, headers, body fields, or simple timing thresholds.
- Use `js` assertions when you need nested access or comparisons that are clearer in JavaScript.
- Use extended `test(...)` blocks when you need multiple related checks, richer failure names, or helper methods like `test.status(...)`.
- Assert error payload structure for non-2xx responses when the contract defines it.
- Add duration assertions only when the threshold is stable enough to avoid flaky tests.

## httpyac Assert Syntax

Simple assertions start with `??`.

```http
GET https://httpbin.org/anything

?? status == 200
```

Useful conditions:

- Equality and inequality: `==`, `!=`
- Numeric comparisons: `>`, `>=`, `<`, `<=`
- String checks: `startsWith`, `endsWith`, `includes`, `contains`, `matches`
- Presence and truthiness: `exists`, `isTrue`, `isFalse`
- Type checks: `isNumber`, `isBoolean`, `isString`, `isArray`

Common API assertions:

```http
?? status == 201
?? header content-type includes json
?? duration < 500
?? body id exists
?? body term == hola
?? body flashcards isArray
?? js response.parsedBody.items.length > 0
```

Extended asserts are available in script blocks when needed:

```http
GET https://httpbin.org/json

{{
  test.status(200);
  test.headerContains("content-type", "json");
  test("first slide title is present", () => {
    const { equal } = require("assert");
    equal(response.parsedBody.slideshow.slides[0].title, "Wake up to WonderWidgets!");
  });
}}
```

## Tenax Patterns

- Keep file-level variables near the top of the `.http` file.
- Name each scenario with a clear `###` heading that includes the expected outcome.
- For create/update flows, assert both transport details and domain fields returned by the API.
- For validation and authorization failures, assert the exact status and the key response fields that encode the failure contract.
- Do not rely on manual inspection or comments when an executable assert can express the expectation.

## Completion Checks

- Every scenario intended as an autotest has executable assertions.
- Success scenarios assert at least status plus one contract-relevant header/body condition.
- Error scenarios assert at least status plus one contract-relevant error field when available.
- Assertions are stable, readable, and scoped to behavior rather than incidental formatting.
- The `.http` file and companion Postman collection describe the same scenarios.

## Scope Note

- Use this skill for HTTP-level verification in `.http` files.
- If browser-driven UI verification is also required, keep that as a separate QA concern; do not replace API assertions with manual browser checks.