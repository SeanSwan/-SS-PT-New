import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { Gift, Award, Unlock, Lock, Check } from 'lucide-react';

import {
  StyledCard,
  CardHeader,
  CardTitle,
  CardContent,
  RewardsContainer,
  RewardCard,
  itemVariants
} from '../styled-components';

import { Reward } from '../../types';

const PointsBadge = styled.div`
  background: rgba(0, 255, 255, 0.1);
  padding: 4px 12px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  color: white;
`;

const Subtitle = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 16px;
`;

const RewardFooter = styled.div`
  margin-top: auto;
  padding-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
`;

const PointsChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.7rem;
  background: rgba(0, 0, 0, 0.2);
  color: rgba(255, 255, 255, 0.8);
`;

const ClaimedChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.7rem;
  background: rgba(76, 175, 80, 0.15);
  color: #4caf50;
`;

const ClaimButton = styled.button<{ $canClaim: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  min-height: 32px;
  border-radius: 6px;
  border: 1px solid ${props => props.$canClaim ? 'rgba(0, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)'};
  background: transparent;
  color: ${props => props.$canClaim ? 'white' : 'rgba(255, 255, 255, 0.4)'};
  font-size: 0.7rem;
  cursor: ${props => props.$canClaim ? 'pointer' : 'default'};
  opacity: ${props => props.$canClaim ? 1 : 0.5};
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${props => props.$canClaim ? 'rgba(0, 255, 255, 0.1)' : 'transparent'};
  }

  &:disabled {
    cursor: default;
  }
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

interface RewardsCardProps {
  rewards: Reward[];
  points: number;
  onClaimReward: (rewardId: string) => void;
  onViewAllRewards?: () => void;
}

/**
 * Component displaying available rewards that can be claimed with points
 */
const RewardsCard: React.FC<RewardsCardProps> = ({
  rewards,
  points,
  onClaimReward,
  onViewAllRewards
}) => {
  return (
    <StyledCard component={motion.div} variants={itemVariants}>
      <CardHeader>
        <CardTitle>
          <Gift size={22} />
          Rewards Shop
        </CardTitle>
        <PointsBadge>
          <Award size={16} /> {points} Points
        </PointsBadge>
      </CardHeader>
      <CardContent>
        <Subtitle>
          Use your earned points to unlock exclusive rewards and perks
        </Subtitle>

        <RewardsContainer>
          {rewards.slice(0, 4).map((reward) => (
            <RewardCard key={reward.id} unlocked={reward.unlocked}>
              <div className="icon">{reward.icon}</div>
              <div className="title">{reward.title}</div>
              <div className="description">{reward.description}</div>

              <RewardFooter>
                <PointsChip>
                  <Award size={14} />
                  {reward.requiredPoints}
                </PointsChip>

                {reward.unlocked ? (
                  <ClaimedChip>
                    <Check size={14} />
                    Claimed
                  </ClaimedChip>
                ) : (
                  <ClaimButton
                    $canClaim={points >= reward.requiredPoints}
                    disabled={points < reward.requiredPoints}
                    onClick={() => onClaimReward(reward.id)}
                  >
                    {points >= reward.requiredPoints ? <Unlock size={14} /> : <Lock size={14} />}
                    Claim
                  </ClaimButton>
                )}
              </RewardFooter>
            </RewardCard>
          ))}
        </RewardsContainer>

        {rewards.length > 4 && (
          <div style={{ marginTop: 16 }}>
            <ViewAllButton onClick={onViewAllRewards}>
              View All Rewards
            </ViewAllButton>
          </div>
        )}
      </CardContent>
    </StyledCard>
  );
};

export default RewardsCard;
