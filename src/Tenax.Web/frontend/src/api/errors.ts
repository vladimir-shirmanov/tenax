import { ApiErrorEnvelope, ValidationErrors } from "./types";

const PERSISTENCE_UNAVAILABLE_CODE = "persistence_unavailable";
const CONCURRENCY_CONFLICT_CODE = "concurrency_conflict";
const FORBIDDEN_CODE = "forbidden";
const DECK_NOT_FOUND_CODE = "deck_not_found";

export class ApiError extends Error {
  status: number;
  envelope: ApiErrorEnvelope;

  constructor(status: number, envelope: ApiErrorEnvelope) {
    super(envelope.message);
    this.status = status;
    this.envelope = envelope;
  }
}

export const getValidationError = (
  apiError: unknown,
  field: string
): string | undefined => {
  if (!(apiError instanceof ApiError)) {
    return undefined;
  }

  const fieldErrors: ValidationErrors | undefined = apiError.envelope.errors;
  return fieldErrors?.[field]?.[0];
};

export const getApiErrorMessage = (apiError: unknown): string => {
  if (apiError instanceof ApiError) {
    return apiError.envelope.message;
  }

  return "Something went wrong. Please try again.";
};

export const isPersistenceUnavailableError = (apiError: unknown): boolean => {
  return (
    apiError instanceof ApiError &&
    apiError.envelope.code === PERSISTENCE_UNAVAILABLE_CODE
  );
};

export const isConcurrencyConflictError = (apiError: unknown): boolean => {
  return (
    apiError instanceof ApiError &&
    apiError.envelope.code === CONCURRENCY_CONFLICT_CODE
  );
};

export const isForbiddenError = (apiError: unknown): boolean => {
  return apiError instanceof ApiError && apiError.envelope.code === FORBIDDEN_CODE;
};

export const isDeckNotFoundError = (apiError: unknown): boolean => {
  return apiError instanceof ApiError && apiError.envelope.code === DECK_NOT_FOUND_CODE;
};
