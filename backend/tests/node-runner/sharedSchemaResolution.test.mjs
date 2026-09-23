import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Vitest aliases can hide a broken file: dependency. Render starts native Node,
// which follows the symlink into packages/swan-schemas before resolving zod.
test('native production Node resolves and executes the shared schema package', () => {
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  delete env.NODE_PATH;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { supportIssueCreateSchema } from '@swan/schemas';
    const payload = {
      clientRequestId: '123e4567-e89b-42d3-a456-426614174000',
      category: 'bug', title: 'Synthetic report',
      description: 'Synthetic module resolution regression.'
    };
    assert.equal(supportIssueCreateSchema.safeParse(payload).success, true);
    assert.equal(supportIssueCreateSchema.safeParse({ ...payload, title: 'x' }).success, false);
    console.log('NATIVE_SHARED_SCHEMA_OK');
  `], {
    cwd: fileURLToPath(new URL('../../', import.meta.url)),
    env, encoding: 'utf8', timeout: 15000, windowsHide: true,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /NATIVE_SHARED_SCHEMA_OK/);
});
