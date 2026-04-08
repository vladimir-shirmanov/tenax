using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.DependencyInjection;
using OpenTelemetry;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;

namespace Tenax.ServiceDefaults;

public static class ServiceDefaultsExtensions
{
    public static IServiceCollection AddTenaxServiceDefaults(this IServiceCollection services)
    {
        services.AddProblemDetails();

        var otelBuilder = services.AddOpenTelemetry()
            .WithTracing(tracing =>
            {
                tracing
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation(options =>
                    {
                        options.FilterHttpRequestMessage = request =>
                        {
                            var path = request.RequestUri?.AbsolutePath;
                            return !string.Equals(path, "/api/telemetry/traces", StringComparison.OrdinalIgnoreCase)
                                && !string.Equals(path, "/v1/traces", StringComparison.OrdinalIgnoreCase);
                        };
                    })
                    .AddEntityFrameworkCoreInstrumentation();
            })
            .WithMetrics(metrics =>
            {
                metrics
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation();
            })
            .WithLogging();

        if (!string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("OTEL_EXPORTER_OTLP_ENDPOINT")))
        {
            otelBuilder.UseOtlpExporter();
        }

        services.Configure<OpenTelemetryLoggerOptions>(logging =>
        {
            logging.IncludeFormattedMessage = true;
            logging.IncludeScopes = true;
        });

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
