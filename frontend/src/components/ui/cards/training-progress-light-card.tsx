import React, { ReactNode } from 'react';
import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

const CardContainer = styled.div`
  border-radius: 12px;
  height: 100%;
  background: rgba(30, 30, 60, 0.4);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.12);
  }
`;

const CardContent = styled.div`
  padding: 16px;
  height: 100%;
`;

const SkeletonBlock = styled.div<{ $width?: string; $height?: string; $variant?: 'circular' | 'text' | 'rectangular' }>`
  background: linear-gradient(90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 2s infinite linear;
  width: ${props => props.$width || '100%'};
  height: ${props => props.$height || '20px'};
  border-radius: ${props => props.$variant === 'circular' ? '50%' : '4px'};
`;

const ContentWrapper = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const LabelRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  font-size: 1rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
`;

const IconWrapper = styled.span`
  margin-right: 8px;
  display: flex;
  align-items: center;
`;

const MetricsRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ProgressRingContainer = styled.div`
  position: relative;
  display: inline-flex;
`;

const ProgressRingSvg = styled.svg`
  transform: rotate(-90deg);
`;

const ProgressRingLabel = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: bold;
  color: white;
`;

const TotalSection = styled.div`
  margin-left: 16px;
`;

const TotalValue = styled.span`
  font-size: 2.5rem;
  font-weight: bold;
  color: white;
  display: block;
`;

const TotalLabel = styled.span`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  margin-top: -4px;
  display: block;
`;

interface TrainingProgressLightCardProps {
  isLoading?: boolean;
  total: number;
  label: string;
  icon?: ReactNode;
}

const TrainingProgressLightCard: React.FC<TrainingProgressLightCardProps> = ({
  isLoading = false,
  total,
  label,
  icon
}) => {
  const progress = Math.min(85, Math.max(65, Math.floor(Math.random() * 20) + 65));
  const size = 80;
  const thickness = 5;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress / 100);

  return (
    <CardContainer>
      <CardContent>
        {isLoading ? (
          <div>
            <SkeletonBlock $width="60%" $height="25px" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <SkeletonBlock $width="80px" $height="80px" $variant="circular" />
              <SkeletonBlock $width="40%" $height="60px" />
            </div>
          </div>
        ) : (
          <ContentWrapper>
            <LabelRow>
              {icon && <IconWrapper>{icon}</IconWrapper>}
              {label}
            </LabelRow>

            <MetricsRow>
              <ProgressRingContainer>
                <ProgressRingSvg width={size} height={size}>
                  {/* Background circle */}
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth={thickness}
                  />
                  {/* Progress circle */}
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#4caf50"
                    strokeWidth={thickness}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                  />
                </ProgressRingSvg>
                <ProgressRingLabel>{progress}%</ProgressRingLabel>
              </ProgressRingContainer>

              <TotalSection>
                <TotalValue>{total}</TotalValue>
                <TotalLabel>total</TotalLabel>
              </TotalSection>
            </MetricsRow>
          </ContentWrapper>
        )}
      </CardContent>
    </CardContainer>
  );
};

export default TrainingProgressLightCard;
