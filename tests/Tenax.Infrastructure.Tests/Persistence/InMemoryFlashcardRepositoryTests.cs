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

        var cards = await repository.ListByDeckAsync("deck_owned", 0, 10, CancellationToken.None);

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

        var cards = await repository.ListByDeckAsync("deck_owned", 1, 1, CancellationToken.None);

        Assert.Single(cards);
        Assert.Equal("fc_2", cards[0].Id);
    }

    [Fact]
    public async Task DeleteAsync_ShouldRemoveFlashcard()
    {
        var repository = new InMemoryFlashcardRepository();
        var card = CreateFlashcard("deck_owned", "fc_delete", DateTimeOffset.UtcNow);

        await repository.AddAsync(card, CancellationToken.None);

        var deleted = await repository.DeleteAsync("deck_owned", "fc_delete", CancellationToken.None);
        var missing = await repository.GetByIdAsync("deck_owned", "fc_delete", CancellationToken.None);

        Assert.True(deleted);
        Assert.Null(missing);
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
}
