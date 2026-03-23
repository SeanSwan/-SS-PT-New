/**
 * ============================================================================
 * FILE: UserDashboard.V3.tsx
 * PURPOSE: Cinematic user profile dashboard with social feed, photos, and workouts
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders the user-facing profile/dashboard page with
 * cover photo, avatar, stats, tabbed content (feed, creative, photos, workouts,
 * about, activity, nutrition), and profile editing capabilities.
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
  Users,
  Activity,
  Star,
  Crown,
  Sparkles,
  Image as ImageIcon,
  Music2,
  Apple,
  Dumbbell
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUniversalTheme } from '../../context/ThemeContext/UniversalThemeContext';
import { useProfile } from '../../hooks/profile/useProfile';

// All styled-components, keyframes, and ErrorBoundary extracted to styles file
import {
  NoiseOverlay,
  MainContentZWrapper,
  ProfileContainer,
  ContentWrapper,
  ContentGrid,
  ProfileHeader,
  BackgroundSection,
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
  HiddenInput,
  LoadingContainer,
  LoadingSpinner,
} from './styles/DashboardV3Styles';

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
// CommunityFeed deprecated — using unified SocialFeed with compact variant
const SocialFeed = lazy(() => import('../Social/Feed/SocialFeed'));
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

  // Local state
  const [activeTab, setActiveTab] = useState('feed');
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

  // File upload handlers
  const handleFileUpload = useCallback(async (file: File, type: 'profile' | 'background') => {
    if (!file || !file.type.startsWith('image/')) return;

    try {
      if (type === 'profile') {
        await uploadProfilePhoto(file);
      } else {
        // Show optimistic preview immediately
        const previewUrl = URL.createObjectURL(file);
        setBackgroundImage(previewUrl);
        // Upload to backend — profile.bannerPhoto will update via useEffect
        await uploadBannerPhoto(file);
        // Don't revoke blob URL here — the useEffect will replace backgroundImage
        // with the real server URL when profile.bannerPhoto updates
      }
    } catch (error) {
      console.error('Upload error:', error);
      // Revert optimistic update on error
      if (type === 'background') {
        setBackgroundImage(profile?.bannerPhoto || null);
      }
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
    const shareUrl = `${window.location.origin}/user-dashboard`;
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
            {/* Profile Header */}
            <ProfileHeader
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <BackgroundSection
                $backgroundImage={backgroundImage}
                onClick={handleBackgroundClick}
              >
                <div className="upload-overlay">
                  <Camera size={48} className="upload-icon" />
                  <div className="upload-text">
                    {backgroundImage ? 'Change Cover Photo' : 'Add Cover Photo'}
                  </div>
                </div>
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
                  >
                    <Settings size={20} />
                  </SecondaryButton>

                  <SecondaryButton
                    onClick={handleShare}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Share2 size={20} />
                  </SecondaryButton>
                </ActionButtons>
              </ProfileInfo>
            </ProfileHeader>

            {/* Content Grid */}
            <ContentGrid>
              {/* Sidebar */}
              <Sidebar
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
              </Sidebar>

              {/* Main Content */}
              <MainContent
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                {/* Tab Navigation */}
                <TabNavigation>
                  {[
                    { id: 'feed', label: 'Feed', icon: Sparkles },
                    { id: 'creative', label: 'Creative', icon: Music2 },
                    { id: 'photos', label: 'Photos', icon: ImageIcon },
                    { id: 'about', label: 'About', icon: Users },
                    { id: 'workouts', label: 'Workouts', icon: Dumbbell },
                    { id: 'activity', label: 'Activity', icon: Activity },
                    { id: 'nutrition', label: 'Nutrition', icon: Apple },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <Tab
                        key={tab.id}
                        $active={activeTab === tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Icon size={18} />
                        {tab.label}
                      </Tab>
                    );
                  })}
                </TabNavigation>

                {/* Tab Content with Suspense */}
                <Suspense fallback={<LoadingContainer><LoadingSpinner /></LoadingContainer>}>
                  {activeTab === 'feed' && <SocialFeed variant="compact" />}
                  {activeTab === 'creative' && <CreativeGallery />}
                  {activeTab === 'photos' && <PhotoGallery />}
                  {activeTab === 'workouts' && <WorkoutsTab />}
                  {activeTab === 'about' && <AboutSection />}
                  {activeTab === 'activity' && <ActivitySection />}
                  {activeTab === 'nutrition' && <NutritionWorkspace />}
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
