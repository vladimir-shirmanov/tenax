import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import { initializeRuntimeAuthConfig } from "./api/auth-config";
import "./styles.css";

initializeRuntimeAuthConfig({
  VITE_TENAX_AUTH_AUTHORITY: import.meta.env.VITE_TENAX_AUTH_AUTHORITY,
  VITE_TENAX_AUTH_CLIENT_ID: import.meta.env.VITE_TENAX_AUTH_CLIENT_ID,
  VITE_TENAX_AUTH_REDIRECT_URI: import.meta.env.VITE_TENAX_AUTH_REDIRECT_URI,
  VITE_TENAX_AUTH_POST_LOGOUT_REDIRECT_URI: import.meta.env.VITE_TENAX_AUTH_POST_LOGOUT_REDIRECT_URI,
  VITE_TENAX_AUTH_AUDIENCE: import.meta.env.VITE_TENAX_AUTH_AUDIENCE,
  VITE_TENAX_AUTH_DEFAULT_DECK_ID: import.meta.env.VITE_TENAX_AUTH_DEFAULT_DECK_ID,
  VITE_TENAX_AUTH_SCOPE: import.meta.env.VITE_TENAX_AUTH_SCOPE,
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
