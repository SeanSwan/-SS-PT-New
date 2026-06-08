import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

describe('client account lifecycle confirmation contract', () => {
  it('uses an in-app confirmation dialog for client soft-delete actions', () => {
    const hookSource = read('useClientAccountLifecycle.ts');
    const dialogSource = read('ClientLifecycleConfirmDialog.tsx');
    const workspaceSource = read('../ClientsWorkspace.tsx');
    const workspaceViewSource = read('../ClientsWorkspace.view.tsx');

    expect(hookSource).not.toContain('window.confirm');
    expect(hookSource).toContain('deactivationConfirmation');
    expect(workspaceSource).toContain('deactivationConfirmation={deactivationConfirmation}');
    expect(workspaceViewSource).toContain('ClientLifecycleConfirmDialog');
    expect(dialogSource).toContain('role="dialog"');
    expect(dialogSource).toContain('aria-modal="true"');
    expect(dialogSource).toContain('min-height: 44px');
    expect(dialogSource).toContain('var(--shadow-strong, 0 24px 70px rgba(0, 0, 0, 0.5))');
    expect(dialogSource).not.toContain('box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5)');
  });
});
