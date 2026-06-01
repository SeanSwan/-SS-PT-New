import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) => readFileSync(resolve(__dirname, fileName), 'utf8');

describe('admin gamification confirmation contract', () => {
  it('keeps destructive gamification actions inside an in-app confirmation dialog', () => {
    const controllerSource = read('useAdminGamificationController.ts');
    const viewSource = read('admin-gamification-view.tsx');
    const dialogSource = read('AdminGamificationConfirmDialog.tsx');

    expect(controllerSource).not.toContain('window.confirm');
    expect(controllerSource).toContain('setConfirmRequest');
    expect(controllerSource).toContain('Delete achievement');
    expect(controllerSource).toContain('Delete reward');
    expect(controllerSource).toContain('Restore defaults');
    expect(viewSource).toContain("import AdminGamificationConfirmDialog");
    expect(viewSource).toContain('<AdminGamificationConfirmDialog');
    expect(dialogSource).toContain('role="dialog"');
    expect(dialogSource).toContain('aria-modal="true"');
    expect(dialogSource).toMatch(/min-height:\s*44px/);
    expect(dialogSource).toMatch(/min-width:\s*44px/);
  });
});
