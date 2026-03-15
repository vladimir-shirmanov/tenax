using FluentValidation;
using Tenax.Application.Abstractions.Persistence;
using Tenax.Domain.Flashcards;

namespace Tenax.Application.Flashcards;

public sealed class FlashcardService : IFlashcardService
{
    private readonly IDeckRepository _deckRepository;
    private readonly IFlashcardRepository _flashcardRepository;
    private readonly IValidator<CreateFlashcardInput> _createValidator;
    private readonly IValidator<UpdateFlashcardInput> _updateValidator;
    private readonly IValidator<ListFlashcardsInput> _listValidator;
    private readonly TimeProvider _timeProvider;

    public FlashcardService(
        IDeckRepository deckRepository,
        IFlashcardRepository flashcardRepository,
        IValidator<CreateFlashcardInput> createValidator,
        IValidator<UpdateFlashcardInput> updateValidator,
        IValidator<ListFlashcardsInput> listValidator,
        TimeProvider timeProvider)
    {
        _deckRepository = deckRepository;
        _flashcardRepository = flashcardRepository;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _listValidator = listValidator;
        _timeProvider = timeProvider;
    }

    public async Task<FlashcardResult<FlashcardDto>> CreateAsync(CreateFlashcardInput input, CancellationToken cancellationToken)
    {
        var validationResult = await _createValidator.ValidateAsync(input, cancellationToken);
        if (!validationResult.IsValid)
        {
            return FlashcardResult<FlashcardDto>.Failed(ValidationFailure(validationResult));
        }

        var deck = await _deckRepository.GetByIdAsync(input.DeckId, cancellationToken);
        if (deck is null)
        {
            return FlashcardResult<FlashcardDto>.Failed(new FlashcardFailure(FlashcardErrorCodes.DeckNotFound, "Deck not found"));
        }

        if (!string.Equals(deck.OwnerUserId, input.UserId, StringComparison.Ordinal))
        {
            return FlashcardResult<FlashcardDto>.Failed(new FlashcardFailure(FlashcardErrorCodes.Forbidden, "You do not have permission to modify this deck"));
        }

        var now = _timeProvider.GetUtcNow();
        var flashcard = new Flashcard(
            GenerateId(),
            input.DeckId,
            input.Term,
            input.Definition,
            string.IsNullOrWhiteSpace(input.ImageUrl) ? null : input.ImageUrl,
            now,
            now,
            input.UserId,
            input.UserId);

        await _flashcardRepository.AddAsync(flashcard, cancellationToken);

        return FlashcardResult<FlashcardDto>.Success(MapDto(flashcard));
    }

    public async Task<FlashcardResult<FlashcardListDto>> ListAsync(ListFlashcardsInput input, CancellationToken cancellationToken)
    {
        var validationResult = await _listValidator.ValidateAsync(input, cancellationToken);
        if (!validationResult.IsValid)
        {
            return FlashcardResult<FlashcardListDto>.Failed(ValidationFailure(validationResult));
        }

        var deck = await _deckRepository.GetByIdAsync(input.DeckId, cancellationToken);
        if (deck is null)
        {
            return FlashcardResult<FlashcardListDto>.Failed(new FlashcardFailure(FlashcardErrorCodes.DeckNotFound, "Deck not found"));
        }

        if (!string.Equals(deck.OwnerUserId, input.UserId, StringComparison.Ordinal))
        {
            return FlashcardResult<FlashcardListDto>.Failed(new FlashcardFailure(FlashcardErrorCodes.Forbidden, "You do not have permission to view this deck"));
        }

        var skip = (input.Page - 1) * input.PageSize;
        var cards = await _flashcardRepository.ListByDeckAsync(input.DeckId, skip, input.PageSize, cancellationToken);
        var total = await _flashcardRepository.CountByDeckAsync(input.DeckId, cancellationToken);

        var items = cards
            .Select(card => new FlashcardListItemDto(
                card.Id,
                card.DeckId,
                card.Term,
                BuildDefinitionPreview(card.Definition),
                !string.IsNullOrWhiteSpace(card.ImageUrl),
                card.UpdatedAtUtc,
                card.UpdatedByUserId))
            .ToArray();

        return FlashcardResult<FlashcardListDto>.Success(new FlashcardListDto(items, input.Page, input.PageSize, total));
    }

    public async Task<FlashcardResult<FlashcardDto>> GetDetailAsync(GetFlashcardDetailInput input, CancellationToken cancellationToken)
    {
        var card = await _flashcardRepository.GetByIdAsync(input.DeckId, input.FlashcardId, cancellationToken);
        if (card is null)
        {
            return FlashcardResult<FlashcardDto>.Failed(new FlashcardFailure(FlashcardErrorCodes.NotFound, "Flashcard not found"));
        }

        var deck = await _deckRepository.GetByIdAsync(input.DeckId, cancellationToken);
        if (deck is null)
        {
            return FlashcardResult<FlashcardDto>.Failed(new FlashcardFailure(FlashcardErrorCodes.NotFound, "Flashcard not found"));
        }

        if (!string.Equals(deck.OwnerUserId, input.UserId, StringComparison.Ordinal))
        {
            return FlashcardResult<FlashcardDto>.Failed(new FlashcardFailure(FlashcardErrorCodes.Forbidden, "You do not have permission to view this flashcard"));
        }

        return FlashcardResult<FlashcardDto>.Success(MapDto(card));
    }

    public async Task<FlashcardResult<FlashcardDto>> UpdateAsync(UpdateFlashcardInput input, CancellationToken cancellationToken)
    {
        var validationResult = await _updateValidator.ValidateAsync(input, cancellationToken);
        if (!validationResult.IsValid)
        {
            return FlashcardResult<FlashcardDto>.Failed(ValidationFailure(validationResult));
        }

        var card = await _flashcardRepository.GetByIdAsync(input.DeckId, input.FlashcardId, cancellationToken);
        if (card is null)
        {
            return FlashcardResult<FlashcardDto>.Failed(new FlashcardFailure(FlashcardErrorCodes.NotFound, "Flashcard not found"));
        }

        var deck = await _deckRepository.GetByIdAsync(input.DeckId, cancellationToken);
        if (deck is null)
        {
            return FlashcardResult<FlashcardDto>.Failed(new FlashcardFailure(FlashcardErrorCodes.NotFound, "Flashcard not found"));
        }

        if (!string.Equals(deck.OwnerUserId, input.UserId, StringComparison.Ordinal))
        {
            return FlashcardResult<FlashcardDto>.Failed(new FlashcardFailure(FlashcardErrorCodes.Forbidden, "You do not have permission to modify this flashcard"));
        }

        card.Update(
            input.Term,
            input.Definition,
            string.IsNullOrWhiteSpace(input.ImageUrl) ? null : input.ImageUrl,
            _timeProvider.GetUtcNow(),
            input.UserId);

        return FlashcardResult<FlashcardDto>.Success(MapDto(card));
    }

    public async Task<FlashcardResult<DeleteFlashcardDto>> DeleteAsync(DeleteFlashcardInput input, CancellationToken cancellationToken)
    {
        var card = await _flashcardRepository.GetByIdAsync(input.DeckId, input.FlashcardId, cancellationToken);
        if (card is null)
        {
            return FlashcardResult<DeleteFlashcardDto>.Failed(new FlashcardFailure(FlashcardErrorCodes.NotFound, "Flashcard not found"));
        }

        var deck = await _deckRepository.GetByIdAsync(input.DeckId, cancellationToken);
        if (deck is null)
        {
            return FlashcardResult<DeleteFlashcardDto>.Failed(new FlashcardFailure(FlashcardErrorCodes.NotFound, "Flashcard not found"));
        }

        if (!string.Equals(deck.OwnerUserId, input.UserId, StringComparison.Ordinal))
        {
            return FlashcardResult<DeleteFlashcardDto>.Failed(new FlashcardFailure(FlashcardErrorCodes.Forbidden, "You do not have permission to delete this flashcard"));
        }

        await _flashcardRepository.DeleteAsync(input.DeckId, input.FlashcardId, cancellationToken);

        return FlashcardResult<DeleteFlashcardDto>.Success(new DeleteFlashcardDto(true, input.FlashcardId, input.DeckId, _timeProvider.GetUtcNow()));
    }

    private static string GenerateId()
    {
        return $"fc_{Guid.NewGuid():N}"[..11];
    }

    private static string BuildDefinitionPreview(string definition)
    {
        const int maxPreviewLength = 120;
        if (definition.Length <= maxPreviewLength)
        {
            return definition;
        }

        return definition[..maxPreviewLength];
    }

    private static FlashcardFailure ValidationFailure(FluentValidation.Results.ValidationResult validationResult)
    {
        var errors = validationResult.Errors
            .GroupBy(x => ToCamelCase(x.PropertyName))
            .ToDictionary(
                group => group.Key,
                group => group.Select(error => error.ErrorMessage).Distinct().ToArray(),
                StringComparer.OrdinalIgnoreCase);

        return new FlashcardFailure(FlashcardErrorCodes.ValidationError, "Request validation failed", errors);
    }

    private static string ToCamelCase(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return value;
        }

        if (value.Length == 1)
        {
            return value.ToLowerInvariant();
        }

        return char.ToLowerInvariant(value[0]) + value[1..];
    }

    private static FlashcardDto MapDto(Flashcard flashcard)
    {
        return new FlashcardDto(
            flashcard.Id,
            flashcard.DeckId,
            flashcard.Term,
            flashcard.Definition,
            flashcard.ImageUrl,
            flashcard.CreatedAtUtc,
            flashcard.UpdatedAtUtc,
            flashcard.CreatedByUserId,
            flashcard.UpdatedByUserId);
    }
}
