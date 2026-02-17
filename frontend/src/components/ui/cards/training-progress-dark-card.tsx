import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Award, TrendingUp } from 'lucide-react';

const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

const CardContainer = styled.div`
  border-radius: 12px;
  height: 100%;
  background: rgba(29, 31, 43, 0.8);
  color: white;
  box-shadow: 0 8px 25px rgba(120, 81, 169, 0.25);
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-5px);
  }
`;

const CardContent = styled.div`
  padding: 16px;
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

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ProgressSection = styled.div`
  margin-top: 24px;
`;

const ProgressRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
`;

const ProgressLabel = styled.span`
  font-size: 0.875rem;
  opacity: 0.8;
`;

const ProgressValue = styled.span`
  font-size: 0.875rem;
  font-weight: 500;
`;

const ProgressBarContainer = styled.div`
  height: 10px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
`;

const ProgressBarFill = styled.div<{ $value: number }>`
  height: 100%;
  width: ${props => props.$value}%;
  background: #7851a9;
  border-radius: 5px;
  transition: width 0.6s ease;
`;

const StatsRow = styled.div`
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
`;

const StatBlock = styled.div``;

const StatLabel = styled.p`
  font-size: 0.875rem;
  opacity: 0.8;
  margin: 0;
`;

const StatValueRow = styled.div`
  display: flex;
  align-items: center;
  margin-top: 4px;
  gap: 4px;
`;

const StatValue = styled.span`
  font-size: 1.25rem;
  font-weight: 600;
`;

const DecorCircle = styled.div<{ $size: number; $top?: number; $right?: number; $bottom?: number; $left?: number }>`
  position: absolute;
  width: ${props => props.$size}px;
  height: ${props => props.$size}px;
  border-radius: 50%;
  z-index: 0;
  ${props => props.$top !== undefined && `top: ${props.$top}px;`}
  ${props => props.$right !== undefined && `right: ${props.$right}px;`}
  ${props => props.$bottom !== undefined && `bottom: ${props.$bottom}px;`}
  ${props => props.$left !== undefined && `left: ${props.$left}px;`}
`;

interface TrainingProgressDarkCardProps {
  isLoading?: boolean;
}

const TrainingProgressDarkCard: React.FC<TrainingProgressDarkCardProps> = ({ isLoading = false }) => {
  const progressData = {
    achievementsCompleted: 78,
    averageImprovement: 24,
    milestonesReached: 35
  };

  return (
    <CardContainer>
      <CardContent>
        {isLoading ? (
          <div>
            <SkeletonBlock $width="80%" $height="40px" />
            <SkeletonBlock $width="60%" $height="25px" $mt="8px" />
            <SkeletonBlock $height="100px" $mt="24px" $borderRadius="4px" />
          </div>
        ) : (
          <>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <HeaderRow>
                <Award size={24} />
                <h6 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
                  Achievements
                </h6>
              </HeaderRow>

              <ProgressSection>
                <ProgressRow>
                  <ProgressLabel>Completed Goals</ProgressLabel>
                  <ProgressValue>{progressData.achievementsCompleted}%</ProgressValue>
                </ProgressRow>
                <ProgressBarContainer>
                  <ProgressBarFill $value={progressData.achievementsCompleted} />
                </ProgressBarContainer>
              </ProgressSection>

              <StatsRow>
                <StatBlock>
                  <StatLabel>Avg. Improvement</StatLabel>
                  <StatValueRow>
                    <StatValue>{progressData.averageImprovement}%</StatValue>
                    <TrendingUp size={16} />
                  </StatValueRow>
                </StatBlock>

                <StatBlock>
                  <StatLabel>Milestones</StatLabel>
                  <StatValue style={{ marginTop: 4, display: 'block' }}>
                    {progressData.milestonesReached}
                  </StatValue>
                </StatBlock>
              </StatsRow>
            </div>

            {/* Decorative elements */}
            <DecorCircle
              $size={120}
              $top={-20}
              $right={-20}
              style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)' }}
            />
            <DecorCircle
              $size={200}
              $bottom={-50}
              $left={-50}
              style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 70%)' }}
            />
          </>
        )}
      </CardContent>
    </CardContainer>
  );
};

export default TrainingProgressDarkCard;
