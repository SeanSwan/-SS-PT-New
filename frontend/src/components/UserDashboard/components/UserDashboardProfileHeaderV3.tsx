/**
 * Profile header rendered on non-home UserDashboard V3 tabs.
 */

import React from 'react';
import { Camera, Crown, Edit3, Settings, Share2 } from 'lucide-react';
import {
  ActionButtons,
  BadgeIcon,
  BadgeName,
  BadgeShowcase,
  BadgeShowcaseItem,
  Bio,
  DisplayName,
  HexLevelBadge,
  ImageUploadButton,
  PrimaryButton,
  ProfileHeader,
  ProfileImage,
  ProfileImageContainer,
  ProfileImageSection,
  ProfileInfo,
  SecondaryButton,
  StatItem,
  StatLabel,
  StatsContainer,
  StatValue,
  UserRole,
  Username,
} from '../styles/DashboardV3Styles';
import type { ProfileData, ProfileStats } from '../types/UserDashboardTypes';
import { sanitizeImageUrl } from '../../../utils/imageUrl';
import type {
  BannerCropState,
  BannerObjectFit,
  BannerObjectPosition,
} from '../../../services/profileService';
import UserDashboardBannerCropControls from './UserDashboardBannerCropControls';

interface TopBadge {
  id: string;
  name: string;
  icon: string;
}

interface UserDashboardProfileHeaderV3Props {
  backgroundImage: string | null;
  bannerObjectPosition: BannerObjectPosition;
  bannerObjectFit: BannerObjectFit;
  bannerImageScale: number;
  showRepositionPanel: boolean;
  onToggleRepositionPanel: () => void;
  onBannerCropPreview: (next: BannerCropState) => void;
  onBannerCropCommit: (next: BannerCropState) => void;
  profile: ProfileData | null;
  displayStats: ProfileStats;
  topBadges: TopBadge[];
  level?: number;
  displayName: string;
  username: string;
  userInitials: string;
  onBackgroundClick: () => void;
  onProfileImageClick: () => void;
  onEditProfile: () => void;
  onSettings: () => void;
  onShare: () => void;
}

const UserDashboardProfileHeaderV3: React.FC<UserDashboardProfileHeaderV3Props> = ({
  backgroundImage,
  bannerObjectPosition,
  bannerObjectFit,
  bannerImageScale,
  showRepositionPanel,
  onToggleRepositionPanel,
  onBannerCropPreview,
  onBannerCropCommit,
  profile,
  displayStats,
  topBadges,
  level,
  displayName,
  username,
  userInitials,
  onBackgroundClick,
  onProfileImageClick,
  onEditProfile,
  onSettings,
  onShare,
}) => {
  const safePhoto = sanitizeImageUrl(profile?.photo);

  return (
    <ProfileHeader
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <UserDashboardBannerCropControls
        backgroundImage={backgroundImage}
        bannerObjectPosition={bannerObjectPosition}
        bannerObjectFit={bannerObjectFit}
        bannerImageScale={bannerImageScale}
        showRepositionPanel={showRepositionPanel}
        onToggleRepositionPanel={onToggleRepositionPanel}
        onBannerCropPreview={onBannerCropPreview}
        onBannerCropCommit={onBannerCropCommit}
        onBackgroundClick={onBackgroundClick}
      />

      <ProfileImageSection>
        <ProfileImageContainer whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <ProfileImage $image={safePhoto ?? undefined}>
            {!safePhoto && userInitials}
          </ProfileImage>

          <ImageUploadButton
            onClick={onProfileImageClick}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Upload profile photo"
          >
            <Camera size={20} />
          </ImageUploadButton>
          {level !== undefined && <HexLevelBadge aria-label={`Level ${level}`}>{level}</HexLevelBadge>}
        </ProfileImageContainer>
      </ProfileImageSection>

      <ProfileInfo
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <DisplayName>{displayName}</DisplayName>
        <Username>@{username}</Username>

        <UserRole
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Crown size={16} />
          {profile?.role
            ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
            : 'User'}
        </UserRole>

        <StatsContainer>
          <StatItem>
            <StatValue>{displayStats.posts}</StatValue>
            <StatLabel>Posts</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{displayStats.followers}</StatValue>
            <StatLabel>Followers</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{displayStats.following}</StatValue>
            <StatLabel>Following</StatLabel>
          </StatItem>
        </StatsContainer>

        <Bio>
          {profile?.bio ||
            'Spreading positive energy through fitness & wellness - SwanStudios community member - Join me on this transformation journey!'}
        </Bio>

        <ActionButtons>
          <PrimaryButton onClick={onEditProfile} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Edit3 size={20} />
            Edit Profile
          </PrimaryButton>
          <SecondaryButton onClick={onSettings} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} aria-label="Settings">
            <Settings size={20} />
          </SecondaryButton>
          <SecondaryButton onClick={onShare} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} aria-label="Share profile">
            <Share2 size={20} />
          </SecondaryButton>
        </ActionButtons>

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
    </ProfileHeader>
  );
};

export default React.memo(UserDashboardProfileHeaderV3);
