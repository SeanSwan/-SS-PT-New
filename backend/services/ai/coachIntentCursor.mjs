/** Encrypted continuation for receipt reads; never an authorization grant.
 * AES-GCM hides denied ordering keys and binds actor, role and requested target.
 * The existing required signing secret derives a separate purpose-specific key.
 * Rotation/expiry invalidates pagination; callers can restart from the first page.
 */
import { createHmac, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const PURPOSE = 'swan-coach/intent-cursor/v1';
const TTL = 24 * 60 * 60 * 1000;
const context = scope => Buffer.from(JSON.stringify({ v: 1, actorId: Number(scope.actorId),
  role: scope.role, targetClientId: scope.targetClientId == null ? null : Number(scope.targetClientId) }));
function key() {
  const secret = process.env.OPERATION_SIGNING_KEY;
  if (typeof secret !== 'string' || secret.length < 32)
    throw Object.assign(new Error('Receipt continuation unavailable'), { code: 'INTENT_CURSOR_UNAVAILABLE' });
  return createHmac('sha256', secret).update(PURPOSE).digest();
}
function tuple(value) {
  if (!value || !UUID.test(value.id || '') || typeof value.createdAt !== 'string') return null;
  const date = new Date(value.createdAt);
  return Number.isFinite(date.getTime()) && date.toISOString() === value.createdAt
    ? { id: value.id, createdAt: date } : null;
}
export function encodeCoachIntentCursor(row, scope, now = Date.now()) {
  const data = { v: 1, id: row.id, createdAt: new Date(row.createdAt).toISOString(), expiresAt: now + TTL };
  if (!tuple(data)) throw new Error('Invalid receipt ordering key');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv, { authTagLength: 16 });
  cipher.setAAD(context(scope));
  const body = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}
export function decodeCoachIntentCursor(token, scope, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 512 || !/^[A-Za-z0-9_-]+$/.test(token)) return null;
  const secretKey = key(); // Missing server configuration is unavailable, not a bad user cursor.
  try {
    const packed = Buffer.from(token, 'base64url');
    if (packed.length < 29 || packed.toString('base64url') !== token) return null;
    const decipher = createDecipheriv('aes-256-gcm', secretKey, packed.subarray(0, 12), { authTagLength: 16 });
    decipher.setAAD(context(scope));
    decipher.setAuthTag(packed.subarray(12, 28));
    const data = JSON.parse(Buffer.concat([decipher.update(packed.subarray(28)), decipher.final()]).toString('utf8'));
    if (data.v !== 1 || !Number.isSafeInteger(data.expiresAt) || data.expiresAt <= now) return null;
    return tuple(data);
  } catch { return null; }
}
