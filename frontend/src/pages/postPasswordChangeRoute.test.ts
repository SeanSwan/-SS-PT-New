import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolvePostPasswordChangeRoute } from './postPasswordChangeRoute';

describe('resolvePostPasswordChangeRoute', () => {
  it('keeps forced-password-change users on their role-appropriate first dashboard', () => {
    expect(resolvePostPasswordChangeRoute('admin')).toBe('/dashboard/admin/coach-assistant');
    expect(resolvePostPasswordChangeRoute('trainer')).toBe('/dashboard/trainer/overview');
    expect(resolvePostPasswordChangeRoute('client')).toBe('/dashboard/client/overview');
    expect(resolvePostPasswordChangeRoute('user')).toBe('/user-dashboard');
    expect(resolvePostPasswordChangeRoute(undefined)).toBe('/user-dashboard');
  });

  it('keeps EnhancedLoginModal wired to the shared forced-password-change route resolver', () => {
    const source = readFileSync(resolve(__dirname, 'EnhancedLoginModal.tsx'), 'utf8');

    expect(source).toContain("import { resolvePostPasswordChangeRoute } from './postPasswordChangeRoute';");
    expect(source).toContain('window.location.href = resolvePostPasswordChangeRoute(result.user.role);');
    expect(source).not.toContain("result.user.role === 'admin' ? '/dashboard/admin/coach-assistant'");
  });
});