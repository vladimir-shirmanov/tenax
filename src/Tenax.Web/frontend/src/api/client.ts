import { ApiError } from "./errors";
import { ApiErrorEnvelope } from "./types";

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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });

  const text = await response.text();
  const payload = text.length > 0 ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new ApiError(response.status, toErrorEnvelope(payload));
  }

  return payload as T;
};
