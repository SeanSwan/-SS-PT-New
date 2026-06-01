import styled, { css } from 'styled-components';

interface StatusProps {
  status: string;
}

const statusTone = ({ status }: StatusProps) => {
  switch (status) {
    case 'completed':
      return css`
        background: color-mix(in srgb, var(--success, #10b981) 18%, transparent);
        color: var(--success, #10b981);
        border-color: color-mix(in srgb, var(--success, #10b981) 42%, transparent);
      `;
    case 'scheduled':
    case 'planned':
      return css`
        background: color-mix(in srgb, var(--accent-cyan, #60c0f0) 16%, transparent);
        color: var(--accent-cyan, #60c0f0);
        border-color: color-mix(in srgb, var(--accent-cyan, #60c0f0) 38%, transparent);
      `;
    case 'in_progress':
      return css`
        background: color-mix(in srgb, var(--warning, #c6a84b) 18%, transparent);
        color: var(--warning, #c6a84b);
        border-color: color-mix(in srgb, var(--warning, #c6a84b) 42%, transparent);
      `;
    case 'cancelled':
    case 'skipped':
      return css`
        background: color-mix(in srgb, var(--danger, #c92a54) 16%, transparent);
        color: var(--danger, #c92a54);
        border-color: color-mix(in srgb, var(--danger, #c92a54) 40%, transparent);
      `;
    default:
      return css`
        background: color-mix(in srgb, var(--text-muted, #8b9bb4) 16%, transparent);
        color: var(--text-secondary, rgba(224, 236, 244, 0.72));
        border-color: color-mix(in srgb, var(--text-muted, #8b9bb4) 34%, transparent);
      `;
  }
};

export const PlannerContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

export const LoadingMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  font-size: 18px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
`;

export const ErrorMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  font-size: 18px;
  color: var(--danger, #c92a54);
`;

export const ViewContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

export const ViewHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 20px;

  h2 {
    font-size: 20px;
    margin: 0;
    color: var(--text-primary, #e0ecf4);
  }

  @media (max-width: 640px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

export const CreateButton = styled.button`
  min-height: 44px;
  padding: 10px 16px;
  background: var(--brand-primary, #002060);
  color: var(--text-primary, #e0ecf4);
  border: 1px solid color-mix(in srgb, var(--accent-cyan, #60c0f0) 32%, transparent);
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  box-shadow: 0 0 18px color-mix(in srgb, var(--accent-purple, #8b5cf6) 26%, transparent);
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: var(--accent-cyan, #60c0f0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-cyan, #60c0f0);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

export const EmptyState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  text-align: center;
`;

export const SessionsList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
  gap: 20px;
`;

export const SessionCard = styled.div`
  display: flex;
  flex-direction: column;
  background: color-mix(in srgb, var(--card-bg, #141419) 88%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-cyan, #60c0f0) 16%, transparent);
  border-radius: 8px;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.22);
  overflow: hidden;
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;

  &:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--accent-cyan, #60c0f0) 36%, transparent);
    box-shadow: 0 24px 54px rgba(0, 0, 0, 0.28);
  }
`;

export const SessionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 12px 16px;
  background: color-mix(in srgb, var(--surface-elevated, #1a1a24) 92%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--accent-cyan, #60c0f0) 14%, transparent);
`;

export const SessionDate = styled.span`
  font-weight: 600;
  color: var(--text-primary, #e0ecf4);
`;

export const SessionStatus = styled.span<StatusProps>`
  padding: 4px 8px;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  ${statusTone}
`;

export const SessionTitle = styled.h3`
  padding: 16px 16px 8px;
  margin: 0;
  font-size: 16px;
  color: var(--text-primary, #e0ecf4);
`;

export const SessionInfo = styled.div`
  padding: 0 16px 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

export const InfoItem = styled.div`
  font-size: 14px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
`;

export const SessionActions = styled.div`
  display: flex;
  padding: 12px 16px;
  border-top: 1px solid color-mix(in srgb, var(--accent-cyan, #60c0f0) 14%, transparent);
  gap: 8px;
`;

const actionButton = css`
  flex: 1;
  min-height: 44px;
  padding: 8px;
  color: var(--text-primary, #e0ecf4);
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: transform 180ms ease, border-color 180ms ease;

  &:hover {
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-cyan, #60c0f0);
    outline-offset: 2px;
  }
`;

export const ViewButton = styled.button`
  ${actionButton}
  background: color-mix(in srgb, var(--accent-cyan, #60c0f0) 16%, var(--surface-elevated, #1a1a24));
  border-color: color-mix(in srgb, var(--accent-cyan, #60c0f0) 28%, transparent);
`;

export const EditButton = styled.button`
  ${actionButton}
  background: color-mix(in srgb, var(--accent-purple, #8b5cf6) 16%, var(--surface-elevated, #1a1a24));
  border-color: color-mix(in srgb, var(--accent-purple, #8b5cf6) 32%, transparent);
`;

export const EditContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

export const EditHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 20px;

  h2 {
    font-size: 20px;
    margin: 0;
    color: var(--text-primary, #e0ecf4);
  }
`;

export const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
`;

export const SaveButton = styled.button`
  ${actionButton}
  background: var(--success, #10b981);
`;

export const CancelButton = styled.button`
  ${actionButton}
  background: var(--danger, #c92a54);
`;

export const EditContent = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

export const FormColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

export const SelectorColumn = styled.div`
  display: flex;
  flex-direction: column;
`;
