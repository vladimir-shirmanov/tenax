using System.Collections.Concurrent;
using Tenax.Application.Abstractions.Persistence;
using Tenax.Domain.Flashcards;

namespace Tenax.Infrastructure.Persistence;

public sealed class InMemoryFlashcardRepository : IFlashcardRepository
{
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<string, Flashcard>> _store = new(StringComparer.Ordinal);

    public Task AddAsync(Flashcard flashcard, CancellationToken cancellationToken)
    {
        var deckCards = _store.GetOrAdd(flashcard.DeckId, _ => new ConcurrentDictionary<string, Flashcard>(StringComparer.Ordinal));
        deckCards[flashcard.Id] = flashcard;

        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<Flashcard>> ListByDeckAsync(string deckId, int skip, int take, CancellationToken cancellationToken)
    {
        if (!_store.TryGetValue(deckId, out var deckCards))
        {
            return Task.FromResult<IReadOnlyList<Flashcard>>(Array.Empty<Flashcard>());
        }

        var cards = deckCards.Values
            .OrderByDescending(card => card.UpdatedAtUtc)
            .ThenBy(card => card.Id)
            .Skip(skip)
            .Take(take)
            .ToArray();

        return Task.FromResult<IReadOnlyList<Flashcard>>(cards);
    }

    public Task<int> CountByDeckAsync(string deckId, CancellationToken cancellationToken)
    {
        if (!_store.TryGetValue(deckId, out var deckCards))
        {
            return Task.FromResult(0);
        }

        return Task.FromResult(deckCards.Count);
    }

    public Task<Flashcard?> GetByIdAsync(string deckId, string flashcardId, CancellationToken cancellationToken)
    {
        if (!_store.TryGetValue(deckId, out var deckCards))
        {
            return Task.FromResult<Flashcard?>(null);
        }

        deckCards.TryGetValue(flashcardId, out var flashcard);
        return Task.FromResult(flashcard);
    }

    public Task<bool> DeleteAsync(string deckId, string flashcardId, CancellationToken cancellationToken)
    {
        if (!_store.TryGetValue(deckId, out var deckCards))
        {
            return Task.FromResult(false);
        }

        return Task.FromResult(deckCards.TryRemove(flashcardId, out _));
    }
}
