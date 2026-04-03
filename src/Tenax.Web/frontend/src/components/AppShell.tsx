import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { getApiErrorMessage } from "../api/errors";
import {
  useAuthSessionQuery,
  useLoginStartMutation,
  useLogoutMutation,
} from "../api/auth";
import { ThemePreference, useTheme } from "../app/theme";

const themeControlOptions: Array<{ value: ThemePreference; label: string }> = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export const AppShell = () => {
  const location = useLocation();
  const sessionQuery = useAuthSessionQuery();
  const loginMutation = useLoginStartMutation();
  const logoutMutation = useLogoutMutation();
  const { preference, setPreference } = useTheme();

  const session = sessionQuery.data;
  const menuLinks = session?.menu.visible ? session.menu.links : [];

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <Link to="/" className="brand-link" aria-label="Tenax home">
            <span className="brand-link__mark" aria-hidden="true" />
            <span className="brand-link__text">Tenax</span>
          </Link>

          <nav className="primary-nav" aria-label="Primary">
            <NavLink to="/" end className={({ isActive }) => `primary-nav__link${isActive ? " is-active" : ""}`}>
              Home
            </NavLink>
            {session?.isAuthenticated ? (
              <NavLink
                to="/decks"
                className={({ isActive }) => `primary-nav__link${isActive ? " is-active" : ""}`}
              >
                Decks
              </NavLink>
            ) : null}
          </nav>

          <div className="header-controls">
            <div className="theme-toggle" role="group" aria-label="Theme preference">
              {themeControlOptions.map((option) => {
                const isSelected = preference === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isSelected}
                    className={`theme-toggle__button${isSelected ? " is-active" : ""}`}
                    onClick={() => setPreference(option.value)}
                  >
                    <span className="sr-only">{option.label} theme</span>
                    <span aria-hidden="true">{option.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="auth-actions" aria-live="polite">
              {sessionQuery.isLoading ? <span className="auth-actions__meta">Loading session...</span> : null}

              {session?.isAuthenticated && session.user ? (
                <>
                  <span className="auth-actions__meta">{session.user.displayName}</span>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                  >
                    {logoutMutation.isPending ? "Signing out..." : "Sign out"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => {
                    const returnTo = `${location.pathname}${location.search}${location.hash}`;
                    loginMutation.mutate({ returnTo });
                  }}
                  disabled={loginMutation.isPending || sessionQuery.isLoading}
                >
                  {loginMutation.isPending ? "Starting sign in..." : "Sign in"}
                </button>
              )}
            </div>
          </div>
        </div>

        {loginMutation.isError ? (
          <p role="alert" className="app-header__alert">
            {getApiErrorMessage(loginMutation.error)}
          </p>
        ) : null}
        {logoutMutation.isError ? (
          <p role="alert" className="app-header__alert">
            {getApiErrorMessage(logoutMutation.error)}
          </p>
        ) : null}
        {sessionQuery.isError ? (
          <p role="alert" className="app-header__alert">
            {getApiErrorMessage(sessionQuery.error)}
          </p>
        ) : null}
      </header>

      <div className="app-shell__content">
        <Outlet />
      </div>
    </div>
  );
};
