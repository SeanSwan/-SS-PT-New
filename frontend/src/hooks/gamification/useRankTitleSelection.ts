/**
 * Mutation hook for equipping an earned Swan rank title.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../use-toast';
import type { GamificationProfile } from './gamificationLegacyTypes';
import { mapRankTitlePayloadFields } from './gamificationRankTitleMappers';
import { getSafeGamificationToastDescription } from './gamificationRewardRedemption';
import { logger } from '@/utils/logger';

export const useRankTitleSelection = () => {
  const { authAxios, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const profileKey = ['gamification', 'profile', user?.id];

  const mutation = useMutation({
    mutationFn: async (rankTitleKey: string) => {
      if (!rankTitleKey) throw new Error('Rank title key is required');
      const { data } = await authAxios.put('/api/v1/gamification/profile/rank-title', { rankTitleKey });
      if (data?.success === false) throw new Error(data?.message || 'Rank title update failed');
      return data;
    },
    onSuccess: (data) => {
      const mapped = mapRankTitlePayloadFields(data || {});

      queryClient.setQueryData(profileKey, (oldData: GamificationProfile | undefined) => (
        oldData ? { ...oldData, ...mapped } : oldData
      ));
      queryClient.invalidateQueries({ queryKey: profileKey });

      toast({
        title: 'Rank title equipped',
        description: mapped.selectedRankTitleDisplay?.label || 'Your profile tag has been updated.',
        variant: 'success',
      });
    },
    onError: (error: unknown) => {
      logger.warn('[Gamification] Rank title update failed.');
      toast({
        title: 'Rank title unavailable',
        description: getSafeGamificationToastDescription(error),
        variant: 'destructive',
      });
    },
  });

  const equipRankTitle = useCallback((rankTitleKey: string) => {
    mutation.mutate(rankTitleKey);
  }, [mutation]);

  return {
    equipRankTitle,
    equipRankTitleAsync: mutation.mutateAsync,
    isEquippingRankTitle: mutation.isPending,
    equippingRankTitleKey: mutation.variables,
  };
};
