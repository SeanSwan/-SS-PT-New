/**
 * ============================================================================
 * FILE: ProfileSkeleton.tsx
 * PURPOSE: Skeleton loader for user profile pages during data fetch
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a shimmer placeholder matching the profile page
 * layout: banner, avatar circle, name/bio text lines, and a stats row with 4
 * metric blocks. Used while GET /api/users/:id is in flight.
 *
 * HOW IT FITS IN THE APP: Imported by UserProfilePage and ClientDashboard as
 * the loading state before profile data resolves.
 *
 * KEY DECISIONS: Fixed heights match the real profile layout so there is no
 * layout shift when data loads. Stats row uses flex with gap for responsive
 * wrapping on mobile.
 *
 * ┌─── SUB-COMPONENT: ProfileSkeleton ─────────────────────────┐
 * │ PARENT: UserProfilePage, ClientDashboard                    │
 * │ PURPOSE: Profile page loading placeholder                   │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────────────┐                │
 * │ │ ░░░░░░░░░ BANNER ░░░░░░░░░░░░░░░░░░░░░░│  200px         │
 * │ ├──────────────────────────────────────────┤                │
 * │ │   (●)  ░░░░░░░░ Name ░░░░░░░           │  avatar+name   │
 * │ │        ░░░░░░░░░░░░░ Bio ░░░           │                │
 * │ ├──────────────────────────────────────────┤                │
 * │ │  [Stat] [Stat] [Stat] [Stat]            │  stats row     │
 * │ └──────────────────────────────────────────┘                │
 * │ Props: { variant?: ShimmerVariant }                         │
 * └─────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import styled from 'styled-components';
import CrystallineShimmer, {
  ShimmerBlock,
  ShimmerCircle,
  ShimmerLine,
  type ShimmerVariant,
} from './CrystallineShimmer';

// ─────────────────────────────────────────────────────────────
// SECTION: Layout Constants
// PURPOSE: Match real profile component dimensions to prevent layout shift
// ─────────────────────────────────────────────────────────────
const BANNER_HEIGHT = 200;
const AVATAR_SIZE = 120;
const STAT_BLOCK_HEIGHT = 48;
const STAT_BLOCK_WIDTH = 80;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Layout Components
// ─────────────────────────────────────────────────────────────

const OBSIDIAN_BLACK = '#0A0A0F';

const ProfileContainer = styled.div`
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 0 16px;
`;

const BannerShimmer = styled(ShimmerBlock)`
  width: 100%;
  height: ${BANNER_HEIGHT}px;
  border-radius: 12px 12px 0 0;
`;

const AvatarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 0 12px;
  margin-top: -40px;
  position: relative;
  z-index: 1;
  padding-left: 24px;
`;

const AvatarShimmer = styled(ShimmerCircle)`
  width: ${AVATAR_SIZE}px;
  height: ${AVATAR_SIZE}px;
  flex-shrink: 0;
  border: 4px solid ${({ theme }) => theme.obsidianBlack || OBSIDIAN_BLACK};
`;

const TextGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  padding-top: 44px;
`;

const StatsRow = styled.div`
  display: flex;
  gap: 16px;
  padding: 16px 0;
  flex-wrap: wrap;
`;

const StatBlock = styled(ShimmerBlock)`
  width: ${STAT_BLOCK_WIDTH}px;
  height: ${STAT_BLOCK_HEIGHT}px;
  border-radius: 8px;
  flex-shrink: 0;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: ProfileSkeleton Component
// ─────────────────────────────────────────────────────────────

interface ProfileSkeletonProps {
  /** Display variant: 'default' or 'hardware' for gym screens */
  variant?: ShimmerVariant;
}

/**
 * ProfileSkeleton — shimmer placeholder for profile pages.
 * Matches the real profile layout to eliminate layout shift on load.
 *
 * @param variant - 'default' (10% opacity) or 'hardware' (18% for gym screens)
 */
const ProfileSkeleton: React.FC<ProfileSkeletonProps> = ({
  variant = 'default',
}) => {
  return (
    <CrystallineShimmer label="Loading profile" variant={variant}>
      <ProfileContainer>
        <BannerShimmer $variant={variant} />

        <AvatarRow>
          <AvatarShimmer $variant={variant} />
          <TextGroup>
            <ShimmerLine $width="45%" $variant={variant} style={{ height: 20 }} />
            <ShimmerLine $width="70%" $variant={variant} />
            <ShimmerLine $width="55%" $variant={variant} />
          </TextGroup>
        </AvatarRow>

        <StatsRow>
          <StatBlock $variant={variant} />
          <StatBlock $variant={variant} />
          <StatBlock $variant={variant} />
          <StatBlock $variant={variant} />
        </StatsRow>
      </ProfileContainer>
    </CrystallineShimmer>
  );
};

export default ProfileSkeleton;
