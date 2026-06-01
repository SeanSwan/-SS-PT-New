import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { parseTrainerClientId } from './trainerClientSource';

const assessmentsSourcePath = resolve(__dirname, './TrainerAssessmentsPage.tsx');

describe('TrainerAssessmentsPage client identity boundary', () => {
  it('parses only strict positive integer trainer client ids', () => {
    expect(parseTrainerClientId('515151')).toBe(515151);
    expect(parseTrainerClientId(' 515151 ')).toBe(515151);
    expect(parseTrainerClientId(515151)).toBe(515151);
    expect(parseTrainerClientId('515151junk')).toBeNull();
    expect(parseTrainerClientId('0')).toBeNull();
    expect(parseTrainerClientId(Number.NaN)).toBeNull();
    expect(parseTrainerClientId(null)).toBeNull();
  });

  it('uses the strict client id for movement-analysis payloads and submit gating', () => {
    const source = readFileSync(assessmentsSourcePath, 'utf8');

    expect(source).toContain('const parsedClientId = parseTrainerClientId(clientId);');
    expect(source).toContain('const buildPayload = useCallback((targetClientId: number) => {');
    expect(source).toContain('clients.find(c => c.id === targetClientId)');
    expect(source).toContain('userId: targetClientId');
    expect(source).toContain('buildPayload(parsedClientId)');
    expect(source).toContain('parsedClientId === null');
    expect(source).not.toContain('c.id === Number(clientId)');
    expect(source).not.toContain('userId: Number(clientId)');
  });
});
