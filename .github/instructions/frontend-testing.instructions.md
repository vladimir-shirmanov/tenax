---
description: "Use when creating or modifying frontend tests in Tenax. Covers Jest, React Testing Library patterns, query/state testing, and route-level testing."
name: "Tenax Frontend Testing Guidelines"
applyTo: "**/*.{test,spec}.{ts,tsx,js,jsx}"
---
# Tenax Frontend Testing Guidelines

- Use `Jest` as the frontend test runner.
- Use `React Testing Library` for component and route behavior tests.
- Prefer behavior-driven assertions over implementation details.
- For async UI, assert loading, success, and error states.
- Mock network boundaries intentionally; do not mock everything by default.
- For `TanStack Query`, test cache invalidation and refetch behavior for mutations.
- For `Zustand`, reset stores between tests and assert state transitions through public actions.
- For `React Router` framework mode, test route-level loaders/actions and navigation flows.
- Keep fixtures minimal and colocated with the feature under test.
- Add regression tests for every fixed bug with a clear failing-then-passing intent.

Suggested component test skeleton:

```ts
it("shows progress after successful fetch", async () => {
  render(<DeckProgressPage />);

  expect(screen.getByText(/loading/i)).toBeInTheDocument();
  expect(await screen.findByText(/cards studied/i)).toBeInTheDocument();
});
```
