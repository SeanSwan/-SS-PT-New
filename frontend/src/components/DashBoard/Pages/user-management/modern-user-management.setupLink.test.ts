import { readFileSync } from 'fs';
import { resolve } from 'path';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/user-management/modern-user-management.tsx'),
  'utf8'
);

describe('ModernUserManagementSystem setup-link creation contract', () => {
  it('defaults new users to setup-link handoff instead of shared temporary passwords', () => {
    expect(source).toContain('sendSetupLink: true');
    expect(source).toContain('const [createdSetupLink, setCreatedSetupLink]');
    expect(source).toContain('Send setup link instead of temporary password');
    expect(source).toContain('id="add-sendSetupLink"');
    expect(source).toContain('name="sendSetupLink"');
    expect(source).toContain('checked={editFormData.sendSetupLink}');
  });

  it('only requires a password when setup-link handoff is disabled', () => {
    expect(source).toContain('if (!editFormData.sendSetupLink && !editFormData.password)');
    expect(source).toContain("password: editFormData.sendSetupLink ? '' : editFormData.password");
    expect(source).toContain('disabled={editFormData.sendSetupLink}');
    expect(source).toContain('required={!editFormData.sendSetupLink}');
    expect(source).not.toContain('Create a new user account with a temporary password. Have the user change it after first login.');
  });

  it('posts the setup-link flag and displays the returned link for manual handoff', () => {
    expect(source).toContain("const response = await authAxios.post('/api/auth/user', createPayload);");
    expect(source).toContain('setCreatedSetupLink(setupLinkData);');
    expect(source).toContain('credentialAction === \'setup_link_ready\'');
    expect(source).toContain('Setup Link Ready');
    expect(source).toContain('createdSetupLink.resetUrl');
    expect(source).toContain('id="add-setupLink"');
    expect(source).toContain('createdSetupLink.expiresInMinutes');
  });
});
