/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: UserDashboard (V3 Orchestrator)                  ║
 * ║  PURPOSE: Main user dashboard page — composes all sections   ║
 * ║  OWNER: Claude Opus 4.6                                      ║
 * ║  LAST VALIDATED: 2026-03-22                                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │ [Banner Image / Gradient]                                   │
 * │              [Avatar + Camera]                               │
 * ├────────────────────────────────────────────────────────────┤
 * │          Display Name                                       │
 * │          @username  [Role Badge]                             │
 * │   [Posts]    [Followers]   [Following]                       │
 * │   Bio text...                                               │
 * │   [Edit Profile]  [Settings]  [Share]                       │
 * ├──────────┬─────────────────────────────────────────────────┤
 * │ Sidebar  │  [Feed] [Creative] [Photos] [About] ...         │
 * │ Quick    │  ┌─────────────────────────────────────┐        │
 * │ Stats    │  │ Active Tab Content (lazy-loaded)     │        │
 * │          │  └─────────────────────────────────────┘        │
 * └──────────┴─────────────────────────────────────────────────┘
 *
 * MERMAID ARCHITECTURE:
 * graph TD
 *   A[UserDashboard] --> B[ProfileBanner]
 *   A --> C[ProfileHeaderInfo]
 *   A --> D[QuickStatsSidebar]
 *   A --> E[TabNavigation]
 *   A --> F[TabContent]
 *   A --> G[EditProfileModal]
 *   A --> H[ErrorBoundary]
 *   F --> F1[SocialFeed]
 *   F --> F2[CreativeGallery]
 *   F --> F3[PhotoGallery]
 *   F --> F4[AboutSection]
 *   F --> F5[ActivitySection]
 *   F --> F6[NutritionWorkspace]
 *
 * CLICK-OUTCOME FLOWCHART:
 * [Banner click] -> Opens file picker -> uploadBannerPhoto -> optimistic preview
 * [Camera button] -> Opens file picker -> uploadProfilePhoto -> profile updates
 * [Edit Profile] -> Opens EditProfileModal -> PATCH /api/profile -> modal closes
 * [Settings] -> navigate('/dashboard/profile') -> settings page
 * [Share] -> Web Share API or clipboard copy -> feedback alert
 * [Tab click] -> setActiveTab -> lazy-loads tab component
 *
 * DATA FLOW:
 * Props In:  (none — top-level page)
 * State:     { activeTab, showEditModal }
 * Hooks:     useAuth, useUniversalTheme, useProfile, useFileUpload
 * API Calls: via useProfile (GET/PATCH /api/profile, POST /api/upload)
 * Events:    onTabChange, onEditProfile, onSettings, onShare
 * Children:  ProfileBanner, ProfileHeaderInfo, QuickStatsSidebar,
 *            TabNavigation, TabContent, EditProfileModal, ErrorBoundary
 */

import React, { useState, useCallback, useMemo, Suspense, lazy } from 'react';
import {
  Sparkles,
  Music2,
  Image as ImageIcon,
  Users,
  Activity,
  Apple,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUniversalTheme } from '../../context/ThemeContext/UniversalThemeContext';
import { useProfile } from '../../hooks/profile/useProfile';
import { useFileUpload } from './hooks/useFileUpload';
import type { TabConfig, ProfileStats } from './types/UserDashboardTypes';

// ─────────────────────────────────────────────────────────────
// SECTION: Sub-component Imports
// PURPOSE: Eagerly-loaded structural components
// ─────────────────────────────────────────────────────────────

import UserDashboardErrorBoundary from './components/ErrorBoundary';
import ProfileBanner from './components/ProfileBanner';
import ProfileHeaderInfo from './components/ProfileHeaderInfo';
import QuickStatsSidebar from './components/QuickStatsSidebar';
import TabNavigation from './components/TabNavigation';
import TabContent from './components/TabContent';
import TransformationPhotoShowcase from './components/TransformationPhotoShowcase';
import type { TransformationPhoto } from './components/TransformationPhotoTypes';
import {
  NoiseOverlay,
  MainContentZWrapper,
  ProfileContainer,
  ContentWrapper,
  ContentGrid,
  MainContent,
  LoadingContainer,
  LoadingSpinner,
  HiddenInput,
} from './styles/LayoutStyles';
import { ProfileHeaderCard } from './styles/ProfileStyles';
import { PrimaryButton } from './styles/InfoStyles';

// Lazy-load the edit modal since it's rarely used
const EditProfileModal = lazy(() => import('./components/EditProfileModal'));

// ─────────────────────────────────────────────────────────────
// SECTION: Tab Configuration
// PURPOSE: Static tab definitions (icon + label + id)
// ─────────────────────────────────────────────────────────────

const TABS: TabConfig[] = [
  { id: 'feed', label: 'Feed', icon: Sparkles },
  { id: 'creative', label: 'Creative', icon: Music2 },
  { id: 'photos', label: 'Photos', icon: ImageIcon },
  { id: 'about', label: 'About', icon: Users },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'nutrition', label: 'Nutrition', icon: Apple },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Main Orchestrator
// PURPOSE: Composes all sub-components, manages state & routing
// ─────────────────────────────────────────────────────────────

const UserDashboardV3: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useUniversalTheme();
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

  // File upload management (refs, optimistic preview, handlers)
  const {
    profileInputRef,
    backgroundInputRef,
    backgroundImage,
    handleProfileImageClick,
    handleBackgroundClick,
    handleFileChange,
  } = useFileUpload({
    uploadProfilePhoto,
    uploadBannerPhoto,
    serverBannerUrl: profile?.bannerPhoto || null,
  });

  // Local UI state
  const [activeTab, setActiveTab] = useState('feed');
  const [showEditModal, setShowEditModal] = useState(false);

  // Memoized stats with fallbacks
  const displayStats: ProfileStats = useMemo(() => ({
    posts: stats?.posts || 0,
    followers: stats?.followers || 0,
    following: stats?.following || 0,
    workouts: stats?.workouts || 0,
    points: stats?.points || 0,
    level: stats?.level || 1,
  }), [stats]);

  // Action handlers
  const handleEditProfile = useCallback(() => setShowEditModal(true), []);
  const handleSettings = useCallback(() => navigate('/dashboard/profile'), [navigate]);

  const handleShare = useCallback(async () => {
    const shareUrl = `${window.location.origin}/user-dashboard`;
    const shareData = {
      title: `${getDisplayName()} on SwanStudios`,
      url: shareUrl,
    };

    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Profile link copied to clipboard!');
      } catch { /* fallback silent */ }
    }
  }, [getDisplayName]);

  // Derived display values
  const roleDisplay = profile?.role
    ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
    : 'User';

  const bioDisplay = profile?.bio ||
    'Spreading positive energy through fitness & wellness. SwanStudios community member. Join me on this transformation journey!';

  // Transformation photos from profile (ClientPhoto model data)
  const transformationPhotos: TransformationPhoto[] = useMemo(() => {
    const raw = (profile as Record<string, unknown>)?.transformationPhotos;
    if (Array.isArray(raw)) return raw as TransformationPhoto[];
    return [];
  }, [profile]);

  const transformationVisibility = useMemo(() => {
    const settings = (profile as Record<string, unknown>)?.transformationSettings;
    if (settings && typeof settings === 'object' && 'defaultVisibility' in (settings as Record<string, unknown>)) {
      return ((settings as Record<string, unknown>).defaultVisibility as string) || 'private';
    }
    return 'private';
  }, [profile]);

  const showTransformation = useMemo(() => {
    const settings = (profile as Record<string, unknown>)?.transformationSettings;
    if (settings && typeof settings === 'object' && 'showOnProfile' in (settings as Record<string, unknown>)) {
      return !!(settings as Record<string, unknown>).showOnProfile;
    }
    return false;
  }, [profile]);

  // ─── Loading State ───
  if (isLoading && !profile) {
    return (
      <ProfileContainer>
        <NoiseOverlay />
        <MainContentZWrapper>
          <LoadingContainer><LoadingSpinner /></LoadingContainer>
        </MainContentZWrapper>
      </ProfileContainer>
    );
  }

  // ─── Error State ───
  if (error && !profile) {
    return (
      <ProfileContainer>
        <NoiseOverlay />
        <MainContentZWrapper>
          <ContentWrapper>
            <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <h2>Error Loading Profile</h2>
              <p style={{ marginBottom: '2rem' }}>{error}</p>
              <PrimaryButton onClick={() => window.location.reload()}>
                Retry
              </PrimaryButton>
            </div>
          </ContentWrapper>
        </MainContentZWrapper>
      </ProfileContainer>
    );
  }

  return (
    <UserDashboardErrorBoundary>
      <ProfileContainer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <NoiseOverlay />

        <MainContentZWrapper>
          <ContentWrapper>
            {/* Profile Header (banner + avatar + info) */}
            <ProfileHeaderCard
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <ProfileBanner
                backgroundImage={backgroundImage}
                profilePhoto={profile?.photo}
                userInitials={getUserInitials()}
                onBannerClick={handleBackgroundClick}
                onProfileImageClick={handleProfileImageClick}
              />

              <ProfileHeaderInfo
                displayName={getDisplayName()}
                username={getUsernameForDisplay()}
                role={roleDisplay}
                bio={bioDisplay}
                stats={displayStats}
                socialLinks={profile?.socialLinks}
                onEditProfile={handleEditProfile}
                onSettings={handleSettings}
                onShare={handleShare}
              />
            </ProfileHeaderCard>

            {/* Transformation Before/After Photos */}
            {(showTransformation || transformationPhotos.length > 0) && (
              <div style={{ marginTop: '1.5rem' }}>
                <TransformationPhotoShowcase
                  photos={transformationPhotos}
                  visibility={transformationVisibility as 'public' | 'friends' | 'private' | 'hidden'}
                  isOwnProfile={true}
                  onUpload={() => navigate('/dashboard/measurements')}
                />
              </div>
            )}

            {/* Content Grid: Sidebar + Tabs */}
            <ContentGrid>
              <QuickStatsSidebar
                stats={displayStats}
                themeColors={theme.colors}
              />

              <MainContent
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <TabNavigation
                  tabs={TABS}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                />
                <TabContent activeTab={activeTab} />
              </MainContent>
            </ContentGrid>

            {/* Hidden File Inputs */}
            <HiddenInput
              ref={profileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'profile')}
            />
            <HiddenInput
              ref={backgroundInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'background')}
            />

            {/* Edit Profile Modal (lazy-loaded) */}
            {showEditModal && (
              <Suspense fallback={null}>
                <EditProfileModal
                  profile={profile}
                  onClose={() => setShowEditModal(false)}
                  onSave={async (data) => {
                    await updateProfile(data);
                    setShowEditModal(false);
                  }}
                />
              </Suspense>
            )}
          </ContentWrapper>
        </MainContentZWrapper>
      </ProfileContainer>
    </UserDashboardErrorBoundary>
  );
};

export default UserDashboardV3;
