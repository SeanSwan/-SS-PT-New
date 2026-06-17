import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('serviceWorkerRegistration console policy', () => {
  it('does not emit a console error when registration is blocked or unavailable', () => {
    const source = readFileSync(join(process.cwd(), 'src/utils/serviceWorkerRegistration.js'), 'utf8');

    expect(source).toContain("logger.warn('SW: Service worker registration failed:'");
    expect(source).not.toContain("console.error('SW: Service worker registration failed:'");
  });
});
