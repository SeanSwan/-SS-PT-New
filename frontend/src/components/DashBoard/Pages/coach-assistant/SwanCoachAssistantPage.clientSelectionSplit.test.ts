import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readCoachFile = (filePath: string) =>
  readFileSync(resolve(__dirname, filePath), 'utf8');

describe('SwanCoachAssistantPage client-selection split', () => {
  it('keeps URL hydration in a capped hook instead of the page shell', () => {
    const pageSource = readCoachFile('./SwanCoachAssistantPage.tsx');
    const hookSource = readCoachFile('./hooks/useSwanCoachClientSelection.ts');

    expect(pageSource).toContain("from './hooks/useSwanCoachClientSelection'");
    expect(pageSource).toContain('useSwanCoachClientSelection(userRole)');
    expect(pageSource).not.toContain("from '../../../../context/GlobalClientContext'");
    expect(pageSource).not.toContain('useSearchParams');
    expect(pageSource).not.toContain('clientListFetchStartedRef');

    expect(hookSource).toContain("from '../../../../../context/GlobalClientContext'");
    expect(hookSource).toContain("from '../CoachCommandCenter.logic'");
    expect(hookSource).toContain('useSearchParams');
    expect(hookSource).toContain('clientListFetchStartedRef');
    expect(hookSource).toContain("parseRouteClientId(searchParams.get('clientId'))");
    expect(hookSource).not.toContain('parseInt(');
    expect(hookSource).toMatch(/!clientListFetchStartedRef\.current\s*&&\s*clientList\.length\s*>\s*0/);
    expect(hookSource).toMatch(/if\s*\(!clientListFetchStartedRef\.current\)\s*return;/);
    expect(hookSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
