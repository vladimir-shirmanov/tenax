using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization.Policy;
using Microsoft.AspNetCore.Authorization;
using Tenax.Application;
using Tenax.Infrastructure;
using Tenax.Infrastructure.Persistence;
using Tenax.ServiceDefaults;
using Tenax.Web.Authentication;
using Tenax.Web.Errors;
using Tenax.Web.Features.Flashcards;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddTenaxServiceDefaults();
builder.Services.AddApplication();
builder.AddInfrastructure();
builder.Services.AddAuthentication(BearerTokenAuthenticationHandler.SchemeName)
	.AddScheme<AuthenticationSchemeOptions, BearerTokenAuthenticationHandler>(BearerTokenAuthenticationHandler.SchemeName, _ => { });
builder.Services.AddAuthorization();
builder.Services.AddSingleton<IAuthorizationMiddlewareResultHandler, AuthorizationEnvelopeResultHandler>();
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

app.MapFlashcardsEndpoints();
app.MapGet("/", () => "Tenax API");

app.Run();

public partial class Program;
