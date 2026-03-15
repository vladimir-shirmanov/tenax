import { Link, useLocation } from "react-router-dom";
import { getApiErrorMessage } from "../api/errors";
import {
  useAuthSessionQuery,
  useLoginStartMutation,
  useLogoutMutation,
} from "../api/auth";
import { PageScaffold } from "../components/PageScaffold";

export const HomeRoute = () => {
  const location = useLocation();
  const sessionQuery = useAuthSessionQuery();
  const loginMutation = useLoginStartMutation();
  const logoutMutation = useLogoutMutation();

  if (sessionQuery.isLoading) {
    return (
      <PageScaffold title="Welcome to Tenax" subtitle="Your language study home.">
        <p>Loading session...</p>
      </PageScaffold>
    );
  }

  if (sessionQuery.isError) {
    return (
      <PageScaffold title="Welcome to Tenax" subtitle="Your language study home.">
        <div role="alert" className="rounded-lg border border-ember bg-orange-50 p-3 text-sm">
          <p>{getApiErrorMessage(sessionQuery.error)}</p>
          <button
            type="button"
            className="mt-3 rounded-lg border border-stone-500 px-3 py-1.5 text-sm font-semibold"
            onClick={() => {
              void sessionQuery.refetch();
            }}
          >
            Retry
          </button>
        </div>
      </PageScaffold>
    );
  }

  if (!sessionQuery.data) {
    return (
      <PageScaffold title="Welcome to Tenax" subtitle="Your language study home.">
        <p>Session is unavailable right now.</p>
      </PageScaffold>
    );
  }

  const { isAuthenticated, user, menu } = sessionQuery.data;
  const showMenu = isAuthenticated && menu.visible;

  return (
    <PageScaffold
      title="Welcome to Tenax"
      subtitle="Review your learning flow and jump directly into flashcards."
    >
      {isAuthenticated && user ? (
        <p className="mb-4 text-sm text-stone-700">Signed in as {user.displayName}</p>
      ) : (
        <p className="mb-4 text-sm text-stone-700">Sign in to access your study menu.</p>
      )}

      {showMenu ? (
        <nav aria-label="Learning menu" className="mb-6">
          <ul className="space-y-2" role="list">
            {menu.links.map((link) => (
              <li key={link.key}>
                <Link
                  to={link.href}
                  className="inline-flex rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-stone-100"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {!isAuthenticated ? (
          <button
            type="button"
            className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white"
            onClick={() => {
              const returnTo = `${location.pathname}${location.search}${location.hash}`;
              loginMutation.mutate({ returnTo });
            }}
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Starting sign in..." : "Sign in"}
          </button>
        ) : (
          <button
            type="button"
            className="rounded-lg border border-stone-500 px-4 py-2 text-sm font-semibold"
            onClick={() => {
              logoutMutation.mutate();
            }}
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? "Signing out..." : "Sign out"}
          </button>
        )}
      </div>

      {loginMutation.isError ? (
        <p role="alert" className="mt-3 text-sm text-ember">
          {getApiErrorMessage(loginMutation.error)}
        </p>
      ) : null}

      {logoutMutation.isError ? (
        <p role="alert" className="mt-3 text-sm text-ember">
          {getApiErrorMessage(logoutMutation.error)}
        </p>
      ) : null}
    </PageScaffold>
  );
};
