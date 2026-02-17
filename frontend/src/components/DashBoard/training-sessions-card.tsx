import React from 'react';
import { Calendar, Users, TrendingUp, Clock, Activity } from 'lucide-react';
import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

// Custom styled components
const StyledCard = styled.div`
  border-radius: 12px;
  overflow: hidden;
  height: 100%;
  transition: all 0.3s ease;
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.08);
  background: rgba(30, 30, 60, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
  }
`;

const CardContent = styled.div`
  padding: 24px;
`;

const IconWrapper = styled.div<{ $bgColor?: string }>`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  margin-right: 16px;
  background-color: ${props => props.$bgColor || 'rgba(25, 118, 210, 0.15)'};
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 0;
`;

const StatLabel = styled.p`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.875rem;
  margin: 0;
`;

const StatDivider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin: 0;
`;

const SkeletonBlock = styled.div<{ $width?: string; $height?: string; $mt?: string; $borderRadius?: string }>`
  background: linear-gradient(90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 2s infinite linear;
  width: ${props => props.$width || '100%'};
  height: ${props => props.$height || '20px'};
  margin-top: ${props => props.$mt || '0'};
  border-radius: ${props => props.$borderRadius || '4px'};
`;

const GrowthBadge = styled.span`
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 4px;
  background-color: rgba(46, 125, 50, 0.15);
  color: #4caf50;
  font-weight: 500;
  font-size: 0.875rem;
`;

interface TrainingSessionsCardProps {
  isLoading?: boolean;
}

/**
 * Training Sessions Card Component
 *
 * Displays key metrics about training sessions for trainers and admin users.
 * Shows total sessions, active clients, completion rate, and average session duration.
 */
const TrainingSessionsCard: React.FC<TrainingSessionsCardProps> = ({ isLoading = false }) => {
  // Sample data - in a real application, this would come from an API
  const sessionData = {
    totalSessions: 248,
    activeClients: 28,
    completionRate: 92,
    avgDuration: 55,
    sessionsGrowth: 12
  };

  return (
    <StyledCard>
      <CardContent>
        {isLoading ? (
          <div>
            <SkeletonBlock $width="80%" $height="40px" />
            <SkeletonBlock $width="60%" $height="25px" $mt="8px" />
            <SkeletonBlock $height="130px" $mt="24px" $borderRadius="4px" />
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <h5 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0, color: 'white' }}>
                Training Sessions
              </h5>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
                <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Last 30 days
                </span>
                <GrowthBadge>
                  +{sessionData.sessionsGrowth}%
                </GrowthBadge>
              </div>
            </div>

            <div>
              <StatItem>
                <IconWrapper $bgColor="rgba(25, 118, 210, 0.15)">
                  <Calendar size={24} color="#1976d2" />
                </IconWrapper>
                <div>
                  <h6 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'white' }}>
                    {sessionData.totalSessions}
                  </h6>
                  <StatLabel>Total Sessions</StatLabel>
                </div>
              </StatItem>

              <StatDivider />

              <StatItem>
                <IconWrapper $bgColor="rgba(46, 125, 50, 0.15)">
                  <Users size={24} color="#2e7d32" />
                </IconWrapper>
                <div>
                  <h6 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'white' }}>
                    {sessionData.activeClients}
                  </h6>
                  <StatLabel>Active Clients</StatLabel>
                </div>
              </StatItem>

              <StatDivider />

              <StatItem>
                <IconWrapper $bgColor="rgba(237, 108, 2, 0.15)">
                  <Activity size={24} color="#ed6c02" />
                </IconWrapper>
                <div>
                  <h6 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'white' }}>
                    {sessionData.completionRate}%
                  </h6>
                  <StatLabel>Completion Rate</StatLabel>
                </div>
              </StatItem>

              <StatDivider />

              <StatItem>
                <IconWrapper $bgColor="rgba(2, 136, 209, 0.15)">
                  <Clock size={24} color="#0288d1" />
                </IconWrapper>
                <div>
                  <h6 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'white' }}>
                    {sessionData.avgDuration} min
                  </h6>
                  <StatLabel>Avg. Session Duration</StatLabel>
                </div>
              </StatItem>
            </div>
          </>
        )}
      </CardContent>
    </StyledCard>
  );
};

export default TrainingSessionsCard;
