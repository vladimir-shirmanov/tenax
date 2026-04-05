# Design Handoff — Study Mode (April 2026)

> **Produced by:** Design Handoff agent  
> **Target audience:** Frontend Developer  
> **Template version:** design-handoff-batch-template v1  
> **Repo root:** `src/Tenax.Web/frontend/src`  
> **Total batches:** 3

---

## Design Summary

This handoff introduces a dedicated, distraction-free Study Mode for flashcard decks, relaxes the flashcard image size constraints to allow richer content, and fixes raw `deckId` strings appearing in breadcrumbs across three existing routes.

**Batch order is intentional.** Batch 1 (new route) depends on no other batch. Batch 2 (image sizing) is a self-contained CSS change that can be shipped independently. Batch 3 (breadcrumb fix) is a self-contained data + JSX correction across three existing routes. Batches 2 and 3 carry no inter-dependency and can be parallelised if needed.

---

## Batch Plan

| # | Title | Scope | Files changed |
|---|-------|-------|---------------|
| 1 | Study Mode Route | New route + CSS classes + "Study now" link update | New file + `styles.css` + `decks.$deckId.tsx` |
| 2 | Flashcard Image Size | CSS-only tweak to `.flashcard-study-card__image` | `styles.css` |
| 3 | Breadcrumb Deck Name Fix | Data fetch + JSX breadcrumb items in 3 routes | 3 existing route files |

---

## Batch 1 — Study Mode Route

```yaml
batch: 1
title: "Study Mode Route — /decks/:deckId/study"
detail_level: "standard"
objective: >
  Introduce a focused, distraction-free study experience that lets users flip
  through all cards in a deck sequentially or in shuffled order, track progress,
  and reach a completion screen — all within a single route that bypasses the
  standard PageScaffold chrome.
deliverables:
  - "New route file: src/routes/decks.$deckId.study.tsx"
  - "New CSS classes: .study-mode and child variants in styles.css"
  - "Updated 'Study now' link in decks.$deckId.tsx to point to /decks/:deckId/study"
  - "State shape and component tree specification"
  - "Keyboard navigation contract"
  - "Loading, error, and empty-deck state specifications"
  - "Completion screen specification"
acceptance_criteria:
  - "Route renders without PageScaffold (no large page h1, no .page__surface wrapper)"
  - "Breadcrumb renders: Decks › <deck name> › Study"
  - "Progress counter shows '3 / 12' format in header centre"
  - "Shuffle toggle is visually distinct when active, uses aria-pressed"
  - "Previous button is disabled on card 1; Next button label is 'Finish' on last card"
  - "Dot indicators render only when totalCount ≤ 20"
  - "Completion screen replaces card + controls in the same route (no navigation)"
  - "Keyboard shortcuts are attached to window and cleaned up on unmount"
  - "All loading / error / empty states are handled before rendering the card"
dependencies:
  - "Batch 2 (image sizing) is independent — Batch 1 can ship before Batch 2"
  - "useDeckDetailQuery must be importable from ../api/decks (already exists)"
  - "useFlashcardListQuery must accept (deckId, page, pageSize) — confirmed in api/flashcards.ts"
```

---

### 1.1 Route Registration

**File to create:** `src/Tenax.Web/frontend/src/routes/decks.$deckId.study.tsx`

Register the route in the same router configuration that holds the other `decks.$deckId.*` routes. The path must be `/decks/:deckId/study`.

---

### 1.2 Visual Direction

```yaml
visual_direction:
  mood: "Focused, calm, premium — no distractions"
  constraints:
    - "Do not use PageScaffold — its large h1 and .page__surface chrome break the immersive intent"
    - "The card must be the visual hero; all controls are subordinate"
    - "Colour palette is strictly the existing CSS token set — no new colour values"
    - "Typography follows existing font roles: Fraunces for card term, Manrope for all UI chrome"
```

---

### 1.3 Layout Blueprint

```
┌──────────────────────────────────────────────────────┐
│ .study-mode  (max-width: 52rem, centred, padded)     │
│                                                      │
│  [breadcrumb]                                        │
│                                                      │
│  .study-mode__header                                 │
│  ┌──────────────┬─────────────┬──────────────────┐   │
│  │ deck name    │  3 / 12     │ [shuffle toggle] │   │
│  │ (left)       │  (centre)   │ (right)          │   │
│  └──────────────┴─────────────┴──────────────────┘   │
│                                                      │
│  .flashcard-study-card  (existing component)         │
│  ┌──────────────────────────────────────────────┐   │
│  │  [front face: image? + term]                 │   │
│  │  [back face:  definition]                    │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  .study-mode__controls                               │
│  [ ← Previous ]  [ • • ● • ]  [ Next → / Finish ]   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Completion screen** (replaces card + controls region, same container):

```
┌──────────────────────────────────────────────────────┐
│ .page__surface .study-mode__completion               │
│                                                      │
│              ✓  (3rem, accent-primary)               │
│         "You finished!"  (.page__title)              │
│   "You studied 12 cards from Spanish Basics."        │
│                                                      │
│   [ Study again ]  [ Back to deck ]                  │
└──────────────────────────────────────────────────────┘
```

---

### 1.4 Component Tree

```tsx
<StudyModeRoute>
  <main className="study-mode">
    <div className="page__breadcrumb">
      <Breadcrumb items={breadcrumbItems} />
    </div>

    <header className="study-mode__header">
      <p className="study-mode__deck-name">{deckName}</p>
      <p className="study-mode__progress" aria-live="polite" aria-atomic="true">
        {currentIndex + 1} / {cards.length}
      </p>
      <button
        type="button"
        className={`button button--ghost study-mode__shuffle${isShuffled ? " is-active" : ""}`}
        aria-pressed={isShuffled}
        aria-label="Shuffle cards"
        title="Shuffle cards"
        onClick={handleToggleShuffle}
      >
        <ShuffleIcon />   {/* inline SVG 16×16 — spec below */}
        Shuffle
      </button>
    </header>

    {/* Card region — conditionally shows card or completion */}
    {isComplete ? <CompletionScreen /> : <FlipCard card={cards[currentIndex]} />}

    {/* Controls — hidden when completion screen is active */}
    {!isComplete ? (
      <div className="study-mode__controls">
        <button
          type="button"
          className="button button--ghost"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          ← Previous
        </button>

        {cards.length <= 20 ? (
          <div className="study-mode__dots" aria-hidden="true">
            {cards.map((_, i) => (
              <span
                key={i}
                className={`study-mode__dot${i === currentIndex ? " is-active" : ""}`}
              />
            ))}
          </div>
        ) : null}

        <button
          type="button"
          className="button button--primary"
          onClick={handleNext}
        >
          {currentIndex === cards.length - 1 ? "Finish" : "Next →"}
        </button>
      </div>
    ) : null}
  </main>
</StudyModeRoute>
```

---

### 1.5 State Shape

```ts
// All state lives in the route component
const [currentIndex, setCurrentIndex] = useState(0);
const [isFlipped, setIsFlipped]       = useState(false);
const [isShuffled, setIsShuffled]     = useState(false);
const [isComplete, setIsComplete]     = useState(false);
const [cards, setCards]               = useState<FlashcardListItem[]>([]);
// cards is derived from query data; re-derived on shuffle toggle
// prefersReducedMotion follows the same pattern as FlashcardDetailRoute
```

**Derived values (not stored in state):**

```ts
const deckName    = deckQuery.data?.name ?? deckId;
const totalCount  = flashcardQuery.data?.totalCount ?? 0;
```

**Shuffle logic (Fisher-Yates, applied on toggle):**

```ts
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
```

When shuffle is toggled ON: apply Fisher-Yates to the original list, reset `currentIndex` to 0, set `isFlipped` to false.  
When shuffle is toggled OFF: restore the original (sequential) list order, reset `currentIndex` to 0, set `isFlipped` to false.  
Keep the original query order in a stable ref so toggling OFF can restore it without re-fetching.

```ts
const originalOrderRef = useRef<FlashcardListItem[]>([]);
// Populate once when query data first arrives:
useEffect(() => {
  if (flashcardQuery.data?.items) {
    originalOrderRef.current = flashcardQuery.data.items;
    setCards(flashcardQuery.data.items);
  }
}, [flashcardQuery.data]);
```

---

### 1.6 Data Fetching

```ts
// Both queries run in the same component
const deckQuery      = useDeckDetailQuery(deckId);
const flashcardQuery = useFlashcardListQuery(deckId, 1, 500);
// page=1, pageSize=500 — loads all cards in a single request
```

**Imports required:**
```ts
import { useDeckDetailQuery } from "../api/decks";
import { useFlashcardListQuery } from "../api/flashcards";
import { FlashcardListItem } from "../api/types";
```

**⚠ Data shape note — open question:**  
`FlashcardListItem` provides `term`, `definitionPreview`, and `hasImage: boolean` — but **not** the full `definition` string or `imageUrl`. The flip card back face will display `definitionPreview`, which may be truncated. Images cannot be shown on the front face without an additional per-card detail fetch. See `open_questions` below for the recommended resolution.

---

### 1.7 Prop Interface for the Flip Card in Study Mode

The existing `flashcard-study-card` button and its inner markup should be inlined in the route component (not extracted to a separate component in this batch), following the exact same JSX pattern as `FlashcardDetailRoute`:

```tsx
<button
  type="button"
  aria-pressed={isFlipped}
  className={`flashcard-study-card${isFlipped ? " is-flipped" : ""}${prefersReducedMotion ? " flashcard-study-card--reduced-motion" : ""}`}
  onClick={() => setIsFlipped((f) => !f)}
>
  <span className="sr-only">Press Enter or Space to flip the flashcard</span>
  <div className="flashcard-study-card__inner">
    <div
      className="flashcard-study-card__face flashcard-study-card__face--front"
      aria-hidden={isFlipped}
    >
      {!isFlipped ? (
        // imageUrl only available if using FlashcardDetail; omit img if using FlashcardListItem
        <p className="flashcard-study-card__term">{cards[currentIndex]?.term}</p>
      ) : null}
    </div>
    <div
      className="flashcard-study-card__face flashcard-study-card__face--back"
      aria-hidden={!isFlipped}
    >
      {isFlipped ? (
        <p className="flashcard-study-card__definition whitespace-pre-wrap">
          {cards[currentIndex]?.definitionPreview}
        </p>
      ) : null}
    </div>
  </div>
</button>
```

When navigating to a new card (index change), reset `isFlipped` to `false`.

---

### 1.8 Navigation Handlers

```ts
const handleNext = () => {
  if (currentIndex === cards.length - 1) {
    setIsComplete(true);
    return;
  }
  setCurrentIndex((i) => i + 1);
  setIsFlipped(false);
};

const handlePrevious = () => {
  if (currentIndex === 0) return;
  setCurrentIndex((i) => i - 1);
  setIsFlipped(false);
};

const handleStudyAgain = () => {
  setCurrentIndex(0);
  setIsFlipped(false);
  setIsComplete(false);
  if (isShuffled) {
    setCards(shuffle(originalOrderRef.current));
  }
};
```

---

### 1.9 Keyboard Navigation

Attach a `keydown` listener to `window` inside a `useEffect`. Clean it up on unmount.

```ts
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const tag = (document.activeElement as HTMLElement)?.tagName;
    const isButton = tag === "BUTTON" || tag === "A";

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      handleNext();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      handlePrevious();
    } else if ((e.key === " " || e.key === "Enter") && !isButton) {
      e.preventDefault();
      setIsFlipped((f) => !f);
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [currentIndex, cards.length, isComplete]);
// Note: handleNext/handlePrevious must be stable refs (useCallback) or
// the effect deps must include them — prefer useCallback to avoid stale closures.
```

**Guard rule:** If `document.activeElement` is a `<button>` or `<a>`, `Space` / `Enter` must NOT trigger the flip — the browser's default action (button click) should proceed instead.

---

### 1.10 Loading, Error, and Empty States

All three states are rendered inside `<main className="study-mode">` after the breadcrumb, replacing the header + card region:

**Loading:**
```tsx
{flashcardQuery.isLoading ? (
  <p className="text-muted" style={{ textAlign: "center", padding: "3rem 0" }}>
    Loading cards…
  </p>
) : null}
```

**Error:**
```tsx
{flashcardQuery.isError ? (
  <div role="alert" className="alert">
    <p>{getApiErrorMessage(flashcardQuery.error)}</p>
    {isPersistenceUnavailableError(flashcardQuery.error) ? (
      <button
        type="button"
        className="button button--ghost"
        onClick={() => void flashcardQuery.refetch()}
      >
        Retry
      </button>
    ) : null}
  </div>
) : null}
```

**Empty deck (0 cards after successful load):**
```tsx
{flashcardQuery.isSuccess && cards.length === 0 ? (
  <div className="page__surface" style={{ textAlign: "center", padding: "3rem 2rem" }}>
    <p className="text-muted">This deck has no flashcards yet.</p>
    <Link
      to={`/decks/${deckId}/flashcards/new`}
      className="button button--primary"
    >
      Add flashcards
    </Link>
  </div>
) : null}
```

---

### 1.11 Completion Screen

Replaces the card and controls region (rendered instead of them when `isComplete === true`):

```tsx
{isComplete ? (
  <div className="page__surface study-mode__completion">
    <span className="study-mode__completion-icon" aria-hidden="true">✓</span>
    <h2 className="page__title">You finished!</h2>
    <p className="text-muted">
      You studied {cards.length} card{cards.length !== 1 ? "s" : ""} from {deckName}.
    </p>
    <div className="study-mode__completion-actions">
      <button
        type="button"
        className="button button--primary"
        onClick={handleStudyAgain}
      >
        Study again
      </button>
      <Link
        to={`/decks/${deckId}`}
        className="button button--ghost"
      >
        Back to deck
      </Link>
    </div>
  </div>
) : null}
```

---

### 1.12 Breadcrumb Items

```ts
const breadcrumbItems: BreadcrumbItem[] = [
  { label: "Decks",  href: "/decks" },
  { label: deckName, href: `/decks/${deckId}` },
  { label: "Study" },  // no href — current page
];
// deckName = deckQuery.data?.name ?? deckId (falls back to raw ID while loading)
```

---

### 1.13 "Study now" Link Update in `decks.$deckId.tsx`

The existing link points to the flashcard list route. Update it to the new study route:

```tsx
// Before:
<Link to={`/decks/${deckId}/flashcards`} className="button button--primary">
  Study now
</Link>

// After:
<Link to={`/decks/${deckId}/study`} className="button button--primary">
  Study now
</Link>
```

---

### 1.14 Shuffle Icon — Inline SVG

```tsx
const ShuffleIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M2 4h9l3 4-3 4H2"/>
    <path d="M2 12h9"/>
    <polyline points="11 2 14 4 11 6"/>
    <polyline points="11 10 14 12 11 14"/>
  </svg>
);
```

---

### 1.15 New CSS Classes

Add to `src/Tenax.Web/frontend/src/styles.css` (append after existing `.flashcard-study-card` block):

```css
/* ── Study Mode Layout ──────────────────────────────────── */

.study-mode {
  max-width: 52rem;
  margin: 0 auto;
  padding: 1.5rem 1rem 2.5rem;
}

.study-mode__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  gap: 0.75rem;
}

.study-mode__deck-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 20ch;
}

.study-mode__progress {
  font-size: 0.875rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.study-mode__shuffle {
  /* Extends .button .button--ghost */
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.study-mode__shuffle.is-active {
  background: color-mix(in srgb, var(--accent-primary) 12%, transparent);
  color: var(--text-primary);
  border-color: color-mix(in srgb, var(--accent-primary) 30%, transparent);
}

.study-mode__controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
}

.study-mode__dots {
  display: flex;
  gap: 0.35rem;
  align-items: center;
}

.study-mode__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--border-subtle);
  transition: background 200ms, width 200ms, height 200ms;
  flex-shrink: 0;
}

.study-mode__dot.is-active {
  background: var(--accent-primary);
  width: 0.625rem;
  height: 0.625rem;
}

.study-mode__completion {
  text-align: center;
  padding: 3rem 2rem;
}

.study-mode__completion-icon {
  font-size: 3rem;
  color: var(--accent-primary);
  display: block;
  margin-bottom: 1rem;
  line-height: 1;
}

.study-mode__completion-actions {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
}
```

---

### 1.16 Style Tokens Reference

All tokens consumed by Batch 1 — no new tokens introduced:

```yaml
style_tokens:
  color:
    - "--accent-primary: #00a86b  (shuffle active bg, dot active, completion icon)"
    - "--text-primary: #141a25  (deck name, shuffle active text)"
    - "--text-secondary: #4b5668  (progress counter, completion subtext)"
    - "--border-subtle: #d4dce7  (dot inactive bg, shuffle ghost border)"
    - "--surface-elevated  (card background)"
    - "--focus-ring: #4f6dff  (keyboard focus outline)"
  typography:
    - "Fraunces serif — card term (.flashcard-study-card__term), completion heading (.page__title)"
    - "Manrope sans-serif — all UI chrome: header, progress, controls, breadcrumb"
    - "Deck name: 1rem / 600 weight"
    - "Progress counter: 0.875rem / regular"
    - "Completion heading: clamp(2rem, 5vw, 3.5rem) via .page__title (reused)"
  spacing:
    - "Container padding: 1.5rem top, 1rem sides, 2.5rem bottom"
    - "Header gap: 0.75rem"
    - "Controls gap: 1rem"
    - "Dot gap: 0.35rem"
    - "Completion padding: 3rem 2rem"
  shape:
    - "Completion surface: .page__surface border-radius 0.5rem (reused token)"
    - "Shuffle button: .button border-radius 0.375rem (inherited)"
```

---

### 1.17 Interaction Notes

```yaml
interaction_notes:
  card_flip:
    - "Click anywhere on the card triggers flip"
    - "Space/Enter triggers flip only when card button is focused OR when no button is focused"
    - "ArrowRight/ArrowDown advances to next card"
    - "ArrowLeft/ArrowUp goes to previous card"
    - "Navigating to a new card always resets flip state to front"
  shuffle_toggle:
    - "Clicking shuffle reorders cards, resets to card 1, resets flip state"
    - "Clicking shuffle again restores original order, resets to card 1, resets flip state"
    - "aria-pressed reflects current shuffle state"
    - "Button gains .is-active class and accent tint when shuffled"
  previous_button:
    - "disabled attribute set when currentIndex === 0"
    - "opacity: 0.55 via .button:disabled rule — no custom style needed"
  next_button:
    - "Label changes from 'Next →' to 'Finish' when currentIndex === cards.length - 1"
    - "Clicking 'Finish' sets isComplete to true — does NOT navigate"
  completion_screen:
    - "'Study again' resets index, flip, and complete state; re-shuffles if isShuffled"
    - "'Back to deck' navigates to /decks/:deckId using React Router <Link>"
```

---

### 1.18 Responsive Notes

```yaml
responsive_notes:
  mobile_lt_768:
    - ".study-mode padding reduces to 1.2rem top on mobile (inherit from .page mobile override)"
    - ".study-mode__deck-name max-width: 14ch at narrow widths to prevent overflow"
    - ".study-mode__header wraps: deck name truncates, progress and shuffle stay visible"
    - ".study-mode__controls gap reduces to 0.6rem if needed — both buttons remain full touch target (min-height 44px)"
    - "Dot indicators: only render for ≤ 20 cards; on very small screens (< 320px) they may wrap — acceptable"
  desktop_gt_768:
    - ".flashcard-study-card max-width 40rem centred (existing rule) — study-mode container at 52rem gives breathing room for controls"
  key_constraint:
    - "The .flashcard-study-card max-width rules in @media (min-width: 48rem) and (min-width: 80rem) are inherited — no override needed in Batch 1"
```

---

### 1.19 Accessibility Checklist

```yaml
accessibility_checklist:
  heading_hierarchy:
    - "No <h1> in study mode — the completion screen uses <h2> (.page__title reused for style only)"
    - "Breadcrumb aria-label='Breadcrumb' is inherited from Breadcrumb component"
    - "Progress counter uses aria-live='polite' aria-atomic='true' so screen readers announce changes"
  focus_management:
    - "All interactive elements meet min-height: 44px touch target (inherited from .button rule)"
    - "Flip card button uses existing :focus-visible outline: 3px solid var(--focus-ring)"
    - "Shuffle toggle uses :focus-visible outline: 2px solid var(--focus-ring)"
    - "Previous/Next buttons use :focus-visible from global rule"
    - "On completion screen, consider programmatically focusing the 'Study again' button (useEffect + ref)"
  colour_contrast:
    - "--text-primary (#141a25) on --surface-elevated (#fff): ≥ 15:1 — passes AAA"
    - "--text-secondary (#4b5668) on --surface-elevated: ≥ 4.5:1 — passes AA"
    - "accent-primary (#00a86b) used decoratively (dot, icon) — not the sole carrier of meaning"
    - "Active shuffle button: accent tint background is decorative; button text retains --text-primary"
  motion:
    - "Card flip uses existing .flashcard-study-card--reduced-motion fallback (already implemented)"
    - "Dot transition (200ms) must be suppressed under @media (prefers-reduced-motion: reduce) — add .study-mode__dot to the existing reduced-motion block in styles.css"
    - "No new animations introduced; shuffle reorder is instantaneous"
  semantics:
    - "Flip card is a <button> with aria-pressed — correct role"
    - "Shuffle toggle is a <button> with aria-pressed — correct role"
    - "Dot indicators are aria-hidden='true' — purely decorative"
    - "Completion checkmark span is aria-hidden='true'"
    - "Card sr-only hint text preserved from FlashcardDetailRoute pattern"
  keyboard:
    - "Full keyboard navigation without mouse: Arrow keys navigate, Space/Enter flips"
    - "Focus never trapped — Escape is unused (no modal)"
    - "Tab order: breadcrumb links → shuffle → flip card → previous → next"
```

---

### 1.20 Files to Change

| Action | File |
|--------|------|
| **Create** | `src/Tenax.Web/frontend/src/routes/decks.$deckId.study.tsx` |
| **Edit** | `src/Tenax.Web/frontend/src/styles.css` — append new `.study-mode` CSS block |
| **Edit** | `src/Tenax.Web/frontend/src/routes/decks.$deckId.tsx` — update "Study now" href from `/decks/${deckId}/flashcards` to `/decks/${deckId}/study` |
| **Edit** | Router config file — register `/decks/:deckId/study` route pointing to `StudyModeRoute` component |

---

### 1.21 Frontend Handoff

```yaml
frontend_handoff:
  audience: "Frontend Developer"
  instructions:
    - "Create decks.$deckId.study.tsx — do NOT use PageScaffold"
    - "Use useDeckDetailQuery(deckId) for deck name; use useFlashcardListQuery(deckId, 1, 500) for cards"
    - "Implement state shape exactly as specified in §1.5 — no additional state needed"
    - "Inline the flashcard flip card JSX following the FlashcardDetailRoute pattern (§1.7)"
    - "Implement shuffle with Fisher-Yates (§1.5) and the originalOrderRef pattern"
    - "Attach keyboard listener to window in useEffect with the guard for focused buttons (§1.9)"
    - "Completion screen replaces card+controls in same route — no navigate() call (§1.11)"
    - "Add all CSS classes from §1.15 to styles.css — append after .flashcard-study-card block"
    - "Add .study-mode__dot to the @media (prefers-reduced-motion: reduce) block in styles.css"
    - "Update 'Study now' link in decks.$deckId.tsx as shown in §1.13"
    - "Register the new route in the router config"
    - "Do not improvise missing sections — raise open questions before deviating from spec"
```

---

### 1.22 Open Questions

```yaml
open_questions:
  - id: OQ-1
    question: >
      FlashcardListItem only provides `definitionPreview` (potentially truncated) and
      `hasImage: boolean` — NOT the full `definition` string or `imageUrl`.
      The study card back face will show definitionPreview. Is this acceptable, or
      should the route lazily fetch FlashcardDetail per card when it becomes active?
    options:
      a: "Accept definitionPreview — simplest, single fetch, no images on front face"
      b: "Lazy-fetch FlashcardDetail when currentIndex changes — full content, N extra requests"
      c: "API team adds full fields to FlashcardListResponse — ideal but requires backend change"
    default_if_unresolved: "Option A — proceed with definitionPreview and no images"

  - id: OQ-2
    question: >
      Should the router config for /decks/:deckId/study be a sibling of decks.$deckId or
      a child route? (Affects whether the parent deck route data is available in context.)
    default_if_unresolved: "Sibling — self-contained with its own data fetching"

  - id: OQ-3
    question: >
      Should the completion checkmark be a Unicode character (✓) or an SVG icon
      consistent with the shuffle icon treatment?
    default_if_unresolved: "Unicode ✓ — simpler, no additional SVG asset needed"
```

---

## Batch 2 — Flashcard Image Size

```yaml
batch: 2
title: "Flashcard Image Size — Relax max-width and max-height constraints"
detail_level: "standard"
objective: >
  Increase the maximum display size of flashcard images on both the study card
  and the detail page (which share .flashcard-study-card__image) so that wider
  and taller images have room to breathe without cropping.
deliverables:
  - "Updated .flashcard-study-card__image rule in styles.css"
acceptance_criteria:
  - "max-width changes from 26rem to 32rem"
  - "max-height changes from min(50%, 16rem) to clamp(14rem, 40vh, 24rem)"
  - "object-fit: contain is preserved — images are never cropped"
  - "Border, border-radius, and background remain unchanged"
  - "Change applies to both the flashcard detail route and the study mode route"
dependencies:
  - "No dependency on Batch 1 or Batch 3 — can ship independently"
```

---

### 2.1 CSS Change

**File:** `src/Tenax.Web/frontend/src/styles.css`

```css
/* Before */
.flashcard-study-card__image {
  width: 100%;
  max-width: 26rem;
  max-height: min(50%, 16rem);
  object-fit: contain;
  border-radius: 0.5rem;
  border: 1px solid var(--border-subtle);
  background: color-mix(in srgb, var(--surface-muted) 86%, transparent);
}

/* After */
.flashcard-study-card__image {
  width: 100%;
  max-width: 32rem;                          /* was 26rem — allows wider images on desktop */
  max-height: clamp(14rem, 40vh, 24rem);     /* was min(50%, 16rem) — responsive, taller ceiling */
  object-fit: contain;
  border-radius: 0.5rem;
  border: 1px solid var(--border-subtle);
  background: color-mix(in srgb, var(--surface-muted) 86%, transparent);
}
```

---

### 2.2 Rationale

| Property | Old value | New value | Reason |
|----------|-----------|-----------|--------|
| `max-width` | `26rem` (416px) | `32rem` (512px) | Allows wider landscape images to display at a comfortable reading size on ≥768px viewports |
| `max-height` | `min(50%, 16rem)` = 256px ceiling | `clamp(14rem, 40vh, 24rem)` | Min 224px (mobile), scales with viewport up to 384px on large screens; prevents the card from feeling cramped on tall images |
| `object-fit` | `contain` | `contain` (unchanged) | Images are never cropped — letter-boxing is preferred over cropping for vocabulary images |

**Viewport behaviour of `clamp(14rem, 40vh, 24rem)`:**

| Viewport height | Computed max-height |
|----------------|---------------------|
| 500px (mobile) | 200px → clamped to min 224px (14rem) |
| 700px (tablet) | 280px |
| 900px (desktop)| 360px |
| 1080px+        | 384px (24rem ceiling) |

---

### 2.3 Responsive Notes

```yaml
responsive_notes:
  - "No media query overrides required — clamp() handles the responsive range natively"
  - "On mobile (< 768px), the card min-height is 24rem (existing rule); the image max-height of 14rem leaves sufficient room for term text below"
  - "On desktop (≥ 1280px), max-width 32rem stays within the card's max-width of 44rem — no overflow risk"
```

---

### 2.4 Accessibility Checklist

```yaml
accessibility_checklist:
  - "Image alt text is not affected by this change — existing alt='Flashcard illustration' is preserved"
  - "Larger images do not reduce text contrast — text is in a separate element below the image"
  - "object-fit: contain ensures no meaningful image content is clipped"
  - "No motion introduced — purely a size constraint change"
  - "Focus and interaction behaviour of the parent card are unchanged"
```

---

### 2.5 Files to Change

| Action | File |
|--------|------|
| **Edit** | `src/Tenax.Web/frontend/src/styles.css` — update `.flashcard-study-card__image` rule |

---

### 2.6 Frontend Handoff

```yaml
frontend_handoff:
  audience: "Frontend Developer"
  instructions:
    - "Locate .flashcard-study-card__image in styles.css (currently at line ~511)"
    - "Replace max-width: 26rem with max-width: 32rem"
    - "Replace max-height: min(50%, 16rem) with max-height: clamp(14rem, 40vh, 24rem)"
    - "All other properties remain identical — do not touch object-fit, border-radius, border, or background"
    - "Verify visually on the flashcard detail route AND the study mode route (Batch 1)"
    - "No JavaScript changes required"
```

---

### 2.7 Open Questions

```yaml
open_questions:
  - id: OQ-4
    question: >
      Should a minimum aspect-ratio guard be added (e.g. aspect-ratio: auto) to prevent
      very tall portrait images from dominating the card face on mobile?
    default_if_unresolved: "No — clamp min of 14rem provides a reasonable ceiling; revisit if user-uploaded images cause layout issues"
```

---

## Batch 3 — Breadcrumb Deck Name Fix

```yaml
batch: 3
title: "Breadcrumb Deck Name Fix — Replace raw deckId with resolved deck name"
detail_level: "standard"
objective: >
  Three flashcard sub-routes currently render the raw deckId GUID string in the
  breadcrumb deck segment because they do not call useDeckDetailQuery. This batch
  fixes all three routes to resolve the deck name before rendering breadcrumbs.
deliverables:
  - "Updated decks.$deckId.flashcards.new.tsx with useDeckDetailQuery"
  - "Updated decks.$deckId.flashcards.$flashcardId.tsx with useDeckDetailQuery"
  - "Updated decks.$deckId.flashcards.$flashcardId.edit.tsx with useDeckDetailQuery"
acceptance_criteria:
  - "Deck breadcrumb segment shows deck name (e.g. 'Spanish Basics'), not a GUID"
  - "Falls back to raw deckId while the deck query is loading — no blank segment"
  - "No visual change to breadcrumb styling — only the label content changes"
  - "No new loading spinners or error states for the deck name query — silent fallback is sufficient"
  - "The flashcard term breadcrumb segment in $flashcardId.tsx continues to use detailQuery.data?.term ?? flashcardId"
  - "The flashcard term breadcrumb segment in $flashcardId.edit.tsx continues to use detailQuery.data?.term ?? flashcardId"
dependencies:
  - "useDeckDetailQuery must be importable from ../api/decks (confirmed — already used in decks.$deckId.tsx)"
  - "No dependency on Batch 1 or Batch 2"
```

---

### 3.1 Pattern to Apply in All Three Routes

Add the following inside the component function, after `useParams()`:

```ts
import { useDeckDetailQuery } from "../api/decks";

// Inside the component:
const deckQuery  = useDeckDetailQuery(deckId);
const deckName   = deckQuery.data?.name ?? deckId;
```

Then replace the raw `deckId` string in the Breadcrumb `items` array deck segment with `deckName`.

---

### 3.2 Route-by-Route Changes

#### Route A — `decks.$deckId.flashcards.new.tsx`

**Current breadcrumb items:**
```tsx
items={[
  { label: "Decks",         href: "/decks" },
  { label: deckId,          href: `/decks/${deckId}` },   // ← raw GUID
  { label: "Flashcards",    href: `/decks/${deckId}/flashcards` },
  { label: "New flashcard" },
]}
```

**Updated breadcrumb items:**
```tsx
items={[
  { label: "Decks",         href: "/decks" },
  { label: deckName,        href: `/decks/${deckId}` },   // ← resolved name
  { label: "Flashcards",    href: `/decks/${deckId}/flashcards` },
  { label: "New flashcard" },
]}
```

**Imports to add:**
```ts
import { useDeckDetailQuery } from "../api/decks";
```

**State to add inside `FlashcardCreateRoute`:**
```ts
const deckQuery = useDeckDetailQuery(deckId);
const deckName  = deckQuery.data?.name ?? deckId;
```

---

#### Route B — `decks.$deckId.flashcards.$flashcardId.tsx`

**Current breadcrumb items:**
```tsx
items={[
  { label: "Decks",                                 href: "/decks" },
  { label: deckId,                                  href: `/decks/${deckId}` },   // ← raw GUID
  { label: "Flashcards",                            href: `/decks/${deckId}/flashcards` },
  { label: detailQuery.data?.term ?? flashcardId },
]}
```

**Updated breadcrumb items:**
```tsx
items={[
  { label: "Decks",                                 href: "/decks" },
  { label: deckName,                                href: `/decks/${deckId}` },   // ← resolved name
  { label: "Flashcards",                            href: `/decks/${deckId}/flashcards` },
  { label: detailQuery.data?.term ?? flashcardId },
]}
```

**Imports to add:**
```ts
import { useDeckDetailQuery } from "../api/decks";
```

**State to add inside `FlashcardDetailRoute`** (after existing `useParams` and `detailQuery`):
```ts
const deckQuery = useDeckDetailQuery(deckId);
const deckName  = deckQuery.data?.name ?? deckId;
```

> Note: `detailQuery` already exists in this route for the flashcard — the deck query is a second, independent query. Both run in parallel. No conflicts.

---

#### Route C — `decks.$deckId.flashcards.$flashcardId.edit.tsx`

**Current breadcrumb items:**
```tsx
items={[
  { label: "Decks",                                            href: "/decks" },
  { label: deckId,                                             href: `/decks/${deckId}` },   // ← raw GUID
  { label: "Flashcards",                                       href: `/decks/${deckId}/flashcards` },
  { label: detailQuery.data?.term ?? flashcardId,              href: `/decks/${deckId}/flashcards/${flashcardId}` },
  { label: "Edit" },
]}
```

**Updated breadcrumb items:**
```tsx
items={[
  { label: "Decks",                                            href: "/decks" },
  { label: deckName,                                           href: `/decks/${deckId}` },   // ← resolved name
  { label: "Flashcards",                                       href: `/decks/${deckId}/flashcards` },
  { label: detailQuery.data?.term ?? flashcardId,              href: `/decks/${deckId}/flashcards/${flashcardId}` },
  { label: "Edit" },
]}
```

**Imports to add:**
```ts
import { useDeckDetailQuery } from "../api/decks";
```

**State to add inside `FlashcardEditRoute`** (after existing `useParams`):
```ts
const deckQuery = useDeckDetailQuery(deckId);
const deckName  = deckQuery.data?.name ?? deckId;
```

> Note: `detailQuery` already exists for `useFlashcardDetailQuery` — variable name must remain `detailQuery` (or rename consistently throughout the component). The new `deckQuery` name avoids collision.

---

### 3.3 Fallback Behaviour

| Phase | Breadcrumb deck segment shows |
|-------|-------------------------------|
| `deckQuery.isLoading` | Raw `deckId` (GUID) — acceptable, transitions quickly |
| `deckQuery.isSuccess` | `deckQuery.data.name` — correct resolved name |
| `deckQuery.isError` | Raw `deckId` (GUID fallback) — no crash, degraded gracefully |

No loading indicators or error handling UI are needed for the deck name query in these routes. The fallback to `deckId` is silent.

---

### 3.4 Style Tokens Reference

No new tokens. No CSS changes in this batch.

---

### 3.5 Responsive Notes

No layout changes. Breadcrumb truncation at narrow viewports is handled by the existing `.breadcrumb__current` and `.breadcrumb__link` styles (no `max-width` constraint — long deck names may wrap, which is acceptable).

---

### 3.6 Accessibility Checklist

```yaml
accessibility_checklist:
  - "Breadcrumb aria-label='Breadcrumb' is inherited from Breadcrumb component — unchanged"
  - "aria-current='page' on the last item is inherited from Breadcrumb component — unchanged"
  - "No heading hierarchy changes — this batch is data-only"
  - "Screen readers will now announce the deck name rather than a UUID — an improvement"
  - "No focus management changes required"
  - "No colour or contrast changes"
  - "No motion introduced"
```

---

### 3.7 Files to Change

| Action | File |
|--------|------|
| **Edit** | `src/Tenax.Web/frontend/src/routes/decks.$deckId.flashcards.new.tsx` |
| **Edit** | `src/Tenax.Web/frontend/src/routes/decks.$deckId.flashcards.$flashcardId.tsx` |
| **Edit** | `src/Tenax.Web/frontend/src/routes/decks.$deckId.flashcards.$flashcardId.edit.tsx` |

---

### 3.8 Frontend Handoff

```yaml
frontend_handoff:
  audience: "Frontend Developer"
  instructions:
    - "In all three routes, add: import { useDeckDetailQuery } from '../api/decks'"
    - "In all three route components, add after useParams(): const deckQuery = useDeckDetailQuery(deckId); const deckName = deckQuery.data?.name ?? deckId;"
    - "Replace the raw deckId label in the Breadcrumb items deck segment with deckName"
    - "Do NOT add any loading spinner or error UI for the deck query — silent fallback only"
    - "Do NOT rename existing query variables (detailQuery, mutation) — the new variable is deckQuery"
    - "No CSS changes required for this batch"
    - "Verify that all three breadcrumb trails show the deck name on a page that has already loaded the deck (e.g. navigate from deck detail to flashcard detail and back)"
```

---

### 3.9 Open Questions

```yaml
open_questions:
  - id: OQ-5
    question: >
      The deck detail query will fire a second network request in routes that already
      load flashcard data. If the deck data is already in the React Query cache (user
      navigated from deck detail page), this is a cache hit and costs nothing.
      Should a staleTime be confirmed for useDeckDetailQuery to ensure cache hits
      in navigation flows?
    default_if_unresolved: "Confirm existing staleTime in api/decks.ts is ≥ 30_000ms — consistent with useFlashcardDetailQuery"
```

---

## Cross-Batch Summary

### Key Decisions

| Decision | Rationale |
|----------|-----------|
| Study mode bypasses PageScaffold | PageScaffold's large h1 and .page__surface chrome break the immersive card experience |
| Sequential default, optional shuffle | Predictability is better for first-time learners; shuffle is opt-in |
| Completion state in-route (no navigate) | Avoids browser history pollution; "Study again" resets in place |
| pageSize=500 single fetch | Avoids pagination complexity in a focused study UX; 500 is a safe ceiling for deck sizes |
| Dot indicators ≤ 20 cards only | Dots at 21+ cards would be too dense to be useful and would overflow on mobile |
| Image max-height via clamp() | Responsive without media queries; preserves minimum usable size on mobile |
| Deck name via useDeckDetailQuery | Reuses existing query hook and cache; consistent with deck detail route pattern |
| Silent fallback to deckId in breadcrumbs | No new error states needed; degraded display is always better than a crash |

### Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| `definitionPreview` may be truncated — study back face shows partial definition | Medium | Resolve OQ-1 before shipping Batch 1 to production; default to option A for now |
| Image not displayed in study mode (`hasImage: boolean` only, no `imageUrl`) | Medium | Tied to OQ-1; if option A is chosen, image support is deferred |
| Fisher-Yates reseeds on every toggle — user cannot get the same shuffle twice | Low | Acceptable for study UX; not a bug |
| `useEffect` keyboard listener deps array must include `handleNext`/`handlePrevious` if not wrapped in `useCallback` | Medium | Use `useCallback` for both handlers to avoid stale closure bugs |
| Long deck names truncate at `max-width: 20ch` in study header | Low | Ellipsis overflow is applied — full name is still accessible via breadcrumb |

---

*End of design handoff — study-mode-2026-04*
