using FluentValidation;
using NSubstitute;
using Tenax.Application.Abstractions.Persistence;
using Tenax.Application.Flashcards;
using Tenax.Application.Flashcards.Validation;
using Tenax.Domain.Decks;
using Tenax.Domain.Flashcards;

namespace Tenax.Application.Tests.Flashcards;

public sealed class FlashcardServiceTests
{
    private static readonly DateTimeOffset DeckTimestamp = new(2026, 3, 17, 9, 0, 0, TimeSpan.Zero);

    private readonly IDeckRepository _deckRepository = Substitute.For<IDeckRepository>();
    private readonly IFlashcardRepository _flashcardRepository = Substitute.For<IFlashcardRepository>();
    private readonly IValidator<CreateFlashcardInput> _createValidator = new CreateFlashcardInputValidator();
    private readonly IValidator<UpdateFlashcardInput> _updateValidator = new UpdateFlashcardInputValidator();
    private readonly IValidator<ListFlashcardsInput> _listValidator = new ListFlashcardsInputValidator();

    [Fact]
    public async Task CreateAsync_ShouldReturnDeckNotFound_WhenDeckMissing()
    {
        var service = CreateService();
        _deckRepository.GetByIdAsync("deck_missing", Arg.Any<CancellationToken>()).Returns((Deck?)null);

        var result = await service.CreateAsync(new CreateFlashcardInput("deck_missing", "hola", "hello", null, "usr_42"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(FlashcardErrorCodes.DeckNotFound, result.Failure?.Code);
    }

    [Fact]
    public async Task CreateAsync_ShouldReturnForbidden_WhenUserDoesNotOwnDeck()
    {
        var service = CreateService();
        _deckRepository.GetByIdAsync("deck_owned", Arg.Any<CancellationToken>()).Returns(CreateDeck("deck_owned", "usr_other"));

        var result = await service.CreateAsync(new CreateFlashcardInput("deck_owned", "hola", "hello", null, "usr_42"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(FlashcardErrorCodes.Forbidden, result.Failure?.Code);
    }

    [Fact]
    public async Task CreateAsync_ShouldReturnCreatedFlashcard_WhenRequestValid()
    {
        var service = CreateService();
        _deckRepository.GetByIdAsync("deck_owned", Arg.Any<CancellationToken>()).Returns(CreateDeck("deck_owned", "usr_42"));

        var result = await service.CreateAsync(new CreateFlashcardInput("deck_owned", "hola", "hello", null, "usr_42"), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal("deck_owned", result.Value.DeckId);
        Assert.Equal("usr_42", result.Value.CreatedByUserId);

        await _flashcardRepository.Received(1).AddAsync(Arg.Any<Tenax.Domain.Flashcards.Flashcard>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ListAsync_ShouldReturnValidationError_WhenPageIsInvalid()
    {
        var service = CreateService();

        var result = await service.ListAsync(new ListFlashcardsInput("deck_owned", 0, 50, "usr_42"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(FlashcardErrorCodes.ValidationError, result.Failure?.Code);
        Assert.NotNull(result.Failure?.Errors);
        Assert.True(result.Failure.Errors!.ContainsKey("page"));
    }

    [Fact]
    public async Task ListAsync_ShouldReturnForbidden_WhenUserDoesNotOwnDeck()
    {
        var service = CreateService();
        _deckRepository.GetByIdAsync("deck_forbidden", Arg.Any<CancellationToken>()).Returns(CreateDeck("deck_forbidden", "usr_other"));

        var result = await service.ListAsync(new ListFlashcardsInput("deck_forbidden", 1, 50, "usr_42"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(FlashcardErrorCodes.Forbidden, result.Failure?.Code);
    }

    [Fact]
    public async Task ListAsync_ShouldPassShuffleArguments_ToRepository()
    {
        var service = CreateService();
        _deckRepository.GetByIdAsync("deck_owned", Arg.Any<CancellationToken>()).Returns(CreateDeck("deck_owned", "usr_42"));
        _flashcardRepository.ListByDeckAsync(
                "deck_owned",
                0,
                20,
                true,
                "seed-123",
                Arg.Any<CancellationToken>())
            .Returns(Array.Empty<Flashcard>());
        _flashcardRepository.CountByDeckAsync("deck_owned", Arg.Any<CancellationToken>()).Returns(0);

        var result = await service.ListAsync(new ListFlashcardsInput("deck_owned", 1, 20, "usr_42", true, "seed-123"), CancellationToken.None);

        Assert.True(result.IsSuccess);
        await _flashcardRepository.Received(1).ListByDeckAsync("deck_owned", 0, 20, true, "seed-123", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task GetDetailAsync_ShouldReturnNotFound_WhenFlashcardIsMissing()
    {
        var service = CreateService();
        _flashcardRepository.GetByIdAsync("deck_owned", "fc_missing", Arg.Any<CancellationToken>()).Returns((Flashcard?)null);

        var result = await service.GetDetailAsync(new GetFlashcardDetailInput("deck_owned", "fc_missing", "usr_42"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(FlashcardErrorCodes.NotFound, result.Failure?.Code);
    }

    [Fact]
    public async Task GetDetailAsync_ShouldReturnForbidden_WhenUserDoesNotOwnDeck()
    {
        var service = CreateService();
        var flashcard = CreateFlashcard("deck_owned", "fc_12345678", "hola", "hello");

        _flashcardRepository.GetByIdAsync("deck_owned", "fc_12345678", Arg.Any<CancellationToken>()).Returns(flashcard);
        _deckRepository.GetByIdAsync("deck_owned", Arg.Any<CancellationToken>()).Returns(CreateDeck("deck_owned", "usr_other"));

        var result = await service.GetDetailAsync(new GetFlashcardDetailInput("deck_owned", "fc_12345678", "usr_42"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(FlashcardErrorCodes.Forbidden, result.Failure?.Code);
    }

    [Fact]
    public async Task UpdateAsync_ShouldReturnValidationError_WhenDefinitionMissing()
    {
        var service = CreateService();

        var result = await service.UpdateAsync(new UpdateFlashcardInput("deck_owned", "fc_12345678", "hola", string.Empty, null, "usr_42"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(FlashcardErrorCodes.ValidationError, result.Failure?.Code);
        Assert.NotNull(result.Failure?.Errors);
        Assert.True(result.Failure.Errors!.ContainsKey("definition"));
    }

    [Fact]
    public async Task UpdateAsync_ShouldReturnUpdatedFlashcard_WhenRequestValid()
    {
        var service = CreateService();
        var flashcard = CreateFlashcard("deck_owned", "fc_12345678", "hola", "hello");

        _flashcardRepository.GetByIdAsync("deck_owned", "fc_12345678", Arg.Any<CancellationToken>()).Returns(flashcard);
        _deckRepository.GetByIdAsync("deck_owned", Arg.Any<CancellationToken>()).Returns(CreateDeck("deck_owned", "usr_42"));
        _flashcardRepository
            .UpdateAsync(Arg.Any<Flashcard>(), Arg.Any<DateTimeOffset>(), Arg.Any<CancellationToken>())
            .Returns(true);

        var result = await service.UpdateAsync(new UpdateFlashcardInput("deck_owned", "fc_12345678", "hola", "hello updated", null, "usr_42"), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal("hello updated", result.Value.Definition);
        Assert.Equal("usr_42", result.Value.UpdatedByUserId);
    }

    [Fact]
    public async Task DeleteAsync_ShouldReturnNotFound_WhenFlashcardMissing()
    {
        var service = CreateService();
        _flashcardRepository.GetByIdAsync("deck_owned", "fc_missing", Arg.Any<CancellationToken>()).Returns((Flashcard?)null);

        var result = await service.DeleteAsync(new DeleteFlashcardInput("deck_owned", "fc_missing", "usr_42"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(FlashcardErrorCodes.NotFound, result.Failure?.Code);
    }

    [Fact]
    public async Task DeleteAsync_ShouldReturnDeletedEnvelope_WhenUserOwnsDeck()
    {
        var service = CreateService();
        var flashcard = CreateFlashcard("deck_owned", "fc_12345678", "hola", "hello");

        _flashcardRepository.GetByIdAsync("deck_owned", "fc_12345678", Arg.Any<CancellationToken>()).Returns(flashcard);
        _deckRepository.GetByIdAsync("deck_owned", Arg.Any<CancellationToken>()).Returns(CreateDeck("deck_owned", "usr_42"));
        _flashcardRepository
            .DeleteAsync("deck_owned", "fc_12345678", flashcard.UpdatedAtUtc, Arg.Any<CancellationToken>())
            .Returns(true);

        var result = await service.DeleteAsync(new DeleteFlashcardInput("deck_owned", "fc_12345678", "usr_42"), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.True(result.Value.Deleted);
        Assert.Equal("fc_12345678", result.Value.Id);

        await _flashcardRepository.Received(1).DeleteAsync("deck_owned", "fc_12345678", flashcard.UpdatedAtUtc, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UpdateAsync_ShouldReturnConcurrencyConflict_WhenRepositoryUpdateFails()
    {
        var service = CreateService();
        var flashcard = CreateFlashcard("deck_owned", "fc_12345678", "hola", "hello");

        _flashcardRepository.GetByIdAsync("deck_owned", "fc_12345678", Arg.Any<CancellationToken>()).Returns(flashcard);
        _deckRepository.GetByIdAsync("deck_owned", Arg.Any<CancellationToken>()).Returns(CreateDeck("deck_owned", "usr_42"));
        _flashcardRepository
            .UpdateAsync(Arg.Any<Flashcard>(), Arg.Any<DateTimeOffset>(), Arg.Any<CancellationToken>())
            .Returns(false);

        var result = await service.UpdateAsync(new UpdateFlashcardInput("deck_owned", "fc_12345678", "hola", "hello updated", null, "usr_42"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(FlashcardErrorCodes.ConcurrencyConflict, result.Failure?.Code);
    }

    [Fact]
    public async Task DeleteAsync_ShouldReturnConcurrencyConflict_WhenRepositoryDeleteFails()
    {
        var service = CreateService();
        var flashcard = CreateFlashcard("deck_owned", "fc_12345678", "hola", "hello");

        _flashcardRepository.GetByIdAsync("deck_owned", "fc_12345678", Arg.Any<CancellationToken>()).Returns(flashcard);
        _deckRepository.GetByIdAsync("deck_owned", Arg.Any<CancellationToken>()).Returns(CreateDeck("deck_owned", "usr_42"));
        _flashcardRepository
            .DeleteAsync("deck_owned", "fc_12345678", flashcard.UpdatedAtUtc, Arg.Any<CancellationToken>())
            .Returns(false);

        var result = await service.DeleteAsync(new DeleteFlashcardInput("deck_owned", "fc_12345678", "usr_42"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(FlashcardErrorCodes.ConcurrencyConflict, result.Failure?.Code);
    }

    [Fact]
    public async Task CreateAsync_ShouldReturnPersistenceUnavailable_WhenDeckRepositoryFails()
    {
        var service = CreateService();
        _deckRepository
            .GetByIdAsync("deck_owned", Arg.Any<CancellationToken>())
            .Returns(Task.FromException<Deck?>(new PersistenceUnavailableException("db down")));

        var result = await service.CreateAsync(new CreateFlashcardInput("deck_owned", "hola", "hello", null, "usr_42"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(FlashcardErrorCodes.PersistenceUnavailable, result.Failure?.Code);
    }

    private static Flashcard CreateFlashcard(string deckId, string flashcardId, string term, string definition)
    {
        var now = DateTimeOffset.UtcNow;
        return new Flashcard(
            flashcardId,
            deckId,
            term,
            definition,
            null,
            now,
            now,
            "usr_42",
            "usr_42");
    }

    private static Deck CreateDeck(string id, string ownerUserId)
    {
        return new Deck(
            id,
            "Deck",
            null,
            DeckTimestamp,
            DeckTimestamp,
            ownerUserId,
            ownerUserId,
            ownerUserId);
    }

    private FlashcardService CreateService()
    {
        return new FlashcardService(
            _deckRepository,
            _flashcardRepository,
            _createValidator,
            _updateValidator,
            _listValidator,
            TimeProvider.System);
    }
}
