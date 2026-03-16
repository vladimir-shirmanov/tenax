# ADR 0011: Frontend Shell Redesign and Theme Architecture

- Status: Accepted
- Date: 2026-03-16
- Owners: Architecture
- Related Contracts:
  - docs/contracts/api/frontend-shell-redesign-no-api-response-changes-contract.yaml
  - docs/contracts/api/auth-jwt-bearer-discovery-validation-boundary-contract.yaml
  - docs/contracts/api/flashcards-create-contract.yaml
  - docs/contracts/api/flashcards-list-contract.yaml
  - docs/contracts/api/flashcards-get-detail-contract.yaml
  - docs/contracts/api/flashcards-update-contract.yaml
  - docs/contracts/api/flashcards-delete-contract.yaml

## Context
- Tenax is a language-learning application centered on flashcard study, deck management, and rapid resume-to-learning flows for authenticated users.
- The current frontend is functional but visually inconsistent with the requested product direction: calm, premium, restrained, accessible, and Apple-inspired rather than utility-first.
- The current shell is thin: `src/Tenax.Web/frontend/src/main.tsx` boots global CSS and auth bootstrap, `src/Tenax.Web/frontend/src/app/App.tsx` mounts providers and the router, `src/Tenax.Web/frontend/src/app/router.tsx` declares flat routes, and `src/Tenax.Web/frontend/src/components/PageScaffold.tsx` owns per-page title framing instead of a persistent application shell.
- Current styling is mostly route-local Tailwind utility usage with a small global `:root` theme in `src/Tenax.Web/frontend/src/styles.css`. There is no system-aware theme model, no persistent user preference, and no header-owned theme toggle.
- The redesign scope is the whole frontend shell and major route surfaces in the current SPA, but backend behavior and API responses must remain unchanged unless a strict architectural reason appears.
- Frontend stack constraints remain: React 18, TypeScript, Vite, Tailwind, React Router, and TanStack Query.
- Visual direction constraints:
  - Light theme must anchor on Material-style brand/reference colors with primary `#00ce75`, secondary `#ce0059`, and a complementary tertiary/supporting indigo `#4f6dff`.
  - Dark theme must remain in the same color family and preserve the same brand identity.
  - Theme behavior must support `system`, `light`, and `dark`, default to `system`, persist user choice across reloads, and expose the control in the persistent header.

## Decision
- Deliver the redesign as a frontend-only architecture change. Existing backend routes, resource ownership, auth boundaries, and API response contracts remain unchanged in this scope.
- Introduce a token-driven theming architecture with three ownership layers:
  - Reference tokens: immutable brand and neutral tonal ramps owned centrally in global theme files. These include the required brand anchors and their tonal families for both light and dark semantic mapping.
  - Semantic tokens: role-based tokens such as `surface`, `surface-muted`, `surface-elevated`, `text-primary`, `text-secondary`, `border-subtle`, `accent-primary`, `accent-secondary`, `accent-tertiary`, `focus-ring`, `success`, `warning`, and `danger`.
  - Shell/component tokens: tokens scoped to shared UI primitives such as header chrome, navigation pills, primary buttons, secondary buttons, cards, input fields, dividers, and page section containers.
- Token ownership rules:
  - Global theme definition and theme selectors belong in the frontend root styling layer, implemented through CSS custom properties and consumed by Tailwind/theme-aware component styles.
  - Shared shell and primitive components may consume shell/component tokens.
  - Route components must consume semantic or shared component tokens only and must not introduce hard-coded brand hex values.
- Standardize theme state with one persisted preference key: `tenax.theme.preference`.
  - Allowed persisted values: `system`, `light`, `dark`.
  - Default when no preference is stored: `system`.
  - Persistence mechanism: browser `localStorage` only. No backend preference endpoint or profile persistence is introduced in this scope.
- Standardize effective theme resolution:
  - Before React renders, a synchronous bootstrap resolves the effective theme from persisted preference plus `prefers-color-scheme`.
  - The bootstrap sets the root theme selector on `document.documentElement` and updates the browser `color-scheme` so form controls and scrollbars match the active theme.
  - When preference is `system`, the app must react to operating-system light/dark changes during the session.
  - When preference is `light` or `dark`, operating-system changes must not override the explicit user choice.
- Establish a persistent application shell as the owner of global navigation and theme controls.
  - The shell owns the top header across the authenticated and unauthenticated experience.
  - The header contains the brand/home affordance, primary navigation entry points for study areas, auth actions already exposed by the existing client session flow, and the theme toggle control.
  - The theme toggle must expose all three modes, not a binary-only switch, and remain keyboard accessible with a visible focus treatment.
  - Page-level components such as `PageScaffold` become content containers within the shell, not owners of global header or theme state.
- Route-shell migration strategy:
  - Introduce a root layout route that wraps the existing major surfaces without changing their backend data dependencies.
  - Migrate route surfaces in rollout order: home, decks, flashcard list, flashcard detail, flashcard edit, flashcard create.
  - During migration, preserve existing route paths, TanStack Query keys, mutation invalidation behavior, auth gating, and endpoint contracts.
  - Loading, empty, error, and success states must be visually restyled through tokens and shared primitives rather than route-specific ad hoc styling.
- Layout and visual direction constraints for implementation:
  - Use restrained spacing, high legibility, low-noise surfaces, soft elevation, and clear content hierarchy.
  - Prefer calm neutral surfaces with brand color used for emphasis, not saturation-heavy fills across large areas.
  - Dark theme must use the same tonal families rather than introducing unrelated hues.
  - Accessibility is mandatory: sufficient contrast, clear focus visibility, keyboard-operable header controls, and stable motion defaults.

## Alternatives Considered
1. Keep the current per-route scaffold model and add a local theme toggle only on the home page.
2. Add backend persistence for theme preference through user profile/session APIs.
3. Redesign routes independently without a centralized token model or root shell.

## Consequences
- Positive impacts:
  - Frontend Developer can redesign the product shell and major route surfaces without reopening backend/API scope.
  - Theme behavior becomes deterministic, testable, and consistent across all routes.
  - Shared token ownership reduces route-by-route visual drift and allows iterative design corrections later without contract churn.
  - The app gains a premium, calm visual baseline while preserving current auth and flashcard workflows.
- Trade-offs and risks:
  - The first-paint theme bootstrap must happen before React mount or the redesign will flash the wrong theme on load.
  - A token model that is too shallow will force route authors back into hard-coded utility colors; a token model that is too deep will slow delivery. The implementation should keep the token set intentional and semantic.
  - Existing route components may need modest structural refactors to fit a persistent shell even though their API behavior stays unchanged.
  - Because preference is client-only in this scope, theme selection does not roam between browsers/devices.
- Follow-up tasks:
  - Frontend Developer defines the concrete token files, root shell, header theme control, and route-surface restyling under this ADR.
  - QA validates responsive and accessibility behavior at 375, 768, and 1440 widths in Chromium.
  - techwriter documents the new theme behavior, control labeling, and any user-visible navigation changes after implementation.

## Route Surface Scope
- In scope:
  - Global SPA shell and header
  - Theme token system and runtime preference handling
  - Home, decks, flashcard list, flashcard detail, flashcard edit, and flashcard create route surfaces
  - Shared empty, loading, error, and success presentation patterns
- Out of scope:
  - New backend endpoints
  - Changes to existing API response shapes
  - Brand copy overhaul beyond minimal UI text needed for the redesign
  - Server-side or account-level theme synchronization

## Parallel Delivery Notes
- Backend Developer deliverables:
  - Keep backend/API behavior unchanged.
  - Reject any redesign implementation that attempts to change response schemas, auth boundaries, or endpoint inventory without a new ADR and contract update.
  - Support only incidental backend-safe work required to keep existing routes functional; no redesign-specific endpoint work is expected.
- Frontend Developer deliverables:
  - Add a theme bootstrap before React render in the existing frontend entry flow.
  - Introduce a root application shell and persistent header in router/layout composition rather than embedding shell controls in individual routes.
  - Centralize tokens and ensure route components consume semantic tokens or shared primitives instead of direct palette values.
  - Preserve existing auth session behavior, route paths, query keys, mutation invalidations, and backend API contracts.
  - Implement tests first for theme resolution, persistence, root-shell/header behavior, and route-surface regressions before broad visual migration.
- Shared contract milestones:
  - Treat this ADR and `docs/contracts/api/frontend-shell-redesign-no-api-response-changes-contract.yaml` as the source of truth before implementation starts.
  - Any discovered need for backend/API change must stop the redesign track until a new ADR and endpoint contract update are approved.

## Acceptance Criteria Coverage
- AC-1: Satisfied by the token ownership model, `system`/`light`/`dark` preference contract, `localStorage` persistence rule, first-paint resolution behavior, and header ownership decision.
- AC-2: Satisfied by the explicit no-API-change contract linked above and the decision that redesign scope is frontend-only.
- AC-3: Satisfied by the defined shell ownership, route migration order, rollout constraints, downstream implementation duties, and risk list.

## Implementation Outcome (2026-03-16)
- Implemented shell ownership:
  - Router now composes major SPA routes under `AppShell` so a persistent top header and shared content frame are always present.
  - `PageScaffold` is now used as a content-surface primitive inside the shell rather than as a header/theme owner.
- Implemented theme behavior:
  - Theme preference storage key `tenax.theme.preference` is used with values `system`, `light`, and `dark`.
  - Theme resolution runs before React mount in `main.tsx` and applies root `data-theme` and `color-scheme` before first paint.
  - Runtime `system` mode follows OS preference changes; explicit `light` and `dark` selections remain user-pinned.
- Implemented user-visible controls:
  - Header includes home affordance, authenticated menu links, auth actions, and a three-state theme control (`System`, `Light`, `Dark`).
- Implemented route-surface redesign:
  - Home, decks, and flashcard list/detail/create/edit surfaces were restyled using centralized tokenized theme usage.
- Contract and behavior preservation:
  - Backend/API response behavior, route paths, auth flow semantics, query keys, and mutation invalidation behavior remained unchanged.
- Validation note:
  - Frontend build and frontend tests were reported as passing in implementation handoff evidence.

## Implementation Guidance
- Recommended ownership map for downstream implementation:
  - `src/Tenax.Web/frontend/src/main.tsx`: first-paint theme bootstrap invocation before React mount.
  - `src/Tenax.Web/frontend/src/app/App.tsx`: provider composition including theme state provider if one is introduced.
  - `src/Tenax.Web/frontend/src/app/router.tsx`: root layout route and shell composition.
  - `src/Tenax.Web/frontend/src/components/PageScaffold.tsx`: demoted to content-section framing inside the shell.
  - `src/Tenax.Web/frontend/src/styles.css`: root theme selectors, global tokens, and baseline typography/surface rules unless split into dedicated theme files.
- Required test-first slices:
  - Theme resolution defaults to `system` and resolves correctly for light and dark OS preferences.
  - Explicit user theme preference persists across reloads and overrides OS changes.
  - Header theme control is keyboard operable and reflects the current mode.
  - Existing route data behavior and auth/menu visibility remain unchanged while visuals migrate.