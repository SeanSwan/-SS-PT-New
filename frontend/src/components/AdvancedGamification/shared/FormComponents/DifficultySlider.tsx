/**
 * 🎚️ DIFFICULTY SLIDER - ADMIN FORM COMPONENT
 * ============================================
 * Interactive difficulty selector with visual feedback and descriptions
 * for admin challenge creation workflow
 */

import React, { useState, useRef, useEffect } from 'react';
import styled, { css } from 'styled-components';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { 
  Zap, 
  TrendingUp, 
  Mountain, 
  Crown,
  Target,
  Users,
  Trophy
} from 'lucide-react';
import type { ChallengeDifficulty } from '../../types/challenge.types';

// ================================================================
// TYPES AND INTERFACES
// ================================================================

interface DifficultyLevel {
  value: ChallengeDifficulty;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  backgroundColor: string;
  characteristics: string[];
  targetAudience: string;
  completionRate: string;
  xpMultiplier: string;
}

export interface DifficultySliderProps {
  value: ChallengeDifficulty | null;
  onChange: (difficulty: ChallengeDifficulty) => void;
  onDifficultyInfo?: (difficulty: ChallengeDifficulty) => void;
  disabled?: boolean;
  showDescription?: boolean;
  showStats?: boolean;
  className?: string;
  label?: string;
  error?: string;
  required?: boolean;
  allowFreeForm?: boolean; // Allow sliding to any position vs discrete steps
}

// ================================================================
// DIFFICULTY LEVELS CONFIGURATION
// ================================================================

const difficultyLevels: DifficultyLevel[] = [
  {
    value: 'beginner',
    label: 'Beginner',
    description: 'Perfect for newcomers and those starting their fitness journey',
    icon: <Zap size={20} />,
    color: '#00ff88',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    characteristics: ['Simple goals', 'Low commitment', 'High success rate', 'Encouraging'],
    targetAudience: 'New users, casual fitness enthusiasts',
    completionRate: '85%',
    xpMultiplier: '1.0x'
  },
  {
    value: 'intermediate',
    label: 'Intermediate',
    description: 'For users with some fitness experience looking for moderate challenges',
    icon: <TrendingUp size={20} />,
    color: '#00ffff',
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    characteristics: ['Balanced goals', 'Regular commitment', 'Moderate pace', 'Skill building'],
    targetAudience: 'Regular exercisers, committed users',
    completionRate: '65%',
    xpMultiplier: '1.2x'
  },
  {
    value: 'advanced',
    label: 'Advanced',
    description: 'Challenging goals for experienced fitness enthusiasts',
    icon: <Mountain size={20} />,
    color: '#ffa500',
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    characteristics: ['Complex goals', 'High commitment', 'Skill required', 'Results focused'],
    targetAudience: 'Experienced athletes, dedicated users',
    completionRate: '45%',
    xpMultiplier: '1.5x'
  },
  {
    value: 'expert',
    label: 'Expert',
    description: 'Elite challenges for fitness experts and competitive users',
    icon: <Crown size={20} />,
    color: '#ff4757',
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    characteristics: ['Elite goals', 'Maximum commitment', 'Expert level', 'Prestige'],
    targetAudience: 'Elite athletes, competition prep',
    completionRate: '25%',
    xpMultiplier: '2.0x'
  }
];

// ================================================================
// STYLED COMPONENTS
// ================================================================

const SliderContainer = styled.div`
  width: 100%;
  user-select: none;
`;

const SliderLabel = styled.label<{ $required?: boolean }>`
  display: block;
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 0.75rem;
  
  ${({ $required }) => $required && css`
    &::after {
      content: ' *';
      color: #ff4757;
    }
  `}
`;

const SliderTrack = styled.div<{ $disabled: boolean }>`
  position: relative;
  width: 100%;
  height: 8px;
  background: linear-gradient(
    90deg,
    rgba(0, 255, 136, 0.3) 0%,
    rgba(0, 255, 255, 0.3) 33%,
    rgba(255, 165, 0, 0.3) 66%,
    rgba(255, 71, 87, 0.3) 100%
  );
  border-radius: 4px;
  margin: 2rem 0;
  cursor: ${({ $disabled }) => $disabled ? 'not-allowed' : 'pointer'};
  opacity: ${({ $disabled }) => $disabled ? 0.6 : 1};
`;

const SliderThumb = styled(motion.div)<{ 
  $color: string; 
  $disabled: boolean;
}>`
  position: absolute;
  top: 50%;
  width: 32px;
  height: 32px;
  background: ${({ $color }) => $color};
  border: 3px solid #ffffff;
  border-radius: 50%;
  transform: translateY(-50%);
  cursor: ${({ $disabled }) => $disabled ? 'not-allowed' : 'grab'};
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.3),
    0 0 20px ${({ $color }) => $color}50;
  z-index: 10;
  
  &:active {
    cursor: ${({ $disabled }) => $disabled ? 'not-allowed' : 'grabbing'};
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 12px;
    height: 12px;
    background: #ffffff;
    border-radius: 50%;
    transform: translate(-50%, -50%);
  }
  
  @media (max-width: 768px) {
    width: 40px;
    height: 40px;
    
    &::after {
      width: 14px;
      height: 14px;
    }
  }
`;

const DifficultyMarkers = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  pointer-events: none;
`;

const DifficultyMarker = styled.div<{ 
  $color: string; 
  $isActive: boolean; 
}>`
  width: 12px;
  height: 12px;
  background: ${({ $color, $isActive }) => $isActive ? $color : 'rgba(255, 255, 255, 0.3)'};
  border-radius: 50%;
  transition: all 0.3s ease;
  transform: ${({ $isActive }) => $isActive ? 'scale(1.2)' : 'scale(1)'};
  box-shadow: ${({ $isActive, $color }) => $isActive ? `0 0 10px ${$color}80` : 'none'};
`;

const DifficultyLabels = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding: 0 16px;
`;

const DifficultyLabelItem = styled(motion.div)<{ 
  $isActive: boolean; 
  $color: string; 
}>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  min-width: 0;
  flex: 1;
  
  ${({ $isActive, $color }) => $isActive && css`
    background: ${$color}10;
    transform: scale(1.05);
  `}
  
  &:hover {
    transform: ${({ $isActive }) => $isActive ? 'scale(1.05)' : 'scale(1.02)'};
  }
`;

const LabelIcon = styled.div<{ $color: string; $isActive: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${({ $color, $isActive }) => $isActive ? $color : 'rgba(255, 255, 255, 0.1)'};
  color: ${({ $isActive }) => $isActive ? '#000' : 'rgba(255, 255, 255, 0.7)'};
  transition: all 0.3s ease;
`;

const LabelText = styled.span<{ $isActive: boolean }>`
  font-size: 0.875rem;
  font-weight: ${({ $isActive }) => $isActive ? 600 : 500};
  color: ${({ $isActive }) => $isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)'};
  text-align: center;
  transition: all 0.3s ease;
  
  @media (max-width: 480px) {
    font-size: 0.75rem;
  }
`;

const DifficultyInfo = styled(motion.div)<{ $color: string }>`
  margin-top: 2rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid ${({ $color }) => $color}30;
  border-radius: 16px;
  backdrop-filter: blur(10px);
`;

const InfoHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const InfoIcon = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${({ $color }) => $color}20;
  border: 1px solid ${({ $color }) => $color}40;
  
  svg {
    color: ${({ $color }) => $color};
  }
`;

const InfoContent = styled.div`
  flex: 1;
`;

const InfoTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: #ffffff;
`;

const InfoDescription = styled.p`
  margin: 0;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.4;
`;

const InfoStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  svg {
    color: #00ffff;
    width: 16px;
    height: 16px;
  }
`;

const StatValue = styled.span`
  font-weight: 600;
  color: #ffffff;
`;

const StatLabel = styled.span`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
`;

const InfoList = styled.div`
  margin-top: 1.5rem;
  
  h4 {
    margin: 0 0 0.75rem 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: #ffffff;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    
    li {
      padding: 0.25rem 0.75rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.8);
    }
  }
`;

const ErrorMessage = styled.div`
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #ff4757;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

// ================================================================
// ANIMATION VARIANTS
// ================================================================

const infoVariants = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" }
  },
  exit: { 
    opacity: 0, 
    y: -10, 
    scale: 0.98,
    transition: { duration: 0.2, ease: "easeIn" }
  }
};

const labelVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 }
};

// ================================================================
// MAIN COMPONENT
// ================================================================

export const DifficultySlider: React.FC<DifficultySliderProps> = ({
  value,
  onChange,
  onDifficultyInfo,
  disabled = false,
  showDescription = true,
  showStats = true,
  className,
  label = 'Difficulty Level',
  error,
  required = false,
  allowFreeForm = false
}) => {
  
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbX = useMotionValue(0);
  
  // Get current difficulty info
  const currentDifficulty = value ? difficultyLevels.find(level => level.value === value) : difficultyLevels[0];
  const currentIndex = value ? difficultyLevels.findIndex(level => level.value === value) : 0;
  
  // Calculate thumb position based on current value
  useEffect(() => {
    if (trackRef.current && value) {
      const trackWidth = trackRef.current.offsetWidth - 32; // Account for thumb width
      const index = difficultyLevels.findIndex(level => level.value === value);
      const position = (index / (difficultyLevels.length - 1)) * trackWidth;
      thumbX.set(position);
    }
  }, [value, thumbX]);
  
  // Handle direct difficulty selection
  const handleDifficultySelect = (difficulty: ChallengeDifficulty) => {
    if (disabled) return;
    
    onChange(difficulty);
    
    if (onDifficultyInfo) {
      onDifficultyInfo(difficulty);
    }
  };
  
  // Handle drag
  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled || !trackRef.current) return;
    
    setIsDragging(true);
    
    const trackWidth = trackRef.current.offsetWidth - 32;
    const newX = Math.max(0, Math.min(trackWidth, info.point.x - trackRef.current.offsetLeft - 16));
    
    if (allowFreeForm) {
      thumbX.set(newX);
    } else {
      // Snap to nearest difficulty level
      const segmentWidth = trackWidth / (difficultyLevels.length - 1);
      const nearestIndex = Math.round(newX / segmentWidth);
      const snappedX = nearestIndex * segmentWidth;
      
      thumbX.set(snappedX);
      
      const newDifficulty = difficultyLevels[nearestIndex]?.value;
      if (newDifficulty && newDifficulty !== value) {
        onChange(newDifficulty);
        
        if (onDifficultyInfo) {
          onDifficultyInfo(newDifficulty);
        }
      }
    }
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
  };
  
  // Handle track click
  const handleTrackClick = (event: React.MouseEvent) => {
    if (disabled || !trackRef.current) return;
    
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left - 16; // Account for thumb offset
    const trackWidth = rect.width - 32;
    
    const segmentWidth = trackWidth / (difficultyLevels.length - 1);
    const nearestIndex = Math.round(clickX / segmentWidth);
    const clampedIndex = Math.max(0, Math.min(difficultyLevels.length - 1, nearestIndex));
    
    const selectedDifficulty = difficultyLevels[clampedIndex]?.value;
    if (selectedDifficulty) {
      handleDifficultySelect(selectedDifficulty);
    }
  };
  
  return (
    <SliderContainer className={className}>
      {label && (
        <SliderLabel $required={required}>
          {label}
        </SliderLabel>
      )}
      
      <SliderTrack 
        ref={trackRef}
        $disabled={disabled}
        onClick={handleTrackClick}
      >
        {/* Difficulty markers */}
        <DifficultyMarkers>
          {difficultyLevels.map((level, index) => (
            <DifficultyMarker
              key={level.value}
              $color={level.color}
              $isActive={currentIndex >= index}
            />
          ))}
        </DifficultyMarkers>
        
        {/* Thumb */}
        <SliderThumb
          $color={currentDifficulty?.color || difficultyLevels[0].color}
          $disabled={disabled}
          style={{ x: thumbX }}
          drag={!disabled ? "x" : false}
          dragConstraints={trackRef}
          dragElastic={0}
          dragMomentum={false}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          whileHover={!disabled ? { scale: 1.1 } : {}}
          whileDrag={{ scale: 1.2 }}
          whileTap={{ scale: 1.1 }}
        />
      </SliderTrack>
      
      {/* Difficulty labels */}
      <DifficultyLabels>
        {difficultyLevels.map((level) => {
          const isActive = value === level.value;
          
          return (
            <DifficultyLabelItem
              key={level.value}
              $isActive={isActive}
              $color={level.color}
              variants={labelVariants}
              whileHover={!disabled ? "hover" : undefined}
              whileTap={!disabled ? "tap" : undefined}
              onClick={() => handleDifficultySelect(level.value)}
              role="radio"
              aria-checked={isActive}
              tabIndex={disabled ? -1 : 0}
              onKeyDown={(e) => {
                if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  handleDifficultySelect(level.value);
                }
              }}
            >
              <LabelIcon $color={level.color} $isActive={isActive}>
                {level.icon}
              </LabelIcon>
              <LabelText $isActive={isActive}>
                {level.label}
              </LabelText>
            </DifficultyLabelItem>
          );
        })}
      </DifficultyLabels>
      
      {/* Difficulty information */}
      {showDescription && currentDifficulty && (
        <DifficultyInfo
          key={currentDifficulty.value}
          $color={currentDifficulty.color}
          variants={infoVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <InfoHeader>
            <InfoIcon $color={currentDifficulty.color}>
              {currentDifficulty.icon}
            </InfoIcon>
            <InfoContent>
              <InfoTitle>{currentDifficulty.label} Difficulty</InfoTitle>
              <InfoDescription>{currentDifficulty.description}</InfoDescription>
            </InfoContent>
          </InfoHeader>
          
          {showStats && (
            <InfoStats>
              <StatItem>
                <Users />
                <div>
                  <StatValue>{currentDifficulty.completionRate}</StatValue>
                  <StatLabel> completion rate</StatLabel>
                </div>
              </StatItem>
              
              <StatItem>
                <Trophy />
                <div>
                  <StatValue>{currentDifficulty.xpMultiplier}</StatValue>
                  <StatLabel> XP multiplier</StatLabel>
                </div>
              </StatItem>
              
              <StatItem>
                <Target />
                <div>
                  <StatLabel>{currentDifficulty.targetAudience}</StatLabel>
                </div>
              </StatItem>
            </InfoStats>
          )}
          
          <InfoList>
            <h4>Key Characteristics</h4>
            <ul>
              {currentDifficulty.characteristics.map((characteristic, index) => (
                <li key={index}>{characteristic}</li>
              ))}
            </ul>
          </InfoList>
        </DifficultyInfo>
      )}
      
      {error && (
        <ErrorMessage role="alert">
          ⚠️ {error}
        </ErrorMessage>
      )}
    </SliderContainer>
  );
};

export default DifficultySlider;
