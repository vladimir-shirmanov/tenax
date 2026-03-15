using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Tenax.Infrastructure.Persistence;
using Testcontainers.PostgreSql;

namespace Tenax.Infrastructure.Tests.Persistence;

public sealed class PersistenceStartupExtensionsTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgresContainer = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .WithDatabase("tenax_startup_tests")
        .WithUsername("postgres")
        .WithPassword("postgres")
        .Build();

    public async Task InitializeAsync()
    {
        await _postgresContainer.StartAsync();
    }

    public async Task DisposeAsync()
    {
        await _postgresContainer.DisposeAsync();
    }

    [Fact]
    public void ResolveConnectionString_ShouldReturnConfiguredConnectionString_WhenStandardConnectionStringsSectionExists()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Tenax"] = "Host=localhost;Port=5432;Database=tenax;Username=postgres"
            })
            .Build();

        var connectionString = PersistenceStartupExtensions.ResolveConnectionString(configuration);

        Assert.Equal("Host=localhost;Port=5432;Database=tenax;Username=postgres", connectionString);
    }

    [Fact]
    public void ResolveConnectionString_ShouldReturnConfiguredConnectionString_WhenAspireStyleConnectionStringKeyExists()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings__Tenax"] = "Host=aspire-postgres;Port=5432;Database=tenax;Username=postgres"
            })
            .Build();

        var connectionString = PersistenceStartupExtensions.ResolveConnectionString(configuration);

        Assert.Equal("Host=aspire-postgres;Port=5432;Database=tenax;Username=postgres", connectionString);
    }

    [Fact]
    public void ResolveConnectionString_ShouldThrow_WhenNoConnectionStringIsConfigured()
    {
        var configuration = new ConfigurationBuilder().Build();

        var exception = Assert.Throws<InvalidOperationException>(() =>
        {
            _ = PersistenceStartupExtensions.ResolveConnectionString(configuration);
        });

        Assert.Contains(PersistenceStartupExtensions.ConnectionStringKey, exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ApplyMigrationsAsync_ShouldApplyPendingMigrations_ThenSucceedWithNoPendingMigrations()
    {
        using var services = CreateServiceProvider(options =>
        {
            options.UseNpgsql(_postgresContainer.GetConnectionString(), npgsqlOptions =>
            {
                npgsqlOptions.MigrationsAssembly(typeof(TenaxDbContext).Assembly.GetName().Name);
            });
        });

        await services.ApplyMigrationsAsync("Development");
        await services.ApplyMigrationsAsync("Development");

        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<TenaxDbContext>();
        var pendingMigrations = await dbContext.Database.GetPendingMigrationsAsync();

        Assert.Empty(pendingMigrations);
    }

    [Fact]
    public async Task ApplyMigrationsAsync_ShouldRethrow_WhenPersistenceIsUnavailable()
    {
        using var services = CreateServiceProvider(options =>
        {
            options.UseNpgsql(
                "Host=invalid-host-name.local;Port=5432;Database=tenax;Username=postgres;Password=postgres;Timeout=1;Command Timeout=1",
                npgsqlOptions =>
                {
                    npgsqlOptions.MigrationsAssembly(typeof(TenaxDbContext).Assembly.GetName().Name);
                });
        });

        await Assert.ThrowsAnyAsync<Exception>(() => services.ApplyMigrationsAsync("Development"));
    }

    [Fact]
    public async Task ApplyMigrationsAsync_ShouldRethrowUnexpectedExceptions()
    {
        using var services = CreateServiceProvider(_ =>
        {
        });

        await Assert.ThrowsAsync<InvalidOperationException>(() => services.ApplyMigrationsAsync("Development"));
    }

    private static ServiceProvider CreateServiceProvider(Action<DbContextOptionsBuilder> configureDb)
    {
        var serviceCollection = new ServiceCollection();
        serviceCollection.AddLogging();
        serviceCollection.AddDbContext<TenaxDbContext>(configureDb);

        return serviceCollection.BuildServiceProvider();
    }
}