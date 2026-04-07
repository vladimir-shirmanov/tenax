using Tenax.Domain.Flashcards;
using Tenax.Infrastructure.Persistence;

namespace Tenax.Infrastructure.Tests.Persistence;

public sealed class InMemoryFlashcardRepositoryTests
{
    [Fact]
    public async Task ListByDeckAsync_ShouldReturnCardsOrderedByUpdatedAtDesc()
    {
        var repository = new InMemoryFlashcardRepository();

        var older = CreateFlashcard("deck_owned", "fc_older", DateTimeOffset.UtcNow.AddMinutes(-5));
        var newer = CreateFlashcard("deck_owned", "fc_newer", DateTimeOffset.UtcNow);

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
    public async Task ListByDeckAsync_ShouldApplySkipAndTake()
    {
        var repository = new InMemoryFlashcardRepository();

        await repository.AddAsync(CreateFlashcard("deck_owned", "fc_1", DateTimeOffset.UtcNow.AddMinutes(-3)), CancellationToken.None);
        await repository.AddAsync(CreateFlashcard("deck_owned", "fc_2", DateTimeOffset.UtcNow.AddMinutes(-2)), CancellationToken.None);
        await repository.AddAsync(CreateFlashcard("deck_owned", "fc_3", DateTimeOffset.UtcNow.AddMinutes(-1)), CancellationToken.None);

        var cards = await repository.ListByDeckAsync(
            deckId: "deck_owned",
            skip: 1,
            take: 1,
            shuffle: false,
            shuffleSeed: null,
            cancellationToken: CancellationToken.None);

        Assert.Single(cards);
        Assert.Equal("fc_2", cards[0].Id);
    }

    [Fact]
    public async Task DeleteAsync_ShouldRemoveFlashcard()
    {
        var repository = new InMemoryFlashcardRepository();
        var card = CreateFlashcard("deck_owned", "fc_delete", DateTimeOffset.UtcNow);

        await repository.AddAsync(card, CancellationToken.None);

        var deleted = await repository.DeleteAsync("deck_owned", "fc_delete", card.UpdatedAtUtc, CancellationToken.None);
        var missing = await repository.GetByIdAsync("deck_owned", "fc_delete", CancellationToken.None);

        Assert.True(deleted);
        Assert.Null(missing);
    }

    [Fact]
    public async Task ListByDeckAsync_WhenShuffleEnabled_ShouldBeDeterministicForSameSeed()
    {
        var repository = new InMemoryFlashcardRepository();
        await SeedDeckAsync(repository, "deck_owned");

        var first = await repository.ListByDeckAsync("deck_owned", 0, 10, true, "seed-a", CancellationToken.None);
        var second = await repository.ListByDeckAsync("deck_owned", 0, 10, true, "seed-a", CancellationToken.None);

        Assert.Equal(first.Select(card => card.Id), second.Select(card => card.Id));
    }

    [Fact]
    public async Task ListByDeckAsync_WhenShuffleEnabled_ShouldProduceDifferentOrderForDifferentSeeds()
    {
        var repository = new InMemoryFlashcardRepository();
        await SeedDeckAsync(repository, "deck_owned");

        var first = await repository.ListByDeckAsync("deck_owned", 0, 10, true, "seed-a", CancellationToken.None);
        var second = await repository.ListByDeckAsync("deck_owned", 0, 10, true, "seed-b", CancellationToken.None);

        Assert.NotEqual(first.Select(card => card.Id), second.Select(card => card.Id));
    }

    private static Flashcard CreateFlashcard(string deckId, string id, DateTimeOffset updatedAtUtc)
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

    private static async Task SeedDeckAsync(InMemoryFlashcardRepository repository, string deckId)
    {
        var now = DateTimeOffset.UtcNow;
        for (var i = 0; i < 6; i++)
        {
            await repository.AddAsync(
                CreateFlashcard(deckId, $"fc_{i}", now.AddSeconds(i)),
                CancellationToken.None);
        }
    }
}
