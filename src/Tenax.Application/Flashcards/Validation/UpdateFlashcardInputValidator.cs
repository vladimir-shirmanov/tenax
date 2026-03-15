using FluentValidation;

namespace Tenax.Application.Flashcards.Validation;

public sealed class UpdateFlashcardInputValidator : AbstractValidator<UpdateFlashcardInput>
{
    public UpdateFlashcardInputValidator()
    {
        RuleFor(input => input.DeckId)
            .NotEmpty();

        RuleFor(input => input.FlashcardId)
            .NotEmpty();

        RuleFor(input => input.UserId)
            .NotEmpty();

        RuleFor(input => input.Term)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(input => input.Definition)
            .NotEmpty()
            .MaximumLength(2000);

        RuleFor(input => input.ImageUrl)
            .MaximumLength(2048)
            .Must(BeValidUri)
            .When(input => !string.IsNullOrWhiteSpace(input.ImageUrl));
    }

    private static bool BeValidUri(string? value)
    {
        return Uri.TryCreate(value, UriKind.Absolute, out _);
    }
}
