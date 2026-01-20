export const useSessionErrorHandler = () => ({
  sessionService: null,
  wsManager: null,
  handleApiError: (_error: unknown, fallbackData?: unknown) =>
    fallbackData || { success: false, data: [] },
  handleWebSocketError: () => null,
});

export default useSessionErrorHandler;
