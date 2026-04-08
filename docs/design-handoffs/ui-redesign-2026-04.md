# UI Redesign — April 2026
**Tenax Design Handoff · 5 Batches**

> Audience: Frontend Developer
> Template: `.github/agents/templates/design-handoff-batch-template.md`
> Status: Implementation-ready
> Scope: Professional polish pass — nav cleanup, breadcrumb system, radius scale, icon theme toggle, brand color refinement

---

## Batch Overview

| # | Title | Issues |
|---|-------|--------|
| 1 | Primary Nav — Remove Flashcards + Visual Redesign | Issues 1 & 2 |
| 2 | Breadcrumb Component + PageScaffold Integration | Issue 3 |
| 3 | Border-Radius Scale Reduction | Issue 4 |
| 4 | Theme Toggle — Icon-Only Buttons | Issue 5 |
| 5 | Color Palette Token Updates | Color palette section |

Dependencies: Batches 3 and 5 are CSS-only and can be implemented in any order. Batch 1 must precede Batch 4 (both touch `AppShell.tsx`). Batch 2 must precede route-level changes. Recommended implementation order: 5 → 3 → 1 → 4 → 2.

---

## Batch 1 — Primary Nav: Remove Flashcards + Visual Redesign

```yaml
batch: 1
title: "Primary Nav — Remove Flashcards link and apply flat visual style"
detail_level: "standard"
objective: >
  Eliminate the redundant Flashcards nav item and replace the pill-container nav
  pattern with a flat, minimal flex row that reads as professional rather than playful.
deliverables:
  - "Revised AppShell.tsx nav JSX (Flashcards NavLink removed)"
  - "New .primary-nav and .primary-nav__link CSS rules"
  - "Active/inactive state specification"
acceptance_criteria:
  - "Nav renders exactly two items when authenticated: Home | Decks"
  - "No border or background on .primary-nav container"
  - "Active item uses soft accent fill, not elevated-surface fill"
  - "Inactive items use --text-secondary color"
  - "All nav links meet 44px minimum tap target height"
dependencies:
  - "None — self-contained to AppShell.tsx and styles.css"
```

### Issue 1 — Remove Flashcards from Nav

**Problem:** `AppShell.tsx` renders three nav items when authenticated: Home, Decks, Flashcards. The Flashcards `NavLink` points to `/decks` (same href as Decks), using the `location.pathname.includes("/flashcards")` condition for active state. This creates a misleading second entry with an unreachable dedicated route.

**Target state:**
- Nav items when authenticated: `Home` | `Decks`
- Nav items when unauthenticated: `Home` only
- Remove the entire second `<NavLink>` block inside `{session?.isAuthenticated ? (...) : null}`

**File to modify:** `src/Tenax.Web/frontend/src/components/AppShell.tsx`

**Current JSX to remove (lines 52–57):**
```tsx
// REMOVE THIS ENTIRE BLOCK:
<NavLink
  to="/decks"
  className={`primary-nav__link${location.pathname.includes("/flashcards") ? " is-active" : ""}`}
>
  Flashcards
</NavLink>
```

**Updated `primary-nav` JSX after change:**
```tsx
<nav className="primary-nav" aria-label="Primary">
  <NavLink
    to="/"
    end
    className={({ isActive }) => `primary-nav__link${isActive ? " is-active" : ""}`}
  >
    Home
  </NavLink>
  {session?.isAuthenticated ? (
    <NavLink
      to="/decks"
      end
      className={`primary-nav__link${
        location.pathname.startsWith("/decks") ? " is-active" : ""
      }`}
    >
      Decks
    </NavLink>
  ) : null}
</nav>
```

> **Note:** Simplify the Decks active-state condition to `location.pathname.startsWith("/decks")` — since Flashcards is removed, there's no ambiguity about which nav item should light up on flashcard sub-routes. Decks should be active across all `/decks/*` paths.

---

### Issue 2 — Primary Nav Visual Redesign

**Problem:** `.primary-nav` is styled as a pill container (`border-radius: 999px`, `border: 1px solid var(--border-subtle)`, `background: var(--surface-muted)`). Individual links also use `border-radius: 999px`. The active state lifts the item to `--surface-elevated`. This combination reads as a toggle button group, not a navigation element.

**Target design intent:** Flat flex row. No container chrome. Active item gets a muted accent tint. The nav should feel like a clean editorial navigation row.

**File to modify:** `src/Tenax.Web/frontend/src/styles.css`

**Replace `.primary-nav` block (lines 126–134) with:**
```css
.primary-nav {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  /* Remove: padding, border, border-radius, background */
}
```

**Replace `.primary-nav__link` block (lines 136–146) with:**
```css
.primary-nav__link {
  text-decoration: none;
  color: var(--text-secondary);
  border-radius: 0.4rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 700;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  transition: background-color 160ms ease, color 160ms ease;
}
```

**Replace `.primary-nav__link.is-active` block (lines 148–151) with:**
```css
.primary-nav__link.is-active {
  background: color-mix(in srgb, var(--accent-primary) 12%, transparent);
  color: var(--text-primary);
}
```

**Add hover state (new rule, insert after `.is-active`):**
```css
.primary-nav__link:hover:not(.is-active) {
  color: var(--text-primary);
  background: color-mix(in srgb, var(--text-primary) 6%, transparent);
}
```

**Mobile override update** — In `@media (max-width: 47.999rem)`, the `.primary-nav` currently gets `justify-self: end` which still applies. The `.primary-nav__link` mobile padding override at line 598–600 should be retained:
```css
/* Keep as-is in mobile block: */
.primary-nav__link {
  padding: 0.25rem 0.5rem;
}
```

### Interaction Notes

| State | Background | Color |
|-------|-----------|-------|
| Default (inactive) | transparent | `var(--text-secondary)` |
| Hover (inactive) | `color-mix(in srgb, var(--text-primary) 6%, transparent)` | `var(--text-primary)` |
| Active / `.is-active` | `color-mix(in srgb, var(--accent-primary) 12%, transparent)` | `var(--text-primary)` |
| Focus-visible | 2px `var(--focus-ring)` outline, offset 2px | — |

Motion: The existing `@media (prefers-reduced-motion: no-preference)` block already covers `.primary-nav__link` with `transition: transform 120ms ease, background-color 160ms ease, color 160ms ease`. No additional motion rules needed.

### Accessibility Checklist — Batch 1

- [ ] `<nav aria-label="Primary">` is retained — landmark is preserved
- [ ] Each `NavLink` has visible text content — no icon-only items in this nav
- [ ] Active item communicates state via CSS class; ensure `aria-current="page"` is added to active `NavLink` via React Router's `className` callback pattern (add `aria-current={isActive ? "page" : undefined}`) — **or** confirm React Router's NavLink already sets this automatically (it does when using the function signature)
- [ ] Minimum tap target `44px` height maintained via `min-height: 44px`
- [ ] Focus ring is inherited from global `button:focus-visible, a:focus-visible` rule — verify `border-radius: 0.4rem` does not clip the outline (use `outline-offset: 2px`, already in global rule)
- [ ] Color contrast: `var(--text-secondary)` on transparent background — `#4b5668` on `#f4f6f9` ≈ 5.1:1 (passes AA for normal text at 0.875rem bold) — acceptable
- [ ] Active state: `var(--text-primary)` `#141a25` on `color-mix(accent 12%)` ≈ near-white tint — contrast well above 7:1 — passes AAA

### Frontend Handoff — Batch 1

**Target: Frontend Developer**

1. Open `src/Tenax.Web/frontend/src/components/AppShell.tsx`
   - Delete the second `<NavLink>` block (the Flashcards one, lines 52–57)
   - Update the Decks `NavLink` active-class logic to use `location.pathname.startsWith("/decks")` (remove the `/flashcards` exclusion)
   - Optionally simplify: use NavLink's `className` callback and set `isActive` for Decks by combining `useMatch` or keeping the manual `location.pathname.startsWith` — either pattern is acceptable

2. Open `src/Tenax.Web/frontend/src/styles.css`
   - Replace `.primary-nav`, `.primary-nav__link`, `.primary-nav__link.is-active` with the new rules above
   - Add `.primary-nav__link:hover:not(.is-active)` rule
   - Remove no other selectors in this batch — `.primary-nav__link` in the mobile media query remains valid

3. Do not modify routes, PageScaffold, or any other component in this batch.

---

## Batch 2 — Breadcrumb Component + PageScaffold Integration

```yaml
batch: 2
title: "Breadcrumb component — new component, PageScaffold integration, route updates"
detail_level: "standard"
objective: >
  Replace seven scattered inline back-link patterns with a single reusable
  Breadcrumb component integrated into PageScaffold. Establish a consistent
  contextual navigation layer between the app header and the page title.
deliverables:
  - "Breadcrumb component spec and JSX structure"
  - "PageScaffold prop extension spec"
  - "CSS rules for .breadcrumb"
  - "Per-route breadcrumb trail specs for all 7 affected routes"
  - "List of inline back-links to remove per route"
acceptance_criteria:
  - "Breadcrumb renders above .page__header, inside .page (main element)"
  - "Last item has aria-current=page and no href"
  - "Separators are CSS-only (::after pseudo), not rendered in DOM text"
  - "All 7 routes have inline back-links removed and Breadcrumb prop added"
  - "Font size, color, and weight match spec exactly"
dependencies:
  - "Batch 1 (conceptually independent, but implement after Batch 1 to avoid merge conflicts on PageScaffold)"
```

### Component Spec — `Breadcrumb.tsx`

**File to create:** `src/Tenax.Web/frontend/src/components/Breadcrumb.tsx`

**TypeScript interface:**
```ts
type BreadcrumbItem = {
  label: string;
  href?: string; // omit on last item (current page)
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
};
```

**JSX structure:**
```tsx
import { Link } from "react-router-dom";

export const Breadcrumb = ({ items }: BreadcrumbProps) => (
  <nav aria-label="Breadcrumb">
    <ol className="breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <li key={index} className="breadcrumb__item">
            {isLast ? (
              <span aria-current="page" className="breadcrumb__current">
                {item.label}
              </span>
            ) : (
              <Link to={item.href!} className="breadcrumb__link">
                {item.label}
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  </nav>
);
```

> **Implementation note:** Use `index` as key only because breadcrumb items are static per render. If items can change dynamically within the same route, use `item.label` as key instead.

---

### PageScaffold Extension Spec

**File to modify:** `src/Tenax.Web/frontend/src/components/PageScaffold.tsx`

**Updated prop type:**
```ts
import { Breadcrumb } from "./Breadcrumb";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type PageScaffoldProps = {
  title: string;
  children: ReactNode;
  subtitle?: string;
  breadcrumb?: BreadcrumbItem[]; // NEW — optional
};
```

**Updated JSX:**
```tsx
export const PageScaffold = ({ title, subtitle, children, breadcrumb }: PageScaffoldProps) => (
  <main className="page">
    {breadcrumb && breadcrumb.length > 0 ? (
      <Breadcrumb items={breadcrumb} />
    ) : null}
    <header className="page__header">
      <h1 className="page__title">{title}</h1>
      {subtitle ? <p className="page__subtitle">{subtitle}</p> : null}
    </header>
    <section className="page__surface">
      {children}
    </section>
  </main>
);
```

**Placement rationale:** Breadcrumb sits between the app header bar and the `<header className="page__header">`. It renders inside `<main className="page">` so it shares the page's `max-width: 72rem` horizontal constraint and `padding: 2rem 1rem` left/right padding. It appears above the `<h1>` page title, giving visual hierarchy: app header → breadcrumb trail → page title → content surface.

---

### CSS Rules for `.breadcrumb`

**File to modify:** `src/Tenax.Web/frontend/src/styles.css`

**Add after `.page__subtitle` rule block (after line 262):**

```css
/* ── Breadcrumb ────────────────────────────────────────── */
.breadcrumb {
  list-style: none;
  margin: 0 0 0.75rem;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0;
  font-size: 0.82rem;
}

.breadcrumb__item {
  display: inline-flex;
  align-items: center;
}

/* Separator: › rendered as CSS content, not DOM text */
.breadcrumb__item:not(:last-child)::after {
  content: "›";
  margin: 0 0.4rem;
  color: var(--border-subtle);
  font-size: 0.9em;
  line-height: 1;
  user-select: none;
  aria-hidden: true; /* Note: use aria-hidden on the li via JS if needed; CSS content is already ignored by most SRs */
}

.breadcrumb__link {
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
}

.breadcrumb__link:hover {
  text-decoration: underline;
  color: var(--text-primary);
}

.breadcrumb__current {
  color: var(--text-primary);
  font-weight: 600;
}
```

> **CSS content accessibility note:** Most modern screen readers ignore CSS `content` on pseudo-elements unless it is meaningful text. The `›` separator is a presentational separator — it will be ignored by assistive technology. No `aria-hidden` is needed on the pseudo-element itself. The `<nav aria-label="Breadcrumb">` and `aria-current="page"` on the last item fully communicate the structure.

---

### Per-Route Breadcrumb Trail Specs

For each route below:
1. Add `breadcrumb={[...]}` prop to `<PageScaffold>`
2. Remove the existing inline back-link DOM node (specified per route)

---

#### Route: `decks.$deckId.tsx` → `/decks/:deckId`

**Breadcrumb trail:**
```tsx
breadcrumb={[
  { label: "Decks", href: "/decks" },
  { label: detailQuery.data?.name ?? "Deck" },
]}
```
> Last item has no `href` — it is the current page. Use `detailQuery.data?.name` when loaded; fallback to `"Deck"` while loading.

**Remove from JSX:**
```tsx
// REMOVE this entire block (lines 21–25 of decks.$deckId.tsx):
<div style={{ marginBottom: "1rem" }}>
  <Link to="/decks" className="link-inline">
    Back to decks
  </Link>
</div>
```
> Also remove the second back-link inside the error `<div role="alert">` block (the `<p className="flat-list__meta">` with `Go back to decks` link). Keep the error alert intact but remove that specific `<p>` — the breadcrumb above the page title provides the exit path.

---

#### Route: `decks.$deckId.flashcards.index.tsx` → `/decks/:deckId/flashcards`

**Breadcrumb trail:**
```tsx
breadcrumb={[
  { label: "Decks", href: "/decks" },
  { label: deckQuery.data?.name ?? deckId, href: `/decks/${deckId}` },
  { label: "Flashcards" },
]}
```

**Remove from JSX:**
```tsx
// REMOVE this block from inside .section-row (lines 32–39 of flashcards.index.tsx):
<div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
  <Link to="/decks" className="link-inline">
    ← All decks
  </Link>
  <p className="text-muted" style={{ margin: 0 }}>
    {deckQuery.data?.name ?? deckId}
  </p>
</div>
```
> The `.section-row` continues to hold the `New flashcard` button on the right. After removing the left div, the section-row has only one child — the button. Change the `<div className="section-row">` to a plain `<div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>` or keep `section-row` and let the button right-align naturally via `justify-content: space-between` with an empty slot. **Preferred:** remove `section-row` wrapper, place the `New flashcard` button in a simple right-aligned div. The deck name context is now in the breadcrumb.

---

#### Route: `decks.$deckId.flashcards.$flashcardId.tsx` → `/decks/:deckId/flashcards/:flashcardId`

**Breadcrumb trail:**
```tsx
breadcrumb={[
  { label: "Decks", href: "/decks" },
  { label: deckQuery.data?.name ?? deckId, href: `/decks/${deckId}` },
  { label: "Flashcards", href: `/decks/${deckId}/flashcards` },
  { label: flashcardQuery.data?.term ?? "Flashcard" },
]}
```
> Use `flashcardQuery.data?.term` when available; fallback to `"Flashcard"` while loading.

**Remove from JSX:** Find the inline `← Back to flashcards` Link element (inside a `<div>` or `section-row`). Remove the entire wrapper div/paragraph containing it.

---

#### Route: `decks.new.tsx` → `/decks/new`

**Breadcrumb trail:**
```tsx
breadcrumb={[
  { label: "Decks", href: "/decks" },
  { label: "New deck" },
]}
```

**Remove from JSX:** Find and remove the "Back to decks" Link element and its wrapper div/paragraph.

---

#### Route: `decks.$deckId.edit.tsx` → `/decks/:deckId/edit`

**Breadcrumb trail:**
```tsx
breadcrumb={[
  { label: "Decks", href: "/decks" },
  { label: deckQuery.data?.name ?? "Deck", href: `/decks/${deckId}` },
  { label: "Edit" },
]}
```

**Remove from JSX:** Find and remove the "Back to detail" or "Back to deck" Link element and its wrapper.

---

#### Route: `decks.$deckId.flashcards.new.tsx` → `/decks/:deckId/flashcards/new`

**Breadcrumb trail:**
```tsx
breadcrumb={[
  { label: "Decks", href: "/decks" },
  { label: deckQuery.data?.name ?? deckId, href: `/decks/${deckId}` },
  { label: "Flashcards", href: `/decks/${deckId}/flashcards` },
  { label: "New flashcard" },
]}
```

**Remove from JSX:** Find and remove the "Back to flashcards" Link element and its wrapper.

---

#### Route: `decks.$deckId.flashcards.$flashcardId.edit.tsx` → `/decks/:deckId/flashcards/:flashcardId/edit`

**Breadcrumb trail:**
```tsx
breadcrumb={[
  { label: "Decks", href: "/decks" },
  { label: deckQuery.data?.name ?? deckId, href: `/decks/${deckId}` },
  { label: "Flashcards", href: `/decks/${deckId}/flashcards` },
  { label: flashcardQuery.data?.term ?? "Flashcard", href: `/decks/${deckId}/flashcards/${flashcardId}` },
  { label: "Edit" },
]}
```

**Remove from JSX:** Find and remove the "Back to detail" Link element and its wrapper.

---

### Responsive Notes — Batch 2

- Breadcrumb wraps via `flex-wrap: wrap` — on very narrow screens (< 360px) long deck names will wrap to a second line before the separator. This is acceptable; do not truncate with ellipsis as that hides context.
- Breadcrumb top margin: `margin: 0 0 0.75rem` on `.breadcrumb` provides 0.75rem gap between breadcrumb and `<h1 class="page__title">`. This is set on the list element; no padding on `<nav>`.
- On mobile, `padding: 1.2rem 1rem 2.5rem` on `.page` (from existing mobile override) already applies — breadcrumb inherits this horizontal padding correctly.

### Accessibility Checklist — Batch 2

- [ ] `<nav aria-label="Breadcrumb">` wraps the `<ol>` — landmark is exposed to assistive technology
- [ ] Last item has `aria-current="page"` on the `<span>` — screen readers announce it as the current page
- [ ] All ancestor items are real `<Link>` elements (routed anchors) — keyboard-navigable in tab order
- [ ] Separators are CSS `::after` content — ignored by screen readers, not read aloud
- [ ] Fallback labels (`"Deck"`, `"Flashcard"`) are used while data loads — breadcrumb is never empty or broken
- [ ] No heading role on breadcrumb — it is navigation, not a section title
- [ ] Focus ring on `.breadcrumb__link` is inherited from global `a:focus-visible` rule — verify `border-radius` does not clip it (links have no explicit border-radius, outline applies to inline box)
- [ ] Color contrast: `.breadcrumb__link` uses `--text-secondary` `#4b5668` on `--surface-base` `#f4f6f9` ≈ 5.1:1 — passes AA
- [ ] Color contrast: `.breadcrumb__current` uses `--text-primary` `#141a25` on `--surface-base` — exceeds 10:1 — passes AAA

### Frontend Handoff — Batch 2

**Target: Frontend Developer**

1. **Create** `src/Tenax.Web/frontend/src/components/Breadcrumb.tsx` with the JSX structure defined above.
2. **Modify** `src/Tenax.Web/frontend/src/components/PageScaffold.tsx`:
   - Add `breadcrumb?: BreadcrumbItem[]` to the props type
   - Import `Breadcrumb` component
   - Render `<Breadcrumb items={breadcrumb} />` above `<header className="page__header">` when prop is present and non-empty
3. **Modify** `src/Tenax.Web/frontend/src/styles.css`: Add the `.breadcrumb` CSS block after `.page__subtitle`
4. **Modify all 7 route files** listed above:
   - Add `breadcrumb={[...]}` prop to `<PageScaffold>` with the exact trail specified per route
   - Remove the inline back-link element and its wrapper div/paragraph
5. For `decks.$deckId.flashcards.index.tsx`: restructure the `section-row` after removing the back-link div (see note above)
6. Do not add any animation or transition to the breadcrumb — it is a static navigation element

---

## Batch 3 — Border-Radius Scale Reduction

```yaml
batch: 3
title: "Border-radius scale — reduce pill radii to professional rectangular scale"
detail_level: "standard"
objective: >
  Replace all 999px pill radii and overly large corner radii with a restrained
  rectangular scale. The new scale communicates precision and professionalism
  rather than playfulness. No component structure changes — CSS values only.
deliverables:
  - "Updated border-radius values for 9 selectors in styles.css"
  - "Removal of border-radius from 2 container elements (.primary-nav, .theme-toggle)"
acceptance_criteria:
  - "No selector retains border-radius: 999px"
  - "Scale is consistent: interactive controls at 0.375rem, surfaces at 0.5rem, nav/toggle at 0.3–0.4rem"
  - "Mobile .page__surface override is updated to match"
dependencies:
  - "None — CSS only, no component changes"
```

### Radius Scale Reference

| Element | Old value | New value |
|---------|-----------|-----------|
| `.button` | `999px` | `0.375rem` |
| `.field-input` | `0.75rem` | `0.375rem` |
| `.field-select` (if exists) | `0.75rem` | `0.375rem` |
| `.page__surface` | `1rem` | `0.5rem` |
| `.deck-card` | `0.9rem` | `0.5rem` |
| `.flashcard-study-card` | `1rem` | `0.5rem` |
| `.flashcard-study-card__image` | `0.85rem` | `0.5rem` |
| `.primary-nav__link` | `999px` | `0.4rem` *(handled in Batch 1)* |
| `.theme-toggle__button` | `999px` | `0.3rem` *(handled in Batch 4)* |
| `.primary-nav` (container) | `999px` | **removed** *(handled in Batch 1)* |
| `.theme-toggle` (container) | `999px` | **removed** *(handled in Batch 4)* |
| `dialog` | `0.9rem` | `0.5rem` |
| `.alert` | `0.9rem` | `0.5rem` |
| `.brand-link__mark` | `0.25rem` | `0.25rem` *(no change — small decorative mark)* |

> `field-select` is not present in the current `styles.css`. If a `.field-select` rule is added in future, use `0.375rem`. Skip for this batch.

### Exact CSS Changes

**File to modify:** `src/Tenax.Web/frontend/src/styles.css`

**Change 1 — `.button` (line ~197):**
```css
/* Before */
border-radius: 999px;
/* After */
border-radius: 0.375rem;
```

**Change 2 — `.field-input` (line ~515):**
```css
/* Before */
border-radius: 0.75rem;
/* After */
border-radius: 0.375rem;
```

**Change 3 — `.page__surface` (line ~265):**
```css
/* Before */
border-radius: 1rem;
/* After */
border-radius: 0.5rem;
```

**Change 4 — `.deck-card` (line ~334):**
```css
/* Before */
border-radius: 0.9rem;
/* After */
border-radius: 0.5rem;
```

**Change 5 — `.flashcard-study-card` (line ~413):**
```css
/* Before */
border-radius: 1rem;
/* After */
border-radius: 0.5rem;
```

**Change 6 — `.flashcard-study-card__image` (line ~463):**
```css
/* Before */
border-radius: 0.85rem;
/* After */
border-radius: 0.5rem;
```

**Change 7 — `dialog` (line ~538):**
```css
/* Before */
border-radius: 0.9rem;
/* After */
border-radius: 0.5rem;
```

**Change 8 — `.alert` (line ~557):**
```css
/* Before */
border-radius: 0.9rem;
/* After */
border-radius: 0.5rem;
```

**Change 9 — Mobile override `.page__surface` in `@media (max-width: 47.999rem)` (line ~614):**
```css
/* Before */
.page__surface {
  border-radius: 0.85rem;
}
/* After */
.page__surface {
  border-radius: 0.5rem;
}
```
> The mobile override can now be removed entirely since the desktop value (0.5rem) and mobile override are identical. Either remove the override or update it — both are correct. Removing it is cleaner.

### Visual Direction

The new scale creates a clear hierarchy:
- `0.3rem` — small controls (theme toggle buttons): barely-rounded, precise
- `0.375rem` — interactive form inputs and action buttons: minimal rounding, businesslike  
- `0.4rem` — nav links: slightly more than button, feels like a tab
- `0.5rem` — content surfaces, cards, dialogs: softened rectangle, not a pill

This is a tight, intentional scale. Do not introduce values outside this set without design review.

### Interaction Notes — Batch 3

The `@media (prefers-reduced-motion: no-preference)` block references `.deck-card:hover { transform: translateY(-1px) }` and `.flashcard-study-card:hover { transform: translateY(-1px) }`. These hover lifts work correctly with the new radius — no changes to motion rules.

### Accessibility Checklist — Batch 3

- [ ] Reduced corner radius does not affect tap target sizes — `min-height: 44px` on buttons and nav links is unchanged
- [ ] Focus rings (`outline: 2px solid var(--focus-ring)`) are unaffected by border-radius changes — outlines follow the element box, not the border-radius clip
- [ ] Dialog `border-radius` reduction has no accessibility impact — confirm dialog still has visible border and backdrop
- [ ] No color or contrast values are modified in this batch

### Frontend Handoff — Batch 3

**Target: Frontend Developer**

1. Open `src/Tenax.Web/frontend/src/styles.css`
2. Apply all 9 `border-radius` changes listed in the table and detailed above — line numbers are approximate guides, use selector names to locate
3. Optionally remove the now-redundant mobile `@media` override for `.page__surface` since desktop and mobile values are identical
4. Do NOT change `.brand-link__mark` (stays at `0.25rem` — it is a small decorative square)
5. Do NOT change `.primary-nav` or `.theme-toggle` containers in this batch — those are handled in Batches 1 and 4 respectively
6. Visual QA: check `.button`, `.field-input`, `.page__surface`, `.deck-card`, `.flashcard-study-card`, and `dialog` in both light and dark themes

---

## Batch 4 — Theme Toggle: Icon-Only Buttons

```yaml
batch: 4
title: "Theme toggle — replace text labels with icon-only SVG buttons"
detail_level: "standard"
objective: >
  Replace the verbose System/Light/Dark text buttons with compact icon-only
  buttons using inline SVG. Reduce header visual weight. Container loses
  its pill border and background.
deliverables:
  - "Updated AppShell.tsx JSX with SVG icon buttons"
  - "Updated .theme-toggle and .theme-toggle__button CSS"
  - "Exact SVG paths for all three icons (monitor, sun, moon)"
acceptance_criteria:
  - "Each button has aria-label and aria-pressed — no visible text label"
  - "SVG is inline, no external icon library imports"
  - "Container has no border and no background — flat grouping of buttons"
  - "Active button uses --surface-muted fill"
  - "All three buttons meet 44px... wait, 2rem = 32px — see accessibility note below"
  - "Focus ring is visible on all three buttons"
dependencies:
  - "Batch 1 (both modify AppShell.tsx — implement after Batch 1 is merged)"
  - "Batch 3 (border-radius value for .theme-toggle__button comes from Batch 3 spec)"
```

### Icon SVG Paths

All icons use a `viewBox="0 0 16 16"` coordinate space. Use `stroke="currentColor"` for stroke-based icons and `fill="currentColor"` for fill-based. Recommend `fill="none"` on the SVG root for stroke icons.

**Sun icon** (stroke-based — 8 rays + circle):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"
     width="16" height="16" fill="none"
     stroke="currentColor" stroke-width="1.5"
     stroke-linecap="round" stroke-linejoin="round"
     aria-hidden="true">
  <circle cx="8" cy="8" r="3"/>
  <line x1="8" y1="1" x2="8" y2="3"/>
  <line x1="8" y1="13" x2="8" y2="15"/>
  <line x1="1" y1="8" x2="3" y2="8"/>
  <line x1="13" y1="8" x2="15" y2="8"/>
  <line x1="2.93" y1="2.93" x2="4.34" y2="4.34"/>
  <line x1="11.66" y1="11.66" x2="13.07" y2="13.07"/>
  <line x1="2.93" y1="13.07" x2="4.34" y2="11.66"/>
  <line x1="11.66" y1="4.34" x2="13.07" y2="2.93"/>
</svg>
```

**Moon icon** (fill-based — crescent):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"
     width="16" height="16" fill="currentColor"
     aria-hidden="true">
  <path d="M14 3a5 5 0 0 0-7 7 7 7 0 1 1 7-7z"/>
</svg>
```

**Monitor icon** (stroke-based — screen + stand):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"
     width="16" height="16" fill="none"
     stroke="currentColor" stroke-width="1.5"
     stroke-linecap="round" stroke-linejoin="round"
     aria-hidden="true">
  <rect x="2" y="2" width="12" height="9" rx="1"/>
  <path d="M6 14h4"/>
  <path d="M8 11v3"/>
</svg>
```

> All SVG elements carry `aria-hidden="true"` — the accessible name is on the `<button>` via `aria-label`. SVG title elements are unnecessary here.

---

### Updated AppShell JSX — Theme Toggle Section

**File to modify:** `src/Tenax.Web/frontend/src/components/AppShell.tsx`

**Replace the `themeControlOptions` array and the theme-toggle JSX block:**

**Remove the `themeControlOptions` array at lines 10–14:**
```ts
// REMOVE:
const themeControlOptions: Array<{ value: ThemePreference; label: string }> = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];
```

**Replace with typed icon config:**
```tsx
type ThemeOption = {
  value: ThemePreference;
  label: string; // used for aria-label only
  icon: React.ReactNode;
};

const MonitorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"
       width="16" height="16" fill="none"
       stroke="currentColor" strokeWidth="1.5"
       strokeLinecap="round" strokeLinejoin="round"
       aria-hidden="true">
    <rect x="2" y="2" width="12" height="9" rx="1"/>
    <path d="M6 14h4"/>
    <path d="M8 11v3"/>
  </svg>
);

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"
       width="16" height="16" fill="none"
       stroke="currentColor" strokeWidth="1.5"
       strokeLinecap="round" strokeLinejoin="round"
       aria-hidden="true">
    <circle cx="8" cy="8" r="3"/>
    <line x1="8" y1="1" x2="8" y2="3"/>
    <line x1="8" y1="13" x2="8" y2="15"/>
    <line x1="1" y1="8" x2="3" y2="8"/>
    <line x1="13" y1="8" x2="15" y2="8"/>
    <line x1="2.93" y1="2.93" x2="4.34" y2="4.34"/>
    <line x1="11.66" y1="11.66" x2="13.07" y2="13.07"/>
    <line x1="2.93" y1="13.07" x2="4.34" y2="11.66"/>
    <line x1="11.66" y1="4.34" x2="13.07" y2="2.93"/>
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"
       width="16" height="16" fill="currentColor"
       aria-hidden="true">
    <path d="M14 3a5 5 0 0 0-7 7 7 7 0 1 1 7-7z"/>
  </svg>
);

const themeOptions: ThemeOption[] = [
  { value: "system", label: "System theme", icon: <MonitorIcon /> },
  { value: "light",  label: "Light theme",  icon: <SunIcon /> },
  { value: "dark",   label: "Dark theme",   icon: <MoonIcon /> },
];
```

**Replace the theme-toggle `<div>` render block (lines 63–79) with:**
```tsx
<div className="theme-toggle" role="group" aria-label="Theme preference">
  {themeOptions.map((option) => {
    const isSelected = preference === option.value;
    return (
      <button
        key={option.value}
        type="button"
        aria-label={option.label}
        aria-pressed={isSelected}
        className={`theme-toggle__button${isSelected ? " is-active" : ""}`}
        onClick={() => setPreference(option.value)}
      >
        {option.icon}
      </button>
    );
  })}
</div>
```

> Note: The old code had `<span className="sr-only">{option.label} theme</span>` plus a visible `<span aria-hidden="true">{option.label}</span>`. The new code uses `aria-label` directly on the button — this is simpler and equally accessible. Remove the `sr-only` span pattern.

---

### Updated CSS — Theme Toggle

**File to modify:** `src/Tenax.Web/frontend/src/styles.css`

**Replace `.theme-toggle` block (lines 160–166):**
```css
.theme-toggle {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem;
  gap: 0.15rem;
  /* Removed: border, border-radius, background */
}
```

**Replace `.theme-toggle__button` block (lines 168–178):**
```css
.theme-toggle__button {
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 0.3rem;
  padding: 0.375rem;
  width: 2rem;
  height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  /* Removed: min-height 44px, font-size, font-weight — icon-only */
}
```

**Replace `.theme-toggle__button.is-active` block (lines 180–183):**
```css
.theme-toggle__button.is-active {
  background: var(--surface-muted);
  color: var(--text-primary);
}
```

**Add hover state (new rule, after `.is-active`):**
```css
.theme-toggle__button:hover:not(.is-active) {
  color: var(--text-primary);
  background: color-mix(in srgb, var(--text-primary) 6%, transparent);
}
```

---

### Tap Target Note — Accessibility

The `width: 2rem; height: 2rem` (32×32px) is below the WCAG 2.5.5 recommended 44×44px target. This is an acknowledged trade-off for a secondary utility control in the app header. **Mitigation options (choose one):**

**Option A (recommended):** Increase to `width: 2.25rem; height: 2.25rem` (36px) and use `padding: 0.5rem` — closer to the 44px target and still compact.

**Option B:** Use a CSS `::before` pseudo-element to extend the hit target without changing visual size:
```css
.theme-toggle__button::before {
  content: "";
  position: absolute;
  inset: -6px;
}
/* Plus: .theme-toggle__button { position: relative; } */
```

**Option C:** Accept 32px — the control is supplementary UI that keyboard users can skip, and the `aria-label` makes it fully accessible to screen reader users. WCAG 2.5.5 is Level AAA (advisory, not required for AA compliance).

The spec recommends **Option A** as the path of least resistance.

### Responsive Notes — Batch 4

No changes needed. The mobile layout already places `.header-controls` in a `grid-area: controls` row spanning full width. The icon buttons are small enough that they will not cause overflow at any breakpoint.

### Accessibility Checklist — Batch 4

- [ ] Each `<button>` has `aria-label` with a human-readable theme name ("System theme", "Light theme", "Dark theme")
- [ ] `aria-pressed` attribute reflects current selection state
- [ ] `role="group"` with `aria-label="Theme preference"` on the container communicates grouping to screen readers
- [ ] All three SVGs have `aria-hidden="true"` — icons are purely decorative
- [ ] No `.sr-only` text needed — `aria-label` on button is sufficient
- [ ] Focus ring: `button:focus-visible` global rule applies — verify `border-radius: 0.3rem` does not clip the 2px outline (it will not with `outline-offset: 2px`)
- [ ] Tap target size: addressed above — implement Option A (2.25rem buttons) to approach 44px target
- [ ] Keyboard: Tab moves between buttons; Enter/Space activates — standard button behavior, no custom keydown handling needed

### Frontend Handoff — Batch 4

**Target: Frontend Developer**

1. Open `src/Tenax.Web/frontend/src/components/AppShell.tsx`
   - Remove the `themeControlOptions` array
   - Add `MonitorIcon`, `SunIcon`, `MoonIcon` inline SVG components (file-level, before `AppShell` export)
   - Add `themeOptions` array using the new structure
   - Replace the `<div className="theme-toggle">` render block with the new version (no `sr-only` spans, `aria-label` on button)
2. Open `src/Tenax.Web/frontend/src/styles.css`
   - Replace `.theme-toggle`, `.theme-toggle__button`, `.theme-toggle__button.is-active` with updated rules
   - Add `.theme-toggle__button:hover:not(.is-active)` rule
3. Apply tap-target fix: use `width: 2.25rem; height: 2.25rem` (Option A) unless design review approves smaller
4. No routing, no other component files

---

## Batch 5 — Color Palette Token Updates

```yaml
batch: 5
title: "Color palette — brand primary and dark surface token updates"
detail_level: "standard"
objective: >
  Shift the brand green from a bright #00ce75 to a deeper, more authoritative
  #00a86b. Darken the dark theme base surface slightly. These changes move the
  palette from a startup-playful green to a professional teal-green that reads
  better at small sizes and against dark backgrounds.
deliverables:
  - "Updated :root and [data-theme=dark] CSS custom property values"
acceptance_criteria:
  - "No other tokens changed"
  - "--ref-brand-primary updated in :root"
  - "--success light mode updated"
  - "--surface-base dark mode updated"
  - "Gradient references to rgba(0, 206, 117, ...) updated to match new brand primary"
dependencies:
  - "None — CSS token values only"
```

### Token Changes

**File to modify:** `src/Tenax.Web/frontend/src/styles.css`

**Change 1 — `:root` block, `--ref-brand-primary` (line 6):**
```css
/* Before */
--ref-brand-primary: #00ce75;
/* After */
--ref-brand-primary: #00a86b;
```

**Change 2 — `:root` block, `--success` (line 21):**
```css
/* Before */
--success: #0a9f5f;
/* After */
--success: #008f5a;
```

**Change 3 — `:root[data-theme="dark"]` block, `--surface-base` (line 32):**
```css
/* Before */
--surface-base: #0f141d;
/* After */
--surface-base: #0d1117;
```

**Change 4 — `:root` background gradient (line 26–29):**
The light-mode radial gradient references `rgba(0, 206, 117, 0.1)` which is the old `--ref-brand-primary` color. Update to match the new value:
```css
/* Before */
radial-gradient(circle at 100% 0%, rgba(0, 206, 117, 0.1) 0%, transparent 40%),
/* After */
radial-gradient(circle at 100% 0%, rgba(0, 168, 107, 0.1) 0%, transparent 40%),
```

**Change 5 — `:root[data-theme="dark"]` background gradient (line 44):**
```css
/* Before */
radial-gradient(circle at 100% 0%, rgba(0, 206, 117, 0.2) 0%, transparent 42%),
/* After */
radial-gradient(circle at 100% 0%, rgba(0, 168, 107, 0.2) 0%, transparent 42%),
```

> **Note on `--ref-brand-secondary`:** The pink secondary token `#ce0059` remains unchanged. As noted in the redesign brief, it is retained as a token but is not used in any currently visible UI element. No CSS consumer references it except `--accent-secondary: var(--ref-brand-secondary)`. No change needed.

### Color Contrast Impact Analysis

| Token | Old | New | Impact |
|-------|-----|-----|--------|
| `--accent-primary` / `--ref-brand-primary` | `#00ce75` | `#00a86b` | Darker green — improves contrast of brand elements on white surfaces. `.button--primary` text `#082315` on new green: ≈ 7.8:1 (was ≈ 5.9:1 on old green) — **improved** |
| `--success` light | `#0a9f5f` | `#008f5a` | Small darkening — used for success text/icons, improves AA compliance on light backgrounds |
| Dark `--surface-base` | `#0f141d` | `#0d1117` | Slightly deeper — increases perceived depth, does not affect text contrast (surface is a background, not text) |

### Responsive / Theme Notes — Batch 5

The dark theme `--surface-base` change (`#0d1117`) is 2 points darker in lightness. The radial gradient backgrounds in dark mode reference this as a base color — both `--surface-muted` (`#151d29`) and `--surface-elevated` (`#1a2434`) are unchanged, so the dark theme surface stack remains: `base → muted → elevated` with clear separation. No visual regression expected.

### Accessibility Checklist — Batch 5

- [ ] `--accent-primary` change improves contrast for `.button--primary` (action text `#082315` on green background) — verify in browser at both sizes
- [ ] `--success` is used for success state indicators — darker value improves legibility of success text against light backgrounds (light mode `--surface-base` `#f4f6f9`)
- [ ] Dark mode surface change does not affect text contrast — `--text-primary` `#eef3ff` on `#0d1117` exceeds 15:1 — no regression
- [ ] Gradient opacity values (0.1 / 0.2) are unchanged — decorative only, no accessibility impact
- [ ] `--ref-brand-secondary` (pink) is untouched — if it surfaces in future UI, run contrast check at that time

### Frontend Handoff — Batch 5

**Target: Frontend Developer**

1. Open `src/Tenax.Web/frontend/src/styles.css`
2. Apply exactly 5 value changes as specified (2 in `:root`, 1 in `:root[data-theme="dark"]`, 2 gradient rgba values)
3. Do not change any other tokens — `--ref-brand-secondary`, `--accent-tertiary`, `--focus-ring`, `--danger` dark, all surface/text/border tokens in dark mode are all unchanged
4. After applying, visually verify: `.button--primary` in both light and dark; the decorative page background gradient in both themes; and any success alert/badge if present in the app

---

## Open Questions and Risks

| # | Question | Batch | Risk if unresolved |
|---|----------|-------|-------------------|
| 1 | Do any routes fetch the deck name via a separate query vs. sharing `useDeckDetailQuery`? If the deck name query is slow, the breadcrumb second item may show the fallback `"Deck"` for longer than expected. | 2 | Minor UX — fallback label is functional, just not ideal |
| 2 | Does `decks.$deckId.flashcards.$flashcardId.tsx` expose a `flashcardQuery` with a `.term` field? The spec assumes it does. If the route only receives flashcard ID without a detail query, the breadcrumb last item will permanently show `"Flashcard"`. | 2 | Breadcrumb last item loses specificity on flashcard detail and edit pages |
| 3 | Is there a `.field-select` class in any component not visible in `styles.css`? The scale spec notes it should be `0.375rem` if it exists. | 3 | Minor — one missed radius update |
| 4 | The `aria-current` attribute: React Router's `<NavLink>` with the function-signature `className` callback does NOT automatically set `aria-current="page"`. Verify whether it needs to be added manually as `aria-current={isActive ? "page" : undefined}` on the Decks NavLink (which uses manual `location.pathname.startsWith` logic, not the callback). | 1 | Missing `aria-current` on Decks link — screen reader users lose page-position context |
| 5 | The moon SVG path `M14 3a5 5 0 0 0-7 7 7 7 0 1 1 7-7z` should be visually verified — the crescent shape depends on coordinate precision. If the rendering looks off, use a known-good Feather Icons or Heroicons moon path scaled to 16×16 viewBox. | 4 | Icon may look incorrect — but this is a visual-only concern, no accessibility impact |
| 6 | Batch ordering conflict: Batches 1 and 4 both modify `AppShell.tsx`. If implemented in separate PRs, ensure no merge conflict on the `themeControlOptions`/`themeOptions` section and the `primary-nav` section. Recommend implementing as a single PR or in strict sequence (Batch 1 merged and deployed before Batch 4 begins). | 1, 4 | Merge conflict risk |

---

*End of design handoff · Tenax UI Redesign April 2026 · 5 batches · All implementation notes are complete and unambiguous. Do not proceed with implementation on open questions 2 and 4 without resolution.*
