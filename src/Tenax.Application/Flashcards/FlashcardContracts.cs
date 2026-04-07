namespace Tenax.Application.Flashcards;

public sealed record CreateFlashcardInput(string DeckId, string Term, string Definition, string? ImageUrl, string UserId);

public sealed record UpdateFlashcardInput(string DeckId, string FlashcardId, string Term, string Definition, string? ImageUrl, string UserId);

public sealed record ListFlashcardsInput(string DeckId, int Page, int PageSize, string UserId, bool Shuffle = false, string? ShuffleSeed = null);

public sealed record GetFlashcardDetailInput(string DeckId, string FlashcardId, string UserId);

public sealed record DeleteFlashcardInput(string DeckId, string FlashcardId, string UserId);

public sealed record FlashcardDto(
    string Id,
    string DeckId,
    string Term,
    string Definition,
    string? ImageUrl,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc,
    string? CreatedByUserId,
    string? UpdatedByUserId);

public sealed record FlashcardListItemDto(
    string Id,
    string DeckId,
    string Term,
    string DefinitionPreview,
    bool HasImage,
    DateTimeOffset UpdatedAtUtc,
    string? UpdatedByUserId);

public sealed record FlashcardListDto(IReadOnlyList<FlashcardListItemDto> Items, int Page, int PageSize, int TotalCount);

public sealed record DeleteFlashcardDto(bool Deleted, string Id, string DeckId, DateTimeOffset DeletedAtUtc);
