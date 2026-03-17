using FluentValidation;
using Tenax.Application.Abstractions.Persistence;
using Tenax.Domain.Decks;

namespace Tenax.Application.Decks;

public sealed class DeckService : IDeckService
{
    private readonly IDeckRepository _deckRepository;
    private readonly IValidator<CreateDeckInput> _createValidator;
    private readonly IValidator<UpdateDeckInput> _updateValidator;
    private readonly IValidator<ListDecksInput> _listValidator;
    private readonly TimeProvider _timeProvider;

    public DeckService(
        IDeckRepository deckRepository,
        IValidator<CreateDeckInput> createValidator,
        IValidator<UpdateDeckInput> updateValidator,
        IValidator<ListDecksInput> listValidator,
        TimeProvider timeProvider)
    {
        _deckRepository = deckRepository;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _listValidator = listValidator;
        _timeProvider = timeProvider;
    }

    public async Task<DeckResult<DeckDto>> CreateAsync(CreateDeckInput input, CancellationToken cancellationToken)
    {
        try
        {
            var validationResult = await _createValidator.ValidateAsync(input, cancellationToken);
            if (!validationResult.IsValid)
            {
                return DeckResult<DeckDto>.Failed(ValidationFailure(validationResult));
            }

            var now = _timeProvider.GetUtcNow();
            var deck = new Deck(
                GenerateId(),
                NormalizeName(input.Name),
                NormalizeDescription(input.Description),
                now,
                now,
                input.UserId,
                input.UserId,
                input.UserId);

            await _deckRepository.AddAsync(deck, cancellationToken);

            return DeckResult<DeckDto>.Success(MapDto(deck));
        }
        catch (PersistenceUnavailableException)
        {
            return DeckResult<DeckDto>.Failed(PersistenceUnavailableFailure());
        }
    }

    public async Task<DeckResult<DeckListDto>> ListAsync(ListDecksInput input, CancellationToken cancellationToken)
    {
        try
        {
            var validationResult = await _listValidator.ValidateAsync(input, cancellationToken);
            if (!validationResult.IsValid)
            {
                return DeckResult<DeckListDto>.Failed(ValidationFailure(validationResult));
            }

            var skip = (input.Page - 1) * input.PageSize;
            var decks = await _deckRepository.ListByOwnerAsync(input.UserId, skip, input.PageSize, cancellationToken);
            var totalCount = await _deckRepository.CountByOwnerAsync(input.UserId, cancellationToken);

            var items = decks
                .Select(item => new DeckListItemDto(
                    item.Deck.Id,
                    item.Deck.Name,
                    item.Deck.Description,
                    item.FlashcardCount,
                    item.Deck.CreatedAtUtc,
                    item.Deck.UpdatedAtUtc,
                    item.Deck.CreatedByUserId,
                    item.Deck.UpdatedByUserId))
                .ToArray();

            return DeckResult<DeckListDto>.Success(new DeckListDto(items, input.Page, input.PageSize, totalCount));
        }
        catch (PersistenceUnavailableException)
        {
            return DeckResult<DeckListDto>.Failed(PersistenceUnavailableFailure());
        }
    }

    public async Task<DeckResult<DeckDto>> GetDetailAsync(GetDeckDetailInput input, CancellationToken cancellationToken)
    {
        try
        {
            var deck = await _deckRepository.GetByIdAsync(input.DeckId, cancellationToken);
            if (deck is null)
            {
                return DeckResult<DeckDto>.Failed(new DeckFailure(DeckErrorCodes.DeckNotFound, "Deck not found"));
            }

            if (!string.Equals(deck.OwnerUserId, input.UserId, StringComparison.Ordinal))
            {
                return DeckResult<DeckDto>.Failed(new DeckFailure(DeckErrorCodes.Forbidden, "You do not have permission to view this deck"));
            }

            return DeckResult<DeckDto>.Success(MapDto(deck));
        }
        catch (PersistenceUnavailableException)
        {
            return DeckResult<DeckDto>.Failed(PersistenceUnavailableFailure());
        }
    }

    public async Task<DeckResult<DeckDto>> UpdateAsync(UpdateDeckInput input, CancellationToken cancellationToken)
    {
        try
        {
            var validationResult = await _updateValidator.ValidateAsync(input, cancellationToken);
            if (!validationResult.IsValid)
            {
                return DeckResult<DeckDto>.Failed(ValidationFailure(validationResult));
            }

            var deck = await _deckRepository.GetByIdAsync(input.DeckId, cancellationToken);
            if (deck is null)
            {
                return DeckResult<DeckDto>.Failed(new DeckFailure(DeckErrorCodes.DeckNotFound, "Deck not found"));
            }

            if (!string.Equals(deck.OwnerUserId, input.UserId, StringComparison.Ordinal))
            {
                return DeckResult<DeckDto>.Failed(new DeckFailure(DeckErrorCodes.Forbidden, "You do not have permission to modify this deck"));
            }

            var expectedUpdatedAtUtc = deck.UpdatedAtUtc;
            deck.UpdateMetadata(NormalizeName(input.Name), NormalizeDescription(input.Description), _timeProvider.GetUtcNow(), input.UserId);

            var updated = await _deckRepository.UpdateAsync(deck, expectedUpdatedAtUtc, cancellationToken);
            if (!updated)
            {
                return DeckResult<DeckDto>.Failed(new DeckFailure(
                    DeckErrorCodes.ConcurrencyConflict,
                    "Deck was modified by another operation. Reload and retry."));
            }

            return DeckResult<DeckDto>.Success(MapDto(deck));
        }
        catch (PersistenceUnavailableException)
        {
            return DeckResult<DeckDto>.Failed(PersistenceUnavailableFailure());
        }
    }

    public async Task<DeckResult<DeleteDeckDto>> DeleteAsync(DeleteDeckInput input, CancellationToken cancellationToken)
    {
        try
        {
            var deck = await _deckRepository.GetByIdAsync(input.DeckId, cancellationToken);
            if (deck is null)
            {
                return DeckResult<DeleteDeckDto>.Failed(new DeckFailure(DeckErrorCodes.DeckNotFound, "Deck not found"));
            }

            if (!string.Equals(deck.OwnerUserId, input.UserId, StringComparison.Ordinal))
            {
                return DeckResult<DeleteDeckDto>.Failed(new DeckFailure(DeckErrorCodes.Forbidden, "You do not have permission to delete this deck"));
            }

            var deleted = await _deckRepository.DeleteAsync(input.DeckId, deck.UpdatedAtUtc, cancellationToken);
            if (!deleted)
            {
                return DeckResult<DeleteDeckDto>.Failed(new DeckFailure(
                    DeckErrorCodes.ConcurrencyConflict,
                    "Deck changed during delete operation. Refresh and retry."));
            }

            return DeckResult<DeleteDeckDto>.Success(new DeleteDeckDto(true, input.DeckId, _timeProvider.GetUtcNow()));
        }
        catch (PersistenceUnavailableException)
        {
            return DeckResult<DeleteDeckDto>.Failed(PersistenceUnavailableFailure());
        }
    }

    private static string NormalizeName(string name)
    {
        return name.Trim();
    }

    private static string? NormalizeDescription(string? description)
    {
        if (string.IsNullOrWhiteSpace(description))
        {
            return null;
        }

        return description.Trim();
    }

    private static string GenerateId()
    {
        return $"deck_{Guid.NewGuid():N}"[..13];
    }

    private static DeckFailure PersistenceUnavailableFailure()
    {
        return new DeckFailure(DeckErrorCodes.PersistenceUnavailable, "Persistence service is temporarily unavailable");
    }

    private static DeckFailure ValidationFailure(FluentValidation.Results.ValidationResult validationResult)
    {
        var errors = validationResult.Errors
            .GroupBy(x => ToCamelCase(x.PropertyName))
            .ToDictionary(
                group => group.Key,
                group => group.Select(error => error.ErrorMessage).Distinct().ToArray(),
                StringComparer.OrdinalIgnoreCase);

        return new DeckFailure(DeckErrorCodes.ValidationError, "Request validation failed", errors);
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

    private static DeckDto MapDto(Deck deck)
    {
        return new DeckDto(
            deck.Id,
            deck.Name,
            deck.Description,
            deck.CreatedAtUtc,
            deck.UpdatedAtUtc,
            deck.CreatedByUserId,
            deck.UpdatedByUserId);
    }
}
