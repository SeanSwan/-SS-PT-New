/**
 * coachProposalDisclosureGuard.test.mjs
 * =====================================
 * Regression guards for Swan Coach proposal public error contracts.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROPOSAL_ROUTES_SRC = readFileSync(
  resolve(__dirname, '../../routes/coachProposalRoutes.mjs'),
  'utf8',
);

describe('coach proposal route disclosure guard', () => {
  it('does not echo raw exception messages from public route catches', () => {
    expect(PROPOSAL_ROUTES_SRC).not.toMatch(/err\.message\s*\|\|/);
    expect(PROPOSAL_ROUTES_SRC).not.toMatch(/error:\s*err\.message/);
    expect(PROPOSAL_ROUTES_SRC).not.toMatch(/message:\s*err\.message/);
  });
});
