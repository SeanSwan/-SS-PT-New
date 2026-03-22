/**
 * ============================================================================
 * FILE: ProfileSkeleton.tsx
 * PURPOSE: Skeleton loader for profile banner and header area
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a shimmer placeholder matching the profile
 * layout — cover banner, avatar circle, name/bio text lines, and stats row.
 *
 * HOW IT FITS IN THE APP: Displayed while UserProfilePage or ClientDashboard
 * fetches user data. Replaced by real content once loaded.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: ProfileSkeleton                                  ║
 * ║  PURPOSE: Shimmer placeholder for profile header             ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-22                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │  [Banner shimmer: full width, 160px tall]                   │
 * │           ┌───┐                                             │
 * │           │ O │  ← avatar circle (80px), offset -40px      │
 * │           └───┘                                             │
 * │  [Name line shimmer: 180px]                                 │
 * │  [Bio line shimmer: 260px]                                  │
 * │  [Stats row: 3 small blocks]                                │
 * └────────────────────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  { className? }
 * State:     None
 * Children:  CrystallineShimmer instances
 */

import React from 'react';
import styled from 'styled-components';
import CrystallineShimmer from './CrystallineShimmer';

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Compose shimmer elements into a profile skeleton
// ─────────────────────────────────────────────────────────────

interface ProfileSkeletonProps {
  className?: string;
}

const ProfileSkeleton: React.FC<ProfileSkeletonProps> = ({ className }) => (
  <Container className={className} role="status" aria-label="Loading profile">
    {/* Cover banner */}
    <CrystallineShimmer width="100%" height="160px" borderRadius="12px 12px 0 0" />

    {/* Avatar + text area */}
    <ProfileBody>
      <AvatarWrapper>
        <CrystallineShimmer variant="circle" width="80px" height="80px" />
      </AvatarWrapper>
      <TextLines>
        <CrystallineShimmer width="180px" height="20px" borderRadius="4px" />
        <CrystallineShimmer width="260px" height="14px" borderRadius="4px" />
      </TextLines>
    </ProfileBody>

    {/* Stats row */}
    <StatsRow>
      <CrystallineShimmer width="72px" height="40px" borderRadius="8px" />
      <CrystallineShimmer width="72px" height="40px" borderRadius="8px" />
      <CrystallineShimmer width="72px" height="40px" borderRadius="8px" />
    </StatsRow>
  </Container>
);

export default ProfileSkeleton;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: Layout matching the real profile header
// ─────────────────────────────────────────────────────────────

const Container = styled.div`
  background: #141419; /* Carbon */
  border-radius: 12px;
  overflow: hidden;
  width: 100%;
  max-width: 640px;
`;

const ProfileBody = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 0 1.5rem;
  margin-top: -40px;
`;

const AvatarWrapper = styled.div`
  flex-shrink: 0;
  border: 3px solid #141419; /* Carbon border around avatar */
  border-radius: 50%;
`;

const TextLines = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 48px; /* push below avatar overlap */
`;

const StatsRow = styled.div`
  display: flex;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
`;
