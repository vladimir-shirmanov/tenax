import { ApiError } from "./errors";
import { ApiErrorEnvelope } from "./types";
import { clearAuthSession, readActiveAccessToken } from "./auth-storage";
import { ensureAuthRedirect, tryRefreshAccessToken } from "./auth";

declare global {
  interface Window {
    TENAX_API_BASE_URL?: string;
  }
}

const API_BASE_URL =
  typeof window !== "undefined" ? window.TENAX_API_BASE_URL ?? "" : "";

const toErrorEnvelope = (payload: unknown): ApiErrorEnvelope => {
  if (
    payload &&
    typeof payload === "object" &&
    "code" in payload &&
    "message" in payload
  ) {
    return payload as ApiErrorEnvelope;
  }

  return {
    code: "unknown_error",
    message: "Unexpected response from server"
  };
};

export const requestJson = async <T>(
  path: string,
  init: RequestInit = {}
): Promise<T> => {
  const executeRequest = async () => {
    const headers = new Headers(init.headers ?? {});
    if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const accessToken = readActiveAccessToken();
    if (accessToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    });

    const text = await response.text();
    const payload = text.length > 0 ? JSON.parse(text) : null;
    return { response, payload };
  };

  let { response, payload } = await executeRequest();

  if (response.status === 401) {
    const refreshed = await tryRefreshAccessToken();
    if (refreshed) {
      ({ response, payload } = await executeRequest());
    } else {
      ensureAuthRedirect();
    }
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearAuthSession();
    }

    throw new ApiError(response.status, toErrorEnvelope(payload));
  }

  return payload as T;
};
