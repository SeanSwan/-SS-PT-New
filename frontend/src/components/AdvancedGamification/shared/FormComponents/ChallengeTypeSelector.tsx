/**
 * 🎯 CHALLENGE TYPE SELECTOR - ADMIN FORM COMPONENT
 * =================================================
 * Interactive challenge type picker with visual cards and descriptions
 * for admin challenge creation workflow
 */

import React, { useState } from 'react';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  CalendarDays, 
  CalendarRange,
  Star,
  Users,
  Clock,
  Target,
  Zap
} from 'lucide-react';
import type { ChallengeType } from '../../types/challenge.types';

// ================================================================
// TYPES AND INTERFACES
// ================================================================

interface ChallengeTypeOption {
  type: ChallengeType;
  label: string;
  description: string;
  icon: React.ReactNode;
  duration: string;
  difficulty: string;
  color: string;
  examples: string[];
  pros: string[];
  cons: string[];
}

export interface ChallengeTypeSelectorProps {
  value: ChallengeType | null;
  onChange: (type: ChallengeType) => void;
  onTypeInfo?: (type: ChallengeType) => void;
  disabled?: boolean;
  showDetails?: boolean;
  className?: string;
  label?: string;
  error?: string;
  required?: boolean;
}

// ================================================================
// CHALLENGE TYPE OPTIONS
// ================================================================

const challengeTypeOptions: ChallengeTypeOption[] = [
  {
    type: 'daily',
    label: 'Daily Challenge',
    description: 'Short-term daily goals that reset every 24 hours',
    icon: <Calendar size={24} />,
    duration: '1 day',
    difficulty: 'Beginner-friendly',
    color: '#00ff88',
    examples: ['10,000 steps today', 'Complete one workout', 'Log your meals'],
    pros: ['Easy to complete', 'Builds daily habits', 'High participation'],
    cons: ['Lower XP rewards', 'Can become repetitive']
  },
  {
    type: 'weekly',
    label: 'Weekly Challenge',
    description: 'Medium-term challenges spanning 7 days with progressive goals',
    icon: <CalendarDays size={24} />,
    duration: '7 days',
    difficulty: 'Moderate',
    color: '#00ffff',
    examples: ['5 workouts this week', 'Burn 2000 calories', 'Try 3 new exercises'],
    pros: ['Balanced commitment', 'Good XP rewards', 'Flexible timing'],
    cons: ['Requires consistency', 'Mid-week dropoffs']
  },
  {
    type: 'monthly',
    label: 'Monthly Challenge',
    description: 'Long-term challenges with substantial goals and high rewards',
    icon: <CalendarRange size={24} />,
    duration: '30 days',
    difficulty: 'Advanced',
    color: '#7d5fff',
    examples: ['Lose 5 pounds', '20 workout sessions', 'Master a skill'],
    pros: ['High XP rewards', 'Significant results', 'Achievement prestige'],
    cons: ['High commitment', 'Lower completion rates']
  },
  {
    type: 'special',
    label: 'Special Event',
    description: 'Limited-time themed challenges with unique rewards',
    icon: <Star size={24} />,
    duration: '3-21 days',
    difficulty: 'Variable',
    color: '#ffd700',
    examples: ['Summer Shred', 'New Year Reset', 'Holiday Challenge'],
    pros: ['Exclusive rewards', 'Community excitement', 'Themed content'],
    cons: ['Limited availability', 'FOMO pressure']
  },
  {
    type: 'community',
    label: 'Community Challenge',
    description: 'Collaborative challenges where users work together toward goals',
    icon: <Users size={24} />,
    duration: '7-14 days',
    difficulty: 'Social',
    color: '#ff6b6b',
    examples: ['Team weight loss', 'Group workout hours', 'Social fitness goals'],
    pros: ['Social engagement', 'Teamwork motivation', 'Shared success'],
    cons: ['Depends on others', 'Complex tracking']
  }
];

// ================================================================
// STYLED COMPONENTS
// ================================================================

const SelectorContainer = styled.div`
  width: 100%;
`;

const SelectorLabel = styled.label<{ $required?: boolean }>`
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

const TypeGrid = styled.div<{ $showDetails: boolean }>`
  display: grid;
  gap: 1rem;
  
  ${({ $showDetails }) => $showDetails ? css`
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  ` : css`
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  `}
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
`;

const TypeCard = styled(motion.div)<{
  $isSelected: boolean;
  $isDisabled: boolean;
  $color: string;
}>`
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid ${({ $isSelected, $color }) => 
    $isSelected ? $color : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 16px;
  padding: 1.5rem;
  cursor: ${({ $isDisabled }) => $isDisabled ? 'not-allowed' : 'pointer'};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  
  ${({ $isSelected, $color }) => $isSelected && css`
    background: ${$color}08;
    box-shadow: 0 0 30px ${$color}30;
  `}
  
  ${({ $isDisabled }) => $isDisabled && css`
    opacity: 0.6;
    filter: grayscale(0.5);
  `}
  
  &:hover:not([disabled]) {
    border-color: ${({ $color }) => $color};
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  }
  
  @media (max-width: 768px) {
    padding: 1.25rem;
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const IconContainer = styled.div<{ $color: string }>`
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

const CardContent = styled.div`
  flex: 1;
`;

const TypeLabel = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: #ffffff;
`;

const TypeMeta = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
  
  @media (max-width: 480px) {
    flex-direction: column;
    gap: 0.25rem;
  }
`;

const MetaItem = styled.span<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: ${({ $color }) => $color};
  font-weight: 500;
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

const TypeDescription = styled.p`
  margin: 0;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.4;
`;

const DetailsSection = styled(motion.div)`
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const DetailsList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;

const DetailsGroup = styled.div`
  h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #ffffff;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    
    li {
      padding: 0.25rem 0;
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.7);
      position: relative;
      padding-left: 1rem;
      
      &::before {
        content: '•';
        position: absolute;
        left: 0;
        color: #00ffff;
      }
    }
  }
`;

const SelectionIndicator = styled(motion.div)<{ $color: string }>`
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    width: 14px;
    height: 14px;
    color: #000;
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

const cardVariants = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" }
  },
  hover: { 
    y: -2,
    transition: { duration: 0.2 }
  },
  tap: { 
    scale: 0.98,
    transition: { duration: 0.1 }
  }
};

const indicatorVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: { duration: 0.3, ease: "backOut" }
  },
  exit: { 
    scale: 0, 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

const detailsVariants = {
  initial: { opacity: 0, height: 0 },
  animate: { 
    opacity: 1, 
    height: 'auto',
    transition: { duration: 0.3, ease: "easeOut" }
  },
  exit: { 
    opacity: 0, 
    height: 0,
    transition: { duration: 0.2, ease: "easeIn" }
  }
};

// ================================================================
// MAIN COMPONENT
// ================================================================

export const ChallengeTypeSelector: React.FC<ChallengeTypeSelectorProps> = ({
  value,
  onChange,
  onTypeInfo,
  disabled = false,
  showDetails = true,
  className,
  label = 'Challenge Type',
  error,
  required = false
}) => {
  
  const [expandedType, setExpandedType] = useState<ChallengeType | null>(null);
  
  const handleTypeSelect = (type: ChallengeType) => {
    if (disabled) return;
    
    onChange(type);
    
    // Toggle details for the selected type
    if (showDetails) {
      setExpandedType(expandedType === type ? null : type);
    }
    
    // Call info callback if provided
    if (onTypeInfo) {
      onTypeInfo(type);
    }
  };
  
  return (
    <SelectorContainer className={className}>
      {label && (
        <SelectorLabel $required={required}>
          {label}
        </SelectorLabel>
      )}
      
      <TypeGrid $showDetails={showDetails}>
        {challengeTypeOptions.map((option) => {
          const isSelected = value === option.type;
          const isExpanded = expandedType === option.type;
          
          return (
            <TypeCard
              key={option.type}
              $isSelected={isSelected}
              $isDisabled={disabled}
              $color={option.color}
              variants={cardVariants}
              initial="initial"
              animate="animate"
              whileHover={!disabled ? "hover" : undefined}
              whileTap={!disabled ? "tap" : undefined}
              onClick={() => handleTypeSelect(option.type)}
              role="radio"
              aria-checked={isSelected}
              aria-describedby={`type-${option.type}-description`}
              tabIndex={disabled ? -1 : 0}
              onKeyDown={(e) => {
                if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  handleTypeSelect(option.type);
                }
              }}
            >
              <CardHeader>
                <IconContainer $color={option.color}>
                  {option.icon}
                </IconContainer>
                
                <CardContent>
                  <TypeLabel>{option.label}</TypeLabel>
                  <TypeMeta>
                    <MetaItem $color={option.color}>
                      <Clock size={14} />
                      {option.duration}
                    </MetaItem>
                    <MetaItem $color={option.color}>
                      <Target size={14} />
                      {option.difficulty}
                    </MetaItem>
                  </TypeMeta>
                </CardContent>
                
                <AnimatePresence>
                  {isSelected && (
                    <SelectionIndicator
                      $color={option.color}
                      variants={indicatorVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      <Zap size={14} />
                    </SelectionIndicator>
                  )}
                </AnimatePresence>
              </CardHeader>
              
              <TypeDescription id={`type-${option.type}-description`}>
                {option.description}
              </TypeDescription>
              
              {/* Detailed Information */}
              {showDetails && (
                <AnimatePresence>
                  {isExpanded && (
                    <DetailsSection
                      variants={detailsVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      <DetailsList>
                        <DetailsGroup>
                          <h4>Examples</h4>
                          <ul>
                            {option.examples.map((example, index) => (
                              <li key={index}>{example}</li>
                            ))}
                          </ul>
                        </DetailsGroup>
                        
                        <DetailsGroup>
                          <h4>Pros</h4>
                          <ul>
                            {option.pros.map((pro, index) => (
                              <li key={index}>{pro}</li>
                            ))}
                          </ul>
                        </DetailsGroup>
                        
                        <DetailsGroup>
                          <h4>Considerations</h4>
                          <ul>
                            {option.cons.map((con, index) => (
                              <li key={index}>{con}</li>
                            ))}
                          </ul>
                        </DetailsGroup>
                      </DetailsList>
                    </DetailsSection>
                  )}
                </AnimatePresence>
              )}
            </TypeCard>
          );
        })}
      </TypeGrid>
      
      {error && (
        <ErrorMessage role="alert">
          ⚠️ {error}
        </ErrorMessage>
      )}
    </SelectorContainer>
  );
};

export default ChallengeTypeSelector;
