# Project Guidelines

## Architecture

This application is a flashcard-based language tutor in the style of Quizlet, built as a single deployable monolith.
Use Clean Architecture boundaries inside the monolith rather than splitting into separate services.
Keep dependencies flowing inward only: Web -> Application -> Domain, with Infrastructure depending on Application and Domain to provide implementations.
When adding projects, keep the solution file in sync and preserve the folder schema below.

Expected folder schema:

```text
src/
	Tenax.Domain/
	Tenax.Application/
	Tenax.Infrastructure/
	Tenax.Web/
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

The repository currently has the folder schema prepared, but project files and executable build commands still need to be added.
Before implementing features, create the relevant `.csproj` files, choose the target framework, add the projects to `Tenax.slnx`, and establish matching test projects.
When build, run, or test commands become available, update this file so agents can rely on them.

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