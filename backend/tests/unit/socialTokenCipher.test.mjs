/**
 * Native Social Token Cipher - Unit Tests
 * =======================================
 * Guards encrypted storage for first-party social provider credentials.
 */

import { afterEach, describe, expect, it } from 'vitest';

const ORIGINAL_ENV = {
  SOCIAL_TOKEN_ENCRYPTION_KEY_ID: process.env.SOCIAL_TOKEN_ENCRYPTION_KEY_ID,
  SOCIAL_TOKEN_ENCRYPTION_KEY_TEST: process.env.SOCIAL_TOKEN_ENCRYPTION_KEY_TEST,
};

const restoreEnv = () => {
  if (ORIGINAL_ENV.SOCIAL_TOKEN_ENCRYPTION_KEY_ID === undefined) delete process.env.SOCIAL_TOKEN_ENCRYPTION_KEY_ID;
  else process.env.SOCIAL_TOKEN_ENCRYPTION_KEY_ID = ORIGINAL_ENV.SOCIAL_TOKEN_ENCRYPTION_KEY_ID;

  if (ORIGINAL_ENV.SOCIAL_TOKEN_ENCRYPTION_KEY_TEST === undefined) delete process.env.SOCIAL_TOKEN_ENCRYPTION_KEY_TEST;
  else process.env.SOCIAL_TOKEN_ENCRYPTION_KEY_TEST = ORIGINAL_ENV.SOCIAL_TOKEN_ENCRYPTION_KEY_TEST;
};

describe('socialTokenCipher', () => {
  afterEach(() => {
    restoreEnv();
  });

  it('encrypts and decrypts provider credentials without storing plaintext', async () => {
    process.env.SOCIAL_TOKEN_ENCRYPTION_KEY_ID = 'TEST';
    process.env.SOCIAL_TOKEN_ENCRYPTION_KEY_TEST = Buffer.alloc(32, 7).toString('base64');

    const { encryptSocialCredentials, decryptSocialCredentials } = await import('../../services/socialTokenCipher.mjs');
    const encrypted = encryptSocialCredentials({
      accessJwt: 'access-token',
      refreshJwt: 'refresh-token',
    });

    expect(encrypted.keyId).toBe('TEST');
    expect(encrypted.cipher.toString('utf8')).not.toContain('access-token');
    expect(encrypted.iv).toHaveLength(12);
    expect(encrypted.tag).toHaveLength(16);
    expect(decryptSocialCredentials(encrypted)).toEqual({
      accessJwt: 'access-token',
      refreshJwt: 'refresh-token',
    });
  });

  it('fails closed when the social token encryption key is missing', async () => {
    delete process.env.SOCIAL_TOKEN_ENCRYPTION_KEY_ID;
    delete process.env.SOCIAL_TOKEN_ENCRYPTION_KEY_TEST;

    const { encryptSocialCredentials } = await import('../../services/socialTokenCipher.mjs');

    expect(() => encryptSocialCredentials({ accessJwt: 'secret' }))
      .toThrow('SOCIAL_TOKEN_ENCRYPTION_KEY_ID not set');
  });
});
