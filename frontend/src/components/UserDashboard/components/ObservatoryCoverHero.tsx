/**
 * ============================================================================
 * FILE: ObservatoryCoverHero.tsx
 * PURPOSE: Full-width top cover for all /user-dashboard tabs
 *          (workstream O — every tab meets the Home standard). Renders the
 *          user's REAL cover composition (photo / collage / carousel /
 *          crossfade) through the same media layer + embedded editor Home
 *          uses (useHomeCoverBanner), with a compact identity strip and the
 *          Edit Cover / Edit Profile / Share actions that previously lived on
 *          the retired UserDashboardProfileHeaderV3.
 * HOW IT FITS: Mounted by UserDashboard.V3 ABOVE ContentWrapper on every
 *          tab — genuinely edge-to-edge at the very top of the page.
 *          No 100vw negative-margin tricks, no observatory rail clearance
 *          offsets, no 3rem banner margins: the strip sits in normal flow and
 *          the grid starts right under it.
 * KEY DECISIONS:
 * - One cover system: the old crop/reposition panel is replaced by the
 *   embedded SocialCoverEditor (photo / collage / layouts / presets) — the
 *   exact editor Home's Edit Cover opens (N3).
 * - No duplicate facts: stats/badges/bio stay with their owners (sidebar
 *   Quick Stats, observatory rails, Studio › About). The strip carries only
 *   identity + actions.
 * - Avatar tap = profile photo upload (44px+), preserving the old header's
 *   upload affordance.
 * ============================================================================
 */
import React from 'react';
import { Camera, Edit3, ImagePlus, Settings, Share2 } from 'lucide-react';
import { useHomeCoverBanner } from './useHomeCoverBanner';
import { HeroRanges, LevelHex } from './HomeTabVisionScenes';
import { GlowSweep } from './HomeTabVision.styles';
import { LevelBadgeAnchor } from './HomeTabVisionHero.styles';
import { sanitizeImageUrl } from '../../../utils/imageUrl';
import {
  CoverActionButton,
  CoverActions,
  CoverAvatarButton,
  CoverAvatarCameraBadge,
  CoverAvatarInner,
  CoverEditorDock,
  CoverFallbackLayer,
  CoverForeground,
  CoverHeroSection,
  CoverIdentity,
  CoverMediaHost,
  CoverMeta,
  CoverName,
  CoverNameBlock,
  CoverScrim,
  CoverTierChip,
} from './ObservatoryCoverHero.styles';

interface ObservatoryCoverHeroProps {
  displayName: string;
  username: string;
  userInitials: string;
  tierName: string;
  level: number;
  /** Raw profile photo URL — sanitized here, initials fallback when absent. */
  profilePhoto?: string | null;
  onEditProfile: () => void;
  /** Settings flow — the ONLY entry into the profile panel (N5 contract). */
  onSettings: () => void;
  onShare: () => void;
  /** Opens the profile-photo file picker (HiddenInput in UserDashboard.V3). */
  onAvatarClick: () => void;
}

const ObservatoryCoverHero: React.FC<ObservatoryCoverHeroProps> = ({
  displayName,
  username,
  userInitials,
  tierName,
  level,
  profilePhoto,
  onEditProfile,
  onSettings,
  onShare,
  onAvatarClick,
}) => {
  const { bannerLayer, coverEditorSlot, toggleCoverEditor } = useHomeCoverBanner();
  const safePhoto = sanitizeImageUrl(profilePhoto ?? undefined);

  return (
    <>
      <CoverHeroSection aria-label="Profile cover">
        {bannerLayer ? (
          <CoverMediaHost aria-hidden="true">{bannerLayer}</CoverMediaHost>
        ) : (
          <CoverFallbackLayer aria-hidden="true">
            <HeroRanges />
          </CoverFallbackLayer>
        )}
        <GlowSweep />
        <CoverScrim />

        <CoverForeground>
          <CoverIdentity>
            <CoverAvatarButton
              type="button"
              onClick={onAvatarClick}
              aria-label="Change profile photo"
              title="Change profile photo"
            >
              <CoverAvatarInner>
                {safePhoto ? <img src={safePhoto} alt="" aria-hidden="true" /> : userInitials}
              </CoverAvatarInner>
              <CoverAvatarCameraBadge aria-hidden="true">
                <Camera size={13} />
              </CoverAvatarCameraBadge>
              <LevelBadgeAnchor>
                <LevelHex level={level} size={30} />
              </LevelBadgeAnchor>
            </CoverAvatarButton>
            <CoverNameBlock>
              <CoverName>{displayName}</CoverName>
              <CoverMeta>
                <span>@{username}</span>
                <CoverTierChip>{tierName}</CoverTierChip>
              </CoverMeta>
            </CoverNameBlock>
          </CoverIdentity>

          <CoverActions>
            <CoverActionButton
              type="button"
              $gold
              onClick={toggleCoverEditor}
              aria-label="Edit cover"
              title="Edit cover"
            >
              <ImagePlus size={17} aria-hidden="true" />
            </CoverActionButton>
            <CoverActionButton
              type="button"
              onClick={onEditProfile}
              aria-label="Edit profile"
              title="Edit profile"
            >
              <Edit3 size={17} aria-hidden="true" />
            </CoverActionButton>
            <CoverActionButton
              type="button"
              onClick={onSettings}
              aria-label="Open settings"
              title="Settings"
            >
              <Settings size={17} aria-hidden="true" />
            </CoverActionButton>
            <CoverActionButton
              type="button"
              onClick={onShare}
              aria-label="Share profile"
              title="Share profile"
            >
              <Share2 size={17} aria-hidden="true" />
            </CoverActionButton>
          </CoverActions>
        </CoverForeground>
      </CoverHeroSection>

      {coverEditorSlot && <CoverEditorDock>{coverEditorSlot}</CoverEditorDock>}
    </>
  );
};

export default React.memo(ObservatoryCoverHero);
