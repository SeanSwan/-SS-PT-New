import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { parseTrainerClientManagementId } from './MyClientsView.logic';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SOURCE = readFileSync(resolve(__dirname, './MyClientsView.tsx'), 'utf8');

describe('MyClientsView trainer client identity boundary', () => {
  it('accepts only strict positive integer client ids for Copilot actions', () => {
    expect(parseTrainerClientManagementId('42')).toBe(42);
    expect(parseTrainerClientManagementId(42)).toBe(42);

    expect(parseTrainerClientManagementId('42abc')).toBeNull();
    expect(parseTrainerClientManagementId('')).toBeNull();
    expect(parseTrainerClientManagementId('0')).toBeNull();
    expect(parseTrainerClientManagementId(Number.NaN)).toBeNull();
    expect(parseTrainerClientManagementId(null)).toBeNull();
  });

  it('does not launch Workout Copilot with loose Number coercion', () => {
    expect(SOURCE).toContain('parseTrainerClientManagementId(clientId)');
    expect(SOURCE).not.toMatch(/id:\s*Number\(clientId\)/);
  });
});
