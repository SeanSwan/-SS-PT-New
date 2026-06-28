import styled from 'styled-components';

export const CommandPanel = styled.section`
  display: grid;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 1rem;
  border-radius: 16px;
  background: var(
    --schedule-command-panel-bg,
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--bg-elevated, #1A1A24) 84%, var(--brand-primary, var(--accent-primary, #60C0F0)) 16%),
      color-mix(in srgb, var(--bg-surface, #141419) 86%, var(--accent-secondary, #8B5CF6) 10%)
    )
  );
  border: 1px solid var(
    --schedule-command-panel-border,
    color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent)
  );
  box-shadow:
    0 1px 0 var(
      --schedule-command-panel-inset,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)
    ) inset,
    0 20px 46px var(
      --schedule-command-panel-shadow,
      color-mix(in srgb, var(--brand-primary, var(--accent-primary, #60C0F0)) 24%, transparent)
    );
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
    if ($risk === 'high') return 'var(--schedule-command-risk-high-border, color-mix(in srgb, var(--warning, #C6A84B) 50%, transparent))';
    if ($risk === 'medium') return 'var(--schedule-command-risk-medium-border, color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent))';
    return 'var(--schedule-command-risk-low-border, color-mix(in srgb, var(--brand-tertiary, var(--accent-secondary, #8B5CF6)) 45%, transparent))';
  }};
  background: ${({ $risk }) => {
    if ($risk === 'high') return 'var(--schedule-command-risk-high-bg, color-mix(in srgb, var(--warning, #C6A84B) 16%, transparent))';
    if ($risk === 'medium') return 'var(--schedule-command-risk-medium-bg, color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent))';
    return 'var(--schedule-command-risk-low-bg, color-mix(in srgb, var(--brand-tertiary, var(--accent-secondary, #8B5CF6)) 14%, transparent))';
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
  background: var(
    --schedule-command-card-bg,
    color-mix(in srgb, var(--bg-base, #0A0A0F) 74%, var(--bg-elevated, #1A1A24) 26%)
  );
  border: 1px solid var(
    --schedule-command-card-border,
    color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent)
  );
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
  background: var(
    --schedule-command-attention-bg,
    color-mix(in srgb, var(--warning, #C6A84B) 12%, transparent)
  );
  border: 1px solid var(
    --schedule-command-attention-border,
    color-mix(in srgb, var(--warning, #C6A84B) 28%, transparent)
  );
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
  background: var(
    --schedule-command-proposal-bg,
    color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent)
  );
  border: 1px solid var(
    --schedule-command-proposal-border,
    color-mix(in srgb, var(--accent-secondary, #8B5CF6) 28%, transparent)
  );

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
  border: 1px solid var(
    --schedule-command-action-border,
    color-mix(in srgb, var(--accent-secondary, #8B5CF6) 55%, transparent)
  );
  color: var(--text-primary, #E0ECF4);
  background: var(
    --schedule-command-action-bg,
    linear-gradient(135deg, var(--brand-primary, var(--accent-primary, #60C0F0)), var(--brand-tertiary, var(--accent-secondary, #8B5CF6)))
  );
  box-shadow: 0 0 22px var(
    --schedule-command-action-glow,
    color-mix(in srgb, var(--accent-secondary, #8B5CF6) 22%, transparent)
  );
  cursor: pointer;
  font-weight: 800;

  &:hover:not(:disabled) {
    border-color: var(
      --schedule-command-action-border-hover,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 72%, transparent)
    );
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
