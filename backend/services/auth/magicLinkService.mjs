/** Secure passwordless email authentication with enumeration-safe issuance. */
import crypto from 'node:crypto';
import { Op, col, fn, where } from 'sequelize';
import User from '../../models/User.mjs';
import MagicLoginToken from '../../models/MagicLoginToken.mjs';
import { sendEmailNotification } from '../../utils/notification.mjs';
import logger from '../../utils/logger.mjs';
import { normalizeAuthReturnUrl } from './oauthStateService.mjs';

const TOKEN_TTL_MS = 15 * 60 * 1000;
const SECRET_PLACEHOLDERS = new Set([
  'your-secret-key',
  'your-secret-key-change-in-production',
  'your-production-jwt-secret-key-here-change-this',
]);

const magicSecret = () => {
  const secret = process.env.MAGIC_LINK_SECRET || process.env.JWT_SECRET;
  return secret && !SECRET_PLACEHOLDERS.has(secret) ? secret : null;
};

const frontendBaseUrl = () => {
  if (process.env.AUTH_FRONTEND_URL) return process.env.AUTH_FRONTEND_URL.replace(/\/$/, '');
  if (process.env.NODE_ENV === 'production') return 'https://sswanstudios.com';
  return process.env.FRONTEND_URL?.split(',')[0]?.trim()?.replace(/\/$/, '')
    || 'http://localhost:5173';
};

export const isMagicLinkEnabled = () => (
  process.env.AUTH_MAGIC_LINK_ENABLED === 'true'
  && Boolean(process.env.SENDGRID_API_KEY)
  && Boolean(magicSecret())
);

export const hashMagicLinkToken = (rawToken) => {
  const secret = magicSecret();
  if (!secret) throw Object.assign(new Error('Magic-link authentication is unavailable'), { status: 503 });
  return crypto.createHmac('sha256', secret).update(rawToken).digest('hex');
};

const defaultFindUser = (email) => User.findOne({
  where: where(fn('lower', col('email')), email),
});
const defaultCleanup = (now) => MagicLoginToken.destroy({
  where: { expiresAt: { [Op.lte]: now } },
});
const defaultInvalidate = (userId, consumedAt) => MagicLoginToken.update(
  { consumedAt }, { where: { userId, consumedAt: null } },
);
const defaultConsume = async (tokenHash, now) => {
  const [, rows] = await MagicLoginToken.update(
    { consumedAt: now },
    { where: { tokenHash, consumedAt: null, expiresAt: { [Op.gt]: now } }, returning: true },
  );
  return rows;
};

export async function issueMagicLink(emailInput, returnUrlInput, options = {}) {
  if (!isMagicLinkEnabled()) throw Object.assign(new Error('Magic-link authentication is unavailable'), { status: 503 });
  const email = String(emailInput || '').trim().toLowerCase();
  const findUser = options.findUser || defaultFindUser;
  const user = await findUser(email);
  if (!user || user.isActive === false || user.isLocked
    || (user.accountStatus && user.accountStatus !== 'active')) {
    return { accepted: true };
  }

  const nowMs = options.now?.() ?? Date.now();
  const now = new Date(nowMs);
  const rawToken = options.randomToken?.() || crypto.randomBytes(32).toString('hex');
  await (options.cleanupExpiredTokens || defaultCleanup)(now);
  await (options.invalidateTokens || defaultInvalidate)(user.id, now);
  const token = await (options.createToken || MagicLoginToken.create.bind(MagicLoginToken))({
    userId: user.id,
    tokenHash: hashMagicLinkToken(rawToken),
    expiresAt: new Date(nowMs + TOKEN_TTL_MS),
  });

  const returnUrl = normalizeAuthReturnUrl(returnUrlInput);
  const base = options.frontendUrl || frontendBaseUrl();
  const loginUrl = `${base.replace(/\/$/, '')}/login#magic=${encodeURIComponent(rawToken)}&returnUrl=${encodeURIComponent(returnUrl)}`;
  const sendEmail = options.sendEmail || sendEmailNotification;
  const result = await sendEmail({
    to: user.email,
    subject: 'Your SwanStudios sign-in link',
    text: `Sign in to SwanStudios: ${loginUrl} This one-time link expires in 15 minutes. If you did not request it, ignore this email.`,
    html: `<p>Use this one-time link to sign in to SwanStudios:</p><p><a href="${loginUrl}">Sign in securely</a></p><p>It expires in 15 minutes. If you did not request it, ignore this email.</p>`,
  });
  if (!result?.success) {
    await token.destroy().catch(() => undefined);
    logger.error('[magicLink] delivery_failed', { userId: user.id });
  } else {
    logger.info('[magicLink] delivery_succeeded', { userId: user.id });
  }
  return { accepted: true };
}

export async function consumeMagicLink(rawTokenInput, options = {}) {
  const rawToken = String(rawTokenInput || '');
  if (rawToken.length < 8 || rawToken.length > 256) {
    throw Object.assign(new Error('Sign-in link is invalid or expired'), { status: 401 });
  }
  const now = new Date(options.now?.() ?? Date.now());
  const rows = await (options.consumeToken || defaultConsume)(hashMagicLinkToken(rawToken), now);
  const consumed = rows?.[0];
  if (!consumed) throw Object.assign(new Error('Sign-in link is invalid or expired'), { status: 401 });
  const user = await (options.findUserById || User.findByPk.bind(User))(consumed.userId);
  if (!user || user.isActive === false || user.isLocked
    || (user.accountStatus && user.accountStatus !== 'active')) {
    throw Object.assign(new Error('Sign-in link is invalid or expired'), { status: 401 });
  }
  return user;
}