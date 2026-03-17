using System.Security.Claims;
using Tenax.Application.Decks;
using Tenax.Web.Errors;

namespace Tenax.Web.Features.Decks;

public static class DecksEndpoints
{
    public static RouteGroupBuilder MapDecksEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/decks")
            .RequireAuthorization()
            .WithTags("Decks");

        group.MapGet("/", ListAsync)
            .WithName("Decks_List")
            .WithSummary("List decks")
            .Produces<DeckListDto>(StatusCodes.Status200OK)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status400BadRequest)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status401Unauthorized)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status503ServiceUnavailable);

        group.MapPost("/", CreateAsync)
            .WithName("Decks_Create")
            .WithSummary("Create a deck")
            .Produces<DeckDto>(StatusCodes.Status201Created)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status400BadRequest)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status401Unauthorized)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status503ServiceUnavailable);

        group.MapGet("/{deckId}", GetDetailAsync)
            .WithName("Decks_GetDetail")
            .WithSummary("Get deck detail")
            .Produces<DeckDto>(StatusCodes.Status200OK)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status401Unauthorized)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status403Forbidden)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status404NotFound)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status503ServiceUnavailable);

        group.MapPut("/{deckId}", UpdateAsync)
            .WithName("Decks_Update")
            .WithSummary("Update a deck")
            .Produces<DeckDto>(StatusCodes.Status200OK)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status400BadRequest)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status401Unauthorized)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status403Forbidden)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status404NotFound)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status409Conflict)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status503ServiceUnavailable);

        group.MapDelete("/{deckId}", DeleteAsync)
            .WithName("Decks_Delete")
            .WithSummary("Delete a deck")
            .Produces<DeleteDeckDto>(StatusCodes.Status200OK)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status401Unauthorized)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status403Forbidden)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status404NotFound)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status409Conflict)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status503ServiceUnavailable);

        return group;
    }

    private static async Task<IResult> CreateAsync(
        CreateDeckRequest request,
        IDeckService service,
        HttpContext context,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId(context.User);
        var result = await service.CreateAsync(new CreateDeckInput(request.Name, request.Description, userId), cancellationToken);

        return result.IsSuccess
            ? TypedResults.Created($"/api/decks/{result.Value!.Id}", result.Value)
            : ToErrorResult(result.Failure!, context);
    }

    private static async Task<IResult> ListAsync(
        int? page,
        int? pageSize,
        IDeckService service,
        HttpContext context,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId(context.User);
        var result = await service.ListAsync(new ListDecksInput(page ?? 1, pageSize ?? 20, userId), cancellationToken);

        return result.IsSuccess
            ? TypedResults.Ok(result.Value)
            : ToErrorResult(result.Failure!, context);
    }

    private static async Task<IResult> GetDetailAsync(
        string deckId,
        IDeckService service,
        HttpContext context,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId(context.User);
        var result = await service.GetDetailAsync(new GetDeckDetailInput(deckId, userId), cancellationToken);

        return result.IsSuccess
            ? TypedResults.Ok(result.Value)
            : ToErrorResult(result.Failure!, context);
    }

    private static async Task<IResult> UpdateAsync(
        string deckId,
        UpdateDeckRequest request,
        IDeckService service,
        HttpContext context,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId(context.User);
        var result = await service.UpdateAsync(new UpdateDeckInput(deckId, request.Name, request.Description, userId), cancellationToken);

        return result.IsSuccess
            ? TypedResults.Ok(result.Value)
            : ToErrorResult(result.Failure!, context);
    }

    private static async Task<IResult> DeleteAsync(
        string deckId,
        IDeckService service,
        HttpContext context,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId(context.User);
        var result = await service.DeleteAsync(new DeleteDeckInput(deckId, userId), cancellationToken);

        return result.IsSuccess
            ? TypedResults.Ok(result.Value)
            : ToErrorResult(result.Failure!, context);
    }

    private static IResult ToErrorResult(DeckFailure failure, HttpContext context)
    {
        var envelope = new ApiErrorEnvelope(failure.Code, failure.Message, context.TraceIdentifier, failure.Errors);

        return failure.Code switch
        {
            DeckErrorCodes.ValidationError => TypedResults.BadRequest(envelope),
            DeckErrorCodes.Forbidden => TypedResults.Json(envelope, statusCode: StatusCodes.Status403Forbidden),
            DeckErrorCodes.DeckNotFound => TypedResults.NotFound(envelope),
            DeckErrorCodes.ConcurrencyConflict => TypedResults.Conflict(envelope),
            DeckErrorCodes.PersistenceUnavailable => TypedResults.Json(envelope, statusCode: StatusCodes.Status503ServiceUnavailable),
            _ => TypedResults.BadRequest(envelope)
        };
    }

    private static string GetUserId(ClaimsPrincipal user)
    {
        return user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user.FindFirstValue("sub")
            ?? string.Empty;
    }

    private sealed record CreateDeckRequest(string Name, string? Description);

    private sealed record UpdateDeckRequest(string Name, string? Description);
}
