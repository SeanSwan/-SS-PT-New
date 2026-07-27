import styled, { css } from 'styled-components';
import type { ProgressChartPulseTone } from './progressChartActions';

/** State-driven CTA emphasis (G4): primary=drill, promoted=share-on-record, utility=export. */
export type ActionEmphasis = 'primary' | 'promoted' | 'utility';

const emphasisStyles: Record<ActionEmphasis, ReturnType<typeof css>> = {
  primary: css`
    border-color: var(--border-accent, color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent));
    color: var(--text-primary, #E0ECF4);
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, var(--bg-surface, #1A1A24));
  `,
  promoted: css`
    border-color: var(--accent-gold, #C6A84B);
    color: var(--accent-gold, #C6A84B);
    background: color-mix(in srgb, var(--accent-gold, #C6A84B) 16%, var(--bg-surface, #1A1A24));
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent-gold, #C6A84B) 30%, transparent),
      0 4px 16px color-mix(in srgb, var(--accent-gold, #C6A84B) 26%, transparent);
    &:hover { border-color: var(--accent-gold, #C6A84B); }
  `,
  utility: css`
    opacity: 0.82;
    font-weight: 600;
  `,
};

export const ActionShell = styled.div`
  display: grid;
  gap: 0.55rem;
  margin: 0.55rem 0 0.25rem;
`;

export const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
`;

export const RangeGroup = styled.div`
  display: inline-flex;
  min-height: 44px;
  padding: 0.18rem;
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent));
  border-radius: 8px;
`;

export const RangeButton = styled.button<{ $active: boolean }>`
  min-height: 44px;
  min-width: 44px;
  padding: 0 0.65rem;
  border: 0;
  border-radius: 6px;
  background: ${({ $active }) => (
    $active
      ? 'var(--accent-primary-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent))'
      : 'transparent'
  )};
  color: ${({ $active }) => (
    $active ? 'var(--text-primary, #E0ECF4)' : 'var(--text-muted, rgba(224, 236, 244, 0.6))'
  )};
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  transition: background 0.18s ease, color 0.18s ease;

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const IconActionButton = styled.button<{ $emphasis?: ActionEmphasis }>`
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0 0.7rem;
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent));
  border-radius: 8px;
  background: var(--bg-surface, #1A1A24);
  color: var(--text-secondary, rgba(224, 236, 244, 0.74));
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;

  &:hover {
    color: var(--text-primary, #E0ECF4);
    border-color: var(--border-accent, color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent));
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.52;
  }

  /* State-driven emphasis (G4) applied last so it wins over the base look. */
  ${({ $emphasis }) => ($emphasis ? emphasisStyles[$emphasis] : null)}
`;

export const SummaryText = styled.p`
  margin: 0;
  color: var(--text-muted, rgba(224, 236, 244, 0.58));
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  line-height: 1.45;
`;

const PULSE_TONE_BORDERS: Record<ProgressChartPulseTone, string> = {
  building: 'var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent))',
  empty: 'var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent))',
  falling: 'var(--warning, #F59E0B)',
  record: 'var(--accent-gold, #C6A84B)',
  rising: 'var(--accent-primary, #60C0F0)',
  steady: 'var(--accent-secondary, #8B5CF6)',
};

const pulseToneBorder = (tone: ProgressChartPulseTone) => {
  return PULSE_TONE_BORDERS[tone];
};

export const PulsePanel = styled.div<{ $tone: ProgressChartPulseTone }>`
  display: grid;
  grid-template-columns: minmax(0, 0.75fr) minmax(0, 1fr);
  gap: 0.25rem 0.75rem;
  padding: 0.72rem 0.85rem;
  border: 1px solid ${({ $tone }) => pulseToneBorder($tone)};
  border-radius: 8px;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, ${({ $tone }) => pulseToneBorder($tone)} 14%, transparent),
      var(--bg-surface, #1A1A24) 58%
    );
  color: var(--text-secondary, rgba(224, 236, 244, 0.74));
  font-family: 'Sora', sans-serif;

  > span:first-child {
    min-width: 0;
    align-self: center;
    color: var(--text-muted, rgba(224, 236, 244, 0.62));
    font-size: 0.62rem;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

export const PulseValue = styled.strong`
  min-width: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 0.88rem;
  text-align: right;

  @media (max-width: 520px) {
    text-align: left;
  }
`;

export const PulseDetail = styled.p`
  grid-column: 1 / -1;
  margin: 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-size: 0.68rem;
  line-height: 1.45;
`;

export const PulseTarget = styled(PulseDetail)`
  color: var(--accent-primary, #60C0F0);
`;

export const LegendGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
`;

export const LegendButton = styled.button<{ $active: boolean; $color: string }>`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0 0.55rem;
  border: 1px solid ${({ $active, $color }) => (
    $active ? $color : 'var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent))'
  )};
  border-radius: 999px;
  background: ${({ $active }) => (
    $active ? 'var(--bg-surface, #1A1A24)' : 'transparent'
  )};
  color: ${({ $active }) => (
    $active ? 'var(--text-primary, #E0ECF4)' : 'var(--text-muted, rgba(224, 236, 244, 0.58))'
  )};
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.65rem;

  &::before {
    content: '';
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 999px;
    background: ${({ $color }) => $color};
    opacity: ${({ $active }) => ($active ? 1 : 0.38)};
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const DrilldownPanel = styled.div`
  display: grid;
  gap: 0.4rem;
  max-height: 8.5rem;
  overflow: auto;
  padding: 0.65rem;
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent));
  border-radius: 8px;
  background: var(--bg-surface, #1A1A24);
`;

export const DrilldownRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.5rem;
  align-items: start;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
`;

export const DrilldownDetail = styled.span`
  grid-column: 1 / -1;
  color: var(--text-muted, rgba(224, 236, 244, 0.56));
`;
