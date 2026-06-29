import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

const getMissingFrontendFallback = () => {
  const start = coreRoutesSource.indexOf('// Fallback error handler for missing frontend');
  const end = coreRoutesSource.indexOf('res.status(503).json', start);

  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);

  return coreRoutesSource.slice(start, end);
};

describe('SPA fallback static resource contract', () => {
  it('keeps static resource probes out of the missing-frontend 503 fallback', () => {
    const fallbackSource = getMissingFrontendFallback();

    expect(fallbackSource).toContain("requestPath.includes('favicon.ico')");
    expect(fallbackSource).toContain("requestPath.includes('robots.txt')");
    expect(fallbackSource).toContain("requestPath.includes('sitemap.xml')");
    expect(fallbackSource).toContain("requestPath.includes('.well-known')");
    expect(fallbackSource).toContain('staticAssetPattern.test(requestPath)');
    expect(fallbackSource).toContain("res.status(404).send('Resource not found')");
    expect(fallbackSource).toContain("res.status(404).send('Static asset not found')");
    expect(fallbackSource).not.toContain('Frontend not available');
  });
});
