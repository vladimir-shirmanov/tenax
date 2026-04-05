using Microsoft.AspNetCore.Authorization.Policy;
using Microsoft.AspNetCore.Authorization;
using Tenax.Application;
using Tenax.Infrastructure;
using Tenax.Infrastructure.Persistence;
using Tenax.ServiceDefaults;
using Tenax.Web.Authentication;
using Tenax.Web.Errors;
using Tenax.Web.Features.Decks;
using Tenax.Web.Features.Flashcards;
using Tenax.Web.Telemetry;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddTenaxServiceDefaults();
builder.Services.AddApplication();
builder.AddInfrastructure();
builder.Services.AddJwtBearerAuthentication(builder.Configuration);
builder.Services.AddAuthorization();
builder.Services.AddSingleton<IAuthorizationMiddlewareResultHandler, AuthorizationEnvelopeResultHandler>();
builder.Services.AddTelemetryProxy();
builder.Services.AddOpenApi();

var app = builder.Build();

await app.Services.ApplyMigrationsAsync(app.Environment.EnvironmentName);

if (app.Environment.IsDevelopment())
{
	app.MapOpenApi();
}

app.MapTenaxDefaultEndpoints();

app.UseAuthentication();
app.UseAuthorization();

app.MapDecksEndpoints();
app.MapFlashcardsEndpoints();
app.MapTelemetryProxyEndpoint();
app.MapGet("/", () => "Tenax API");

app.Run();

public partial class Program;
