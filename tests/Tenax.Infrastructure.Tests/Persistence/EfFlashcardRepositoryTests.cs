using Microsoft.EntityFrameworkCore;
using Tenax.Domain.Flashcards;
using Tenax.Infrastructure.Persistence;
using Tenax.Infrastructure.Persistence.Repositories;
using Testcontainers.PostgreSql;

namespace Tenax.Infrastructure.Tests.Persistence;

public sealed class EfFlashcardRepositoryTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgresContainer = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .WithDatabase("tenax_infra_tests")
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
    public async Task ListByDeckAsync_ShouldReturnDeterministicOrdering()
    {
        await using var dbContext = CreateDbContext();
        var repository = new EfFlashcardRepository(dbContext);

        var older = CreateFlashcard("fc_older", DateTimeOffset.UtcNow.AddMinutes(-5));
        var newer = CreateFlashcard("fc_newer", DateTimeOffset.UtcNow);

        await repository.AddAsync(older, CancellationToken.None);
        await repository.AddAsync(newer, CancellationToken.None);

        var cards = await repository.ListByDeckAsync(
            deckId: "deck_owned",
            skip: 0,
            take: 10,
            shuffle: false,
            shuffleSeed: null,
            cancellationToken: CancellationToken.None);

        Assert.Equal(2, cards.Count);
        Assert.Equal("fc_newer", cards[0].Id);
        Assert.Equal("fc_older", cards[1].Id);
    }

    [Fact]
    public async Task ListByDeckAsync_WithShuffleAndSeed_ShouldReturnDeterministicSeededOrdering()
    {
        await using var dbContext = CreateDbContext();
        var repository = new EfFlashcardRepository(dbContext);

        var card1 = CreateFlashcard("fc_seed_1", DateTimeOffset.UtcNow.AddMinutes(-5));
        var card2 = CreateFlashcard("fc_seed_2", DateTimeOffset.UtcNow.AddMinutes(-4));
        var card3 = CreateFlashcard("fc_seed_3", DateTimeOffset.UtcNow.AddMinutes(-3));

        await repository.AddAsync(card1, CancellationToken.None);
        await repository.AddAsync(card2, CancellationToken.None);
        await repository.AddAsync(card3, CancellationToken.None);

        var first = await repository.ListByDeckAsync("deck_owned", 0, 10, true, "seed-123", CancellationToken.None);
        var second = await repository.ListByDeckAsync("deck_owned", 0, 10, true, "seed-123", CancellationToken.None);

        Assert.Equal(first.Select(card => card.Id), second.Select(card => card.Id));
    }

    [Fact]
    public async Task UpdateAsync_ShouldReturnFalse_WhenExpectedTimestampIsStale()
    {
        await using var dbContext = CreateDbContext();
        var repository = new EfFlashcardRepository(dbContext);

        var card = CreateFlashcard("fc_update", DateTimeOffset.UtcNow.AddMinutes(-1));
        await repository.AddAsync(card, CancellationToken.None);

        var created = await repository.GetByIdAsync("deck_owned", "fc_update", CancellationToken.None);
        Assert.NotNull(created);

        var staleTimestamp = created!.UpdatedAtUtc;

        card.Update("term-1", "definition-1", null, DateTimeOffset.UtcNow, "usr_42");
        var firstUpdate = await repository.UpdateAsync(card, staleTimestamp, CancellationToken.None);
        Assert.True(firstUpdate);

        card.Update("term-2", "definition-2", null, DateTimeOffset.UtcNow.AddMinutes(1), "usr_42");
        var secondUpdate = await repository.UpdateAsync(card, staleTimestamp, CancellationToken.None);

        Assert.False(secondUpdate);
    }

    [Fact]
    public async Task ListByDeckAsync_WhenShuffleEnabled_ShouldBeDeterministicForSameSeed()
    {
        await using var dbContext = CreateDbContext();
        var repository = new EfFlashcardRepository(dbContext);
        await SeedDeckAsync(repository, "deck_owned");

        var first = await repository.ListByDeckAsync("deck_owned", 0, 10, true, "seed-a", CancellationToken.None);
        var second = await repository.ListByDeckAsync("deck_owned", 0, 10, true, "seed-a", CancellationToken.None);

        Assert.Equal(first.Select(card => card.Id), second.Select(card => card.Id));
    }

    [Fact]
    public async Task ListByDeckAsync_WhenShuffleEnabled_ShouldProduceDifferentOrderForDifferentSeeds()
    {
        await using var dbContext = CreateDbContext();
        var repository = new EfFlashcardRepository(dbContext);
        await SeedDeckAsync(repository, "deck_owned");

        var first = await repository.ListByDeckAsync("deck_owned", 0, 10, true, "seed-a", CancellationToken.None);
        var second = await repository.ListByDeckAsync("deck_owned", 0, 10, true, "seed-b", CancellationToken.None);

        Assert.NotEqual(first.Select(card => card.Id), second.Select(card => card.Id));
    }

    [Fact]
    public async Task DeleteAsync_ShouldReturnFalse_WhenExpectedTimestampIsStale()
    {
        await using var dbContext = CreateDbContext();
        var repository = new EfFlashcardRepository(dbContext);

        var card = CreateFlashcard("fc_delete", DateTimeOffset.UtcNow.AddMinutes(-1));
        await repository.AddAsync(card, CancellationToken.None);

        var created = await repository.GetByIdAsync("deck_owned", "fc_delete", CancellationToken.None);
        Assert.NotNull(created);

        var staleTimestamp = created!.UpdatedAtUtc;

        card.Update("term-1", "definition-1", null, DateTimeOffset.UtcNow, "usr_42");
        var updated = await repository.UpdateAsync(card, staleTimestamp, CancellationToken.None);
        Assert.True(updated);

        var deleted = await repository.DeleteAsync("deck_owned", "fc_delete", staleTimestamp, CancellationToken.None);
        Assert.False(deleted);
    }

    private TenaxDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<TenaxDbContext>()
            .UseNpgsql(_postgresContainer.GetConnectionString())
            .Options;

        return new TenaxDbContext(options);
    }

    private static Flashcard CreateFlashcard(string id, DateTimeOffset updatedAtUtc)
    {
        return new Flashcard(
            id,
            "deck_owned",
            "term",
            "definition",
            null,
            updatedAtUtc.AddMinutes(-1),
            updatedAtUtc,
            "usr_42",
            "usr_42");
    }

    private static async Task SeedDeckAsync(EfFlashcardRepository repository, string deckId)
    {
        var now = DateTimeOffset.UtcNow;
        for (var i = 0; i < 6; i++)
        {
            await repository.AddAsync(
                new Flashcard(
                    $"fc_{i}",
                    deckId,
                    "term",
                    "definition",
                    null,
                    now.AddMinutes(-10).AddSeconds(i),
                    now.AddSeconds(i),
                    "usr_42",
                    "usr_42"),
                CancellationToken.None);
        }
    }
}
