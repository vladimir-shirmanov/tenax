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
}