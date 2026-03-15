using Microsoft.Extensions.DependencyInjection;
using Tenax.Application.Abstractions.Persistence;
using Tenax.Infrastructure.Persistence;

namespace Tenax.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddSingleton<IDeckRepository, InMemoryDeckRepository>();
        services.AddSingleton<IFlashcardRepository, InMemoryFlashcardRepository>();

        return services;
    }
}
