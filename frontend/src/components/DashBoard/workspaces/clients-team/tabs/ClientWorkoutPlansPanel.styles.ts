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

export const Panel = styled.section`
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 12px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.14));
  background: var(--bg-elevated, #1A1A24);
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
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.18));
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 82%, var(--accent-primary, #60C0F0) 8%);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const PlanGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
`;

export const PlanCard = styled.article`
  display: grid;
  gap: 10px;
  min-height: 132px;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.16));
  background: var(--bg-surface, #141419);
`;

export const PlanTitle = styled.h4`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
`;

export const StatusBadge = styled.span<{ $active: boolean }>`
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
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.16));
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, var(--bg-elevated, #1A1A24) 28%);
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
  grid-template-columns: repeat(auto-fit, minmax(168px, 1fr));
  gap: 8px;
`;

export const VaultSlot = styled.article<{ $filled: boolean; $primary: boolean }>`
  display: grid;
  gap: 7px;
  min-height: 126px;
  padding: 11px;
  border-radius: 10px;
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
  gap: 8px;
`;

export const VaultSlotLabel = styled.strong`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
`;

export const VaultSlotStatus = styled.span<{ $primary?: boolean }>`
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
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  line-height: 1.3;
`;

export const VaultSlotDetail = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font-family: 'Sora', sans-serif;
  font-size: 12px;
`;

export const PlanActionButton = styled.button<{ $variant?: 'primary' }>`
  min-height: 44px;
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid ${({ $variant }) =>
    $variant === 'primary'
      ? 'var(--accent-secondary, #8B5CF6)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent)'};
  background: ${({ $variant }) =>
    $variant === 'primary'
      ? 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-tertiary, #4070C0))'
      : 'transparent'};
  color: ${({ $variant }) =>
    $variant === 'primary'
      ? 'var(--text-primary, #E0ECF4)'
      : 'var(--accent-primary, #60C0F0)'};
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    cursor: wait;
    opacity: 0.72;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const StateCard = styled.div`
  min-height: 112px;
  display: grid;
  place-items: center;
  padding: 18px;
  border-radius: 12px;
  border: 1px dashed var(--border-soft, rgba(96, 192, 240, 0.16));
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font-family: 'Sora', sans-serif;
  text-align: center;
`;
