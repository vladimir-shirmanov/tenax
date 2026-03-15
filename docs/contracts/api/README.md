# API Contracts Directory

This folder stores strict API response contracts used as implementation source of truth.

## Rules
- One contract file per endpoint or endpoint family.
- Use `.github/agents/templates/api-response-contract-template.md`.
- Backend and frontend implementations must follow these contracts.
- Any breaking response change requires ADR update and orchestrator approval.

## Flashcard Authoring Coverage (Implemented)

The flashcard authoring and management epic is implemented against these contract files:

- `flashcards-create-contract.yaml`
	- API endpoint: `POST /api/decks/{deckId}/flashcards`
	- Frontend route usage: `routes/decks.$deckId.flashcards.new.tsx`
- `flashcards-list-contract.yaml`
	- API endpoint: `GET /api/decks/{deckId}/flashcards`
	- Frontend route usage: `routes/decks.$deckId.flashcards.index.tsx`
- `flashcards-get-detail-contract.yaml`
	- API endpoint: `GET /api/decks/{deckId}/flashcards/{flashcardId}`
	- Frontend route usage: `routes/decks.$deckId.flashcards.$flashcardId.tsx`
- `flashcards-update-contract.yaml`
	- API endpoint: `PUT /api/decks/{deckId}/flashcards/{flashcardId}`
	- Frontend route usage: `routes/decks.$deckId.flashcards.$flashcardId.edit.tsx`
- `flashcards-delete-contract.yaml`
	- API endpoint: `DELETE /api/decks/{deckId}/flashcards/{flashcardId}`
	- Frontend route usage: `routes/decks.$deckId.flashcards.$flashcardId.tsx` (delete confirmation flow)

### Contract-First Alignment Notes

- Backend and frontend tracks were delivered in parallel using ADR 0001 and these contracts as the shared source of truth.
- TanStack Query cache behavior in frontend implementation follows the `frontend_contract_notes` policies in each contract file.

### Test Evidence (High-Level)

- Backend handoff reports successful build and passing backend automated tests for flashcard CRUD.
- Frontend handoff reports successful build and passing frontend automated tests for flashcard list/create/detail/edit/delete flows.

### Known Follow-Ups and Risks

- HTTP autotests are still needed to harden endpoint-level contract regression detection.
- Durable persistence strategy remains a planned follow-up.
- Manual frontend visual QA browser matrix has not yet been completed.
