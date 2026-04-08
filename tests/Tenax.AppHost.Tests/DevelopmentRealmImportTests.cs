using System.Text.Json.Nodes;

namespace Tenax.AppHost.Tests;

public class DevelopmentRealmImportTests
{
    private static readonly string[] ExpectedRedirectUris =
    [
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5173/*",
        "http://localhost:5173",
        "http://localhost:5173/*"
    ];

    private static readonly string[] ExpectedWebOrigins =
    [
        "http://127.0.0.1:5173",
        "http://localhost:5173"
    ];

    [Fact]
    public void RealmImport_DefinesPublicSpaClientAlignedWithProjectedFrontendDefaults()
    {
        var realm = JsonNode.Parse(File.ReadAllText(GetRealmImportPath()))!.AsObject();
        var spaClient = GetClient(realm, FrontendAuthEnvironment.DevelopmentClientId);

        Assert.True(spaClient["enabled"]!.GetValue<bool>());
        Assert.True(spaClient["publicClient"]!.GetValue<bool>());
        Assert.False(spaClient["bearerOnly"]!.GetValue<bool>());
        Assert.True(spaClient["standardFlowEnabled"]!.GetValue<bool>());
        Assert.False(spaClient["implicitFlowEnabled"]!.GetValue<bool>());
        Assert.False(spaClient["directAccessGrantsEnabled"]!.GetValue<bool>());
        Assert.False(spaClient["serviceAccountsEnabled"]!.GetValue<bool>());

        var redirectUris = GetStringArray(spaClient, "redirectUris");
        var webOrigins = GetStringArray(spaClient, "webOrigins");
        var attributes = spaClient["attributes"]!.AsObject();
        var audienceMapper = GetProtocolMapper(spaClient, "audience-tenax-web-api");

        Assert.Equal(ExpectedRedirectUris, redirectUris);
        Assert.Equal(ExpectedWebOrigins, webOrigins);

        Assert.Equal("S256", attributes["pkce.code.challenge.method"]!.GetValue<string>());
        Assert.Equal("http://127.0.0.1:5173/*##http://localhost:5173/*", attributes["post.logout.redirect.uris"]!.GetValue<string>());

        Assert.Equal("oidc-audience-mapper", audienceMapper["protocolMapper"]!.GetValue<string>());

        var mapperConfig = audienceMapper["config"]!.AsObject();

        Assert.Equal(FrontendAuthEnvironment.DevelopmentAudience, mapperConfig["included.client.audience"]!.GetValue<string>());
        Assert.Equal("true", mapperConfig["access.token.claim"]!.GetValue<string>());
        Assert.Equal("false", mapperConfig["id.token.claim"]!.GetValue<string>());
    }

    private static JsonObject GetClient(JsonObject realm, string clientId)
    {
        return realm["clients"]!
            .AsArray()
            .Select(node => node!.AsObject())
            .Single(client => string.Equals(client["clientId"]!.GetValue<string>(), clientId, StringComparison.Ordinal));
    }

    private static JsonObject GetProtocolMapper(JsonObject client, string mapperName)
    {
        return client["protocolMappers"]!
            .AsArray()
            .Select(node => node!.AsObject())
            .Single(mapper => string.Equals(mapper["name"]!.GetValue<string>(), mapperName, StringComparison.Ordinal));
    }

    private static string[] GetStringArray(JsonObject node, string propertyName)
    {
        return node[propertyName]!
            .AsArray()
            .Select(item => item!.GetValue<string>())
            .ToArray();
    }

    private static string GetRealmImportPath()
    {
        return Path.GetFullPath(Path.Combine(
            AppContext.BaseDirectory,
            "..",
            "..",
            "..",
            "..",
            "..",
            "src",
            "Tenax.AppHost",
            "keycloak",
            "import",
            "tenax-realm-dev.json"));
    }
}