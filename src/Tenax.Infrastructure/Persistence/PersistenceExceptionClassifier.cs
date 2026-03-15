using System.Data.Common;
using Npgsql;
using Tenax.Application.Abstractions.Persistence;

namespace Tenax.Infrastructure.Persistence;

internal static class PersistenceExceptionClassifier
{
    public static bool IsPersistenceUnavailable(Exception exception)
    {
        if (exception is PersistenceUnavailableException)
        {
            return true;
        }

        if (exception is NpgsqlException or DbException or TimeoutException)
        {
            return true;
        }

        if (exception.InnerException is not null)
        {
            return IsPersistenceUnavailable(exception.InnerException);
        }

        return false;
    }
}
