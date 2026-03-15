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
}
