using System.Security.Claims;
using Tenax.Application.Flashcards;
using Tenax.Web.Errors;

namespace Tenax.Web.Features.Flashcards;

public static class FlashcardsEndpoints
{
    public static RouteGroupBuilder MapFlashcardsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/decks/{deckId}/flashcards")
            .RequireAuthorization()
            .WithTags("Flashcards");

        group.MapPost("/", CreateAsync)
            .WithName("Flashcards_Create")
            .WithSummary("Create a flashcard in a deck")
            .Produces<FlashcardDto>(StatusCodes.Status201Created)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status400BadRequest)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status401Unauthorized)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status403Forbidden)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status404NotFound)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status503ServiceUnavailable);

        group.MapGet("/", ListAsync)
            .WithName("Flashcards_List")
            .WithSummary("List flashcards in a deck")
            .Produces<FlashcardListDto>(StatusCodes.Status200OK)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status400BadRequest)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status401Unauthorized)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status403Forbidden)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status404NotFound)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status503ServiceUnavailable);

        group.MapGet("/{flashcardId}", GetDetailAsync)
            .WithName("Flashcards_GetDetail")
            .WithSummary("Get flashcard detail")
            .Produces<FlashcardDto>(StatusCodes.Status200OK)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status401Unauthorized)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status403Forbidden)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status404NotFound)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status503ServiceUnavailable);

        group.MapPut("/{flashcardId}", UpdateAsync)
            .WithName("Flashcards_Update")
            .WithSummary("Update a flashcard")
            .Produces<FlashcardDto>(StatusCodes.Status200OK)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status400BadRequest)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status401Unauthorized)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status403Forbidden)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status404NotFound)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status409Conflict)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status503ServiceUnavailable);

        group.MapDelete("/{flashcardId}", DeleteAsync)
            .WithName("Flashcards_Delete")
            .WithSummary("Delete a flashcard")
            .Produces<DeleteFlashcardDto>(StatusCodes.Status200OK)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status401Unauthorized)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status403Forbidden)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status404NotFound)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status409Conflict)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status503ServiceUnavailable);

        return group;
    }

    private static async Task<IResult> CreateAsync(
        string deckId,
        CreateFlashcardRequest request,
        IFlashcardService service,
        HttpContext context,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId(context.User);
        var result = await service.CreateAsync(new CreateFlashcardInput(deckId, request.Term, request.Definition, request.ImageUrl, userId), cancellationToken);

        return result.IsSuccess
            ? TypedResults.Created($"/api/decks/{deckId}/flashcards/{result.Value!.Id}", result.Value)
            : ToErrorResult(result.Failure!, context);
    }

    private static async Task<IResult> ListAsync(
        string deckId,
        int? page,
        int? pageSize,
        bool? shuffle,
        string? shuffleSeed,
        IFlashcardService service,
        HttpContext context,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId(context.User);
        var result = await service.ListAsync(new ListFlashcardsInput(deckId, page ?? 1, pageSize ?? 50, userId, shuffle ?? false, shuffleSeed), cancellationToken);

        return result.IsSuccess
            ? TypedResults.Ok(result.Value)
            : ToErrorResult(result.Failure!, context);
    }

    private static async Task<IResult> GetDetailAsync(
        string deckId,
        string flashcardId,
        IFlashcardService service,
        HttpContext context,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId(context.User);
        var result = await service.GetDetailAsync(new GetFlashcardDetailInput(deckId, flashcardId, userId), cancellationToken);

        return result.IsSuccess
            ? TypedResults.Ok(result.Value)
            : ToErrorResult(result.Failure!, context);
    }

    private static async Task<IResult> UpdateAsync(
        string deckId,
        string flashcardId,
        UpdateFlashcardRequest request,
        IFlashcardService service,
        HttpContext context,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId(context.User);
        var result = await service.UpdateAsync(new UpdateFlashcardInput(deckId, flashcardId, request.Term, request.Definition, request.ImageUrl, userId), cancellationToken);

        return result.IsSuccess
            ? TypedResults.Ok(result.Value)
            : ToErrorResult(result.Failure!, context);
    }

    private static async Task<IResult> DeleteAsync(
        string deckId,
        string flashcardId,
        IFlashcardService service,
        HttpContext context,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId(context.User);
        var result = await service.DeleteAsync(new DeleteFlashcardInput(deckId, flashcardId, userId), cancellationToken);

        return result.IsSuccess
            ? TypedResults.Ok(result.Value)
            : ToErrorResult(result.Failure!, context);
    }

    private static IResult ToErrorResult(FlashcardFailure failure, HttpContext context)
    {
        var envelope = new ApiErrorEnvelope(failure.Code, failure.Message, context.TraceIdentifier, failure.Errors);

        return failure.Code switch
        {
            FlashcardErrorCodes.ValidationError => TypedResults.BadRequest(envelope),
            FlashcardErrorCodes.Forbidden => TypedResults.Json(envelope, statusCode: StatusCodes.Status403Forbidden),
            FlashcardErrorCodes.DeckNotFound => TypedResults.NotFound(envelope),
            FlashcardErrorCodes.NotFound => TypedResults.NotFound(envelope),
            FlashcardErrorCodes.ConcurrencyConflict => TypedResults.Conflict(envelope),
            FlashcardErrorCodes.PersistenceUnavailable => TypedResults.Json(envelope, statusCode: StatusCodes.Status503ServiceUnavailable),
            _ => TypedResults.BadRequest(envelope)
        };
    }

    private static string GetUserId(ClaimsPrincipal user)
    {
        return user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user.FindFirstValue("sub")
            ?? string.Empty;
    }

    private sealed record CreateFlashcardRequest(string Term, string Definition, string? ImageUrl);

    private sealed record UpdateFlashcardRequest(string Term, string Definition, string? ImageUrl);
}
