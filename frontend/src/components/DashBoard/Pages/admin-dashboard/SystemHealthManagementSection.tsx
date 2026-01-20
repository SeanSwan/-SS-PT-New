import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  padding: 1.5rem;
`;

const Card = styled.div`
  background: rgba(0, 255, 255, 0.06);
  border: 1px solid rgba(0, 255, 255, 0.18);
  border-radius: 16px;
  padding: 1.5rem;
`;

const Title = styled.h2`
  margin: 0 0 0.75rem 0;
  color: #ffffff;
  font-size: 1.4rem;
`;

const Description = styled.p`
  margin: 0;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.6;
`;

const SystemHealthManagementSection: React.FC = () => {
  return (
    <Container>
      <Card>
        <Title>System Health</Title>
        <Description>
          System health monitoring will be reintroduced with production metrics in
          a dedicated observability phase. This placeholder keeps the admin route
          stable while Phase 3 stabilization work continues.
        </Description>
      </Card>
    </Container>
  );
};

export default SystemHealthManagementSection;
