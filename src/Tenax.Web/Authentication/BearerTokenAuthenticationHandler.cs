namespace Tenax.Web.Authentication;

[Obsolete("Superseded by AddJwtBearerAuthentication. Use JwtBearerDefaults.AuthenticationScheme.")]
public static class BearerTokenAuthenticationHandler
{
    public const string SchemeName = "BearerToken";
}
