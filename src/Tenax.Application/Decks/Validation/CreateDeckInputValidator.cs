using FluentValidation;

namespace Tenax.Application.Decks.Validation;

public sealed class CreateDeckInputValidator : AbstractValidator<CreateDeckInput>
{
    public CreateDeckInputValidator()
    {
        RuleFor(input => input.UserId)
            .NotEmpty();

        RuleFor(input => input.Name)
            .NotEmpty()
            .Must(name => !string.IsNullOrWhiteSpace(name))
            .MaximumLength(120);

        RuleFor(input => input.Description)
            .MaximumLength(1000);
    }
}
