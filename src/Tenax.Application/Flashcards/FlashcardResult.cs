namespace Tenax.Application.Flashcards;

public static class FlashcardErrorCodes
{
    public const string ValidationError = "validation_error";
    public const string Forbidden = "forbidden";
    public const string DeckNotFound = "deck_not_found";
    public const string NotFound = "not_found";
    public const string PersistenceUnavailable = "persistence_unavailable";
    public const string ConcurrencyConflict = "concurrency_conflict";
}

public sealed record FlashcardFailure(string Code, string Message, IDictionary<string, string[]>? Errors = null);

public sealed class FlashcardResult<T>
{
    private FlashcardResult(T? value, FlashcardFailure? failure)
    {
        Value = value;
        Failure = failure;
    }

    public T? Value { get; }

    public FlashcardFailure? Failure { get; }

    public bool IsSuccess => Failure is null;

    public static FlashcardResult<T> Success(T value)
    {
        return new FlashcardResult<T>(value, null);
    }

    public static FlashcardResult<T> Failed(FlashcardFailure failure)
    {
        return new FlashcardResult<T>(default, failure);
    }
}
