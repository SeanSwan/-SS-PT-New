/**
 * Regression test for User.beforeValidate empty-string normalization.
 *
 * Incident 2026-04-30: POST /api/auth/register returned 500 when the
 * OptimizedSignupModal sent blank optional fields ('' for dateOfBirth /
 * weight / height). PostgreSQL cannot cast '' to DATE or FLOAT;
 * Sequelize wraps the cast failure as SequelizeDatabaseError which
 * escapes the controller's catch block.
 *
 * Fix: User.beforeValidate hook normalizes empty-string values to null
 * for any nullable typed (non-STRING) column. Unit-tested via the pure
 * `normalizeEmptyTypedFields` helper exported alongside the hook so
 * we don't have to instantiate Sequelize / start a DB connection.
 */
import { describe, it, expect } from 'vitest';
import { normalizeEmptyTypedFields } from '../models/User.mjs';

// Synthetic rawAttributes resembling User.rawAttributes shape.
// Sequelize's `def.type.key` is what we read; emulating it directly
// avoids needing the full Sequelize instance.
const fakeAttrs = {
  // Required STRING fields — must NOT be normalized (would change semantics)
  email: { type: { key: 'STRING' }, allowNull: false },
  username: { type: { key: 'STRING' }, allowNull: false },
  // Nullable STRING — also must NOT be normalized
  fitnessGoal: { type: { key: 'STRING' }, allowNull: true },
  phone: { type: { key: 'STRING' }, allowNull: true },
  // Typed nullable fields — MUST be normalized
  dateOfBirth: { type: { key: 'DATEONLY' }, allowNull: true },
  weight: { type: { key: 'FLOAT' }, allowNull: true },
  height: { type: { key: 'FLOAT' }, allowNull: true },
  lastLogin: { type: { key: 'DATE' }, allowNull: true },
  level: { type: { key: 'INTEGER' }, allowNull: true },
  hourlyRate: { type: { key: 'DECIMAL' }, allowNull: true },
  isActive: { type: { key: 'BOOLEAN' }, allowNull: true },
  // Required typed field — must NOT be normalized
  id: { type: { key: 'INTEGER' }, allowNull: false },
};

describe('normalizeEmptyTypedFields', () => {
  it('converts empty string to null for nullable DATEONLY', () => {
    const u = { dateOfBirth: '' };
    normalizeEmptyTypedFields(u, fakeAttrs);
    expect(u.dateOfBirth).toBeNull();
  });

  it('converts empty string to null for nullable FLOAT (weight, height)', () => {
    const u = { weight: '', height: '' };
    normalizeEmptyTypedFields(u, fakeAttrs);
    expect(u.weight).toBeNull();
    expect(u.height).toBeNull();
  });

  it('converts empty string to null for nullable DATE / INTEGER / DECIMAL / BOOLEAN', () => {
    const u = { lastLogin: '', level: '', hourlyRate: '', isActive: '' };
    normalizeEmptyTypedFields(u, fakeAttrs);
    expect(u.lastLogin).toBeNull();
    expect(u.level).toBeNull();
    expect(u.hourlyRate).toBeNull();
    expect(u.isActive).toBeNull();
  });

  it('does NOT touch STRING fields (required or nullable)', () => {
    const u = {
      email: 'a@b.c',
      username: 'foo',
      fitnessGoal: '',
      phone: '',
    };
    normalizeEmptyTypedFields(u, fakeAttrs);
    expect(u.email).toBe('a@b.c');
    expect(u.username).toBe('foo');
    expect(u.fitnessGoal).toBe('');
    expect(u.phone).toBe('');
  });

  it('does NOT touch required (allowNull:false) typed fields even if empty', () => {
    // Required fields with empty strings should fail validation downstream,
    // not be silently normalized to null. Hook must respect allowNull.
    const u = { id: '' };
    normalizeEmptyTypedFields(u, fakeAttrs);
    expect(u.id).toBe(''); // unchanged
  });

  it('preserves valid typed values (does not nullify real data)', () => {
    const u = {
      dateOfBirth: '1990-01-15',
      weight: 75.5,
      height: 180,
      level: 5,
      isActive: true,
    };
    normalizeEmptyTypedFields(u, fakeAttrs);
    expect(u.dateOfBirth).toBe('1990-01-15');
    expect(u.weight).toBe(75.5);
    expect(u.height).toBe(180);
    expect(u.level).toBe(5);
    expect(u.isActive).toBe(true);
  });

  it('preserves null values (leaves null as null)', () => {
    const u = { dateOfBirth: null, weight: null };
    normalizeEmptyTypedFields(u, fakeAttrs);
    expect(u.dateOfBirth).toBeNull();
    expect(u.weight).toBeNull();
  });

  it('does NOT touch undefined values (does not insert null where field was absent)', () => {
    const u = { email: 'a@b.c' };
    normalizeEmptyTypedFields(u, fakeAttrs);
    expect(u.dateOfBirth).toBeUndefined();
    expect(u.weight).toBeUndefined();
  });

  it('handles missing user gracefully (no throw)', () => {
    expect(() => normalizeEmptyTypedFields(null, fakeAttrs)).not.toThrow();
    expect(() => normalizeEmptyTypedFields(undefined, fakeAttrs)).not.toThrow();
  });

  it('handles missing rawAttributes gracefully (no throw)', () => {
    const u = { dateOfBirth: '' };
    expect(() => normalizeEmptyTypedFields(u, null)).not.toThrow();
    expect(u.dateOfBirth).toBe(''); // unchanged when no schema
  });

  it('reproduces the OptimizedSignupModal payload shape that 500ed', () => {
    // Faithful repro: this is what the modal's `registrationData` looks like
    // when a user submits without filling any of the optional profile fields.
    const u = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      username: 'testuser',
      password: 'Password123!',
      // Optional fields all empty strings — the actual cause of the 500
      phone: '',
      dateOfBirth: '',
      gender: '',
      weight: '',
      height: '',
      fitnessGoal: '',
      trainingExperience: '',
      healthConcerns: '',
      emergencyContact: '',
      role: 'user',
    };
    // gender, fitnessGoal, etc. are STRING in the real model — using fakeAttrs
    // we only have a few. The key check: dateOfBirth/weight/height become null.
    normalizeEmptyTypedFields(u, fakeAttrs);
    expect(u.dateOfBirth).toBeNull();
    expect(u.weight).toBeNull();
    expect(u.height).toBeNull();
    // String fields untouched
    expect(u.email).toBe('test@example.com');
    expect(u.firstName).toBe('Test');
    // Phone is STRING in real schema — stays empty
    expect(u.phone).toBe('');
  });
});
