/**
 * Locks the production smoke console policy for service worker registration.
 * Browsers and Playwright can intentionally block service workers; that path
 * must not emit console.error because dashboard QA treats console errors as
 * actionable runtime failures.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'src/utils/serviceWorkerRegistration.js'), 'utf8');

describe('serviceWorkerRegistration console policy', () => {
  it('does not emit a console error when registration is blocked or unavailable', () => {
    expect(source).toContain("logger.warn('SW: Service worker registration failed:'");
    expect(source).not.toContain("console.error('SW: Service worker registration failed:'");
  });
});
