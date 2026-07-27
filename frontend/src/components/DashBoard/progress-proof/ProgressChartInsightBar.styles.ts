import styled from 'styled-components';
import type { ProgressChartPulseTone } from './progressChartPulse';
import type { ProgressChartFactEmphasis } from './progressChartFacts';

/**
 * Shared chart-environment insight chrome (C11): a momentum strip driven by
 * the pulse tone plus a truthful facts-pill rail. Consumed by BOTH the admin
 * (Clients & Team) and client canonical progress grids so insight styling
 * cannot drift between audiences.
 */

const TONE_ACCENTS: Record<ProgressChartPulseTone, string> = {
  building: 'var(--accent-secondary, #8B5CF6)',
  empty: 'var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent))',
  falling: 'var(--warning, #F59E0B)',
  record: 'var(--accent-gold, #C6A84B)',
  rising: 'var(--accent-primary, #60C0F0)',
  steady: 'var(--accent-tertiary, #4070C0)',
};

const FACT_ACCENTS: Record<ProgressChartFactEmphasis, string> = {
  default: 'var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent))',
  accent: 'var(--accent-primary, #60C0F0)',
  gold: 'var(--accent-gold, #C6A84B)',
  alert: 'var(--danger, #E5484D)',
};

export const InsightWrap = styled.div`
  display: grid;
  gap: 0.45rem;
  width: 100%;
  min-width: 0;
`;

export const MomentumStrip = styled.div<{ $tone: ProgressChartPulseTone }>`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.25rem 0.75rem;
  align-items: center;
  min-width: 0;
  padding: 0.62rem 0.72rem;
  border: 1px solid color-mix(in srgb, ${({ $tone }) => TONE_ACCENTS[$tone]} 55%, transparent);
  border-radius: 8px;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, ${({ $tone }) => TONE_ACCENTS[$tone]} 13%, transparent),
      var(--bg-surface, #1A1A24) 62%
    );
  font-family: 'Sora', sans-serif;

  @media (max-width: 520px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const MomentumLabel = styled.span`
  min-width: 0;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent));
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
  overflow-wrap: anywhere;
`;

export const MomentumValue = styled.strong`
  min-width: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 0.78rem;
  justify-self: end;

  @media (max-width: 520px) {
    justify-self: start;
  }
`;

export const MomentumDetail = styled.span`
  grid-column: 1 / -1;
  min-width: 0;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent));
  font-size: 0.66rem;
  line-height: 1.4;
  overflow-wrap: anywhere;
`;

// Coach Read (G3a): the plain-language next-best-action line. Spans the full strip,
// accent-tinted so it reads as the "what to do" beat, not just more description.
export const CoachRead = styled.p`
  grid-column: 1 / -1;
  min-width: 0;
  margin: 0.35rem 0 0;
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
  color: var(--accent-primary, #60C0F0);
  font: 700 0.68rem/1.4 'Sora', sans-serif;
  overflow-wrap: anywhere;
  svg { flex: 0 0 auto; margin-top: 1px; }
`;

export const FactRail = styled.dl`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  min-width: 0;
`;

export const FactPill = styled.div<{ $emphasis: ProgressChartFactEmphasis }>`
  display: inline-flex;
  align-items: baseline;
  gap: 0.38rem;
  min-width: 0;
  padding: 0.32rem 0.6rem;
  border: 1px solid color-mix(in srgb, ${({ $emphasis }) => FACT_ACCENTS[$emphasis]} 32%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, ${({ $emphasis }) => FACT_ACCENTS[$emphasis]} 8%, transparent);

  dt {
    margin: 0;
    color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 58%, transparent));
    font-family: 'Sora', sans-serif;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: uppercase;
    white-space: normal;
  }

  dd {
    margin: 0;
    color: ${({ $emphasis }) => FACT_ACCENTS[$emphasis]};
    font-family: 'Fira Code', monospace;
    font-size: 0.72rem;
    font-weight: 600;
    min-width: 0;
    overflow-wrap: anywhere;
  }
`;
