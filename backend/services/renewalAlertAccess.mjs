import { getModel } from '../models/index.mjs';
import { assertAssignmentOrAdmin, listAssignedClientIds } from '../middleware/verifyClientAccess.mjs';

export class RenewalAlertAccessError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'RenewalAlertAccessError';
    this.status = status;
    this.code = code;
    this.expose = true;
  }
}

export function parseStrictPositiveInteger(value) {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export async function getRenewalAlertScope(req) {
  if (req.user?.role === 'admin') return null;
  if (req.user?.role !== 'trainer') {
    throw new RenewalAlertAccessError(403, 'STAFF_ACCESS_REQUIRED', 'Staff access required');
  }

  try {
    return await listAssignedClientIds(req.user.id);
  } catch (error) {
    if (error?.code === 'ASSIGNMENT_LOOKUP_UNAVAILABLE') {
      throw new RenewalAlertAccessError(503, 'ASSIGNMENT_LOOKUP_UNAVAILABLE', 'Client access is temporarily unavailable');
    }
    throw new RenewalAlertAccessError(503, 'ASSIGNMENT_LOOKUP_UNAVAILABLE', 'Client access is temporarily unavailable');
  }
}

export async function assertRenewalClientAccess(req, rawClientId) {
  const clientId = parseStrictPositiveInteger(rawClientId);
  if (!clientId) {
    throw new RenewalAlertAccessError(400, 'INVALID_CLIENT_ID', 'Valid clientId is required');
  }

  let allowed = false;
  try {
    allowed = await assertAssignmentOrAdmin(
      req.user?.id,
      req.user?.role,
      clientId,
      { throwOnUnavailable: true },
    );
  } catch {
    throw new RenewalAlertAccessError(503, 'ASSIGNMENT_LOOKUP_UNAVAILABLE', 'Client access is temporarily unavailable');
  }
  if (!allowed) {
    throw new RenewalAlertAccessError(403, 'CLIENT_SCOPE_FORBIDDEN', 'Client access denied');
  }
  return clientId;
}

export async function loadAuthorizedRenewalAlert(req, rawAlertId) {
  const alertId = parseStrictPositiveInteger(rawAlertId);
  if (!alertId) {
    throw new RenewalAlertAccessError(400, 'INVALID_ALERT_ID', 'Valid alert id is required');
  }

  let alert;
  try {
    const RenewalAlert = getModel('RenewalAlert');
    alert = await RenewalAlert.findByPk(alertId);
  } catch {
    throw new RenewalAlertAccessError(503, 'ALERT_LOOKUP_UNAVAILABLE', 'Renewal alert is temporarily unavailable');
  }
  if (!alert) {
    throw new RenewalAlertAccessError(404, 'ALERT_NOT_FOUND', 'Renewal alert not found');
  }

  let allowed = false;
  try {
    allowed = await assertAssignmentOrAdmin(
      req.user?.id,
      req.user?.role,
      alert.userId,
      { throwOnUnavailable: true },
    );
  } catch {
    throw new RenewalAlertAccessError(503, 'ASSIGNMENT_LOOKUP_UNAVAILABLE', 'Client access is temporarily unavailable');
  }
  if (!allowed) {
    throw new RenewalAlertAccessError(403, 'CLIENT_SCOPE_FORBIDDEN', 'Client access denied');
  }
  return { alertId, alert };
}

export function sendRenewalAccessError(res, error, fallbackMessage) {
  if (error instanceof RenewalAlertAccessError) {
    return res.status(error.status).json({ success: false, message: error.message, code: error.code });
  }
  return res.status(503).json({ success: false, message: fallbackMessage, code: 'RENEWAL_ALERT_UNAVAILABLE' });
}
