using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
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

    public Task<IReadOnlyList<Flashcard>> ListByDeckAsync(
        string deckId,
        int skip,
        int take,
        bool shuffle,
        string? shuffleSeed,
        CancellationToken cancellationToken)
    {
        if (!_store.TryGetValue(deckId, out var deckCards))
        {
            return Task.FromResult<IReadOnlyList<Flashcard>>(Array.Empty<Flashcard>());
        }

        var cards = (shuffle && !string.IsNullOrWhiteSpace(shuffleSeed)
                ? deckCards.Values
                    .OrderBy(card => ComputeDeterministicShuffleKey(card.Id, shuffleSeed), StringComparer.Ordinal)
                    .ThenBy(card => card.Id, StringComparer.Ordinal)
                : deckCards.Values.OrderByDescending(card => card.UpdatedAtUtc).ThenByDescending(card => card.Id))
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

    public Task<bool> UpdateAsync(Flashcard flashcard, DateTimeOffset expectedUpdatedAtUtc, CancellationToken cancellationToken)
    {
        if (!_store.TryGetValue(flashcard.DeckId, out var deckCards))
        {
            return Task.FromResult(false);
        }

        if (!deckCards.TryGetValue(flashcard.Id, out var current))
        {
            return Task.FromResult(false);
        }

        if (current.UpdatedAtUtc != expectedUpdatedAtUtc)
        {
            return Task.FromResult(false);
        }

        deckCards[flashcard.Id] = flashcard;
        return Task.FromResult(true);
    }

    public Task<bool> DeleteAsync(string deckId, string flashcardId, DateTimeOffset expectedUpdatedAtUtc, CancellationToken cancellationToken)
    {
        if (!_store.TryGetValue(deckId, out var deckCards))
        {
            return Task.FromResult(false);
        }

        if (!deckCards.TryGetValue(flashcardId, out var current))
        {
            return Task.FromResult(false);
        }

        if (current.UpdatedAtUtc != expectedUpdatedAtUtc)
        {
            return Task.FromResult(false);
        }

        return Task.FromResult(deckCards.TryRemove(flashcardId, out _));
    }

    private static string ComputeDeterministicShuffleKey(string flashcardId, string shuffleSeed)
    {
        var bytes = Encoding.UTF8.GetBytes($"{shuffleSeed}:{flashcardId}");
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash);
    }
}
