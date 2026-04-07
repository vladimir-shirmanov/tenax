namespace Tenax.Web.Telemetry;

internal static class TelemetryConstants
{
    /// <summary>
    /// Named HttpClient used by <see cref="TelemetryProxyEndpoint"/> and registered by
    /// <see cref="TelemetryDependencyInjection"/>. Centralised here so both sites can't drift.
    /// </summary>
    internal const string ProxyClientName = "TelemetryOtlpProxy";
}
