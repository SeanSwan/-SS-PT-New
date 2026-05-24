import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const viewSource = readFileSync(resolve(__dirname, './ChallengesView.tsx'), 'utf8');
const hookSource = readFileSync(resolve(__dirname, '../../../hooks/useChallenges.ts'), 'utf8');

describe('ChallengesView truth contract', () => {
  it('does not enable fake challenge cards when the live challenges API is unavailable', () => {
    expect(hookSource).toContain('setChallenges([])');
    expect(hookSource).not.toContain('setIsDemoData(true)');
    expect(viewSource).toContain('honest empty state when no live challenges are available');
    expect(viewSource).toContain('const RETIRED_CHALLENGE_FIXTURE: Challenge[] = [];');
    expect(viewSource).toContain('const displayData = isDemoData ? RETIRED_CHALLENGE_FIXTURE : challenges;');
    expect(viewSource).not.toContain('Use API data when available, mock data as fallback');
  });
});
