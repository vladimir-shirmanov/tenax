namespace Tenax.AppHost;

internal static class AppHostEnvironmentDefaults
{
    internal const string AspNetCoreUrlsVariableName = "ASPNETCORE_URLS";
    internal const string AllowUnsecuredTransportVariableName = "ASPIRE_ALLOW_UNSECURED_TRANSPORT";
    internal const string DashboardOtlpEndpointVariableName = "ASPIRE_DASHBOARD_OTLP_ENDPOINT_URL";
    internal const string DashboardOtlpHttpEndpointVariableName = "ASPIRE_DASHBOARD_OTLP_HTTP_ENDPOINT_URL";

    internal const string DefaultDashboardUrls = "http://127.0.0.1:18888";
    internal const string DefaultAllowUnsecuredTransport = "true";
    internal const string DefaultDashboardOtlpHttpEndpoint = "http://127.0.0.1:18889";

    public static void ApplyProcessDefaults()
    {
        Apply(Environment.GetEnvironmentVariable, static (name, value) => Environment.SetEnvironmentVariable(name, value));
    }

    internal static void Apply(Func<string, string?> getEnvironmentVariable, Action<string, string> setEnvironmentVariable)
    {
        ArgumentNullException.ThrowIfNull(getEnvironmentVariable);
        ArgumentNullException.ThrowIfNull(setEnvironmentVariable);

        if (string.IsNullOrWhiteSpace(getEnvironmentVariable(AspNetCoreUrlsVariableName)))
        {
            setEnvironmentVariable(AspNetCoreUrlsVariableName, DefaultDashboardUrls);
        }

        if (string.IsNullOrWhiteSpace(getEnvironmentVariable(AllowUnsecuredTransportVariableName)))
        {
            setEnvironmentVariable(AllowUnsecuredTransportVariableName, DefaultAllowUnsecuredTransport);
        }

        var hasGrpcEndpoint = !string.IsNullOrWhiteSpace(getEnvironmentVariable(DashboardOtlpEndpointVariableName));
        var hasHttpEndpoint = !string.IsNullOrWhiteSpace(getEnvironmentVariable(DashboardOtlpHttpEndpointVariableName));

        if (!hasGrpcEndpoint && !hasHttpEndpoint)
        {
            setEnvironmentVariable(DashboardOtlpHttpEndpointVariableName, DefaultDashboardOtlpHttpEndpoint);
        }
    }
}