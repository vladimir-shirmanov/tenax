---
description: "Use when creating or modifying C# source files, .NET project files, EF Core persistence code, repositories, or tests. Covers target framework, package conventions, repository pattern usage, and LINQ style for this Tenax workspace."
name: "Tenax .NET Guidelines"
applyTo: "**/*.cs, **/*.csproj, **/*.props, **/*.targets"
---
# Tenax .NET Guidelines

- Target `.NET 10` for new projects unless the workspace explicitly establishes a different framework.
- Use the `.NET CLI` (`dotnet`) for workspace interactions, including project creation, solution/project wiring, dependency addition/update/removal, and tooling commands.
- Use `dotnet ef` for EF Core migration creation and database update operations.
- Prefer loosely coupled dependencies with clear abstractions at Domain/Application boundaries.
- Use dependency injection as the default composition mechanism and prefer constructor injection.
- Use static classes or static methods only for extension methods unless there is a strong technical reason.
- Keep dependency registration in dedicated extension files per layer (for example, `DependencyInjection.cs` under Application/Infrastructure/Web as appropriate).
- Keep package versions explicit and consistent across projects.
- For `EF Core`, use the latest stable version compatible with the chosen `.NET 10` target and keep all EF Core packages on the same version.
- Use `FluentValidation` for application-level validation and place validators in the Application layer by feature.
- In `Tenax.Web`, use ASP.NET Core Minimal API style with endpoint mapping and route groups as the default HTTP surface.
- Follow the repository pattern for persistence access. Keep repositories in Infrastructure, expose only the abstractions needed by Application, and do not let Web or Domain depend directly on EF Core types.
- Prefer LINQ extension methods and fluent method syntax over query-expression syntax.
- Mirror production projects with matching test projects under `tests/` and keep test naming aligned with the project under test.
- Prefer feature-oriented folders inside Application, Infrastructure, Web, and tests rather than generic shared buckets.
- Keep business rules in Domain or Application. Keep EF Core mappings, DbContext configuration, and persistence concerns in Infrastructure.

Examples:

```csharp
var dueCards = flashcards
    .Where(card => card.NextReviewAt <= clock.UtcNow)
    .OrderBy(card => card.NextReviewAt)
    .ThenBy(card => card.Id)
    .ToList();
```

```csharp
public interface IDeckRepository
{
    Task<Deck?> GetByIdAsync(DeckId id, CancellationToken cancellationToken);
    Task AddAsync(Deck deck, CancellationToken cancellationToken);
}
```