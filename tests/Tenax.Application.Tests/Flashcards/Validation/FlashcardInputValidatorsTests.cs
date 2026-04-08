using Tenax.Application.Flashcards;
using Tenax.Application.Flashcards.Validation;

namespace Tenax.Application.Tests.Flashcards.Validation;

public sealed class FlashcardInputValidatorsTests
{
    [Fact]
    public void CreateValidator_ShouldRejectInvalidImageUrl()
    {
        var validator = new CreateFlashcardInputValidator();

        var result = validator.Validate(new CreateFlashcardInput(
            "deck_owned",
            "hola",
            "hello",
            "not-a-valid-uri",
            "usr_42"));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName == nameof(CreateFlashcardInput.ImageUrl));
    }

    [Fact]
    public void CreateValidator_ShouldAllowNullImageUrl()
    {
        var validator = new CreateFlashcardInputValidator();

        var result = validator.Validate(new CreateFlashcardInput(
            "deck_owned",
            "hola",
            "hello",
            null,
            "usr_42"));

        Assert.True(result.IsValid);
    }

    [Fact]
    public void UpdateValidator_ShouldRejectInvalidImageUrl()
    {
        var validator = new UpdateFlashcardInputValidator();

        var result = validator.Validate(new UpdateFlashcardInput(
            "deck_owned",
            "fc_12345678",
            "hola",
            "hello",
            "not-a-valid-uri",
            "usr_42"));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName == nameof(UpdateFlashcardInput.ImageUrl));
    }

    [Fact]
    public void ListValidator_ShouldAllowPageSizeAtUpperBound()
    {
        var validator = new ListFlashcardsInputValidator();

        var result = validator.Validate(new ListFlashcardsInput(
            "deck_owned",
            1,
            50,
            "usr_42"));

        Assert.True(result.IsValid);
    }

    [Fact]
    public void ListValidator_ShouldRejectPageSizeAboveUpperBound()
    {
        var validator = new ListFlashcardsInputValidator();

        var result = validator.Validate(new ListFlashcardsInput(
            "deck_owned",
            1,
            501,
            "usr_42"));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName == nameof(ListFlashcardsInput.PageSize));
    }

    [Fact]
    public void ListValidator_ShouldRejectZeroPageSize()
    {
        var validator = new ListFlashcardsInputValidator();

        var result = validator.Validate(new ListFlashcardsInput(
            "deck_owned",
            1,
            0,
            "usr_42"));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName == nameof(ListFlashcardsInput.PageSize));
    }

    [Fact]
    public void ListValidator_ShouldRejectMissingShuffleSeed_WhenShuffleEnabled()
    {
        var validator = new ListFlashcardsInputValidator();

        var result = validator.Validate(new ListFlashcardsInput(
            "deck_owned",
            1,
            20,
            "usr_42",
            true,
            null));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error =>
            error.PropertyName == nameof(ListFlashcardsInput.ShuffleSeed)
            && error.ErrorMessage == "shuffleSeed is required when shuffle is true");
    }

    [Fact]
    public void ListValidator_ShouldAllowShuffleSeed_WhenShuffleEnabled()
    {
        var validator = new ListFlashcardsInputValidator();

        var result = validator.Validate(new ListFlashcardsInput(
            "deck_owned",
            1,
            20,
            "usr_42",
            true,
            "seed-123"));

        Assert.True(result.IsValid);
    }

    [Fact]
    public void ListValidator_ShouldAllowMissingShuffleSeed_WhenShuffleDisabled()
    {
        var validator = new ListFlashcardsInputValidator();

        var result = validator.Validate(new ListFlashcardsInput(
            "deck_owned",
            1,
            20,
            "usr_42",
            false,
            null));

        Assert.True(result.IsValid);
    }
}
