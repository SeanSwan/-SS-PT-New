import styled from 'styled-components';
import { motion } from 'framer-motion';

// Animation variants
export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 80,
      damping: 10
    }
  }
};

// Shared components
export const PageContainer = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
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

// Achievement components
export const AchievementGrid = motion(styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  margin-top: 24px;
`);

export const AchievementItem = motion(styled.div<{ tier: 'bronze' | 'silver' | 'gold' | 'platinum' }>`
  position: relative;
  background-color: ${({ theme }) => theme?.palette?.background?.paper || '#1e1e2f'};
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  border-top: 4px solid ${({ tier, theme }) =>
    tier === 'bronze' ? '#CD7F32' :
    tier === 'silver' ? '#C0C0C0' :
    tier === 'gold' ? '#FFD700' :
    '#E5E4E2'
  };

  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }
`);

export const AchievementIcon = styled.div<{ tier: 'bronze' | 'silver' | 'gold' | 'platinum' }>`
  width: 64px;
  height: 64px;
  background-color: ${({ tier }) => 
    tier === 'bronze' ? 'rgba(205, 127, 50, 0.15)' : 
    tier === 'silver' ? 'rgba(192, 192, 192, 0.15)' : 
    tier === 'gold' ? 'rgba(255, 215, 0, 0.15)' : 
    'rgba(229, 228, 226, 0.15)'
  };
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  color: ${({ tier }) => 
    tier === 'bronze' ? '#CD7F32' : 
    tier === 'silver' ? '#808080' : 
    tier === 'gold' ? '#FFD700' : 
    '#75748C'
  };
`;

export const AchievementName = styled.h3`
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme?.palette?.text?.primary || '#ffffff'};
`;

export const AchievementDescription = styled.p`
  margin: 0 0 16px 0;
  font-size: 14px;
  color: ${({ theme }) => theme?.palette?.text?.secondary || '#cccccc'};
  min-height: 40px;
`;

export const AchievementReward = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme?.palette?.success?.main || '#4caf50'};
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const AchievementBadge = styled.div<{ tier: 'bronze' | 'silver' | 'gold' | 'platinum' }>`
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 16px;
  background-color: ${({ tier }) => 
    tier === 'bronze' ? 'rgba(205, 127, 50, 0.15)' : 
    tier === 'silver' ? 'rgba(192, 192, 192, 0.15)' : 
    tier === 'gold' ? 'rgba(255, 215, 0, 0.15)' : 
    'rgba(229, 228, 226, 0.15)'
  };
  color: ${({ tier }) => 
    tier === 'bronze' ? '#CD7F32' : 
    tier === 'silver' ? '#808080' : 
    tier === 'gold' ? '#FFD700' : 
    '#75748C'
  };
`;

export const UnlockedOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
`;

// Milestone components
export const MilestoneTrack = styled.div`
  position: relative;
  height: 200px;
  margin: 60px 0;
  padding: 0 50px;
`;

export const MilestoneLine = styled.div`
  position: absolute;
  top: 50%;
  left: 40px;
  right: 40px;
  height: 4px;
  background-color: ${({ theme }) => theme.palette.divider};
  transform: translateY(-50%);
`;

export const MilestoneNode = styled.div<{ active: boolean, passed: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: ${({ active, passed, theme }) => 
    active ? theme.palette.primary.main : 
    passed ? theme.palette.success.main : 
    theme.palette.background.paper
  };
  color: ${({ active, passed, theme }) => 
    active || passed ? 'white' : theme.palette.text.secondary
  };
  border: 2px solid ${({ active, passed, theme }) => 
    active ? theme.palette.primary.main : 
    passed ? theme.palette.success.main : 
    theme.palette.divider
  };
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  box-shadow: ${({ active, passed }) => 
    active || passed ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'none'
  };
`;

export const MilestoneLabel = styled.div<{ active: boolean, passed: boolean }>`
  font-size: 14px;
  font-weight: 600;
  margin-top: 16px;
  text-align: center;
  color: ${({ active, passed, theme }) => 
    active ? theme.palette.primary.main : 
    passed ? theme.palette.success.main : 
    theme.palette.text.primary
  };
`;

export const MilestoneValue = styled.div<{ active: boolean, passed: boolean }>`
  font-size: 12px;
  margin-top: 4px;
  text-align: center;
  color: ${({ active, passed, theme }) => 
    active ? theme.palette.primary.main : 
    passed ? theme.palette.success.main : 
    theme.palette.text.secondary
  };
`;

// Progress components
export const ProgressContainer = styled.div`
  margin-bottom: 16px;
`;

export const ProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

export const ProgressTitle = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.palette.text.secondary};
`;

export const ProgressValue = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.palette.text.primary};
`;

export const StyledProgress = styled.div<{ $percentage: number; $color?: string }>`
  height: 8px;
  background-color: ${({ theme }) => theme.palette.background.default};
  border-radius: 4px;
  overflow: hidden;

  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${props => props.$percentage}%;
    background-color: ${props => props.$color || props.theme.palette.primary.main};
    border-radius: 4px;
    transition: width 0.5s ease;
  }
`;

// Reward components
export const RewardGrid = motion(styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  margin-top: 24px;
`);

export const RewardItem = motion(styled.div<{ tier: 'bronze' | 'silver' | 'gold' | 'platinum' }>`
  position: relative;
  background-color: ${({ theme }) => theme?.palette?.background?.paper || '#1e1e2f'};
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  border-left: 4px solid ${({ tier }) =>
    tier === 'bronze' ? '#CD7F32' :
    tier === 'silver' ? '#C0C0C0' :
    tier === 'gold' ? '#FFD700' :
    '#E5E4E2'
  };

  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }
`);

export const RewardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
`;

export const RewardIcon = styled.div<{ tier: 'bronze' | 'silver' | 'gold' | 'platinum' }>`
  width: 48px;
  height: 48px;
  background-color: ${({ tier }) => 
    tier === 'bronze' ? 'rgba(205, 127, 50, 0.15)' : 
    tier === 'silver' ? 'rgba(192, 192, 192, 0.15)' : 
    tier === 'gold' ? 'rgba(255, 215, 0, 0.15)' : 
    'rgba(229, 228, 226, 0.15)'
  };
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ tier }) => 
    tier === 'bronze' ? '#CD7F32' : 
    tier === 'silver' ? '#808080' : 
    tier === 'gold' ? '#FFD700' : 
    '#75748C'
  };
  flex-shrink: 0;
`;

export const RewardContent = styled.div`
  flex: 1;
`;

export const RewardName = styled.h3`
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme?.palette?.text?.primary || '#ffffff'};
`;

export const RewardDescription = styled.p`
  margin: 0;
  font-size: 14px;
  color: ${({ theme }) => theme?.palette?.text?.secondary || '#cccccc'};
  min-height: 40px;
`;

export const RewardFooter = styled.div`
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid ${({ theme }) => theme?.palette?.divider || 'rgba(255, 255, 255, 0.1)'};
`;

export const RewardPoints = styled.div<{ tier: 'bronze' | 'silver' | 'gold' | 'platinum' }>`
  font-size: 14px;
  font-weight: 600;
  color: ${({ tier }) => 
    tier === 'bronze' ? '#CD7F32' : 
    tier === 'silver' ? '#808080' : 
    tier === 'gold' ? '#FFD700' : 
    '#75748C'
  };
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const RewardBadge = styled.div<{ tier: 'bronze' | 'silver' | 'gold' | 'platinum' }>`
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 16px;
  background-color: ${({ tier }) => 
    tier === 'bronze' ? 'rgba(205, 127, 50, 0.15)' : 
    tier === 'silver' ? 'rgba(192, 192, 192, 0.15)' : 
    tier === 'gold' ? 'rgba(255, 215, 0, 0.15)' : 
    'rgba(229, 228, 226, 0.15)'
  };
  color: ${({ tier }) => 
    tier === 'bronze' ? '#CD7F32' : 
    tier === 'silver' ? '#808080' : 
    tier === 'gold' ? '#FFD700' : 
    '#75748C'
  };
`;