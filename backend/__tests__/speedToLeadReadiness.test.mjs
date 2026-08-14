/**
 * speedToLeadReadiness unit tests.
 *
 * Locks the four things this card exists to get right:
 *  1. DARK IS SAFE — flag-off never raises an alarm (it is the designed default).
 *  2. ARMED-BUT-BROKEN IS LOUD — flag-on with an incomplete sender chain blocks,
 *     because that is the state where the operator believes it works and it does not.
 *  3. FLAG PARITY — the card reports exactly what `speedToLeadService.flagEnabled()`
 *     acts on ('true' and nothing else). A card that disagrees with the service is
 *     worse than no card at all.
 *  4. SECRET SAFETY (rule 8 / rule 59) — presence booleans only; no env VALUE ever
 *     reaches the payload.
 *
 * Pure env reads, so no mocks, no DB, no clock.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  buildSpeedToLeadReadiness,
  REPLY_POINTS,
} from '../services/marketingReadiness/speedToLeadReadiness.mjs';

/** Distinctive sentinels so the secret-safety assertion cannot pass by accident. */
const SECRETS = {
  SENDGRID_API_KEY: 'SG.SENTINEL-do-not-leak-abc123',
  SENDGRID_FROM_EMAIL: 'hello@sswanstudios.com',
  SWAN_BUSINESS_ADDRESS: '1 SENTINEL-ADDRESS Way, Anaheim Hills CA',
  SWAN_CONSULT_URL: 'https://sswanstudios.com/SENTINEL-consult',
};

const liveEnv = (over = {}) => ({
  SPEED_TO_LEAD_REPLY_ENABLED: 'true',
  ...SECRETS,
  ...over,
});

const build = (env) => buildSpeedToLeadReadiness({ env, logger: { warn: vi.fn() } });

describe('speedToLeadReadiness', () => {
  describe('dark by default is SAFE, not an alarm', () => {
    it('reports ready + enabled:false when the flag is unset and the sender is configured', () => {
      const card = build({ ...SECRETS });
      expect(card.status).toBe('ready');
      expect(card.enabled).toBe(false);
      expect(card.nextAction).toMatch(/SPEED_TO_LEAD_REPLY_ENABLED=true/);
    });

    it('stays ready (never blocked) when dark AND the sender chain is incomplete', () => {
      // Nothing is broken yet — nothing is trying to send.
      const card = build({});
      expect(card.status).toBe('ready');
      expect(card.enabled).toBe(false);
      expect(card.nextAction).toMatch(/Complete the sender chain/);
    });
  });

  describe('flag parity with speedToLeadService.flagEnabled()', () => {
    it.each(['TRUE', 'True', '1', 'yes', 'on', '', ' true '])(
      'treats %o as DARK (only the exact string "true" arms it)',
      (value) => {
        const card = build({ ...SECRETS, SPEED_TO_LEAD_REPLY_ENABLED: value });
        expect(card.enabled).toBe(false);
      },
    );

    it('treats the exact string "true" as armed', () => {
      expect(build(liveEnv()).enabled).toBe(true);
    });
  });

  describe('armed but broken is LOUD', () => {
    it('blocks when armed without SENDGRID_API_KEY', () => {
      const card = build(liveEnv({ SENDGRID_API_KEY: undefined }));
      expect(card.status).toBe('blocked');
      expect(card.nextAction).toMatch(/SENDGRID_API_KEY/);
    });

    it('blocks when armed without SENDGRID_FROM_EMAIL', () => {
      const card = build(liveEnv({ SENDGRID_FROM_EMAIL: undefined }));
      expect(card.status).toBe('blocked');
      expect(card.nextAction).toMatch(/SENDGRID_FROM_EMAIL/);
    });

    it('degrades when armed with an off-domain from-address (SPF/DKIM misalignment)', () => {
      const card = build(liveEnv({ SENDGRID_FROM_EMAIL: 'owner@examplemail.test' }));
      expect(card.status).toBe('degraded');
      expect(card.fromEmailOnBrandDomain).toBe(false);
      expect(card.note).toMatch(/spam/i);
    });

    it.each([
      'hi@notsswanstudios.com.evil.tld', // brand domain is not at the end
      'hi@evil-sswanstudios.com', // hyphen prefix, no @ or . boundary
      'hi@sswanstudios.com.evil.tld', // brand domain present but not terminal
      'sswanstudios.com@gmail.com', // brand domain in the LOCAL part
    ])('does not mistake the lookalike %o for the brand domain', (address) => {
      const card = build(liveEnv({ SENDGRID_FROM_EMAIL: address }));
      expect(card.fromEmailOnBrandDomain).toBe(false);
      expect(card.status).toBe('degraded');
    });

    it.each([
      'hello@sswanstudios.com', // apex
      'hello@mail.sswanstudios.com', // subdomain — DMARC relaxed alignment
      'HELLO@SSWANSTUDIOS.COM', // case-insensitive
    ])('accepts %o as on-brand (relaxed alignment)', (address) => {
      const card = build(liveEnv({ SENDGRID_FROM_EMAIL: address }));
      expect(card.fromEmailOnBrandDomain).toBe(true);
      expect(card.status).toBe('ready');
    });
  });

  describe('fully live', () => {
    it('reports ready + LIVE with the whole chain configured', () => {
      const card = build(liveEnv());
      expect(card.status).toBe('ready');
      expect(card.enabled).toBe(true);
      expect(card.note).toMatch(/LIVE/);
      expect(card.nextAction).toBeNull();
    });

    it('stays ready but surfaces the placeholder footer when the postal address is unset', () => {
      // Runbook classes this "recommended, still sends" — so status must NOT
      // degrade, but the operator must still be told.
      const card = build(liveEnv({ SWAN_BUSINESS_ADDRESS: undefined }));
      expect(card.status).toBe('ready');
      expect(card.businessAddressConfigured).toBe(false);
      expect(card.nextAction).toMatch(/SWAN_BUSINESS_ADDRESS/);
    });
  });

  describe('reply-point coverage is stated honestly', () => {
    it('claims only the three surfaces that actually call sendSpeedToLeadReply', () => {
      expect(build(liveEnv()).replyPoints).toEqual({
        consult: true,
        contact: true,
        prism: true,
        newsletter: false,
        signup: false,
        checkout: false,
      });
    });

    it('returns a copy so a caller cannot mutate the shared constant', () => {
      const card = build(liveEnv());
      card.replyPoints.newsletter = true;
      expect(REPLY_POINTS.newsletter).toBe(false);
    });
  });

  describe('secret safety (rule 8 / rule 59)', () => {
    it('never emits an env VALUE — only presence booleans', () => {
      const serialized = JSON.stringify(build(liveEnv()));
      for (const value of Object.values(SECRETS)) {
        expect(serialized).not.toContain(value);
      }
      // The sentinel fragments must not survive in any partial form either.
      expect(serialized).not.toMatch(/SENTINEL/);
      expect(serialized).not.toMatch(/SG\./);
    });

    it('does not leak the from-address even when it is off-domain and reported as such', () => {
      const serialized = JSON.stringify(build(liveEnv({ SENDGRID_FROM_EMAIL: 'owner@examplemail.test' })));
      expect(serialized).not.toContain('owner@examplemail.test');
      expect(serialized).not.toContain('examplemail');
    });
  });

  describe('fail-soft', () => {
    it('degrades instead of throwing when the env source explodes', () => {
      const hostileEnv = new Proxy({}, {
        get() { throw new Error('env exploded'); },
      });
      const warn = vi.fn();
      const card = buildSpeedToLeadReadiness({ env: hostileEnv, logger: { warn } });
      expect(card.status).toBe('degraded');
      expect(card.enabled).toBe(false);
      expect(card.error).toBe('speed-to-lead state unavailable');
      expect(warn).toHaveBeenCalled();
    });
  });
});
