---
description: "Use when creating or modifying test projects or test source files in Tenax. Covers xUnit, NSubstitute, integration testing with WebApplicationFactory, and Postgres container-based test databases."
name: "Tenax Testing Guidelines"
applyTo: "**/*Tests.cs, **/*.Tests.csproj"
---
# Tenax Testing Guidelines

- Always use `xUnit` as the test framework.
- Always use `NSubstitute` for test doubles and mocking.
- Write both unit tests and integration tests for behavior that crosses boundaries.
- Integration tests must use `Microsoft.AspNetCore.Mvc.Testing` and run through a custom `WebApplicationFactory<Program>` implementation.
- Keep integration test wiring explicit and reusable by placing factory and test infrastructure types in dedicated files (for example, `CustomWebApplicationFactory.cs`).
- In integration tests, mock only the authentication handler. Keep application, infrastructure, and persistence behavior real to preserve end-to-end fidelity.
- Always create and populate an integration test database with fake data before running integration assertions.
- Run integration tests directly against a PostgreSQL container, not an in-memory provider.
- For the web host under test, use the Web SDK in the project file: `<Project Sdk="Microsoft.NET.Sdk.Web">`.

Suggested integration test skeleton:

```csharp
public class BasicTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public BasicTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Theory]
    [InlineData("/")]
    [InlineData("/Index")]
    [InlineData("/About")]
    [InlineData("/Privacy")]
    [InlineData("/Contact")]
    public async Task Get_EndpointsReturnSuccessAndCorrectContentType(string url)
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync(url);

        response.EnsureSuccessStatusCode();
        Assert.Equal("text/html; charset=utf-8", response.Content.Headers.ContentType?.ToString());
    }
}
```