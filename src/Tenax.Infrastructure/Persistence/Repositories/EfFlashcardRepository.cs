using Microsoft.EntityFrameworkCore;
using Tenax.Application.Abstractions.Persistence;
using Tenax.Domain.Flashcards;

namespace Tenax.Infrastructure.Persistence.Repositories;

public sealed class EfFlashcardRepository : IFlashcardRepository
{
    private readonly TenaxDbContext _dbContext;

    public EfFlashcardRepository(TenaxDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(Flashcard flashcard, CancellationToken cancellationToken)
    {
        try
        {
            _dbContext.Flashcards.Add(flashcard);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (Exception exception) when (PersistenceExceptionClassifier.IsPersistenceUnavailable(exception))
        {
            throw new PersistenceUnavailableException("Flashcard persistence is unavailable.", exception);
        }
    }

    public async Task<IReadOnlyList<Flashcard>> ListByDeckAsync(
        string deckId,
        int skip,
        int take,
        bool shuffle,
        string? shuffleSeed,
        CancellationToken cancellationToken)
    {
        try
        {
            if (shuffle && shuffleSeed is not null)
            {
                return await _dbContext.Flashcards
                    .FromSqlInterpolated($"""
                        SELECT *
                        FROM flashcards
                        WHERE deck_id = {deckId}
                        ORDER BY hashtext(id::text || {shuffleSeed}), id
                        LIMIT {take}
                        OFFSET {skip}
                        """)
                    .AsNoTracking()
                    .ToArrayAsync(cancellationToken);
            }

            return await _dbContext.Flashcards
                .AsNoTracking()
                .Where(card => card.DeckId == deckId)
                .OrderByDescending(card => card.UpdatedAtUtc)
                .ThenByDescending(card => card.Id)
                .Skip(skip)
                .Take(take)
                .ToArrayAsync(cancellationToken);
        }
        catch (Exception exception) when (PersistenceExceptionClassifier.IsPersistenceUnavailable(exception))
        {
            throw new PersistenceUnavailableException("Flashcard persistence is unavailable.", exception);
        }
    }

    public async Task<int> CountByDeckAsync(string deckId, CancellationToken cancellationToken)
    {
        try
        {
            return await _dbContext.Flashcards
                .AsNoTracking()
                .CountAsync(card => card.DeckId == deckId, cancellationToken);
        }
        catch (Exception exception) when (PersistenceExceptionClassifier.IsPersistenceUnavailable(exception))
        {
            throw new PersistenceUnavailableException("Flashcard persistence is unavailable.", exception);
        }
    }

    public async Task<Flashcard?> GetByIdAsync(string deckId, string flashcardId, CancellationToken cancellationToken)
    {
        try
        {
            return await _dbContext.Flashcards
                .AsNoTracking()
                .SingleOrDefaultAsync(card => card.DeckId == deckId && card.Id == flashcardId, cancellationToken);
        }
        catch (Exception exception) when (PersistenceExceptionClassifier.IsPersistenceUnavailable(exception))
        {
            throw new PersistenceUnavailableException("Flashcard persistence is unavailable.", exception);
        }
    }

    public async Task<bool> UpdateAsync(Flashcard flashcard, DateTimeOffset expectedUpdatedAtUtc, CancellationToken cancellationToken)
    {
        try
        {
            var affectedRows = await _dbContext.Flashcards
                .Where(card => card.DeckId == flashcard.DeckId && card.Id == flashcard.Id && card.UpdatedAtUtc == expectedUpdatedAtUtc)
                .ExecuteUpdateAsync(updates => updates
                    .SetProperty(card => card.Term, flashcard.Term)
                    .SetProperty(card => card.Definition, flashcard.Definition)
                    .SetProperty(card => card.ImageUrl, flashcard.ImageUrl)
                    .SetProperty(card => card.UpdatedAtUtc, flashcard.UpdatedAtUtc)
                    .SetProperty(card => card.UpdatedByUserId, flashcard.UpdatedByUserId), cancellationToken);

            return affectedRows == 1;
        }
        catch (Exception exception) when (PersistenceExceptionClassifier.IsPersistenceUnavailable(exception))
        {
            throw new PersistenceUnavailableException("Flashcard persistence is unavailable.", exception);
        }
    }

    public async Task<bool> DeleteAsync(string deckId, string flashcardId, DateTimeOffset expectedUpdatedAtUtc, CancellationToken cancellationToken)
    {
        try
        {
            var affectedRows = await _dbContext.Flashcards
                .Where(card => card.DeckId == deckId && card.Id == flashcardId && card.UpdatedAtUtc == expectedUpdatedAtUtc)
                .ExecuteDeleteAsync(cancellationToken);

            return affectedRows == 1;
        }
        catch (Exception exception) when (PersistenceExceptionClassifier.IsPersistenceUnavailable(exception))
        {
            throw new PersistenceUnavailableException("Flashcard persistence is unavailable.", exception);
        }
    }
}
