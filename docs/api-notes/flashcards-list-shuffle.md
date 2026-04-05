# API Notes: GET /api/decks/{deckId}/flashcards — Shuffle & Batch Changes

- Feature: `flashcard-shuffle-server-side-deterministic-batching`
- ADR: [0017](../adr/0017-flashcard-shuffle-server-side-deterministic-batching.md)
- Active contract: [flashcards-list-shuffle-contract.yaml](../contracts/api/flashcards-list-shuffle-contract.yaml)
- Supersedes: [flashcards-list-contract.yaml](../contracts/api/flashcards-list-contract.yaml)

---

## ⚠️ Breaking Change: `pageSize` Maximum Reduced to 50

The `pageSize` maximum has been reduced from **100 → 50**.

Any request with `pageSize` between 51 and 100 inclusive now returns `400 validation_error`:

```json
{
  "code": "validation_error",
  "message": "Request validation failed",
  "errors": {
    "pageSize": ["pageSize must be less than or equal to 50"]
  }
}
```

**Audit all existing callers before deploying this change.** The authoring flashcard list defaults to `pageSize=50` and is unaffected.

---

## New Query Parameters

Two optional query parameters have been added. Existing callers that omit both parameters retain prior behaviour.

### `shuffle` (boolean, default: `false`)

Enables server-side deterministic shuffle. When `false` or omitted, ordering is unchanged: `UpdatedAtUtc DESC, Id DESC`.

### `shuffleSeed` (string, no default)

Seed string for the deterministic shuffle. **Required when `shuffle=true`; ignored when `shuffle=false`.**

A missing or empty `shuffleSeed` when `shuffle=true` returns `400 validation_error`:

```json
{
  "code": "validation_error",
  "message": "Request validation failed",
  "errors": {
    "shuffleSeed": ["shuffleSeed is required when shuffle is true"]
  }
}
```

---

## Ordering Behaviour

| `shuffle` value | `ORDER BY` applied |
|---|---|
| `false` (default) | `updated_at_utc DESC, id DESC` |
| `true` | `hashtext(id::text \|\| shuffleSeed)` ASC |

`hashtext()` is a PostgreSQL built-in function. Concatenating each card's `id` with the caller-supplied seed before hashing makes the ordering:

- **Deterministic** — the same `(deckId, shuffleSeed)` always produces the same card sequence across requests.
- **Seed-isolated** — different seeds produce different orderings for the same deck.
- **Extension-free** — no PostgreSQL extensions or schema migrations are required.

---

## Response Schema

The `200` response schema is **unchanged**. No new fields are added to the response body.

```
{ items[], page, pageSize, totalCount }
```

See [flashcards-list-shuffle-contract.yaml](../contracts/api/flashcards-list-shuffle-contract.yaml) for full schema, examples, and error shapes.

---

## Validation Summary

| Condition | Status | Error field |
|---|---|---|
| `pageSize > 50` | `400` | `pageSize` |
| `shuffle=true`, `shuffleSeed` absent or empty | `400` | `shuffleSeed` |
| `shuffle=false`, `shuffleSeed` absent | valid | — |
| `shuffle=false`, `shuffleSeed` present | valid (seed ignored) | — |

---

## Study Mode Usage Notes

- Generate `shuffleSeed = crypto.randomUUID()` **once per session** (store in `useRef`); never regenerate on re-render or route navigation within the same session.
- Study mode MUST use `pageSize=20`.
- Prefetch the next page when `currentCardIndex / loadedCards.length >= 0.75`.
- TanStack Query cache key shape: `["decks", deckId, "flashcards", { page, pageSize, shuffle, shuffleSeed }]` — each `(page, shuffleSeed)` pair is cached independently.
- Toggling shuffle flips the `shuffle` boolean while keeping the same `shuffleSeed`; previously fetched pages remain cached.

See `frontend_contract_notes` in [flashcards-list-shuffle-contract.yaml](../contracts/api/flashcards-list-shuffle-contract.yaml) for full cache and toggle behaviour.
