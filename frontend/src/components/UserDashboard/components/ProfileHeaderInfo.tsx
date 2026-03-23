/**
 * ┌─── SUB-COMPONENT: ProfileHeaderInfo ──────────────────────┐
 * | PARENT: UserDashboard                                      |
 * | PURPOSE: Name, tier badge, social links, stats, bio,       |
 * |          action buttons                                    |
 * | WIREFRAME:                                                 |
 * | +------------------------------------------+               |
 * | |          Display Name                    |               |
 * | |          @username                       |               |
 * | |        [Crown] ROLE BADGE                |               |
 * | |                                          |               |
 * | |    [@] [f] [♪] [🔗]  (social icons)     |               |
 * | |                                          |               |
 * | |   [Posts]    [Followers]   [Following]   |               |
 * | |                                          |               |
 * | |   Bio text goes here...                  |               |
 * | |                                          |               |
 * | |  [Edit Profile]  [Settings]  [Share]     |               |
 * | +------------------------------------------+               |
 * | Props: { displayName, username, role, bio, stats,          |
 * |          socialLinks, onEditProfile, onSettings, onShare }  |
 * | CLICK-OUTCOMES:                                            |
 * | [Edit Profile] -> onEditProfile -> opens EditProfileModal  |
 * | [Settings] -> onSettings -> navigates to /dashboard/profile|
 * | [Share] -> onShare -> Web Share API or clipboard copy       |
 * | [Social Icon] -> opens link in new tab                     |
 * +------------------------------------------------------------+
 */

import React from 'react';
import { Edit3, Settings, Share2, Crown, Instagram, Facebook, Link2 } from 'lucide-react';
import styled from 'styled-components';
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

// ─────────────────────────────────────────────────────────────
// SECTION: Social Link Styled Components
// PURPOSE: Horizontal icon row below role badge, above stats
// ─────────────────────────────────────────────────────────────

const SocialLinksRow = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  margin: 1.25rem 0;
  flex-wrap: wrap;
`;

const SocialLinkIcon = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--bg-elevated, rgba(20, 20, 25, 0.8));
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;

  &:hover {
    color: var(--accent-primary, #60C0F0);
    border-color: var(--accent-primary, #60C0F0);
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, var(--bg-elevated, #141419));
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4);
  }
`;

const CustomLinkBadge = styled.span`
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  max-width: 28px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1;
`;

// TikTok SVG (no Lucide equivalent)
const TikTokSvg = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.87a8.16 8.16 0 003.76.92V6.35a4.82 4.82 0 01-3.76-.66z" />
  </svg>
);

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const ProfileHeaderInfo: React.FC<ProfileHeaderInfoProps> = React.memo(({
  displayName,
  username,
  role,
  bio,
  stats,
  socialLinks,
  onEditProfile,
  onSettings,
  onShare,
}) => {
  // Check if any social links are populated
  const hasAnySocial = socialLinks && (
    socialLinks.instagram ||
    socialLinks.facebook ||
    socialLinks.tiktok ||
    (socialLinks.custom?.url && socialLinks.custom?.label)
  );

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

      {/* Social link icons row — only shown if user has links */}
      {hasAnySocial && (
        <SocialLinksRow>
          {socialLinks.instagram && (
            <SocialLinkIcon
              href={socialLinks.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              title="Instagram"
            >
              <Instagram size={18} />
            </SocialLinkIcon>
          )}
          {socialLinks.facebook && (
            <SocialLinkIcon
              href={socialLinks.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              title="Facebook"
            >
              <Facebook size={18} />
            </SocialLinkIcon>
          )}
          {socialLinks.tiktok && (
            <SocialLinkIcon
              href={socialLinks.tiktok}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              title="TikTok"
            >
              <TikTokSvg />
            </SocialLinkIcon>
          )}
          {socialLinks.custom?.url && socialLinks.custom?.label && (
            <SocialLinkIcon
              href={socialLinks.custom.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={socialLinks.custom.label}
              title={socialLinks.custom.label}
            >
              {socialLinks.custom.label.toLowerCase().includes('twitter') ||
               socialLinks.custom.label.toLowerCase().includes('x.com') ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              ) : socialLinks.custom.label.toLowerCase().includes('youtube') ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              ) : (
                <Link2 size={18} />
              )}
            </SocialLinkIcon>
          )}
        </SocialLinksRow>
      )}

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
