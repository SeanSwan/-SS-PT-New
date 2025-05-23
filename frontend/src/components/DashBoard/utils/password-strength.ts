/**
 * password-strength.ts
 * Utility functions for evaluating password strength
 */
import value from '../assets/scss/_themes-vars.module.scss';

/**
 * Interface for password strength result
 */
interface StrengthResult {
  label: string;
  color: string;
}

/**
 * Checks if a string contains numbers
 * @param value - The string to check
 * @returns True if the string contains at least one number
 */
const hasNumber = (value: string): boolean => new RegExp(/[0-9]/).test(value);

/**
 * Checks if a string contains both uppercase and lowercase letters
 * @param value - The string to check
 * @returns True if the string contains both cases
 */
const hasMixed = (value: string): boolean => new RegExp(/[a-z]/).test(value) && new RegExp(/[A-Z]/).test(value);

/**
 * Checks if a string contains special characters
 * @param value - The string to check
 * @returns True if the string contains special characters
 */
const hasSpecial = (value: string): boolean => new RegExp(/[!#@$%^&*)(+=._-]/).test(value);

/**
 * Returns color and label based on password strength score
 * @param count - The password strength score (0-5)
 * @returns An object containing the label and color
 */
export const strengthColor = (count: number): StrengthResult => {
  if (count < 2) return { label: 'Poor', color: value.errorMain };
  if (count < 3) return { label: 'Weak', color: value.warningDark };
  if (count < 4) return { label: 'Normal', color: value.orangeMain };
  if (count < 5) return { label: 'Good', color: value.successMain };
  if (count < 6) return { label: 'Strong', color: value.successDark };
  return { label: 'Poor', color: value.errorMain };
};

/**
 * Calculates a password strength score based on various criteria
 * @param password - The password to evaluate
 * @returns A strength score from 0-5
 */
export const strengthIndicator = (password: string): number => {
  let strengths = 0;
  
  if (password.length > 5) strengths += 1;
  if (password.length > 7) strengths += 1;
  if (hasNumber(password)) strengths += 1;
  if (hasSpecial(password)) strengths += 1;
  if (hasMixed(password)) strengths += 1;
  
  return strengths;
};