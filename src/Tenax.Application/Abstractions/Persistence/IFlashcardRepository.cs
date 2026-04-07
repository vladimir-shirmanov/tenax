using Tenax.Domain.Flashcards;

namespace Tenax.Application.Abstractions.Persistence;

public interface IFlashcardRepository
{
    Task AddAsync(Flashcard flashcard, CancellationToken cancellationToken);

    Task<IReadOnlyList<Flashcard>> ListByDeckAsync(
        string deckId,
        int skip,
        int take,
        bool shuffle,
        string? shuffleSeed,
        CancellationToken cancellationToken);

    Task<int> CountByDeckAsync(string deckId, CancellationToken cancellationToken);

    Task<Flashcard?> GetByIdAsync(string deckId, string flashcardId, CancellationToken cancellationToken);

    Task<bool> UpdateAsync(Flashcard flashcard, DateTimeOffset expectedUpdatedAtUtc, CancellationToken cancellationToken);

    Task<bool> DeleteAsync(string deckId, string flashcardId, DateTimeOffset expectedUpdatedAtUtc, CancellationToken cancellationToken);
}

public sealed class PersistenceUnavailableException : Exception
{
    public PersistenceUnavailableException(string message, Exception? innerException = null)
        : base(message, innerException)
    {
    }
}
