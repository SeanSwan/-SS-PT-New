import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const authSource = readFileSync(resolve(__dirname, '../../controllers/authController.mjs'), 'utf8');

const sliceFrom = (source, startNeedle, endNeedle) => {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
};

describe('auth controller onboarding completion contract', () => {
  it('exposes User.isOnboardingComplete through sanitized auth user payloads', () => {
    const sanitizeBlock = sliceFrom(
      authSource,
      'const sanitizeUser = (user) => {',
      'async function withWaiverAccessStatus(user)'
    );

    expect(sanitizeBlock).toContain('isOnboardingComplete: user.isOnboardingComplete === true');
    expect(sanitizeBlock).toContain('emailNotifications: user.emailNotifications !== false');
    expect(sanitizeBlock).toContain('smsNotifications: user.smsNotifications !== false');
    expect(sanitizeBlock).toContain('notificationPreferences: user.notificationPreferences ?? null');
  });

  it('routes login, profile, validation, and forced password responses through the sanitizer', () => {
    expect(authSource).toMatch(/export const login[\s\S]*user: await withWaiverAccessStatus\(user\)/);
    expect(authSource).toMatch(/export const getProfile[\s\S]*user: await withWaiverAccessStatus\(user\)/);
    expect(authSource).toMatch(/export const validateToken[\s\S]*user: await withWaiverAccessStatus\(user\)/);
    expect(authSource).toMatch(/export const changePasswordForced[\s\S]*user: await withWaiverAccessStatus\(user\)/);
  });
});
