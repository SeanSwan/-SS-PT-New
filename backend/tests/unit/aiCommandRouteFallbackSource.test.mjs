/**
 * aiCommandRouteFallbackSource.test.mjs
 * =====================================
 * Source guard for command-lane fallback into Swan Coach chat/proposals.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROUTE_SOURCE = readFileSync(resolve(__dirname, '../../routes/aiCommandRoutes.mjs'), 'utf8');

describe('aiCommandRoutes not-wired fallback source guard', () => {
  it('routes selected not-wired commands back to chat instead of dead-ending', () => {
    expect(ROUTE_SOURCE).toMatch(/shouldFallbackNotWiredCommandToChat/);
    expect(ROUTE_SOURCE).toMatch(/ctx\.result\?\.type === 'not_wired'/);
    expect(ROUTE_SOURCE).toMatch(/fallbackToChat:\s*true/);
  });
});
