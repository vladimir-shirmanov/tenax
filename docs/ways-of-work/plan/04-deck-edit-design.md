```yaml
batch: 4
title: "Deck Edit Interface"
detail_level: "standard"
objective: "Allow users to safely update an existing deck’s metadata."
deliverables:
  - "Edit form populated with existing deck data"
  - "Loading state before data is populated"
  - "Save/Cancel actions and corresponding interaction states"
acceptance_criteria:
  - "Form initializes with current server state to avoid accidental data overwriting"
  - "Unsaved changes are warned if the user attempts to navigate away (optional but recommended)"
  - "Validation rules exactly match the Create flow"
dependencies:
  - "API Contract: decks-get-detail-contract.yaml (to populate)"
  - "API Contract: decks-update-contract.yaml"
visual_direction:
  mood: "Utilitarian, familiar"
  references:
    - "Matches Form Create flow exactly but with prepopulated data"
  constraints:
    - "Keep layout identical to Create Interface to minimize cognitive load."
layout_blueprint:
  - "Page Header: 'Edit Deck' and back navigation"
  - "Form Container: matching the Create view"
  - "Input: Deck Name"
  - "Input: Description"
  - "Action Bar: 'Save Changes' and 'Cancel'"
style_tokens:
  color:
    - "Same as Create Interface"
  typography:
    - "Same as Create Interface"
  spacing:
    - "Same as Create Interface"
  shape:
    - "Same as Create Interface"
interaction_notes:
  - "Display skeleton loaders for form inputs while fetching the existing deck details."
  - "Disable the 'Save Changes' button if the form data has not been modified from the server state (dirty check)."
  - "Show success toast upon successful update."
responsive_notes:
  - "Matches Create Interface."
content_notes:
  - "Action Button: 'Save Changes' instead of 'Create Deck'"
  - "Cancel Action: 'Discard changes'"
accessibility_checklist:
  - "Matches Create Interface"
  - "Success toast messages use 'aria-live' polite to assure users their update worked without requiring visual confirmation."
frontend_handoff:
  - "Fetch initial data using decks-get-detail before rendering the form."
  - "Implement dirty state checking to prevent unnecessary API calls and disable the submit button."
  - "On 200 OK update, redirect back to the Deck Detail page."
open_questions:
  - "Should deleting the deck be exposed as a secondary action on this form, or only on the list/detail views?"
```

## Implementation Status (2026-03-17)

- Implemented in frontend route `routes/decks.$deckId.edit.tsx` using prefetch + prepopulated `DeckForm` and dirty-state submit gating.
- Successful update redirects back to deck detail (`/decks/{deckId}`).
- Delete action remains on list workflow (not embedded in edit form), matching current route behavior.