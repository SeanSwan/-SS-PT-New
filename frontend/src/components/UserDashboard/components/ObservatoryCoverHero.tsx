/**
 * ============================================================================
 * FILE: ObservatoryCoverHero.tsx
 * PURPOSE: Full-width top cover for all /user-dashboard tabs
 *          (workstream O - every tab meets the Home standard). Renders the
 *          user's REAL cover composition (photo / collage / carousel /
 *          crossfade) through the same media layer + embedded editor Home
 *          uses (useHomeCoverBanner), with a compact identity strip and the
 *          Edit Cover / Edit Profile / Share actions that previously lived on
 *          the retired UserDashboardProfileHeaderV3.
 * HOW IT FITS: Mounted by UserDashboard.V3 ABOVE ContentWrapper on every
 *          tab - genuinely edge-to-edge at the very top of the page.
 *          No 100vw negative-margin tricks, no observatory rail clearance
 *          offsets, no 3rem banner margins: the strip sits in normal flow and
 *          the grid starts right under it.
 * KEY DECISIONS:
 * - One cover system: the old crop/reposition panel is replaced by the
 *   embedded SocialCoverEditor (photo / collage / layouts / presets) - the
 *   exact editor Home's Edit Cover opens (N3).
 * - No duplicate facts: stats/badges/bio stay with their owners (sidebar
 *   Quick Stats, observatory rails, Studio > About). The strip carries only
 *   identity + actions.
 * - Avatar tap = profile photo upload (44px+), preserving the old header's
 *   upload affordance.
 * ============================================================================
 */
import React from 'react';
import { Camera, Edit3, ImagePlus, Settings, Share2 } from 'lucide-react';
import { useHomeCoverBanner } from './useHomeCoverBanner';
import { HeroRanges } from './HomeTabVisionScenes';
import { GlowSweep } from './HomeTabVision.styles';
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
  CoverRankTag,
  RankDivider,
  RankGoldSegment,
} from './ObservatoryCoverHero.styles';
import { StyledBox } from '@/components/ui/StyledBox';

interface ObservatoryCoverHeroProps {
  displayName: string;
  username: string;
  userInitials: string;
  tierName: string;
  rankTitleLabel?: string;
  level: number;
  /** Raw profile photo URL - sanitized here, initials fallback when absent. */
  profilePhoto?: string | null;
  onEditProfile: () => void;
  /** Settings flow - the ONLY entry into the profile panel (N5 contract). */
  onSettings: () => void;
  onShare: () => void;
  /** Opens the profile-photo file picker (HiddenInput in UserDashboard.V3). */
  onAvatarClick: () => void;
  dashboardBackgroundControls?: React.ReactNode;
  /** Whether the gamification record is known; false hides the fabricated rank pill. */
  gamificationKnown: boolean;
}

const ObservatoryCoverHero: React.FC<ObservatoryCoverHeroProps> = ({
  displayName,
  username,
  userInitials,
  tierName,
  rankTitleLabel,
  gamificationKnown,
  level,
  profilePhoto,
  onEditProfile,
  onSettings,
  onShare,
  onAvatarClick,
  dashboardBackgroundControls,
}) => {
  const { bannerLayer, coverEditorSlot, toggleCoverEditor, bannerFrameHeight } = useHomeCoverBanner(dashboardBackgroundControls);
  const safePhoto = sanitizeImageUrl(profilePhoto ?? undefined);
  // `level` and `tierName` both resolve through `?? 0` upstream, so on an
  // outage this renders "Level 1 | Bronze Swan" in gold — the single most
  // prominent number on the page, and a flat contradiction of the rail card
  // beneath it that correctly says the record could not be loaded.
  const visibleRankTitle = gamificationKnown
    ? (rankTitleLabel || `Level ${level} | ${tierName}`)
    : null;
  const rankSegments = (visibleRankTitle ?? '').split('|').map((part) => part.trim()).filter(Boolean);

  // Level-up pill beat: when the live level climbs mid-session, the gold
  // pill pops + rings in sync with the full-screen celebration overlay.
  const prevLevelRef = React.useRef(level);
  const [isCelebrating, setIsCelebrating] = React.useState(false);
  React.useEffect(() => {
    const climbed = level > prevLevelRef.current;
    prevLevelRef.current = level;
    if (!climbed) return undefined;
    setIsCelebrating(true);
    const timer = window.setTimeout(() => setIsCelebrating(false), 1600);
    return () => window.clearTimeout(timer);
  }, [level]);

  return (
    <>
      <StyledBox as={CoverHeroSection}
        aria-label="Profile cover"
        $style={{ '--cover-hero-height': `${bannerFrameHeight}px` } as React.CSSProperties}
      >
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
            </CoverAvatarButton>
            <CoverNameBlock>
              <CoverName>{displayName}</CoverName>
              <CoverRankTag $celebrating={isCelebrating}>
                {rankSegments.map((segment, index) => (
                  <React.Fragment key={`${segment}-${index}`}>
                    {index > 0 && <RankDivider aria-hidden="true">|</RankDivider>}
                    {/* Visible gold text IS the accessible name — no aria-hidden,
                        so AT announces the full "Level X | Rank Y | Title". */}
                    <RankGoldSegment>{segment}</RankGoldSegment>
                  </React.Fragment>
                ))}
              </CoverRankTag>
              <CoverMeta>
                <span>@{username}</span>
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
      </StyledBox>

      {coverEditorSlot && <CoverEditorDock>{coverEditorSlot}</CoverEditorDock>}
    </>
  );
};

export default React.memo(ObservatoryCoverHero);
