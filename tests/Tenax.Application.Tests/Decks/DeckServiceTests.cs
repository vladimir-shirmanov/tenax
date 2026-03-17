using FluentValidation;
using NSubstitute;
using Tenax.Application.Abstractions.Persistence;
using Tenax.Application.Decks;
using Tenax.Application.Decks.Validation;
using Tenax.Domain.Decks;

namespace Tenax.Application.Tests.Decks;

public sealed class DeckServiceTests
{
    private readonly IDeckRepository _deckRepository = Substitute.For<IDeckRepository>();
    private readonly IValidator<CreateDeckInput> _createValidator = new CreateDeckInputValidator();
    private readonly IValidator<UpdateDeckInput> _updateValidator = new UpdateDeckInputValidator();
    private readonly IValidator<ListDecksInput> _listValidator = new ListDecksInputValidator();

    [Fact]
    public async Task CreateAsync_ShouldReturnCreatedDeck_WhenRequestValid()
    {
        var service = CreateService();

        var result = await service.CreateAsync(new CreateDeckInput(" Spanish Basics ", " A1 ", "usr_42"), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal("Spanish Basics", result.Value.Name);
        Assert.Equal("A1", result.Value.Description);

        await _deckRepository.Received(1).AddAsync(Arg.Any<Deck>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ListAsync_ShouldReturnValidationError_WhenPageIsInvalid()
    {
        var service = CreateService();

        var result = await service.ListAsync(new ListDecksInput(0, 20, "usr_42"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(DeckErrorCodes.ValidationError, result.Failure?.Code);
        Assert.True(result.Failure?.Errors?.ContainsKey("page"));
    }

    [Fact]
    public async Task GetDetailAsync_ShouldReturnForbidden_WhenRequesterIsNotOwner()
    {
        var service = CreateService();
        _deckRepository.GetByIdAsync("deck_forbidden", Arg.Any<CancellationToken>())
            .Returns(new Deck("deck_forbidden", "Spanish", null, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow, "usr_other", "usr_other", "usr_other"));

        var result = await service.GetDetailAsync(new GetDeckDetailInput("deck_forbidden", "usr_42"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(DeckErrorCodes.Forbidden, result.Failure?.Code);
    }

    [Fact]
    public async Task UpdateAsync_ShouldReturnConcurrencyConflict_WhenRepositoryUpdateFails()
    {
        var service = CreateService();
        var existing = new Deck("deck_owned", "Spanish", "desc", DateTimeOffset.UtcNow.AddMinutes(-1), DateTimeOffset.UtcNow.AddMinutes(-1), "usr_42", "usr_42", "usr_42");

        _deckRepository.GetByIdAsync("deck_owned", Arg.Any<CancellationToken>()).Returns(existing);
        _deckRepository.UpdateAsync(Arg.Any<Deck>(), existing.UpdatedAtUtc, Arg.Any<CancellationToken>()).Returns(false);

        var result = await service.UpdateAsync(new UpdateDeckInput("deck_owned", "Spanish A1", "desc", "usr_42"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(DeckErrorCodes.ConcurrencyConflict, result.Failure?.Code);
    }

    [Fact]
    public async Task DeleteAsync_ShouldReturnNotFound_WhenDeckMissing()
    {
        var service = CreateService();
        _deckRepository.GetByIdAsync("deck_missing", Arg.Any<CancellationToken>()).Returns((Deck?)null);

        var result = await service.DeleteAsync(new DeleteDeckInput("deck_missing", "usr_42"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(DeckErrorCodes.DeckNotFound, result.Failure?.Code);
    }

    private DeckService CreateService()
    {
        return new DeckService(
            _deckRepository,
            _createValidator,
            _updateValidator,
            _listValidator,
            TimeProvider.System);
    }
}
