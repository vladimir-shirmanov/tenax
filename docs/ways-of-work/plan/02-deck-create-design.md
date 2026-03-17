```yaml
batch: 2
title: "Deck Create Interface"
detail_level: "standard"
objective: "Design a focused, frictionless flow for creating a new learning deck."
deliverables:
  - "Creation form layout (Name, Description)"
  - "Inline validation and error states"
  - "Success transition (redirecting to deck detail or list)"
acceptance_criteria:
  - "Form clearly indicates required constraints (Name max 120 chars)"
  - "Validation feedback is immediate, accessible, and informative"
  - "Submission state disables inputs to prevent duplicate POSTs"
dependencies:
  - "API Contract: decks-create-contract.yaml"
visual_direction:
  mood: "Focused, simple, utility-driven"
  references:
    - "Standard SaaS resource creation patterns"
  constraints:
    - "Do not overwhelm the user; keep the form center-aligned or constrained in width for readability"
layout_blueprint:
  - "Page Header: 'Create new deck' and back navigation"
  - "Form Container: Max-width constrained form area"
  - "Input: Deck Name (text input, required)"
  - "Input: Description (textarea, optional)"
  - "Action Bar: 'Create Deck' submit button and 'Cancel' link"
style_tokens:
  color:
    - "Focus rings: primary accent color"
    - "Error states: destructive brand red for borders and helper text"
  typography:
    - "Labels: strongly weighted to attach clearly to inputs"
    - "Helper text: small, subdued"
  spacing:
    - "Vertical rhythm between form fields should be distinct (e.g., 24px)"
  shape:
    - "Standard input border-radius and heights matching the existing design system"
interaction_notes:
  - "Focus the 'Name' input automatically on page mount (if non-mobile) to speed up creation."
  - "Show character countdown for Name (x/120) and Description (x/1000)."
  - "On submit, button transitions to a loading state (spinner + 'Creating...')."
responsive_notes:
  - "Mobile (375px): Inputs span full width. Form actions span full width and stack, with primary action on top."
  - "Tablet/Desktop: Form is center-aligned or left-aligned within a container max-width (e.g., 600px). Actions are inline, right-aligned."
content_notes:
  - "Name Input Label: 'Deck Name'"
  - "Name Helper: 'e.g., Spanish Travel Phrases, JLPT N5 Vocabulary'"
  - "Description Helper: 'Add context on what you are learning in this deck.'"
  - "Validation Error: 'A deck must have a name to get started.'"
accessibility_checklist:
  - "Labels are properly linked to inputs via 'htmlFor' and 'id'"
  - "Validation error messages use 'aria-live' polite to announce to screen readers"
  - "Inputs use 'aria-invalid' when failing validation"
  - "Focus is predictably managed during loading states and transitions"
frontend_handoff:
  - "Implement standard HTML forms or React Hook Form adhering to the 120/1000 character limits defined in the contract."
  - "Handle 400 Bad Request responses by mapping field-level 'errors' to the respective input."
  - "On successful 201 response, redirect to the newly created deck's detail page."
open_questions:
  - "After creation, is the user immediately dropped into a 'Create Flashcard' flow, or just the deck overview?"
```

## Implementation Status (2026-03-17)

- Implemented in frontend route `routes/decks.new.tsx` using shared `DeckForm` validation and API error mapping.
- Successful create currently redirects to deck detail (`/decks/{deckId}`).
- Create mutation seeds detail cache and invalidates deck list cache per contract notes.