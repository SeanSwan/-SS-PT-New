/**
 * ClientActivationQueuePanel.styles.ts
 * ====================================
 * Dark-first styled-components for the paid-client activation queue.
 * Uses SwanStudios theme tokens and preserves 44px touch targets for mobile
 * trainer/admin use.
 */
import styled from 'styled-components';
import {
  swanClientActionButton,
  swanDataCardShell,
  swanPill,
} from './clients-team/clientCardSystem';

export const PanelShell = styled.section`
  --swan-card-padding: 14px;
  --swan-card-radius: 12px;
  ${swanDataCardShell}
  margin: 0 20px 12px;

  @media (max-width: 768px) {
    margin: 0 12px 10px;
  }

  @media (max-width: 520px) {
    --swan-card-padding: 10px;
    margin: 0 8px 8px;
  }
`;

export const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: space-between;
  flex-wrap: wrap;
`;

export const TitleGroup = styled.div`
  display: grid;
  gap: 2px;
  min-width: 0;
`;

export const PanelTitle = styled.h3`
  margin: 0;
  font: 700 15px 'Plus Jakarta Sans', sans-serif;
  color: var(--text-heading, #E0ECF4);
`;

export const PanelMeta = styled.div`
  font: 500 12px 'Fira Code', monospace;
  color: var(--text-muted, rgba(224, 236, 244, 0.78));

  @media (max-width: 520px) {
    display: none;
  }
`;

export const IconButton = styled.button`
  ${swanClientActionButton}
  width: 44px;
  min-width: 44px;
  height: 44px;
  padding: 0;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.58;
    transform: none;
    border-color: var(--border-soft, rgba(96, 192, 240, 0.12));
  }
`;

export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 520px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 4px;
    margin-top: 8px;
  }
`;

export const SummaryPill = styled.div`
  ${swanPill}
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 8px 10px;
  font: 600 12px 'Sora', sans-serif;

  @media (max-width: 520px) {
    justify-content: center;
    min-height: 44px;
    padding: 5px 4px;
    font-size: 10px;

    svg {
      display: none;
    }
  }
`;

export const MobileQueueToggle = styled.button`
  ${swanClientActionButton}
  display: none;
  width: 100%;
  min-height: 44px;
  margin-top: 8px;
  font: 700 12px 'Sora', sans-serif;

  @media (max-width: 520px) {
    display: inline-flex;
  }
`;

export const QueueList = styled.div<{ $mobileExpanded?: boolean }>`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
  gap: 10px;
  margin-top: 12px;

  @media (max-width: 520px) {
    display: ${({ $mobileExpanded }) => ($mobileExpanded ? 'grid' : 'none')};
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
    margin-top: 10px;
  }
`;

export const QueueCard = styled.article`
  --swan-card-padding: 12px;
  --swan-card-radius: 12px;
  ${swanDataCardShell}
  display: grid;
  gap: 10px;
  min-width: 0;
`;

export const ClientName = styled.div`
  font: 700 14px 'Sora', sans-serif;
  color: var(--text-heading, #E0ECF4);
  overflow-wrap: anywhere;
`;

export const QueueMeta = styled.div`
  font: 500 12px 'Fira Code', monospace;
  color: var(--text-muted, rgba(224, 236, 244, 0.78));
  overflow-wrap: anywhere;
`;

export const ActionRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

export const ActionButton = styled.button<{ $primary?: boolean }>`
  ${swanClientActionButton}
  --swan-action-border: ${({ $primary }) =>
    $primary ? 'var(--button-primary-bg, var(--accent-primary, #60C0F0))' : 'var(--border-soft, rgba(96, 192, 240, 0.12))'};
  --swan-action-bg: ${({ $primary }) =>
    $primary ? 'var(--button-primary-bg, var(--accent-primary, #60C0F0))' : 'transparent'};
  --swan-action-fg: ${({ $primary }) =>
    $primary ? 'var(--button-primary-text, #FFFFFF)' : 'var(--text-primary, #E0ECF4)'};
  flex: 1 1 min(100%, 148px);
  min-width: 0;
  padding: 8px 12px;
  font: 700 12px 'Sora', sans-serif;
  text-align: center;
  white-space: normal;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

export const StateText = styled.div<{ $mobileQuiet?: boolean }>`
  margin-top: 10px;
  color: var(--text-muted, rgba(224, 236, 244, 0.78));
  font: 500 13px 'Sora', sans-serif;

  @media (max-width: 520px) {
    display: ${({ $mobileQuiet }) => ($mobileQuiet ? 'none' : 'block')};
  }
`;
