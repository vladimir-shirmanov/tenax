using FluentValidation;

namespace Tenax.Application.Decks.Validation;

public sealed class ListDecksInputValidator : AbstractValidator<ListDecksInput>
{
    public ListDecksInputValidator()
    {
        RuleFor(input => input.UserId)
            .NotEmpty();

        RuleFor(input => input.Page)
            .GreaterThanOrEqualTo(1);

        RuleFor(input => input.PageSize)
            .GreaterThanOrEqualTo(1)
            .LessThanOrEqualTo(100);
    }
}
