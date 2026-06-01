import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../../../../../..');
const hookPath = resolve(root, 'src/components/DashBoard/Pages/coach-assistant/hooks/useCoachAssistant.ts');
const summaryPath = resolve(root, 'src/components/DashBoard/Pages/coach-assistant/utils/coachCommandResultSummary.ts');

const readSource = (path: string) => readFileSync(path, 'utf8');

describe('useCoachAssistant command summary split', () => {
  it('keeps the hook focused on orchestration and imports command summaries', () => {
    const source = readSource(hookPath);

    expect(source).toContain("import { commandResultSummary } from '../utils/coachCommandResultSummary';");
    expect(source).not.toMatch(/function\s+commandResultSummary\s*\(/);
    expect(source).not.toContain("case 'log_workout':");
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(530);
  });

  it('keeps the pure command summary formatter in a dedicated utility', () => {
    const source = readSource(summaryPath);

    expect(source).toContain('export function commandResultSummary');
    expect(source).toContain("case 'log_workout':");
    expect(source).toContain("case 'create_availability_override':");
    expect(source).toContain("command.startsWith('navigate_')");
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(260);
  });
});
