import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..', '..');

function readRepo(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function serviceBlock(renderYaml, serviceName) {
  const lines = renderYaml.split(/\r?\n/);
  const start = lines.findIndex((line) => line.match(new RegExp(`^\\s+name:\\s+${serviceName}\\s*$`)));
  expect(start).toBeGreaterThanOrEqual(0);
  let serviceStart = start;
  while (serviceStart > 0 && !lines[serviceStart].match(/^[ ]{2}- type:\s+/)) {
    serviceStart -= 1;
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].match(/^[ ]{2}- type:\s+/) || lines[i].match(/^[a-zA-Z]+:/)) {
      end = i;
      break;
    }
  }
  return lines.slice(serviceStart, end).join('\n');
}

describe('release verification automation guards', () => {
  it('keeps required production payment secrets in the main Render service', () => {
    const renderYaml = readRepo('render.yaml');
    const main = serviceBlock(renderYaml, 'swanstudios-main');

    for (const key of [
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'VITE_STRIPE_PUBLISHABLE_KEY',
      'ENCRYPTION_MASTER_KEY',
    ]) {
      expect(main).toContain(`key: ${key}`);
      expect(main).toMatch(new RegExp(`key:\\s+${key}[\\s\\S]*?sync:\\s+false`));
    }
  });

  it('pins frontend Socket.IO clients to the backend socket origin', () => {
    const renderYaml = readRepo('render.yaml');
    const frontend = serviceBlock(renderYaml, 'swanstudios-frontend');

    expect(frontend).toContain('key: VITE_SOCKET_URL');
    expect(frontend).toContain('value: https://ss-pt-new.onrender.com');
  });

  it('rolls back both payment idempotency indexes in the migration down path', () => {
    const migration = readRepo('backend/migrations/retired-mjs-20260804/20260520000001-add-payment-idempotency-unique-indexes.mjs');

    expect(migration).toContain('DROP INDEX IF EXISTS "${PRINT_ORDER_INDEX}"');
    expect(migration).toContain('DROP INDEX IF EXISTS "${ORDER_INDEX}"');
  });

  it('ships release verification scripts with redaction and write gates', () => {
    const releaseVerifier = path.join(repoRoot, 'scripts/qa/release-verification.mjs');
    const releaseVerifierPs = path.join(repoRoot, 'scripts/qa/release-verification.ps1');
    const nativeSecretScan = path.join(repoRoot, 'scripts/qa/secret-scan-lite.mjs');
    const renderPreflight = path.join(repoRoot, 'scripts/qa/render-payment-preflight.mjs');
    const stripeReplay = path.join(repoRoot, 'scripts/qa/stripe-testmode-replay.mjs');

    expect(existsSync(releaseVerifier)).toBe(true);
    expect(existsSync(releaseVerifierPs)).toBe(true);
    expect(existsSync(nativeSecretScan)).toBe(true);
    expect(existsSync(renderPreflight)).toBe(true);
    expect(existsSync(stripeReplay)).toBe(true);

    expect(readFileSync(releaseVerifier, 'utf8')).toContain('<REDACTED>');
    expect(readFileSync(releaseVerifierPs, 'utf8')).toContain('<REDACTED>');
    expect(readFileSync(nativeSecretScan, 'utf8')).toContain('stripe-secret');
    expect(readFileSync(renderPreflight, 'utf8')).toContain('read-only');
    expect(readFileSync(stripeReplay, 'utf8')).toContain('SWAN_RELEASE_ALLOW_TEST_WRITES');
    expect(readFileSync(stripeReplay, 'utf8')).toContain('SWAN_RELEASE_ALLOW_PROD_TEST_WRITE');
  });
});
