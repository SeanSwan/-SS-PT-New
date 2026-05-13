/**
 * Data and action controller for the canonical user dashboard V3 shell.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useGamificationData } from '../../../hooks/gamification/useGamificationData';
import { useProfile } from '../../../hooks/profile/useProfile';
import {
  buildObservatoryNextBestActions,
  getTransformationPhotos,
  getTransformationVisibility,
} from '../components/ObservatoryShellAdapter';
import { resetUserDashboardTabScroll } from '../components/UserDashboardTabScroll';
import type { TabId } from '../types/UserDashboardTypes';
import { sanitizeImageUrl } from '../../../utils/imageUrl';
import { isBannerObjectPosition, type BannerObjectPosition } from '../../../services/profileService';

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function useUserDashboardV3Controller() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    profile,
    stats,
    posts: profilePosts,
    followStats,
    isLoading,
    error,
    uploadProfilePhoto,
    uploadBannerPhoto,
    updateProfile,
    getDisplayName,
    getUsernameForDisplay,
    getUserInitials,
  } = useProfile();
  const { profile: gamProfile, levelProgress } = useGamificationData();

  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  // 2026-05-10 SLICE 2: banner crop-alignment state.
  const [bannerObjectPosition, setBannerObjectPosition] =
    useState<BannerObjectPosition>('center center');
  const [showRepositionPanel, setShowRepositionPanel] = useState(false);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  // 2026-05-10 SLICE 1 (Phase-2B consensus + Security CHAIN-1 + Codex
  // rounds 3 / 4 / 5 race fix):
  //   - previewUrlRef tracks the current optimistic blob: URL (may be null).
  //   - uploadIdRef monotonically increases on each upload kick-off; it is
  //     the canonical "latest upload" token.
  //   - The banner-sync effect ONLY commits external profile changes when
  //     no optimistic preview is showing. While a preview is showing,
  //     handleFileUpload owns the commit (via the explicit success branch
  //     below, gated on `thisUploadId === uploadIdRef.current`).
  //   - The success branch commits the server URL RETURNED DIRECTLY by
  //     uploadBannerPhoto, NOT from profile state — useProfile's
  //     setProfile call schedules a render whose effects only run AFTER
  //     commit, so reading profile via a ref-bridge here could see the
  //     PREVIOUS upload's URL on a concurrent-upload race (Codex round-5).
  //   - sanitizeImageUrl() filters server URLs through an origin allowlist
  //     and strips CSS-injection chars BEFORE they reach styled-components.
  const previewUrlRef = useRef<string | null>(null);
  const uploadIdRef = useRef<number>(0);

  const revokePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  // Hydrate banner state from external profile changes (initial load,
  // refetches triggered by sibling surfaces). When the user is mid-upload
  // (previewUrlRef !== null), this effect refuses to act — handleFileUpload
  // owns the commit at that point, so a stale older-upload server URL
  // arriving via this effect cannot clobber the newer optimistic preview.
  // The else branch fires on both empty AND rejected (Codex round-2 LOW).
  useEffect(() => {
    if (previewUrlRef.current !== null) return;
    const safe = sanitizeImageUrl(profile?.bannerPhoto);
    setBackgroundImage(safe);
  }, [profile?.bannerPhoto]);

  // Unmount cleanup so a hot navigation away mid-upload doesn't leak the blob.
  useEffect(() => {
    return () => revokePreview();
  }, [revokePreview]);

  // 2026-05-10 SLICE 2: hydrate bannerObjectPosition from profile. Guard
  // with isBannerObjectPosition() so a malformed/poisoned value from the
  // server falls back to the default rather than landing in CSS.
  useEffect(() => {
    const incoming = profile?.bannerObjectPosition;
    if (isBannerObjectPosition(incoming)) {
      setBannerObjectPosition(incoming);
    }
  }, [profile?.bannerObjectPosition]);

  const displayStats = useMemo(() => ({
    posts: stats?.posts || 0,
    followers: stats?.followers || 0,
    following: stats?.following || 0,
    workouts: stats?.workouts || 0,
    points: stats?.points || 0,
    level: stats?.level ?? 0,
  }), [stats]);

  const canonicalLevel = levelProgress?.level ?? stats?.level ?? 0;

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

  const transformationPhotos = useMemo(
    () => getTransformationPhotos(profile as Record<string, unknown> | null | undefined),
    [profile],
  );

  const transformationVisibility = useMemo(
    () => getTransformationVisibility(profile as Record<string, unknown> | null | undefined),
    [profile],
  );

  const observatoryNextBest = useMemo(() => buildObservatoryNextBestActions(navigate, (tab) => {
    setActiveTab(tab);
    resetUserDashboardTabScroll();
  }, user?.role), [navigate, user?.role]);

  // 2026-05-10 SLICE 1 — AI Village 15-brain Phase-2B consensus + Architecture
  // & Bug Hunter agreement: the prior implementation revoked the optimistic
  // preview blob in a `finally` block while React state still pointed at it,
  // leaving a broken image until the profile.bannerPhoto effect resolved.
  // The rewrite below pairs each upload with an ID so a stale failure path
  // cannot clobber a newer upload, and defers revocation to either the
  // server-URL effect (success) or the gated catch (failure) / unmount.
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

    // Background path: optimistic preview, gated success + failure commit.
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

  // 2026-05-10 SLICE 2: change crop preset. Optimistic local update so the
  // user sees the crop apply instantly; updateProfile() persists. On failure
  // the next profile refresh restores the truth via the hydration effect.
  const handleBannerPositionChange = useCallback(async (next: BannerObjectPosition) => {
    setBannerObjectPosition(next);
    setShowRepositionPanel(false);
    try {
      await updateProfile({ bannerObjectPosition: next });
    } catch (positionError) {
      console.error('Failed to save banner crop preset:', positionError);
    }
  }, [updateProfile]);

  const toggleRepositionPanel = useCallback(() => {
    setShowRepositionPanel((open) => !open);
  }, []);

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
    const shareUrl = `${window.location.origin}/profile/${user?.id}`;
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
      await navigator.clipboard.writeText(shareUrl);
      alert('Profile link copied to clipboard!');
    } catch {
      return;
    }
  }, [getDisplayName, user?.id]);

  return {
    profile,
    profilePosts,
    followStats,
    isLoading,
    error,
    activeTab,
    setActiveTab,
    backgroundImage,
    bannerObjectPosition,
    showRepositionPanel,
    toggleRepositionPanel,
    handleBannerPositionChange,
    showEditModal,
    setShowEditModal,
    displayStats,
    canonicalLevel,
    levelProgress,
    observatoryLevel: canonicalLevel,
    observatoryPoints: gamProfile?.data?.points ?? stats?.points ?? 0,
    observatoryTierName: levelProgress?.tierDisplay?.name ?? 'Bronze Forge',
    observatoryProgressPct: levelProgress?.progressPercent ?? 0,
    observatoryXpToNext: levelProgress?.pointsToNextLevel ?? 0,
    observatoryStreakDays: gamProfile?.data?.streakDays ?? 0,
    observatoryNextBest,
    topBadges,
    transformationPhotos,
    transformationVisibility,
    profileInputRef,
    backgroundInputRef,
    updateProfile,
    getDisplayName,
    getUsernameForDisplay,
    getUserInitials,
    handleProfileImageClick,
    handleBackgroundClick,
    handleFileChange,
    handleEditProfile,
    handleSettings,
    handleShare,
    navigate,
  };
}

export type UserDashboardV3Controller = ReturnType<typeof useUserDashboardV3Controller>;
