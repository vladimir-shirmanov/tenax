using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Tenax.Application.Abstractions.Persistence;
using Tenax.Infrastructure.Persistence;
using Tenax.Infrastructure.Persistence.Repositories;

namespace Tenax.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = PersistenceStartupExtensions.ResolveConnectionString(configuration);

        services.AddDbContext<TenaxDbContext>(options =>
        {
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.MigrationsAssembly(typeof(TenaxDbContext).Assembly.GetName().Name);
            });
        });

        services.AddHealthChecks()
            .AddDbContextCheck<TenaxDbContext>(tags: ["ready"]);

        services.AddScoped<IDeckRepository, EfDeckRepository>();
        services.AddScoped<IFlashcardRepository, EfFlashcardRepository>();

        return services;
    }
}
