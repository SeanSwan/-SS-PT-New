import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { redactRequestUrl } from '../../core/middleware/index.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('request logging redacts credentials (U-06)', () => {
  it('redacts the gallery ?token= channel', () => {
    // E-02 kept ?token= for GETs because <img>/<a> cannot set headers, so this
    // URL shape is live in production and was being written to combined.log.
    const url = '/api/gallery/events/spring-2026/download-all?token=eyJhbGciOiJIUzI1NiJ9.SECRET';
    expect(redactRequestUrl(url)).toBe('/api/gallery/events/spring-2026/download-all?token=[REDACTED]');
  });

  it('redacts every credential-shaped key', () => {
    const url = '/x?access_token=ZQ1&refresh_token=ZQ2&email=zzq@example.com'
      + '&password=ZQ3&session_id=ZQ4&code=ZQ5&state=ZQ6';
    const out = redactRequestUrl(url);
    // no secret value survives (note: [REDACTED] itself contains no ZQ)
    expect(out).not.toContain('ZQ');
    expect(out).not.toContain('zzq@example.com');
    expect(out).toContain('access_token=[REDACTED]');
    expect(out).toContain('refresh_token=[REDACTED]');
    expect(out).toContain('email=[REDACTED]');
    expect(out).toContain('password=[REDACTED]');
    expect(out).toContain('session_id=[REDACTED]');
  });

  it('leaves ordinary query params intact', () => {
    expect(redactRequestUrl('/api/items?page=2&limit=50&sort=name'))
      .toBe('/api/items?page=2&limit=50&sort=name');
  });

  it('handles mixed sensitive and ordinary params', () => {
    expect(redactRequestUrl('/a?page=2&token=SECRET&limit=10'))
      .toBe('/a?page=2&token=[REDACTED]&limit=10');
  });

  it('is case-insensitive on key names', () => {
    expect(redactRequestUrl('/a?TOKEN=SECRET')).toBe('/a?TOKEN=[REDACTED]');
    expect(redactRequestUrl('/a?Token=SECRET')).toBe('/a?Token=[REDACTED]');
  });

  it('returns URLs without a query string unchanged', () => {
    expect(redactRequestUrl('/api/health')).toBe('/api/health');
    expect(redactRequestUrl('')).toBe('');
    expect(redactRequestUrl(undefined)).toBe('');
  });

  it('is actually wired into the request logger', () => {
    const source = readFileSync(join(__dirname, '../../core/middleware/index.mjs'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, ' ');
    expect(source).toContain('${redactRequestUrl(req.url)}');
    // the raw url must not be logged any more
    expect(source).not.toContain('${req.method} ${req.url}');
  });
});

describe('readiness probe exists alongside liveness (U-07)', () => {
  const source = readFileSync(join(__dirname, '../../routes/healthRoutes.mjs'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ');

  it('exposes /ready separately from the liveness /', () => {
    expect(source).toContain("router.get('/ready'");
    expect(source).toContain("router.get('/'");
  });

  it('returns 503 when a gating dependency fails', () => {
    expect(source).toContain('ready ? 200 : 503');
    expect(source).toContain('sequelize.authenticate()');
  });

  it('does not let a Stripe outage mark the instance unready', () => {
    // Stripe is reported, never gating: otherwise a third-party blip pulls
    // every instance out of rotation and takes the whole site down.
    expect(source).toContain("checks.stripe = process.env.STRIPE_SECRET_KEY ? 'configured' : 'not-configured'");
    expect(source).toContain('deliberately NOT gating');
  });
});
