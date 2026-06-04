import styled from 'styled-components';

export const InsightBox = styled.div`
  background: var(--surface-muted, rgba(96, 192, 240, 0.08));
  border: 1px solid var(--border-primary, rgba(96, 192, 240, 0.18));
  border-radius: 10px;
  margin-top: 24px;
  padding: 16px;
`;

export const InsightLabel = styled.span`
  color: var(--text-secondary, #94a3b8);
  display: block;
  font-size: 0.75rem;
  margin-bottom: 2px;
`;

export const InsightValue = styled.p`
  color: var(--text-primary, #e2e8f0);
  font-size: 0.875rem;
  font-weight: 500;
  margin: 0;
`;

export const InsightGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr 1fr;
  margin-top: 12px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

export const SubTitle = styled.h4`
  color: var(--text-primary, #e2e8f0);
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0 0 12px;
`;

export const OverdueCaption = styled.span`
  color: var(--feedback-error, #FF6B6B);
  display: block;
  font-size: 0.75rem;
`;

export const ErrorText = styled.div`
  margin-top: 12px;
`;

export const AchievementProgressFrame = styled.div`
  margin-top: 8px;
  width: 100%;
`;

export const ChipOffset = styled.div`
  margin-top: 4px;
`;
