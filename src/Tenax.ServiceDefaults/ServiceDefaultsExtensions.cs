using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Tenax.ServiceDefaults;

public static class ServiceDefaultsExtensions
{
    public static IServiceCollection AddTenaxServiceDefaults(this IServiceCollection services)
    {
        services.AddProblemDetails();
        services.AddHealthChecks();

        return services;
    }

    public static WebApplication MapTenaxDefaultEndpoints(this WebApplication app)
    {
        app.MapHealthChecks("/health");
        app.MapHealthChecks("/health/ready", new HealthCheckOptions
        {
            Predicate = registration => registration.Tags.Contains("ready", StringComparer.Ordinal)
        });

        return app;
    }
}
