import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  createStorageState,
  parseRoleList,
  qaPersonaForRole,
} from '../qa/bootstrap-prod-dashboard-auth.mjs';
import { getStorageStateRoleSummary } from '../qa/prod-auth-state-role.mjs';

function jwtWithRole(role) {
  const payload = Buffer.from(JSON.stringify({ role, exp: 1770000000 })).toString('base64url');
  return `header.${payload}.signature`;
}

describe('production dashboard auth bootstrap helpers', () => {
  it('parses the supported dashboard crawl roles only', () => {
    assert.deepEqual(parseRoleList('trainer,client,user,trainer'), ['trainer', 'client', 'user']);
    assert.throws(() => parseRoleList('admin,client'), /invalid role\(s\): admin/);
  });

  it('uses scoped QA-only persona addresses', () => {
    const trainer = qaPersonaForRole('trainer');
    assert.equal(trainer.email, 'sswan.qa.dashboard.trainer@swanstudios-qa.local');
    assert.equal(trainer.username, 'sswan_qa_dashboard_trainer');
    assert.equal(trainer.role, 'trainer');
    assert.match(trainer.bio, /QA trainer persona/);
  });

  it('writes the same localStorage keys consumed by production auth', () => {
    const state = createStorageState({
      baseUrl: 'https://sswanstudios.com',
      token: jwtWithRole('client'),
      refreshToken: 'refresh-token-value',
      user: { id: 15, role: 'client', email: 'qa@example.test' },
      now: 1760000000000,
    });

    assert.equal(state.origins[0].origin, 'https://sswanstudios.com');
    assert.deepEqual(
      state.origins[0].localStorage.map((entry) => entry.name),
      ['token', 'refreshToken', 'user', 'tokenTimestamp'],
    );

    const tempDir = mkdtempSync(join(tmpdir(), 'swan-bootstrap-auth-'));
    const tempPath = join(tempDir, 'state.json');
    writeFileSync(tempPath, JSON.stringify(state));
    try {
      assert.deepEqual(getStorageStateRoleSummary(tempPath), {
        userRole: 'client',
        tokenRole: 'client',
      });
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
