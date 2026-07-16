import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sourceFiles = [
  'src/components/DashBoard/Pages/admin-specials/AdminSpecialsManager.tsx',
  'src/components/DashBoard/Pages/admin-dashboard/components/BulkModerationPanel.tsx',
  'src/components/Admin/NASM/NASMAdminDashboard.tsx',
];

const readSource = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('dashboard destructive action confirmation contract', () => {
  it('keeps destructive dashboard actions out of browser-native confirm prompts', () => {
    for (const file of sourceFiles) {
      expect(readSource(file), file).not.toContain('window.confirm');
    }
  });

  it('routes confirmation UX through branded in-app dialogs', () => {
    expect(readSource('src/components/DashBoard/Pages/admin-specials/AdminSpecialsManager.tsx')).toContain('Delete special?');
    expect(readSource('src/components/DashBoard/Pages/admin-dashboard/components/BulkModerationPanel.tsx')).toContain('Delete selected items?');
    expect(readSource('src/components/Admin/NASM/NASMAdminDashboard.tsx')).toContain('Delete template?');
  });
});
