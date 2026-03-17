namespace Tenax.Application.Decks;

public static class DeckErrorCodes
{
    public const string ValidationError = "validation_error";
    public const string Forbidden = "forbidden";
    public const string DeckNotFound = "deck_not_found";
    public const string PersistenceUnavailable = "persistence_unavailable";
    public const string ConcurrencyConflict = "concurrency_conflict";
}

public sealed record DeckFailure(string Code, string Message, IDictionary<string, string[]>? Errors = null);

public sealed class DeckResult<T>
{
    private DeckResult(T? value, DeckFailure? failure)
    {
        Value = value;
        Failure = failure;
    }

    public T? Value { get; }

    public DeckFailure? Failure { get; }

    public bool IsSuccess => Failure is null;

    public static DeckResult<T> Success(T value)
    {
        return new DeckResult<T>(value, null);
    }

    public static DeckResult<T> Failed(DeckFailure failure)
    {
        return new DeckResult<T>(default, failure);
    }
}
