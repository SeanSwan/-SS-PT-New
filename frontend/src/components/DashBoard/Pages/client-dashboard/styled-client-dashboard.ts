import styled, { keyframes, css } from "styled-components";
import { motion } from "framer-motion";
import { 
  Box, 
  Card, 
  Paper,
  LinearProgress,
  Typography
} from "@mui/material";

// --- Keyframe Animations ---
export const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

export const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

export const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

export const glow = keyframes`
  0%, 100% { box-shadow: 0 0 10px rgba(0, 255, 255, 0.5), 0 0 20px rgba(120, 81, 169, 0.3); }
  50% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.8), 0 0 30px rgba(120, 81, 169, 0.5); }
`;

export const textGlow = keyframes`
  0%, 100% { text-shadow: 0 0 5px rgba(0, 255, 255, 0.5), 0 0 10px rgba(120, 81, 169, 0.4); }
  50% { text-shadow: 0 0 10px rgba(0, 255, 255, 0.8), 0 0 15px rgba(120, 81, 169, 0.6); }
`;

// --- Main Layout Components ---
export const PageContainer = styled.div`
  position: relative;
  overflow-x: hidden;
  background: linear-gradient(135deg, #0a0a1a, #1e1e3f);
  color: white;
  min-height: 100vh;
  width: 100%;
`;

export const ContentContainer = styled.div`
  position: relative;
  z-index: 1;
  padding: 1rem;
  max-width: 100vw;
  margin: 0;
  box-sizing: border-box;
  width: 100%;
`;

export const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  width: 100%;
`;

// --- Card Components ---
export const StyledCard = styled(Card)`
  border-radius: 15px !important;
  overflow: hidden;
  background: rgba(30, 30, 60, 0.3) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  transition: all 0.3s ease;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2) !important;
  height: 100%;
  display: flex;
  flex-direction: column;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3) !important;
    border: 1px solid rgba(255, 255, 255, 0.15) !important;
  }
`;

export const CardHeader = styled.div`
  padding: 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const CardTitle = styled.h2`
  margin: 0;
  color: white;
  font-size: 1.5rem;
  font-weight: 300;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  svg {
    color: #00ffff;
  }
`;

export const CardContent = styled.div`
  padding: 1.25rem;
  flex: 1;
  display: flex;
  flex-direction: column;
`;

// --- Progress Bar Components ---
export const ProgressBarContainer = styled.div`
  margin: 0.5rem 0;
`;

export const ProgressBarLabel = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
`;

export const ProgressBarName = styled.span`
  color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

export const ProgressBarValue = styled.span`
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
`;

export const StyledLinearProgress = styled(LinearProgress)<{ color?: string }>`
  height: 10px !important;
  border-radius: 5px !important;
  background-color: rgba(255, 255, 255, 0.1) !important;
  
  .MuiLinearProgress-bar {
    background: ${props => 
      props.color === 'primary' ? 'linear-gradient(90deg, #00c6ff, #0072ff)' :
      props.color === 'success' ? 'linear-gradient(90deg, #00dfa2, #00b876)' :
      props.color === 'warning' ? 'linear-gradient(90deg, #ffd166, #ef8d32)' :
      props.color === 'secondary' ? 'linear-gradient(90deg, #a142f5, #7851a9)' :
      props.color === 'info' ? 'linear-gradient(90deg, #0096c7, #0077b6)' :
      'linear-gradient(90deg, #00ffff, #7851a9)'
    } !important;
    border-radius: 5px !important;
  }
`;

// --- Level Components ---
export const LevelBadge = styled.div<{ level: number }>`
  background: ${props => 
    props.level < 100 ? 'linear-gradient(135deg, #455eb5, #5643cc)' :
    props.level < 250 ? 'linear-gradient(135deg, #00b2bd, #0096c7)' :
    props.level < 500 ? 'linear-gradient(135deg, #00b894, #00a3a3)' :
    props.level < 750 ? 'linear-gradient(135deg, #c56cf0, #7851a9)' :
    'linear-gradient(135deg, #fd3872, #eb5757)'
  };
  color: white;
  border-radius: 50%;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  font-weight: 700;
  font-size: 1.5rem;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: -3px;
    left: -3px;
    right: -3px;
    bottom: -3px;
    border-radius: 50%;
    background: ${props => 
      props.level < 100 ? 'linear-gradient(to right, #455eb5, #5643cc, #455eb5)' :
      props.level < 250 ? 'linear-gradient(to right, #00b2bd, #0096c7, #00b2bd)' :
      props.level < 500 ? 'linear-gradient(to right, #00b894, #00a3a3, #00b894)' :
      props.level < 750 ? 'linear-gradient(to right, #c56cf0, #7851a9, #c56cf0)' :
      'linear-gradient(to right, #fd3872, #eb5757, #fd3872)'
    };
    background-size: 200% auto;
    z-index: -1;
    animation: ${shimmer} 4s linear infinite;
    opacity: 0.7;
  }
  
  span {
    font-size: 0.65rem;
    opacity: 0.9;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: -2px;
  }
`;

export const LevelInfo = styled.div`
  margin-left: 1rem;
  flex: 1;
`;

export const LevelName = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  font-weight: 500;
`;

export const LevelDescription = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
`;

export const LevelProgress = styled.div`
  margin-top: 0.75rem;
`;

export const NextLevelContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 0.5rem;
`;

// --- Achievement Components ---
export const AchievementGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;

export const AchievementItem = styled(motion.div)<{ unlocked: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  
  .achievement-icon {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: ${props => props.unlocked ? 
      'linear-gradient(135deg, #00ffff, #7851a9)' : 
      'rgba(255, 255, 255, 0.1)'
    };
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.5rem;
    transition: all 0.3s ease;
    position: relative;
    opacity: ${props => props.unlocked ? 1 : 0.5};
    box-shadow: ${props => props.unlocked ? 
      '0 5px 15px rgba(0, 0, 0, 0.3)' : 
      'none'
    };
    
    ${props => props.unlocked && css`
      animation: ${pulse} 2s infinite ease-in-out;
    `}
    
    svg {
      color: ${props => props.unlocked ? 'white' : 'rgba(255, 255, 255, 0.5)'};
      width: 30px;
      height: 30px;
    }
    
    &::after {
      content: '';
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      border-radius: 50%;
      background: linear-gradient(to right, #00ffff, #7851a9, #00ffff);
      background-size: 200% auto;
      z-index: -1;
      opacity: ${props => props.unlocked ? 0.7 : 0};
      animation: ${shimmer} 4s linear infinite;
    }
  }
  
  .achievement-name {
    font-size: 0.8rem;
    font-weight: 500;
    margin: 0;
    color: ${props => props.unlocked ? 'white' : 'rgba(255, 255, 255, 0.5)'};
  }
  
  &:hover {
    .achievement-icon {
      transform: ${props => props.unlocked ? 'scale(1.1)' : 'scale(1.05)'};
    }
  }
`;

// --- Exercise Components ---
export const ExerciseRow = styled.div`
  display: flex;
  align-items: center;
  padding: 0.75rem;
  border-radius: 8px;
  margin-bottom: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }
`;

export const ExerciseIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: rgba(0, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  
  svg {
    color: #00ffff;
    width: 20px;
    height: 20px;
  }
`;

export const ExerciseInfo = styled.div`
  flex: 1;
`;

export const ExerciseName = styled.h4`
  margin: 0;
  font-size: 0.95rem;
  font-weight: 500;
`;

export const ExerciseDetails = styled.div`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 0.25rem;
  display: flex;
  gap: 1rem;
  
  span {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    
    svg {
      width: 14px;
      height: 14px;
      opacity: 0.7;
    }
  }
`;

export const ExerciseLevel = styled.div<{ level: number }>`
  font-size: 0.75rem;
  background: ${props => 
    props.level < 100 ? 'rgba(69, 94, 181, 0.2)' :
    props.level < 250 ? 'rgba(0, 150, 199, 0.2)' :
    props.level < 500 ? 'rgba(0, 184, 148, 0.2)' :
    props.level < 750 ? 'rgba(197, 108, 240, 0.2)' :
    'rgba(253, 56, 114, 0.2)'
  };
  color: ${props => 
    props.level < 100 ? '#5643cc' :
    props.level < 250 ? '#0096c7' :
    props.level < 500 ? '#00a3a3' :
    props.level < 750 ? '#c56cf0' :
    '#fd3872'
  };
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
`;

// --- Stats Card Components ---
export const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-top: 0.5rem;
`;

export const StatCard = styled.div<{ color?: string }>`
  background: ${props => 
    props.color === 'primary' ? 'rgba(0, 115, 255, 0.1)' :
    props.color === 'success' ? 'rgba(0, 184, 148, 0.1)' :
    props.color === 'warning' ? 'rgba(255, 209, 102, 0.1)' :
    props.color === 'info' ? 'rgba(0, 150, 199, 0.1)' :
    props.color === 'secondary' ? 'rgba(120, 81, 169, 0.1)' :
    'rgba(0, 255, 255, 0.1)'
  };
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid ${props => 
    props.color === 'primary' ? 'rgba(0, 115, 255, 0.2)' :
    props.color === 'success' ? 'rgba(0, 184, 148, 0.2)' :
    props.color === 'warning' ? 'rgba(255, 209, 102, 0.2)' :
    props.color === 'info' ? 'rgba(0, 150, 199, 0.2)' :
    props.color === 'secondary' ? 'rgba(120, 81, 169, 0.2)' :
    'rgba(0, 255, 255, 0.2)'
  };
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-3px);
  }
`;

export const StatValue = styled(Typography)<{ color?: string }>`
  font-size: 1.8rem !important;
  font-weight: 600 !important;
  margin: 0 !important;
  background: ${props => 
    props.color === 'primary' ? 'linear-gradient(135deg, #0073ff, #00c6ff)' :
    props.color === 'success' ? 'linear-gradient(135deg, #00bf8f, #00dfa2)' :
    props.color === 'warning' ? 'linear-gradient(135deg, #ffd166, #ffaa33)' :
    props.color === 'info' ? 'linear-gradient(135deg, #0096c7, #48cae4)' :
    props.color === 'secondary' ? 'linear-gradient(135deg, #7851a9, #a142f5)' :
    'linear-gradient(135deg, #00ffff, #7851a9)'
  };
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  text-align: center;
`;

export const StatLabel = styled(Typography)`
  font-size: 0.85rem !important;
  color: rgba(255, 255, 255, 0.7) !important;
  margin-top: 0.25rem !important;
  text-align: center;
`;

// --- Animation Variants ---
export const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { 
      when: "beforeChildren",
      staggerChildren: 0.1,
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
      delay: custom * 0.1,
      type: "spring",
      stiffness: 100,
      damping: 10
    }
  })
};