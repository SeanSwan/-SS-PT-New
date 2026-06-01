export const getNumericClientId = (clientId: number | string): number | null => {
  if (typeof clientId === 'number') {
    return Number.isSafeInteger(clientId) && clientId > 0 ? clientId : null;
  }

  const trimmedClientId = clientId.trim();
  if (!/^[1-9]\d*$/.test(trimmedClientId)) return null;

  const parsedClientId = Number(trimmedClientId);
  return Number.isSafeInteger(parsedClientId) ? parsedClientId : null;
};
