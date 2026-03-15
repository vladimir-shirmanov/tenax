using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Tenax.Application.Abstractions.Persistence;
using Tenax.Infrastructure.Persistence;
using Tenax.Infrastructure.Persistence.Repositories;

namespace Tenax.Infrastructure;

public static class DependencyInjection
{
    public static IHostApplicationBuilder AddInfrastructure(this IHostApplicationBuilder builder)
    {
        builder.AddNpgsqlDbContext<TenaxDbContext>("Tenax");

        builder.Services.AddScoped<IDeckRepository, EfDeckRepository>();
        builder.Services.AddScoped<IFlashcardRepository, EfFlashcardRepository>();

        return builder;
    }
}
