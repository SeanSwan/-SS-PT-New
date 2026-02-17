/**
 * TrainerSessions.tsx
 * Component for trainers to view and manage their training sessions
 */
import React from 'react';
import styled from 'styled-components';

const CardContainer = styled.div`
  border-radius: 12px;
  background: rgba(29, 31, 43, 0.8);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
`;

const CardBody = styled.div`
  padding: 24px;
`;

const Title = styled.h4`
  font-size: 2rem;
  font-weight: 600;
  color: white;
  margin: 0 0 16px;
`;

const InfoBanner = styled.div`
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(14, 165, 233, 0.1);
  border: 1px solid rgba(14, 165, 233, 0.3);
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.875rem;
  line-height: 1.6;
`;

const TrainerSessions: React.FC = () => {
  return (
    <div>
      <CardContainer>
        <CardBody>
          <Title>Training Sessions</Title>
          <InfoBanner>
            This section will allow trainers to view their schedule, manage sessions, and track session attendance.
            Features will include calendar integration, session notes, and client progress tracking.
          </InfoBanner>
        </CardBody>
      </CardContainer>
    </div>
  );
};

export default TrainerSessions;
