import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = () => readFileSync(resolve(__dirname, 'useCalendarHandlers.ts'), 'utf8');

describe('Universal schedule gamification contract', () => {
  it('records completion rewards through SwanStudios backend instead of MCP fallback', () => {
    const src = source();

    expect(src).not.toContain('gamificationMCPService');
    expect(src).not.toContain('generateWorkoutPost');
    expect(src).toContain('gamificationRewardsService');
    expect(src).toContain('recordWorkoutCompletion');
  });
});
