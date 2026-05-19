/**
 * FILE: VerticalReels.styles.ts
 * PURPOSE: Theme-aware presentation layer for the Social Reels viewer.
 */

import styled from 'styled-components';
import { sanitizeImageUrl, cssUrlValue } from '../../../utils/imageUrl';

export type ReelsFrame = 'standalone' | 'dashboard';

export const ReelsContainer = styled.div<{ $frame: ReelsFrame }>`
  position: relative;
  width: 100%;
  max-width: ${({ $frame }) => ($frame === 'dashboard' ? 'min(100%, 720px)' : '520px')};
  margin: 0 auto;
  height: ${({ $frame }) => ($frame === 'dashboard' ? 'clamp(520px, 68vh, 760px)' : 'calc(100vh - 180px)')};
  min-height: ${({ $frame }) => ($frame === 'dashboard' ? '480px' : '520px')};
  overflow: hidden;
  border-radius: 22px;
  background:
    radial-gradient(circle at 20% 12%, color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent), transparent 34%),
    linear-gradient(160deg, var(--bg-base, #0A0A0F), color-mix(in srgb, var(--bg-elevated, #141419) 82%, black));
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  box-shadow:
    0 24px 70px color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
  touch-action: pan-y;

  @media (max-width: 768px) {
    max-width: 100%;
    border-radius: 18px;
    height: ${({ $frame }) => ($frame === 'dashboard' ? 'min(72vh, 640px)' : 'calc(100vh - 120px)')};
    min-height: 440px;
  }
`;

export const ReelSlide = styled.div<{ $active: boolean; $direction: 'up' | 'down' | 'none' }>`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  transform: ${({ $active, $direction }) =>
    $active ? 'translateY(0)' :
    $direction === 'up' ? 'translateY(-100%)' : 'translateY(100%)'};
  z-index: ${({ $active }) => $active ? 2 : 1};
`;

export const VideoWrapper = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-base, #0A0A0F);

  video {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

export const ImageWrapper = styled.div<{ $src: string }>`
  position: absolute;
  inset: 0;
  background: ${({ $src }) => {
    const safe = sanitizeImageUrl($src);
    return safe ? `url(${cssUrlValue(safe)}) center / cover no-repeat` : 'transparent';
  }};

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--bg-base, #0A0A0F) 22%, transparent), transparent 32%),
      linear-gradient(0deg, color-mix(in srgb, var(--bg-base, #0A0A0F) 92%, transparent), transparent 62%);
  }
`;

export const DefaultBackground = styled.div`
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 34%, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 24%, transparent), transparent 34%),
    linear-gradient(135deg, var(--bg-base, #0A0A0F), var(--bg-elevated, #141419));
  display: flex;
  align-items: center;
  justify-content: center;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(0deg, color-mix(in srgb, var(--bg-base, #0A0A0F) 88%, transparent), transparent 58%);
  }

  img {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    opacity: 0.35;
    filter: drop-shadow(0 0 30px color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent));
  }
`;

export const ContentOverlay = styled.div`
  position: relative;
  z-index: 3;
  padding: 20px 16px 24px;
  display: flex;
  gap: 12px;
`;

export const ContentLeft = styled.div`
  flex: 1;
  min-width: 0;
`;

export const UserRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
`;

export const Avatar = styled.div<{ $src?: string }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 52%, white);
  background: ${({ $src }) => {
    const safe = $src ? sanitizeImageUrl($src) : null;
    return safe
      ? `url(${cssUrlValue(safe)}) center / cover`
      : 'linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6))';
  }};
  flex-shrink: 0;
`;

export const UserName = styled.span`
  font-weight: 800;
  font-size: 14px;
  color: var(--text-primary, #E0ECF4);
  text-shadow: 0 1px 4px color-mix(in srgb, var(--bg-base, #0A0A0F) 70%, transparent);
`;

export const PostContent = styled.p`
  font-size: 14px;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 90%, transparent);
  margin: 0;
  max-height: 80px;
  overflow: hidden;
  text-shadow: 0 1px 3px color-mix(in srgb, var(--bg-base, #0A0A0F) 70%, transparent);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
`;

export const TypeBadge = styled.span`
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  color: var(--accent-primary, #60C0F0);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0;
`;

export const ActionBar = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  flex-shrink: 0;
`;

export const ActionButton = styled.button<{ $active?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 34%, transparent);
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 12%, transparent);
  border-radius: 999px;
  color: ${({ $active }) => $active ? 'var(--danger, #F87171)' : 'var(--text-primary, #E0ECF4)'};
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  padding: 4px;
  backdrop-filter: blur(8px);

  svg { filter: drop-shadow(0 1px 3px color-mix(in srgb, var(--bg-base, #0A0A0F) 70%, transparent)); }
  span {
    font-size: 11px;
    font-weight: 700;
    text-shadow: 0 1px 3px color-mix(in srgb, var(--bg-base, #0A0A0F) 70%, transparent);
  }
`;

export const MuteButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 5;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 52%, transparent);
  backdrop-filter: blur(8px);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const NavHints = styled.div`
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 8px;
  opacity: 0.55;

  @media (max-width: 768px) { display: none; }
`;

export const NavHintBtn = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 18%, transparent);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 45%, transparent);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover { opacity: 1; background: color-mix(in srgb, var(--bg-base, #0A0A0F) 68%, transparent); }
`;

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted, rgba(224, 236, 244, 0.6));
  text-align: center;
  padding: 40px;
  gap: 16px;

  h3 { color: var(--text-primary, #E0ECF4); margin: 0; }
  p { margin: 0; font-size: 14px; }
`;

export const ProgressDots = styled.div`
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
  display: flex;
  gap: 4px;
`;

export const Dot = styled.div<{ $active: boolean }>`
  width: ${({ $active }) => $active ? '16px' : '6px'};
  height: 6px;
  border-radius: 3px;
  background: ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 38%, transparent)'};
  transition: width 0.3s, background 0.3s;
`;
