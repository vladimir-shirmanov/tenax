using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

namespace Tenax.Web.Tests;

public sealed class TelemetryProxyEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public TelemetryProxyEndpointsTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task PostTraces_WithoutAuthentication_ShouldReturn401Envelope()
    {
        using var client = _factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/telemetry/traces")
        {
            Content = new ByteArrayContent([0x0A, 0x01, 0x02])
        };
        request.Content.Headers.ContentType = new("application/x-protobuf");
        request.Headers.Add("X-Test-Auth", "off");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("unauthorized", body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task PostTraces_WithAuthentication_ShouldProxyPayloadAndReturn204()
    {
        var handler = new CapturingHandler((_, _) => new HttpResponseMessage(HttpStatusCode.Accepted));

        using var client = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                services.AddHttpClient("TelemetryOtlpProxy")
                    .ConfigurePrimaryHttpMessageHandler(() => handler)
                    .ConfigureHttpClient(httpClient => httpClient.BaseAddress = new Uri("http://otel-collector:4318"));
            });
        }).CreateClient();

        var payload = Encoding.UTF8.GetBytes("{\"resourceSpans\":[]}");
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/telemetry/traces")
        {
            Content = new ByteArrayContent(payload)
        };
        request.Content.Headers.ContentType = new("application/json");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal("/v1/traces", handler.LastRequestPath);
        Assert.Equal("application/json", handler.LastRequestContentType);
        Assert.Equal(payload, handler.LastRequestBody);
    }

    [Fact]
    public async Task PostTraces_WhenUpstreamFails_ShouldReturn502Envelope()
    {
        var handler = new CapturingHandler((_, _) => new HttpResponseMessage(HttpStatusCode.InternalServerError));

        using var client = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                services.AddHttpClient("TelemetryOtlpProxy")
                    .ConfigurePrimaryHttpMessageHandler(() => handler)
                    .ConfigureHttpClient(httpClient => httpClient.BaseAddress = new Uri("http://otel-collector:4318/v1/traces"));
            });
        }).CreateClient();

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/telemetry/traces")
        {
            Content = new ByteArrayContent([0x0A, 0x01, 0x02])
        };
        request.Content.Headers.ContentType = new("application/x-protobuf");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("otlp_upstream_unavailable", body.GetProperty("code").GetString());
        Assert.Equal("/v1/traces", handler.LastRequestPath);
    }

    [Fact]
    public async Task PostTraces_WhenBaseAddressAlreadyPointsToTracesWithTrailingSlash_ShouldNormalizePath()
    {
        var handler = new CapturingHandler((_, _) => new HttpResponseMessage(HttpStatusCode.Accepted));

        using var client = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                services.AddHttpClient("TelemetryOtlpProxy")
                    .ConfigurePrimaryHttpMessageHandler(() => handler)
                    .ConfigureHttpClient(httpClient => httpClient.BaseAddress = new Uri("http://otel-collector:4318/v1/traces/"));
            });
        }).CreateClient();

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/telemetry/traces")
        {
            Content = new ByteArrayContent([0x0A, 0x01, 0x02])
        };
        request.Content.Headers.ContentType = new("application/x-protobuf");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal("/v1/traces", handler.LastRequestPath);
    }

    private sealed class CapturingHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, CancellationToken, HttpResponseMessage> _responseFactory;

        public CapturingHandler(Func<HttpRequestMessage, CancellationToken, HttpResponseMessage> responseFactory)
        {
            _responseFactory = responseFactory;
        }

        public string? LastRequestPath { get; private set; }
        public string? LastRequestContentType { get; private set; }
        public byte[]? LastRequestBody { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastRequestPath = request.RequestUri?.AbsolutePath;
            LastRequestContentType = request.Content?.Headers.ContentType?.MediaType;
            // Capture bytes synchronously before returning to prevent ObjectDisposedException:
            // HttpClient may dispose ByteArrayContent after the handler's Task completes;
            // an async overload can yield back to the caller before the bytes are read.
            LastRequestBody = request.Content is null
                ? []
                : request.Content.ReadAsByteArrayAsync(cancellationToken).GetAwaiter().GetResult();

            return Task.FromResult(_responseFactory(request, cancellationToken));
        }
    }
}
