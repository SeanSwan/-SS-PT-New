/**
 * ┌─── SUB-COMPONENT: ProfileHeaderInfo ──────────────────────┐
 * | PARENT: UserDashboard                                      |
 * | PURPOSE: Name, tier badge, stats, bio, action buttons      |
 * | WIREFRAME:                                                 |
 * | +------------------------------------------+               |
 * | |          Display Name                    |               |
 * | |          @username                       |               |
 * | |        [Crown] ROLE BADGE                |               |
 * | |                                          |               |
 * | |   [Posts]    [Followers]   [Following]   |               |
 * | |                                          |               |
 * | |   Bio text goes here...                  |               |
 * | |                                          |               |
 * | |  [Edit Profile]  [Settings]  [Share]     |               |
 * | +------------------------------------------+               |
 * | Props: { displayName, username, role, bio, stats,          |
 * |          onEditProfile, onSettings, onShare }               |
 * | CLICK-OUTCOMES:                                            |
 * | [Edit Profile] -> onEditProfile -> opens EditProfileModal  |
 * | [Settings] -> onSettings -> navigates to /dashboard/profile|
 * | [Share] -> onShare -> Web Share API or clipboard copy       |
 * +------------------------------------------------------------+
 */

import React from 'react';
import { Edit3, Settings, Share2, Crown } from 'lucide-react';
import type { ProfileHeaderInfoProps } from '../types/UserDashboardTypes';
import {
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
} from '../styles/InfoStyles';

/**
 * Displays the profile information section below the avatar:
 * display name with gradient text, username, role badge,
 * stat counters, bio text, and action buttons.
 */
const ProfileHeaderInfo: React.FC<ProfileHeaderInfoProps> = React.memo(({
  displayName,
  username,
  role,
  bio,
  stats,
  onEditProfile,
  onSettings,
  onShare,
}) => {
  return (
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
        {role}
      </UserRole>

      <StatsContainer>
        <StatItem whileHover={{ scale: 1.1 }}>
          <StatValue>{stats.posts}</StatValue>
          <StatLabel>Posts</StatLabel>
        </StatItem>
        <StatItem whileHover={{ scale: 1.1 }}>
          <StatValue>{stats.followers}</StatValue>
          <StatLabel>Followers</StatLabel>
        </StatItem>
        <StatItem whileHover={{ scale: 1.1 }}>
          <StatValue>{stats.following}</StatValue>
          <StatLabel>Following</StatLabel>
        </StatItem>
      </StatsContainer>

      <Bio>{bio}</Bio>

      <ActionButtons>
        <PrimaryButton
          onClick={onEditProfile}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Edit3 size={20} />
          Edit Profile
        </PrimaryButton>

        <SecondaryButton
          onClick={onSettings}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Settings size={20} />
        </SecondaryButton>

        <SecondaryButton
          onClick={onShare}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Share2 size={20} />
        </SecondaryButton>
      </ActionButtons>
    </ProfileInfo>
  );
});

ProfileHeaderInfo.displayName = 'ProfileHeaderInfo';

export default ProfileHeaderInfo;
