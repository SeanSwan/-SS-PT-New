import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Box, LinearProgress, Card } from '@mui/material';

// Animation variants
export const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { 
      when: "beforeChildren",
      staggerChildren: 0.08,
      duration: 0.3
    }
  }
};

export const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { 
      type: "spring", 
      stiffness: 100, 
      damping: 10 
    }
  }
};

export const staggeredItemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: custom => ({ 
    y: 0, 
    opacity: 1, 
    transition: { 
      delay: custom * 0.05,
      type: "spring", 
      stiffness: 100, 
      damping: 12 
    }
  })
};

// Page Layout Components
export const PageContainer = styled.div`
  width: 100%;
  min-height: calc(100vh - 64px);
  overflow-x: hidden;
  background: linear-gradient(135deg, #0a0a1a, #1e1e3f);
  color: white;
`;

export const ContentContainer = styled.div`
  max-width: 1440px;
  margin: 0 auto;
  padding: 2rem;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

export const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  
  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
  
  @media (min-width: 1400px) {
    grid-template-columns: repeat(12, 1fr);
  }
`;

// Card Components
export const StyledCard = styled(motion.div)`
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
  
  @media (min-width: 1400px) {
    &:nth-child(1) {
      grid-column: span 4;
    }
    &:nth-child(2) {
      grid-column: span 4;
    }
    &:nth-child(3) {
      grid-column: span 4;
    }
    &:nth-child(4) {
      grid-column: span 4;
    }
    &:nth-child(5) {
      grid-column: span 4;
    }
    &:nth-child(6) {
      grid-column: span 4;
    }
  }
  
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  }
`;

export const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`;

export const CardTitle = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: white;
`;

export const CardContent = styled.div`
  padding: 1.5rem;
`;

// Progress Components
export const ProgressBarContainer = styled.div`
  margin-bottom: 1rem;
`;

export const ProgressBarLabel = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.4rem;
`;

export const ProgressBarName = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.9);
`;

export const ProgressBarValue = styled.div`
  font-size: 0.8rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
`;

export const StyledLinearProgress = styled(LinearProgress)`
  height: 8px;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.1);
  
  & .MuiLinearProgress-bar {
    border-radius: 4px;
  }
`;

// Level Components
export const LevelBadge = styled.div<{ level: number }>`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: ${({ level }) => {
    if (level < 10) return 'linear-gradient(135deg, #2e7d32, #4caf50)';
    if (level < 25) return 'linear-gradient(135deg, #1565c0, #2196f3)';
    if (level < 50) return 'linear-gradient(135deg, #7851a9, #9c27b0)';
    if (level < 100) return 'linear-gradient(135deg, #f57c00, #ff9800)';
    if (level < 200) return 'linear-gradient(135deg, #c62828, #f44336)';
    if (level < 350) return 'linear-gradient(135deg, #d32f2f, #f44336)';
    if (level < 500) return 'linear-gradient(135deg, #b71c1c, #d32f2f)';
    if (level < 750) return 'linear-gradient(135deg, #880e4f, #c2185b)';
    return 'linear-gradient(135deg, #311b92, #673ab7)';
  }};
  color: white;
  font-size: 1.75rem;
  font-weight: 600;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  margin-right: 1.5rem;
  flex-shrink: 0;
  
  & span {
    font-size: 0.6rem;
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: -0.25rem;
  }
`;

export const LevelInfo = styled.div`
  flex: 1;
`;

export const LevelName = styled.div`
  font-size: 1.125rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
  color: white;
`;

export const LevelDescription = styled.div`
  font-size: 0.875rem;
  margin-bottom: 1rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.4;
`;

export const LevelProgress = styled.div`
  width: 100%;
`;

export const NextLevelContainer = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 0.25rem;
`;

// Achievement Components
export const AchievementGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(75px, 1fr));
  gap: 1rem;
`;

export const AchievementItem = styled(motion.div)<{ unlocked: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  
  & .achievement-icon {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: ${props => props.unlocked 
      ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(120, 81, 169, 0.2))'
      : 'rgba(255, 255, 255, 0.05)'};
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 0.5rem;
    color: ${props => props.unlocked ? 'rgba(0, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.3)'};
    border: 1px solid ${props => props.unlocked ? 'rgba(0, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
    box-shadow: ${props => props.unlocked ? '0 0 15px rgba(0, 255, 255, 0.2)' : 'none'};
  }
  
  & .achievement-name {
    font-size: 0.7rem;
    color: ${props => props.unlocked ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)'};
    max-width: 90px;
  }
`;

// Exercise Components
export const ExerciseRow = styled.div`
  display: flex;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  
  &:last-child {
    border-bottom: none;
  }
`;

export const ExerciseIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(0, 255, 255, 0.1);
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 1rem;
  color: rgba(0, 255, 255, 0.9);
  flex-shrink: 0;
`;

export const ExerciseInfo = styled.div`
  flex: 1;
`;

export const ExerciseName = styled.div`
  font-size: 0.9rem;
  font-weight: 500;
  color: white;
  margin-bottom: 0.25rem;
`;

export const ExerciseDetails = styled.div`
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  
  & span {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
`;

export const ExerciseLevel = styled.div<{ level: number }>`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${props => {
    if (props.level < 10) return '#4caf50';
    if (props.level < 25) return '#2196f3';
    if (props.level < 50) return '#9c27b0';
    if (props.level < 100) return '#ff9800';
    return '#f44336';
  }};
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  margin-left: 0.5rem;
  flex-shrink: 0;
`;

// Stats Components
export const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

export const StatCard = styled.div<{ color: string }>`
  background: ${props => `rgba(${
    props.color === 'primary' ? '0, 255, 255' : 
    props.color === 'success' ? '0, 191, 143' : 
    props.color === 'info' ? '33, 150, 243' : 
    props.color === 'warning' ? '255, 183, 0' : '120, 81, 169'
  }, 0.1)`};
  border-radius: 8px;
  padding: 0.75rem;
  text-align: center;
  border: 1px solid ${props => `rgba(${
    props.color === 'primary' ? '0, 255, 255' : 
    props.color === 'success' ? '0, 191, 143' : 
    props.color === 'info' ? '33, 150, 243' : 
    props.color === 'warning' ? '255, 183, 0' : '120, 81, 169'
  }, 0.2)`};
`;

export const StatValue = styled.div<{ color: string }>`
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: ${props => 
    props.color === 'primary' ? 'rgba(0, 255, 255, 0.9)' : 
    props.color === 'success' ? 'rgba(0, 191, 143, 0.9)' : 
    props.color === 'info' ? 'rgba(33, 150, 243, 0.9)' : 
    props.color === 'warning' ? 'rgba(255, 183, 0, 0.9)' : 'rgba(120, 81, 169, 0.9)'
  };
`;

export const StatLabel = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
`;

// Enhanced Interactive Components
export const InteractiveCard = styled(StyledCard)`
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
  
  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    border-color: rgba(0, 255, 255, 0.3);
  }
`;

export const GlowingButton = styled.button`
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(120, 81, 169, 0.2));
  border: 1px solid rgba(0, 255, 255, 0.3);
  color: white;
  font-weight: 500;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    transition: 0.5s;
  }
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 25px rgba(0, 255, 255, 0.2);
    
    &:before {
      left: 100%;
    }
  }
  
  &:active {
    transform: translateY(0);
    box-shadow: 0 5px 15px rgba(0, 255, 255, 0.2);
  }
`;

export const CircularProgressWrapper = styled.div`
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto;
`;

export const CircularProgressLabel = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  
  & .value {
    font-size: 1.25rem;
    font-weight: 600;
    color: white;
  }
  
  & .label {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.7);
  }
`;

export const Streak = styled(Box)<{ active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: ${props => props.active 
    ? 'linear-gradient(135deg, rgba(255, 183, 0, 0.2), rgba(255, 65, 108, 0.2))'
    : 'rgba(255, 255, 255, 0.05)'};
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  border: 1px solid ${props => props.active 
    ? 'rgba(255, 183, 0, 0.3)'
    : 'rgba(255, 255, 255, 0.1)'};

  ${props => props.active && `
    &:after {
      content: '🔥';
      position: absolute;
      top: -10px;
      right: -10px;
      font-size: 2rem;
      transform: rotate(15deg);
      opacity: 0.9;
    }
  `}
  
  & .value {
    font-size: 2rem;
    font-weight: 700;
    color: ${props => props.active ? 'rgba(255, 183, 0, 0.9)' : 'rgba(255, 255, 255, 0.5)'};
    margin-bottom: 0.25rem;
  }
  
  & .label {
    font-size: 0.8rem;
    color: ${props => props.active ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)'};
    text-transform: uppercase;
    letter-spacing: 1px;
  }
`;

export const WorkoutCard = styled(Box)`
  padding: 1rem;
  border-radius: 12px;
  background: rgba(30, 30, 60, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    background: rgba(30, 30, 60, 0.6);
    border-color: rgba(0, 255, 255, 0.3);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  }
`;

export const TimelineContainer = styled(Box)`
  position: relative;
  margin-left: 1.5rem;
  
  &:before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 2px;
    background: rgba(255, 255, 255, 0.1);
    transform: translateX(-50%);
  }
`;

export const TimelineItem = styled(Box)`
  position: relative;
  padding-bottom: 1.5rem;
  padding-left: 1.5rem;
  
  &:before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #00ffff;
    transform: translateX(-50%);
    border: 2px solid rgba(0, 0, 0, 0.3);
    z-index: 1;
  }
  
  &:last-child {
    padding-bottom: 0;
  }
`;

export const HeatmapContainer = styled(Box)`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(18px, 1fr));
  gap: 3px;
`;

export const HeatmapDay = styled(Box)<{ intensity: number }>`
  width: 18px;
  height: 18px;
  border-radius: 2px;
  background: ${props => {
    if (props.intensity === 0) return 'rgba(255, 255, 255, 0.05)';
    if (props.intensity === 1) return 'rgba(0, 255, 255, 0.2)';
    if (props.intensity === 2) return 'rgba(0, 255, 255, 0.4)';
    if (props.intensity === 3) return 'rgba(0, 255, 255, 0.6)';
    return 'rgba(0, 255, 255, 0.8)';
  }};
  transition: all 0.2s ease;
  
  &:hover {
    transform: scale(1.2);
    box-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
  }
`;

export const BadgeCollection = styled(Box)`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
`;

export const Badge = styled(Box)<{ active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 20px;
  background: ${props => props.active 
    ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(120, 81, 169, 0.2))'
    : 'rgba(255, 255, 255, 0.05)'};
  color: ${props => props.active ? 'rgba(0, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)'};
  font-size: 0.8rem;
  border: 1px solid ${props => props.active 
    ? 'rgba(0, 255, 255, 0.3)'
    : 'rgba(255, 255, 255, 0.1)'};
  
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  }
`;

// New components for gamification
export const RewardsContainer = styled(Box)`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
`;

export const RewardCard = styled(Box)<{ unlocked: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  border-radius: 12px;
  background: ${props => props.unlocked 
    ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(120, 81, 169, 0.1))'
    : 'rgba(255, 255, 255, 0.03)'};
  border: 1px solid ${props => props.unlocked 
    ? 'rgba(0, 255, 255, 0.2)'
    : 'rgba(255, 255, 255, 0.05)'};
  
  opacity: ${props => props.unlocked ? 1 : 0.5};
  filter: ${props => props.unlocked ? 'none' : 'grayscale(1)'};
  transition: all 0.3s ease;
  
  &:hover {
    transform: ${props => props.unlocked ? 'translateY(-5px)' : 'none'};
    box-shadow: ${props => props.unlocked ? '0 10px 25px rgba(0, 0, 0, 0.3)' : 'none'};
  }
  
  & .icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    color: ${props => props.unlocked ? 'rgba(0, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.3)'};
  }
  
  & .title {
    font-size: 0.9rem;
    font-weight: 500;
    text-align: center;
    color: ${props => props.unlocked ? 'white' : 'rgba(255, 255, 255, 0.5)'};
    margin-bottom: 0.25rem;
  }
  
  & .description {
    font-size: 0.7rem;
    text-align: center;
    color: rgba(255, 255, 255, 0.6);
  }
`;

export const ChallengeCard = styled(Box)<{ active: boolean }>`
  position: relative;
  padding: 1.25rem;
  border-radius: 12px;
  background: ${props => props.active 
    ? 'linear-gradient(135deg, rgba(120, 81, 169, 0.2), rgba(0, 255, 255, 0.2))' 
    : 'rgba(30, 30, 60, 0.4)'};
  border: 1px solid ${props => props.active 
    ? 'rgba(120, 81, 169, 0.3)' 
    : 'rgba(255, 255, 255, 0.1)'};
  
  transition: all 0.3s ease;
  overflow: hidden;
  
  ${props => props.active && `
    &:before {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 0;
      height: 0;
      border-style: solid;
      border-width: 0 40px 40px 0;
      border-color: transparent rgba(120, 81, 169, 0.6) transparent transparent;
    }
  `}
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  }
`;

export const PulsingDot = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #00ffff;
  position: relative;
  
  &:after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-color: rgba(0, 255, 255, 0.4);
    z-index: -1;
    animation: pulse 1.5s infinite;
  }
  
  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 0.7;
    }
    70% {
      transform: scale(2);
      opacity: 0;
    }
    100% {
      transform: scale(1);
      opacity: 0;
    }
  }
`;

export const ScheduleTimeline = styled(Box)`
  position: relative;
  margin-left: 20px;
  
  &:before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 2px;
    background: linear-gradient(to bottom, rgba(0, 255, 255, 0.2) 0%, rgba(120, 81, 169, 0.2) 100%);
  }
`;

export const ScheduleTimelineItem = styled(Box)<{ active?: boolean }>`
  position: relative;
  padding-left: 25px;
  padding-bottom: 1.5rem;
  
  &:before {
    content: '';
    position: absolute;
    left: -4px;
    top: 0;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${props => props.active 
      ? '#00ffff'
      : 'rgba(255, 255, 255, 0.2)'};
    border: 2px solid rgba(0, 0, 0, 0.3);
  }
  
  &:last-child {
    padding-bottom: 0;
  }
`;
