using Tenax.Domain.Decks;

namespace Tenax.Application.Abstractions.Persistence;

public sealed record DeckListItemReadModel(Deck Deck, int FlashcardCount);

public interface IDeckRepository
{
    Task<Deck?> GetByIdAsync(string deckId, CancellationToken cancellationToken);

    Task AddAsync(Deck deck, CancellationToken cancellationToken);

    Task<IReadOnlyList<DeckListItemReadModel>> ListByOwnerAsync(string ownerUserId, int skip, int take, CancellationToken cancellationToken);

    Task<int> CountByOwnerAsync(string ownerUserId, CancellationToken cancellationToken);

    Task<bool> UpdateAsync(Deck deck, DateTimeOffset expectedUpdatedAtUtc, CancellationToken cancellationToken);

    Task<bool> DeleteAsync(string deckId, DateTimeOffset expectedUpdatedAtUtc, CancellationToken cancellationToken);
}
