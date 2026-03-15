import { ApiErrorEnvelope, ValidationErrors } from "./types";

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
