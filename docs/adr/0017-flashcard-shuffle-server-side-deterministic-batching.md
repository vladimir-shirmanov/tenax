# ADR 0017: Flashcard Shuffle — Server-Side Deterministic Batching

- Status: Accepted
- Date: 2026-04-04
- Owners: Backend Developer, Frontend Developer
- Related Contracts:
  - docs/contracts/api/flashcards-list-shuffle-contract.yaml

## Context

### Problem Statement
Study mode fetches flashcards with `pageSize=500`, which immediately produces a **400 Bad Request** because `ListFlashcardsInputValidator` caps `PageSize` at 100. This makes the study carousel completely non-functional.

Beyond the immediate 400 error, all shuffling is currently performed client-side after loading the full card dataset. This approach is wasteful for large decks: every session downloads every card before the user sees a single one, and there is no mechanism to page through a shuffled sequence reproducibly.

### Constraints
- PostgreSQL is the storage engine (via EF Core); no new extensions may be introduced.
- Shuffle ordering must be **deterministic** for a given (deck, seed) pair so that a prefetch issued before the user reaches the page boundary returns exactly the cards that will follow in sequence.
- The validator change reducing `PageSize` max from 100 to 50 is a **breaking change** for any existing caller that passes `pageSize` between 51 and 100 — this is acknowledged and accepted.
- No migrations are required: `hashtext()` is a PostgreSQL built-in function available in all supported versions.

### Existing System Assumptions
- `EfFlashcardRepository.ListByDeckAsync` currently applies `ORDER BY UpdatedAtUtc DESC, Id DESC`.
- `ListFlashcardsInputValidator` (FluentValidation) owns all pagination input constraints.
- The frontend consumes this endpoint via TanStack Query; cache keys currently include `(deckId, page, pageSize)`.

---

## Decision

### API Contract Change
`GET /api/decks/{deckId}/flashcards` gains two new **optional** query parameters:

| Parameter | Type | Required | Default | Constraint |
|---|---|---|---|---|
| `shuffle` | boolean | no | `false` | — |
| `shuffleSeed` | string | no | — | Required when `shuffle=true`; must be non-empty |

These parameters are additive for callers that omit them. Existing callers are unaffected unless they also pass `pageSize > 50` (see breaking change below).

### Validator Changes (`ListFlashcardsInputValidator`)
- `PageSize` maximum reduced from **100 → 50**.
- When `Shuffle = true`, `ShuffleSeed` must be present and non-empty. Violation returns `400 validation_error`.
- Study mode adopts `pageSize=20` as its working batch size.

### Repository Change (`EfFlashcardRepository.ListByDeckAsync`)
- **Default path** (`shuffle = false`): preserve existing `ORDER BY UpdatedAtUtc DESC, Id DESC`.
- **Shuffle path** (`shuffle = true`): replace the ORDER BY clause with:
  ```sql
  ORDER BY hashtext(id::text || :shuffleSeed)
  ```
  `hashtext()` is a PostgreSQL built-in function. It accepts a text input and returns an integer hash. Concatenating the card `id` with the caller-supplied `shuffleSeed` before hashing ensures:
  - The ordering is unique to that seed.
  - The same seed always produces the same ordering (deterministic).
  - No external extension or migration is required.

### Architectural Boundaries
```
Web (Controller)
  └─ receives shuffle + shuffleSeed query params
  └─ delegates to Application layer (ListFlashcardsQuery)

Application (ListFlashcardsQuery / Handler)
  └─ passes shuffle flag and shuffleSeed to repository contract
  └─ no domain logic change — ordering is a persistence concern

Domain
  └─ unchanged

Infrastructure (EfFlashcardRepository)
  └─ owns hashtext() ORDER BY construction
  └─ conditional branch: default ORDER BY vs. shuffle ORDER BY
```

### Frontend Study Mode Behavior
- Generate `shuffleSeed = crypto.randomUUID()` **once per session**, held in a stable `useRef`.
- Initial fetch: `page=1, pageSize=20`.
- **Prefetch trigger**: when `currentCardIndex >= 75% of loadedCards.length`, fire next page request.
- Pages are **concatenated in-memory** as they arrive; the user never sees a loading gap mid-session.
- **Progress indicator**: derived from `totalCount` in the first response's pagination metadata — no extra request required.
- **Shuffle toggle**: keep same `shuffleSeed`, flip the `shuffle` boolean param, reset `currentCardIndex` to 0, re-fetch from `page=1`. Because the seed is unchanged, turning shuffle off and on again within the same session returns the same shuffled sequence.
- **TanStack Query cache key**: `["decks", deckId, "flashcards", { page, pageSize, shuffle, shuffleSeed }]` — each (seed, page) pair is cached independently, enabling prefetch to populate the cache before it is needed.

---

## Alternatives Considered

### 1. Client-Side Shuffle with Full Dataset Load (Rejected)
Load all cards (e.g., `pageSize=500`) and shuffle in the browser.

**Rejected because:**
- Immediately produces a 400 error from the existing `pageSize` cap.
- Requires loading the entire deck before the first card is shown — O(n) network cost for a feature that only ever displays one card at a time.
- Does not scale for large decks; memory pressure on mobile browsers is a concern.
- Raising the cap to 500 defeats any future lazy-loading ambition.

### 2. `pg_crypto` / `gen_random_uuid()` Random Sort (Rejected)
Use `ORDER BY gen_random_uuid()` (requires `pgcrypto`) or similar per-row random value.

**Rejected because:**
- Requires the `pgcrypto` extension — introduces a new infrastructure dependency and a migration.
- **Non-deterministic**: different pages of the same "session" would produce different, overlapping orderings. Prefetching page 2 before the user reaches it would return unpredictable cards that may duplicate or skip cards already shown.
- Cannot guarantee stable pagination across requests — fundamentally incompatible with the lazy-batching approach.

### 3. Raise `PageSize` Cap to 500 (Rejected)
Simply increase the validator maximum to allow study mode's existing `pageSize=500` call.

**Rejected because:**
- Fixes the 400 error but does not introduce any efficiency improvement.
- Loads the entire deck in a single request — antithetical to lazy batching.
- Still performs all shuffle client-side, inheriting the scalability problem at larger cap values.
- Does not provide a reproducible server-side ordering for prefetch correctness.

---

## Consequences

### Positive Impacts
- Study mode no longer returns 400 — the immediate production blocker is resolved.
- Deterministic server-side ordering makes prefetch reliable: page N+1 fetched before the user reaches it will always contain exactly the cards that follow page N.
- `pageSize=20` with 75%-threshold prefetch is significantly more efficient than loading 500 cards upfront; initial page load latency drops substantially for large decks.
- No PostgreSQL extension or schema migration is required — `hashtext()` is available on all target PostgreSQL versions.
- The `shuffleSeed` is session-stable: toggling shuffle on/off within a session produces a consistent experience with no re-shuffling surprise.

### Trade-offs and Risks
- **Breaking change**: reducing `PageSize` max from 100 to 50 will cause `400` for any existing caller passing `pageSize` between 51 and 100. All known callers must be audited before deployment. The authoring list view uses `pageSize=50` by default (per the existing contract) and is unaffected.
- **`hashtext()` is PostgreSQL-internal**: the function is not part of the SQL standard and is not documented as stable across major PostgreSQL versions (though it has not changed in practice). If the storage engine is ever replaced, the shuffle implementation must be revisited.
- **In-memory concatenation on the frontend**: the client accumulates pages across the session. For very large decks (thousands of cards studied in one session), this grows unbounded. Accepted for now; a sliding-window eviction strategy is a follow-up if needed.
- **No server-side session state**: the server is stateless — it is the client's responsibility to preserve the `shuffleSeed` for the session duration.

### Follow-up Tasks
- Audit all existing API callers for `pageSize > 50` before merging.
- Update the authoring flashcard list component if it ever passes `pageSize > 50`.
- Consider a sliding-window in-memory card store for sessions with very large decks (post-MVP).
- Add integration test: same `(deckId, shuffleSeed)` across two requests returns identical ordering.

---

## Parallel Delivery Notes

### Backend Track
1. Add `Shuffle` (bool) and `ShuffleSeed` (string) to `ListFlashcardsQuery` / input model.
2. Update `ListFlashcardsInputValidator`: reduce `PageSize` max to 50; add `ShuffleSeed` required-when-`Shuffle`-true rule.
3. Update `IFlashcardRepository.ListByDeckAsync` signature to accept `shuffle` and `shuffleSeed` parameters.
4. In `EfFlashcardRepository.ListByDeckAsync`: branch on `shuffle`; when true, apply `ORDER BY hashtext(id::text || shuffleSeed)` via raw SQL fragment or EF Core `OrderBy` with `EF.Functions`.
5. Update controller to bind the two new query params and forward them to the query.
6. Ensure `400` responses for `shuffle=true, shuffleSeed` absent/empty include a descriptive field-level error.

### Frontend Track
1. In study mode route (`decks.$deckId.study.tsx`): initialise `shuffleSeed` via `crypto.randomUUID()` in a `useRef` — never regenerate on re-render.
2. Replace the `pageSize=500` fetch with `page=1, pageSize=20` using the new TanStack Query key shape: `["decks", deckId, "flashcards", { page, pageSize, shuffle, shuffleSeed }]`.
3. Implement page-concatenation: maintain `loadedCards` as accumulated array across page responses.
4. Implement 75%-threshold prefetch: when `currentCardIndex / loadedCards.length >= 0.75`, prefetch next page.
5. Wire shuffle toggle: flip `shuffle` boolean, keep same `shuffleSeed`, reset `currentCardIndex = 0`, invalidate/re-fetch from `page=1`.
6. Drive progress indicator from `totalCount` field of the first page response.

### Shared Contract Milestones
- `docs/contracts/api/flashcards-list-shuffle-contract.yaml` is the source of truth for both tracks.
- Backend must return `400` with `shuffleSeed` field error before frontend wires the toggle.
- Both tracks can develop against the contract independently; integration point is the new query params and the unchanged `200` response schema.
