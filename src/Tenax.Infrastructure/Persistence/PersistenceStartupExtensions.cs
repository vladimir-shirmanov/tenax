using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace Tenax.Infrastructure.Persistence;

public static class PersistenceStartupExtensions
{
    public const string ConnectionStringKey = "ConnectionStrings:Tenax";

    public static string ResolveConnectionString(IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Tenax");
        if (!string.IsNullOrWhiteSpace(connectionString))
        {
            return connectionString;
        }

        throw new InvalidOperationException(
            $"PostgreSQL connection string is required. Configure '{ConnectionStringKey}' via appsettings, user-secrets, or environment variables.");
    }

    public static async Task ApplyMigrationsAsync(this IServiceProvider services, string environmentName, CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("Tenax.PersistenceStartup");
        var dbContext = scope.ServiceProvider.GetRequiredService<TenaxDbContext>();

        try
        {
            var pendingMigrations = await dbContext.Database.GetPendingMigrationsAsync(cancellationToken);
            var migrationList = pendingMigrations.ToArray();

            if (migrationList.Length > 0)
            {
                logger.LogInformation("Applying {Count} pending migrations: {Migrations}", migrationList.Length, string.Join(", ", migrationList));
                await dbContext.Database.MigrateAsync(cancellationToken);
            }
            else
            {
                logger.LogInformation("No pending migrations detected for environment {EnvironmentName}.", environmentName);
            }
        }
        catch (Exception exception) when (PersistenceExceptionClassifier.IsPersistenceUnavailable(exception))
        {
            var details = TryReadConnectionDetails(dbContext.Database.GetConnectionString());
            logger.LogCritical(
                exception,
                "PostgreSQL connectivity/migration failure. Host={Host}; Database={Database}; User={User}; FailureCategory={Category}",
                details.Host,
                details.Database,
                details.User,
                "connection_or_migration");

            throw;
        }
        catch (Exception exception)
        {
            logger.LogCritical(exception, "Unexpected failure while applying Tenax persistence migrations.");
            throw;
        }
    }

    private static (string Host, string Database, string User) TryReadConnectionDetails(string? connectionString)
    {
        try
        {
            var builder = new NpgsqlConnectionStringBuilder(connectionString);
            return (builder.Host ?? "unknown", builder.Database ?? "unknown", builder.Username ?? "unknown");
        }
        catch
        {
            return ("unknown", "unknown", "unknown");
        }
    }
}
