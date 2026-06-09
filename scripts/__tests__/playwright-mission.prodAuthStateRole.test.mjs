import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  assertStorageStateMatchesRole,
  getStorageStateRoleSummary,
} from '../qa/prod-auth-state-role.mjs';

function jwtWithRole(role) {
  const payload = Buffer.from(JSON.stringify({ role, exp: 1770000000 })).toString('base64url');
  return `header.${payload}.signature`;
}

function writeState(localStorage) {
  const dir = mkdtempSync(join(tmpdir(), 'swan-prod-auth-role-'));
  const file = join(dir, 'state.json');
  writeFileSync(file, JSON.stringify({
    cookies: [],
    origins: [{
      origin: 'https://sswanstudios.com',
      localStorage,
    }],
  }));

  return {
    file,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

describe('production auth storage-state role validation', () => {
  it('summarizes role metadata without exposing token values', () => {
    const state = writeState([
      { name: 'user', value: JSON.stringify({ role: 'trainer' }) },
      { name: 'token', value: jwtWithRole('trainer') },
      { name: 'refreshToken', value: 'do-not-print-refresh-token' },
    ]);

    try {
      const summary = getStorageStateRoleSummary(state.file);
      assert.deepEqual(summary, {
        userRole: 'trainer',
        tokenRole: 'trainer',
      });
    } finally {
      state.cleanup();
    }
  });

  it('fails fast when a required role points at the wrong storage state', () => {
    const state = writeState([
      { name: 'user', value: JSON.stringify({ role: 'admin' }) },
      { name: 'token', value: jwtWithRole('admin') },
    ]);

    try {
      assert.throws(
        () => assertStorageStateMatchesRole({
          expectedRole: 'client',
          authPath: state.file,
          envName: 'SWAN_PROD_CLIENT_AUTH_STATE',
        }),
        /expected client.*user\.role=admin.*token\.role=admin.*qa:prod-auth:capture:client/s,
      );
    } finally {
      state.cleanup();
    }
  });

  it('fails closed when no role metadata can be read', () => {
    const state = writeState([
      { name: 'tokenTimestamp', value: '1760000000000' },
    ]);

    try {
      assert.throws(
        () => assertStorageStateMatchesRole({
          expectedRole: 'trainer',
          authPath: state.file,
          envName: 'SWAN_PROD_TRAINER_AUTH_STATE',
        }),
        /does not contain readable role metadata.*trainer/s,
      );
    } finally {
      state.cleanup();
    }
  });
});
