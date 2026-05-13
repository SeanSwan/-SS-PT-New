import { describe, expect, it } from 'vitest';
import { getEquipmentManagerPath } from './EquipmentProfilePicker';

describe('EquipmentProfilePicker manager navigation', () => {
  it('routes to the mounted dashboard equipment tab instead of a stale hash URL', () => {
    expect(getEquipmentManagerPath('/dashboard/admin/workout-planner')).toBe('/dashboard/admin/equipment');
    expect(getEquipmentManagerPath('/dashboard/trainer/bootcamp')).toBe('/dashboard/trainer/equipment');
    expect(getEquipmentManagerPath('/dashboard/client/log-workout')).toBe('/dashboard/admin/equipment');
  });
});
