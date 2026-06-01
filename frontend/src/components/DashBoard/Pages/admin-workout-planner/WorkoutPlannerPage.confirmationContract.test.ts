import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

describe('WorkoutPlannerPage confirmation contract', () => {
  it('uses the in-app confirmation dialog instead of native browser confirms', () => {
    const pageSource = read('WorkoutPlannerPage.tsx');
    const dialogSource = read('WorkoutPlannerConfirmDialog.tsx');

    expect(pageSource).not.toContain('window.confirm');
    expect(pageSource).toContain("import WorkoutPlannerConfirmDialog");
    expect(pageSource).toContain('<WorkoutPlannerConfirmDialog');
    expect(dialogSource).toContain('role="dialog"');
    expect(dialogSource).toContain('aria-modal="true"');
    expect(dialogSource).toContain('min-height: 44px');
  });
});
