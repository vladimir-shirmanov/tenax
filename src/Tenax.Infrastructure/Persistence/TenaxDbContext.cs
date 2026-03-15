using Microsoft.EntityFrameworkCore;
using Tenax.Domain.Decks;
using Tenax.Domain.Flashcards;
using Tenax.Infrastructure.Persistence.Configurations;

namespace Tenax.Infrastructure.Persistence;

public sealed class TenaxDbContext : DbContext
{
    public TenaxDbContext(DbContextOptions<TenaxDbContext> options)
        : base(options)
    {
    }

    public DbSet<Deck> Decks => Set<Deck>();

    public DbSet<Flashcard> Flashcards => Set<Flashcard>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new DeckConfiguration());
        modelBuilder.ApplyConfiguration(new FlashcardConfiguration());

        base.OnModelCreating(modelBuilder);
    }
}
