import styled from 'styled-components';

export const CommandPanel = styled.section`
  display: grid;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 1rem;
  border-radius: 16px;
  background: var(
    --schedule-command-panel-bg,
    linear-gradient(135deg, rgba(0, 32, 96, 0.68), rgba(26, 26, 36, 0.78))
  );
  border: 1px solid var(--schedule-command-panel-border, rgba(96, 192, 240, 0.22));
  box-shadow:
    0 1px 0 var(--schedule-command-panel-inset, rgba(96, 192, 240, 0.08)) inset,
    0 20px 46px var(--schedule-command-panel-shadow, rgba(0, 16, 40, 0.36));
`;

export const CommandHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

export const TitleGroup = styled.div`
  display: grid;
  gap: 0.25rem;
`;

export const PanelTitle = styled.h3`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-size: 1rem;
  line-height: 1.25;
`;

export const PanelKicker = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.68));
  font-size: 0.78rem;
`;

export const OutcomePill = styled.span<{ $risk: 'low' | 'medium' | 'high' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 32px;
  width: fit-content;
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.78rem;
  font-weight: 800;
  border: 1px solid ${({ $risk }) => {
    if ($risk === 'high') return 'var(--schedule-command-risk-high-border, rgba(198, 168, 75, 0.5))';
    if ($risk === 'medium') return 'var(--schedule-command-risk-medium-border, rgba(96, 192, 240, 0.45))';
    return 'var(--schedule-command-risk-low-border, rgba(64, 112, 192, 0.45))';
  }};
  background: ${({ $risk }) => {
    if ($risk === 'high') return 'var(--schedule-command-risk-high-bg, rgba(198, 168, 75, 0.16))';
    if ($risk === 'medium') return 'var(--schedule-command-risk-medium-bg, rgba(96, 192, 240, 0.14))';
    return 'var(--schedule-command-risk-low-bg, rgba(64, 112, 192, 0.14))';
  }};
`;

export const CommandGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: 0.75rem;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

export const CommandCard = styled.div`
  display: grid;
  gap: 0.45rem;
  min-width: 0;
  padding: 0.8rem;
  border-radius: 12px;
  background: var(--schedule-command-card-bg, rgba(10, 10, 15, 0.34));
  border: 1px solid var(--schedule-command-card-border, rgba(96, 192, 240, 0.14));
`;

export const CardLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.68));
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

export const CardValue = styled.span`
  color: var(--text-primary, #E0ECF4);
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.35;
`;

export const AttentionList = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin: 0;
  padding: 0;
  list-style: none;
`;

export const AttentionChip = styled.li`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 32px;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  background: var(--schedule-command-attention-bg, rgba(198, 168, 75, 0.12));
  border: 1px solid var(--schedule-command-attention-border, rgba(198, 168, 75, 0.28));
  color: var(--text-primary, #E0ECF4);
  font-size: 0.78rem;
  font-weight: 700;
`;

export const ProposalStrip = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.8rem;
  border-radius: 12px;
  background: var(--schedule-command-proposal-bg, rgba(139, 92, 246, 0.1));
  border: 1px solid var(--schedule-command-proposal-border, rgba(139, 92, 246, 0.28));

  @media (max-width: 640px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

export const ProposalText = styled.span`
  color: var(--text-primary, #E0ECF4);
  font-size: 0.86rem;
  font-weight: 700;
`;

export const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 44px;
  min-width: 44px;
  padding: 0.55rem 0.9rem;
  border-radius: 10px;
  border: 1px solid var(--schedule-command-action-border, rgba(139, 92, 246, 0.55));
  color: var(--text-primary, #E0ECF4);
  background: var(--schedule-command-action-bg, #002060);
  box-shadow: 0 0 22px var(--schedule-command-action-glow, rgba(139, 92, 246, 0.22));
  cursor: pointer;
  font-weight: 800;

  &:hover:not(:disabled) {
    border-color: var(--schedule-command-action-border-hover, rgba(96, 192, 240, 0.72));
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 3px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.58;
  }
`;
