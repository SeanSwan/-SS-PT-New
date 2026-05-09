/**
 * Shared layout and card primitives for gamification surfaces.
 * Extracted from styled-gamification-system.ts without runtime behavior changes.
 */

import styled from 'styled-components';

export const PageContainer = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;

  @media (min-width: 2560px) {
    padding: 40px;
    max-width: 2200px;
  }

  @media (min-width: 3840px) {
    padding: 56px;
    max-width: 3000px;
  }
`;

export const ContentContainer = styled.div`
  margin-top: 24px;
`;

// Cards

export const StyledCard = styled.div`
  background-color: ${({ theme }) => theme?.palette?.background?.paper || '#1e1e2f'};
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    transform: translateY(-2px);
  }
`;

export const CardHeader = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme?.palette?.divider || 'rgba(255, 255, 255, 0.1)'};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const CardTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme?.palette?.text?.primary || '#ffffff'};
`;

export const CardContent = styled.div`
  padding: 20px;
`;
