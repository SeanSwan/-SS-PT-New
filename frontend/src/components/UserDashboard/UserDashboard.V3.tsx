/**
 * ============================================================================
 * FILE: UserDashboard.V3.tsx
 * PURPOSE: Cinematic user profile dashboard with social feed, photos, and workouts
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders the user-facing profile/dashboard page with
 * cover photo, avatar, stats, and 5-tab content model: Home (MomentumCard +
 * Swan Coach + quick CTAs), Feed (social stream), Progress (workouts +
 * activity + nutrition), Community (discovery cards), Profile (about + media).
 *
 * HOW IT FITS IN THE APP: Top-level page at /user-dashboard. Uses useProfile
 * hook for data, useAuth for identity, lazy-loads tab content components.
 *
 * KEY DECISIONS: V3 visual upgrade adds noise overlay, extended breakpoints
 * (320-3840px), and enhanced glassmorphism. All logic preserved from V2.
 */

import React, { useState, useRef, useCallback, Suspense, lazy } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Camera,
  Settings,
  Share2,
  Edit3,
  Home,
  Users,
  Activity,
  Star,
  Crown,
  Sparkles,
  Image as ImageIcon,
  Dumbbell,
  User,
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUniversalTheme } from '../../context/ThemeContext/UniversalThemeContext';
import { useProfile } from '../../hooks/profile/useProfile';
import { useGamificationData } from '../../hooks/gamification/useGamificationData';

// All styled-components, keyframes, and ErrorBoundary extracted to styles file
import {
  NoiseOverlay,
  MainContentZWrapper,
  ProfileContainer,
  ContentWrapper,
  ContentGrid,
  ProfileHeader,
  BackgroundSection,
  BannerUploadButton,
  BadgeShowcase,
  BadgeShowcaseItem,
  BadgeIcon,
  BadgeName,
  ProfileImageSection,
  ProfileImageContainer,
  ProfileImage,
  ImageUploadButton,
  ProfileInfo,
  DisplayName,
  Username,
  UserRole,
  StatsContainer,
  StatItem,
  StatValue,
  StatLabel,
  Bio,
  ActionButtons,
  PrimaryButton,
  SecondaryButton,
  Sidebar,
  SidebarCard,
  SidebarTitle,
  MainContent,
  TabNavigation,
  Tab,
  TabStack,
  HiddenInput,
  LoadingContainer,
  LoadingSpinner,
} from './styles/DashboardV3Styles';
import type { TabId } from './types/UserDashboardTypes';

// Simplified Error Boundary
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h2>Something went wrong</h2>
          <p>Please refresh the page to try again.</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #60C0F0, #8B5CF6)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Lazy load components for better performance
const HomeTab = lazy(() => import('./components/HomeTab'));
const SocialFeed = lazy(() => import('../Social/Feed/SocialFeed'));
const CommunityTab = lazy(() => import('./components/CommunityTab'));
const CreativeGallery = lazy(() => import('./components/CreativeGallery'));
const PhotoGallery = lazy(() => import('./components/PhotoGallery'));
const AboutSection = lazy(() => import('./components/AboutSection'));
const ActivitySection = lazy(() => import('./components/ActivitySection'));
const NutritionWorkspace = lazy(() => import('../DashBoard/workspaces/NutritionWorkspace'));
const WorkoutsTab = lazy(() => import('./components/WorkoutsTab'));
const EditProfileModal = lazy(() => import('./components/EditProfileModal'));

// Main component interface
interface UserDashboardV3Props {}

/**
 * V3 Cinematic User Dashboard Component
 *
 * Visual-only upgrade of the optimized dashboard:
 * - Noise overlay for cinematic film-grain depth
 * - Extended 10-breakpoint responsive matrix (320px through 3840px)
 * - Enhanced glassmorphism with cyan glow accents
 * - All original logic, data flow, and component structure preserved
 */
const UserDashboardV3: React.FC<UserDashboardV3Props> = () => {
  const { user } = useAuth();
  const { theme } = useUniversalTheme();

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
    getUserInitials
  } = useProfile();

  const navigate = useNavigate();
  const { profile: gamProfile, levelProgress } = useGamificationData();

  // Top 3 badges from earned achievements (sorted by XP reward descending)
  const topBadges = React.useMemo(() => {
    const earned = gamProfile?.data?.achievements || [];
    return [...earned]
      .sort((a, b) => (b.pointsAwarded || 0) - (a.pointsAwarded || 0))
      .slice(0, 3)
      .map(ua => ({
        id: ua.id,
        name: ua.achievement?.name || 'Achievement',
        icon: ua.achievement?.icon || '🏆',
        rarity: ua.achievement?.tier || 'bronze',
      }));
  }, [gamProfile?.data?.achievements]);

  // Local state
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Load banner image from profile data
  React.useEffect(() => {
    if (profile?.bannerPhoto) {
      setBackgroundImage(profile.bannerPhoto);
    }
  }, [profile?.bannerPhoto]);

  // Refs for file uploads
  const profileInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  // Memoized stats with fallbacks
  const displayStats = React.useMemo(() => ({
    posts: stats?.posts || 0,
    followers: stats?.followers || 0,
    following: stats?.following || 0,
    workouts: stats?.workouts || 0,
    points: stats?.points || 0,
    level: stats?.level || 1
  }), [stats]);

  // File upload handlers — AI Village: blob URL leak fix + file validation
  const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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
    } catch (error) {
      console.error('Upload error:', error);
      if (type === 'background') {
        setBackgroundImage(profile?.bannerPhoto || null);
      }
    } finally {
      // Revoke blob URL to prevent memory leak
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    }
  }, [uploadProfilePhoto, uploadBannerPhoto, profile?.bannerPhoto]);

  const handleProfileImageClick = useCallback(() => {
    profileInputRef.current?.click();
  }, []);

  const handleBackgroundClick = useCallback(() => {
    backgroundInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'background') => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file, type);
    }
  }, [handleFileUpload]);

  // Action handlers
  const handleEditProfile = useCallback(() => {
    setShowEditModal(true);
  }, []);

  const handleSettings = useCallback(() => {
    navigate('/dashboard/profile');
  }, [navigate]);

  const handleShare = useCallback(async () => {
    const shareUrl = `${window.location.origin}/profile/${user?.id}`;
    const shareData = {
      title: `${getDisplayName()} on SwanStudios`,
      url: shareUrl
    };

    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Profile link copied to clipboard!');
      } catch {
        // Fallback
      }
    }
  }, [getDisplayName]);

  // Loading state
  if (isLoading && !profile) {
    return (
      <ProfileContainer>
        <NoiseOverlay />
        <MainContentZWrapper>
          <LoadingContainer>
            <LoadingSpinner />
          </LoadingContainer>
        </MainContentZWrapper>
      </ProfileContainer>
    );
  }

  // Error state
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
    <ErrorBoundary>
      <ProfileContainer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* V3: Cinematic noise overlay */}
        <NoiseOverlay />

        {/* V3: Main content z-index wrapper sits above noise */}
        <MainContentZWrapper>
          <ContentWrapper>
            {/* Profile Header — hidden on Home tab so it's home-first, not profile-first */}
            {activeTab !== 'home' && <ProfileHeader
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <BackgroundSection $backgroundImage={backgroundImage}>
                <BannerUploadButton onClick={handleBackgroundClick}>
                  <Camera size={18} />
                  {backgroundImage ? 'Change Cover' : 'Add Cover'}
                </BannerUploadButton>
              </BackgroundSection>

              <ProfileImageSection>
                <ProfileImageContainer
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ProfileImage $image={profile?.photo}>
                    {!profile?.photo && getUserInitials()}
                  </ProfileImage>

                  <ImageUploadButton
                    onClick={handleProfileImageClick}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    aria-label="Upload profile photo"
                  >
                    <Camera size={20} />
                  </ImageUploadButton>
                </ProfileImageContainer>
              </ProfileImageSection>

              <ProfileInfo
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <DisplayName>{getDisplayName()}</DisplayName>
                <Username>@{getUsernameForDisplay()}</Username>

                <UserRole
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <Crown size={16} />
                  {profile?.role?.charAt(0).toUpperCase() + profile?.role?.slice(1) || 'User'}
                </UserRole>

                <StatsContainer>
                  <StatItem whileHover={{ scale: 1.1 }}>
                    <StatValue>{displayStats.posts}</StatValue>
                    <StatLabel>Posts</StatLabel>
                  </StatItem>
                  <StatItem whileHover={{ scale: 1.1 }}>
                    <StatValue>{displayStats.followers}</StatValue>
                    <StatLabel>Followers</StatLabel>
                  </StatItem>
                  <StatItem whileHover={{ scale: 1.1 }}>
                    <StatValue>{displayStats.following}</StatValue>
                    <StatLabel>Following</StatLabel>
                  </StatItem>
                </StatsContainer>

                <Bio>
                  {profile?.bio ||
                    "Spreading positive energy through fitness & wellness - SwanStudios community member - Join me on this transformation journey!"
                  }
                </Bio>

                <ActionButtons>
                  <PrimaryButton
                    onClick={handleEditProfile}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Edit3 size={20} />
                    Edit Profile
                  </PrimaryButton>

                  <SecondaryButton
                    onClick={handleSettings}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Settings"
                  >
                    <Settings size={20} />
                  </SecondaryButton>

                  <SecondaryButton
                    onClick={handleShare}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Share profile"
                  >
                    <Share2 size={20} />
                  </SecondaryButton>
                </ActionButtons>

                {/* Top 3 Earned Badges Showcase */}
                {topBadges.length > 0 && (
                  <BadgeShowcase>
                    {topBadges.map((badge) => (
                      <BadgeShowcaseItem key={badge.id}>
                        <BadgeIcon>{badge.icon}</BadgeIcon>
                        <BadgeName>{badge.name}</BadgeName>
                      </BadgeShowcaseItem>
                    ))}
                  </BadgeShowcase>
                )}
              </ProfileInfo>
            </ProfileHeader>}

            {/* Content Grid — full-width on Home tab (no sidebar needed) */}
            <ContentGrid $fullWidth={activeTab === 'home'}>
              {/* Sidebar — hidden on Home tab; MomentumCard already shows key stats */}
              {activeTab !== 'home' && <Sidebar
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                <SidebarCard>
                  <SidebarTitle>
                    <Star size={20} />
                    Quick Stats
                  </SidebarTitle>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[
                      { label: 'Workouts', value: displayStats.workouts, icon: <Dumbbell size={16} /> },
                      { label: 'Level', value: displayStats.level, icon: <Crown size={16} /> },
                      { label: 'Points', value: displayStats.points, icon: <Sparkles size={16} /> },
                    ].map((stat) => (
                      <div key={stat.label} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '10px',
                        background: 'rgba(96, 192, 240, 0.04)',
                        border: '1px solid rgba(96, 192, 240, 0.06)',
                        transition: 'all 0.2s ease',
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(224, 236, 244, 0.7)', fontSize: '0.9rem' }}>
                          <span style={{ color: '#60C0F0', opacity: 0.6 }}>{stat.icon}</span>
                          {stat.label}
                        </span>
                        <span style={{
                          fontFamily: "'Fira Code', monospace",
                          fontWeight: 700,
                          fontSize: '1.1rem',
                          color: theme.colors?.primary || '#60C0F0',
                        }}>
                          {stat.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </SidebarCard>
              </Sidebar>}

              {/* Main Content */}
              <MainContent
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                {/* Tab Navigation — ARIA tablist pattern */}
                <TabNavigation role="tablist" aria-label="Dashboard sections">
                  {([
                    { id: 'home',      label: 'Home',      icon: Home },
                    { id: 'feed',      label: 'Feed',      icon: Sparkles },
                    { id: 'progress',  label: 'Progress',  icon: Activity },
                    { id: 'community', label: 'Community', icon: Users },
                    { id: 'profile',   label: 'Profile',   icon: User },
                  ] as const).map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <Tab
                        key={tab.id}
                        id={`tab-${tab.id}`}
                        role="tab"
                        aria-selected={activeTab === tab.id}
                        aria-controls={`panel-${tab.id}`}
                        $active={activeTab === tab.id}
                        onClick={() => setActiveTab(tab.id as TabId)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Icon size={18} />
                        {tab.label}
                      </Tab>
                    );
                  })}
                </TabNavigation>

                {/* Tab Panels — ARIA tabpanel pattern */}
                <Suspense fallback={<LoadingContainer><LoadingSpinner /></LoadingContainer>}>
                  {activeTab === 'home' && (
                    <div role="tabpanel" id="panel-home" aria-labelledby="tab-home">
                      <HomeTab onTabChange={(t) => setActiveTab(t as TabId)} />
                    </div>
                  )}
                  {activeTab === 'feed' && (
                    <div role="tabpanel" id="panel-feed" aria-labelledby="tab-feed">
                      <SocialFeed variant="compact" />
                    </div>
                  )}
                  {activeTab === 'progress' && (
                    <div role="tabpanel" id="panel-progress" aria-labelledby="tab-progress">
                      <TabStack>
                        <WorkoutsTab />
                        <ActivitySection />
                        <NutritionWorkspace />
                      </TabStack>
                    </div>
                  )}
                  {activeTab === 'community' && (
                    <div role="tabpanel" id="panel-community" aria-labelledby="tab-community">
                      <CommunityTab onTabChange={(t) => setActiveTab(t as TabId)} />
                    </div>
                  )}
                  {activeTab === 'profile' && (
                    <div role="tabpanel" id="panel-profile" aria-labelledby="tab-profile">
                      <TabStack>
                        <AboutSection />
                        <CreativeGallery />
                        <PhotoGallery />
                      </TabStack>
                    </div>
                  )}
                </Suspense>
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

            {/* Edit Profile Modal */}
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
    </ErrorBoundary>
  );
};

export default UserDashboardV3;
