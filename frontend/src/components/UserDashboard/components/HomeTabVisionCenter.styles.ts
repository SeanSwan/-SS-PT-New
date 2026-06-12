/**
 * ============================================================================
 * FILE: HomeTabVisionCenter.styles.ts
 * PURPOSE: Local styled-components for the Home center column, extracted from
 *          HomeTabVisionCenter.tsx (rule 4 — 300-line cap) during workstream
 *          N2 when the real cover layer and real latest-post media landed.
 * ============================================================================
 */
import styled from 'styled-components';
import { ButtonRow } from './HomeTabVisionCards.styles';

export const SpreadButtonRow = styled(ButtonRow)`
  justify-content: space-between;
  margin-bottom: 0.85rem;
`;

export const ComposerActions = styled(ButtonRow)`
  justify-content: space-between;
  margin-top: 0.75rem;
`;

export const CaptionCopy = styled.p`
  margin: 0;
  color: var(--vision-soft);
  line-height: 1.55;
`;

/* Workstream O2: the single latest-post feed-card styles (HandleStamp,
   FeedCopy, FeedVideoFrame) retired with the card — the real community feed
   (HomeCommunityFeed + PostCard) replaced it. */

/* Workstream N2: hosts the user's REAL cover (same media layer as the feed
   cover studio) behind the identity content, with a scrim for text contrast. */
export const CoverLayerHost = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--bg-base, #0A0A0F) 22%, transparent),
      color-mix(in srgb, var(--bg-base, #0A0A0F) 74%, transparent)
    );
  }
`;

export const HeroForeground = styled.div`
  position: relative;
  z-index: 1;
`;

/* Workstream N3/N4: Edit-Cover entry on the Home hero — opens the same
   embedded editor (photo/collage/layouts/presets) the feed cover uses.
   Sits bottom-right, OUT of the cover's focal area. $compact (when a real
   cover exists) collapses it to a 44px icon-only circle so it never
   obstructs the photo/carousel; the labeled pill only shows over the
   decorative backdrop. Always visible — no hover-only actions. */
export const EditCoverButton = styled.button<{ $compact?: boolean }>`
  position: absolute;
  bottom: 0.85rem;
  right: 0.85rem;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 44px;
  min-width: 44px;
  padding: ${({ $compact }) => ($compact ? '0' : '0 0.95rem')};
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--gilded-fern, #C6A84B) 55%, transparent);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) ${({ $compact }) => ($compact ? '55%' : '72%')}, transparent);
  color: var(--gilded-fern, #C6A84B);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    background: color-mix(in srgb, var(--gilded-fern, #C6A84B) 16%, var(--bg-base, #0A0A0F));
    box-shadow: 0 0 18px color-mix(in srgb, var(--gilded-fern, #C6A84B) 30%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

/* Workstream N3: truth-line under the Quick Post composer — shows the smart
   type + hashtags the post will ACTUALLY ship with (same inference path). */
export const IntentPreview = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.6rem;
  font-size: 0.78rem;
  color: var(--vision-soft);
`;

export const IntentTag = styled.span`
  color: var(--accent-primary, #60C0F0);
  font-weight: 600;
`;

export const SpotlightImage = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const SpotlightVideo = styled.video`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;
