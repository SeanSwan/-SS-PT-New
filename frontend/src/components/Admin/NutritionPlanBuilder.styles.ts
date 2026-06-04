import styled from 'styled-components';
import { Card, FlexBox } from '../UniversalMasterSchedule/ui';

export const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

export const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
`;

export const Subheading = styled.h4`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

export const MealCard = styled(Card)`
  padding: 1rem;
  margin-bottom: 1rem;
`;

export const MealHeader = styled(FlexBox)`
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  gap: 0.75rem;
`;

export const ActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 1rem;
`;

export const SuccessText = styled.span`
  display: block;
  font-size: 0.875rem;
  color: var(--feedback-success, #10b981);
`;
