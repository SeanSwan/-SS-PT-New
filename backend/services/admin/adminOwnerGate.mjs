/**
 * Owner-admin gate for dangerous account-control actions.
 * Generic admins can run admin UI, but only allowlisted owner admins can
 * block, close, reopen, or force-log-out accounts.
 */

export class AdminOwnerGateError extends Error {
  constructor(message, statusCode = 403, code = 'OWNER_GATE_DENIED') {
    super(message);
    this.name = 'AdminOwnerGateError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

const splitList = (value) => String(value || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

export const parseOwnerAllowlist = (env = process.env) => ({
  emails: splitList(env.OWNER_ADMIN_EMAILS).map((email) => email.toLowerCase()),
  ids: splitList(env.OWNER_ADMIN_IDS),
});

const hasAllowlist = ({ emails, ids }) => emails.length > 0 || ids.length > 0;

export const getOwnerAdminAccess = (actor, env = process.env) => {
  const allowlist = parseOwnerAllowlist(env);
  const configured = hasAllowlist(allowlist);
  if (!configured || !actor || actor.role !== 'admin') {
    return {
      configured,
      ownerAdmin: false,
      code: configured ? 'OWNER_GATE_DENIED' : 'OWNER_GATE_NOT_CONFIGURED',
    };
  }

  const actorEmail = String(actor.email || '').trim().toLowerCase();
  const actorId = String(actor.id ?? '').trim();
  const ownerAdmin = (
    Boolean(actorEmail && allowlist.emails.includes(actorEmail)) ||
    Boolean(actorId && allowlist.ids.includes(actorId))
  );
  return {
    configured,
    ownerAdmin,
    code: ownerAdmin ? 'OWNER_GATE_ALLOWED' : 'OWNER_GATE_DENIED',
  };
};

export const isOwnerAdmin = (actor, env = process.env) => getOwnerAdminAccess(actor, env).ownerAdmin;

export const requireOwnerAdmin = (actor, env = process.env) => {
  const access = getOwnerAdminAccess(actor, env);
  if (!access.configured) {
    throw new AdminOwnerGateError(
      'Owner admin allowlist is not configured.',
      503,
      'OWNER_GATE_NOT_CONFIGURED'
    );
  }
  if (!access.ownerAdmin) {
    throw new AdminOwnerGateError('Owner admin access required.', 403, 'OWNER_GATE_DENIED');
  }
  return true;
};

export default {
  parseOwnerAllowlist,
  getOwnerAdminAccess,
  isOwnerAdmin,
  requireOwnerAdmin,
};
