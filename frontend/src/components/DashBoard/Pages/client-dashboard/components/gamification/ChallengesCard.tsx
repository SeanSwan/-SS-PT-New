import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { Trophy, Calendar } from 'lucide-react';

import {
  StyledCard,
  CardHeader,
  CardTitle,
  CardContent,
  ChallengeCard,
  StyledLinearProgress,
  itemVariants
} from '../styled-components';

import { Challenge } from '../../types';

const Subtitle = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 16px;
`;

const ChallengeTitle = styled.h6`
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
  margin: 0 0 8px;
`;

const ChallengeDescription = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 16px;
`;

const ProgressRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 4px;
`;

const ProgressPercent = styled.span`
  font-size: 0.875rem;
  color: #00c6ff;
`;

const DateLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
`;

const ProgressFooter = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
`;

const ProgressCaption = styled.span`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
`;

const ViewAllButton = styled.button`
  width: 100%;
  padding: 10px 16px;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid rgba(120, 81, 169, 0.4);
  background: rgba(120, 81, 169, 0.05);
  color: white;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(120, 81, 169, 0.15);
    border-color: rgba(120, 81, 169, 0.6);
  }
`;

interface ChallengesCardProps {
  challenges: Challenge[];
  onViewAllChallenges?: () => void;
}

/**
 * Component displaying active fitness challenges
 */
const ChallengesCard: React.FC<ChallengesCardProps> = ({
  challenges,
  onViewAllChallenges
}) => {
  // Format date for display
  const formatDate = (dateString: string): string => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  return (
    <StyledCard as={motion.div} variants={itemVariants}>
      <CardHeader>
        <CardTitle>
          <Trophy size={22} />
          Active Challenges
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Subtitle>
          Complete challenges to earn points and special achievements
        </Subtitle>

        {challenges.slice(0, 2).map((challenge) => (
          <ChallengeCard key={challenge.id} active={challenge.active} style={{ marginBottom: 16 }}>
            <ChallengeTitle>
              {challenge.title}
            </ChallengeTitle>
            <ChallengeDescription>
              {challenge.description}
            </ChallengeDescription>

            <ProgressRow>
              <ProgressPercent>
                {Math.round((challenge.progress / challenge.goal) * 100)}% Complete
              </ProgressPercent>
              <DateLabel>
                <Calendar size={14} />
                Ends: {formatDate(challenge.endDate)}
              </DateLabel>
            </ProgressRow>

            <div style={{ width: '100%', marginBottom: 8 }}>
              <StyledLinearProgress
                value={(challenge.progress / challenge.goal) * 100}
                $color="primary"
              />
              <ProgressFooter>
                <ProgressCaption>
                  {challenge.progress} of {challenge.goal}
                </ProgressCaption>
                <ProgressCaption>
                  Reward: {challenge.reward}
                </ProgressCaption>
              </ProgressFooter>
            </div>
          </ChallengeCard>
        ))}

        {challenges.length > 2 && (
          <div style={{ marginTop: 16 }}>
            <ViewAllButton onClick={onViewAllChallenges}>
              View All Challenges ({challenges.length})
            </ViewAllButton>
          </div>
        )}
      </CardContent>
    </StyledCard>
  );
};

export default ChallengesCard;
