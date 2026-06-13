/**
 * STYLES: ProgressProofCockpit
 * OWNER: Dashboard Progress / Client Hub
 * PURPOSE: Premium responsive shell for progress proof and chart lens controls.
 */

import styled from 'styled-components';

export const CockpitShell = styled.section<{ $tone: string }>`
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
  gap: 1rem;
  margin: 0.25rem 0 1rem;
  padding: 1rem;
  overflow: hidden;
  background:
    radial-gradient(circle at 12% 0%, color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent), transparent 28%),
    linear-gradient(135deg, var(--bg-elevated, #141419), var(--bg-surface, #1A1A24) 58%, var(--bg-base, #0A0A0F));
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent));
  border-radius: 8px;
  box-shadow:
    0 18px 42px color-mix(in srgb, var(--bg-base, #0A0A0F) 75%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent);

  &::before {
    content: '';
    position: absolute;
    inset: 0 0 auto;
    height: 2px;
    background: linear-gradient(
      90deg,
      transparent,
      ${({ $tone }) => ($tone === 'full'
        ? 'var(--success, #10B981)'
        : 'var(--accent-primary, #60C0F0)')},
      var(--accent-secondary, #8B5CF6),
      transparent
    );
    pointer-events: none;
  }

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

export const ProofIntro = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
`;

export const ProofKicker = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  width: fit-content;
  min-height: 28px;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const ProofHeadline = styled.h3`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(1.2rem, 1.65rem, 1.65rem);
  line-height: 1.12;
  letter-spacing: 0;
`;

export const ProofGuidance = styled.p`
  max-width: 68ch;
  margin: 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.76));
  font-family: 'Sora', sans-serif;
  font-size: 0.86rem;
  line-height: 1.55;
`;

export const LensPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
`;

export const LensLabel = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const LensRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

export const LensButton = styled.button<{ $active: boolean }>`
  min-height: 44px;
  padding: 0 0.85rem;
  color: ${({ $active }) => ($active
    ? 'var(--text-primary, #E0ECF4)'
    : 'var(--text-secondary, rgba(224, 236, 244, 0.72))')};
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0;
  background: ${({ $active }) => ($active
    ? 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0))'
    : 'color-mix(in srgb, var(--bg-surface, #1A1A24) 82%, transparent)')};
  border: 1px solid ${({ $active }) => ($active
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 62%, transparent)'
    : 'var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent))')};
  border-radius: 8px;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      border-color: var(--accent-primary, #60C0F0);
    }
  }
`;

export const LensDescription = styled.p`
  min-height: 1.25rem;
  margin: 0;
  color: var(--text-muted, rgba(224, 236, 244, 0.56));
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  line-height: 1.45;
`;

export const ProofMeter = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.85rem;
  min-width: 0;
`;

export const MeterTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
`;

export const PercentStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
`;

export const PercentValue = styled.span`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 2.35rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0;
`;

export const PercentLabel = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.56));
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const QualityPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 32px;
  padding: 0 0.7rem;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 36%, transparent);
  border-radius: 8px;
`;

export const ProofSegments = styled.div`
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 0.25rem;
`;

export const ProofSegment = styled.span<{ $state: 'active' | 'empty' | 'unavailable' }>`
  height: 0.55rem;
  border-radius: 8px;
  background: ${({ $state }) => {
    if ($state === 'active') {
      return 'linear-gradient(90deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6))';
    }
    if ($state === 'unavailable') {
      return 'color-mix(in srgb, var(--error, #EF4444) 58%, transparent)';
    }
    return 'color-mix(in srgb, var(--text-primary, #E0ECF4) 13%, transparent)';
  }};
`;

export const ProofStats = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;

  @media (max-width: 680px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

export const ProofStat = styled.div`
  min-width: 0;
`;

export const ProofStatValue = styled.div`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1.25;
  overflow-wrap: anywhere;
`;

export const ProofStatLabel = styled.div`
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const ActionRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.65rem;
`;

export const CopyButton = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0 0.95rem;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 800;
  background: var(--primary-button-bg, #002060);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 0 18px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 24%, transparent);

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      border-color: var(--accent-primary, #60C0F0);
    }
  }
`;

export const CopyStatus = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.6));
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  line-height: 1.35;
`;
