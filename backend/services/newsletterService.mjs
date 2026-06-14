/**
 * Newsletter Service (Tier 1.1) — double-opt-in email list.
 * =========================================================
 * Pure DB + token logic so the routes stay thin and this stays unit-testable.
 * Compliance backbone: every new/returning email lands as `pending` with a
 * confirm token (double opt-in); confirm records consent; unsubscribe is a
 * one-click token flip. Models imported dynamically for testability.
 */
import crypto from 'node:crypto';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const genToken = () => crypto.randomBytes(24).toString('hex');

/**
 * Subscribe (or re-open opt-in). Always returns to a PENDING state needing
 * email confirmation, except when the email is already confirmed.
 * @returns {Promise<{ok:boolean, action?:string, subscriber?:object, confirmToken?:string, error?:string}>}
 */
export async function subscribe({ email, firstName = null, lastName = null, source = 'website', consentSource = null, consentIp = null } = {}) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(normalized)) return { ok: false, error: 'invalid_email' };

  const { default: Subscriber } = await import('../models/Subscriber.mjs');
  const existing = await Subscriber.findOne({ where: { email: normalized } });

  // Already on the list — do nothing (don't reset their consent, don't spam a confirm).
  if (existing && existing.status === 'confirmed') {
    return { ok: true, action: 'already_confirmed', subscriber: existing };
  }

  const confirmToken = genToken();

  if (existing) {
    // pending (re-send confirm) or unsubscribed (re-opt-in) -> reset to pending.
    const action = existing.status === 'unsubscribed' ? 'resubscribe_pending' : 'reconfirm_pending';
    await existing.update({
      status: 'pending',
      confirmToken,
      unsubscribeToken: existing.unsubscribeToken || genToken(),
      firstName: firstName ?? existing.firstName,
      lastName: lastName ?? existing.lastName,
      source: source || existing.source,
      consentSource,
      consentIp,
      unsubscribedAt: null,
    });
    return { ok: true, action, subscriber: existing, confirmToken };
  }

  const subscriber = await Subscriber.create({
    email: normalized,
    firstName,
    lastName,
    source,
    status: 'pending',
    confirmToken,
    unsubscribeToken: genToken(),
    consentSource,
    consentIp,
  });
  return { ok: true, action: 'created_pending', subscriber, confirmToken };
}

/**
 * Confirm a pending subscriber via their confirm token (double opt-in step 2).
 * Records consent timestamp and clears the (single-use) confirm token.
 */
export async function confirm(token) {
  if (!token) return { ok: false, error: 'invalid_token' };
  const { default: Subscriber } = await import('../models/Subscriber.mjs');
  const subscriber = await Subscriber.findOne({ where: { confirmToken: token } });
  if (!subscriber) return { ok: false, error: 'invalid_token' };
  if (subscriber.status === 'confirmed') return { ok: true, action: 'already_confirmed', subscriber };

  const now = new Date();
  await subscriber.update({
    status: 'confirmed',
    confirmedAt: now,
    consentAt: now,
    confirmToken: null,
  });
  return { ok: true, action: 'confirmed', subscriber };
}

/**
 * One-click unsubscribe via the unsubscribe token (legally required in every send).
 */
export async function unsubscribe(token) {
  if (!token) return { ok: false, error: 'invalid_token' };
  const { default: Subscriber } = await import('../models/Subscriber.mjs');
  const subscriber = await Subscriber.findOne({ where: { unsubscribeToken: token } });
  if (!subscriber) return { ok: false, error: 'invalid_token' };
  if (subscriber.status !== 'unsubscribed') {
    await subscriber.update({ status: 'unsubscribed', unsubscribedAt: new Date() });
  }
  return { ok: true, action: 'unsubscribed', subscriber };
}

export default { subscribe, confirm, unsubscribe };
