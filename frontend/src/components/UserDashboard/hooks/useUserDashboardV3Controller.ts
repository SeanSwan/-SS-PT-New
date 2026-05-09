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
import type { TabId } from '../types/UserDashboardTypes';

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function useUserDashboardV3Controller() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    profile,
    stats,
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
  const profileInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.bannerPhoto) setBackgroundImage(profile.bannerPhoto);
  }, [profile?.bannerPhoto]);

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

  const observatoryNextBest = useMemo(
    () => buildObservatoryNextBestActions(navigate, setActiveTab, user?.role),
    [navigate, user?.role],
  );

  const handleFileUpload = useCallback(async (file: File, type: 'profile' | 'background') => {
    if (!file || !ALLOWED_TYPES.includes(file.type)) return;
    if (file.size > MAX_UPLOAD_SIZE) return;

    let previewUrl: string | null = null;

    try {
      if (type === 'profile') {
        await uploadProfilePhoto(file);
      } else {
        previewUrl = URL.createObjectURL(file);
        setBackgroundImage(previewUrl);
        await uploadBannerPhoto(file);
      }
    } catch (uploadError) {
      console.error('Upload error:', uploadError);
      if (type === 'background') setBackgroundImage(profile?.bannerPhoto || null);
    } finally {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    }
  }, [profile?.bannerPhoto, uploadBannerPhoto, uploadProfilePhoto]);

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
    isLoading,
    error,
    activeTab,
    setActiveTab,
    backgroundImage,
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
