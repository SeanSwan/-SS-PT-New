import { describe, expect, it } from 'vitest';
import { shouldSkipPageViewPath } from './pageViewTrackerRules';

describe('page view tracker route rules', () => {
  it('tracks signup and register pages as acquisition visits', () => {
    expect(shouldSkipPageViewPath('/signup')).toBe(false);
    expect(shouldSkipPageViewPath('/register')).toBe(false);
    expect(shouldSkipPageViewPath('/auth/register')).toBe(false);
    expect(shouldSkipPageViewPath('/auth/signup')).toBe(false);
  });

  it('skips admin dashboard and login-only auth pages', () => {
    expect(shouldSkipPageViewPath('')).toBe(true);
    expect(shouldSkipPageViewPath('/dashboard/admin/overview')).toBe(true);
    expect(shouldSkipPageViewPath('/login')).toBe(true);
    expect(shouldSkipPageViewPath('/auth')).toBe(true);
    expect(shouldSkipPageViewPath('/auth/login')).toBe(true);
  });

  it('skips admin-only parked design previews so review traffic never mutates analytics', () => {
    expect(shouldSkipPageViewPath('/design-previews/contact')).toBe(true);
    expect(shouldSkipPageViewPath('/design-previews/not-registered?source=studio')).toBe(true);
    expect(shouldSkipPageViewPath('/DESIGN-PREVIEWS/dashboard')).toBe(true);
  });
});
