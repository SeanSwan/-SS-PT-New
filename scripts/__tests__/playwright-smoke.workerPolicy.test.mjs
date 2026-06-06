import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const smokeSource = readFileSync(resolve(__dirname, '../qa/playwright-smoke.mjs'), 'utf8');

describe('playwright smoke launcher worker policy', () => {
  it('defaults production and external smoke to one worker while allowing explicit overrides', () => {
    expect(smokeSource).toContain("const workersArg = ownArgs.find(arg => arg.startsWith('--workers='));");
    expect(smokeSource).toContain(
      "const selectedWorkersArg = workersArg || (prod || baseUrlArg || process.env.BASE_URL ? '--workers=1' : '--workers=2');"
    );
    expect(smokeSource).toContain('selectedWorkersArg,');
    expect(smokeSource).toContain('Workers: ${selectedWorkersArg.slice');
  });
});
