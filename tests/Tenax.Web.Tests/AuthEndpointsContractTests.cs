using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Tenax.Web.Authentication;

namespace Tenax.Web.Tests;

public sealed class AuthEndpointsContractTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public AuthEndpointsContractTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task OutOfScope_AuthFlowEndpoints_ShouldReturn404()
    {
        using var client = _factory.CreateClient();

        var sessionResponse = await client.GetAsync("/api/auth/session");
        Assert.Equal(HttpStatusCode.NotFound, sessionResponse.StatusCode);

        var loginStartResponse = await client.PostAsJsonAsync("/api/auth/oidc/login/start", new { returnTo = "/" });
        Assert.Equal(HttpStatusCode.NotFound, loginStartResponse.StatusCode);

        var callbackResponse = await client.GetAsync("/api/auth/oidc/callback?code=abc&state=def");
        Assert.Equal(HttpStatusCode.NotFound, callbackResponse.StatusCode);

        var logoutResponse = await client.PostAsJsonAsync("/api/auth/logout", new { });
        Assert.Equal(HttpStatusCode.NotFound, logoutResponse.StatusCode);
    }

    [Fact]
    public void AddJwtBearerAuthentication_ShouldConfigureAuthorityAudienceAndValidation()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Authentication:JwtBearer:Authority"] = "http://localhost:8080/realms/tenax",
                ["Authentication:JwtBearer:Audience"] = "tenax-web-api",
                ["Authentication:JwtBearer:RequireHttpsMetadata"] = "false"
            })
            .Build();

        var services = new ServiceCollection();
        services.AddJwtBearerAuthentication(configuration);

        using var provider = services.BuildServiceProvider();
        var options = provider.GetRequiredService<IOptionsMonitor<JwtBearerOptions>>().Get(JwtBearerDefaults.AuthenticationScheme);

        Assert.Equal("http://localhost:8080/realms/tenax", options.Authority);
        Assert.Equal("tenax-web-api", options.Audience);
        Assert.False(options.RequireHttpsMetadata);
        Assert.True(options.TokenValidationParameters.ValidateIssuer);
        Assert.True(options.TokenValidationParameters.ValidateAudience);
        Assert.True(options.TokenValidationParameters.ValidateLifetime);
        Assert.True(options.TokenValidationParameters.ValidateIssuerSigningKey);
    }

    [Fact]
    public void AddJwtBearerAuthentication_ShouldThrow_WhenAuthorityMissing()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Authentication:JwtBearer:Audience"] = "tenax-web-api"
            })
            .Build();

        var services = new ServiceCollection();

        var exception = Assert.Throws<InvalidOperationException>(() => services.AddJwtBearerAuthentication(configuration));
        Assert.Contains("Authentication:JwtBearer:Authority", exception.Message);
    }

    [Fact]
    public void AddJwtBearerAuthentication_ShouldThrow_WhenAudienceMissing()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Authentication:JwtBearer:Authority"] = "http://localhost:8080/realms/tenax"
            })
            .Build();

        var services = new ServiceCollection();

        var exception = Assert.Throws<InvalidOperationException>(() => services.AddJwtBearerAuthentication(configuration));
        Assert.Contains("Authentication:JwtBearer:Audience", exception.Message);
    }

    [Fact]
    public async Task ProtectedEndpoint_ShouldReturn401Envelope_WhenAuthenticationIsMissing()
    {
        using var client = _factory.CreateClient();

        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/decks/deck_owned/flashcards");
        request.Headers.Add("X-Test-Auth", "off");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        Assert.Equal("unauthorized", body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task ProtectedEndpoint_ShouldReturn403Envelope_WhenAuthorizationFails()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/decks/deck_forbidden/flashcards");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        Assert.Equal("forbidden", body.GetProperty("code").GetString());
    }
}
