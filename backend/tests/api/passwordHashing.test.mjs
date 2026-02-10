/**
 * Password Hashing Hook Tests
 * ============================
 * P0: Validates that User model hooks hash correctly
 *     and never double-hash pre-hashed passwords.
 */
import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';

// These tests exercise the hook LOGIC directly (not the ORM hooks).
// This avoids needing a live DB while validating the exact code path.

/**
 * Simulates the beforeCreate hook logic (must match User.mjs:307-319)
 */
function simulateBeforeCreate(user) {
  if (!user.password || user.password.length === 0) {
    return user;
  }
  if (user.password.startsWith('$2')) {
    return user; // Already hashed
  }
  const salt = bcrypt.genSaltSync(10);
  user.password = bcrypt.hashSync(user.password, salt);
  return user;
}

/**
 * Simulates the beforeUpdate hook logic (must match User.mjs:322-335)
 */
function simulateBeforeUpdate(user, passwordChanged) {
  if (passwordChanged && user.password && user.password.length > 0) {
    if (!user.password.startsWith('$2')) {
      const salt = bcrypt.genSaltSync(10);
      user.password = bcrypt.hashSync(user.password, salt);
    }
  }
  return user;
}

describe('Password Hashing Hooks', () => {

  // ─────────────────────────────────────────────────────────
  // P0: beforeCreate hashes plaintext
  // ─────────────────────────────────────────────────────────
  it('beforeCreate hashes plaintext password', () => {
    const user = { password: 'TestPassword123!' };
    simulateBeforeCreate(user);

    expect(user.password).not.toBe('TestPassword123!');
    expect(user.password.startsWith('$2')).toBe(true);
    expect(bcrypt.compareSync('TestPassword123!', user.password)).toBe(true);
  });

  // ─────────────────────────────────────────────────────────
  // P0: beforeCreate does NOT double-hash
  // ─────────────────────────────────────────────────────────
  it('beforeCreate does NOT double-hash pre-hashed password', () => {
    const plaintext = 'AdminPassword456!';
    const preHashed = bcrypt.hashSync(plaintext, 10);
    const user = { password: preHashed };

    simulateBeforeCreate(user);

    // Password should remain the same (not re-hashed)
    expect(user.password).toBe(preHashed);
    // Original plaintext should still match
    expect(bcrypt.compareSync(plaintext, user.password)).toBe(true);
  });

  // ─────────────────────────────────────────────────────────
  // P0: beforeUpdate hashes new plaintext
  // ─────────────────────────────────────────────────────────
  it('beforeUpdate hashes new plaintext password', () => {
    const user = { password: 'NewPassword789!' };

    simulateBeforeUpdate(user, true);

    expect(user.password.startsWith('$2')).toBe(true);
    expect(bcrypt.compareSync('NewPassword789!', user.password)).toBe(true);
  });

  // ─────────────────────────────────────────────────────────
  // P0: beforeUpdate skips already-hashed
  // ─────────────────────────────────────────────────────────
  it('beforeUpdate skips already-hashed password', () => {
    const plaintext = 'ExistingPass!';
    const hashed = bcrypt.hashSync(plaintext, 10);
    const user = { password: hashed };

    simulateBeforeUpdate(user, true);

    expect(user.password).toBe(hashed); // Unchanged
    expect(bcrypt.compareSync(plaintext, user.password)).toBe(true);
  });

  // ─────────────────────────────────────────────────────────
  // P0: beforeUpdate skips when password not changed
  // ─────────────────────────────────────────────────────────
  it('beforeUpdate skips when password not changed', () => {
    const originalHash = bcrypt.hashSync('OriginalPass!', 10);
    const user = { password: originalHash };

    simulateBeforeUpdate(user, false); // password not changed

    expect(user.password).toBe(originalHash); // Unchanged
    expect(bcrypt.compareSync('OriginalPass!', user.password)).toBe(true);
  });

  // ─────────────────────────────────────────────────────────
  // P1: beforeUpdate handles empty password
  // ─────────────────────────────────────────────────────────
  it('beforeUpdate handles empty password string', () => {
    const user = { password: '' };
    simulateBeforeUpdate(user, true);
    expect(user.password).toBe(''); // No hashing attempted
  });

  // ─────────────────────────────────────────────────────────
  // P0: Admin-created user can login (full flow)
  // ─────────────────────────────────────────────────────────
  it('admin-created user can login after beforeCreate hook', () => {
    // Simulate admin route: previously pre-hashed, now passes plaintext
    const plaintext = 'AdminCreatedUser123!';
    const user = { password: plaintext };

    // beforeCreate hook runs
    simulateBeforeCreate(user);

    // Login: bcrypt.compare(plaintext, storedHash) should succeed
    expect(bcrypt.compareSync(plaintext, user.password)).toBe(true);
  });

  // ─────────────────────────────────────────────────────────
  // P0: Profile update (no password) -> login still works
  // ─────────────────────────────────────────────────────────
  it('profile update without password change preserves login', () => {
    const plaintext = 'UserPassword!';
    const user = { password: plaintext };

    // Initial creation
    simulateBeforeCreate(user);
    const storedHash = user.password;

    // Profile update: only firstName changed, password NOT in changed()
    simulateBeforeUpdate(user, false);

    // Password unchanged, login still works
    expect(user.password).toBe(storedHash);
    expect(bcrypt.compareSync(plaintext, user.password)).toBe(true);
  });

  // ─────────────────────────────────────────────────────────
  // P0: beforeCreate handles null password
  // ─────────────────────────────────────────────────────────
  it('beforeCreate handles null password without throwing', () => {
    const user = { password: null };
    expect(() => simulateBeforeCreate(user)).not.toThrow();
    expect(user.password).toBeNull();
  });
});
