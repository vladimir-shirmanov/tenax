---
description: "Use when creating or modifying frontend source files for React + TypeScript in Tenax. Covers component design, TailwindCSS usage, Zustand state management, React Router framework mode, and TanStack Query conventions."
name: "Tenax Frontend Guidelines"
applyTo: "**/*.{ts,tsx,js,jsx,css,scss}"
---
# Tenax Frontend Guidelines

- Use `TypeScript` for all new frontend logic and strongly type component props, API DTOs, and state models.
- Prefer functional React components and hooks over class components.
- Keep components focused and composable. Favor small presentational components with clear container boundaries.
- Use `TailwindCSS` utility-first styling and prefer design tokens/variables over magic values.
- Avoid global CSS except for app-level resets and variables; keep styling colocated with feature components.
- Use `Zustand` only for client UI/global state that is not server-cache state.
- Do not store API server state in Zustand if it belongs in `TanStack Query`.
- Use `TanStack Query` for API data fetching, caching, invalidation, optimistic updates, and background refetch behavior.
- Centralize API clients and query key factories per feature.
- Use `React Router` in framework mode and keep route modules feature-oriented.
- Validate route params and search params; handle loading/error boundaries at route level where appropriate.
- Keep side effects inside hooks and avoid effect chains that can be represented as derived state.
- Favor accessibility-first UI: semantic elements, keyboard support, and visible focus states.
- Preserve established UI conventions when present; avoid introducing inconsistent layout or typography patterns.
- Organize frontend code by feature instead of generic folders (avoid dumping into Helpers/Utils/Misc).

Suggested query pattern:

```ts
const useDeckProgressQuery = (deckId: string) =>
  useQuery({
    queryKey: deckKeys.progress(deckId),
    queryFn: () => api.decks.getProgress(deckId),
    staleTime: 30_000,
  });
```

Suggested Zustand pattern:

```ts
type StudyUiState = {
  selectedCardId: string | null;
  setSelectedCardId: (id: string | null) => void;
};

export const useStudyUiStore = create<StudyUiState>((set) => ({
  selectedCardId: null,
  setSelectedCardId: (id) => set({ selectedCardId: id }),
}));
```
