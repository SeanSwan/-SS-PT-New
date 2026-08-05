import styled from 'styled-components';
import { swanDataCardShell, swanMetricTile } from './clientCardSystem';

const alpha = (token: string, fallback: string, amount: number) =>
  `color-mix(in srgb, var(${token}, ${fallback}) ${amount}%, transparent)`;

export const RosterTriageShell = styled.section`
  --swan-card-padding: 14px;
  ${swanDataCardShell}
  margin: 0 20px 12px;
  flex-shrink: 0;

  @media (max-width: 768px) {
    margin: 0 12px 10px;
  }
`;

export const RosterTriageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
`;

export const RosterTriageTitle = styled.h3`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 800;
`;

export const RosterTriageMeta = styled.span`
  color: var(--text-muted, ${alpha('--swan-frost-white', '#E0ECF4', 72)});
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 700;
`;

export const RosterTriageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 9px;

  @media (max-width: 1180px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

export const RosterTriageCard = styled.article<{ $attention?: boolean }>`
  ${swanMetricTile}
  min-width: 0;
  display: grid;
  gap: 7px;
  padding: 10px;
  border-color: ${({ $attention }) => (
    $attention
      ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 28%, transparent)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent)'
  )};
`;

export const RosterClientName = styled.h4`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 900;
  overflow-wrap: anywhere;
`;

export const RosterTriageStats = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

export const RosterTriageStat = styled.span`
  color: var(--text-muted, ${alpha('--swan-frost-white', '#E0ECF4', 75)});
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  font-weight: 800;
`;

export const RosterTriageFlags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
`;

/** Phase 4A: 44px expand affordance replacing the silent 4-row truncation. */
export const RosterShowAllButton = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 10px;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
  background: color-mix(in srgb, var(--surface-elevated, #003080) 82%, transparent);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 900;
  transition: border-color 160ms ease, box-shadow 160ms ease;

  &:hover,
  &:focus-visible {
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 50%, transparent);
    box-shadow: 0 0 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (max-width: 520px) {
    width: 100%;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const RosterTriageFlag = styled.span<{ $attention?: boolean }>`
  min-height: 26px;
  display: inline-flex;
  align-items: center;
  padding: 4px 7px;
  border-radius: 7px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 10px;
  font-weight: 800;
  background: ${({ $attention }) => (
    $attention
      ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 14%, transparent)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent)'
  )};
`;
