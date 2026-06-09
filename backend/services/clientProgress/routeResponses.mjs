// backend/services/clientProgress/routeResponses.mjs

import logger from '../../utils/logger.mjs';

const INTERNAL_ERROR = 'internal_error';
const POSITIVE_INTEGER_RE = /^[1-9]\d*$/;

export class ClientProgressBadRequestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ClientProgressBadRequestError';
  }
}

function sendInternalError(res, message) {
  return res.status(500).json({
    success: false,
    message,
    error: INTERNAL_ERROR,
  });
}

function sendBadRequest(res, message) {
  return res.status(400).json({
    success: false,
    message,
  });
}

function parsePositiveInteger(value) {
  const normalized = String(value ?? '').trim();
  if (!POSITIVE_INTEGER_RE.test(normalized)) return null;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function requirePositiveClientId(value, paramName = 'clientId') {
  const numericClientId = parsePositiveInteger(value);
  if (numericClientId) return numericClientId;
  throw new ClientProgressBadRequestError(`Invalid ${paramName}`);
}

export function handleClientProgressError(
  res,
  error,
  logMessage,
  publicMessage,
) {
  if (error instanceof ClientProgressBadRequestError) {
    return sendBadRequest(res, error.message);
  }
  logger.error(logMessage, error);
  return sendInternalError(res, publicMessage);
}
