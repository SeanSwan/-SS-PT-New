/**
 * Data and action controller for the canonical user dashboard V3 shell.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useGamificationData } from '../../../hooks/gamification/useGamificationData';
import { isDataKnown, resolveDataStatus } from './resolveDataStatus';
import { useProfile } from '../../../hooks/profile/useProfile';
import { getTier, getTierDisplay } from '../../../types/gamification';
import { useToast } from '../../../hooks/use-toast';
import {
  getTransformationPhotos,
  getTransformationVisibility,
} from '../components/ObservatoryShellAdapter';
import type { TabId } from '../types/UserDashboardTypes';
import { sanitizeImageUrl } from '../../../utils/imageUrl';
import { useBannerCompositionState } from './useBannerCompositionState';

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function useUserDashboardV3Controller() {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    profile,
    stats,
    posts: profilePosts,
    followStats,
    followStatsKnown,
    isLoading,
    error,
    statsKnown,
    uploadProfilePhoto,
    uploadBannerPhoto,
    uploadBannerCollagePhoto,
    updateProfile,
    refreshProfile,
    getDisplayName,
    getUsernameForDisplay,
    getUserInitials,
  } = useProfile();
  const { profile: gamProfile, levelProgress, refetch: refetchGamification } = useGamificationData();
  // The Observatory rail and the Quick Stats ticker both render these numbers
  // on EVERY non-Home tab. `levelProgress` is fabricated from `?? 0` upstream,
  // so without this gate an outage renders as "0 pts now · Creator Streak 0
  // days" — the same false record the Home rail was fixed to stop asserting.
  const gamificationStatus = resolveDataStatus(gamProfile);
  const gamificationKnown = isDataKnown(gamificationStatus);

  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  const previewUrlRef = useRef<string | null>(null);
  const uploadIdRef = useRef<number>(0);

  const revokePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (previewUrlRef.current !== null) return;
    const safe = sanitizeImageUrl(profile?.bannerPhoto);
    setBackgroundImage(safe);
  }, [profile?.bannerPhoto]);

  useEffect(() => {
    return () => revokePreview();
  }, [revokePreview]);

  const bannerComposition = useBannerCompositionState({
    profile,
    updateProfile,
    uploadBannerCollagePhoto,
    onBannerPhotoPreview: setBackgroundImage,
  });

  const displayStats = useMemo(() => ({
    posts: stats?.posts || 0,
    followers: stats?.followers || 0,
    following: stats?.following || 0,
    workouts: stats?.workouts || 0,
    points: stats?.points || 0,
    level: stats?.level ?? 0,
  }), [stats]);

  const canonicalLevel = levelProgress?.level ?? stats?.level ?? 0;
  const observatoryTierName = levelProgress?.tierDisplay?.name ?? getTierDisplay(getTier(canonicalLevel || 1)).name;
  const selectedRankTitle = gamProfile?.data?.selectedRankTitleDisplay ?? gamProfile?.data?.currentRankTitleDisplay;
  const observatoryRankTitleLabel = selectedRankTitle?.label
    ? `Level ${canonicalLevel || 1} | ${selectedRankTitle.label}`
    : `Level ${canonicalLevel || 1} | ${observatoryTierName}`;

  const topBadges = useMemo(() => {
    const earned = gamProfile?.data?.achievements || [];
    return [...earned]
      .sort((a, b) => (b.pointsAwarded || 0) - (a.pointsAwarded || 0))
      .slice(0, 3)
      .map(ua => ({
        id: String(ua.id),
        name: ua.achievement?.name || 'Achievement',
        icon: ua.achievement?.icon || '\u{1F3C6}',
      }));
  }, [gamProfile?.data?.achievements]);

  const transformationPhotos = useMemo(() => getTransformationPhotos(profile as unknown as Record<string, unknown> | null | undefined), [profile]);
  const transformationVisibility = useMemo(() => getTransformationVisibility(profile as unknown as Record<string, unknown> | null | undefined), [profile]);

  // 2026-05-10 SLICE 1 — AI Village 15-brain Phase-2B consensus + Architecture
  const handleFileUpload = useCallback(async (file: File, type: 'profile' | 'background') => {
    if (!file || !ALLOWED_TYPES.includes(file.type)) return;
    if (file.size > MAX_UPLOAD_SIZE) return;

    if (type === 'profile') {
      try {
        await uploadProfilePhoto(file);
      } catch (uploadError) {
        console.error('Upload error:', uploadError);
      }
      return;
    }

    revokePreview();
    const thisUploadId = ++uploadIdRef.current;
    const objectUrl = URL.createObjectURL(file);
    previewUrlRef.current = objectUrl;
    setBackgroundImage(objectUrl);

    try {
      // 2026-05-11 SLICE 1 (Codex round-5 race fix): commit DIRECTLY from
      // the resolved server URL, not from profile state via a ref. profile
      // state updates are scheduled by useProfile.setProfile but only flow
      // into refs/effects AFTER React commits — reading them immediately
      // after await could see a different upload's URL on a concurrent
      // race. The returned value is unambiguously THIS upload's server URL.
      const serverUrl = await uploadBannerPhoto(file);
      // Only commit if I'm still the latest upload — a newer concurrent
      // upload will resolve later with its own server URL and own commit.
      if (thisUploadId === uploadIdRef.current) {
        revokePreview();
        setBackgroundImage(sanitizeImageUrl(serverUrl));
      }
    } catch (uploadError) {
      console.error('Upload error:', uploadError);
      // Only revert if no newer upload has superseded this one. Read the
      // pre-upload banner URL from profile (closure-captured) — the
      // failure path did NOT mutate profile.bannerPhoto, so the closure
      // value is the correct rollback target.
      if (thisUploadId === uploadIdRef.current) {
        revokePreview();
        setBackgroundImage(sanitizeImageUrl(profile?.bannerPhoto));
      }
    }
  }, [profile?.bannerPhoto, uploadBannerPhoto, uploadProfilePhoto, revokePreview]);

  const handleProfileImageClick = useCallback(() => {
    profileInputRef.current?.click();
  }, []);

  const handleBackgroundClick = useCallback(() => {
    backgroundInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>, type: 'profile' | 'background') => {
    const file = event.target.files?.[0];
    if (file) handleFileUpload(file, type);
  }, [handleFileUpload]);

  const handleEditProfile = useCallback(() => setShowEditModal(true), []);

  const handleSettings = useCallback(() => {
    setActiveTab('profile');
    setShowEditModal(true);
  }, []);

  const handleShare = useCallback(async () => {
    const shareUrl = user?.id ? `${window.location.origin}/profile/${user.id}` : window.location.href;
    const shareData = { title: `${getDisplayName()} on SwanStudios`, url: shareUrl };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        return;
      }
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'Profile link copied',
        description: 'The profile link is ready to share.',
        variant: 'success',
      });
    } catch {
      toast({
        title: 'Share failed',
        description: 'Copy was not available in this browser.',
        variant: 'destructive',
      });
      return;
    }
  }, [getDisplayName, toast, user?.id]);

  return {
    profile,
    profilePosts,
    // null, not a zeroed object: a zeroed followStats renders "0 followers"
    // as fact, while null falls through to the profile-stats path, which is
    // already gated by profileStatsKnown.
    followStats: followStatsKnown ? followStats : null,
    isLoading,
    error,
    activeTab,
    setActiveTab,
    backgroundImage,
    ...bannerComposition,
    showEditModal,
    setShowEditModal,
    displayStats,
    canonicalLevel,
    levelProgress,
    observatoryLevel: canonicalLevel,
    gamificationKnown,
    gamificationStatus,
    profileStatsKnown: statsKnown,
    followStatsKnown,
    refetchGamification,
    observatoryPoints: gamProfile?.data?.points ?? stats?.points ?? 0,
    observatoryTierName,
    observatoryRankTitleLabel,
    observatoryProgressPct: levelProgress?.progressPercent ?? 0,
    observatoryXpToNext: levelProgress?.pointsNeededForNext ?? 0,
    observatoryStreakDays: gamProfile?.data?.streakDays ?? 0,
    topBadges,
    transformationPhotos,
    transformationVisibility,
    profileInputRef,
    backgroundInputRef,
    updateProfile,
    refreshProfile,
    getDisplayName,
    getUsernameForDisplay,
    getUserInitials,
    handleProfileImageClick,
    handleBackgroundClick,
    handleFileChange,
    handleEditProfile,
    handleSettings,
    handleShare,
  };
}

export type UserDashboardV3Controller = ReturnType<typeof useUserDashboardV3Controller>;
