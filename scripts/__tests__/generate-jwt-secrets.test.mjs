import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { describe, it } from 'node:test';

const extractAdminAccessCode = (output) => {
  const lines = output.split(/\r?\n/);
  const labelIndex = lines.findIndex((line) => line.includes('ADMIN_ACCESS_CODE:'));
  return labelIndex >= 0 ? lines[labelIndex + 1]?.trim() : '';
};

describe('generate-jwt-secrets utility', () => {
  it('prints an admin access code that satisfies the production startup shape', () => {
    const output = execFileSync(
      process.execPath,
      ['scripts/utilities/generate-jwt-secrets.mjs'],
      { encoding: 'utf8' },
    );
    const adminAccessCode = extractAdminAccessCode(output);

    assert.match(adminAccessCode, /^[A-Za-z0-9_-]+$/);
    assert.ok(adminAccessCode.length >= 24);
    assert.ok(new Set(adminAccessCode).size >= 10);
    assert.doesNotMatch(adminAccessCode, /admin-access-code-123|change[-_ ]?me|example|password/i);
  });
});
