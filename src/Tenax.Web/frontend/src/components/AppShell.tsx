import { ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { getApiErrorMessage } from "../api/errors";
import {
  useAuthSessionQuery,
  useLoginStartMutation,
  useLogoutMutation,
} from "../api/auth";
import { ThemePreference, useTheme } from "../app/theme";

type ThemeOption = { value: ThemePreference; label: string; icon: ReactNode };

const themeControlOptions: ThemeOption[] = [
  {
    value: "system",
    label: "System",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="1" y="2" width="14" height="10" rx="1" />
        <path d="M5 15h6" />
        <path d="M8 12v3" />
      </svg>
    ),
  },
  {
    value: "light",
    label: "Light",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="3" />
        <line x1="8" y1="1" x2="8" y2="3" />
        <line x1="8" y1="13" x2="8" y2="15" />
        <line x1="1" y1="8" x2="3" y2="8" />
        <line x1="13" y1="8" x2="15" y2="8" />
        <line x1="2.93" y1="2.93" x2="4.34" y2="4.34" />
        <line x1="11.66" y1="11.66" x2="13.07" y2="13.07" />
        <line x1="2.93" y1="13.07" x2="4.34" y2="11.66" />
        <line x1="11.66" y1="4.34" x2="13.07" y2="2.93" />
      </svg>
    ),
  },
  {
    value: "dark",
    label: "Dark",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7z" />
      </svg>
    ),
  },
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
              <NavLink to="/decks" className={({ isActive }) => `primary-nav__link${isActive ? " is-active" : ""}`}>
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
                    aria-label={`${option.label} theme`}
                    title={`${option.label} theme`}
                    className={`theme-toggle__button${isSelected ? " is-active" : ""}`}
                    onClick={() => setPreference(option.value)}
                  >
                    {option.icon}
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
