export type TenaxAuthConfig = {
  authority: string;
  clientId: string;
  redirectUri: string;
  postLogoutRedirectUri?: string;
  scope?: string;
  audience?: string;
  defaultDeckId?: string;
};

export type TenaxAuthViteEnv = {
  VITE_TENAX_AUTH_AUTHORITY?: string;
  VITE_TENAX_AUTH_CLIENT_ID?: string;
  VITE_TENAX_AUTH_FRONTEND_ORIGIN?: string;
  VITE_TENAX_AUTH_REDIRECT_URI?: string;
  VITE_TENAX_AUTH_POST_LOGOUT_REDIRECT_URI?: string;
  VITE_TENAX_AUTH_AUDIENCE?: string;
  VITE_TENAX_AUTH_DEFAULT_DECK_ID?: string;
  VITE_TENAX_AUTH_SCOPE?: string;
};

declare global {
  interface Window {
    TENAX_AUTH_CONFIG?: TenaxAuthConfig;
  }
}

export const DEFAULT_TENAX_AUTH_SCOPE = "openid profile email";
const DEFAULT_TENAX_DECK_ID = "default";

const normalizeValue = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeAuthority = (authority: string) => authority.replace(/\/$/, "");

const normalizeRedirectUri = (value: string) => {
  try {
    const origin = new URL(value).origin;
    return `${origin}/`;
  } catch {
    return value;
  }
};

const normalizeAuthConfig = (config: Partial<TenaxAuthConfig> | undefined | null) => {
  const authority = normalizeValue(config?.authority);
  const clientId = normalizeValue(config?.clientId);
  const redirectUri = normalizeValue(config?.redirectUri);

  if (!authority || !clientId || !redirectUri) {
    return null;
  }

  const postLogoutRedirectUri = normalizeValue(config?.postLogoutRedirectUri) ?? redirectUri;
  const audience = normalizeValue(config?.audience);
  const defaultDeckId = normalizeValue(config?.defaultDeckId) ?? DEFAULT_TENAX_DECK_ID;
  const scope = normalizeValue(config?.scope) ?? DEFAULT_TENAX_AUTH_SCOPE;

  return {
    authority: normalizeAuthority(authority),
    clientId,
    redirectUri,
    postLogoutRedirectUri,
    ...(audience ? { audience } : {}),
    defaultDeckId,
    scope,
  } satisfies TenaxAuthConfig;
};

const mapViteEnvToAuthConfig = (env: TenaxAuthViteEnv): Partial<TenaxAuthConfig> => {
  const explicitRedirectUri = normalizeValue(env.VITE_TENAX_AUTH_REDIRECT_URI);
  const frontendOrigin = normalizeValue(env.VITE_TENAX_AUTH_FRONTEND_ORIGIN);
  const derivedRedirectUri = frontendOrigin ? normalizeRedirectUri(frontendOrigin) : undefined;
  const redirectUri = explicitRedirectUri ?? derivedRedirectUri;

  return {
    authority: env.VITE_TENAX_AUTH_AUTHORITY,
    clientId: env.VITE_TENAX_AUTH_CLIENT_ID,
    redirectUri,
    postLogoutRedirectUri: env.VITE_TENAX_AUTH_POST_LOGOUT_REDIRECT_URI,
    audience: env.VITE_TENAX_AUTH_AUDIENCE,
    defaultDeckId: env.VITE_TENAX_AUTH_DEFAULT_DECK_ID,
    scope: env.VITE_TENAX_AUTH_SCOPE,
  };
};

export const readBrowserAuthConfig = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return normalizeAuthConfig(window.TENAX_AUTH_CONFIG);
};

export const initializeRuntimeAuthConfig = (env: TenaxAuthViteEnv = {}) => {
  if (typeof window === "undefined") {
    return null;
  }

  const resolvedConfig =
    normalizeAuthConfig(window.TENAX_AUTH_CONFIG) ?? normalizeAuthConfig(mapViteEnvToAuthConfig(env));

  if (!resolvedConfig) {
    window.TENAX_AUTH_CONFIG = undefined;
    return null;
  }

  window.TENAX_AUTH_CONFIG = resolvedConfig;
  return resolvedConfig;
};