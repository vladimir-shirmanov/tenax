namespace Tenax.Application.Decks;

public interface IDeckService
{
    Task<DeckResult<DeckDto>> CreateAsync(CreateDeckInput input, CancellationToken cancellationToken);

    Task<DeckResult<DeckListDto>> ListAsync(ListDecksInput input, CancellationToken cancellationToken);

    Task<DeckResult<DeckDto>> GetDetailAsync(GetDeckDetailInput input, CancellationToken cancellationToken);

    Task<DeckResult<DeckDto>> UpdateAsync(UpdateDeckInput input, CancellationToken cancellationToken);

    Task<DeckResult<DeleteDeckDto>> DeleteAsync(DeleteDeckInput input, CancellationToken cancellationToken);
}
