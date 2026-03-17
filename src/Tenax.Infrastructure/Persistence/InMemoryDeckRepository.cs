using System.Collections.Concurrent;
using Tenax.Application.Abstractions.Persistence;
using Tenax.Domain.Decks;

namespace Tenax.Infrastructure.Persistence;

public sealed class InMemoryDeckRepository : IDeckRepository
{
    private static readonly DateTimeOffset SeedTimestamp = new(2026, 3, 17, 9, 0, 0, TimeSpan.Zero);

    private readonly ConcurrentDictionary<string, Deck> _decks = new(StringComparer.Ordinal)
    {
        ["deck_owned"] = new Deck("deck_owned", "Spanish Basics", "Everyday greetings", SeedTimestamp, SeedTimestamp, "usr_42", "usr_42", "usr_42"),
        ["deck_forbidden"] = new Deck("deck_forbidden", "French Basics", "Starter phrases", SeedTimestamp, SeedTimestamp, "usr_other", "usr_other", "usr_other")
    };

    public Task<Deck?> GetByIdAsync(string deckId, CancellationToken cancellationToken)
    {
        _decks.TryGetValue(deckId, out var deck);
        return Task.FromResult(deck);
    }

    public Task AddAsync(Deck deck, CancellationToken cancellationToken)
    {
        _decks[deck.Id] = deck;
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<DeckListItemReadModel>> ListByOwnerAsync(string ownerUserId, int skip, int take, CancellationToken cancellationToken)
    {
        var items = _decks.Values
            .Where(deck => string.Equals(deck.OwnerUserId, ownerUserId, StringComparison.Ordinal))
            .OrderByDescending(deck => deck.UpdatedAtUtc)
            .ThenByDescending(deck => deck.Id)
            .Skip(skip)
            .Take(take)
            .Select(deck => new DeckListItemReadModel(deck, 0))
            .ToArray();

        return Task.FromResult<IReadOnlyList<DeckListItemReadModel>>(items);
    }

    public Task<int> CountByOwnerAsync(string ownerUserId, CancellationToken cancellationToken)
    {
        var count = _decks.Values.Count(deck => string.Equals(deck.OwnerUserId, ownerUserId, StringComparison.Ordinal));
        return Task.FromResult(count);
    }

    public Task<bool> UpdateAsync(Deck deck, DateTimeOffset expectedUpdatedAtUtc, CancellationToken cancellationToken)
    {
        if (!_decks.TryGetValue(deck.Id, out var existing) || existing.UpdatedAtUtc != expectedUpdatedAtUtc)
        {
            return Task.FromResult(false);
        }

        _decks[deck.Id] = deck;
        return Task.FromResult(true);
    }

    public Task<bool> DeleteAsync(string deckId, DateTimeOffset expectedUpdatedAtUtc, CancellationToken cancellationToken)
    {
        if (!_decks.TryGetValue(deckId, out var existing) || existing.UpdatedAtUtc != expectedUpdatedAtUtc)
        {
            return Task.FromResult(false);
        }

        return Task.FromResult(_decks.TryRemove(deckId, out _));
    }
}
