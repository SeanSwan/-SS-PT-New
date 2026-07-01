/**
 * Shared password policy for public account activation, forced first-login
 * password changes, registration, and reset flows.
 */
export const PASSWORD_MIN_LENGTH = 8;

export function validatePasswordStrength(password) {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return {
      success: false,
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`,
    };
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!(hasUppercase && hasLowercase && hasNumbers)) {
    return {
      success: false,
      message: 'Password must include uppercase letters, lowercase letters, and numbers',
    };
  }

  if (!hasSpecialChars) {
    return {
      success: false,
      message: 'Password should include at least one special character for better security',
    };
  }

  return { success: true };
}

export default {
  PASSWORD_MIN_LENGTH,
  validatePasswordStrength,
};