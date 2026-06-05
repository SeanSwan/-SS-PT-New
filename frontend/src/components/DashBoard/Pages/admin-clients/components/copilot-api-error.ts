import type { ValidationError } from './copilot-types';

interface ApiErrorPayload {
  code?: string;
  message?: string;
  errors?: ValidationError[];
}

interface ApiErrorLike {
  message?: string;
  response?: {
    data?: ApiErrorPayload;
  };
}

export const getCopilotApiError = (
  err: unknown,
): { data: ApiErrorPayload; message?: string } => {
  const apiError = err as ApiErrorLike;
  return {
    data: apiError.response?.data || {},
    message: apiError.message,
  };
};
