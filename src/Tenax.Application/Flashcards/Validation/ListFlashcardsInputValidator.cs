using FluentValidation;

namespace Tenax.Application.Flashcards.Validation;

public sealed class ListFlashcardsInputValidator : AbstractValidator<ListFlashcardsInput>
{
    public ListFlashcardsInputValidator()
    {
        RuleFor(input => input.DeckId)
            .NotEmpty();

        RuleFor(input => input.UserId)
            .NotEmpty();

        RuleFor(input => input.Page)
            .GreaterThanOrEqualTo(1);

        RuleFor(input => input.PageSize)
            .GreaterThanOrEqualTo(1)
            .LessThanOrEqualTo(100);
    }
}
