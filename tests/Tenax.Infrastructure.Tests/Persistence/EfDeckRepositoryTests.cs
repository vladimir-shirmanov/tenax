using Microsoft.EntityFrameworkCore;
using Tenax.Domain.Decks;
using Tenax.Domain.Flashcards;
using Tenax.Infrastructure.Persistence;
using Tenax.Infrastructure.Persistence.Repositories;
using Testcontainers.PostgreSql;

namespace Tenax.Infrastructure.Tests.Persistence;

public sealed class EfDeckRepositoryTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgresContainer = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .WithDatabase("tenax_infra_deck_tests")
        .WithUsername("postgres")
        .WithPassword("postgres")
        .Build();

    public async Task InitializeAsync()
    {
        await _postgresContainer.StartAsync();

        await using var dbContext = CreateDbContext();
        await dbContext.Database.MigrateAsync();
    }

    public async Task DisposeAsync()
    {
        await _postgresContainer.DisposeAsync();
    }

    [Fact]
    public async Task ListByOwnerAsync_ShouldReturnDeterministicOrdering()
    {
        await using var dbContext = CreateDbContext();
        var repository = new EfDeckRepository(dbContext);

        var older = CreateDeck("deck_older", "usr_42", DateTimeOffset.UtcNow.AddMinutes(-5));
        var newer = CreateDeck("deck_newer", "usr_42", DateTimeOffset.UtcNow);

        await repository.AddAsync(older, CancellationToken.None);
        await repository.AddAsync(newer, CancellationToken.None);

        var decks = await repository.ListByOwnerAsync("usr_42", 0, 10, CancellationToken.None);

        Assert.True(decks.Count >= 2);
        Assert.Equal("deck_newer", decks[0].Deck.Id);
        Assert.Equal("deck_older", decks[1].Deck.Id);
    }

    [Fact]
    public async Task UpdateAsync_ShouldReturnFalse_WhenExpectedTimestampIsStale()
    {
        await using var dbContext = CreateDbContext();
        var repository = new EfDeckRepository(dbContext);

        var deck = CreateDeck("deck_update", "usr_42", DateTimeOffset.UtcNow.AddMinutes(-1));
        await repository.AddAsync(deck, CancellationToken.None);

        var created = await repository.GetByIdAsync("deck_update", CancellationToken.None);
        Assert.NotNull(created);

        var staleTimestamp = created!.UpdatedAtUtc;

        deck.UpdateMetadata("Spanish A1", "desc", DateTimeOffset.UtcNow, "usr_42");
        var firstUpdate = await repository.UpdateAsync(deck, staleTimestamp, CancellationToken.None);
        Assert.True(firstUpdate);

        deck.UpdateMetadata("Spanish A2", "desc", DateTimeOffset.UtcNow.AddMinutes(1), "usr_42");
        var secondUpdate = await repository.UpdateAsync(deck, staleTimestamp, CancellationToken.None);

        Assert.False(secondUpdate);
    }

    [Fact]
    public async Task DeleteAsync_ShouldReturnFalse_WhenExpectedTimestampIsStale()
    {
        await using var dbContext = CreateDbContext();
        var repository = new EfDeckRepository(dbContext);

        var deck = CreateDeck("deck_delete", "usr_42", DateTimeOffset.UtcNow.AddMinutes(-1));
        await repository.AddAsync(deck, CancellationToken.None);

        var created = await repository.GetByIdAsync("deck_delete", CancellationToken.None);
        Assert.NotNull(created);

        var staleTimestamp = created!.UpdatedAtUtc;

        deck.UpdateMetadata("Spanish A1", "desc", DateTimeOffset.UtcNow, "usr_42");
        var updated = await repository.UpdateAsync(deck, staleTimestamp, CancellationToken.None);
        Assert.True(updated);

        var deleted = await repository.DeleteAsync("deck_delete", staleTimestamp, CancellationToken.None);
        Assert.False(deleted);
    }

    [Fact]
    public async Task DeckAndFlashcardNavigations_ShouldMaterializeAsOneToManyRelationship()
    {
        await using var dbContext = CreateDbContext();

        var deck = CreateDeck("deck_with_cards", "usr_42", DateTimeOffset.UtcNow);
        var firstFlashcard = CreateFlashcard("fc_nav_1", deck.Id, DateTimeOffset.UtcNow.AddMinutes(-1));
        var secondFlashcard = CreateFlashcard("fc_nav_2", deck.Id, DateTimeOffset.UtcNow);

        dbContext.Decks.Add(deck);
        dbContext.Flashcards.AddRange(firstFlashcard, secondFlashcard);
        await dbContext.SaveChangesAsync(CancellationToken.None);

        var persistedDeck = await dbContext.Decks
            .AsNoTracking()
            .Include(entity => entity.Flashcards)
            .SingleAsync(entity => entity.Id == deck.Id, CancellationToken.None);

        var persistedFlashcard = await dbContext.Flashcards
            .AsNoTracking()
            .Include(entity => entity.Deck)
            .SingleAsync(entity => entity.Id == firstFlashcard.Id, CancellationToken.None);

        Assert.Equal(2, persistedDeck.Flashcards.Count);
        Assert.All(persistedDeck.Flashcards, flashcard => Assert.Equal(deck.Id, flashcard.DeckId));
        Assert.Equal(deck.Id, persistedFlashcard.Deck.Id);
        Assert.Equal(deck.Name, persistedFlashcard.Deck.Name);
    }

    private TenaxDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<TenaxDbContext>()
            .UseNpgsql(_postgresContainer.GetConnectionString())
            .Options;

        return new TenaxDbContext(options);
    }

    private static Deck CreateDeck(string id, string ownerUserId, DateTimeOffset updatedAtUtc)
    {
        return new Deck(
            id,
            "Spanish Basics",
            "desc",
            updatedAtUtc.AddMinutes(-1),
            updatedAtUtc,
            ownerUserId,
            ownerUserId,
            ownerUserId);
    }

    private static Flashcard CreateFlashcard(string id, string deckId, DateTimeOffset updatedAtUtc)
    {
        return new Flashcard(
            id,
            deckId,
            "term",
            "definition",
            null,
            updatedAtUtc.AddMinutes(-1),
            updatedAtUtc,
            "usr_42",
            "usr_42");
    }
}
