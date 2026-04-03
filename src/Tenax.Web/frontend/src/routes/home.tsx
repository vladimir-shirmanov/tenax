import { Link } from "react-router-dom";
import { getApiErrorMessage } from "../api/errors";
import { useAuthSessionQuery } from "../api/auth";
import { PageScaffold } from "../components/PageScaffold";

export const HomeRoute = () => {
  const sessionQuery = useAuthSessionQuery();

  if (sessionQuery.isLoading) {
    return (
      <PageScaffold title="Welcome to Tenax" subtitle="Your language study home.">
        <p className="text-muted">Loading session...</p>
      </PageScaffold>
    );
  }

  if (sessionQuery.isError) {
    return (
      <PageScaffold title="Welcome to Tenax" subtitle="Your language study home.">
        <div role="alert" className="alert">
          <p>{getApiErrorMessage(sessionQuery.error)}</p>
          <button
            type="button"
            className="button button--ghost"
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
        <p className="text-muted">Session is unavailable right now.</p>
      </PageScaffold>
    );
  }

  const { isAuthenticated, user, menu } = sessionQuery.data;
  const showMenu = isAuthenticated && menu.visible;

  return (
    <PageScaffold
      title="Welcome to Tenax"
      subtitle="A quiet place to return to your language learning rhythm."
    >
      {!isAuthenticated ? (
        <section className="stack">
          <p className="landing-eyebrow">Focused language practice</p>
          <h1 className="landing-heading">Build retention through deliberate review, not clutter.</h1>
          <p className="landing-copy">
            Tenax keeps each study session clear and calm so you can revisit vocabulary,
            reinforce meaning, and resume progress quickly from any device.
          </p>
          <hr className="landing-divider" />
          <p className="text-muted">
            Sign in from the header to open your study menu and continue where you left off.
          </p>
        </section>
      ) : null}

      {isAuthenticated && user ? (
        <section className="stack">
          <div className="section-row">
            <p className="landing-eyebrow" style={{ marginBottom: 0 }}>
              Rapid resume
            </p>
            <p className="text-muted" style={{ margin: 0 }}>
              Signed in as {user.displayName}
            </p>
          </div>
          <h1 className="landing-heading">Continue your study flow in one step.</h1>
          <p className="landing-copy">
            Jump directly to your active deck or open authoring tools to capture new terms while
            momentum is fresh.
          </p>

          <nav aria-label="Learning menu">
            <ul className="flat-list" role="list">
              {showMenu
                ? menu.links.map((link) => (
                    <li key={link.key} className="flat-list__item">
                      <Link to={link.href} className="flat-list__title">
                        {link.label}
                      </Link>
                      <p className="flat-list__meta">Open {link.label.toLowerCase()} and continue.</p>
                    </li>
                  ))
                : null}
            </ul>
          </nav>
        </section>
      ) : null}

      {!isAuthenticated ? (
        <nav className="inline-nav" aria-label="Available study routes">
          <Link to="/decks">Browse decks</Link>
          <Link to="/decks">Preview flashcards</Link>
        </nav>
      ) : null}

      {!showMenu && isAuthenticated ? (
        <div className="alert" role="alert">
          <p className="text-muted" style={{ margin: 0 }}>
            Your study menu is unavailable right now. Try refreshing session state.
          </p>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => {
              void sessionQuery.refetch();
            }}
          >
            Reload session
          </button>
        </div>
      ) : null}

      {sessionQuery.isFetching ? (
        <p className="text-muted" style={{ marginBottom: 0 }}>
          Refreshing session...
        </p>
      ) : null}
    </PageScaffold>
  );
};
