namespace Tenax.Domain.Decks;

public sealed class Deck
{
    public Deck(
        string id,
        string name,
        string? description,
        DateTimeOffset createdAtUtc,
        DateTimeOffset updatedAtUtc,
        string ownerUserId,
        string? createdByUserId,
        string? updatedByUserId)
    {
        Id = id;
        Name = name;
        Description = description;
        CreatedAtUtc = createdAtUtc;
        UpdatedAtUtc = updatedAtUtc;
        OwnerUserId = ownerUserId;
        CreatedByUserId = createdByUserId;
        UpdatedByUserId = updatedByUserId;
    }

    public string Id { get; }

    public string Name { get; private set; }

    public string? Description { get; private set; }

    public DateTimeOffset CreatedAtUtc { get; }

    public DateTimeOffset UpdatedAtUtc { get; private set; }

    public string OwnerUserId { get; }

    public string? CreatedByUserId { get; }

    public string? UpdatedByUserId { get; private set; }

    public void UpdateMetadata(string name, string? description, DateTimeOffset updatedAtUtc, string? updatedByUserId)
    {
        Name = name;
        Description = description;
        UpdatedAtUtc = updatedAtUtc;
        UpdatedByUserId = updatedByUserId;
    }
}
