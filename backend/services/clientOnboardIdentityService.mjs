/**
 * Client Onboard Identity Service
 * ===============================
 *
 * Builds safe internal identifiers for trainer/admin-created client stubs.
 *
 * The public onboarding flows may omit a client email because Sean often starts
 * with a dictated name and source only. In that case the backend must generate a
 * deterministic-valid placeholder email that satisfies User.email validation
 * without leaking raw punctuation or creating malformed addresses.
 */

import crypto from 'node:crypto';

const CLIENT_STUB_EMAIL_DOMAIN = 'stub.swanstudios.com';
const CLIENT_STUB_EMAIL_TOKEN_MAX = 24;

export const normalizeClientOnboardEmailInput = (value) => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized || null;
};

export const sanitizeClientOnboardStubToken = (value, fallback) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['`\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, CLIENT_STUB_EMAIL_TOKEN_MAX);

  return normalized || fallback;
};

export const buildClientOnboardStubEmail = ({ firstName, lastName, token }) => {
  const safeFirstName = sanitizeClientOnboardStubToken(firstName, 'client');
  const safeLastName = sanitizeClientOnboardStubToken(lastName, 'account');
  const safeToken = sanitizeClientOnboardStubToken(token, crypto.randomBytes(3).toString('hex'));

  return `${safeFirstName}.${safeLastName}.${safeToken}@${CLIENT_STUB_EMAIL_DOMAIN}`;
};
