namespace Tenax.Web.Telemetry;

public static class TelemetryDependencyInjection
{
    private const string TelemetryProxyClientName = TelemetryConstants.ProxyClientName;
    private const string OtlpEndpointEnvironmentVariableName = "OTEL_EXPORTER_OTLP_ENDPOINT";

    public static IServiceCollection AddTelemetryProxy(this IServiceCollection services)
    {
        services.AddHttpClient(TelemetryProxyClientName, client =>
        {
            var endpoint = Environment.GetEnvironmentVariable(OtlpEndpointEnvironmentVariableName);
            if (!string.IsNullOrWhiteSpace(endpoint) && Uri.TryCreate(endpoint, UriKind.Absolute, out var baseAddress))
            {
                client.BaseAddress = baseAddress;
            }
        });

        return services;
    }
}
