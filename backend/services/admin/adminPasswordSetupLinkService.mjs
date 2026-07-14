/**
 * adminPasswordSetupLinkService.mjs
 * =================================
 * Owner-gated generation of a one-time password set/reset link for a chosen
 * client, so the owner admin can copy it and text it to the client directly
 * (no email delivery required).
 *
 * Reuses the EXACT token mechanism of the forgot-password flow:
 * - same User columns (resetPasswordToken / resetPasswordExpires)
 * - same HMAC hashing (hashPasswordResetToken)
 * - same frontend consume page (/reset-password/:token -> POST /api/auth/reset-password)
 *
 * The only difference: expiry is 24h (per-row resetPasswordExpires supports
 * per-token expiry) instead of the email flow's 1h, because a texted link is
 * opened on the client's schedule.
 *
 * SECURITY: the raw link is response-only. It is never logged and never
 * stored — only its HMAC hash lands in the database.
 */
import crypto from 'crypto';
import User from '../../models/User.mjs';
import { requireOwnerAdmin } from './adminOwnerGate.mjs';
import {
  getPasswordResetSecret,
  hashPasswordResetToken,
} from '../auth/passwordResetEmailService.mjs';

const TOKEN_BYTES = 32;
export const PASSWORD_SETUP_LINK_TTL_MS = 24 * 60 * 60 * 1000; // 24h admin flow only

export class AdminPasswordSetupLinkError extends Error {
  constructor(message, statusCode = 400, code = 'PASSWORD_SETUP_LINK_FAILED') {
    super(message);
    this.name = 'AdminPasswordSetupLinkError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Generate a one-time password setup link for a non-admin account.
 * Owner-admin gated (same gate as impersonation/account commands).
 *
 * @returns {{ success: true, link: string, expiresAt: string, expiresInMinutes: number }}
 */
export const createPasswordSetupLink = async ({
  actor,
  targetUserId,
  env = process.env,
  UserModel = User,
  resetSecret,
  now = Date.now,
  randomBytes = crypto.randomBytes,
} = {}) => {
  requireOwnerAdmin(actor, env);

  const normalizedId = String(targetUserId ?? '').trim();
  if (!normalizedId) {
    throw new AdminPasswordSetupLinkError(
      'A target user id is required.',
      400,
      'PASSWORD_SETUP_TARGET_REQUIRED'
    );
  }

  const target = await UserModel.findByPk(normalizedId);
  if (!target) {
    throw new AdminPasswordSetupLinkError(
      'Target account was not found.',
      404,
      'PASSWORD_SETUP_TARGET_NOT_FOUND'
    );
  }
  if (target.role === 'admin') {
    throw new AdminPasswordSetupLinkError(
      'Password setup links cannot be generated for admin accounts.',
      403,
      'PASSWORD_SETUP_TARGET_FORBIDDEN'
    );
  }
  if (target.isActive === false) {
    // reset-password consume requires isActive: true, so a link would be dead on arrival.
    throw new AdminPasswordSetupLinkError(
      'Account is inactive. Reactivate it before generating a password setup link.',
      409,
      'PASSWORD_SETUP_TARGET_INACTIVE'
    );
  }
  if (typeof target.update !== 'function') {
    throw new AdminPasswordSetupLinkError(
      'Target account cannot store a password reset token.',
      500,
      'PASSWORD_SETUP_TARGET_UNSUPPORTED'
    );
  }

  const secret = resetSecret || getPasswordResetSecret();
  const rawToken = randomBytes(TOKEN_BYTES).toString('hex');
  const hashedToken = hashPasswordResetToken(rawToken, secret);
  const resetPasswordExpires = new Date(now() + PASSWORD_SETUP_LINK_TTL_MS);

  await target.update({
    resetPasswordToken: hashedToken,
    resetPasswordExpires,
  });

  const frontendUrl = String(env.FRONTEND_URL || 'https://sswanstudios.com').replace(/\/$/, '');
  const link = `${frontendUrl}/reset-password/${rawToken}`;

  return {
    success: true,
    link,
    expiresAt: resetPasswordExpires.toISOString(),
    expiresInMinutes: Math.round(PASSWORD_SETUP_LINK_TTL_MS / 60000),
  };
};

export default {
  PASSWORD_SETUP_LINK_TTL_MS,
  AdminPasswordSetupLinkError,
  createPasswordSetupLink,
};
