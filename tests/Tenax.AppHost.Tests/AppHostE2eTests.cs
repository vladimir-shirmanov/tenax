using Aspire.Hosting.Testing;

namespace Tenax.AppHost.Tests;

public class AppHostE2eTests
{
    private const string SkipFrontendVariable = "TENAX_APPHOST_SKIP_FRONTEND";
    private static readonly TimeSpan HealthCheckTimeout = TimeSpan.FromSeconds(90);
    private static readonly TimeSpan HealthCheckRetryDelay = TimeSpan.FromSeconds(2);

    [Fact]
    public async Task AppHost_Health_And_Ready_Endpoints_ReturnSuccess()
    {
        var originalValue = Environment.GetEnvironmentVariable(SkipFrontendVariable);
        Environment.SetEnvironmentVariable(SkipFrontendVariable, "true");

        try
        {
            await using var appHostBuilder = await DistributedApplicationTestingBuilder.CreateAsync<Projects.Tenax_AppHost>();
            await using var app = await appHostBuilder.BuildAsync();

            await app.StartAsync();

            using var webClient = app.CreateHttpClient("tenax-web");
            webClient.Timeout = TimeSpan.FromSeconds(10);

            using var healthResponse = await GetWithRetryAsync(webClient, "/health", HealthCheckTimeout);
            using var readyResponse = await GetWithRetryAsync(webClient, "/health/ready", HealthCheckTimeout);

            Assert.True(healthResponse.IsSuccessStatusCode, "GET /health should return a success status code.");
            Assert.True(readyResponse.IsSuccessStatusCode, "GET /health/ready should return a success status code.");
        }
        finally
        {
            Environment.SetEnvironmentVariable(SkipFrontendVariable, originalValue);
        }
    }

    private static async Task<HttpResponseMessage> GetWithRetryAsync(HttpClient client, string path, TimeSpan timeout)
    {
        var deadline = DateTime.UtcNow + timeout;
        Exception? lastException = null;

        while (DateTime.UtcNow < deadline)
        {
            try
            {
                var response = await client.GetAsync(path);
                if (response.IsSuccessStatusCode)
                {
                    return response;
                }

                response.Dispose();
            }
            catch (HttpRequestException exception)
            {
                lastException = exception;
            }
            catch (TaskCanceledException exception)
            {
                lastException = exception;
            }

            await Task.Delay(HealthCheckRetryDelay);
        }

        throw new TimeoutException($"Timed out waiting for a successful response from '{path}'.", lastException);
    }
}
