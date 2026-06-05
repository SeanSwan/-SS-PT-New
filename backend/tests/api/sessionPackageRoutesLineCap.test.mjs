import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function lineCount(relativePath) {
  return readFileSync(resolve(__dirname, relativePath), 'utf8').split(/\r?\n/).length;
}

describe('session package route module size', () => {
  it('keeps the canonical checkout/webhook route module under the 300-line cap', () => {
    expect(lineCount('../../routes/sessionPackageRoutes.mjs')).toBeLessThanOrEqual(300);
  });

  it('keeps extracted manual grant routes under the 300-line cap', () => {
    expect(lineCount('../../routes/sessionPackageManualGrantRoutes.mjs')).toBeLessThanOrEqual(300);
  });
});
