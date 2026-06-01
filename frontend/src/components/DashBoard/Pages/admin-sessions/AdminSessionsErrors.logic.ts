export const getAdminSessionsErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;

  if (typeof error === 'object' && error !== null) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    if (typeof response?.data?.message === 'string') return response.data.message;
  }

  return fallback;
};
