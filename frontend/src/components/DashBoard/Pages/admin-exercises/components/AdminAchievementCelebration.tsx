/**
 * AdminAchievementCelebration.tsx
 * ===============================
 * 
 * Epic achievement celebration animation for admin gamification
 * Ultra-smooth particles, confetti, and level-up sequences
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Features:
 * - Spectacular confetti and particle effects
 * - Level-up celebration sequences
 * - Streak flame animations
 * - Mobile-optimized performance
 * - Accessibility-first design (WCAG AA compliant)
 * - GPU-accelerated animations
 * - Auto-dismiss with manual controls
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { 
  Award, Crown, Star, Flame, Zap, Target, 
  Trophy, Medal, CheckCircle, X, Sparkles,
  TrendingUp, Users, Calendar, Shield
} from 'lucide-react';

import { exerciseCommandTheme, mediaQueries } from '../styles/exerciseCommandTheme';
import { 
  achievementUnlock,
  confettiParticle,
  levelUpSequence,
  streakFlame,
  confettiExplosion,
  levelUpCelebration,
  motionVariants,
  accessibleAnimation,
  animationPerformance
} from '../styles/gamificationAnimations';

// === STYLED COMPONENTS ===

const CelebrationOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: ${exerciseCommandTheme.zIndex.toast};
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${exerciseCommandTheme.spacing.lg};
  
  ${mediaQueries.mobile} {
    padding: ${exerciseCommandTheme.spacing.md};
  }
`;

const CelebrationContainer = styled(motion.div)`
  position: relative;
  max-width: 500px;
  width: 100%;
  background: ${exerciseCommandTheme.gradients.exerciseCard};
  backdrop-filter: blur(20px);
  border: 2px solid rgba(59, 130, 246, 0.3);
  border-radius: ${exerciseCommandTheme.borderRadius.xl};
  overflow: hidden;
  pointer-events: auto;
  
  /* Epic glow effect */
  box-shadow: 
    0 0 40px rgba(59, 130, 246, 0.4),
    0 0 80px rgba(0, 255, 255, 0.2),
    0 20px 40px rgba(0, 0, 0, 0.3);
  
  /* Animated border */
  &::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: ${exerciseCommandTheme.gradients.achievementGlow};
    border-radius: ${exerciseCommandTheme.borderRadius.xl};
    z-index: -1;
    animation: ${streakFlame} 3s ease-in-out infinite;
  }
  
  ${mediaQueries.mobile} {
    max-width: 90vw;
  }
  
  ${animationPerformance}
  ${accessibleAnimation}
`;

const CelebrationHeader = styled.div`
  background: ${exerciseCommandTheme.gradients.commandCenter};
  color: ${exerciseCommandTheme.colors.deepSpace};
  padding: ${exerciseCommandTheme.spacing.xl};
  text-align: center;
  position: relative;
  overflow: hidden;
  
  /* Celebration particles background */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.3) 2px, transparent 2px),
      radial-gradient(circle at 60% 70%, rgba(255, 255, 255, 0.2) 1px, transparent 1px),
      radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.25) 1.5px, transparent 1.5px);
    background-size: 50px 50px, 30px 30px, 40px 40px;
    animation: ${confettiParticle} 6s ease-in-out infinite;
    opacity: 0.6;
  }
  
  ${mediaQueries.mobile} {
    padding: ${exerciseCommandTheme.spacing.lg};
  }
`;

const AchievementIcon = styled(motion.div)<{ tier: 'bronze' | 'silver' | 'gold' | 'platinum' }>`
  width: 80px;
  height: 80px;
  border-radius: ${exerciseCommandTheme.borderRadius.full};
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto ${exerciseCommandTheme.spacing.lg};
  font-size: 2rem;
  position: relative;
  z-index: 1;
  
  background: ${props => {
    switch (props.tier) {
      case 'bronze': return 'linear-gradient(135deg, #cd7f32 0%, #8b4513 100%)';
      case 'silver': return 'linear-gradient(135deg, #c0c0c0 0%, #808080 100%)';
      case 'gold': return 'linear-gradient(135deg, #ffd700 0%, #b8860b 100%)';
      case 'platinum': return 'linear-gradient(135deg, #e5e4e2 0%, #a0a0a0 100%)';
      default: return exerciseCommandTheme.gradients.buttonPrimary;
    }
  }};
  
  box-shadow: 
    0 0 30px rgba(255, 215, 0, 0.5),
    inset 0 2px 10px rgba(255, 255, 255, 0.3);
  
  animation: ${achievementUnlock} 1s ease-out;
  
  /* Floating sparkles */
  &::before,
  &::after {
    content: '✨';
    position: absolute;
    font-size: 1rem;
    opacity: 0.8;
    animation: ${confettiParticle} 4s ease-in-out infinite;
  }
  
  &::before {
    top: -10px;
    left: -10px;
    animation-delay: 0s;
  }
  
  &::after {
    bottom: -10px;
    right: -10px;
    animation-delay: 2s;
  }
  
  ${mediaQueries.mobile} {
    width: 64px;
    height: 64px;
    font-size: 1.5rem;
    
    &::before,
    &::after {
      font-size: 0.8rem;
    }
  }
`;

const AchievementTitle = styled(motion.h2)`
  font-size: ${exerciseCommandTheme.typography.fontSizes['2xl']};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.bold};
  margin-bottom: ${exerciseCommandTheme.spacing.sm};
  color: ${exerciseCommandTheme.colors.deepSpace};
  position: relative;
  z-index: 1;
  
  ${mediaQueries.mobile} {
    font-size: ${exerciseCommandTheme.typography.fontSizes.xl};
  }
`;

const AchievementSubtitle = styled(motion.p)`
  font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  color: rgba(10, 10, 15, 0.8);
  margin-bottom: ${exerciseCommandTheme.spacing.lg};
  position: relative;
  z-index: 1;
  
  ${mediaQueries.mobile} {
    font-size: ${exerciseCommandTheme.typography.fontSizes.xs};
  }
`;

const TierBadge = styled(motion.div)<{ tier: 'bronze' | 'silver' | 'gold' | 'platinum' }>`
  display: inline-flex;
  align-items: center;
  gap: ${exerciseCommandTheme.spacing.xs};
  padding: ${exerciseCommandTheme.spacing.xs} ${exerciseCommandTheme.spacing.md};
  border-radius: ${exerciseCommandTheme.borderRadius.badge};
  font-size: ${exerciseCommandTheme.typography.fontSizes.xs};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.bold};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: relative;
  z-index: 1;
  
  background: ${props => {
    switch (props.tier) {
      case 'bronze': return 'rgba(205, 127, 50, 0.2)';
      case 'silver': return 'rgba(192, 192, 192, 0.2)';
      case 'gold': return 'rgba(255, 215, 0, 0.2)';
      case 'platinum': return 'rgba(229, 228, 226, 0.2)';
      default: return 'rgba(59, 130, 246, 0.2)';
    }
  }};
  
  color: ${props => {
    switch (props.tier) {
      case 'bronze': return '#8b4513';
      case 'silver': return '#808080';
      case 'gold': return '#b8860b';
      case 'platinum': return '#6b7280';
      default: return exerciseCommandTheme.colors.stellarBlue;
    }
  }};
  
  border: 1px solid ${props => {
    switch (props.tier) {
      case 'bronze': return 'rgba(205, 127, 50, 0.3)';
      case 'silver': return 'rgba(192, 192, 192, 0.3)';
      case 'gold': return 'rgba(255, 215, 0, 0.3)';
      case 'platinum': return 'rgba(229, 228, 226, 0.3)';
      default: return 'rgba(59, 130, 246, 0.3)';
    }
  }};
`;

const CelebrationContent = styled.div`
  padding: ${exerciseCommandTheme.spacing.xl};
  text-align: center;
  
  ${mediaQueries.mobile} {
    padding: ${exerciseCommandTheme.spacing.lg};
  }
`;

const AchievementDescription = styled(motion.p)`
  font-size: ${exerciseCommandTheme.typography.fontSizes.base};
  line-height: ${exerciseCommandTheme.typography.lineHeights.relaxed};
  color: ${exerciseCommandTheme.colors.secondaryText};
  margin-bottom: ${exerciseCommandTheme.spacing.xl};
  
  ${mediaQueries.mobile} {
    font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  }
`;

const RewardSection = styled(motion.div)`
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: ${exerciseCommandTheme.borderRadius.lg};
  padding: ${exerciseCommandTheme.spacing.lg};
  margin-bottom: ${exerciseCommandTheme.spacing.xl};
`;

const RewardTitle = styled.h3`
  font-size: ${exerciseCommandTheme.typography.fontSizes.lg};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.semibold};
  color: ${exerciseCommandTheme.colors.primaryText};
  margin-bottom: ${exerciseCommandTheme.spacing.md};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${exerciseCommandTheme.spacing.sm};
  
  ${mediaQueries.mobile} {
    font-size: ${exerciseCommandTheme.typography.fontSizes.base};
  }
`;

const RewardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: ${exerciseCommandTheme.spacing.lg};
  
  ${mediaQueries.mobile} {
    grid-template-columns: repeat(2, 1fr);
    gap: ${exerciseCommandTheme.spacing.md};
  }
`;

const RewardItem = styled(motion.div)`
  text-align: center;
`;

const RewardValue = styled.div`
  font-size: ${exerciseCommandTheme.typography.fontSizes.xl};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.bold};
  color: ${exerciseCommandTheme.colors.stellarBlue};
  margin-bottom: ${exerciseCommandTheme.spacing.xs};
  
  ${mediaQueries.mobile} {
    font-size: ${exerciseCommandTheme.typography.fontSizes.lg};
  }
`;

const RewardLabel = styled.div`
  font-size: ${exerciseCommandTheme.typography.fontSizes.xs};
  color: ${exerciseCommandTheme.colors.secondaryText};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${exerciseCommandTheme.spacing.md};
  justify-content: center;
  
  ${mediaQueries.mobile} {
    flex-direction: column;
    gap: ${exerciseCommandTheme.spacing.sm};
  }
`;

const ActionButton = styled(motion.button)<{ variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${exerciseCommandTheme.spacing.sm};
  padding: ${exerciseCommandTheme.spacing.md} ${exerciseCommandTheme.spacing.xl};
  border: none;
  border-radius: ${exerciseCommandTheme.borderRadius.button};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.semibold};
  font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  cursor: pointer;
  transition: all ${exerciseCommandTheme.transitions.base};
  
  background: ${props => 
    props.variant === 'secondary' 
      ? 'rgba(30, 58, 138, 0.2)' 
      : exerciseCommandTheme.gradients.buttonPrimary
  };
  
  color: ${props => 
    props.variant === 'secondary' 
      ? exerciseCommandTheme.colors.primaryText 
      : exerciseCommandTheme.colors.stellarWhite
  };
  
  &:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: ${exerciseCommandTheme.shadows.buttonElevation};
  }
  
  &:active {
    transform: translateY(0) scale(0.98);
  }
  
  ${mediaQueries.mobile} {
    width: 100%;
  }
  
  ${animationPerformance}
`;

const CloseButton = styled(motion.button)`
  position: absolute;
  top: ${exerciseCommandTheme.spacing.lg};
  right: ${exerciseCommandTheme.spacing.lg};
  width: 36px;
  height: 36px;
  border-radius: ${exerciseCommandTheme.borderRadius.full};
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: ${exerciseCommandTheme.colors.stellarWhite};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all ${exerciseCommandTheme.transitions.base};
  z-index: 2;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }
  
  ${mediaQueries.mobile} {
    top: ${exerciseCommandTheme.spacing.md};
    right: ${exerciseCommandTheme.spacing.md};
    width: 32px;
    height: 32px;
  }
`;

// Confetti Particles
const ConfettiContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
`;

const ConfettiParticle = styled(motion.div)<{ 
  color: string; 
  size: number; 
  initialX: number; 
  initialY: number 
}>`
  position: absolute;
  width: ${props => props.size}px;
  height: ${props => props.size}px;
  background: ${props => props.color};
  border-radius: 50%;
  left: ${props => props.initialX}%;
  top: ${props => props.initialY}%;
`;

// === INTERFACES ===

interface AdminAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  pointValue: number;
  xpValue?: number;
  unlockedAt?: string;
}

interface AdminAchievementCelebrationProps {
  achievement: AdminAchievement;
  isVisible: boolean;
  onClose: () => void;
  onShare?: () => void;
  className?: string;
}

// === UTILITY FUNCTIONS ===

const getAchievementIcon = (achievementId: string): React.ReactNode => {
  switch (achievementId) {
    case 'first_exercise': return <Target size={32} />;
    case 'exercise_architect': return <Award size={32} />;
    case 'video_master': return <Trophy size={32} />;
    case 'nasm_guardian': return <Shield size={32} />;
    case 'community_builder': return <Users size={32} />;
    case 'consistency_king': return <Flame size={32} />;
    case 'exercise_legend': return <Crown size={32} />;
    default: return <Star size={32} />;
  }
};

const getTierIcon = (tier: 'bronze' | 'silver' | 'gold' | 'platinum'): React.ReactNode => {
  switch (tier) {
    case 'bronze': return <Medal size={14} />;
    case 'silver': return <Award size={14} />;
    case 'gold': return <Trophy size={14} />;
    case 'platinum': return <Crown size={14} />;
    default: return <Star size={14} />;
  }
};

const generateConfettiColors = (): string[] => [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
];

// === MAIN COMPONENT ===

const AdminAchievementCelebration: React.FC<AdminAchievementCelebrationProps> = ({
  achievement,
  isVisible,
  onClose,
  onShare,
  className
}) => {
  const [showConfetti, setShowConfetti] = useState(true);
  const [confettiParticles, setConfettiParticles] = useState<Array<{
    id: number;
    color: string;
    size: number;
    x: number;
    y: number;
  }>>([]);
  
  const autoCloseTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Generate confetti particles
  const generateConfetti = useCallback(() => {
    const colors = generateConfettiColors();
    const particles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      x: Math.random() * 100,
      y: Math.random() * 20
    }));
    setConfettiParticles(particles);
  }, []);
  
  // Handle share
  const handleShare = useCallback(() => {
    if (onShare) {
      onShare();
    } else {
      // Default share behavior
      if (navigator.share) {
        navigator.share({
          title: `Achievement Unlocked: ${achievement.name}`,
          text: achievement.description,
          url: window.location.href
        });
      }
    }
  }, [achievement, onShare]);
  
  // Auto-close after 8 seconds
  useEffect(() => {
    if (isVisible) {
      generateConfetti();
      
      // Auto-close timer
      autoCloseTimeoutRef.current = setTimeout(() => {
        onClose();
      }, 8000);
      
      // Hide confetti after 4 seconds
      setTimeout(() => {
        setShowConfetti(false);
      }, 4000);
    }
    
    return () => {
      if (autoCloseTimeoutRef.current) {
        clearTimeout(autoCloseTimeoutRef.current);
      }
    };
  }, [isVisible, onClose, generateConfetti]);
  
  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, onClose]);
  
  if (!isVisible) return null;
  
  return (
    <CelebrationOverlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={className}
    >
      {/* Confetti Particles */}
      <AnimatePresence>
        {showConfetti && (
          <ConfettiContainer>
            {confettiParticles.map((particle) => (
              <ConfettiParticle
                key={particle.id}
                color={particle.color}
                size={particle.size}
                initialX={particle.x}
                initialY={particle.y}
                initial={{ 
                  opacity: 0,
                  y: -20,
                  x: 0,
                  rotate: 0,
                  scale: 0
                }}
                animate={{ 
                  opacity: [0, 1, 1, 0],
                  y: [0, 100, 200, 300],
                  x: [0, Math.random() * 200 - 100, Math.random() * 400 - 200],
                  rotate: [0, 180, 360, 540],
                  scale: [0, 1, 1, 0.5]
                }}
                transition={{
                  duration: 4,
                  ease: "easeOut",
                  delay: Math.random() * 2
                }}
              />
            ))}
          </ConfettiContainer>
        )}
      </AnimatePresence>
      
      <CelebrationContainer
        initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        exit={{ scale: 0.9, opacity: 0, rotate: 5 }}
        transition={{ 
          type: "spring",
          damping: 20,
          stiffness: 300,
          duration: 0.8
        }}
      >
        <CloseButton
          onClick={onClose}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Close celebration"
        >
          <X size={18} />
        </CloseButton>
        
        {/* Header */}
        <CelebrationHeader>
          <AchievementIcon tier={achievement.tier}>
            {achievement.icon || getAchievementIcon(achievement.id)}
          </AchievementIcon>
          
          <TierBadge 
            tier={achievement.tier}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
          >
            {getTierIcon(achievement.tier)}
            {achievement.tier}
          </TierBadge>
          
          <AchievementTitle
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {achievement.name}
          </AchievementTitle>
          
          <AchievementSubtitle
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Achievement Unlocked!
          </AchievementSubtitle>
        </CelebrationHeader>
        
        {/* Content */}
        <CelebrationContent>
          <AchievementDescription
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {achievement.description}
          </AchievementDescription>
          
          {/* Rewards */}
          <RewardSection
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <RewardTitle>
              <Sparkles size={20} />
              Rewards Earned
            </RewardTitle>
            
            <RewardGrid>
              <RewardItem
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: "spring" }}
              >
                <RewardValue>+{achievement.pointValue}</RewardValue>
                <RewardLabel>Points</RewardLabel>
              </RewardItem>
              
              {achievement.xpValue && (
                <RewardItem
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.9, type: "spring" }}
                >
                  <RewardValue>+{achievement.xpValue}</RewardValue>
                  <RewardLabel>Experience</RewardLabel>
                </RewardItem>
              )}
              
              <RewardItem
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.0, type: "spring" }}
              >
                <RewardValue>
                  <Trophy size={20} />
                </RewardValue>
                <RewardLabel>Badge</RewardLabel>
              </RewardItem>
              
              <RewardItem
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.1, type: "spring" }}
              >
                <RewardValue>
                  <TrendingUp size={20} />
                </RewardValue>
                <RewardLabel>Status</RewardLabel>
              </RewardItem>
            </RewardGrid>
          </RewardSection>
          
          {/* Action Buttons */}
          <ActionButtons>
            <ActionButton
              variant="primary"
              onClick={handleShare}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <Star size={16} />
              Share Achievement
            </ActionButton>
            
            <ActionButton
              variant="secondary"
              onClick={onClose}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.3 }}
            >
              <CheckCircle size={16} />
              Continue
            </ActionButton>
          </ActionButtons>
        </CelebrationContent>
      </CelebrationContainer>
    </CelebrationOverlay>
  );
};

export default AdminAchievementCelebration;
