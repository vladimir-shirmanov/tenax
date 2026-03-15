using FluentValidation;

namespace Tenax.Application.Flashcards.Validation;

public sealed class CreateFlashcardInputValidator : AbstractValidator<CreateFlashcardInput>
{
    public CreateFlashcardInputValidator()
    {
        RuleFor(input => input.DeckId)
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
