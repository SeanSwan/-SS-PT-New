/**
 * FILE: HomeTabVisionCards.styles.ts
 * PURPOSE: Card, feed, rail, and mobile styles for Creator Observatory.
 */

import styled, { css } from 'styled-components';

const focusRing = css`
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
`;

export const NavButton = styled.button<{ $active?: boolean }>`
  width: 100%;
  min-height: 44px;
  border-radius: 14px;
  border: 1px solid ${({ $active }) => ($active ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 50%, transparent)' : 'transparent')};
  background: ${({ $active }) => ($active
    ? 'linear-gradient(135deg, color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent), color-mix(in srgb, var(--accent-secondary, #8B5CF6) 28%, transparent))'
    : 'transparent')};
  color: ${({ $active }) => ($active ? 'var(--text-primary, #E0ECF4)' : 'var(--vision-soft)')};
  display: flex;
  align-items: center;
  gap: 0.72rem;
  padding: 0 0.8rem;
  font: 800 0.82rem/1 var(--font-ui, 'Sora', sans-serif);
  cursor: pointer;
  ${focusRing}

  svg { color: var(--accent-primary, #60C0F0); }
  &:hover { color: var(--text-primary, #E0ECF4); background: color-mix(in srgb, var(--accent-primary, #60C0F0) 7%, transparent); }
`;

export const ButtonRow = styled.div`
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
  align-items: center;
`;

export const GlassButton = styled.button<{ $variant?: 'primary' | 'accent' | 'ghost' }>`
  min-height: 44px;
  border-radius: 999px;
  border: 1px solid ${({ $variant }) => ($variant === 'ghost' ? 'var(--vision-border)' : 'transparent')};
  padding: 0 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  color: ${({ $variant }) => ($variant === 'ghost' ? 'var(--text-primary, #E0ECF4)' : 'var(--text-inverse, #0F172A)')};
  background: ${({ $variant }) => {
    if ($variant === 'accent') return 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0))';
    if ($variant === 'ghost') return 'color-mix(in srgb, var(--bg-elevated, #141419) 70%, transparent)';
    return 'linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6))';
  }};
  font: 900 0.78rem/1 var(--font-ui, 'Sora', sans-serif);
  cursor: pointer;
  backdrop-filter: blur(10px);
  box-shadow: ${({ $variant }) => ($variant === 'ghost'
    ? 'inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 7%, transparent)'
    : '0 0 22px color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent)')};
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
  ${focusRing}

  &:hover:not(:disabled) {
    border-color: var(--accent-secondary, #8B5CF6);
    transform: translateY(-1px);
    box-shadow: 0 0 16px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 28%, transparent);
  }

  &:disabled { opacity: 0.55; cursor: not-allowed; }
`;

export const Chip = styled.span<{ $tone?: 'gold' | 'cyan' | 'violet' }>`
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  border: 1px solid ${({ $tone }) => {
    if ($tone === 'gold') return 'color-mix(in srgb, var(--accent-gold, #C6A84B) 42%, transparent)';
    if ($tone === 'violet') return 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 42%, transparent)';
    return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 36%, transparent)';
  }};
  background: color-mix(in srgb, ${({ $tone }) => {
    if ($tone === 'gold') return 'var(--accent-gold, #C6A84B)';
    if ($tone === 'violet') return 'var(--accent-secondary, #8B5CF6)';
    return 'var(--accent-primary, #60C0F0)';
  }} 12%, transparent);
  color: ${({ $tone }) => {
    if ($tone === 'gold') return 'var(--accent-gold, #C6A84B)';
    if ($tone === 'violet') return 'var(--accent-secondary, #8B5CF6)';
    return 'var(--accent-primary, #60C0F0)';
  }};
  font: 800 0.7rem/1 var(--font-ui, 'Sora', sans-serif);
`;

export const Bar = styled.div`
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
`;

export const Fill = styled.div<{ $pct: number; $gold?: boolean }>`
  width: ${({ $pct }) => Math.min(Math.max($pct, 0), 100)}%;
  height: 100%;
  border-radius: inherit;
  background: ${({ $gold }) => ($gold
    ? 'linear-gradient(90deg, var(--accent-gold, #C6A84B), color-mix(in srgb, var(--accent-gold, #C6A84B) 55%, var(--accent-primary, #60C0F0)))'
    : 'linear-gradient(90deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6))')};
`;

export const CenterGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(280px, 0.88fr) minmax(320px, 1.12fr);
  gap: 1rem;

  @media (max-width: 1500px) and (min-width: 1321px) {
    grid-template-columns: minmax(0, 1fr);
  }

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

export const VideoFrame = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  min-height: 236px;
  background: var(--bg-base, #0A0A0F);
  border: 1px solid var(--vision-border);
`;

export const PlayBadge = styled.button`
  position: absolute;
  inset: 50% auto auto 50%;
  transform: translate(-50%, -50%);
  width: 54px;
  height: 54px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 52%, transparent);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 70%, transparent);
  color: var(--accent-primary, #60C0F0);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  ${focusRing}
`;

export const ComposerInput = styled.textarea`
  width: 100%;
  min-height: 94px;
  resize: vertical;
  border-radius: 16px;
  border: 1px solid var(--vision-border);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, transparent);
  color: var(--text-primary, #E0ECF4);
  padding: 0.85rem 0.95rem;
  font: 700 0.9rem/1.5 var(--font-ui, 'Sora', sans-serif);
  ${focusRing}

  &::placeholder { color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 48%, transparent)); }
`;

export const MoodScroller = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  min-width: 0;
  padding: 0.1rem 0 0;
`;

export const MoodButton = styled.button<{ $active?: boolean }>`
  flex: 0 1 auto; min-height: 44px; min-width: min(100%, 7.6rem);
  white-space: nowrap;
  border-radius: 999px;
  border: 1px solid ${({ $active }) => ($active ? 'var(--accent-secondary, #8B5CF6)' : 'var(--vision-border)')};
  background: ${({ $active }) => ($active ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 24%, transparent)' : 'transparent')};
  color: var(--text-primary, #E0ECF4);
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  max-width: 100%; overflow: hidden; padding: 0 0.85rem; text-overflow: ellipsis;
  cursor: pointer;
  ${focusRing}
`;

export const FeedCard = styled.article`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
`;

export const FeedHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  align-items: flex-start;
`;

export const AvatarMini = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  overflow: hidden;
  flex: 0 0 auto;
  border: 2px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 44%, transparent);
  background: var(--bg-elevated, #141419);

  img { width: 100%; height: 100%; object-fit: cover; display: block; }
`;

export const StoryStrip = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 52px;
  gap: 6px;
  overflow-x: auto; padding-bottom: 4px;
  scrollbar-width: none;

  &::-webkit-scrollbar { display: none; }

  @media (max-width: 430px) { grid-auto-columns: 58px; }
`;

export const StoryItem = styled.button`
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--vision-soft);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  font: 700 0.68rem/1.15 var(--font-ui, 'Sora', sans-serif);
  cursor: pointer;
  ${focusRing}
`;

export const StoryBubble = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  padding: 2px;
  background: conic-gradient(from 90deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6), var(--accent-gold, #C6A84B), var(--accent-primary, #60C0F0));

  > div { width: 100%; height: 100%; border-radius: inherit; overflow: hidden; background: var(--bg-elevated, #141419); }
`;

export const MobileBottomNav = styled.nav`
  position: fixed;
  left: max(0.75rem, env(safe-area-inset-left));
  right: max(0.75rem, env(safe-area-inset-right));
  bottom: max(0.75rem, env(safe-area-inset-bottom));
  z-index: 30;
  display: none;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.35rem;
  border-radius: 22px;
  border: 1px solid var(--vision-border);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 88%, transparent);
  backdrop-filter: blur(18px);
  padding: 0.45rem;

  @media (max-width: 760px) {
    display: grid;
  }
`;

export const MobileNavButton = styled.button<{ $active?: boolean }>`
  min-height: 52px;
  border: 0;
  border-radius: 16px;
  background: ${({ $active }) => ($active ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent)' : 'transparent')};
  color: ${({ $active }) => ($active ? 'var(--text-primary, #E0ECF4)' : 'var(--vision-soft)')};
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.22rem;
  font: 800 0.62rem/1 var(--font-ui, 'Sora', sans-serif);
  cursor: pointer;
  transform: ${({ $active }) => ($active ? 'translateY(-3px)' : 'none')};
  transition: transform 0.22s ease, color 0.22s ease, background 0.22s ease;
  ${focusRing}

  svg {
    color: ${({ $active }) => ($active ? 'var(--accent-primary, #60C0F0)' : 'currentColor')};
  }
`;
