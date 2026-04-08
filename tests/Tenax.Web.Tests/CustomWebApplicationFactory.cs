using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Testcontainers.PostgreSql;
using Tenax.Infrastructure.Persistence;

namespace Tenax.Web.Tests;

public sealed class CustomWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly SemaphoreSlim _startLock = new(1, 1);
    private readonly PostgreSqlContainer _postgresContainer = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .WithDatabase("tenax_tests")
        .WithUsername("postgres")
        .WithPassword("postgres")
        .Build();

    private volatile bool _postgresStarted;

    protected override IHost CreateHost(IHostBuilder builder)
    {
        EnsurePostgresStartedAsync().GetAwaiter().GetResult();

        var connectionString = _postgresContainer.GetConnectionString();
        var previousConnectionString = Environment.GetEnvironmentVariable("ConnectionStrings__Tenax");
        Environment.SetEnvironmentVariable("ConnectionStrings__Tenax", connectionString);

        try
        {
            var host = base.CreateHost(builder);

            using var scope = host.Services.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<TenaxDbContext>();
            dbContext.Database.Migrate();

            return host;
        }
        finally
        {
            Environment.SetEnvironmentVariable("ConnectionStrings__Tenax", previousConnectionString);
        }
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        EnsurePostgresStartedAsync().GetAwaiter().GetResult();

        builder.ConfigureAppConfiguration((_, configuration) =>
        {
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Tenax"] = _postgresContainer.GetConnectionString()
            });
        });

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<DbContextOptions<TenaxDbContext>>();
            services.AddDbContextPool<TenaxDbContext>(options =>
            {
                options.UseNpgsql(_postgresContainer.GetConnectionString(), npgsqlOptions =>
                {
                    npgsqlOptions.MigrationsAssembly(typeof(TenaxDbContext).Assembly.GetName().Name);
                });
            });

            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
                options.DefaultForbidScheme = TestAuthHandler.SchemeName;
            }).AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { });
        });
    }

    public async Task InitializeAsync()
    {
        await EnsurePostgresStartedAsync();
    }

    public new async Task DisposeAsync()
    {
        await _postgresContainer.DisposeAsync();
        _startLock.Dispose();
    }

    private async Task EnsurePostgresStartedAsync()
    {
        if (_postgresStarted)
        {
            return;
        }

        await _startLock.WaitAsync();
        try
        {
            if (_postgresStarted)
            {
                return;
            }

            await _postgresContainer.StartAsync();
            _postgresStarted = true;
        }
        finally
        {
            _startLock.Release();
        }
    }
}
