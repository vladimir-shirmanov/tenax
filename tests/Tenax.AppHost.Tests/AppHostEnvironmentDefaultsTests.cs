namespace Tenax.AppHost.Tests;

public class AppHostEnvironmentDefaultsTests
{
    [Fact]
    public void Apply_SetsDashboardDefaults_WhenRequiredVariablesAreMissing()
    {
        var environment = new Dictionary<string, string?>();

        AppHostEnvironmentDefaults.Apply(GetEnvironmentVariable, SetEnvironmentVariable);

        Assert.Equal(AppHostEnvironmentDefaults.DefaultDashboardUrls, environment[AppHostEnvironmentDefaults.AspNetCoreUrlsVariableName]);
        Assert.Equal(AppHostEnvironmentDefaults.DefaultAllowUnsecuredTransport, environment[AppHostEnvironmentDefaults.AllowUnsecuredTransportVariableName]);
        Assert.Equal(AppHostEnvironmentDefaults.DefaultDashboardOtlpHttpEndpoint, environment[AppHostEnvironmentDefaults.DashboardOtlpHttpEndpointVariableName]);

        string? GetEnvironmentVariable(string name) => environment.GetValueOrDefault(name);

        void SetEnvironmentVariable(string name, string value) => environment[name] = value;
    }

    [Fact]
    public void Apply_PreservesExplicitDashboardConfiguration()
    {
        var environment = new Dictionary<string, string?>
        {
            [AppHostEnvironmentDefaults.AspNetCoreUrlsVariableName] = "http://localhost:17000",
            [AppHostEnvironmentDefaults.AllowUnsecuredTransportVariableName] = "false",
            [AppHostEnvironmentDefaults.DashboardOtlpEndpointVariableName] = "http://localhost:4317"
        };

        AppHostEnvironmentDefaults.Apply(GetEnvironmentVariable, SetEnvironmentVariable);

        Assert.Equal("http://localhost:17000", environment[AppHostEnvironmentDefaults.AspNetCoreUrlsVariableName]);
        Assert.Equal("false", environment[AppHostEnvironmentDefaults.AllowUnsecuredTransportVariableName]);
        Assert.Equal("http://localhost:4317", environment[AppHostEnvironmentDefaults.DashboardOtlpEndpointVariableName]);
        Assert.False(environment.ContainsKey(AppHostEnvironmentDefaults.DashboardOtlpHttpEndpointVariableName));

        string? GetEnvironmentVariable(string name) => environment.GetValueOrDefault(name);

        void SetEnvironmentVariable(string name, string value) => environment[name] = value;
    }
}