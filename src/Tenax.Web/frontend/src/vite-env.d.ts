/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TENAX_AUTH_AUTHORITY?: string;
  readonly VITE_TENAX_AUTH_CLIENT_ID?: string;
  readonly VITE_TENAX_AUTH_REDIRECT_URI?: string;
  readonly VITE_TENAX_AUTH_POST_LOGOUT_REDIRECT_URI?: string;
  readonly VITE_TENAX_AUTH_AUDIENCE?: string;
  readonly VITE_TENAX_AUTH_DEFAULT_DECK_ID?: string;
  readonly VITE_TENAX_AUTH_SCOPE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}