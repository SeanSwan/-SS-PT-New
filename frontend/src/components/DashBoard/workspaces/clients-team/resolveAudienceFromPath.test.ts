/**
 * resolveAudienceFromPath.test.ts
 * ================================
 * Locks route locality: a shared surface must send the actor back into the
 * dashboard they are already in. Getting this wrong is not a cosmetic routing
 * miss — an admin sent to /dashboard/trainer/* has their entire shell swapped
 * to the trainer dashboard (UniversalDashboardLayout.tsx:77).
 */
import { describe, it, expect } from 'vitest';
import { resolveAudienceFromPath } from './resolveAudienceFromPath';

describe('resolveAudienceFromPath', () => {
  it('resolves the trainer dashboard to the trainer audience', () => {
    expect(resolveAudienceFromPath('/dashboard/trainer/client-progress')).toBe('trainer');
    expect(resolveAudienceFromPath('/dashboard/trainer/clients')).toBe('trainer');
  });

  it('resolves the admin dashboard to the admin audience', () => {
    expect(resolveAudienceFromPath('/dashboard/admin/client-progress')).toBe('admin');
    expect(resolveAudienceFromPath('/dashboard/admin/client-management')).toBe('admin');
  });

  it('never lets a non-role segment masquerade as the trainer dashboard', () => {
    // Substring matching would wrongly return 'trainer' for all of these.
    expect(resolveAudienceFromPath('/dashboard/admin/trainer-management')).toBe('admin');
    expect(resolveAudienceFromPath('/dashboard/admin/trainer-payouts')).toBe('admin');
    expect(resolveAudienceFromPath('/dashboard/admin/trainer-permissions')).toBe('admin');
    expect(resolveAudienceFromPath('/dashboard/client/overview?ref=trainer')).toBe('admin');
  });

  it('falls back to the admin audience for unusable input', () => {
    expect(resolveAudienceFromPath(undefined)).toBe('admin');
    expect(resolveAudienceFromPath(null)).toBe('admin');
    expect(resolveAudienceFromPath('')).toBe('admin');
    expect(resolveAudienceFromPath('/login')).toBe('admin');
    expect(resolveAudienceFromPath('/dashboard')).toBe('admin');
  });

  it('tolerates trailing slashes and deep nesting', () => {
    expect(resolveAudienceFromPath('/dashboard/trainer/')).toBe('trainer');
    expect(resolveAudienceFromPath('/dashboard/trainer/clients/61/progress')).toBe('trainer');
  });
});