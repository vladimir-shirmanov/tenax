# Project Guidelines

## Architecture

This application is a flashcard-based language tutor in the style of Quizlet, built as a single deployable monolith.
Use Clean Architecture boundaries inside the monolith rather than splitting into separate services.
Keep dependencies flowing inward only: Web -> Application -> Domain, with Infrastructure depending on Application and Domain to provide implementations.
When adding projects, keep the solution file in sync and preserve the folder schema below.

Expected folder schema:

```text
src/
	Tenax.AppHost/         ← .NET Aspire orchestrator (Postgres, Keycloak, Web API, Vite frontend)
	Tenax.Domain/
	Tenax.Application/
	Tenax.Infrastructure/
	Tenax.ServiceDefaults/ ← shared Aspire telemetry/health defaults
	Tenax.Web/             ← ASP.NET Core Minimal API + React SPA (src/Tenax.Web/frontend/)
tests/
	Tenax.Domain.Tests/
	Tenax.Application.Tests/
	Tenax.Infrastructure.Tests/
	Tenax.Web.Tests/
```

Organize business capabilities for the language tutor around cohesive features such as users, decks, flashcards, study sessions, spaced repetition, progress tracking, and billing only if it is actually introduced.
Inside the Application and Web layers, prefer feature-based folders over technical dumping grounds.

Layer responsibilities:
- `Tenax.Domain`: entities, value objects, domain services, business rules, enums, domain events, and invariants.
- `Tenax.Application`: use cases, commands, queries, DTOs, FluentValidation validators, interfaces, and orchestration of study flows.
- `Tenax.Infrastructure`: persistence, identity, external integrations, background processing, and implementations of application interfaces.
- `Tenax.Web`: ASP.NET Core Minimal API endpoints, authentication wiring, request/response contracts, composition root, and UI concerns if a server-rendered frontend is added.

## Build and Test

### .NET

```bash
# Build the entire solution
dotnet build

# Run all .NET tests
dotnet test

# Run a single test class or method
dotnet test --filter "FullyQualifiedName~DecksEndpointsTests"
dotnet test --filter "FullyQualifiedName~DecksEndpointsTests.CreateDeck_Returns201"

# Run with coverage
dotnet test --settings coverage.runsettings

# Run the full stack locally (requires Docker for Postgres + Keycloak)
dotnet run --project src/Tenax.AppHost

# Skip the Vite frontend when starting Aspire (faster API-only iteration)
$env:TENAX_APPHOST_SKIP_FRONTEND="true"; dotnet run --project src/Tenax.AppHost

# EF Core migrations
dotnet ef migrations add <Name> --project src/Tenax.Infrastructure --startup-project src/Tenax.Web
dotnet ef database update --project src/Tenax.Infrastructure --startup-project src/Tenax.Web
```

### Frontend (from `src/Tenax.Web/frontend/`)

```bash
cd src/Tenax.Web/frontend

npm run dev          # Vite dev server (started automatically by Aspire in development)
npm run build        # TypeScript compile + Vite production build
npm run test         # Jest unit tests (--runInBand)
npm run test:e2e     # Playwright end-to-end tests (all browsers)
npm run test:e2e:chromium  # Playwright Chromium only

# Run a single Jest test file or test name
npm run test -- --testPathPattern="decks.routes"
npm run test -- --testNamePattern="shows deck list"
```

## Key Patterns

### Application service result type

Application services return `XResult<T>` (e.g., `DeckResult<T>`) — a discriminated union, not exceptions:

```csharp
public sealed class DeckResult<T>
{
    public bool IsSuccess => Failure is null;
    public T? Value { get; }
    public DeckFailure? Failure { get; }   // Code + Message + optional field Errors dict
}
```

Endpoint handlers map failure codes to HTTP status codes with a `switch` on `failure.Code`. Add new error codes to the static `*ErrorCodes` class in Application; map them in the endpoint's `ToErrorResult` method.

### API error envelope

All error responses use a single shape:

```json
{ "code": "deck_not_found", "message": "...", "traceId": "...", "errors": { "name": ["..."] } }
```

`errors` is present only for `validation_error`. The frontend reads `error.envelope.code` (via `ApiError`) to branch on specific failure types.

### Authentication split

- **Frontend**: OIDC Authorization Code + PKCE via `oidc-client-ts`. Auth config is resolved at runtime from `window.TENAX_AUTH_CONFIG` (injected server-side or by Aspire env vars). Vite `VITE_TENAX_AUTH_*` variables are a dev-only fallback.
- **Backend**: Validates JWT Bearer tokens issued by Keycloak. The `BearerTokenAuthenticationHandler` reads `Authentication__JwtBearer__*` config, which Aspire injects automatically in development.
- The two sides are decoupled: the backend never redirects to Keycloak; the frontend never validates tokens.

### Aspire local development

`Tenax.AppHost` orchestrates: Postgres → Web API → Keycloak (dev only) → Vite frontend. Keycloak is imported from `src/Tenax.AppHost/keycloak/import/tenax-realm-dev.json`. The Web API waits for Postgres; the frontend waits for the Web API.

### Frontend query key factories

Each API module exports a `*Keys` factory. Use it consistently for cache invalidation:

```ts
export const deckKeys = {
  all: ["decks"] as const,
  listRoot: () => [...deckKeys.all, "list"] as const,
  list: (page, pageSize) => [...deckKeys.listRoot(), page, pageSize] as const,
  detail: (deckId) => [...deckKeys.all, "detail", deckId] as const,
};
```

Invalidate `listRoot()` after create/update/delete. Set the detail cache entry directly after create/update to avoid a redundant fetch.

### Frontend form validation

Forms use `react-hook-form` + `zod` + `@hookform/resolvers/zod`. Field errors should only appear after a field has been touched (blurred or dirtied), per ADR-0014. Backend validation errors (`validation_error` envelope) are merged into form field errors after submission.

### Frontend route naming

Route files follow a flat dot-notation convention mirroring the URL path:

```
decks.tsx                                   → /decks
decks.new.tsx                               → /decks/new
decks.$deckId.tsx                           → /decks/:deckId
decks.$deckId.flashcards.index.tsx          → /decks/:deckId/flashcards
decks.$deckId.flashcards.$flashcardId.tsx   → /decks/:deckId/flashcards/:flashcardId
```

All routes are registered in `src/app/router.tsx` under a single `AppShell` parent.

### Integration tests

`CustomWebApplicationFactory` starts a `postgres:16-alpine` Testcontainer, runs EF Core migrations, and replaces only the authentication handler (`TestAuthHandler`). All application, infrastructure, and persistence behavior is real. Tests are in `tests/Tenax.Web.Tests/`.

## Conventions

Keep the repository free of generated build artifacts such as `bin/`, `obj/`, `packages/`, Rider module files, and ReSharper caches, consistent with `.gitignore`.
Use the `.NET CLI` (`dotnet`) for development interactions such as project creation, solution updates, package/dependency changes, tool restore/run, and EF Core migrations (`dotnet ef`).
Prefer explicit project references and clear layer boundaries over convenience shortcuts.
Prefer loosely coupled dependencies and dependency inversion. Depend on abstractions in Application/Domain and wire concrete implementations through dependency injection.
Prefer constructor injection for services and avoid service locator patterns.
Use static classes or static methods only for extension methods unless there is a strong technical reason.
Do not let Domain depend on Infrastructure or Web.
Do not place business rules in controllers, endpoints, or persistence models when they belong in Domain or Application.
In `Tenax.Web`, prefer Minimal API route groups and endpoint mappings over MVC controllers unless explicitly required.
Use FluentValidation for application-level request and command/query validation.
Place DI registration extensions in the appropriate layer as dedicated files (for example, `DependencyInjection.cs`) instead of mixing registration code into unrelated classes.
When introducing folders beneath the main projects, follow the feature names already used by the language tutor domain instead of creating generic `Helpers`, `Utils`, or `Misc` buckets.