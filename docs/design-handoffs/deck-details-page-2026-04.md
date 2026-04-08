# Design Handoff — Deck Details Page Enhancement (April 2026)

> **Produced by:** Design Handoff agent
> **Target audience:** Frontend Developer
> **Template version:** design-handoff-batch-template v1
> **Repo root:** `src/Tenax.Web/frontend/src`
> **Related ADR:** `docs/adr/0018-deck-details-page-enhancement.md`
> **Related issue:** GitHub Issue #3
> **Total batches:** 3

---

## Design Summary

This handoff covers three focused enhancements to the Deck Details page and its associated forms,
all implemented entirely in the frontend. No new API endpoints, hooks, or backend contracts are
required. The three batches are independent enough to be implemented sequentially or in parallel;
however, the recommended order is **Batch 1 → Batch 2 → Batch 3** as Batch 1 is the smallest
atomic change and creates an implementable warm-up, while Batch 3 carries the most state-machine
complexity and benefits from the developer already being oriented inside `DeckDetailRoute`.

**Batch 1** adds an opt-in Cancel button to `DeckForm` and `FlashcardForm`. It is a pure component
API extension — backward-compatible, no route changes.

**Batch 2** embeds a paginated flashcard preview section inside `DeckDetailRoute`, reusing existing
query hooks and the established `.flat-list` / `.flat-list__item` pattern from `FlashcardListRoute`.

**Batch 3** wires up an inline delete-deck confirmation flow inside `DeckDetailRoute` using a local
state machine (idle → confirming → deleting → success/error), consistent with the existing
flashcard delete pattern but without a `<dialog>` element — all markup renders inline in the page.

---

## Batch Plan

| # | Title | Files affected | Can parallelise? |
|---|-------|---------------|-----------------|
| 1 | Cancel Button on DeckForm and FlashcardForm | `DeckForm.tsx`, `FlashcardForm.tsx`, `decks.$deckId.edit.tsx`, `decks.$deckId.flashcards.$flashcardId.edit.tsx`, `decks.$deckId.flashcards.new.tsx` | Yes — no dependencies on Batch 2 or 3 |
| 2 | Embedded Flashcard Preview on Deck Detail | `decks.$deckId.tsx`, `styles.css` | Yes — no dependency on Batch 1 or 3 |
| 3 | Inline Delete Deck Confirmation | `decks.$deckId.tsx` | Depends on Batch 2 only if implementing both in the same file editing session; logically independent |

---

## Batch 1 — Cancel Button on DeckForm and FlashcardForm

```yaml
batch: 1
title: "Cancel Button on DeckForm and FlashcardForm"
detail_level: "standard"
objective: >
  Extend DeckForm and FlashcardForm with an optional onCancel prop that, when provided,
  renders a Cancel button alongside the existing submit button. The button is a plain
  client-side action — no confirmation, no mutation, no dirty-field guard. This prop
  is then wired at the route level for DeckEditRoute, FlashcardEditRoute, and
  FlashcardCreateRoute, giving users a clear escape hatch back to their previous context.
deliverables:
  - "Updated DeckFormProps type: optional onCancel prop"
  - "Updated FlashcardFormProps type: optional onCancel prop"
  - "Revised form button row layout using .section-row wrapper in both components"
  - "Cancel button visual spec (button--ghost, label 'Cancel')"
  - "Route-level onCancel wiring spec for all three affected routes"
  - "Responsive button stack spec for narrow viewports"
acceptance_criteria:
  - "Cancel button renders only when onCancel prop is provided; existing consumers without the prop are unaffected"
  - "Cancel button uses button--ghost class; submit button remains button--primary"
  - "Button label is exactly 'Cancel' — not 'Go back', not 'Discard'"
  - "Clicking Cancel calls onCancel() immediately with no confirmation step"
  - "Both buttons are in a .section-row wrapper with justify-content: flex-start"
  - "On viewports ≤ 480px, the button row stacks vertically and both buttons stretch to full width"
  - "Submit button appears first in DOM order (left on desktop, top on mobile)"
  - "Both buttons meet 44px minimum touch target height (already enforced by .button class)"
dependencies:
  - "None — self-contained component API extension"
```

### Visual Direction

```yaml
visual_direction:
  mood: "Functional, low-friction — Cancel should feel safe and clearly secondary"
  constraints:
    - "Do not introduce any new CSS classes for this batch; .button--ghost already provides the correct visual hierarchy"
    - "Cancel must not use red/danger color — it is a neutral navigation action, not a destructive one"
    - "Visual weight ratio: submit (filled green) vs cancel (ghost bordered) makes the primary action dominant at a glance"
```

### Layout Blueprint

**Form button row — current state (both forms):**
```
<button type="submit" class="button button--primary">Save / Create</button>
```
↓ no wrapper, single button

**Target state:**
```
<div class="section-row" style="justify-content: flex-start; gap: 0.6rem; flex-wrap: wrap;">
  <button type="submit" class="button button--primary" disabled={submitDisabled}>
    {isSubmitting ? "Saving..." : submitLabel}
  </button>
  {onCancel ? (
    <button type="button" class="button button--ghost" onClick={onCancel} disabled={isSubmitting}>
      Cancel
    </button>
  ) : null}
</div>
```

**Section-row context:**
- The `.section-row` class provides `display: flex; align-items: center; gap: 0.7rem; flex-wrap: wrap`
- Override `justify-content` to `flex-start` via inline style (consistent with existing action rows on the detail page)
- Override `gap` to `0.6rem` via inline style (matching the existing deck detail action row gap)

**DOM order rule:** Submit button must appear first in the DOM. On desktop it reads left-to-right
as `[Save] [Cancel]`; on mobile the stack order becomes `[Save] ↓ [Cancel]`, which preserves
the primary action at the top.

**Cancel button disabled rule:** Cancel is disabled (`disabled={isSubmitting}`) while the form
is submitting to prevent navigation away mid-request. This matches the existing pattern for
submit-in-progress states.

### Route-Level Wiring

| Route file | Component | onCancel navigate target |
|-----------|-----------|------------------------|
| `routes/decks.$deckId.edit.tsx` | `DeckForm` | `navigate(\`/decks/${deckId}\`)` |
| `routes/decks.$deckId.flashcards.$flashcardId.edit.tsx` | `FlashcardForm` | `navigate(\`/decks/${deckId}/flashcards/${flashcardId}\`)` |
| `routes/decks.$deckId.flashcards.new.tsx` | `FlashcardForm` | `navigate(\`/decks/${deckId}\`)` |

Each route obtains `navigate` from `useNavigate()` and passes it as `onCancel={() => navigate(target)}`.

### Style Tokens

```yaml
style_tokens:
  color:
    - "Submit: background var(--accent-primary), text #082315 (existing .button--primary)"
    - "Cancel: background transparent, border var(--border-subtle), text var(--text-primary) (existing .button--ghost)"
    - "Cancel disabled: opacity 0.55 (existing .button:disabled rule)"
  typography:
    - "Both buttons: font-size 0.875rem, font-weight 700 (existing .button rule)"
  spacing:
    - "Button row gap: 0.6rem"
    - "Button padding: 0.6rem 1rem (existing .button rule)"
  shape:
    - "Border radius: 0.375rem (existing .button rule)"
    - "Min-height: 44px (existing .button rule)"
```

### Interaction Notes

```yaml
interaction_notes:
  - "Cancel click: immediately calls onCancel() — no debounce, no async, no confirmation"
  - "Cancel hover: same ghost button hover treatment as all other .button--ghost elements (border-subtle becomes slightly visible via existing CSS)"
  - "Cancel focus-visible: 3px solid var(--focus-ring) outline at 2px offset (existing :focus-visible rule on .button)"
  - "No motion on Cancel click — it is a synchronous navigation action"
  - "isSubmitting=true: both buttons go to opacity 0.55, cursor not-allowed — Cancel is disabled to prevent mid-submit navigation"
```

### Responsive Notes

```yaml
responsive_notes:
  - "Desktop (> 480px): Submit and Cancel sit side-by-side in a flex row, Submit on the left"
  - "Mobile (≤ 480px): flex-wrap already causes wrapping via .section-row; add width: 100% to both buttons via a media query so they stretch full width and stack Submit-above-Cancel"
  - "New CSS rule needed in styles.css:"
  - |
      @media (max-width: 30rem) {
        .form-grid .section-row .button {
          width: 100%;
        }
      }
  - "Rationale: 30rem (480px) matches the point at which the form fields already feel cramped; full-width buttons avoid an awkward partial-width pair"
  - "The Cancel button does not collapse or hide on mobile — both actions must remain accessible at all viewport widths"
```

### Content Notes

```yaml
content_notes:
  - "Button label: 'Cancel' exactly — one word, sentence case, no punctuation"
  - "Submit label: unchanged — controlled by the submitLabel prop passed from each route (e.g. 'Save changes', 'Create deck')"
  - "Saving state label: 'Saving...' — already implemented in both forms; no change required"
  - "Tone: Cancel is neutral and uninstructive by design — it does not tell the user what they are cancelling, which is intentional for reuse across different form contexts"
```

### Accessibility Checklist

```yaml
accessibility_checklist:
  - "Cancel button is type='button' (not type='submit') to prevent accidental form submission"
  - "DOM order is Submit first, Cancel second — screen readers announce the primary action before the escape hatch"
  - "Cancel has no aria-label needed — 'Cancel' is sufficiently descriptive as visible label text in the form context"
  - "Cancel disabled state (during submission) uses the HTML disabled attribute, not aria-disabled, so it is natively excluded from focus and interaction"
  - "Focus order on keyboard tab: last form field → Submit → Cancel (natural DOM order)"
  - "No ARIA live regions needed — Cancel is a navigation action, not an inline state change"
  - "Color: ghost border color var(--border-subtle) meets contrast requirement as a non-text UI boundary; button text var(--text-primary) on transparent background meets contrast"
  - "Reduced-motion: no motion is involved in this batch; no @media (prefers-reduced-motion) rule required"
```

### Frontend Handoff

```yaml
frontend_handoff:
  - "Add optional onCancel?: () => void to DeckFormProps and FlashcardFormProps"
  - "Wrap the existing submit button in a .section-row div with style={{ justifyContent: 'flex-start', gap: '0.6rem' }}"
  - "Conditionally render Cancel button as the second child of that .section-row when onCancel is truthy"
  - "Add the @media (max-width: 30rem) rule for .form-grid .section-row .button { width: 100% } to styles.css"
  - "Wire onCancel at route level in decks.$deckId.edit.tsx, decks.$deckId.flashcards.$flashcardId.edit.tsx, and decks.$deckId.flashcards.new.tsx using useNavigate()"
  - "Do not change any other existing DeckForm or FlashcardForm rendering logic"
  - "Update component tests (DeckForm.test.tsx, FlashcardForm.test.tsx) to cover: Cancel renders when prop is provided, Cancel does not render when prop is absent, Cancel calls onCancel on click, Cancel is disabled when isSubmitting=true"
```

---

## Batch 2 — Embedded Flashcard Preview Section on Deck Detail

```yaml
batch: 2
title: "Embedded Flashcard Preview Section on Deck Detail"
detail_level: "standard"
objective: >
  Add a paginated, server-driven flashcard preview section to DeckDetailRoute, giving
  users an at-a-glance view of their deck content without leaving the detail page.
  The preview is a compact supplement to the full FlashcardListRoute — it reuses
  existing hooks, list item patterns, and pagination controls, and is clearly linked
  back to the full management route.
deliverables:
  - "Section layout spec (placement within DeckDetailRoute article)"
  - "Section heading and separator treatment"
  - "List item spec including hasImage badge design"
  - "Loading state: skeleton rows"
  - "Empty state: message + CTA link"
  - "Error state: .alert with Retry"
  - "Pagination controls layout (Previous / label / Next)"
  - "'View all flashcards →' link placement and treatment"
  - "Responsive stacking spec"
  - "New CSS classes needed in styles.css"
acceptance_criteria:
  - "Preview section renders below the deck metadata + action row within the existing .stack article"
  - "Section heading 'Flashcards' is an <h2> visible to all users and screen readers"
  - "List items reuse .flat-list / .flat-list__item / .flat-list__title / .flat-list__meta classes exactly"
  - "hasImage badge renders as a small tinted pill inline in the meta row when item.hasImage is true"
  - "Loading state renders exactly 3 skeleton rows"
  - "Empty state renders message and an Add flashcard link navigating to /decks/:deckId/flashcards/new"
  - "Error state uses .alert class and includes a Retry button that calls previewQuery.refetch()"
  - "Pagination controls render only when totalCount > 0"
  - "Pagination label format is exactly 'Showing X–Y of Z' (en dash, not hyphen)"
  - "'View all flashcards →' link renders whenever totalCount > 0, navigating to /decks/:deckId/flashcards"
  - "pageSize is hardcoded to 10; page state is local to DeckDetailRoute (useState)"
  - "Preview section does not affect FlashcardListRoute in any way"
dependencies:
  - "useFlashcardListQuery(deckId, page, 10) hook already exists in src/api/flashcards"
  - "Batch 1 is independent — Batches 1 and 2 can be implemented in parallel"
```

### Visual Direction

```yaml
visual_direction:
  mood: "Content-forward, uncluttered — the preview feels like a natural continuation of the deck summary, not a separate widget"
  references:
    - "FlashcardListRoute list rendering (decks.$deckId.flashcards.index.tsx) — reuse the exact same flat-list pattern"
  constraints:
    - "Do not introduce card/box containers around list items — the flat-list with border-top dividers is the established pattern"
    - "The hasImage badge must be visually subtle — it is metadata, not a primary affordance"
    - "Skeleton rows must not use animation by default; animate only if prefers-reduced-motion is not active"
    - "Section heading must not be as large as the page title — it is a subsection label"
```

### Layout Blueprint

**Full DeckDetailRoute content order (after this batch):**

```
<PageScaffold title="{deckName}" ...>
  [Loading / Error states for detailQuery — unchanged]

  <article class="stack" style="gap: 0.8rem">              ← existing article
    <p class="text-muted">{description}</p>                ← existing
    <p class="flat-list__meta">{flashcardCount}</p>         ← existing

    <div class="section-row" style="justify-content: flex-start; gap: 0.6rem">   ← existing actions
      [Study now] [Add flashcards] [Edit deck]
    </div>

    [empty-deck message if flashcardCount === 0 — unchanged]

    ──────────── NEW BELOW THIS LINE ────────────

    <section aria-labelledby="preview-heading" class="flashcard-preview">

      <div class="section-row flashcard-preview__header">
        <h2 id="preview-heading" class="flashcard-preview__heading">Flashcards</h2>
        {totalCount > 0 ?
          <Link to="/decks/:deckId/flashcards" class="link-inline flashcard-preview__view-all">
            View all flashcards →
          </Link>
        : null}
      </div>

      [isLoading  → 3× skeleton rows]
      [isError    → .alert + Retry button]
      [isEmpty    → empty state message + CTA]
      [hasItems   → <ul class="flat-list"> ... </ul>]

      {totalCount > 0 ?
        <div class="section-row flashcard-preview__pagination" style="justify-content: flex-start">
          <button class="button button--ghost" disabled={page === 1}>Previous</button>
          <p class="text-muted" style="margin: 0">Showing {start}–{end} of {totalCount}</p>
          <button class="button button--ghost" disabled={page === totalPages}>Next</button>
        </div>
      : null}

    </section>
  </article>
</PageScaffold>
```

**Rationale for "View all flashcards →" placement:**
The link sits in the header row of the preview section (top-right), opposite the "Flashcards" heading.
This placement makes it immediately visible on arrival at the section without requiring the user to
scroll past the list. It is always visible when `totalCount > 0`, regardless of which page the user
is on within the preview.

**Rationale for section separator:**
The `<section>` with class `flashcard-preview` adds `margin-top: 1.5rem` and a `border-top: 1px solid var(--border-subtle)`
via the new `.flashcard-preview` CSS class, creating a visual break between the action row and the
preview content. No `<hr>` element is used — the CSS border-top on the section achieves the same
visual result with better semantic structure.

### hasImage Badge Design

The badge replaces the existing `"| image"` plain text in the meta row. It renders as a small
inline pill directly after the timestamp, without a pipe character.

**Spec:**
```
<span class="flashcard-preview__image-badge">image</span>
```

**Visual properties:**
- `font-size: 0.75rem`
- `font-weight: 700`
- `line-height: 1`
- `padding: 0.15rem 0.45rem`
- `border-radius: 0.25rem`
- `background: color-mix(in srgb, var(--accent-tertiary) 10%, transparent)` (blue-tinted muted)
- `border: 1px solid color-mix(in srgb, var(--accent-tertiary) 22%, transparent)`
- `color: var(--accent-tertiary)` (`#4f6dff` light mode, inherits dark mode value)
- `vertical-align: middle`
- `display: inline-flex; align-items: center`
- No icon — the word "image" is sufficient and avoids icon dependency

**Meta row structure with badge:**
```
<p class="flat-list__meta">
  <time dateTime={updatedAtUtc}>Updated {formatRelativeTime(updatedAtUtc)}</time>
  {hasImage ? <span class="flashcard-preview__image-badge">image</span> : null}
</p>
```

The badge sits immediately after the time element with a `margin-left: 0.5rem` applied via the
`.flashcard-preview__image-badge` class so it naturally spaces away from the timestamp text.

### Loading State — Skeleton Rows

Render exactly 3 skeleton placeholder rows using the `.flat-list__item` structure to maintain
consistent height and rhythm with real content.

**Skeleton row spec:**
```html
<ul class="flat-list" aria-hidden="true">
  <li class="flat-list__item flashcard-preview__skeleton-item">
    <div class="flashcard-preview__skeleton-line flashcard-preview__skeleton-line--title"></div>
    <div class="flashcard-preview__skeleton-line flashcard-preview__skeleton-line--meta"></div>
  </li>
  <!-- repeat ×3 -->
</ul>
<p class="sr-only" aria-live="polite">Loading flashcards...</p>
```

**Skeleton line CSS:**
- `flashcard-preview__skeleton-line`: `display: block; border-radius: 0.25rem; background: var(--surface-muted);`
  `@keyframes shimmer` animating `opacity: 0.6 → 1 → 0.6` over 1.4s ease-in-out infinite
- `flashcard-preview__skeleton-line--title`: `height: 1rem; width: 55%; margin-bottom: 0.5rem`
- `flashcard-preview__skeleton-line--meta`: `height: 0.75rem; width: 38%`
- `@media (prefers-reduced-motion: reduce)`: remove the shimmer animation; skeleton lines remain
  as static muted rectangles

**aria-hidden="true"** on the `<ul>` suppresses skeleton content from screen readers.
The `<p class="sr-only" aria-live="polite">Loading flashcards...</p>` announces the loading state
to assistive technology.

### Empty State

Renders when `isSuccess && items.length === 0`.

```html
<div class="flashcard-preview__empty">
  <p class="text-muted" style="margin: 0 0 0.6rem">
    No flashcards in this deck yet.
  </p>
  <Link to="/decks/:deckId/flashcards/new" class="link-inline">
    Add your first flashcard →
  </Link>
</div>
```

**Visual treatment:**
- No border or box — plain text + link, consistent with the existing `text-muted` empty state pattern
  already used in `DeckDetailRoute` (`"This deck is a blank canvas..."`)
- The empty state from `DeckDetailRoute` (`flashcardCount === 0`) and this empty state are
  **not rendered simultaneously** — the existing empty deck message renders only when
  `detailQuery.data.flashcardCount === 0`, while the preview section renders its own empty state
  based on the preview query result. Both can coexist but will only appear together for a new deck.

### Error State

Renders when `previewQuery.isError`.

```html
<div role="alert" class="alert">
  <p style="margin: 0 0 0.5rem">
    Could not load flashcards. Check your connection and try again.
  </p>
  <button type="button" class="button button--ghost"
          onClick={() => void previewQuery.refetch()}>
    Retry
  </button>
</div>
```

**Error message copy:**
- Generic (non-classified): "Could not load flashcards. Check your connection and try again."
- 503 persistence unavailable: "The flashcard service is temporarily unavailable. Try again in a moment."
- Use `isPersistenceUnavailableError(previewQuery.error)` to distinguish. For all other errors,
  use the generic copy.
- Do not expose raw API error messages to users in the preview section (the detail query already
  handles critical deck-level errors above this section).

### Pagination Controls

Rendered only when `totalCount > 0`. Uses local `page` state (`useState(1)`) in `DeckDetailRoute`.

```yaml
pagination_spec:
  component: "div.section-row.flashcard-preview__pagination"
  style: "justify-content: flex-start; margin-top: 0.75rem"
  items:
    - Previous button: "button.button--ghost, disabled when page === 1, onClick: setPage(p => p - 1)"
    - Label: "p.text-muted with margin 0, text: 'Showing {start}–{end} of {totalCount}'"
    - Next button: "button.button--ghost, disabled when page === totalPages, onClick: setPage(p => p + 1)"
  calculations:
    - "start = (page - 1) * 10 + 1"
    - "end = Math.min(page * 10, totalCount)"
    - "totalPages = Math.max(1, Math.ceil(totalCount / 10))"
  en_dash: "Use – (U+2013) not - (U+002D) in 'Showing X–Y of Z'"
  page_reset: "Reset page to 1 when deckId changes (useEffect dependency on deckId)"
```

### New CSS Classes Required

All new classes belong to the `flashcard-preview` namespace. Add to `styles.css`:

```css
/* ── Flashcard Preview Section ───────────────────── */

.flashcard-preview {
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--border-subtle);
}

.flashcard-preview__header {
  margin-bottom: 0.85rem;
  align-items: baseline;
}

.flashcard-preview__heading {
  margin: 0;
  font-family: "Fraunces", serif;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
}

.flashcard-preview__view-all {
  font-size: 0.875rem;
  white-space: nowrap;
}

.flashcard-preview__image-badge {
  display: inline-flex;
  align-items: center;
  margin-left: 0.5rem;
  padding: 0.15rem 0.45rem;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
  border-radius: 0.25rem;
  vertical-align: middle;
  background: color-mix(in srgb, var(--accent-tertiary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-tertiary) 22%, transparent);
  color: var(--accent-tertiary);
}

.flashcard-preview__empty {
  padding: 0.5rem 0;
}

.flashcard-preview__pagination {
  margin-top: 0.75rem;
}

/* Skeleton */
.flashcard-preview__skeleton-line {
  display: block;
  border-radius: 0.25rem;
  background: var(--surface-muted);
  animation: preview-shimmer 1.4s ease-in-out infinite;
}

.flashcard-preview__skeleton-line--title {
  height: 1rem;
  width: 55%;
  margin-bottom: 0.5rem;
}

.flashcard-preview__skeleton-line--meta {
  height: 0.75rem;
  width: 38%;
}

@keyframes preview-shimmer {
  0%, 100% { opacity: 0.6; }
  50%       { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .flashcard-preview__skeleton-line {
    animation: none;
  }
}
```

### Style Tokens

```yaml
style_tokens:
  color:
    - "Section border-top: var(--border-subtle)"
    - "Heading: var(--text-primary)"
    - "View-all link: var(--accent-tertiary) via .link-inline"
    - "hasImage badge bg: color-mix(in srgb, var(--accent-tertiary) 10%, transparent)"
    - "hasImage badge border: color-mix(in srgb, var(--accent-tertiary) 22%, transparent)"
    - "hasImage badge text: var(--accent-tertiary)"
    - "Skeleton bg: var(--surface-muted)"
    - "Error alert: existing .alert class (danger-tinted border/bg, no new tokens)"
  typography:
    - "Section heading: Fraunces, 1.05rem, weight 700"
    - "View-all link: Manrope, 0.875rem, weight 700 (via .link-inline)"
    - "hasImage badge: 0.75rem, weight 700"
    - "Pagination label: 0.875–0.9rem, var(--text-secondary) via .text-muted"
    - "List items: unchanged — .flat-list__title (1.02rem, 700) and .flat-list__meta (0.9rem)"
  spacing:
    - "Section margin-top: 1.5rem"
    - "Section padding-top: 1.25rem"
    - "Header row margin-bottom: 0.85rem"
    - "Pagination margin-top: 0.75rem"
    - "hasImage badge margin-left: 0.5rem"
```

### Interaction Notes

```yaml
interaction_notes:
  - "Previous/Next buttons: immediate state update via setPage(); TanStack Query handles fetch + loading state automatically"
  - "No page transition animation — list content replaces in-place; skeleton rows appear during isLoading"
  - "Retry button: calls void previewQuery.refetch() — same pattern as existing retry buttons in the codebase"
  - "View all link: plain React Router <Link> — no additional interaction behavior"
  - "Term link in list items: plain React Router <Link> to /decks/:deckId/flashcards/:flashcardId"
  - "No hover state on list items beyond the existing .flat-list__title link hover (underline)"
  - "Page reset: useEffect with [deckId] dependency resets page to 1 if the user navigates to a different deck detail without unmounting the route"
```

### Responsive Notes

```yaml
responsive_notes:
  - "Desktop (> 640px): section-row header shows heading left / view-all link right; pagination shows Previous–Label–Next in a row"
  - "Mobile (≤ 640px): .section-row flex-wrap causes view-all link to wrap below the heading if space is tight; this is acceptable and no override needed"
  - "Pagination on mobile: Previous / label / Next wrap naturally via .section-row flex-wrap; label stays legible at smallest widths because it is short text"
  - "hasImage badge: inline element, wraps naturally within the meta line; no special mobile treatment needed"
  - "Skeleton rows: width percentages (55%, 38%) are relative to the container, so they scale correctly at all widths"
  - "The .flat-list__item padding (1rem 0) and borders are unchanged — no mobile overrides needed for list items"
```

### Content Notes

```yaml
content_notes:
  - "Section heading: 'Flashcards' — one word, no icon, no count in the heading itself (count is already in the deck metadata above)"
  - "View all link: 'View all flashcards →' — include the right arrow (→, U+2192) as a visual cue that it navigates away from this section"
  - "Empty state: 'No flashcards in this deck yet.' + 'Add your first flashcard →'"
  - "Error generic: 'Could not load flashcards. Check your connection and try again.'"
  - "Error 503: 'The flashcard service is temporarily unavailable. Try again in a moment.'"
  - "Pagination label: 'Showing {start}–{end} of {total}' — use en dash (–), not hyphen (-)"
  - "Loading SR-only text: 'Loading flashcards...' via aria-live polite"
  - "Tone: informative and direct; no hedging language ('might', 'may'); no exclamation marks in error states"
```

### Accessibility Checklist

```yaml
accessibility_checklist:
  - "Section uses <section> element with aria-labelledby pointing to the 'Flashcards' h2 — screen readers announce this as a named region"
  - "'Flashcards' heading is an <h2>; the page title (deck name) is the <h1> rendered by PageScaffold — heading hierarchy h1 → h2 is correct"
  - "Skeleton <ul> has aria-hidden='true'; a separate <p class='sr-only' aria-live='polite'> announces 'Loading flashcards...' to screen readers"
  - "Error div uses role='alert' for immediate screen reader announcement"
  - "Pagination Previous/Next buttons use the HTML disabled attribute when unavailable — natively unfocusable, no aria-disabled needed"
  - "Pagination label 'Showing X–Y of Z' is a <p> visible to all users and screen readers; no aria-live needed (it changes with button interaction, not autonomously)"
  - "hasImage badge has no interactive role — it is purely decorative metadata; no aria-label needed"
  - "Term links (.flat-list__title) have descriptive visible text (the term itself); no aria-label override needed"
  - "Focus management: no programmatic focus shifts in this section — all interactions are user-initiated button clicks"
  - "Color contrast: var(--accent-tertiary) (#4f6dff) on the badge's color-mixed background meets AA contrast for small text at the 0.75rem size (verify in both light and dark themes)"
  - "Reduced-motion: skeleton shimmer animation is disabled via @media (prefers-reduced-motion: reduce)"
  - "Empty and error state messages are visible text, not icon-only — understandable without CSS"
```

### Frontend Handoff

```yaml
frontend_handoff:
  - "Add local state: const [previewPage, setPreviewPage] = useState(1) in DeckDetailRoute"
  - "Add useEffect to reset previewPage to 1 when deckId changes"
  - "Call useFlashcardListQuery(deckId, previewPage, 10) — assign result to previewQuery"
  - "Compute: start, end, totalPages from previewQuery.data (see pagination_spec calculations above)"
  - "Add the <section aria-labelledby='preview-heading'> block below the existing action row, inside the article.stack"
  - "Render section heading row as .section-row.flashcard-preview__header with h2 left and View-all link right"
  - "Render loading/error/empty/list states in order (isLoading first, isError second, isEmpty third, hasItems fourth)"
  - "List items: map previewQuery.data.items using .flat-list__item pattern from FlashcardListRoute exactly — do not invent new structure"
  - "hasImage: render <span class='flashcard-preview__image-badge'>image</span> after the time element when item.hasImage is true"
  - "Add all new CSS classes to styles.css as specified in the 'New CSS Classes Required' section"
  - "Do not modify FlashcardListRoute or its associated query calls"
  - "Add component/integration tests for: loading state renders 3 skeletons, empty state shows link, error state shows retry, pagination increments page, view-all link has correct href"
```

---

## Batch 3 — Inline Delete Deck Confirmation

```yaml
batch: 3
title: "Inline Delete Deck Confirmation"
detail_level: "standard"
objective: >
  Surface a delete deck action on DeckDetailRoute using an inline state machine
  (idle → confirming → deleting → success/error). The flow renders entirely in-page
  without a <dialog> element or route change, consistent with the ADR decision and
  separated visually from the primary action row to prevent accidental activation.
deliverables:
  - "Delete trigger button spec (button--danger, placement, visual separation)"
  - "Confirming state inline panel spec (layout, copy, button arrangement)"
  - "Deleting state treatment (loading label, disabled buttons)"
  - "Error state specs for 409 and 503 errors"
  - "Focus management spec for all state transitions"
  - "Keyboard cancel (Escape) spec"
  - "Responsive compression spec for the confirm panel"
  - "State machine wiring notes for DeckDetailRoute"
acceptance_criteria:
  - "Delete deck trigger renders as button--danger below the primary action row, separated by a visible horizontal rule"
  - "Clicking 'Delete deck' transitions to confirming state; the trigger button disappears and the confirm panel renders inline"
  - "Confirm panel shows warning message, 'Confirm delete' (button--danger), and 'Cancel' (button--ghost)"
  - "On confirming → deleting: 'Confirm delete' shows 'Deleting...' text; both buttons are disabled"
  - "On error: .alert renders below the confirm panel buttons; buttons remain enabled for retry"
  - "On Escape key press in confirming or error state: transitions back to idle; focus returns to 'Delete deck' trigger"
  - "On Cancel button click: transitions back to idle; focus returns to 'Delete deck' trigger"
  - "On success: DeckDetailRoute navigates to /decks — this is handled in code, not design"
  - "Confirm panel is not a <dialog> element — it is an inline <div> rendered within the page flow"
dependencies:
  - "useDeleteDeckMutation hook exists in src/api/decks"
  - "isConcurrencyConflictError and isPersistenceUnavailableError helpers exist in src/api/errors"
  - "Batch 2 does not affect Batch 3 implementation; they edit the same file but touch different JSX sections"
```

### Visual Direction

```yaml
visual_direction:
  mood: "Cautious, explicit — the delete zone must feel visually distinct from the primary action row without being alarming before the user has expressed intent"
  constraints:
    - "The idle 'Delete deck' button must not share a row with Study/Add/Edit — it is a destructive action and must be visually separated"
    - "The confirm panel must feel in-context (inline, not floating) — no box-shadow, no elevated surface, no modal chrome"
    - "Use danger color sparingly: only on the 'Confirm delete' button and the warning message icon/border — not on the entire confirm panel background"
    - "The confirm panel should feel like a natural part of the page, not a pop-up"
```

### Layout Blueprint

**Idle state — placement within DeckDetailRoute article:**

```
<article class="stack" style="gap: 0.8rem">
  [description, count, action row, preview section — all unchanged]

  <hr class="deck-detail__delete-separator" />        ← new: visual boundary

  <div class="deck-detail__delete-zone">
    <button type="button" class="button button--danger"
            ref={deleteTriggerRef}
            onClick={() => setDeleteState('confirming')}>
      Delete deck
    </button>
  </div>
</article>
```

**Confirming state — confirm panel replaces the trigger button in-place:**

```
<div class="deck-detail__delete-zone">
  <div class="deck-detail__confirm-panel" role="group" aria-labelledby="delete-confirm-heading">

    <p id="delete-confirm-heading" class="deck-detail__confirm-warning">
      Are you sure you want to delete this deck? This action cannot be undone.
    </p>

    <div class="section-row deck-detail__confirm-actions" style="justify-content: flex-start; gap: 0.6rem">
      <button type="button" class="button button--danger"
              ref={confirmButtonRef}
              disabled={deleteState === 'deleting'}
              onClick={handleConfirmDelete}>
        {deleteState === 'deleting' ? 'Deleting...' : 'Confirm delete'}
      </button>
      <button type="button" class="button button--ghost"
              disabled={deleteState === 'deleting'}
              onClick={handleCancelDelete}>
        Cancel
      </button>
    </div>

    {deleteState === 'error' ? (
      <div role="alert" class="alert deck-detail__confirm-error">
        {errorMessage}
        {isRetryable ? (
          <button type="button" class="button button--ghost"
                  onClick={handleConfirmDelete}>
            Try again
          </button>
        ) : null}
      </div>
    ) : null}

  </div>
</div>
```

**State transitions summary:**

```
idle        → [Click "Delete deck"]   → confirming
confirming  → [Click "Confirm delete"] → deleting
confirming  → [Click "Cancel"]         → idle         (focus → deleteTriggerRef)
confirming  → [Press Escape]           → idle         (focus → deleteTriggerRef)
deleting    → [mutation.onSuccess]     → navigate /decks (no design output)
deleting    → [mutation.onError]       → error
error       → [Click "Try again"]      → deleting
error       → [Click "Cancel"]         → idle         (focus → deleteTriggerRef)
error       → [Press Escape]           → idle         (focus → deleteTriggerRef)
```

**State variable shape:**
- Single `useState<'idle' | 'confirming' | 'deleting' | 'error'>('idle')` named `deleteState`
- `setDeleteState` drives all transitions
- `useDeleteDeckMutation` provides `mutate`, `isPending`, `isError`, `error`
- Note: `deleting` state is driven by `deleteMutation.isPending` — `deleteState` can be simplified
  to `'idle' | 'confirming' | 'error'` if the developer prefers to derive the deleting state from
  `deleteMutation.isPending` instead of storing it explicitly. Either approach is acceptable.

### Delete Trigger Button — Idle State

**Placement:** Below the preview section (Batch 2) inside the article.stack, preceded by a subtle `<hr>`.

**Visual separator spec (`.deck-detail__delete-separator`):**
```css
.deck-detail__delete-separator {
  margin: 1.25rem 0 1rem;
  border: 0;
  border-top: 1px solid var(--border-subtle);
}
```

This `<hr>` is presentational; add `aria-hidden="true"` to suppress it from screen reader content flow.

**Trigger button:**
- Class: `button button--danger`
- Existing `.button--danger` definition: `background: transparent; border-color: color-mix(in srgb, var(--danger) 62%, var(--border-subtle)); color: var(--danger)`
- Label: "Delete deck" (two words, sentence case)
- Min-height 44px via existing `.button` class
- `ref={deleteTriggerRef}` — used to return focus on cancel/escape

**Why button--danger (not button--ghost with danger override):** The danger variant is already
defined in the design system and provides consistent visual treatment across delete actions (matching
the flashcard delete pattern in `FlashcardDetailRoute`). Using it for the trigger communicates
the destructive nature before the user clicks, rather than surprising them with danger color
only in the confirm step.

### Confirm Panel — Confirming / Deleting States

**Confirm panel CSS class (`.deck-detail__confirm-panel`):**
```css
.deck-detail__confirm-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid color-mix(in srgb, var(--danger) 35%, var(--border-subtle));
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--danger) 4%, var(--surface-elevated));
  max-width: 42rem;
}
```

**Visual rationale:** The panel uses a very low-opacity danger tint on the background (4%) and a
blended danger border (35% danger, 65% border-subtle), which signals caution without being
alarmingly red. This is less aggressive than the `.alert` class (which uses a stronger tint) because
the panel itself is the confirmation mechanism — not an error state.

**Warning message (`.deck-detail__confirm-warning`):**
```css
.deck-detail__confirm-warning {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-primary);
  line-height: 1.55;
}
```
Copy: "Are you sure you want to delete this deck? This action cannot be undone."

**Button row in panel:** Same `.section-row` pattern with `justify-content: flex-start; gap: 0.6rem`,
matching the existing action row and the proposed form cancel row from Batch 1.

**Deleting state treatment:**
- "Confirm delete" label changes to "Deleting..." (string swap, no spinner element needed)
- Both buttons: `disabled={deleteState === 'deleting'}` → `opacity: 0.55`, `cursor: not-allowed` via existing `.button:disabled` rule
- The confirm panel remains visible during deletion (no layout jump)

### Error States

**Error classification:**

| Error type | Condition | Message copy | Retryable? |
|-----------|-----------|-------------|-----------|
| 409 Concurrency conflict | `isConcurrencyConflictError(error)` | "This deck was modified by another session. Refresh the page and try again." | No — show "Dismiss" instead of "Try again" |
| 503 Service unavailable | `isPersistenceUnavailableError(error)` | "The service is temporarily unavailable. Try again in a moment." | Yes |
| Generic / unknown | all other errors | "Something went wrong while deleting the deck. Try again." | Yes |

**Error alert placement:** Inside `.deck-detail__confirm-panel`, below the button row. Uses the
existing `.alert` class.

**409 "Dismiss" button:** On concurrency conflict, the deck state may be inconsistent; offering
"Try again" could repeat the conflict. Instead, show a "Dismiss" button (class: `button--ghost`)
that transitions back to idle state. This prompts the user to refresh the page and reconsider.

**Error alert markup:**
```html
<div role="alert" class="alert deck-detail__confirm-error">
  <p style="margin: 0 0 0.5rem">{errorMessage}</p>
  <button type="button" class="button button--ghost"
          onClick={isRetryable ? handleConfirmDelete : handleCancelDelete}>
    {isRetryable ? 'Try again' : 'Dismiss'}
  </button>
</div>
```

**Additional CSS for error alert inside panel:**
```css
.deck-detail__confirm-error {
  margin-top: 0;   /* gap from .deck-detail__confirm-panel already provides spacing */
}
```

### Focus Management

Focus management is critical for keyboard accessibility in state transitions.

**Refs required:**
- `deleteTriggerRef = useRef<HTMLButtonElement>(null)` — points to "Delete deck" button
- `confirmButtonRef = useRef<HTMLButtonElement>(null)` — points to "Confirm delete" button

**Focus rules:**

| Transition | Focus target | Mechanism |
|-----------|-------------|-----------|
| idle → confirming | `confirmButtonRef.current?.focus()` | `useEffect([deleteState])` when `deleteState === 'confirming'` |
| confirming → idle (cancel/escape) | `deleteTriggerRef.current?.focus()` | In `handleCancelDelete()` after `setDeleteState('idle')` |
| deleting → error | `confirmButtonRef.current?.focus()` | `useEffect([deleteState])` when `deleteState === 'error'` |
| error → idle (dismiss/escape) | `deleteTriggerRef.current?.focus()` | In `handleCancelDelete()` after `setDeleteState('idle')` |

**Escape key handler:**
```typescript
useEffect(() => {
  if (deleteState === 'idle' || deleteState === 'deleting') return;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancelDelete();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [deleteState]);
```
The handler is active only in `confirming` and `error` states. It is cleaned up on every state
change and unmount. Pressing Escape during `deleting` does nothing (the handler is inactive,
matching the disabled button treatment).

### New CSS Classes Required

Add to `styles.css`:

```css
/* ── Inline Delete Confirmation ──────────────────── */

.deck-detail__delete-separator {
  margin: 1.25rem 0 1rem;
  border: 0;
  border-top: 1px solid var(--border-subtle);
}

.deck-detail__delete-zone {
  /* Wrapper for both trigger button and confirm panel */
}

.deck-detail__confirm-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid color-mix(in srgb, var(--danger) 35%, var(--border-subtle));
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--danger) 4%, var(--surface-elevated));
  max-width: 42rem;
}

.deck-detail__confirm-warning {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-primary);
  line-height: 1.55;
}

.deck-detail__confirm-actions {
  /* No additional rules — .section-row base class handles layout */
}

.deck-detail__confirm-error {
  margin-top: 0;
}
```

### Style Tokens

```yaml
style_tokens:
  color:
    - "Trigger button: var(--danger) border/text, transparent bg (existing button--danger)"
    - "Confirm panel border: color-mix(in srgb, var(--danger) 35%, var(--border-subtle))"
    - "Confirm panel bg: color-mix(in srgb, var(--danger) 4%, var(--surface-elevated))"
    - "Warning text: var(--text-primary) — not danger color; the panel context provides the signal"
    - "Confirm delete button: existing button--danger"
    - "Cancel button: existing button--ghost"
    - "Separator: var(--border-subtle)"
    - "Error alert: existing .alert class tokens"
  typography:
    - "Trigger button: 0.875rem, weight 700 (existing .button)"
    - "Warning message: 0.9rem, line-height 1.55"
    - "Error message: inherits from .alert"
  spacing:
    - "Separator margin: 1.25rem above, 1rem below"
    - "Confirm panel padding: 1rem"
    - "Confirm panel internal gap: 0.75rem"
    - "Button row gap: 0.6rem"
  shape:
    - "Confirm panel border-radius: 0.5rem (matching .page__surface and .deck-card)"
    - "Max-width: 42rem (keeps panel readable but not full-width on wide screens)"
```

### Interaction Notes

```yaml
interaction_notes:
  - "Trigger click: synchronous setDeleteState('confirming') — no async, no validation"
  - "Confirm delete click: calls deleteMutation.mutate(); on success navigates /decks (code concern); on error sets deleteState('error')"
  - "Cancel click: sets deleteState('idle'); programmatically focuses deleteTriggerRef"
  - "Escape key: same as Cancel click — sets deleteState('idle'); programmatically focuses deleteTriggerRef"
  - "During deleting: both buttons disabled; Escape is inactive; user cannot escape mid-delete via keyboard"
  - "No motion/animation for panel enter or exit — inline DOM show/hide via conditional rendering"
  - "Panel does not close on outside click — there is no overlay; this is an inline flow, not a modal"
  - "Retry (503 error): calls deleteMutation.mutate() again directly without transitioning through confirming"
  - "Dismiss (409 error): same as Cancel — returns to idle, focuses trigger"
```

### Responsive Notes

```yaml
responsive_notes:
  - "Desktop (> 640px): confirm panel max-width 42rem keeps it compact within the page content width; button row is horizontal"
  - "Mobile (≤ 480px): confirm panel goes full-width of the .page__surface / .stack container; button row wraps via .section-row flex-wrap"
  - "Mobile button row: add the @media (max-width: 30rem) rule from Batch 1 to also target .deck-detail__confirm-actions .button { width: 100% } for consistent full-width stacking"
  - "Warning message text at mobile width: 0.9rem body copy wraps naturally within the panel; no font-size override needed"
  - "Separator <hr>: full-width of container at all sizes — no mobile override needed"
  - "Panel max-width (42rem) is a cap for wide screens only; on mobile the container is narrower, so the panel fills its parent naturally"
```

### Content Notes

```yaml
content_notes:
  - "Trigger label: 'Delete deck' — two words, sentence case, no exclamation, no 'permanently'"
  - "Warning message: 'Are you sure you want to delete this deck? This action cannot be undone.' — direct, factual, no emoji, no aggressive ALL CAPS"
  - "Confirm button label: 'Confirm delete' — matches the pattern in FlashcardDetailRoute's dialog"
  - "Deleting label: 'Deleting...' — ellipsis indicates in-progress state"
  - "Cancel label: 'Cancel' — consistent with Batch 1 form cancel button label"
  - "409 error: 'This deck was modified by another session. Refresh the page and try again.' — explains why retry is not offered"
  - "503 error: 'The service is temporarily unavailable. Try again in a moment.' — soft, does not say 'your data is gone'"
  - "Generic error: 'Something went wrong while deleting the deck. Try again.' — honest, short"
  - "Try again button label: 'Try again' — two words, lowercase second word, consistent with .button text length patterns"
  - "Dismiss button label: 'Dismiss' — signals that the error panel is being closed, not retried"
  - "Tone: calm and precise; avoid words that amplify alarm ('danger', 'warning', 'permanently destroy')"
```

### Accessibility Checklist

```yaml
accessibility_checklist:
  - "Trigger button uses HTML type='button' to prevent form submission if DeckDetailRoute is ever nested in a form context"
  - "Confirm panel uses role='group' with aria-labelledby pointing to the warning message <p id='delete-confirm-heading'> — screen readers announce it as a named group"
  - "Focus on confirming transition: useEffect moves focus to 'Confirm delete' button when deleteState === 'confirming' — users arriving by keyboard land directly on the primary action"
  - "Focus on idle transition (cancel/escape): focus returns to 'Delete deck' trigger — keyboard users are not left at the top of the page"
  - "Escape key handling is active only in confirming and error states — it does not interfere with other page keyboard interactions in idle/deleting states"
  - "Both buttons are disabled via HTML disabled attribute during deleting — natively removed from tab order, no aria-disabled needed"
  - "Error alert uses role='alert' for immediate screen reader announcement on error state entry"
  - "Separator <hr> has aria-hidden='true' — it is a visual-only element"
  - "Warning message color var(--text-primary) on the low-tint panel background: verify contrast ratio ≥ 4.5:1 in both light and dark themes"
  - "button--danger color var(--danger) (#b0194d light / #ff5f94 dark) on transparent background: verify WCAG AA contrast against panel bg"
  - "No motion: the confirm panel enters and exits via conditional rendering (no CSS transitions); no @media (prefers-reduced-motion) rule needed for this batch"
  - "The inline panel does not trap focus (it is not a dialog) — Tab navigation continues naturally through the page below the panel; this is acceptable because the panel is the last section of the page"
```

### Frontend Handoff

```yaml
frontend_handoff:
  - "Add deleteState: 'idle' | 'confirming' | 'error' to DeckDetailRoute local state (useState('idle'))"
  - "Add deleteTriggerRef = useRef<HTMLButtonElement>(null) and confirmButtonRef = useRef<HTMLButtonElement>(null)"
  - "Add useEffect([deleteState]) for focus management on state transitions as specified in the Focus Management section"
  - "Add useEffect([deleteState]) for Escape key listener as specified; ensure cleanup returns removeEventListener"
  - "Wire useDeleteDeckMutation: on success navigate('/decks'); on error setDeleteState('error')"
  - "Add handleCancelDelete: setDeleteState('idle') + setTimeout(() => deleteTriggerRef.current?.focus(), 0) — setTimeout ensures focus happens after React re-render"
  - "Add <hr class='deck-detail__delete-separator' aria-hidden='true'> after the preview section inside the article.stack"
  - "Render <div class='deck-detail__delete-zone'> with conditional rendering: idle shows trigger button, confirming/deleting/error shows confirm panel"
  - "Add all new CSS classes to styles.css as specified in the 'New CSS Classes Required' section"
  - "Extend the @media (max-width: 30rem) rule from Batch 1 to also include .deck-detail__confirm-actions .button { width: 100% }"
  - "Import isConcurrencyConflictError and isPersistenceUnavailableError from ../api/errors for error classification"
  - "Add tests for: idle renders trigger only, click transitions to confirming, cancel returns to idle, escape returns to idle, 409 error shows dismiss, 503 error shows retry, deleting disables buttons"
```

---

## Open Questions and Risks

| # | Question | Impact | Owner |
|---|----------|--------|-------|
| 1 | **Dark mode contrast for hasImage badge:** `var(--accent-tertiary)` in dark mode is still `#4f6dff` (no dark override in styles.css for accent-tertiary). Verify the badge text color at 0.75rem on the dark `color-mix` panel background meets WCAG AA 4.5:1. | Low — badge is metadata, not primary content | Frontend Developer to verify |
| 2 | **Cancel button in DeckForm/FlashcardForm responsive breakpoint:** The 30rem breakpoint for full-width stacking is proposed based on existing form field behavior. Confirm visually that this does not conflict with the page max-width container padding at that width. | Low | Frontend Developer to verify during implementation |
| 3 | **Confirm panel `max-width: 42rem`:** If the DeckDetailRoute is ever rendered in a narrower container (e.g., a sidebar), `max-width: 42rem` may be unnecessary. For now, it is safe because the page uses `.page` with `max-width: 72rem` and `padding: 2rem 1rem`. | Negligible | No action needed |
| 4 | **Cache invalidation across pageSize families (Batch 2):** ADR 0018 notes that mutations must invalidate both `flashcards.list(deckId, *, 10)` and `flashcards.list(deckId, *, 50)` cache entries. Confirm that the existing mutation hooks invalidate by `deckId` prefix (not exact key) so the preview refreshes correctly after flashcard create/edit/delete. | Medium — silent stale data risk | Frontend Developer to verify in integration tests |
| 5 | **Escape key scope in Batch 3:** The Escape handler is attached to `window`. If other components on the page also listen to Escape (e.g., a future modal), there may be handler collisions. For the current scope this is safe — no other Escape listeners exist in DeckDetailRoute. | Low for current scope, medium for future | Note for future modal implementation |
