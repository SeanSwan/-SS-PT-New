import React from 'react';
import styled from 'styled-components';
import { BarChart3 } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ComponentType<{ size?: number; color?: string }>;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Data Available',
  message = 'Check back later for metrics and analytics',
  icon: Icon = BarChart3
}) => {
  return (
    <Container>
      <IconWrapper>
        <Icon size={64} color="rgba(255, 255, 255, 0.3)" />
      </IconWrapper>
      <Title>{title}</Title>
      <Message>{message}</Message>
    </Container>
  );
};

export default EmptyState;

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  width: 100%;
  padding: 24px;
  text-align: center;
`;

const IconWrapper = styled.div`
  margin-bottom: 16px;
  opacity: 0.5;
`;

const Title = styled.h3`
  color: rgba(255, 255, 255, 0.9);
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
`;

const Message = styled.p`
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  line-height: 1.5;
  max-width: 400px;
  margin: 0;
`;
