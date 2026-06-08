import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const legacySessionRoutesSource = readFileSync(
  resolve(__dirname, '../../routes/sessionRoutes.mjs'),
  'utf8'
);

const getServerErrorResponses = () => [
  ...legacySessionRoutesSource.matchAll(/res\.status\(500\)\.json\(\{[\s\S]*?\}\);/g)
].map(([block]) => block);

describe('legacy session route disclosure guard', () => {
  it('does not return raw thrown errors from legacy 500 responses', () => {
    const leakingResponses = getServerErrorResponses().filter((block) => (
      /message:\s*error\.message/.test(block) ||
      /message:[\s\S]{0,80}error\.message\s*\|\|/.test(block) ||
      /error:\s*error\.message/.test(block) ||
      /error:\s*process\.env\.NODE_ENV/.test(block)
    ));

    expect(leakingResponses).toEqual([]);
  });

  it('does not include raw per-item update errors in successful bulk responses', () => {
    expect(legacySessionRoutesSource)
      .not.toContain('errors.push({ id: update.id, error: updateError.message });');
  });
});
