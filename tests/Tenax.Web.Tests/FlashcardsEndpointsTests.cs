using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Tenax.Application.Flashcards;
using Xunit;

namespace Tenax.Web.Tests;

public sealed class FlashcardsEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public FlashcardsEndpointsTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Health_ShouldReturn200()
    {
        var response = await _client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task HealthReady_ShouldReturn200_WhenDependenciesAreAvailable()
    {
        var response = await _client.GetAsync("/health/ready");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Create_ShouldReturn201_AndAuditableMetadata()
    {
        var payload = new
        {
            term = "hola",
            definition = "hello",
            imageUrl = "https://cdn.tenax.dev/media/flashcards/fc_1.png"
        };

        var response = await _client.PostAsJsonAsync("/api/decks/deck_owned/flashcards", payload);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("deck_owned", body.GetProperty("deckId").GetString());
        Assert.Equal("hola", body.GetProperty("term").GetString());
        Assert.True(body.TryGetProperty("createdAtUtc", out _));
        Assert.True(body.TryGetProperty("updatedAtUtc", out _));
        Assert.True(body.TryGetProperty("createdByUserId", out _));
        Assert.True(body.TryGetProperty("updatedByUserId", out _));
    }

    [Fact]
    public async Task List_ShouldReturn200_WithPaginationShape()
    {
        await CreateFlashcardAsync("deck_owned", "hola", "hello");

        var response = await _client.GetAsync("/api/decks/deck_owned/flashcards?page=1&pageSize=50");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.TryGetProperty("items", out var items));
        Assert.True(items.GetArrayLength() >= 1);
        Assert.Equal(1, body.GetProperty("page").GetInt32());
        Assert.Equal(50, body.GetProperty("pageSize").GetInt32());
    }

    [Fact]
    public async Task GetDetail_ShouldReturn200_WithFullFlashcard()
    {
        var created = await CreateFlashcardAsync("deck_owned", "adios", "goodbye");
        var flashcardId = created.GetProperty("id").GetString();

        var response = await _client.GetAsync($"/api/decks/deck_owned/flashcards/{flashcardId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(flashcardId, body.GetProperty("id").GetString());
        Assert.Equal("adios", body.GetProperty("term").GetString());
        Assert.Equal("goodbye", body.GetProperty("definition").GetString());
    }

    [Fact]
    public async Task GetDetail_MissingFlashcard_ShouldReturn404NotFoundEnvelope()
    {
        var response = await _client.GetAsync("/api/decks/deck_owned/flashcards/fc_missing");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("not_found", body.GetProperty("code").GetString());
        Assert.Equal("Flashcard not found", body.GetProperty("message").GetString());
    }

    [Fact]
    public async Task Update_ShouldReturn200_AndUpdatedPayload()
    {
        var created = await CreateFlashcardAsync("deck_owned", "bonjour", "hello");
        var flashcardId = created.GetProperty("id").GetString();

        var payload = new
        {
            term = "bonjour",
            definition = "hello (formal)",
            imageUrl = (string?)null
        };

        var response = await _client.PutAsJsonAsync($"/api/decks/deck_owned/flashcards/{flashcardId}", payload);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("hello (formal)", body.GetProperty("definition").GetString());
        Assert.True(body.TryGetProperty("updatedAtUtc", out _));
    }

    [Fact]
    public async Task Update_WithMissingDefinition_ShouldReturn400ValidationEnvelope()
    {
        var created = await CreateFlashcardAsync("deck_owned", "bonjour", "hello");
        var flashcardId = created.GetProperty("id").GetString();

        var payload = new
        {
            term = "bonjour",
            definition = string.Empty,
            imageUrl = (string?)null
        };

        var response = await _client.PutAsJsonAsync($"/api/decks/deck_owned/flashcards/{flashcardId}", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("validation_error", body.GetProperty("code").GetString());
        Assert.True(body.TryGetProperty("errors", out var errors));
        Assert.True(errors.TryGetProperty("definition", out _));
    }

    [Fact]
    public async Task Update_MissingFlashcard_ShouldReturn404NotFoundEnvelope()
    {
        var payload = new
        {
            term = "bonjour",
            definition = "hello",
            imageUrl = (string?)null
        };

        var response = await _client.PutAsJsonAsync("/api/decks/deck_owned/flashcards/fc_missing", payload);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("not_found", body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Delete_ShouldReturn200_WithDeletedEnvelope()
    {
        var created = await CreateFlashcardAsync("deck_owned", "ciao", "hi");
        var flashcardId = created.GetProperty("id").GetString();

        var response = await _client.DeleteAsync($"/api/decks/deck_owned/flashcards/{flashcardId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("deleted").GetBoolean());
        Assert.Equal("deck_owned", body.GetProperty("deckId").GetString());
    }

    [Fact]
    public async Task Delete_MissingFlashcard_ShouldReturn404NotFoundEnvelope()
    {
        var response = await _client.DeleteAsync("/api/decks/deck_owned/flashcards/fc_missing");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("not_found", body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Create_WithMissingFields_ShouldReturnValidationEnvelope()
    {
        var payload = new
        {
            term = "",
            definition = ""
        };

        var response = await _client.PostAsJsonAsync("/api/decks/deck_owned/flashcards", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("validation_error", body.GetProperty("code").GetString());
        Assert.True(body.TryGetProperty("errors", out var errors));
        Assert.True(errors.TryGetProperty("term", out _));
        Assert.True(errors.TryGetProperty("definition", out _));
    }

    [Fact]
    public async Task Create_MissingDeck_ShouldReturn404DeckNotFoundEnvelope()
    {
        var payload = new
        {
            term = "hallo",
            definition = "hello"
        };

        var response = await _client.PostAsJsonAsync("/api/decks/deck_missing/flashcards", payload);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("deck_not_found", body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Unauthorized_Request_ShouldReturn401Envelope()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/decks/deck_owned/flashcards");
        request.Headers.Add("X-Test-Auth", "off");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("unauthorized", body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Forbidden_Request_ShouldReturn403Envelope()
    {
        var response = await _client.GetAsync("/api/decks/deck_forbidden/flashcards");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("forbidden", body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task List_InvalidPage_ShouldReturn400ValidationEnvelope()
    {
        var response = await _client.GetAsync("/api/decks/deck_owned/flashcards?page=0&pageSize=50");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("validation_error", body.GetProperty("code").GetString());
        Assert.True(body.TryGetProperty("errors", out var errors));
        Assert.True(errors.TryGetProperty("page", out _));
    }

    [Fact]
    public async Task List_InvalidPageSize_ShouldReturn400ValidationEnvelope()
    {
        var response = await _client.GetAsync("/api/decks/deck_owned/flashcards?page=1&pageSize=101");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("validation_error", body.GetProperty("code").GetString());
        Assert.True(body.TryGetProperty("errors", out var errors));
        Assert.True(errors.TryGetProperty("pageSize", out _));
    }

    [Fact]
    public async Task MissingDeck_ShouldReturn404Envelope()
    {
        var response = await _client.GetAsync("/api/decks/deck_missing/flashcards");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("deck_not_found", body.GetProperty("code").GetString());
    }

    private async Task<JsonElement> CreateFlashcardAsync(string deckId, string term, string definition)
    {
        var payload = new
        {
            term,
            definition,
            imageUrl = (string?)null
        };

        var response = await _client.PostAsJsonAsync($"/api/decks/{deckId}/flashcards", payload);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    [Fact]
    public async Task Update_WhenServiceReturnsConcurrencyConflict_ShouldReturn409Envelope()
    {
        var client = CreateClientWithServiceFailure(new FlashcardFailure(
            FlashcardErrorCodes.ConcurrencyConflict,
            "Flashcard was modified by another operation. Reload and retry."));

        var response = await client.PutAsJsonAsync("/api/decks/deck_owned/flashcards/fc_123", new
        {
            term = "hola",
            definition = "hello",
            imageUrl = (string?)null
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("concurrency_conflict", body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task List_WhenServiceReturnsPersistenceUnavailable_ShouldReturn503Envelope()
    {
        var client = CreateClientWithServiceFailure(new FlashcardFailure(
            FlashcardErrorCodes.PersistenceUnavailable,
            "Persistence service is temporarily unavailable"));

        var response = await client.GetAsync("/api/decks/deck_owned/flashcards");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("persistence_unavailable", body.GetProperty("code").GetString());
    }

    private HttpClient CreateClientWithServiceFailure(FlashcardFailure failure)
    {
        var app = _factory
            .WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    services.RemoveAll<IFlashcardService>();
                    services.AddScoped<IFlashcardService>(_ => new FailingFlashcardService(failure));
                });
            });

        return app.CreateClient();
    }

    private sealed class FailingFlashcardService : IFlashcardService
    {
        private readonly FlashcardFailure _failure;

        public FailingFlashcardService(FlashcardFailure failure)
        {
            _failure = failure;
        }

        public Task<FlashcardResult<FlashcardDto>> CreateAsync(CreateFlashcardInput input, CancellationToken cancellationToken)
        {
            return Task.FromResult(FlashcardResult<FlashcardDto>.Failed(_failure));
        }

        public Task<FlashcardResult<FlashcardListDto>> ListAsync(ListFlashcardsInput input, CancellationToken cancellationToken)
        {
            return Task.FromResult(FlashcardResult<FlashcardListDto>.Failed(_failure));
        }

        public Task<FlashcardResult<FlashcardDto>> GetDetailAsync(GetFlashcardDetailInput input, CancellationToken cancellationToken)
        {
            return Task.FromResult(FlashcardResult<FlashcardDto>.Failed(_failure));
        }

        public Task<FlashcardResult<FlashcardDto>> UpdateAsync(UpdateFlashcardInput input, CancellationToken cancellationToken)
        {
            return Task.FromResult(FlashcardResult<FlashcardDto>.Failed(_failure));
        }

        public Task<FlashcardResult<DeleteFlashcardDto>> DeleteAsync(DeleteFlashcardInput input, CancellationToken cancellationToken)
        {
            return Task.FromResult(FlashcardResult<DeleteFlashcardDto>.Failed(_failure));
        }
    }
}
