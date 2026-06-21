/**
 * PAGE: AvatarHomePage
 * PURPOSE: Dashboard-mounted entry for the user's Avatar Home.
 * DATA: /api/avatar-home and /api/gamification/profile
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, Home } from 'lucide-react';
import LevelGate from './LevelGate';
import MinimalistView from './MinimalistView';
import HomeWorld from './HomeWorld';
import CompanionPetPanel from './CompanionPetPanel';
import PetAdoptionModal from './PetAdoptionModal';
import CrystallineMarketplace from './CrystallineMarketplace';
import FactionHooksPanel from './FactionHooksPanel';
import ReadyPlayerMeAvatar from './ReadyPlayerMeAvatar';
import apiService from '../../services/api.service';
import { getSafeGamificationIdSegment } from '../../hooks/gamification/gamificationRewardRedemption';
import { normalizeReadyPlayerMeUrl } from './readyPlayerMeUrl';
import { normalizeAvatarHomeLevel } from './avatarHomeNumbers';
import {
  ErrorBanner,
  Header,
  HeaderTitle,
  HomeLayout,
  LoadingSpinner,
  LoadingState,
  ModeToggle,
  PageWrapper,
  PhaseThreeGrid,
  PhaseThreeStack,
} from './AvatarHomePage.styles';

const AVATAR_HOME_LOAD_ERROR = 'Unable to load Avatar Home. Please try again later.';
const AVATAR_HOME_MUTATION_ERROR = 'Unable to update Avatar Home. Please try again.';
const VALID_ROOMS = ['bedroom', 'kitchen', 'training_room'] as const;
const VALID_HOME_TIERS = ['starter', 'mid', 'premium', 'luxury'] as const;

interface HomeData {
  unlocked: boolean;
  avatarBodyType: string;
  avatarSkinTone: string;
  avatarHairStyle: string;
  avatarOutfit: string;
  homeTier: string;
  activeRoom: string;
  furniture: Record<string, Record<string, string>>;
  minimalistMode: boolean;
  readyPlayerMeUrl: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim() ? value : fallback;

const isKnownRoom = (value: unknown): value is typeof VALID_ROOMS[number] =>
  typeof value === 'string' && VALID_ROOMS.includes(value as typeof VALID_ROOMS[number]);

const isKnownTier = (value: unknown): value is typeof VALID_HOME_TIERS[number] =>
  typeof value === 'string' && VALID_HOME_TIERS.includes(value as typeof VALID_HOME_TIERS[number]);

const normalizeFurniture = (value: unknown): HomeData['furniture'] => {
  if (!isRecord(value)) return {};

  return VALID_ROOMS.reduce<HomeData['furniture']>((rooms, room) => {
    const roomValue = value[room];
    if (!isRecord(roomValue)) return rooms;

    const slots = Object.entries(roomValue).reduce<Record<string, string>>((safeSlots, [slot, item]) => {
      if (slot.trim() && typeof item === 'string' && item.trim()) {
        safeSlots[slot] = item;
      }
      return safeSlots;
    }, {});

    if (Object.keys(slots).length > 0) rooms[room] = slots;
    return rooms;
  }, {});
};

const normalizeAvatarHomeData = (value: unknown): HomeData | null => {
  if (!isRecord(value)) return null;

  return {
    unlocked: value.unlocked === true,
    avatarBodyType: asString(value.avatarBodyType, 'athletic'),
    avatarSkinTone: asString(value.avatarSkinTone, '#C68642'),
    avatarHairStyle: asString(value.avatarHairStyle, 'short'),
    avatarOutfit: asString(value.avatarOutfit, 'starter_workout'),
    homeTier: isKnownTier(value.homeTier) ? value.homeTier : 'starter',
    activeRoom: isKnownRoom(value.activeRoom) ? value.activeRoom : 'training_room',
    furniture: normalizeFurniture(value.furniture),
    minimalistMode: value.minimalistMode === true,
    readyPlayerMeUrl: normalizeReadyPlayerMeUrl(value.readyPlayerMeUrl),
  };
};

type AvatarHomeResponse = {
  success: boolean;
  data?: HomeData;
  message?: string;
  meta?: {
    currentLevel?: unknown;
  };
};

const AvatarHomePage: React.FC = () => {
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [userLevel, setUserLevel] = useState<number | null>(null);
  const [userIdSegment, setUserIdSegment] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [showAdoptModal, setShowAdoptModal] = useState(false);
  const [petKey, setPetKey] = useState(0);

  useEffect(() => {
    apiService.get<AvatarHomeResponse>('/api/avatar-home')
      .then(res => {
        const d = res.data;
        if (d.success) {
          const safeHome = normalizeAvatarHomeData(d.data);
          if (safeHome) {
            setHomeData(safeHome);
            const homeLevel = normalizeAvatarHomeLevel(d.meta?.currentLevel);
            if (homeLevel !== null) setUserLevel(homeLevel);
          } else {
            setError(AVATAR_HOME_LOAD_ERROR);
          }
        } else {
          setError(AVATAR_HOME_LOAD_ERROR);
        }
      })
      .catch(() => setError(AVATAR_HOME_LOAD_ERROR))
      .finally(() => setLoading(false));

    apiService.get('/api/gamification/profile')
      .then(res => {
        const d = res.data;
        const profile = d.profile || d.data || d;
        const profileUserIdSegment = getSafeGamificationIdSegment(profile?.id ?? profile?.userId);
        const profileLevel = normalizeAvatarHomeLevel(profile?.level);
        if (profileLevel !== null) setUserLevel(profileLevel);
        if (profileUserIdSegment) setUserIdSegment(profileUserIdSegment);
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, []);

  const toggleMinimalistMode = useCallback(async () => {
    setMutationError(null);
    try {
      const res = await apiService.patch<{ success: boolean; data: { minimalistMode: boolean } }>(
        '/api/avatar-home/minimalist-mode'
      );
      const d = res.data;
      if (d.success && homeData && typeof d.data?.minimalistMode === 'boolean') {
        setHomeData({ ...homeData, minimalistMode: d.data.minimalistMode });
      } else {
        setMutationError(AVATAR_HOME_MUTATION_ERROR);
      }
    } catch {
      setMutationError(AVATAR_HOME_MUTATION_ERROR);
    }
  }, [homeData]);

  const handleRoomChange = useCallback(async (room: string) => {
    setMutationError(null);
    try {
      const res = await apiService.patch<{ success: boolean; data: { activeRoom: string } }>(
        '/api/avatar-home/room',
        { room }
      );
      const d = res.data;
      if (d.success && homeData) {
        setHomeData({ ...homeData, activeRoom: room });
      } else {
        setMutationError(AVATAR_HOME_MUTATION_ERROR);
      }
    } catch {
      setMutationError(AVATAR_HOME_MUTATION_ERROR);
    }
  }, [homeData]);

  if (loading) {
    return (
      <PageWrapper>
        <LoadingState>
          <LoadingSpinner size={18} aria-hidden="true" />
          Loading your home...
        </LoadingState>
      </PageWrapper>
    );
  }

  if (error) return <PageWrapper><ErrorBanner>{error}</ErrorBanner></PageWrapper>;

  if (!homeData?.unlocked) {
    if (userLevel === null && profileLoading) {
      return (
        <PageWrapper>
          <LoadingState>
            <LoadingSpinner size={18} aria-hidden="true" />
            Verifying unlock progress...
          </LoadingState>
        </PageWrapper>
      );
    }

    return (
      <PageWrapper>
        {userLevel !== null ? (
          <LevelGate currentLevel={userLevel} requiredLevel={10} />
        ) : (
          <ErrorBanner>Unable to verify Avatar Home unlock progress. Please try again later.</ErrorBanner>
        )}
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <Header>
        <HeaderTitle>
          <Home size={20} aria-hidden="true" /> My Home
        </HeaderTitle>
        <ModeToggle
          type="button"
          $minimalist={homeData.minimalistMode}
          onClick={toggleMinimalistMode}
          aria-pressed={homeData.minimalistMode}
        >
          {homeData.minimalistMode ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
          {homeData.minimalistMode ? 'Minimalist Mode' : '3D Mode'}
        </ModeToggle>
      </Header>

      {mutationError && (
        <ErrorBanner role="status" aria-live="polite">{mutationError}</ErrorBanner>
      )}

      {homeData.minimalistMode ? (
        <MinimalistView data={homeData} onToggle3D={toggleMinimalistMode} />
      ) : (
        <HomeLayout>
          <HomeWorld
            homeTier={homeData.homeTier}
            activeRoom={homeData.activeRoom}
            furniture={homeData.furniture}
            onRoomChange={handleRoomChange}
          />
          {userIdSegment && (
            <CompanionPetPanel
              key={petKey}
              userIdSegment={userIdSegment}
              onAdoptClick={() => setShowAdoptModal(true)}
            />
          )}
        </HomeLayout>
      )}

      {!homeData.minimalistMode && (
        <PhaseThreeStack>
          <CrystallineMarketplace />
          <PhaseThreeGrid>
            <FactionHooksPanel />
            <ReadyPlayerMeAvatar
              currentUrl={homeData.readyPlayerMeUrl}
              onAvatarUpdate={(url) => (
                setHomeData(prev => prev ? { ...prev, readyPlayerMeUrl: url } : prev)
              )}
            />
          </PhaseThreeGrid>
        </PhaseThreeStack>
      )}

      {showAdoptModal && userIdSegment && (
        <PetAdoptionModal
          userIdSegment={userIdSegment}
          onClose={() => setShowAdoptModal(false)}
          onAdopted={() => setPetKey(k => k + 1)}
        />
      )}
    </PageWrapper>
  );
};

export default AvatarHomePage;
