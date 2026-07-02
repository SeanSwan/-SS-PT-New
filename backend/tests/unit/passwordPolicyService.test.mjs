import { describe, expect, it } from 'vitest';
import { validatePasswordStrength } from '../../services/auth/passwordPolicyService.mjs';

describe('passwordPolicyService', () => {
  it.each([
    ['short', 'A1!a'],
    ['missing uppercase', 'password1!'],
    ['missing lowercase', 'PASSWORD1!'],
    ['missing number', 'Password!'],
    ['missing special character', 'Password1'],
  ])('rejects weak passwords: %s', (_label, password) => {
    expect(validatePasswordStrength(password)).toMatchObject({ success: false });
  });

  it('accepts passwords that satisfy the shared activation policy', () => {
    expect(validatePasswordStrength('SwanStrong1!')).toEqual({ success: true });
  });
});