import { readFileSync } from 'node:fs';

const VALID_ROLES = new Set(['admin', 'trainer', 'client', 'user']);

function normalizeRole(value) {
  const role = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return VALID_ROLES.has(role) ? role : null;
}

function decodeJwtRole(token) {
  if (typeof token !== 'string') return null;
  const [, rawPayload] = token.split('.');
  if (!rawPayload) return null;

  try {
    let payload = rawPayload.replace(/-/g, '+').replace(/_/g, '/');
    while (payload.length % 4) payload += '=';
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    return normalizeRole(decoded.role);
  } catch {
    return null;
  }
}

function parseUserRole(userValue) {
  if (typeof userValue !== 'string') return null;

  try {
    return normalizeRole(JSON.parse(userValue).role);
  } catch {
    return null;
  }
}

function getLocalStorageValue(state, key) {
  const origins = Array.isArray(state?.origins) ? state.origins : [];

  for (const origin of origins) {
    const entries = Array.isArray(origin?.localStorage) ? origin.localStorage : [];
    const match = entries.find((entry) => entry?.name === key);
    if (match && typeof match.value === 'string') return match.value;
  }

  return null;
}

export function getStorageStateRoleSummary(authPath) {
  const state = JSON.parse(readFileSync(authPath, 'utf8'));

  return {
    userRole: parseUserRole(getLocalStorageValue(state, 'user')),
    tokenRole: decodeJwtRole(getLocalStorageValue(state, 'token')),
  };
}

function formatRoleEvidence(summary) {
  return [
    summary.userRole ? `user.role=${summary.userRole}` : null,
    summary.tokenRole ? `token.role=${summary.tokenRole}` : null,
  ].filter(Boolean).join(', ');
}

export function assertStorageStateMatchesRole({ expectedRole, authPath, envName }) {
  const expected = normalizeRole(expectedRole);
  if (!expected) {
    throw new Error(`unknown required production auth role "${expectedRole}"; use admin, trainer, client, user`);
  }

  const summary = getStorageStateRoleSummary(authPath);
  const observedRoles = [summary.userRole, summary.tokenRole].filter(Boolean);

  if (observedRoles.length === 0) {
    throw new Error(
      `required production auth state ${envName} does not contain readable role metadata for ${expected}; ` +
      `recapture with npm run qa:prod-auth:capture:${expected}`
    );
  }

  const mismatched = observedRoles.some((role) => role !== expected);
  if (mismatched) {
    throw new Error(
      `required production auth state ${envName} expected ${expected} but found ${formatRoleEvidence(summary)}; ` +
      `recapture with node scripts/qa/capture-prod-auth-state.mjs --role=${expected} or point ${envName} at the correct storage-state file`
    );
  }
}
