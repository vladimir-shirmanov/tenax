using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Tenax.Application.Decks;

namespace Tenax.Web.Tests;

public sealed class DecksEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public DecksEndpointsTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Create_ShouldReturn201_WithAuditableFields()
    {
        var response = await _client.PostAsJsonAsync("/api/decks", new
        {
            name = "Spanish Basics",
            description = "Everyday greetings"
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Spanish Basics", body.GetProperty("name").GetString());
        Assert.True(body.TryGetProperty("createdAtUtc", out _));
        Assert.True(body.TryGetProperty("updatedAtUtc", out _));
        Assert.Equal("usr_42", body.GetProperty("createdByUserId").GetString());
        Assert.Equal("usr_42", body.GetProperty("updatedByUserId").GetString());
    }

    [Fact]
    public async Task List_ShouldReturn200_WithPaginationShape()
    {
        await _client.PostAsJsonAsync("/api/decks", new { name = "Spanish Basics", description = "A1" });

        var response = await _client.GetAsync("/api/decks?page=1&pageSize=20");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, body.GetProperty("page").GetInt32());
        Assert.Equal(20, body.GetProperty("pageSize").GetInt32());
        Assert.True(body.GetProperty("totalCount").GetInt32() >= 1);
        Assert.True(body.GetProperty("items").GetArrayLength() >= 1);
    }

    [Fact]
    public async Task GetDetail_ShouldReturn404_WhenDeckMissing()
    {
        var response = await _client.GetAsync("/api/decks/deck_missing");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("deck_not_found", body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Update_ShouldReturn400_WhenNameInvalid()
    {
        var response = await _client.PutAsJsonAsync("/api/decks/deck_owned", new
        {
            name = "",
            description = "desc"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("validation_error", body.GetProperty("code").GetString());
        Assert.True(body.GetProperty("errors").TryGetProperty("name", out _));
    }

    [Fact]
    public async Task Delete_ShouldReturn200_WithDeleteEnvelope()
    {
        var create = await _client.PostAsJsonAsync("/api/decks", new { name = "German A1", description = "desc" });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var deckId = created.GetProperty("id").GetString();

        var response = await _client.DeleteAsync($"/api/decks/{deckId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("deleted").GetBoolean());
        Assert.Equal(deckId, body.GetProperty("id").GetString());
    }

    [Fact]
    public async Task Unauthorized_Request_ShouldReturn401Envelope()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/decks");
        request.Headers.Add("X-Test-Auth", "off");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("unauthorized", body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Forbidden_Request_ShouldReturn403Envelope()
    {
        var response = await _client.GetAsync("/api/decks/deck_forbidden");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("forbidden", body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Update_WhenServiceReturnsConcurrencyConflict_ShouldReturn409Envelope()
    {
        var client = CreateClientWithServiceFailure(new DeckFailure(
            DeckErrorCodes.ConcurrencyConflict,
            "Deck was modified by another operation. Reload and retry."));

        var response = await client.PutAsJsonAsync("/api/decks/deck_owned", new
        {
            name = "Spanish Basics",
            description = "desc"
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("concurrency_conflict", body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task List_WhenServiceReturnsPersistenceUnavailable_ShouldReturn503Envelope()
    {
        var client = CreateClientWithServiceFailure(new DeckFailure(
            DeckErrorCodes.PersistenceUnavailable,
            "Persistence service is temporarily unavailable"));

        var response = await client.GetAsync("/api/decks");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("persistence_unavailable", body.GetProperty("code").GetString());
    }

    private HttpClient CreateClientWithServiceFailure(DeckFailure failure)
    {
        var app = _factory
            .WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    services.RemoveAll<IDeckService>();
                    services.AddScoped<IDeckService>(_ => new FailingDeckService(failure));
                });
            });

        return app.CreateClient();
    }

    private sealed class FailingDeckService : IDeckService
    {
        private readonly DeckFailure _failure;

        public FailingDeckService(DeckFailure failure)
        {
            _failure = failure;
        }

        public Task<DeckResult<DeckDto>> CreateAsync(CreateDeckInput input, CancellationToken cancellationToken)
        {
            return Task.FromResult(DeckResult<DeckDto>.Failed(_failure));
        }

        public Task<DeckResult<DeckListDto>> ListAsync(ListDecksInput input, CancellationToken cancellationToken)
        {
            return Task.FromResult(DeckResult<DeckListDto>.Failed(_failure));
        }

        public Task<DeckResult<DeckDto>> GetDetailAsync(GetDeckDetailInput input, CancellationToken cancellationToken)
        {
            return Task.FromResult(DeckResult<DeckDto>.Failed(_failure));
        }

        public Task<DeckResult<DeckDto>> UpdateAsync(UpdateDeckInput input, CancellationToken cancellationToken)
        {
            return Task.FromResult(DeckResult<DeckDto>.Failed(_failure));
        }

        public Task<DeckResult<DeleteDeckDto>> DeleteAsync(DeleteDeckInput input, CancellationToken cancellationToken)
        {
            return Task.FromResult(DeckResult<DeleteDeckDto>.Failed(_failure));
        }
    }
}
