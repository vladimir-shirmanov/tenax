namespace Tenax.Application.Decks;

public sealed record CreateDeckInput(string Name, string? Description, string UserId);

public sealed record UpdateDeckInput(string DeckId, string Name, string? Description, string UserId);

public sealed record ListDecksInput(int Page, int PageSize, string UserId);

public sealed record GetDeckDetailInput(string DeckId, string UserId);

public sealed record DeleteDeckInput(string DeckId, string UserId);

public sealed record DeckDto(
    string Id,
    string Name,
    string? Description,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc,
    string? CreatedByUserId,
    string? UpdatedByUserId);

public sealed record DeckListItemDto(
    string Id,
    string Name,
    string? Description,
    int FlashcardCount,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc,
    string? CreatedByUserId,
    string? UpdatedByUserId);

public sealed record DeckListDto(IReadOnlyList<DeckListItemDto> Items, int Page, int PageSize, int TotalCount);

public sealed record DeleteDeckDto(bool Deleted, string Id, DateTimeOffset DeletedAtUtc);
