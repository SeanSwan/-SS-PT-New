import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) => readFileSync(resolve(__dirname, fileName), 'utf8');

describe('RecurringSeriesModal confirmation contract', () => {
  it('uses the shared schedule confirmation dialog instead of browser confirms', () => {
    const source = read('RecurringSeriesModal.tsx');
    const dialogSource = read('ScheduleConfirmDialog.tsx');

    expect(source).toContain("import ScheduleConfirmDialog");
    expect(source).toContain('<ScheduleConfirmDialog');
    expect(source).not.toContain('window.confirm');
    expect(dialogSource).toContain('role="dialog"');
    expect(dialogSource).toContain('aria-modal="true"');
    expect(dialogSource).toMatch(/min-height:\s*44px/);
  });

  it('keeps the recurring series modal below the touched-file line cap', () => {
    const source = read('RecurringSeriesModal.tsx');

    expect(source).toContain("from './RecurringSeriesModalFields'");
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
