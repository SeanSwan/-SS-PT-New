import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useEquipmentAPI } from '../../hooks/useEquipmentAPI';
import type { ExerciseSlim } from '../WorkoutLogger/useExerciseSearch';
import {
  buildEquipmentProfileTokens,
  filterExercisesByEquipmentProfile,
} from './BootcampEquipmentProfileFilter';

export function useBootcampEquipmentProfileGuard(profileId: number | null) {
  const { getProfile } = useEquipmentAPI();
  const [profileTokens, setProfileTokens] = useState<string[]>([]);
  const [verifiedProfileId, setVerifiedProfileId] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);
  const [loadState, setLoadState] = useState<'ready' | 'loading' | 'error'>('ready');

  useEffect(() => {
    let cancelled = false;
    if (!profileId) {
      setProfileTokens([]);
      setLoadState('ready');
      return () => { cancelled = true; };
    }
    setLoadState('loading');
    setProfileTokens([]);
    getProfile(profileId)
      .then((data) => {
        if (cancelled) return;
        setProfileTokens(buildEquipmentProfileTokens(data.items || []));
        setVerifiedProfileId(profileId);
        setLoadState('ready');
      })
      .catch(() => {
        if (!cancelled) setLoadState('error');
      });
    return () => { cancelled = true; };
  }, [getProfile, profileId, retry]);

  return useCallback((exercise: ExerciseSlim) => {
    if (!profileId) return true;
    if (loadState !== 'ready' || verifiedProfileId !== profileId) {
      if (loadState === 'error') setRetry(value => value + 1);
      toast.error('Equipment profile is still being verified. Retry after it loads.');
      return false;
    }
    if (filterExercisesByEquipmentProfile([exercise], profileTokens).length === 0) {
      toast.error('That exercise does not satisfy the selected equipment profile.');
      return false;
    }
    return true;
  }, [loadState, profileId, profileTokens, verifiedProfileId]);
}
