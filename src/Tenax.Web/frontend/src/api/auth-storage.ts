type StoredAuthSession = {
  accessToken: string;
  idToken?: string;
  tokenType?: string;
  scope?: string;
  expiresAtEpochSeconds: number;
};

const AUTH_SESSION_STORAGE_KEY = "tenax.auth.session.v1";

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object";

const isValidStoredAuthSession = (value: unknown): value is StoredAuthSession => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.accessToken === "string" &&
    value.accessToken.length > 0 &&
    typeof value.expiresAtEpochSeconds === "number" &&
    Number.isFinite(value.expiresAtEpochSeconds)
  );
};

export const readAuthSession = (): StoredAuthSession | null => {
  const raw = sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return isValidStoredAuthSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const persistAuthSession = (session: StoredAuthSession) => {
  sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
};

export const clearAuthSession = () => {
  sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
};

export const readActiveAccessToken = (): string | null => {
  const session = readAuthSession();
  if (!session) {
    return null;
  }

  const nowEpochSeconds = Math.floor(Date.now() / 1000);
  if (session.expiresAtEpochSeconds <= nowEpochSeconds + 30) {
    clearAuthSession();
    return null;
  }

  return session.accessToken;
};
