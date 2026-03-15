namespace Tenax.AppHost;

internal static class FrontendAuthEnvironment
{
    internal const string AuthorityVariableName = "VITE_TENAX_AUTH_AUTHORITY";
    internal const string ClientIdVariableName = "VITE_TENAX_AUTH_CLIENT_ID";
    internal const string RedirectUriVariableName = "VITE_TENAX_AUTH_REDIRECT_URI";
    internal const string PostLogoutRedirectUriVariableName = "VITE_TENAX_AUTH_POST_LOGOUT_REDIRECT_URI";
    internal const string AudienceVariableName = "VITE_TENAX_AUTH_AUDIENCE";
    internal const string DefaultDeckIdVariableName = "VITE_TENAX_AUTH_DEFAULT_DECK_ID";
    internal const string ScopeVariableName = "VITE_TENAX_AUTH_SCOPE";

    internal const string DevelopmentAuthority = "http://localhost:8080/realms/tenax";
    internal const string DevelopmentAudience = "tenax-web-api";
    internal const string DevelopmentClientId = "tenax-spa";
    internal const string DevelopmentRedirectUri = "http://127.0.0.1:5173/";
    internal const string DevelopmentDefaultDeckId = "default";
    internal const string DevelopmentScope = "openid profile email";

    internal static IReadOnlyDictionary<string, string> GetDevelopmentViteEnvironment(Func<string, string?> getEnvironmentVariable)
    {
        ArgumentNullException.ThrowIfNull(getEnvironmentVariable);

        var redirectUri = GetNonEmptyValue(getEnvironmentVariable, RedirectUriVariableName) ?? DevelopmentRedirectUri;

        return new Dictionary<string, string>
        {
            [AuthorityVariableName] = GetNonEmptyValue(getEnvironmentVariable, AuthorityVariableName) ?? DevelopmentAuthority,
            [ClientIdVariableName] = GetNonEmptyValue(getEnvironmentVariable, ClientIdVariableName) ?? DevelopmentClientId,
            [RedirectUriVariableName] = redirectUri,
            [PostLogoutRedirectUriVariableName] = GetNonEmptyValue(getEnvironmentVariable, PostLogoutRedirectUriVariableName) ?? redirectUri,
            [AudienceVariableName] = GetNonEmptyValue(getEnvironmentVariable, AudienceVariableName) ?? DevelopmentAudience,
            [DefaultDeckIdVariableName] = GetNonEmptyValue(getEnvironmentVariable, DefaultDeckIdVariableName) ?? DevelopmentDefaultDeckId,
            [ScopeVariableName] = GetNonEmptyValue(getEnvironmentVariable, ScopeVariableName) ?? DevelopmentScope
        };
    }

    private static string? GetNonEmptyValue(Func<string, string?> getEnvironmentVariable, string variableName)
    {
        var value = getEnvironmentVariable(variableName);
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}