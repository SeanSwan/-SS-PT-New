import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { anonymizeVisitorIp } from '../../services/pageViewCache.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sessionSource = readFileSync(join(__dirname, '../../config/session.mjs'), 'utf8');
const pageViewSource = readFileSync(join(__dirname, '../../services/pageViewCache.mjs'), 'utf8');
const compact = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

/**
 * Hostile-review regression: hardcoded fallback session secret + public
 * IP-anonymisation salt literal. A secret everyone can read signs sessions
 * anyone can forge; a known salt makes HMAC'd IPv4 addresses
 * dictionary-reversible (2^32 space).
 */
describe('session secret never falls back to a public literal', () => {
  it('has no hardcoded fallback secret string', () => {
    expect(compact(sessionSource)).not.toContain('fallback-secret-change-in-production');
  });

  it('generates a per-process secret outside production instead', () => {
    expect(compact(sessionSource)).toContain('randomBytes(32)');
  });

  it('still throws in production when no secret is configured', () => {
    expect(compact(sessionSource)).toContain("'SESSION_SECRET or JWT_SECRET is required in production'");
  });
});

describe('IP anonymisation salt (pageViewCache)', () => {
  const ENV_KEYS = ['PAGE_VIEW_ANONYMIZATION_SALT', 'JWT_SECRET', 'SESSION_SECRET', 'NODE_ENV'];
  let saved;

  beforeEach(() => {
    saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
    delete process.env.PAGE_VIEW_ANONYMIZATION_SALT;
    delete process.env.JWT_SECRET;
    delete process.env.SESSION_SECRET;
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('throws in production rather than hash IPs with the public salt', () => {
    process.env.NODE_ENV = 'production';
    expect(() => anonymizeVisitorIp('203.0.113.7')).toThrow(/PAGE_VIEW_ANONYMIZATION_SALT/);
  });

  it('uses the configured salt when one is set (production safe path)', () => {
    process.env.NODE_ENV = 'production';
    process.env.PAGE_VIEW_ANONYMIZATION_SALT = 'test-salt';
    expect(anonymizeVisitorIp('203.0.113.7')).toMatch(/^pv_[0-9a-f]{32}$/);
  });

  it('stays deterministic in development (dev salt retained deliberately)', () => {
    process.env.NODE_ENV = 'development';
    const a = anonymizeVisitorIp('203.0.113.7');
    const b = anonymizeVisitorIp('203.0.113.7');
    expect(a).toBe(b);
    expect(a).toMatch(/^pv_[0-9a-f]{32}$/);
  });

  it('keeps the production guard in the source', () => {
    expect(compact(pageViewSource)).toContain("process.env.NODE_ENV === 'production'");
    expect(compact(pageViewSource)).toContain('warnedAboutFallbackSalt');
  });
});
