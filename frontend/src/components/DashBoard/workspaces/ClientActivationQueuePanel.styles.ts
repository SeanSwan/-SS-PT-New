/**
 * ClientActivationQueuePanel.styles.ts
 * ====================================
 * Dark-first styled-components for the paid-client activation queue.
 * Uses SwanStudios theme tokens and preserves 44px touch targets for mobile
 * trainer/admin use.
 */
import styled from 'styled-components';

export const PanelShell = styled.section`
  margin: 0 20px 12px;
  padding: 14px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 92%, transparent);

  @media (max-width: 768px) {
    margin: 0 12px 10px;
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
`;

export const PanelTitle = styled.h3`
  margin: 0;
  font: 700 15px 'Plus Jakarta Sans', sans-serif;
  color: var(--text-heading, #E0ECF4);
`;

export const PanelMeta = styled.div`
  font: 500 12px 'Fira Code', monospace;
  color: var(--text-muted, rgba(224, 236, 244, 0.78));
`;

export const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  min-width: 44px;
  height: 44px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 8px;
  background: var(--bg-elevated, #141419);
  color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

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
`;

export const SummaryPill = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font: 600 12px 'Sora', sans-serif;
`;

export const QueueList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 10px;
  margin-top: 12px;
`;

export const QueueCard = styled.article`
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 8px;
  background: var(--bg-elevated, #141419);
`;

export const ClientName = styled.div`
  font: 700 14px 'Sora', sans-serif;
  color: var(--text-heading, #E0ECF4);
`;

export const QueueMeta = styled.div`
  font: 500 12px 'Fira Code', monospace;
  color: var(--text-muted, rgba(224, 236, 244, 0.78));
`;

export const ActionRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

export const ActionButton = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid ${({ $primary }) =>
    $primary ? 'var(--accent-primary, #60C0F0)' : 'var(--border-soft, rgba(96, 192, 240, 0.12))'};
  background: ${({ $primary }) =>
    $primary ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent)' : 'transparent'};
  color: ${({ $primary }) =>
    $primary ? 'var(--accent-primary, #60C0F0)' : 'var(--text-primary, #E0ECF4)'};
  font: 700 12px 'Sora', sans-serif;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

export const StateText = styled.div`
  margin-top: 10px;
  color: var(--text-muted, rgba(224, 236, 244, 0.78));
  font: 500 13px 'Sora', sans-serif;
`;
