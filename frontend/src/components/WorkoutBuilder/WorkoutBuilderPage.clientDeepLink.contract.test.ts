import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { parsePositiveClientId } from './WorkoutBuilderPage.logic';

const pageSource = readFileSync(resolve(process.cwd(), 'src/components/WorkoutBuilder/WorkoutBuilderPage.tsx'), 'utf8');
const logicSource = readFileSync(resolve(process.cwd(), 'src/components/WorkoutBuilder/WorkoutBuilderPage.logic.ts'), 'utf8');

describe('WorkoutBuilderPage client deep-link contract', () => {
  it('adopts a valid clientId query param and blocks invalid generation attempts', () => {
    expect(pageSource).toContain("import { useSearchParams } from 'react-router-dom'");
    expect(pageSource).toContain("searchParams.get('clientId')");
    expect(pageSource).toContain("import { parsePositiveClientId } from './WorkoutBuilderPage.logic'");
    expect(pageSource).toContain('parsePositiveClientId(searchParams.get');
    expect(logicSource).toContain('export const parsePositiveClientId');
    expect(logicSource).toContain("/^[1-9]\\d*$/.test(rawClientId)");
    expect(logicSource).toContain('Number.isSafeInteger(parsedClientId)');
    expect(pageSource).toContain("return queryClientId ? String(queryClientId) : ''");
    expect(pageSource).toContain("setError('Select a valid client before generating.')");
    expect(pageSource).toContain('disabled={loading || !parsedClientId}');
    expect(pageSource).not.toContain('parseInt(clientId, 10)');
  });

  it('parses only exact positive integer client IDs', () => {
    expect(parsePositiveClientId('42')).toBe(42);
    expect(parsePositiveClientId(' 42 ')).toBe(42);
    expect(parsePositiveClientId('42junk')).toBeNull();
    expect(parsePositiveClientId('0')).toBeNull();
    expect(parsePositiveClientId('')).toBeNull();
    expect(parsePositiveClientId(null)).toBeNull();
  });
});
