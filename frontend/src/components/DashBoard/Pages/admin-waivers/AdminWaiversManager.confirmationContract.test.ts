import { readFileSync } from 'fs';
import { resolve } from 'path';

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('AdminWaiversManager revoke confirmation contract', () => {
  const managerSource = readSource('src/components/DashBoard/Pages/admin-waivers/AdminWaiversManager.tsx');
  const dialogSource = readSource('src/components/DashBoard/Pages/admin-waivers/AdminWaiverConfirmDialog.tsx');

  it('keeps waiver revocation inside a branded in-app confirmation layer', () => {
    expect(managerSource).not.toContain('window.confirm');
    expect(managerSource).toContain("from './AdminWaiverConfirmDialog'");
    expect(managerSource).toContain('<AdminWaiverConfirmDialog');
    expect(managerSource).toContain('setConfirmRequest');
    expect(managerSource).toContain('/api/admin/waivers/${recordId}/revoke');
  });

  it('uses an accessible 44px-touch dialog for legal/compliance actions', () => {
    expect(dialogSource).toContain('role="dialog"');
    expect(dialogSource).toContain('aria-modal="true"');
    expect(dialogSource).toMatch(/min-height:\s*44px/);
    expect(dialogSource).toMatch(/min-width:\s*44px/);
  });
});
