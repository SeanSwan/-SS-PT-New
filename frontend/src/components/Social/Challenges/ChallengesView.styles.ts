/**
 * ChallengesView styled-components.
 *
 * Tokenized Crystalline Swan challenge surfaces for the dashboard-mounted
 * social challenges tab. No raw rgba styling; all color intensity uses tokens
 * plus color-mix fallbacks.
 */
import styled from 'styled-components';
import { motion } from 'framer-motion';

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: clamp(16px, 2vw, 24px);
  min-width: 0;
`;

export const CategoryFilterRow = styled.div`
  display: flex;
  gap: 8px;
  margin-inline: -2px;
  min-width: 0;
  overflow-x: auto;
  padding: 2px 2px 8px;
  scrollbar-width: thin;
  scroll-snap-type: x proximity;

  @media (min-width: 900px) {
    flex-wrap: wrap;
    overflow: visible;
    padding-bottom: 0;
  }
`;

export const CategoryPill = styled.button<{ $active: boolean; $color: string }>`
  display: inline-flex;
  flex: 0 0 auto;
  min-height: 44px;
  align-items: center;
  gap: 6px;
  border: 1px solid ${({ $active, $color }) =>
    $active ? $color : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 14%, transparent)'};
  border-radius: 999px;
  background: ${({ $active, $color }) =>
    $active ? `color-mix(in srgb, ${$color} 16%, transparent)` : 'color-mix(in srgb, var(--bg-card, #141419) 72%, transparent)'};
  color: ${({ $active, $color }) => ($active ? $color : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 68%, transparent)')};
  cursor: pointer;
  font: 700 0.78rem/1 var(--font-ui, 'Sora', sans-serif);
  padding: 0 14px;
  scroll-snap-align: start;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease;

  &:hover {
    border-color: ${({ $color }) => $color};
    box-shadow: 0 0 16px ${({ $color }) => `color-mix(in srgb, ${$color} 18%, transparent)`};
    color: ${({ $color }) => $color};
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
`;

export const TabBar = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 58%, transparent);
  padding: 4px;
`;

export const TabButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid ${({ $active }) =>
    $active ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 34%, transparent)' : 'transparent'};
  border-radius: 8px;
  background: ${({ $active }) =>
    $active ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent)' : 'transparent'};
  color: ${({ $active }) =>
    $active ? 'var(--accent-secondary, #8B5CF6)' : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 66%, transparent)'};
  cursor: pointer;
  font: 800 0.84rem/1 var(--font-ui, 'Sora', sans-serif);
  padding: 0 12px;
  transition: background 0.2s ease, color 0.2s ease;

  &:hover {
    background: color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent);
    color: var(--text-primary, #E0ECF4);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
`;

export const ChallengeCard = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 16px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  border-radius: 8px;
  background:
    linear-gradient(150deg, color-mix(in srgb, var(--bg-card, #141419) 84%, transparent), color-mix(in srgb, var(--bg-base, #0A0A0F) 88%, transparent)),
    var(--bg-card, #141419);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 6%, transparent);
  padding: clamp(18px, 2.4vw, 24px);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    border-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 28%, transparent);
    box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent);
  }
`;

export const ChallengeList = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  @media (max-width: 560px) {
    flex-direction: column-reverse;
  }
`;

export const CardTitleRow = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
  gap: 12px;
`;

export const CategoryBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid ${({ $color }) => `color-mix(in srgb, ${$color} 36%, transparent)`};
  border-radius: 999px;
  background: ${({ $color }) => `color-mix(in srgb, ${$color} 14%, transparent)`};
  color: ${({ $color }) => $color};
  font: 800 0.7rem/1 var(--font-ui, 'Sora', sans-serif);
  padding: 0.32rem 0.75rem;
  text-transform: capitalize;
  white-space: nowrap;
`;

export const CardTitle = styled.h3`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font: 800 1.05rem/1.25 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
`;

export const CardDescription = styled.p`
  margin: 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 66%, transparent);
  font: 500 0.88rem/1.55 var(--font-ui, 'Sora', sans-serif);
`;

export const ProgressBarOuter = styled.div`
  width: 100%;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-primary, #E0ECF4) 12%, transparent);
`;

export const ProgressBarInner = styled(motion.div)<{ $color: string }>`
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, ${({ $color }) => $color}, ${({ $color }) => `color-mix(in srgb, ${$color} 68%, var(--text-primary, #E0ECF4))`});
`;

export const ProgressStats = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
`;

export const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

export const MetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 66%, transparent);
  font: 700 0.78rem/1.2 var(--font-ui, 'Sora', sans-serif);
`;

export const RewardBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 34%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 14%, transparent);
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 86%, var(--accent-secondary, #8B5CF6));
  font: 800 0.72rem/1 var(--font-ui, 'Sora', sans-serif);
  padding: 0.34rem 0.75rem;
`;

export const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  border: 1px solid color-mix(in srgb, var(--accent-luxury, #C6A84B) 34%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent-luxury, #C6A84B) 12%, transparent);
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 88%, var(--accent-luxury, #C6A84B));
  font: 800 0.72rem/1 var(--font-ui, 'Sora', sans-serif);
  padding: 0.28rem 0.7rem;
`;

export const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' | 'completed' }>`
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  align-self: flex-start;
  gap: 8px;
  border-radius: 8px;
  cursor: ${({ disabled }) => (disabled ? 'default' : 'pointer')};
  font: 800 0.82rem/1 var(--font-ui, 'Sora', sans-serif);
  padding: 0 18px;
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  ${({ $variant }) => {
    if ($variant === 'completed') {
      return `
        border: 1px solid color-mix(in srgb, var(--success, #22C55E) 34%, transparent);
        background: color-mix(in srgb, var(--success, #22C55E) 12%, transparent);
        color: var(--success, #22C55E);
      `;
    }

    if ($variant === 'secondary') {
      return `
        border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 28%, transparent);
        background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent);
        color: var(--accent-secondary, #8B5CF6);

        &:hover {
          box-shadow: 0 0 18px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 24%, transparent);
        }
      `;
    }

    return `
      border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 34%, transparent);
      background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, var(--bg-base, #0A0A0F));
      color: var(--text-primary, #E0ECF4);

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 0 20px color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
      }
    `;
  }}

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`;
export * from './ChallengesView.statusStyles';
