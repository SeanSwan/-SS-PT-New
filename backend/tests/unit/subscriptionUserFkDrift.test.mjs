import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readBackendFile = (relativePath) =>
  readFileSync(resolve(__dirname, '..', '..', relativePath), 'utf8').replace(/\r\n/g, '\n');

describe('Subscription user FK drift guard', () => {
  it('retarget migration repairs subscriptions.userId to the canonical Users table', () => {
    const migrationPath = resolve(
      __dirname,
      '../../migrations/20260618000001-retarget-subscriptions-user-fk.cjs',
    );
    expect(existsSync(migrationPath)).toBe(true);

    const migration = readFileSync(migrationPath, 'utf8').replace(/\r\n/g, '\n');
    expect(migration).toContain("require('./helpers/resolveUsersTable.cjs')");
    expect(migration).toMatch(/const TABLE_NAME = 'subscriptions'/);
    expect(migration).toMatch(/const USER_ID_COLUMN = 'userId'/);
    expect(migration).toMatch(/table_name\s*=\s*'\$\{TABLE_NAME\}'/);
    expect(migration).toMatch(/att\.attname\s*=\s*'\$\{USER_ID_COLUMN\}'/);
    expect(migration).toMatch(
      /NOT EXISTS \(SELECT 1 FROM "\$\{usersTable\}" u WHERE u\.id = s\."\$\{USER_ID_COLUMN\}"\)/,
    );
    expect(migration).toMatch(/REFERENCES "\$\{usersTable\}" \("id"\)/);
    expect(migration).toMatch(/ON UPDATE CASCADE/);
    expect(migration).toMatch(/ON DELETE CASCADE/);
  });

  it('fresh subscription-table creation resolves Users instead of hardcoding lowercase users', () => {
    const migration = readBackendFile('migrations/20260322000000-create-subscriptions-table.cjs');
    expect(migration).toContain("require('./helpers/resolveUsersTable.cjs')");
    expect(migration).toContain('const usersTable = await resolveUsersTable(queryInterface);');
    expect(migration).toContain("references: { model: usersTable, key: 'id' }");
    expect(migration).toContain("queryInterface.describeTable(usersTable)");
  });
});
