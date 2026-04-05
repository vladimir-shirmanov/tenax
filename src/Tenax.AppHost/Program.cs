using Microsoft.Extensions.Hosting;
using Tenax.AppHost;

AppHostEnvironmentDefaults.ApplyProcessDefaults();

var builder = DistributedApplication.CreateBuilder(args);
var isDevelopment = builder.Environment.IsDevelopment();

var postgres = builder.AddPostgres("postgres");
var tenaxDatabase = postgres.AddDatabase("Tenax", "tenax");

var web = builder.AddProject<Projects.Tenax_Web>("tenax-web")
    .WithReference(tenaxDatabase)
    .WaitFor(tenaxDatabase)
    .WithOtlpExporter()
    .WithEnvironment("OTEL_SERVICE_NAME", "tenax-web");

if (isDevelopment)
{
    var keycloakRealmImportPath = Path.Combine(builder.Environment.ContentRootPath, "keycloak", "import");

    var keycloak = builder.AddKeycloak("keycloak", 8080)
        .WithEnvironment("KC_BOOTSTRAP_ADMIN_USERNAME", "admin")
        .WithEnvironment("KC_BOOTSTRAP_ADMIN_PASSWORD", "admin")
        .WithRealmImport(keycloakRealmImportPath);

    web.WithReference(keycloak)
        .WaitFor(keycloak)
        .WithEnvironment("Authentication__JwtBearer__Authority", FrontendAuthEnvironment.DevelopmentAuthority)
        .WithEnvironment("Authentication__JwtBearer__Audience", FrontendAuthEnvironment.DevelopmentAudience)
        .WithEnvironment("Authentication__JwtBearer__RequireHttpsMetadata", "false");
}

var skipFrontend = IsEnabled(Environment.GetEnvironmentVariable("TENAX_APPHOST_SKIP_FRONTEND"));

if (!skipFrontend)
{
    var frontend = builder.AddViteApp("tenax-frontend", "../Tenax.Web/frontend", "dev")
        .WithReference(web)
        .WaitFor(web);

    if (isDevelopment)
    {
        var frontendHttpEndpoint = frontend.GetEndpoint("http");

        frontend.WithEnvironment(FrontendAuthEnvironment.FrontendOriginVariableName, ReferenceExpression.Create($"{frontendHttpEndpoint}"));
        frontend.WithEnvironment(FrontendAuthEnvironment.RedirectUriVariableName, ReferenceExpression.Create($"{frontendHttpEndpoint}/"));
        frontend.WithEnvironment(FrontendAuthEnvironment.PostLogoutRedirectUriVariableName, ReferenceExpression.Create($"{frontendHttpEndpoint}/"));

        foreach (var environmentVariable in FrontendAuthEnvironment.GetDevelopmentViteEnvironment(Environment.GetEnvironmentVariable))
        {
            frontend.WithEnvironment(environmentVariable.Key, environmentVariable.Value);
        }
    }
}

builder.Build().Run();

static bool IsEnabled(string? value)
{
    return string.Equals(value, "true", StringComparison.OrdinalIgnoreCase)
        || string.Equals(value, "1", StringComparison.Ordinal);
}
