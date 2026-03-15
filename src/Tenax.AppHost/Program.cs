using Tenax.AppHost;

AppHostEnvironmentDefaults.ApplyProcessDefaults();

var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres");
var tenaxDatabase = postgres.AddDatabase("Tenax", "tenax");

var web = builder.AddProject<Projects.Tenax_Web>("tenax-web")
    .WithReference(tenaxDatabase)
    .WaitFor(tenaxDatabase);

var skipFrontend = IsEnabled(Environment.GetEnvironmentVariable("TENAX_APPHOST_SKIP_FRONTEND"));

if (!skipFrontend)
{
    builder.AddViteApp("tenax-frontend", "../Tenax.Web/frontend", "dev")
        .WithReference(web)
        .WaitFor(web);
}

builder.Build().Run();

static bool IsEnabled(string? value)
{
    return string.Equals(value, "true", StringComparison.OrdinalIgnoreCase)
        || string.Equals(value, "1", StringComparison.Ordinal);
}
