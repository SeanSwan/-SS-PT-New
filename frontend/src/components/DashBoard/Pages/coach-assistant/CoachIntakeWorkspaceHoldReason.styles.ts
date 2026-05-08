/**
 * CoachIntakeWorkspaceHoldReason.styles.ts
 * ========================================
 * Compact PII-safe hold-reason strip for active Coach intake items.
 */
import styled from 'styled-components';

export const HoldReasonPanel = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: flex-start;
  margin: 0 0 8px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 24%, transparent);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent),
      color-mix(in srgb, var(--accent-primary, #60C0F0) 7%, transparent)
    ),
    color-mix(in srgb, var(--bg-base, #030712) 54%, transparent);

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const HoldReasonCopy = styled.div`
  min-width: 0;
`;

export const HoldReasonLabel = styled.span`
  display: block;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 54%, transparent);
  font-family: 'Fira Code', monospace;
  font-size: 9px;
  line-height: 1.25;
  text-transform: uppercase;
`;

export const HoldReasonTitle = styled.strong`
  display: block;
  margin-top: 3px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  line-height: 1.35;
  letter-spacing: 0;
`;

export const HoldReasonDetail = styled.p`
  margin: 5px 0 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 68%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  line-height: 1.45;
`;

export const HoldReasonFacts = styled.div`
  display: inline-flex;
  justify-content: flex-end;
  gap: 6px;
  flex-wrap: wrap;
`;

export const HoldReasonFact = styled.span`
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  background: color-mix(in srgb, var(--bg-base, #030712) 40%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  line-height: 1;
`;
