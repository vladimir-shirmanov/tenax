# Skill: zustand-router-query

Use this skill when implementing frontend data/state flow in Tenax with Zustand, React Router framework mode, and TanStack Query.

## Goals
- Separate local UI state from server state.
- Keep route-centric data loading and navigation predictable.
- Ensure cache-aware API interaction.

## Guidance
- Use Zustand for client UI/session state only.
- Use TanStack Query for API server state and mutation workflows.
- Define stable query keys per feature.
- Invalidate or update cache after successful mutations.
- Use React Router framework mode loaders/actions where route-level data orchestration is needed.
- Handle empty/loading/error states explicitly at route and component boundaries.

## Deliverables
- Query/store/route implementation
- Focused tests for loading/error/success and mutation flows
- Notes on cache strategy and invalidation behavior
