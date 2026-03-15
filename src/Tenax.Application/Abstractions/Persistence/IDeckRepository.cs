using Tenax.Domain.Decks;

namespace Tenax.Application.Abstractions.Persistence;

public interface IDeckRepository
{
    Task<Deck?>GetByIdAsync(string deckId, CancellationToken cancellationToken);
}
