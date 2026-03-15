using System.Collections.Concurrent;
using Tenax.Application.Abstractions.Persistence;
using Tenax.Domain.Decks;

namespace Tenax.Infrastructure.Persistence;

public sealed class InMemoryDeckRepository : IDeckRepository
{
    private readonly ConcurrentDictionary<string, Deck> _decks = new(StringComparer.Ordinal)
    {
        ["deck_owned"] = new Deck("deck_owned", "usr_42"),
        ["deck_forbidden"] = new Deck("deck_forbidden", "usr_other")
    };

    public Task<Deck?> GetByIdAsync(string deckId, CancellationToken cancellationToken)
    {
        _decks.TryGetValue(deckId, out var deck);
        return Task.FromResult(deck);
    }
}
