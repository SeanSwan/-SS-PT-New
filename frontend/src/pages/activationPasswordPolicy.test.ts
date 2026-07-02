import {
  getActivationPasswordPolicyError,
  isActivationPasswordStrong,
  PASSWORD_POLICY_COPY,
} from './activationPasswordPolicy';

describe('activationPasswordPolicy', () => {
  it.each([
    ['short', 'A1!a'],
    ['missing uppercase', 'password1!'],
    ['missing lowercase', 'PASSWORD1!'],
    ['missing number', 'Password!'],
    ['missing special character', 'Password1'],
  ])('rejects weak passwords: %s', (_label, password) => {
    expect(isActivationPasswordStrong(password)).toBe(false);
  });

  it('accepts passwords that satisfy the activation policy', () => {
    expect(isActivationPasswordStrong('SwanStrong1!')).toBe(true);
  });

  it.each([
    ['A1!a', 'Password must be at least 8 characters long'],
    ['password1!', 'Password must include uppercase letters, lowercase letters, and numbers'],
    ['PASSWORD1!', 'Password must include uppercase letters, lowercase letters, and numbers'],
    ['Password!', 'Password must include uppercase letters, lowercase letters, and numbers'],
    ['Password1', 'Password should include at least one special character for better security'],
  ])('returns backend-aligned error copy for weak password: %s', (password, expectedError) => {
    expect(getActivationPasswordPolicyError(password)).toBe(expectedError);
  });

  it('returns null for passwords that satisfy the activation policy', () => {
    expect(getActivationPasswordPolicyError('SwanStrong1!')).toBeNull();
  });

  it('keeps the user-facing copy aligned with the checked requirements', () => {
    expect(PASSWORD_POLICY_COPY).toContain('uppercase');
    expect(PASSWORD_POLICY_COPY).toContain('lowercase');
    expect(PASSWORD_POLICY_COPY).toContain('number');
    expect(PASSWORD_POLICY_COPY).toContain('special character');
  });
});