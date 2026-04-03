```yaml
batch: 1
title: "Flashcard Study Interaction Design"
detail_level: "standard"
objective: "Implement an interactive, accessible 3D-flipping flashcard component for studying."
deliverables:
  - "Visual styling tokens for card container, typography, and image layout"
  - "CSS 3D flip animation specifications with `prefers-reduced-motion` fallback"
  - "Responsive layout behavior across 375px, 768px, and 1440px breakpoints"
  - "Interactive focus states and keyboard navigation mapping (`Space`/`Enter` to flip)"
acceptance_criteria:
  - "AC-1: Front side displays term and optional image; back side displays definition"
  - "AC-2: Card is fully keyboard accessible and respects reduced motion preferences"
  - "AC-3: Implementation does not require changes to existing API contracts"
  - "AC-4: Scope is strictly frontend component and styling changes"
dependencies:
  - "Existing Tenax.Web API contracts for Flashcard objects"
  - "Global styling rules in src/styles.css"
accessibility_checklist:
  - "Card container must be focusable (e.g., `tabindex=\"0\"` or `<button>` element)"
  - "Focus ring must be explicitly visible and meet contrast requirements"
  - "Screen reader text should convey that the card can be flipped"
  - "CSS `transition: none` must be applied when `prefers-reduced-motion: reduce` is active (use immediate swap)"
frontend_handoff:
  - "Implement the Flashcard component with fixed aspect ratio or min-height adapting to content"
  - "Apply CSS transforms (`rotateY`) and `backface-visibility: hidden` for the 3D effect"
  - "Bind `onClick`, and `onKeyDown` (Space/Enter) to trigger the flip state"
  - "Maintain existing action row and loading/error states around the new card"
```

## Design Specification

### Content Hierarchy
**Front Side:**
1. Optional Image: Centered, max-height constraints (e.g., 50% of card height), `object-fit: contain`.
2. Term (Text): Primary heading style (e.g., `text-2xl font-bold text-gray-900`), vertically centered if no image, or below image.

**Back Side:**
1. Definition (Text): Secondary text style (e.g., `text-xl text-gray-700`), scrollable if content exceeds card height.

### Animation Intent & Reduced Motion
- **Default:** 0.6s `ease-in-out` transition on `transform`. `.card-inner` rotates `180deg` on the Y-axis.
- **Fallback:** `@media (prefers-reduced-motion: reduce)` disables `transition`. The card swaps faces instantly to prevent dizziness/nausea.

### Keyboard & Focus Interaction
- The card itself acts as a single primary interactive element (button).
- When focused, display a clear, accessible focus ring (e.g., `ring-2 ring-primary-500 ring-offset-2`).
- Pressing `Space` or `Enter` while focused toggles the card's flipped state.

### Responsive Behavior
- **Mobile (375px):** Card takes up full container width minus standard padding (e.g., `w-full px-4`). Height might be fixed (e.g., `min-h-[400px]`) or aspect-ratio based (`4/5`).
- **Tablet (768px):** Card is centered, constrained to a max-width (e.g., `max-w-md`). Min-height increases slightly.
- **Desktop (1440px):** Card size remains readable; do not stretch indefinitely (e.g., `max-w-lg`). Focus on comfortable line length for the definition.

### Visual Style Tokens
- **Background:** `bg-white` (or `bg-gray-800` for dark mode)
- **Shadow:** `shadow-md` for default elevation, changing to `shadow-lg` on hover to afford clickability.
- **Border:** `border border-gray-200` to define edges clearly.
- **Border Radius:** `rounded-xl` (matching existing Tenax style language).

## Implementation Reconciliation (Completed 2026-03-18)

Implemented files:
- src/Tenax.Web/frontend/src/routes/decks.$deckId.flashcards.$flashcardId.tsx
- src/Tenax.Web/frontend/src/routes/flashcards.routes.test.tsx
- src/Tenax.Web/frontend/src/styles.css

Delivered interaction details:
- Route now renders a single interactive study card button.
- Front face shows term and optional image when imageUrl is provided.
- Back face shows definition.
- Pointer click and keyboard activation (Enter/Space on focused button) flip between faces.
- Flip state resets when deck/flashcard identity changes.

Motion and accessibility details:
- Default motion uses a 3D rotateY transform on .flashcard-study-card__inner.
- Reduced-motion behavior is applied through both:
  - Runtime class toggle: .flashcard-study-card--reduced-motion
  - CSS media query fallback: @media (prefers-reduced-motion: reduce)
- Focus visibility is provided by :focus-visible outline rules and dedicated card focus styling.

Preserved existing route behavior:
- Existing loading, error, and retry rendering remain unchanged.
- Existing edit and delete actions (including delete confirmation flow) remain unchanged.

Regression coverage included:
- click flip behavior (term -> definition)
- keyboard parity with Enter and Space
- optional image displayed only on front face
- reduced-motion class application when matchMedia reports reduced motion