import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const controllerSource = readFileSync(
  resolve(process.cwd(), 'controllers/adminDashboardVisitorController.mjs'),
  'utf8',
);

describe('admin dashboard visitor controller source contract', () => {
  it('includes registration-only signups in registered visitor geo intelligence', () => {
    expect(controllerSource).toContain('{ registrationIP: { [Op.ne]: null } }');
    expect(controllerSource).toContain("'lastLoginIP', 'registrationIP', 'lastActive'");
    expect(controllerSource).toContain('const ip = user.lastLoginIP || user.registrationIP;');
    expect(controllerSource).toContain("source: user.lastLoginIP ? 'login' : 'signup'");
  });
});