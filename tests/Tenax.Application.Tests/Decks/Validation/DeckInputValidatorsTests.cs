using Tenax.Application.Decks;
using Tenax.Application.Decks.Validation;

namespace Tenax.Application.Tests.Decks.Validation;

public sealed class DeckInputValidatorsTests
{
    [Fact]
    public void CreateValidator_ShouldRejectWhitespaceName()
    {
        var validator = new CreateDeckInputValidator();

        var result = validator.Validate(new CreateDeckInput("   ", "description", "usr_42"));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName == nameof(CreateDeckInput.Name));
    }

    [Fact]
    public void UpdateValidator_ShouldRejectDescriptionLongerThan1000()
    {
        var validator = new UpdateDeckInputValidator();

        var result = validator.Validate(new UpdateDeckInput("deck_owned", "Spanish Basics", new string('x', 1001), "usr_42"));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName == nameof(UpdateDeckInput.Description));
    }

    [Fact]
    public void ListValidator_ShouldRejectPageSizeAbove100()
    {
        var validator = new ListDecksInputValidator();

        var result = validator.Validate(new ListDecksInput(1, 101, "usr_42"));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName == nameof(ListDecksInput.PageSize));
    }
}
