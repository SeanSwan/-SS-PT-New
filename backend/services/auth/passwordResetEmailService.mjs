/**
 * passwordResetEmailService.mjs
 * =============================
 * Shared reset-link email flow for account recovery and admin-triggered
 * credential help. This service never accepts or returns a new password.
 */
import crypto from 'crypto';
import logger from '../../utils/logger.mjs';
import { sendEmailNotification } from '../../utils/notification.mjs';

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const INSECURE_JWT_PLACEHOLDERS = new Set([
  'your-secret-key',
  'your-secret-key-change-in-production',
  'your-production-jwt-secret-key-here-change-this',
]);

function createSecretConfigurationError(secretName) {
  const error = new Error(`${secretName} is not configured`);
  error.name = 'JwtSecretConfigurationError';
  return error;
}

function resolveSecret(secretName, secret) {
  if (!secret || INSECURE_JWT_PLACEHOLDERS.has(secret)) {
    throw createSecretConfigurationError(secretName);
  }
  return secret;
}

export function getPasswordResetSecret() {
  if (process.env.PASSWORD_RESET_SECRET) {
    return resolveSecret('PASSWORD_RESET_SECRET', process.env.PASSWORD_RESET_SECRET);
  }

  return resolveSecret('JWT_SECRET', process.env.JWT_SECRET);
}

export function hashPasswordResetToken(rawToken, resetSecret = getPasswordResetSecret()) {
  return crypto.createHmac('sha256', resetSecret).update(rawToken).digest('hex');
}

export class PasswordResetEmailDeliveryError extends Error {
  constructor(message, {
    resetUrl,
    resetExpiresAt,
    expiresInMinutes,
    cause,
  } = {}) {
    super(message);
    this.name = 'PasswordResetEmailDeliveryError';
    this.emailSent = false;
    this.expiresInMinutes = expiresInMinutes;
    if (resetUrl) this.resetUrl = resetUrl;
    if (resetExpiresAt) this.resetExpiresAt = resetExpiresAt;
    if (cause) this.cause = cause;
  }
}
export async function sendPasswordResetEmailForUser(user, options = {}) {
  const email = typeof user?.email === 'string' ? user.email.trim() : '';
  if (!email) {
    throw new Error('Client account does not have an email address for password reset.');
  }
  if (typeof user.update !== 'function') {
    throw new Error('Client account cannot store a password reset token.');
  }

  const now = typeof options.now === 'function' ? options.now() : Date.now();
  const resetSecret = options.resetSecret || getPasswordResetSecret();
  const sendEmail = options.sendEmail || sendEmailNotification;
  const frontendUrl = options.frontendUrl || process.env.FRONTEND_URL || 'https://sswanstudios.com';
  const includeResetUrl = options.includeResetUrl === true;
  const expiresInMinutes = Math.round(RESET_TOKEN_TTL_MS / 60000);

  const rawToken = crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
  const hashedToken = hashPasswordResetToken(rawToken, resetSecret);
  const resetPasswordExpires = new Date(now + RESET_TOKEN_TTL_MS);

  await user.update({
    resetPasswordToken: hashedToken,
    resetPasswordExpires,
  });

  const resetUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password/${rawToken}`;
  const emailResult = await sendEmail({
    to: email,
    subject: 'SwanStudios Password Reset',
    html: `<p>You requested a password reset for your SwanStudios account.</p>
           <p>Click <a href="${resetUrl}">here</a> to reset your password.</p>
           <p>This link expires in 1 hour. If you did not request this, please ignore this email.</p>`,
    text: `Reset your SwanStudios password: ${resetUrl} (expires in 1 hour). If you did not request this, please ignore this email.`,
  });

  if (!emailResult?.success) {
    logger.error('[passwordResetEmailService] email_send_failed', {
      userId: user.id,
      error: emailResult?.error?.message || 'unknown',
    });
    throw new PasswordResetEmailDeliveryError('Password reset email could not be sent.', {
      resetUrl: includeResetUrl ? resetUrl : undefined,
      resetExpiresAt: includeResetUrl ? resetPasswordExpires.toISOString() : undefined,
      expiresInMinutes,
      cause: emailResult?.error,
    });
  }

  logger.info('[passwordResetEmailService] email_send_success', { userId: user.id });
  return {
    emailSent: true,
    expiresInMinutes,
    ...(includeResetUrl ? {
      resetUrl,
      resetExpiresAt: resetPasswordExpires.toISOString(),
    } : {}),
  };
}

export default {
  getPasswordResetSecret,
  hashPasswordResetToken,
  PasswordResetEmailDeliveryError,
  sendPasswordResetEmailForUser,
};
