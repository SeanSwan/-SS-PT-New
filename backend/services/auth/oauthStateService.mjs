/**
 * OAuth transaction and completion-code state.
 *
 * State, nonce, and PKCE verifiers remain in the server-side session. The
 * browser receives only random single-use values. Transactions expire quickly,
 * survive the provider redirect, and are consumed exactly once.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const TRANSACTION_TTL_MS = 10 * 60 * 1000;
const COMPLETION_TTL_MS = 2 * 60 * 1000;
const MAX_TRANSACTIONS = 5;
const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');
const hashToken = (value) => createHash('sha256').update(value).digest('base64url');

const authError = (code, message) => Object.assign(new Error(message), { code });
const saveSession = (request) => new Promise((resolve, reject) => {
  if (!request.session?.save) return resolve();
  request.session.save((error) => error ? reject(error) : resolve());
});

const constantTimeEqual = (left, right) => {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

export const normalizeAuthReturnUrl = (value) => {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/user-dashboard';
  }
  if (value.includes('\\') || /[\u0000-\u001f\u007f]/.test(value)) return '/user-dashboard';
  return value;
};

const activeTransactions = (session, now) => Object.fromEntries(
  Object.entries(session.oauthTransactions || {})
    .filter(([, transaction]) => now - transaction.createdAt <= TRANSACTION_TTL_MS)
    .slice(-MAX_TRANSACTIONS + 1),
);

export async function createOAuthTransaction(request, { provider, returnUrl, mode, userId = null }) {
  if (!request.session) throw authError('OAUTH_SESSION_UNAVAILABLE', 'OAuth session is unavailable');
  const state = randomToken();
  const nonce = randomToken();
  const codeVerifier = randomToken(48);
  const now = Date.now();
  request.session.oauthTransactions = {
    ...activeTransactions(request.session, now),
    [state]: {
      state, nonce, codeVerifier, provider, mode, userId,
      returnUrl: normalizeAuthReturnUrl(returnUrl), createdAt: now,
    },
  };
  await saveSession(request);
  return { state, nonce, codeChallenge: hashToken(codeVerifier) };
}

export async function consumeOAuthTransaction(request, { provider, state }) {
  const transactions = request.session?.oauthTransactions || {};
  const transaction = Object.values(transactions)
    .find((candidate) => candidate.provider === provider && constantTimeEqual(candidate.state, state));
  if (!transaction || Date.now() - transaction.createdAt > TRANSACTION_TTL_MS) {
    throw authError('OAUTH_STATE_INVALID', 'OAuth state is invalid or expired');
  }
  delete transactions[transaction.state];
  request.session.oauthTransactions = transactions;
  await saveSession(request);
  return transaction;
}

export async function storeOAuthCompletion(request, { provider, userId, returnUrl }) {
  if (!request.session) throw authError('OAUTH_SESSION_UNAVAILABLE', 'OAuth session is unavailable');
  const code = randomToken();
  request.session.oauthCompletion = {
    codeHash: hashToken(code), provider, userId,
    returnUrl: normalizeAuthReturnUrl(returnUrl), createdAt: Date.now(),
  };
  await saveSession(request);
  return code;
}

export async function consumeOAuthCompletion(request, code) {
  const completion = request.session?.oauthCompletion;
  if (!completion
    || Date.now() - completion.createdAt > COMPLETION_TTL_MS
    || !constantTimeEqual(completion.codeHash, hashToken(String(code || '')))) {
    throw authError('OAUTH_COMPLETION_INVALID', 'OAuth completion code is invalid or expired');
  }
  delete request.session.oauthCompletion;
  await saveSession(request);
  return completion;
}