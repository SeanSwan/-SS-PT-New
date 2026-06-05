/**
 * Hook: useWorkoutPlannerEquipmentProfileState
 * Purpose: Loads trainer-owned equipment profiles so planner generation can
 * be constrained to a real gym, park, home, or client-home environment.
 */

import { useCallback, useEffect, useState } from 'react';
import type { PlannerEquipmentProfile } from './WorkoutPlannerTypes';

interface PlannerAuthClient {
  get: (url: string) => Promise<{ data?: { success?: boolean; profiles?: unknown[] } }>;
}

interface WorkoutPlannerEquipmentProfileStateInput {
  authAxios: PlannerAuthClient;
  userId: number | string | null | undefined;
  userRole: string | null | undefined;
}

const normalizeEquipmentProfiles = (rawProfiles: unknown[]): PlannerEquipmentProfile[] => (
  rawProfiles
    .map((profile): PlannerEquipmentProfile | null => {
      const row = profile as Partial<PlannerEquipmentProfile>;
      const id = Number(row.id);
      if (!Number.isSafeInteger(id) || id < 1 || typeof row.name !== 'string') return null;
      return {
        id,
        name: row.name,
        locationType: typeof row.locationType === 'string' ? row.locationType : 'custom',
        equipmentCount: Number(row.equipmentCount) || 0,
        isDefault: Boolean(row.isDefault),
      };
    })
    .filter((profile): profile is PlannerEquipmentProfile => profile !== null)
);

export const useWorkoutPlannerEquipmentProfileState = ({
  authAxios,
  userId,
  userRole,
}: WorkoutPlannerEquipmentProfileStateInput) => {
  const [equipmentProfiles, setEquipmentProfiles] = useState<PlannerEquipmentProfile[]>([]);
  const [equipmentProfilesLoading, setEquipmentProfilesLoading] = useState(false);
  const [selectedEquipmentProfileId, setSelectedEquipmentProfileId] = useState<number | null>(null);

  useEffect(() => {
    const numericUserId = Number(userId);
    const canLoadProfiles = (userRole === 'admin' || userRole === 'trainer')
      && Number.isSafeInteger(numericUserId)
      && numericUserId > 0;

    if (!canLoadProfiles) {
      setEquipmentProfiles([]);
      setSelectedEquipmentProfileId(null);
      setEquipmentProfilesLoading(false);
      return undefined;
    }

    let active = true;
    setEquipmentProfilesLoading(true);
    const endpoint = userRole === 'admin'
      ? '/api/equipment-profiles'
      : `/api/equipment-profiles?trainerId=${numericUserId}`;

    authAxios.get(endpoint)
      .then(res => {
        if (!active) return;
        const profiles = normalizeEquipmentProfiles(res.data?.profiles || []);
        setEquipmentProfiles(profiles);
        setSelectedEquipmentProfileId(current => (
          current && profiles.some(profile => profile.id === current) ? current : null
        ));
      })
      .catch(() => {
        if (!active) return;
        setEquipmentProfiles([]);
        setSelectedEquipmentProfileId(null);
      })
      .finally(() => {
        if (active) setEquipmentProfilesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authAxios, userId, userRole]);

  const handleEquipmentProfileChange = useCallback((rawProfileId: string) => {
    const parsed = Number(rawProfileId);
    setSelectedEquipmentProfileId(
      Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
    );
  }, []);

  return {
    equipmentProfiles,
    equipmentProfilesLoading,
    selectedEquipmentProfileId,
    handleEquipmentProfileChange,
  };
};
