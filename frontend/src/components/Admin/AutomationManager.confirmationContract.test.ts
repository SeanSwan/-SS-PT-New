import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) => readFileSync(resolve(__dirname, fileName), 'utf8');

describe('AutomationManager confirmation and extraction contract', () => {
  it('uses an in-app confirmation dialog for sequence deletion', () => {
    const managerSource = read('AutomationManager.tsx');
    const dialogSource = read('AutomationConfirmDialog.tsx');

    expect(managerSource).not.toContain('window.confirm');
    expect(managerSource).toContain('setConfirmRequest');
    expect(managerSource).toContain('<AutomationConfirmDialog');
    expect(managerSource).toContain('Delete automation sequence');
    expect(dialogSource).toContain('role="dialog"');
    expect(dialogSource).toContain('aria-modal="true"');
    expect(dialogSource).toMatch(/min-height:\s*44px/);
    expect(dialogSource).toMatch(/min-width:\s*44px/);
  });

  it('keeps the manager and extracted view under the file-size rule', () => {
    const managerSource = read('AutomationManager.tsx');
    const viewSource = read('AutomationManagerView.tsx');

    expect(managerSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(viewSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
