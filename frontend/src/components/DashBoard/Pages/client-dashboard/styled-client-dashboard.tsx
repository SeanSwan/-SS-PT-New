import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';

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
  visible: (custom: number) => ({
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
  color: #e2e8f0;
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
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(12px);
  border-radius: 15px;
  border: 1px solid rgba(14, 165, 233, 0.2);
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
  border-bottom: 1px solid rgba(14, 165, 233, 0.1);
`;

export const CardTitle = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #e2e8f0;
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
  color: rgba(226, 232, 240, 0.9);
`;

export const ProgressBarValue = styled.div`
  font-size: 0.8rem;
  font-weight: 500;
  color: rgba(226, 232, 240, 0.7);
`;

// Pure CSS linear progress bar replacing MUI LinearProgress
const progressBarFill = keyframes`
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
`;

export const StyledLinearProgress = styled.div<{ $value?: number; $color?: string }>`
  height: 8px;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.1);
  overflow: hidden;
  position: relative;
  width: 100%;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: ${({ $value }) => ($value != null ? `${Math.min(Math.max($value, 0), 100)}%` : '0%')};
    border-radius: 4px;
    background: ${({ $color }) =>
      $color === 'success'
        ? 'linear-gradient(90deg, #00bf8f, #10b981)'
        : $color === 'warning'
        ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
        : $color === 'error'
        ? 'linear-gradient(90deg, #ef4444, #f87171)'
        : 'linear-gradient(90deg, #0ea5e9, #00ffff)'};
    transition: width 0.4s ease;
  }
`;

// Level Components
export const LevelBadge = styled.div<{ $level: number }>`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: ${({ $level }) => {
    if ($level < 10) return 'linear-gradient(135deg, #2e7d32, #4caf50)';
    if ($level < 25) return 'linear-gradient(135deg, #1565c0, #2196f3)';
    if ($level < 50) return 'linear-gradient(135deg, #7851a9, #9c27b0)';
    if ($level < 100) return 'linear-gradient(135deg, #f57c00, #ff9800)';
    if ($level < 200) return 'linear-gradient(135deg, #c62828, #f44336)';
    if ($level < 350) return 'linear-gradient(135deg, #d32f2f, #f44336)';
    if ($level < 500) return 'linear-gradient(135deg, #b71c1c, #d32f2f)';
    if ($level < 750) return 'linear-gradient(135deg, #880e4f, #c2185b)';
    return 'linear-gradient(135deg, #311b92, #673ab7)';
  }};
  color: #e2e8f0;
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
  color: #e2e8f0;
`;

export const LevelDescription = styled.div`
  font-size: 0.875rem;
  margin-bottom: 1rem;
  color: rgba(226, 232, 240, 0.7);
  line-height: 1.4;
`;

export const LevelProgress = styled.div`
  width: 100%;
`;

export const NextLevelContainer = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: rgba(226, 232, 240, 0.6);
  margin-top: 0.25rem;
`;

// Achievement Components
export const AchievementGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(75px, 1fr));
  gap: 1rem;
`;

export const AchievementItem = styled(motion.div)<{ $unlocked: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  & .achievement-icon {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: ${props => props.$unlocked
      ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(120, 81, 169, 0.2))'
      : 'rgba(255, 255, 255, 0.05)'};
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 0.5rem;
    color: ${props => props.$unlocked ? 'rgba(0, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.3)'};
    border: 1px solid ${props => props.$unlocked ? 'rgba(0, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
    box-shadow: ${props => props.$unlocked ? '0 0 15px rgba(0, 255, 255, 0.2)' : 'none'};
  }

  & .achievement-name {
    font-size: 0.7rem;
    color: ${props => props.$unlocked ? 'rgba(226, 232, 240, 0.9)' : 'rgba(226, 232, 240, 0.4)'};
    max-width: 90px;
  }
`;

// Exercise Components
export const ExerciseRow = styled.div`
  display: flex;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(14, 165, 233, 0.1);
  min-height: 44px;
  cursor: pointer;

  &:last-child {
    border-bottom: none;
  }
`;

export const ExerciseIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: rgba(14, 165, 233, 0.1);
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 1rem;
  color: #0ea5e9;
  flex-shrink: 0;
`;

export const ExerciseInfo = styled.div`
  flex: 1;
`;

export const ExerciseName = styled.div`
  font-size: 0.9rem;
  font-weight: 500;
  color: #e2e8f0;
  margin-bottom: 0.25rem;
`;

export const ExerciseDetails = styled.div`
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: rgba(226, 232, 240, 0.6);

  & span {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
`;

export const ExerciseLevel = styled.div<{ $level?: number }>`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${props => {
    if (!props.$level) return '#0ea5e9';
    if (props.$level < 10) return '#4caf50';
    if (props.$level < 25) return '#2196f3';
    if (props.$level < 50) return '#9c27b0';
    if (props.$level < 100) return '#ff9800';
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
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

export const StatCard = styled.div<{ $color?: string }>`
  background: ${props => {
    const c = props.$color;
    if (c === 'primary') return 'rgba(14, 165, 233, 0.1)';
    if (c === 'success') return 'rgba(0, 191, 143, 0.1)';
    if (c === 'info') return 'rgba(33, 150, 243, 0.1)';
    if (c === 'warning') return 'rgba(255, 183, 0, 0.1)';
    return 'rgba(15, 23, 42, 0.95)';
  }};
  backdrop-filter: blur(12px);
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid ${props => {
    const c = props.$color;
    if (c === 'primary') return 'rgba(14, 165, 233, 0.2)';
    if (c === 'success') return 'rgba(0, 191, 143, 0.2)';
    if (c === 'info') return 'rgba(33, 150, 243, 0.2)';
    if (c === 'warning') return 'rgba(255, 183, 0, 0.2)';
    return 'rgba(14, 165, 233, 0.2)';
  }};
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  }
`;

export const StatValue = styled.div<{ $color?: string }>`
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: ${props => {
    const c = props.$color;
    if (c === 'primary') return '#0ea5e9';
    if (c === 'success') return 'rgba(0, 191, 143, 0.9)';
    if (c === 'info') return 'rgba(33, 150, 243, 0.9)';
    if (c === 'warning') return 'rgba(255, 183, 0, 0.9)';
    return '#e2e8f0';
  }};
`;

export const StatLabel = styled.div`
  font-size: 0.75rem;
  color: rgba(226, 232, 240, 0.7);
`;

// Enhanced Interactive Components
export const InteractiveCard = styled(StyledCard)`
  cursor: pointer;
  min-height: 44px;
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    border-color: rgba(14, 165, 233, 0.3);
  }
`;

export const GlowingButton = styled.button`
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(120, 81, 169, 0.2));
  border: 1px solid rgba(14, 165, 233, 0.3);
  color: #e2e8f0;
  font-weight: 500;
  padding: 0.75rem 1.5rem;
  min-height: 44px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  font-size: 0.9rem;

  &::before {
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
    box-shadow: 0 10px 25px rgba(14, 165, 233, 0.2);

    &::before {
      left: 100%;
    }
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 5px 15px rgba(14, 165, 233, 0.2);
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
    color: #e2e8f0;
  }

  & .label {
    font-size: 0.7rem;
    color: rgba(226, 232, 240, 0.7);
  }
`;

export const Streak = styled.div<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: ${props => props.$active
    ? 'linear-gradient(135deg, rgba(255, 183, 0, 0.2), rgba(255, 65, 108, 0.2))'
    : 'rgba(255, 255, 255, 0.05)'};
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  border: 1px solid ${props => props.$active
    ? 'rgba(255, 183, 0, 0.3)'
    : 'rgba(14, 165, 233, 0.2)'};

  ${props => props.$active && `
    &::after {
      content: '';
      position: absolute;
      top: 8px;
      right: 8px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #fbbf24;
      box-shadow: 0 0 8px rgba(251, 191, 36, 0.6);
    }
  `}

  & .value {
    font-size: 2rem;
    font-weight: 700;
    color: ${props => props.$active ? 'rgba(255, 183, 0, 0.9)' : 'rgba(226, 232, 240, 0.5)'};
    margin-bottom: 0.25rem;
  }

  & .label {
    font-size: 0.8rem;
    color: ${props => props.$active ? 'rgba(226, 232, 240, 0.9)' : 'rgba(226, 232, 240, 0.5)'};
    text-transform: uppercase;
    letter-spacing: 1px;
  }
`;

export const WorkoutCard = styled.div`
  padding: 1rem;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(14, 165, 233, 0.2);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    background: rgba(15, 23, 42, 0.98);
    border-color: rgba(14, 165, 233, 0.3);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  }
`;

export const TimelineContainer = styled.div`
  position: relative;
  margin-left: 1.5rem;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 2px;
    background: rgba(14, 165, 233, 0.2);
    transform: translateX(-50%);
  }
`;

export const TimelineItem = styled.div`
  position: relative;
  padding-bottom: 1.5rem;
  padding-left: 1.5rem;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #0ea5e9;
    transform: translateX(-50%);
    border: 2px solid rgba(0, 0, 0, 0.3);
    z-index: 1;
  }

  &:last-child {
    padding-bottom: 0;
  }
`;

export const HeatmapContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(18px, 1fr));
  gap: 3px;
`;

export const HeatmapDay = styled.div<{ $intensity: number }>`
  width: 18px;
  height: 18px;
  border-radius: 2px;
  background: ${props => {
    if (props.$intensity === 0) return 'rgba(255, 255, 255, 0.05)';
    if (props.$intensity === 1) return 'rgba(14, 165, 233, 0.2)';
    if (props.$intensity === 2) return 'rgba(14, 165, 233, 0.4)';
    if (props.$intensity === 3) return 'rgba(14, 165, 233, 0.6)';
    return 'rgba(14, 165, 233, 0.8)';
  }};
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.2);
    box-shadow: 0 0 8px rgba(14, 165, 233, 0.5);
  }
`;

export const BadgeCollection = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
`;

export const Badge = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  min-height: 44px;
  border-radius: 20px;
  background: ${props => props.$active
    ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(120, 81, 169, 0.2))'
    : 'rgba(255, 255, 255, 0.05)'};
  color: ${props => props.$active ? '#0ea5e9' : 'rgba(226, 232, 240, 0.5)'};
  font-size: 0.8rem;
  border: 1px solid ${props => props.$active
    ? 'rgba(14, 165, 233, 0.3)'
    : 'rgba(14, 165, 233, 0.1)'};

  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  }
`;

// New components for gamification
export const RewardsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
`;

export const RewardCard = styled.div<{ $unlocked: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  border-radius: 12px;
  background: ${props => props.$unlocked
    ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.1), rgba(120, 81, 169, 0.1))'
    : 'rgba(255, 255, 255, 0.03)'};
  border: 1px solid ${props => props.$unlocked
    ? 'rgba(14, 165, 233, 0.2)'
    : 'rgba(255, 255, 255, 0.05)'};

  opacity: ${props => props.$unlocked ? 1 : 0.5};
  filter: ${props => props.$unlocked ? 'none' : 'grayscale(1)'};
  transition: all 0.3s ease;

  &:hover {
    transform: ${props => props.$unlocked ? 'translateY(-5px)' : 'none'};
    box-shadow: ${props => props.$unlocked ? '0 10px 25px rgba(0, 0, 0, 0.3)' : 'none'};
  }

  & .icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    color: ${props => props.$unlocked ? '#0ea5e9' : 'rgba(226, 232, 240, 0.3)'};
  }

  & .title {
    font-size: 0.9rem;
    font-weight: 500;
    text-align: center;
    color: ${props => props.$unlocked ? '#e2e8f0' : 'rgba(226, 232, 240, 0.5)'};
    margin-bottom: 0.25rem;
  }

  & .description {
    font-size: 0.7rem;
    text-align: center;
    color: rgba(226, 232, 240, 0.6);
  }
`;

export const ChallengeCard = styled.div<{ $active: boolean }>`
  position: relative;
  padding: 1.25rem;
  border-radius: 12px;
  background: ${props => props.$active
    ? 'linear-gradient(135deg, rgba(120, 81, 169, 0.2), rgba(14, 165, 233, 0.2))'
    : 'rgba(15, 23, 42, 0.95)'};
  backdrop-filter: blur(12px);
  border: 1px solid ${props => props.$active
    ? 'rgba(120, 81, 169, 0.3)'
    : 'rgba(14, 165, 233, 0.2)'};

  transition: all 0.3s ease;
  overflow: hidden;

  ${props => props.$active && `
    &::before {
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

const pulseAnimation = keyframes`
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
`;

export const PulsingDot = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #0ea5e9;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-color: rgba(14, 165, 233, 0.4);
    z-index: -1;
    animation: ${pulseAnimation} 1.5s infinite;
  }
`;

export const ScheduleTimeline = styled.div`
  position: relative;
  margin-left: 20px;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 2px;
    background: linear-gradient(to bottom, rgba(14, 165, 233, 0.2) 0%, rgba(120, 81, 169, 0.2) 100%);
  }
`;

export const ScheduleTimelineItem = styled.div<{ $active?: boolean }>`
  position: relative;
  padding-left: 25px;
  padding-bottom: 1.5rem;

  &::before {
    content: '';
    position: absolute;
    left: -4px;
    top: 0;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${props => props.$active
      ? '#0ea5e9'
      : 'rgba(226, 232, 240, 0.2)'};
    border: 2px solid rgba(0, 0, 0, 0.3);
  }

  &:last-child {
    padding-bottom: 0;
  }
`;
