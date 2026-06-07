import styled from 'styled-components';
import { ExplainCard } from './copilot-shared-styles';

export const ReviewSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const ReviewGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
`;

export const ReviewCard = styled(ExplainCard)<{ $fullWidth?: boolean }>`
  grid-column: ${({ $fullWidth }) => ($fullWidth ? '1 / -1' : 'auto')};
`;

export const ReviewList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding-left: 18px;
`;

export const AcknowledgementLabel = styled.label`
  display: grid;
  grid-template-columns: 24px 1fr;
  gap: 10px;
  align-items: center;
  min-height: 44px;
  color: var(--text-primary, #e2e8f0);
  font-size: 0.9rem;
  line-height: 1.4;
  cursor: pointer;

  input {
    width: 20px;
    height: 20px;
    accent-color: var(--accent-primary, #60c0f0);
  }
`;
