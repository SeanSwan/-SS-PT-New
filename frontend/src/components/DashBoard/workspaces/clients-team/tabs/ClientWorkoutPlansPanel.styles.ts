/**
 * ============================================================================
 * FILE: ClientWorkoutPlansPanel.styles.ts
 * PURPOSE: Styled-components for the Client Hub saved workout-plan panel.
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Keeps the plan library visual system extracted from runtime data loading so
 * the component stays below the SwanStudios line-cap rule.
 */

import styled from 'styled-components';
import { swanClientActionButton, swanDataCardShell, swanMetricTile, swanPill } from '../clientCardSystem';

export const Panel = styled.section`
  --swan-card-padding: 18px;
  --swan-card-radius: 12px;
  ${swanDataCardShell}
  display: grid;
  gap: 14px;
`;

export const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

export const TitleBlock = styled.div`
  display: grid;
  gap: 4px;
`;

export const Eyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const Title = styled.h3`
  margin: 0;
  color: var(--text-heading, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 20px;
  line-height: 1.2;
`;

export const Hint = styled.p`
  margin: 0;
  color: var(--text-muted, rgba(224, 236, 244, 0.74));
  font-family: 'Sora', sans-serif;
  font-size: 13px;
`;

export const RefreshButton = styled.button`
  ${swanClientActionButton}
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 800;
`;

export const PlanGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: 12px;
`;

export const PlanCard = styled.article`
  --swan-card-padding: 14px;
  --swan-card-radius: 12px;
  ${swanDataCardShell}
  display: grid;
  gap: 10px;
  min-height: 132px;
  min-width: 0;
`;

export const PlanTitle = styled.h4`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
`;

export const StatusBadge = styled.span<{ $active: boolean }>`
  ${swanPill}
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 4px 9px;
  border-radius: 8px;
  color: ${({ $active }) => ($active ? 'var(--accent-gold, #C6A84B)' : 'var(--text-muted, rgba(224,236,244,0.72))')};
  background: ${({ $active }) =>
    $active
      ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 14%, transparent)'
      : 'color-mix(in srgb, var(--bg-base, #0A0A0F) 78%, var(--accent-primary, #60C0F0) 6%)'};
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
`;

export const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font-family: 'Sora', sans-serif;
  font-size: 12px;
`;

export const PlanActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const VaultSection = styled.div`
  ${swanMetricTile}
  display: grid;
  gap: 10px;
  padding: 12px;
`;

export const VaultHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  @media (max-width: 640px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

export const VaultTitle = styled.h4`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  line-height: 1.2;
`;

export const VaultMeta = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
`;

export const VaultGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 168px), 1fr));
  gap: 8px;
`;

export const VaultSlot = styled.article<{ $filled: boolean; $primary: boolean }>`
  ${swanMetricTile}
  display: grid;
  gap: 7px;
  min-height: 126px;
  min-width: 0;
  padding: 11px;
  border: 1px solid ${({ $primary, $filled }) =>
    $primary
      ? 'var(--accent-gold, #C6A84B)'
      : $filled
        ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent)'
        : 'var(--border-soft, rgba(224, 236, 244, 0.08))'};
  background: ${({ $primary, $filled }) =>
    $primary
      ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 10%, var(--bg-surface, #141419))'
      : $filled
        ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, var(--bg-surface, #141419))'
        : 'var(--bg-surface, #141419)'};
`;

export const VaultSlotTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
`;

export const VaultSlotLabel = styled.strong`
  min-width: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  overflow-wrap: anywhere;
`;

export const VaultSlotStatus = styled.span<{ $primary?: boolean }>`
  ${swanPill}
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  padding: 3px 7px;
  border-radius: 999px;
  color: ${({ $primary }) => ($primary ? 'var(--accent-gold, #C6A84B)' : 'var(--text-muted, rgba(224,236,244,0.72))')};
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, var(--accent-primary, #60C0F0) 6%);
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
`;

export const VaultSlotPlanName = styled.span`
  min-width: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  line-height: 1.3;
  overflow-wrap: anywhere;
`;

export const VaultSlotDetail = styled.span`
  min-width: 0;
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  overflow-wrap: anywhere;
`;

export const PlanActionButton = styled.button<{ $variant?: 'primary' }>`
  ${swanClientActionButton}
  --swan-action-border: ${({ $variant }) =>
    $variant === 'primary'
      ? 'var(--accent-secondary, #8B5CF6)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent)'};
  --swan-action-bg: ${({ $variant }) =>
    $variant === 'primary'
      ? 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-tertiary, #4070C0))'
      : 'transparent'};
  --swan-action-fg: ${({ $variant }) =>
    $variant === 'primary'
      ? 'var(--text-primary, #E0ECF4)'
      : 'var(--accent-primary, #60C0F0)'};
  width: fit-content;
  padding: 10px 12px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;

  &:disabled {
    cursor: wait;
    opacity: 0.72;
  }
`;

export const StateCard = styled.div`
  ${swanMetricTile}
  min-height: 112px;
  display: grid;
  place-items: center;
  padding: 18px;
  border: 1px dashed var(--border-soft, rgba(96, 192, 240, 0.16));
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font-family: 'Sora', sans-serif;
  text-align: center;
`;
