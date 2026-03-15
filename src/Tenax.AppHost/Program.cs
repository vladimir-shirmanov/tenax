using Tenax.AppHost;

AppHostEnvironmentDefaults.ApplyProcessDefaults();

var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres");
var tenaxDatabase = postgres.AddDatabase("Tenax", "tenax");

var web = builder.AddProject<Projects.Tenax_Web>("tenax-web")
    .WithReference(tenaxDatabase)
    .WaitFor(tenaxDatabase);

builder.AddViteApp("tenax-frontend", "../Tenax.Web/frontend", "dev")
    .WithReference(web)
    .WaitFor(web);

builder.Build().Run();
