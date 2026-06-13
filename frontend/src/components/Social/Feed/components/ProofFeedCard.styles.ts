/**
 * FILE: ProofFeedCard.styles.ts
 * PURPOSE: Styled-components for social feed progress proof milestone cards.
 * OWNER: Social Feed / Progress Proof
 * DATA: Presentation only; proof values are parsed from safe milestone post data.
 */

import styled from 'styled-components';

export const ProofCardShell = styled.section`
  position: relative;
  overflow: hidden;
  display: grid;
  gap: 0.85rem;
  margin: 0 0 1rem;
  padding: 1rem;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 42%, transparent);
  border-radius: 8px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--accent-gold, #C6A84B) 18%, transparent), transparent 42%),
    linear-gradient(160deg, color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent), var(--bg-surface, #111122));
  box-shadow: 0 18px 38px color-mix(in srgb, var(--bg-base, #0A0A0F) 48%, transparent);
`;

export const ProofHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
`;

export const ProofKicker = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const ProofTitle = styled.strong`
  display: block;
  margin-top: 0.35rem;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(1rem, 2.4vw, 1.35rem);
  line-height: 1.15;
`;

export const ProofLevelBadge = styled.span`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 44px;
  padding: 0 0.75rem;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 62%, transparent);
  border-radius: 999px;
  color: var(--accent-gold, #C6A84B);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
`;

export const ProofMeterTrack = styled.div`
  height: 0.55rem;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
`;

export const ProofMeterFill = styled.span<{ $percent: number }>`
  display: block;
  width: ${({ $percent }) => Math.max(0, Math.min(100, $percent))}%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent-primary, #60C0F0), var(--accent-gold, #C6A84B));
`;

export const ProofStatsGrid = styled.dl`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
  margin: 0;
`;

export const ProofStat = styled.div`
  padding: 0.65rem;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 48%, transparent);

  dt {
    color: var(--text-muted, rgba(224, 236, 244, 0.62));
    font-size: 0.68rem;
  }

  dd {
    margin: 0.25rem 0 0;
    color: var(--text-primary, #E0ECF4);
    font-family: 'Fira Code', monospace;
    font-size: 0.9rem;
    font-weight: 700;
  }
`;

export const ProofCaption = styled.p`
  margin: 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.82));
  font-size: 0.9rem;
  line-height: 1.5;
`;

export const ProofFootnote = styled.p`
  margin: 0;
  color: var(--text-muted, rgba(224, 236, 244, 0.62));
  font-size: 0.75rem;
  line-height: 1.45;
`;
