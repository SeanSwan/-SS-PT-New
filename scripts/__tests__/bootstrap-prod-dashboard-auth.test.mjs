import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  createStorageState,
  parseRoleList,
  qaPersonaForRole,
  qaWaiverSubmissionForPersona,
  roleRequiresLinkedWaiver,
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

  it('limits bootstrap waiver provisioning to dashboard client personas', () => {
    assert.equal(roleRequiresLinkedWaiver('trainer'), false);
    assert.equal(roleRequiresLinkedWaiver('client'), true);
    assert.equal(roleRequiresLinkedWaiver('user'), true);
  });

  it('builds a deterministic in-app waiver submission for QA personas', () => {
    const client = qaPersonaForRole('client');
    const submission = qaWaiverSubmissionForPersona(client);

    assert.equal(submission.fullName, 'Dashboard QA Client');
    assert.equal(submission.dateOfBirth, '1990-01-01');
    assert.equal(submission.email, 'sswan.qa.dashboard.client@swanstudios-qa.local');
    assert.deepEqual(submission.activityTypes, ['HOME_GYM_PT']);
    assert.equal(submission.liabilityAccepted, true);
    assert.equal(submission.aiConsentAccepted, true);
    assert.equal(submission.mediaConsentAccepted, false);
    assert.equal(submission.source, 'header_waiver');
    assert.match(submission.signatureData, /Dashboard QA Client/);
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
