import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const PASSWORD_POLICY_COPY = 'Use at least 8 characters with uppercase, lowercase, number, and special character.';

describe('activation password policy copy', () => {
  it('shows and enforces the same strong-password requirement on all public activation screens', () => {
    const policySource = readSource('src/pages/activationPasswordPolicy.ts');
    const claimSource = readSource('src/pages/ClaimAccountPage.tsx');
    const resetSource = readSource('src/pages/ResetPasswordPage.tsx');
    const loginSource = readSource('src/pages/EnhancedLoginModal.tsx');

    expect(policySource).toContain(PASSWORD_POLICY_COPY);

    [claimSource, resetSource, loginSource].forEach((source) => {
      expect(source).toContain("from './activationPasswordPolicy'");
      expect(source).toContain('PASSWORD_POLICY_COPY');
      expect(source).toContain('isActivationPasswordStrong');
    });

    expect(claimSource).toContain('<PasswordPolicyHint>{PASSWORD_POLICY_COPY}</PasswordPolicyHint>');
    expect(claimSource).toContain('!isActivationPasswordStrong(password)');
    expect(claimSource).toContain('disabled={submitting || !isActivationPasswordStrong(password) || password !== confirmPassword}');

    expect(resetSource).toContain('<Subtitle>{PASSWORD_POLICY_COPY}</Subtitle>');
    expect(resetSource).toContain('!isActivationPasswordStrong(newPassword)');
    expect(resetSource).toContain('disabled={loading || !isActivationPasswordStrong(newPassword) || newPassword !== confirmPassword}');

    expect(loginSource).toContain('<PasswordPolicyHint variants={itemVariants}>{PASSWORD_POLICY_COPY}</PasswordPolicyHint>');
    expect(loginSource).toContain('!isActivationPasswordStrong(newPassword)');
  });
});