import { readFileSync } from 'fs';
import { resolve } from 'path';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/user-management/modern-user-management.tsx'),
  'utf8'
);

describe('ModernUserManagementSystem truth contract', () => {
  it('does not show sample users when the legacy user-management route has no real users', () => {
    expect(source).not.toContain('Sample User List');
    expect(source).not.toContain('Sample users if none loaded');
    expect(source).not.toContain('<UserName>Admin User</UserName>');
    expect(source).not.toContain('<UserName>Trainer User</UserName>');
  });
});
