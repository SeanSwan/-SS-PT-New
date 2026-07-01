export const PASSWORD_POLICY_COPY = 'Use at least 8 characters with uppercase, lowercase, number, and special character.';

export const getActivationPasswordPolicyError = (password: string): string | null => {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long';
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!(hasUppercase && hasLowercase && hasNumbers)) {
    return 'Password must include uppercase letters, lowercase letters, and numbers';
  }

  if (!hasSpecialChars) {
    return 'Password should include at least one special character for better security';
  }

  return null;
};

export const isActivationPasswordStrong = (password: string): boolean => (
  getActivationPasswordPolicyError(password) === null
);