---
name: aspnet-minimal-api-openapi
description: 'Create ASP.NET Minimal API endpoints with proper OpenAPI documentation. Use when adding route groups, typed request/response contracts, endpoint filters, and OpenAPI metadata for .NET web features.'
argument-hint: 'Describe the feature, endpoint paths, request/response models, and auth requirements.'
---

# ASP.NET Minimal API with OpenAPI

Your goal is to help create well-structured ASP.NET Minimal API endpoints with correct types and comprehensive OpenAPI/Swagger documentation.

## When to Use

- Adding new HTTP endpoints in `Tenax.Web`
- Refactoring controller-style endpoints to Minimal API route groups
- Defining explicit request and response DTOs for API contracts
- Improving OpenAPI docs quality (summary, description, operation IDs, schemas, security)

## Procedure

1. Confirm feature boundaries and endpoint surface.
2. Create or update a route group with `MapGroup()` and map feature endpoints.
3. Define explicit request/response DTOs (prefer records for immutable payloads).
4. Implement handlers using strongly typed bindings and `TypedResults`.
5. Use `Results<T1, T2, ...>` for multiple response shapes.
6. Apply endpoint filters for cross-cutting concerns.
7. Add OpenAPI metadata (`WithName`, summaries, descriptions, tags, status codes, content types).
8. Add schema/document transformers when shared OpenAPI customization is needed.
9. Ensure standard error responses are configured with ProblemDetails + status code pages.
10. Validate generated OpenAPI output and endpoint behavior.

## API Organization

- Group related endpoints using `MapGroup()` extension.
- Use endpoint filters for cross-cutting concerns.
- Structure larger APIs with separate endpoint classes.
- Use feature-based folders for complex APIs.

## Request and Response Types

- Define explicit request and response DTOs/models.
- Create clear model classes with proper validation attributes.
- Use record types for immutable request/response objects.
- Use meaningful property names aligned with API design standards.
- Apply `[Required]` and other validation attributes to enforce constraints.
- Use ProblemDetails service and status code pages for standard error responses.

## Type Handling

- Use strongly typed route parameters with explicit type binding.
- Use `Results<T1, T2>` to represent multiple response types.
- Return `TypedResults` instead of `Results` for strongly typed responses.
- Leverage modern C# features like nullable annotations and init-only properties.

## OpenAPI Documentation

- Use built-in OpenAPI document support added in .NET 9+.
- Define operation summary and description.
- Add operation IDs using the `WithName` extension method.
- Add descriptions to properties and parameters with `[Description()]`.
- Set proper content types for requests and responses.
- Use document transformers to add servers, tags, and security schemes.
- Use schema transformers to apply customizations to OpenAPI schemas.

## Quality Checks

- Endpoints are grouped by feature with clear route prefixes.
- Contracts are explicit and version-tolerant.
- Response types are strongly typed and exhaustive.
- OpenAPI shows meaningful operation names, descriptions, and schema details.
- Error responses are consistent and standardized.
