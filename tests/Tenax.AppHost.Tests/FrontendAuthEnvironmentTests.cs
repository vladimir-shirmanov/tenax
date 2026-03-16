using Tenax.AppHost;

namespace Tenax.AppHost.Tests;

public class FrontendAuthEnvironmentTests
{
    [Fact]
    public void GetDevelopmentViteEnvironment_ReturnsContractDefinedLocalDefaults()
    {
        var environment = FrontendAuthEnvironment.GetDevelopmentViteEnvironment(_ => null);

        Assert.Equal(FrontendAuthEnvironment.DevelopmentAuthority, environment[FrontendAuthEnvironment.AuthorityVariableName]);
        Assert.Equal(FrontendAuthEnvironment.DevelopmentClientId, environment[FrontendAuthEnvironment.ClientIdVariableName]);
        Assert.False(environment.ContainsKey(FrontendAuthEnvironment.FrontendOriginVariableName));
        Assert.False(environment.ContainsKey(FrontendAuthEnvironment.RedirectUriVariableName));
        Assert.False(environment.ContainsKey(FrontendAuthEnvironment.PostLogoutRedirectUriVariableName));
        Assert.Equal(FrontendAuthEnvironment.DevelopmentAudience, environment[FrontendAuthEnvironment.AudienceVariableName]);
        Assert.Equal(FrontendAuthEnvironment.DevelopmentDefaultDeckId, environment[FrontendAuthEnvironment.DefaultDeckIdVariableName]);
        Assert.Equal(FrontendAuthEnvironment.DevelopmentScope, environment[FrontendAuthEnvironment.ScopeVariableName]);
    }

    [Fact]
    public void GetDevelopmentViteEnvironment_PrefersNonBlankOverrides_And_TrimsValues()
    {
        var values = new Dictionary<string, string?>
        {
            [FrontendAuthEnvironment.AuthorityVariableName] = " http://localhost:18080/realms/custom/ ",
            [FrontendAuthEnvironment.ClientIdVariableName] = " custom-spa ",
            [FrontendAuthEnvironment.FrontendOriginVariableName] = " http://127.0.0.1:19073 ",
            [FrontendAuthEnvironment.RedirectUriVariableName] = " http://127.0.0.1:4173/app ",
            [FrontendAuthEnvironment.PostLogoutRedirectUriVariableName] = " ",
            [FrontendAuthEnvironment.AudienceVariableName] = " custom-api ",
            [FrontendAuthEnvironment.DefaultDeckIdVariableName] = " starter ",
            [FrontendAuthEnvironment.ScopeVariableName] = " openid profile offline_access "
        };

        var environment = FrontendAuthEnvironment.GetDevelopmentViteEnvironment(name => values.GetValueOrDefault(name));

        Assert.Equal("http://localhost:18080/realms/custom/", environment[FrontendAuthEnvironment.AuthorityVariableName]);
        Assert.Equal("custom-spa", environment[FrontendAuthEnvironment.ClientIdVariableName]);
        Assert.Equal("http://127.0.0.1:19073", environment[FrontendAuthEnvironment.FrontendOriginVariableName]);
        Assert.Equal("http://127.0.0.1:4173/app", environment[FrontendAuthEnvironment.RedirectUriVariableName]);
        Assert.Equal("http://127.0.0.1:4173/app", environment[FrontendAuthEnvironment.PostLogoutRedirectUriVariableName]);
        Assert.Equal("custom-api", environment[FrontendAuthEnvironment.AudienceVariableName]);
        Assert.Equal("starter", environment[FrontendAuthEnvironment.DefaultDeckIdVariableName]);
        Assert.Equal("openid profile offline_access", environment[FrontendAuthEnvironment.ScopeVariableName]);
    }

    [Fact]
    public void GetDevelopmentViteEnvironment_DoesNotSetPostLogoutRedirectUri_WhenRedirectUriIsMissing()
    {
        var values = new Dictionary<string, string?>
        {
            [FrontendAuthEnvironment.PostLogoutRedirectUriVariableName] = "http://127.0.0.1:19073/logout"
        };

        var environment = FrontendAuthEnvironment.GetDevelopmentViteEnvironment(name => values.GetValueOrDefault(name));

        Assert.False(environment.ContainsKey(FrontendAuthEnvironment.RedirectUriVariableName));
        Assert.False(environment.ContainsKey(FrontendAuthEnvironment.PostLogoutRedirectUriVariableName));
    }
}