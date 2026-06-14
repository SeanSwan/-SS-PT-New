import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readCoachFile = (fileName: string) => readFileSync(resolve(__dirname, fileName), 'utf8');

describe('SwanCoachAssistantPage Teach Me route prompt', () => {
  it('stages teachPrompt from the route through a focused hook', () => {
    const pageSource = readCoachFile('SwanCoachAssistantPage.tsx');
    const hookSource = readCoachFile('./hooks/useSwanCoachRoutePrompt.ts');

    expect(pageSource).toContain("import { useSwanCoachRoutePrompt } from './hooks/useSwanCoachRoutePrompt';");
    expect(pageSource).toContain('useSwanCoachRoutePrompt({ searchParams, routeState: location.state, injectInputText });');
    expect(hookSource).toContain("searchParams.get('teachPrompt')");
    expect(hookSource).toContain('injectInputText(prompt)');
    expect(hookSource).not.toContain('sendMessage');
    expect(pageSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(hookSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
