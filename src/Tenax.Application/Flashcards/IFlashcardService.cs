namespace Tenax.Application.Flashcards;

public interface IFlashcardService
{
    Task<FlashcardResult<FlashcardDto>> CreateAsync(CreateFlashcardInput input, CancellationToken cancellationToken);

    Task<FlashcardResult<FlashcardListDto>> ListAsync(ListFlashcardsInput input, CancellationToken cancellationToken);

    Task<FlashcardResult<FlashcardDto>> GetDetailAsync(GetFlashcardDetailInput input, CancellationToken cancellationToken);

    Task<FlashcardResult<FlashcardDto>> UpdateAsync(UpdateFlashcardInput input, CancellationToken cancellationToken);

    Task<FlashcardResult<DeleteFlashcardDto>> DeleteAsync(DeleteFlashcardInput input, CancellationToken cancellationToken);
}
