```yaml
batch: 1
title: "Form Validation Behavior UX (Zod + React Hook Form)"
detail_level: "standard"
objective: "Define behavior-level UX for form validation display across Tenax frontend forms (DeckForm, FlashcardForm, etc.), ensuring non-intrusive error visibility."
deliverables:
  - "Validation visibility matrix and interaction rules"
  - "Submit button blocking states"
  - "Accessibility mapping for dynamic error contexts"
acceptance_criteria:
  - "Validation errors are completely hidden by default upon initial form render."
  - "A field's specific validation error is only revealed after that field becomes dirty."
  - "The form submission must be blocked (or submit button naturally disabled/prevented) if the underlying Zod schema is invalid."
  - "Original API requests, payloads, and domain boundaries remain identical to the existing implementation."
  - "If any subtle motion (like fade-in/slide-down) is introduced for error messages, it must be disabled when `prefers-reduced-motion` is active."
dependencies:
  - "Existing standard API contracts and Zod schemas"
  - "React Hook Form integration state (dirtyFields)"
accessibility_checklist:
  - "Ensure `aria-invalid='true'` is applied logically and matches the visible error state, not just the hidden background state."
  - "Ensure `aria-describedby` links correctly to the ID of the error message container only when the message is dynamically rendered."
  - "Focus state expectations remain native (e.g., submitting an invalid form can focus the first invalid field)."
frontend_handoff:
  - "Implemented in DeckForm and FlashcardForm with React Hook Form + zod resolver."
  - "Error component rendering is gated by `formState.dirtyFields[fieldName]`."
  - "Component tests cover dirty-gated validation visibility and invalid-submit blocking."
```