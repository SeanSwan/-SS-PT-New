import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useWorkoutPlannerEquipmentProfileState } from './useWorkoutPlannerEquipmentProfileState';

const profilesResponse = {
  data: {
    success: true,
    profiles: [{
      id: 77,
      name: 'Move Fitness',
      locationType: 'gym',
      equipmentCount: 24,
      isDefault: true,
    }],
  },
};

describe('useWorkoutPlannerEquipmentProfileState', () => {
  it('loads trainer equipment profiles for planner generation constraints', async () => {
    const authAxios = { get: vi.fn().mockResolvedValue(profilesResponse) };

    const { result } = renderHook(() => useWorkoutPlannerEquipmentProfileState({
      authAxios,
      userId: 7,
      userRole: 'trainer',
    }));

    await waitFor(() => {
      expect(result.current.equipmentProfilesLoading).toBe(false);
    });

    expect(authAxios.get).toHaveBeenCalledWith('/api/equipment-profiles?trainerId=7');
    expect(result.current.equipmentProfiles).toEqual([{
      id: 77,
      name: 'Move Fitness',
      locationType: 'gym',
      equipmentCount: 24,
      isDefault: true,
    }]);
  });

  it('does not call trainer-only equipment APIs for client viewers', async () => {
    const authAxios = { get: vi.fn() };

    const { result } = renderHook(() => useWorkoutPlannerEquipmentProfileState({
      authAxios,
      userId: 91,
      userRole: 'client',
    }));

    expect(authAxios.get).not.toHaveBeenCalled();
    expect(result.current.equipmentProfilesLoading).toBe(false);
    expect(result.current.equipmentProfiles).toEqual([]);
  });

  it('loads admin-visible equipment profiles without seeding admin-owned defaults', async () => {
    const authAxios = { get: vi.fn().mockResolvedValue(profilesResponse) };

    renderHook(() => useWorkoutPlannerEquipmentProfileState({
      authAxios,
      userId: 1,
      userRole: 'admin',
    }));

    await waitFor(() => {
      expect(authAxios.get).toHaveBeenCalledWith('/api/equipment-profiles');
    });
  });

  it('parses equipment profile selection from command-panel values', async () => {
    const authAxios = { get: vi.fn().mockResolvedValue(profilesResponse) };
    const { result } = renderHook(() => useWorkoutPlannerEquipmentProfileState({
      authAxios,
      userId: 7,
      userRole: 'trainer',
    }));

    await waitFor(() => {
      expect(result.current.equipmentProfilesLoading).toBe(false);
    });

    act(() => result.current.handleEquipmentProfileChange('77'));
    expect(result.current.selectedEquipmentProfileId).toBe(77);

    act(() => result.current.handleEquipmentProfileChange(''));
    expect(result.current.selectedEquipmentProfileId).toBeNull();
  });
});
