# 1. Epic Name

Flashcard Authoring and Management (Term, Definition, Optional Image)

## Delivery Status (2026-03-15)

- Status: Implemented across architecture, backend, and frontend tracks.
- Contract alignment: Implemented against ADR 0001 and the five flashcard API contracts under `docs/contracts/api/`.
- Backend coverage: Flashcard CRUD endpoints and automated backend tests are complete per backend handoff (build succeeded, tests passed).
- Frontend coverage: Deck-scoped list/create/detail/edit/delete-confirm routes are complete under `src/Tenax.Web/frontend` with TanStack Query cache policies aligned to contract notes; frontend build/tests passed per handoff.
- Remaining follow-ups:
  - Add HTTP autotests focused on endpoint-level contract verification (especially non-happy-path coverage).
  - Finalize durable persistence planning for production-grade storage strategy.
  - Complete manual visual QA browser matrix for frontend UX verification.

# 2. Goal

## Problem
Language learners and content creators currently do not have a structured way to create and manage flashcards in the Tenax platform. Without CRUD capabilities, users cannot build personalized study material, iterate on card quality, or maintain deck accuracy over time. This blocks core product value because study sessions depend on high-quality, user-maintained card content. It also limits retention and engagement, since users cannot quickly fix mistakes or evolve card sets as they learn.

## Solution
Implement end-to-end flashcard CRUD capabilities that allow users to create, read, update, and delete flashcards inside decks. Each flashcard must include a required term or phrase, a required definition, and an optional image. Provide clear validation, consistent user flows, and reliable data persistence so users can confidently manage their study content.

## Impact
This epic establishes the minimum viable content management foundation for study workflows. Expected outcomes include increased number of created flashcards per active user, higher deck completion rates, and improved weekly active engagement from users who can maintain their own learning content.

# 3. User Personas

- Language Learner: Creates and edits cards to memorize vocabulary, phrases, and translations tailored to personal goals.
- Tutor or Instructor: Curates deck content for students and updates cards based on lesson progress.
- Content Manager (Internal or Power User): Maintains quality and consistency of larger card collections over time.

# 4. High-Level User Journeys

- Create Flashcard Journey:
  User opens a deck, selects Create Flashcard, enters term or phrase and definition, optionally adds an image, submits, and sees the new card in the deck list.
- View Flashcards Journey:
  User opens a deck and sees a list of flashcards with key fields and lightweight metadata (for example, last updated timestamp).
- Update Flashcard Journey:
  User selects an existing flashcard, edits term, definition, and/or image, saves changes, and sees updated content reflected immediately.
- Delete Flashcard Journey:
  User selects Delete on a flashcard, confirms the action, and the card is removed from the deck list.
- Validation and Error Recovery Journey:
  User attempts to submit invalid data (such as empty required fields) and receives actionable validation errors without losing entered data.

# 5. Business Requirements

## Functional Requirements

- The system must allow authorized users to create a flashcard within a selected deck.
- A flashcard must have:
  - Term or phrase to memorize (required).
  - Definition (required; can represent an answer or translation).
  - Image (optional).
- The system must allow users to retrieve and view flashcards in a deck.
- The system must allow users to retrieve a specific flashcard detail view.
- The system must allow users to update any editable flashcard field (term, definition, image).
- The system must allow users to delete a flashcard.
- The system must validate required fields and reject invalid create/update requests.
- The system must preserve data integrity between deck and flashcard relationships.
- The system must support image reference handling for optional image attachment (for example, URL or stored media reference).
- The system must provide clear success and failure feedback for every CRUD action.
- The system must enforce access control so users can only manage flashcards they are permitted to edit.
- The system must capture auditable metadata for flashcards (created at, updated at, created by/updated by if available).

## Non-Functional Requirements

- Performance:
  - Typical flashcard create/update/delete operations should complete within 500 ms server processing time under normal load.
  - Deck flashcard list retrieval should support responsive UX for common deck sizes.
- Security:
  - All CRUD operations require authenticated access.
  - Authorization checks must be enforced for each write operation.
  - Inputs must be sanitized/validated to reduce injection and malformed payload risks.
- Reliability:
  - CRUD operations must be transactional where needed to prevent partial writes.
  - API error responses must be consistent and diagnosable.
- Accessibility:
  - Forms and controls must be keyboard accessible and screen-reader friendly.
  - Validation feedback must be programmatically associated with input fields.
- Privacy and Compliance:
  - User-generated content handling must follow platform privacy policy.
  - Image handling must avoid exposing private storage details in client responses.
- Observability:
  - Log key CRUD events and failures with correlation identifiers.
  - Emit metrics for operation count, latency, and error rate.

# 6. Success Metrics

- Activation KPI: Percentage of new users who create at least 1 flashcard within first session.
- Content Growth KPI: Average number of flashcards created per active user per week.
- Engagement KPI: Increase in weekly active users who perform at least one flashcard edit/update action.
- Quality KPI: Validation error rate per create/update request (target downward trend after onboarding improvements).
- Reliability KPI: Flashcard CRUD API success rate >= 99.5% over rolling 30 days.
- Performance KPI: p95 response time for CRUD endpoints within agreed SLA.

# 7. Out of Scope

- Spaced repetition scheduling logic and review interval algorithms.
- Bulk import/export of flashcards.
- AI-generated card suggestions or automatic translation.
- Audio pronunciation uploads or playback.
- Rich text formatting beyond baseline text fields.
- Advanced image editing/cropping pipeline.
- Billing, subscription gating, or monetization logic.

# 8. Business Value

High.

This epic unlocks the foundational workflow for a flashcard learning product: creating and maintaining study content. Without CRUD for flashcards, downstream experiences such as study sessions and progress tracking cannot deliver sustained user value. Implementing this epic enables immediate user utility and creates a platform base for future differentiated learning features.
