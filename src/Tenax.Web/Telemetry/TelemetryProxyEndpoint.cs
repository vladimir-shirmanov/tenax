using Tenax.Web.Errors;

namespace Tenax.Web.Telemetry;

public static class TelemetryProxyEndpoint
{
    private const string TelemetryProxyClientName = "TelemetryOtlpProxy";
    private const string OtlpUnavailableCode = "otlp_upstream_unavailable";
    private const string OtlpUnavailableMessage = "Unable to forward telemetry to the OTLP collector";

    public static RouteGroupBuilder MapTelemetryProxyEndpoint(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/telemetry")
            .RequireAuthorization()
            .WithTags("Telemetry");

        group.MapPost("/traces", ProxyTracesAsync)
            .WithName("Telemetry_ProxyTraces")
            .WithSummary("Proxy OTLP traces payload to configured upstream collector")
            .Produces(StatusCodes.Status204NoContent)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status401Unauthorized)
            .Produces<ApiErrorEnvelope>(StatusCodes.Status502BadGateway);

        return group;
    }

    private static async Task<IResult> ProxyTracesAsync(
        HttpRequest request,
        HttpContext context,
        IHttpClientFactory httpClientFactory,
        CancellationToken cancellationToken)
    {
        var client = httpClientFactory.CreateClient(TelemetryProxyClientName);
        var upstreamUri = ResolveTracesUri(client.BaseAddress);
        if (upstreamUri is null)
        {
            return OtlpUnavailable(context);
        }

        var payload = await ReadRequestBodyAsync(request, cancellationToken);
        using var forward = new HttpRequestMessage(HttpMethod.Post, upstreamUri)
        {
            Content = new ByteArrayContent(payload)
        };

        if (!string.IsNullOrWhiteSpace(request.ContentType))
        {
            forward.Content.Headers.TryAddWithoutValidation("Content-Type", request.ContentType);
        }

        try
        {
            using var upstreamResponse = await client.SendAsync(forward, cancellationToken);
            return upstreamResponse.IsSuccessStatusCode
                ? TypedResults.NoContent()
                : OtlpUnavailable(context);
        }
        catch (HttpRequestException)
        {
            return OtlpUnavailable(context);
        }
        catch (TaskCanceledException)
        {
            return OtlpUnavailable(context);
        }
    }

    private static async Task<byte[]> ReadRequestBodyAsync(HttpRequest request, CancellationToken cancellationToken)
    {
        await using var buffer = new MemoryStream();
        await request.Body.CopyToAsync(buffer, cancellationToken);
        return buffer.ToArray();
    }

    private static Uri? ResolveTracesUri(Uri? baseAddress)
    {
        if (baseAddress is null)
        {
            return null;
        }

        var path = baseAddress.AbsolutePath.TrimEnd('/');
        if (path.EndsWith("/v1/traces", StringComparison.OrdinalIgnoreCase))
        {
            return baseAddress;
        }

        return new Uri(baseAddress, "v1/traces");
    }

    private static IResult OtlpUnavailable(HttpContext context)
    {
        return TypedResults.Json(
            new ApiErrorEnvelope(OtlpUnavailableCode, OtlpUnavailableMessage, context.TraceIdentifier),
            statusCode: StatusCodes.Status502BadGateway);
    }
}
