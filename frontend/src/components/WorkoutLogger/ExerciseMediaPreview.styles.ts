/**
 * ExerciseMediaPreview styles
 * ===========================
 *
 * Compact media frame for the shared WorkoutLogger Rolodex preview. Uses the
 * WorkoutLogger Crystalline Swan token bridge so trainer/client surfaces stay
 * visually aligned without introducing local palettes.
 */
import styled, { css } from 'styled-components';
import { CS, withAlpha } from './WorkoutLoggerCS';

export const MediaFrame = styled.div`
  position: relative;
  aspect-ratio: 16 / 9;
  width: 100%;
  margin-bottom: 8px;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid ${withAlpha(CS.glow, 0.18)};
  background:
    linear-gradient(135deg, ${withAlpha(CS.tertiary, 0.32)}, ${withAlpha(CS.surfaceDark, 0.92)}),
    ${CS.surfaceDark};
  box-shadow: inset 0 1px 0 ${withAlpha(CS.text, 0.06)};
`;

export const MediaVideo = styled.video`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: ${CS.bgDeep};
`;

export const MediaImage = styled.img`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

/**
 * H18 compact media: the thumbnail variant drops the large decorative swan
 * shape and the two-line guidance copy so a row-height slot can carry a
 * single readable "No demo" label. Frame geometry (16/9 MediaFrame) is
 * unchanged, so rows do not reflow between media states.
 */
const compactFallback = css`
  gap: 0;
  padding: 4px;

  &::before {
    content: none;
  }
`;

export const FallbackPreview = styled.div<{ $compact?: boolean }>`
  display: grid;
  place-items: center;
  gap: 6px;
  width: 100%;
  height: 100%;
  padding: 12px;
  text-align: center;
  color: ${CS.text};

  &::before {
    content: '';
    width: 58px;
    height: 48px;
    clip-path: polygon(50% 0, 94% 28%, 82% 82%, 50% 100%, 18% 82%, 6% 28%);
    background:
      linear-gradient(135deg, ${withAlpha(CS.glow, 0.78)}, ${withAlpha(CS.secondary, 0.68)}),
      ${CS.tertiary};
    box-shadow: 0 0 22px ${withAlpha(CS.glow, 0.22)};
  }

  ${({ $compact }) => ($compact ? compactFallback : '')}
`;

export const FallbackCompactLabel = styled.div`
  color: ${CS.textSecondary};
  font-family: 'Sora', sans-serif;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.2;
  text-align: center;
`;

export const FallbackTitle = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  line-height: 1.2;
`;

export const FallbackText = styled.div`
  max-width: 180px;
  color: ${CS.textSecondary};
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1.35;
`;
