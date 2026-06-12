/**
 * ============================================================================
 * FILE: HomeTabVisionCenter.styles.ts
 * PURPOSE: Local styled-components for the Home center column, extracted from
 *          HomeTabVisionCenter.tsx (rule 4 — 300-line cap) during workstream
 *          N2 when the real cover layer and real latest-post media landed.
 * ============================================================================
 */
import styled from 'styled-components';
import { ButtonRow, VideoFrame } from './HomeTabVisionCards.styles';

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

export const HandleStamp = styled.div`
  color: var(--vision-soft);
  font-size: 0.8rem;
`;

export const FeedCopy = styled.p`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  line-height: 1.6;
`;

export const FeedVideoFrame = styled(VideoFrame)`
  min-height: 280px;
`;

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
