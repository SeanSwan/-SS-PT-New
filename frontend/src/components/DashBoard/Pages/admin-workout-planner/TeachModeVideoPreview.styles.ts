import styled from 'styled-components';
import { PLANNER_GOLD } from './plannerGold';

export const VideoPreviewShell = styled.section`
  margin: 0 0 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  border-radius: 8px;
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--surface-elevated, #003080) 28%, transparent),
      color-mix(in srgb, var(--bg-surface, #1A1A24) 82%, transparent));
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent) inset,
    0 16px 34px color-mix(in srgb, var(--bg-base, #030712) 42%, transparent);
  overflow: hidden;
`;

export const VideoPreviewHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px 8px;
`;

export const VideoPreviewTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.76rem;
  font-weight: 800;
`;

export const VideoPreviewMeta = styled.span`
  color: ${PLANNER_GOLD};
  font-family: 'Sora', sans-serif;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0;
`;

export const VideoStageButton = styled.button<{ $poster?: string | null }>`
  position: relative;
  display: flex;
  width: 100%;
  min-height: 132px;
  aspect-ratio: 16 / 9;
  align-items: center;
  justify-content: center;
  border: 0;
  border-top: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--midnight-sapphire, #002060) 72%, transparent),
      color-mix(in srgb, var(--wing-purple, #8B5CF6) 24%, var(--bg-base, #030712))),
    ${({ $poster }) => $poster ? `url("${$poster}") center / cover` : 'transparent'};
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent), transparent 34%),
      linear-gradient(180deg, transparent, color-mix(in srgb, var(--bg-base, #030712) 64%, transparent));
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: -4px;
  }

  @media (max-width: 430px) {
    min-height: 116px;
  }
`;

export const VideoPlayBadge = styled.span`
  position: relative;
  z-index: 1;
  display: inline-flex;
  min-width: 44px;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 58%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-base, #030712) 68%, transparent);
  box-shadow: 0 0 30px color-mix(in srgb, var(--wing-purple, #8B5CF6) 32%, transparent);
`;

export const VideoMediaFrame = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-top: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  background: var(--bg-base, #030712);

  video,
  iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
  }
`;

export const VideoFallbackLink = styled.a`
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 8px;
  margin: 10px 12px 12px;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  text-decoration: none;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;
