import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const pageSource = read('./WorkoutPlannerPage.tsx');
const shellStyles = read('./WorkoutPlannerShell.styles.ts');
const scheduleStyles = read('./WorkoutPlannerSchedule.styles.ts');

describe('WorkoutPlanner action controls accessibility', () => {
  it('keeps export and status dismiss controls typed, focus-visible, and touch-safe', () => {
    expect(scheduleStyles).not.toContain('min-height: 36px');
    expect(scheduleStyles).toMatch(/ExportPdfBtn[\s\S]*?min-height:\s*44px/);
    expect(scheduleStyles).toMatch(/ExportPdfBtn[\s\S]*?&:focus-visible/);
    expect(pageSource).toMatch(/<ExportPdfBtn[\s\S]*?type="button"/);
    expect(pageSource).toMatch(/<button[\s\S]*?type="button"[\s\S]*?aria-label="Dismiss"/);
    expect(shellStyles).toMatch(/StatusBanner[\s\S]*?button[\s\S]*?min-width:\s*44px/);
    expect(shellStyles).toMatch(/StatusBanner[\s\S]*?button[\s\S]*?min-height:\s*44px/);
    expect(shellStyles).toMatch(/StatusBanner[\s\S]*?button[\s\S]*?&:focus-visible/);
  });
});
