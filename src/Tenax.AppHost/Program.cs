using Microsoft.Extensions.Hosting;
using Tenax.AppHost;

AppHostEnvironmentDefaults.ApplyProcessDefaults();

const int webApiHttpPort = 5062;
const int frontendHttpPort = 5173;
const string webApiBaseUrl = "http://localhost:5062";
const string frontendBaseUrl = "http://localhost:5173";

var builder = DistributedApplication.CreateBuilder(args);
var isDevelopment = builder.Environment.IsDevelopment();

var postgres = builder.AddPostgres("postgres");
var tenaxDatabase = postgres.AddDatabase("Tenax", "tenax");

var web = builder.AddProject<Projects.Tenax_Web>("tenax-web")
    .WithEndpoint("http", endpoint => endpoint.Port = webApiHttpPort)
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
        .WithEndpoint("http", endpoint =>
        {
            endpoint.Port = frontendHttpPort;
            endpoint.TargetPort = frontendHttpPort;
            endpoint.IsProxied = false;
        })
        .WithReference(web)
        .WaitFor(web);

    if (isDevelopment)
    {
        frontend.WithEnvironment("PORT", frontendHttpPort.ToString());
        frontend.WithEnvironment("HOST", "127.0.0.1");
        frontend.WithEnvironment("TENAX_FRONTEND_HOST", "127.0.0.1");
        frontend.WithEnvironment("TENAX_FRONTEND_PORT", frontendHttpPort.ToString());
        frontend.WithEnvironment(FrontendAuthEnvironment.FrontendOriginVariableName, frontendBaseUrl);
        frontend.WithEnvironment(FrontendAuthEnvironment.RedirectUriVariableName, $"{frontendBaseUrl}/");
        frontend.WithEnvironment(FrontendAuthEnvironment.PostLogoutRedirectUriVariableName, $"{frontendBaseUrl}/");
        frontend.WithEnvironment("TENAX_API_PROXY_TARGET", webApiBaseUrl);

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
