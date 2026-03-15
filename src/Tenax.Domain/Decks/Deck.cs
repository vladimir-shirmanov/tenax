namespace Tenax.Domain.Decks;

public sealed class Deck
{
    public Deck(string id, string ownerUserId)
    {
        Id = id;
        OwnerUserId = ownerUserId;
    }

    public string Id { get; }

    public string OwnerUserId { get; }
}
