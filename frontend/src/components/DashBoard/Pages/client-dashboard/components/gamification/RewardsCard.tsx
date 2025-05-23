import React from 'react';
import { motion } from 'framer-motion';
import { Box, Typography, Button, Chip } from '@mui/material';
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
        <Box sx={{ bgcolor: 'rgba(0, 255, 255, 0.1)', px: 1.5, py: 0.5, borderRadius: 2 }}>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Award size={16} /> {points} Points
          </Typography>
        </Box>
      </CardHeader>
      <CardContent>
        <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" mb={2}>
          Use your earned points to unlock exclusive rewards and perks
        </Typography>
        
        <RewardsContainer>
          {rewards.slice(0, 4).map((reward) => (
            <RewardCard key={reward.id} unlocked={reward.unlocked}>
              <div className="icon">{reward.icon}</div>
              <div className="title">{reward.title}</div>
              <div className="description">{reward.description}</div>
              
              <Box sx={{ mt: 'auto', pt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <Chip 
                  icon={<Award size={14} />} 
                  label={reward.requiredPoints} 
                  size="small"
                  sx={{ bgcolor: 'rgba(0, 0, 0, 0.2)', fontSize: '0.7rem' }}
                />
                
                {reward.unlocked ? (
                  <Chip 
                    icon={<Check size={14} />} 
                    label="Claimed" 
                    size="small"
                    color="success"
                    sx={{ fontSize: '0.7rem' }}
                  />
                ) : (
                  <Button
                    variant="outlined"
                    size="small"
                    color={points >= reward.requiredPoints ? "primary" : "inherit"}
                    startIcon={points >= reward.requiredPoints ? <Unlock size={14} /> : <Lock size={14} />}
                    onClick={() => onClaimReward(reward.id)}
                    disabled={points < reward.requiredPoints}
                    sx={{ 
                      opacity: points >= reward.requiredPoints ? 1 : 0.5,
                      borderColor: points >= reward.requiredPoints ? 'primary.main' : 'rgba(255, 255, 255, 0.2)',
                      fontSize: '0.7rem',
                      py: 0.5
                    }}
                  >
                    Claim
                  </Button>
                )}
              </Box>
            </RewardCard>
          ))}
        </RewardsContainer>
        
        {rewards.length > 4 && (
          <Box mt={2}>
            <Button 
              variant="outlined" 
              color="secondary" 
              fullWidth
              onClick={onViewAllRewards}
              sx={{ 
                borderRadius: '10px', 
                py: 1.2, 
                textTransform: 'none',
                background: 'rgba(120, 81, 169, 0.05)'
              }}
            >
              View All Rewards
            </Button>
          </Box>
        )}
      </CardContent>
    </StyledCard>
  );
};

export default RewardsCard;
