/**
 * COMPONENT STYLES: Trainer Client Readiness
 * PURPOSE: Theme-connected micro-surfaces for the canonical trainer /clients card.
 * PARENT: MyClientsView.clientCard.tsx
 * DATA FLOW: Receives already-adapted client source, session, and workout-proof text.
 */

import styled from 'styled-components';

export const ClientReadinessStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
  gap: 0.5rem;
  margin: 0.75rem 0 0;

  @media (max-width: 520px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 360px) {
    grid-template-columns: 1fr;
  }
`;

export const ReadinessChip = styled.div`
  min-height: 48px;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.18));
  border-radius: 8px;
  background: var(--surface-deep, rgba(5, 12, 24, 0.42));
  color: var(--text-primary, #E0ECF4);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.2;

  svg {
    flex: 0 0 auto;
    color: var(--accent-primary, #60C0F0);
  }

  span {
    min-width: 0;
    overflow-wrap: anywhere;
  }
`;

export const WorkoutProofPanel = styled.div`
  margin: 1rem 0;
  padding: 0.85rem;
  border: 1px solid var(--border-accent-soft, rgba(139, 92, 246, 0.22));
  border-radius: 12px;
  background:
    linear-gradient(160deg,
      color-mix(in srgb, var(--surface-accent, #003080) 26%, transparent),
      color-mix(in srgb, var(--bg-base, #050810) 76%, transparent));
`;

export const ProofHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.45rem;
  flex-wrap: wrap;
`;

export const ProofLabel = styled.span`
  color: var(--text-secondary, rgba(255, 255, 255, 0.72));
  font-size: 0.85rem;
`;

export const ProofValue = styled.span`
  color: var(--text-primary, #ffffff);
  font-size: 0.85rem;
  font-weight: 700;
  text-align: right;
`;

export const ProofSubtext = styled.div`
  color: var(--text-tertiary, rgba(255, 255, 255, 0.62));
  font-size: 0.75rem;
  line-height: 1.4;
  text-align: left;
`;
