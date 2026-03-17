using Microsoft.EntityFrameworkCore;
using Tenax.Application.Abstractions.Persistence;
using Tenax.Domain.Decks;

namespace Tenax.Infrastructure.Persistence.Repositories;

public sealed class EfDeckRepository : IDeckRepository
{
    private readonly TenaxDbContext _dbContext;

    public EfDeckRepository(TenaxDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Deck?> GetByIdAsync(string deckId, CancellationToken cancellationToken)
    {
        try
        {
            return await _dbContext.Decks
                .AsNoTracking()
                .SingleOrDefaultAsync(deck => deck.Id == deckId, cancellationToken);
        }
        catch (Exception exception) when (PersistenceExceptionClassifier.IsPersistenceUnavailable(exception))
        {
            throw new PersistenceUnavailableException("Deck persistence is unavailable.", exception);
        }
    }

    public async Task AddAsync(Deck deck, CancellationToken cancellationToken)
    {
        try
        {
            _dbContext.Decks.Add(deck);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (Exception exception) when (PersistenceExceptionClassifier.IsPersistenceUnavailable(exception))
        {
            throw new PersistenceUnavailableException("Deck persistence is unavailable.", exception);
        }
    }

    public async Task<IReadOnlyList<DeckListItemReadModel>> ListByOwnerAsync(string ownerUserId, int skip, int take, CancellationToken cancellationToken)
    {
        try
        {
            var rows = await _dbContext.Decks
                .AsNoTracking()
                .Where(deck => deck.OwnerUserId == ownerUserId)
                .GroupJoin(
                    _dbContext.Flashcards.AsNoTracking(),
                    deck => deck.Id,
                    flashcard => flashcard.DeckId,
                    (deck, flashcards) => new
                    {
                        Deck = deck,
                        FlashcardCount = flashcards.Count()
                    })
                .OrderByDescending(row => row.Deck.UpdatedAtUtc)
                .ThenByDescending(row => row.Deck.Id)
                .Skip(skip)
                .Take(take)
                .ToArrayAsync(cancellationToken);

            return rows
                .Select(row => new DeckListItemReadModel(row.Deck, row.FlashcardCount))
                .ToArray();
        }
        catch (Exception exception) when (PersistenceExceptionClassifier.IsPersistenceUnavailable(exception))
        {
            throw new PersistenceUnavailableException("Deck persistence is unavailable.", exception);
        }
    }

    public async Task<int> CountByOwnerAsync(string ownerUserId, CancellationToken cancellationToken)
    {
        try
        {
            return await _dbContext.Decks
                .AsNoTracking()
                .CountAsync(deck => deck.OwnerUserId == ownerUserId, cancellationToken);
        }
        catch (Exception exception) when (PersistenceExceptionClassifier.IsPersistenceUnavailable(exception))
        {
            throw new PersistenceUnavailableException("Deck persistence is unavailable.", exception);
        }
    }

    public async Task<bool> UpdateAsync(Deck deck, DateTimeOffset expectedUpdatedAtUtc, CancellationToken cancellationToken)
    {
        try
        {
            var affectedRows = await _dbContext.Decks
                .Where(entity => entity.Id == deck.Id && entity.UpdatedAtUtc == expectedUpdatedAtUtc)
                .ExecuteUpdateAsync(updates => updates
                    .SetProperty(entity => entity.Name, deck.Name)
                    .SetProperty(entity => entity.Description, deck.Description)
                    .SetProperty(entity => entity.UpdatedAtUtc, deck.UpdatedAtUtc)
                    .SetProperty(entity => entity.UpdatedByUserId, deck.UpdatedByUserId), cancellationToken);

            return affectedRows == 1;
        }
        catch (Exception exception) when (PersistenceExceptionClassifier.IsPersistenceUnavailable(exception))
        {
            throw new PersistenceUnavailableException("Deck persistence is unavailable.", exception);
        }
    }

    public async Task<bool> DeleteAsync(string deckId, DateTimeOffset expectedUpdatedAtUtc, CancellationToken cancellationToken)
    {
        try
        {
            var affectedRows = await _dbContext.Decks
                .Where(deck => deck.Id == deckId && deck.UpdatedAtUtc == expectedUpdatedAtUtc)
                .ExecuteDeleteAsync(cancellationToken);

            return affectedRows == 1;
        }
        catch (Exception exception) when (PersistenceExceptionClassifier.IsPersistenceUnavailable(exception))
        {
            throw new PersistenceUnavailableException("Deck persistence is unavailable.", exception);
        }
    }
}
