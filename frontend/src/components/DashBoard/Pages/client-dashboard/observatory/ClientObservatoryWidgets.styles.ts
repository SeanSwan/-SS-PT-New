/**
 * FILE: ClientObservatoryWidgets.styles.ts
 * PURPOSE: Right-rail widget styling for the live client observatory.
 */

import styled from 'styled-components';
import { ObservatoryCard } from './ClientObservatoryShell.styles';

export const WidgetCard = styled(ObservatoryCard)``;

export const WidgetHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
`;

export const WidgetList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
`;

export const WidgetRow = styled.div`
  min-height: 52px;
  border-radius: 14px;
  padding: 0.72rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 58%, transparent);
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
`;

export const WidgetLabel = styled.span`
  min-width: 0;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 70%, transparent));
  font: 700 0.78rem/1.35 'Sora', sans-serif;
`;

export const WidgetValue = styled.strong`
  flex: 0 0 auto;
  color: var(--text-primary, #E0ECF4);
  font: 900 0.9rem/1.1 'Fira Code', monospace;
`;

export const StatusPill = styled.span<{ $tone?: 'cyan' | 'violet' | 'gold' }>`
  min-height: 30px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.66rem;
  color: ${({ $tone }) => (
    $tone === 'gold'
      ? 'var(--accent-gold, #C6A84B)'
      : $tone === 'violet'
        ? 'var(--accent-secondary, #8B5CF6)'
        : 'var(--accent-primary, #60C0F0)'
  )};
  background: color-mix(in srgb, currentColor 12%, transparent);
  border: 1px solid color-mix(in srgb, currentColor 24%, transparent);
  font: 900 0.7rem/1 'Sora', sans-serif;
  text-transform: uppercase;
`;

export const StoryStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.6rem;
`;

export const StoryItem = styled.div`
  min-width: 0;
  display: grid;
  gap: 0.4rem;
  justify-items: center;
  text-align: center;

  span {
    max-width: 100%;
    color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent));
    font: 800 0.68rem/1.2 'Sora', sans-serif;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

export const StoryOrb = styled.div<{ $tone?: 'cyan' | 'violet' | 'gold' }>`
  position: relative;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  overflow: hidden;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 35% 24%, color-mix(in srgb, currentColor 42%, transparent), transparent 58%),
    color-mix(in srgb, var(--bg-base, #0A0A0F) 70%, transparent);
  color: ${({ $tone }) => (
    $tone === 'gold'
      ? 'var(--accent-gold, #C6A84B)'
      : $tone === 'violet'
        ? 'var(--accent-secondary, #8B5CF6)'
        : 'var(--accent-primary, #60C0F0)'
  )};
  border: 2px solid color-mix(in srgb, currentColor 62%, transparent);
  box-shadow: 0 0 18px color-mix(in srgb, currentColor 26%, transparent);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

export const ActivityGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;

  @media (max-width: 460px) {
    grid-template-columns: 1fr;
  }
`;

export const ActivityItem = styled.div`
  min-width: 0;
  display: flex;
  gap: 0.55rem;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 66%, transparent));
  font: 700 0.74rem/1.35 'Sora', sans-serif;
`;

export const BadgeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem;
  margin-bottom: 0.75rem;
`;

export const BadgeHex = styled.div<{ $tone?: 'cyan' | 'violet' | 'gold' }>`
  min-height: 58px;
  display: grid;
  place-items: center;
  clip-path: polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0 50%);
  color: ${({ $tone }) => (
    $tone === 'gold'
      ? 'var(--accent-gold, #C6A84B)'
      : $tone === 'violet'
        ? 'var(--accent-secondary, #8B5CF6)'
        : 'var(--accent-primary, #60C0F0)'
  )};
  background:
    linear-gradient(135deg, color-mix(in srgb, currentColor 20%, transparent), transparent),
    color-mix(in srgb, var(--bg-base, #0A0A0F) 58%, transparent);
  border: 1px solid color-mix(in srgb, currentColor 34%, transparent);
  font: 900 0.9rem/1 'Sora', sans-serif;
`;

export const ChallengeStage = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 72px;
  gap: 0.8rem;
  align-items: center;
  margin-top: 0.75rem;
`;

export const CrystalBadge = styled.div`
  width: 72px;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-radius: 20px;
  color: var(--accent-gold, #C6A84B);
  background:
    radial-gradient(circle at 40% 22%, color-mix(in srgb, var(--accent-gold, #C6A84B) 42%, transparent), transparent 52%),
    color-mix(in srgb, var(--bg-base, #0A0A0F) 64%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 32%, transparent);
`;

export const MomentumGrid = styled.div`
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 1rem;
  align-items: center;
`;

export const MomentumRing = styled.div`
  position: relative;
  width: 88px;
  height: 88px;

  strong {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: var(--text-primary, #E0ECF4);
    font: 900 0.88rem/1 'Fira Code', monospace;
  }
`;

export const MomentumBars = styled.div`
  height: 72px;
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 0.35rem;
`;

export const MomentumBar = styled.span<{ $height: number; $gold?: boolean }>`
  width: 100%;
  min-width: 8px;
  height: ${({ $height }) => $height}%;
  border-radius: 999px 999px 5px 5px;
  background: ${({ $gold }) => (
    $gold ? 'var(--accent-gold, #C6A84B)' : 'var(--accent-primary, #60C0F0)'
  )};
  box-shadow: 0 0 14px color-mix(in srgb, currentColor 24%, transparent);
`;

export const WidgetMeta = styled.p`
  margin: 0.6rem 0 0;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent));
  font: 600 0.8rem/1.45 'Sora', sans-serif;
`;
