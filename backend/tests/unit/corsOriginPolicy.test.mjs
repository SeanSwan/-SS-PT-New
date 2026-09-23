/**
 * corsOriginPolicy.test.mjs
 * =========================
 * The HTTP API's CORS policy had NO tests at all before this file, which is how
 * two defects survived fifteen review passes:
 *
 *   1. Localhost dev origins were appended to the allow-list unconditionally,
 *      so production served `Access-Control-Allow-Origin: http://localhost:5173`
 *      together with `Access-Control-Allow-Credentials: true` (CWE-942).
 *   2. `resolveCorsOrigin` reflected ANY origin verbatim whenever
 *      NODE_ENV !== 'production' — reflecting an arbitrary Origin while
 *      allowing credentials.
 *
 * The policy now lives in utils/corsOriginPolicy.mjs as pure functions so these
 * decisions are testable without booting Express (createApp() needs Redis and a
 * live session store, which is why nobody ever wrote this test).
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  PRODUCTION_ORIGINS,
  DEV_HTTP_ORIGINS,
  DEV_SOCKET_ORIGINS,
  buildAllowedOrigins,
  resolveCorsOrigin,
  allowAnyOriginFromEnv,
  parseEnvOrigins,
} from '../../utils/corsOriginPolicy.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Normalize CRLF -> LF before asserting on source text; this checkout has
// core.autocrlf=true and .gitattributes only pins scripts/*.sh to eol=lf.
const readBackendFile = (relativePath) =>
  readFileSync(resolve(__dirname, '../..', relativePath), 'utf8').replace(/\r\n/g, '\n');

const LOCALHOST_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

describe('buildAllowedOrigins — production must not advertise dev origins', () => {
  it('excludes every localhost/127.0.0.1 origin in production', () => {
    const allowed = buildAllowedOrigins({ envOrigins: [], isProduction: true });
    const devLeaks = allowed.filter((origin) => LOCALHOST_PATTERN.test(origin));
    expect(devLeaks).toEqual([]);
  });

  it('excludes the socket dev origins in production too', () => {
    const allowed = buildAllowedOrigins({
      envOrigins: [],
      isProduction: true,
      devOrigins: DEV_SOCKET_ORIGINS,
    });
    const devLeaks = allowed.filter((origin) => LOCALHOST_PATTERN.test(origin));
    expect(devLeaks).toEqual([]);
  });

  it('keeps the real production domains and the env-provided origins', () => {
    const allowed = buildAllowedOrigins({
      envOrigins: ['https://preview.example.com'],
      isProduction: true,
    });
    expect(allowed).toContain('https://sswanstudios.com');
    expect(allowed).toContain('https://www.sswanstudios.com');
    expect(allowed).toContain('https://preview.example.com');
    for (const origin of PRODUCTION_ORIGINS) expect(allowed).toContain(origin);
  });

  it('keeps the standard dev ports available outside production', () => {
    const allowed = buildAllowedOrigins({ envOrigins: [], isProduction: false });
    for (const origin of DEV_HTTP_ORIGINS) expect(allowed).toContain(origin);
  });
});

describe('resolveCorsOrigin — the credentialed-reflection boundary', () => {
  const prodAllowed = buildAllowedOrigins({ envOrigins: [], isProduction: true });

  it('allows an allow-listed origin in production', () => {
    expect(
      resolveCorsOrigin({
        origin: 'https://sswanstudios.com',
        allowedOrigins: prodAllowed,
        isProduction: true,
      }),
    ).toBe('https://sswanstudios.com');
  });

  it('rejects localhost in production even though it is a dev origin (CWE-942 guard)', () => {
    for (const origin of DEV_HTTP_ORIGINS) {
      expect(
        resolveCorsOrigin({ origin, allowedOrigins: prodAllowed, isProduction: true }),
      ).toBeNull();
    }
  });

  it('rejects an arbitrary origin in production even when the opt-in flag is set', () => {
    expect(
      resolveCorsOrigin({
        origin: 'https://evil.example.com',
        allowedOrigins: prodAllowed,
        isProduction: true,
        allowAnyOrigin: true,
      }),
    ).toBeNull();
  });

  it('does NOT reflect an arbitrary origin outside production unless opted in', () => {
    const devAllowed = buildAllowedOrigins({ envOrigins: [], isProduction: false });
    expect(
      resolveCorsOrigin({
        origin: 'https://evil.example.com',
        allowedOrigins: devAllowed,
        isProduction: false,
        allowAnyOrigin: false,
      }),
    ).toBeNull();
  });

  it('reflects an arbitrary origin outside production only when explicitly opted in', () => {
    const devAllowed = buildAllowedOrigins({ envOrigins: [], isProduction: false });
    expect(
      resolveCorsOrigin({
        origin: 'https://odd-dev-port.example.com',
        allowedOrigins: devAllowed,
        isProduction: false,
        allowAnyOrigin: true,
      }),
    ).toBe('https://odd-dev-port.example.com');
  });

  it('returns null for a missing Origin so server-to-server calls are unaffected', () => {
    expect(
      resolveCorsOrigin({ origin: undefined, allowedOrigins: prodAllowed, isProduction: true }),
    ).toBeNull();
    expect(
      resolveCorsOrigin({ origin: null, allowedOrigins: prodAllowed, isProduction: false }),
    ).toBeNull();
  });
});

describe('allowAnyOriginFromEnv / parseEnvOrigins', () => {
  it('is off unless CORS_ALLOW_ANY_ORIGIN is exactly "1"', () => {
    expect(allowAnyOriginFromEnv({})).toBe(false);
    expect(allowAnyOriginFromEnv({ CORS_ALLOW_ANY_ORIGIN: '' })).toBe(false);
    expect(allowAnyOriginFromEnv({ CORS_ALLOW_ANY_ORIGIN: 'true' })).toBe(false);
    expect(allowAnyOriginFromEnv({ CORS_ALLOW_ANY_ORIGIN: '1' })).toBe(true);
  });

  it('parses, trims and drops empties from FRONTEND_ORIGINS', () => {
    expect(parseEnvOrigins('https://a.com, https://b.com ,')).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
    expect(parseEnvOrigins('')).toEqual([]);
    expect(parseEnvOrigins(undefined)).toEqual([]);
  });
});

describe('CORS source ratchet — the allow-list must stay in the shared policy', () => {
  it('core/app.mjs delegates to the shared policy and does not re-inline localhost', () => {
    const app = readBackendFile('core/app.mjs');
    expect(app).toContain("from '../utils/corsOriginPolicy.mjs'");
    expect(app).toContain('buildAllowedOrigins({ envOrigins, isProduction })');
    expect(app).toContain('resolveCorsOrigin({ origin, allowedOrigins, isProduction, allowAnyOrigin })');
    expect(app).not.toContain("'http://localhost:5173',");
  });

  it('socket/socketManager.mjs gates dev origins and drops the localhost fallback', () => {
    const sockets = readBackendFile('socket/socketManager.mjs');
    expect(sockets).toContain('DEV_SOCKET_ORIGINS');
    expect(sockets).toContain("from '../utils/corsOriginPolicy.mjs'");
    expect(sockets).not.toContain("process.env.FRONTEND_URL || 'http://localhost:3000'");
    expect(sockets).not.toContain("'http://127.0.0.1:5173',");
  });
});
