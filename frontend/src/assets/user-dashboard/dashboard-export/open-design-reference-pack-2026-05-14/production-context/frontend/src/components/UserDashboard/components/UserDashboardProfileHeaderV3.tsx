/**
 * Profile header rendered on non-home UserDashboard V3 tabs.
 *
 * 2026-05-10 SLICE 1 + SLICE 2: banner photo renders as an <img> with
 * enum-validated object-position (not CSS background-image), and the
 * profile avatar URL is sanitized at the React boundary so a poisoned
 * server value cannot inject CSS. Reposition picker is a 3×3 grid of
 * preset cells anchored under the BannerActionRow.
 */

import React from 'react';
import { Camera, Crown, Edit3, Move, Settings, Share2 } from 'lucide-react';
import {
  ActionButtons,
  BackgroundSection,
  BannerActionRow,
  BadgeIcon,
  BadgeName,
  BadgeShowcase,
  BadgeShowcaseItem,
  BannerImage,
  BannerRepositionAnchor,
  BannerRepositionButton,
  BannerRepositionCell,
  BannerRepositionPanel,
  BannerUploadButton,
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
import {
  BANNER_OBJECT_POSITION_PRESETS,
  type BannerObjectPosition,
} from '../../../services/profileService';

interface TopBadge {
  id: string;
  name: string;
  icon: string;
}

interface UserDashboardProfileHeaderV3Props {
  backgroundImage: string | null;
  bannerObjectPosition: BannerObjectPosition;
  showRepositionPanel: boolean;
  onToggleRepositionPanel: () => void;
  onBannerPositionChange: (next: BannerObjectPosition) => void;
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
  showRepositionPanel,
  onToggleRepositionPanel,
  onBannerPositionChange,
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
  // 2026-05-10 SLICE 1 (Codex round-2 finding): sanitize profile.photo at
  // the React boundary so a poisoned server value cannot reach the CSS-backed
  // ProfileImage styled-component. Sanitiser returns null on reject -> initials.
  const safePhoto = sanitizeImageUrl(profile?.photo);

  return (
    <ProfileHeader
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <BackgroundSection $backgroundImage={backgroundImage}>
        {/* 2026-05-10 SLICE 2: banner photo as <img> + object-position from
            the enum-validated preset; no CSS-url interpolation surface. */}
        {backgroundImage && (
          <BannerImage
            src={backgroundImage}
            alt="Profile cover photo"
            style={{ objectPosition: bannerObjectPosition }}
            draggable={false}
          />
        )}
      </BackgroundSection>
      <BannerActionRow>
        {backgroundImage && (
          <BannerRepositionAnchor>
            <BannerRepositionButton
              type="button"
              onClick={onToggleRepositionPanel}
              aria-expanded={showRepositionPanel}
              aria-haspopup="dialog"
              aria-label="Reposition cover photo"
            >
              <Move size={18} />
              Reposition
            </BannerRepositionButton>
            {showRepositionPanel && (
              <BannerRepositionPanel
                role="dialog"
                aria-label="Choose cover photo crop alignment"
              >
                {BANNER_OBJECT_POSITION_PRESETS.map((preset) => (
                  <BannerRepositionCell
                    key={preset}
                    type="button"
                    $active={bannerObjectPosition === preset}
                    onClick={() => onBannerPositionChange(preset)}
                    aria-label={`Crop ${preset}`}
                    aria-pressed={bannerObjectPosition === preset}
                  >
                    {/* Cell label = first letter of each token, e.g. 'TL', 'TC',
                        'TR'. Screen readers read the full aria-label. */}
                    {preset
                      .split(' ')
                      .map((w) => w[0]?.toUpperCase())
                      .join('')
                      .replace('CC', 'C')}
                  </BannerRepositionCell>
                ))}
              </BannerRepositionPanel>
            )}
          </BannerRepositionAnchor>
        )}
        <BannerUploadButton onClick={onBackgroundClick}>
          <Camera size={18} />
          {backgroundImage ? 'Change Cover' : 'Add Cover'}
        </BannerUploadButton>
      </BannerActionRow>

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

        {/* 2026-05-10 SLICE 1 (Phase-2C UX consensus + rule 22): StatItems
            are non-interactive read-only stats. whileHover scaling removed
            so the cards no longer look like fake buttons. */}
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
