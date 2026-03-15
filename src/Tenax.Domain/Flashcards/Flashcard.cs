namespace Tenax.Domain.Flashcards;

public sealed class Flashcard
{
    public Flashcard(
        string id,
        string deckId,
        string term,
        string definition,
        string? imageUrl,
        DateTimeOffset createdAtUtc,
        DateTimeOffset updatedAtUtc,
        string? createdByUserId,
        string? updatedByUserId)
    {
        Id = id;
        DeckId = deckId;
        Term = term;
        Definition = definition;
        ImageUrl = imageUrl;
        CreatedAtUtc = createdAtUtc;
        UpdatedAtUtc = updatedAtUtc;
        CreatedByUserId = createdByUserId;
        UpdatedByUserId = updatedByUserId;
    }

    public string Id { get; }

    public string DeckId { get; }

    public string Term { get; private set; }

    public string Definition { get; private set; }

    public string? ImageUrl { get; private set; }

    public DateTimeOffset CreatedAtUtc { get; }

    public DateTimeOffset UpdatedAtUtc { get; private set; }

    public string? CreatedByUserId { get; }

    public string? UpdatedByUserId { get; private set; }

    public void Update(string term, string definition, string? imageUrl, DateTimeOffset updatedAtUtc, string? updatedByUserId)
    {
        Term = term;
        Definition = definition;
        ImageUrl = imageUrl;
        UpdatedAtUtc = updatedAtUtc;
        UpdatedByUserId = updatedByUserId;
    }
}
