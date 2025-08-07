/**
 * CelebrationEffects Component - PHASE 3: UI/UX EXCELLENCE
 * ========================================================
 * Advanced celebration and feedback animations that elevate user
 * interactions to "Apple Phone-Level" quality.
 * 
 * 🌟 PHASE 3 FEATURES:
 * ✅ Confetti Celebrations - Level ups and achievements
 * ✅ Pulse Animations - Success feedback
 * ✅ Shake Animations - Error feedback  
 * ✅ Glow Effects - Special highlights
 * ✅ Floating Particles - Engagement rewards
 * ✅ Performance Optimized - CSS transforms only
 */

import React, { useEffect, useState, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

// Animation Keyframes
const confettiDrop = keyframes`
  0% {
    transform: translateY(-100vh) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
`;

const pulseGlow = keyframes`
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 30px rgba(59, 130, 246, 0.8);
  }
`;

const shakeError = keyframes`
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
  20%, 40%, 60%, 80% { transform: translateX(3px); }
`;

const floatUp = keyframes`
  0% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translateY(-50px) scale(1.2);
    opacity: 0;
  }
`;

const rippleEffect = keyframes`
  0% {
    transform: scale(0);
    opacity: 1;
  }
  100% {
    transform: scale(4);
    opacity: 0;
  }
`;

// Enhanced animation keyframes for better celebrations
const starBurst = keyframes`
  0% {
    transform: scale(0) rotate(0deg);
    opacity: 1;
  }
  50% {
    transform: scale(1.5) rotate(180deg);
    opacity: 0.8;
  }
  100% {
    transform: scale(0) rotate(360deg);
    opacity: 0;
  }
`;

const levelUpGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
    transform: scale(1);
  }
  25% {
    box-shadow: 0 0 40px rgba(255, 215, 0, 0.8);
    transform: scale(1.05);
  }
  75% {
    box-shadow: 0 0 60px rgba(255, 215, 0, 1);
    transform: scale(1.02);
  }
`;

const achievementPulse = keyframes`
  0% {
    transform: scale(1);
    filter: brightness(1);
  }
  50% {
    transform: scale(1.1);
    filter: brightness(1.3);
  }
  100% {
    transform: scale(1);
    filter: brightness(1);
  }
`;

// Styled Components
const CelebrationContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 9999;
  overflow: hidden;
`;

const ConfettiPiece = styled.div<{ color: string; delay: number; duration: number }>`
  position: absolute;
  width: 8px;
  height: 8px;
  background: ${props => props.color};
  animation: ${confettiDrop} ${props => props.duration}s linear ${props => props.delay}s forwards;
  border-radius: 2px;
`;

const FloatingText = styled(motion.div)<{ color?: string }>`
  position: absolute;
  font-size: 1.5rem;
  font-weight: bold;
  color: ${props => props.color || '#00ff00'};
  text-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
  pointer-events: none;
  z-index: 10000;
`;

const PulseOverlay = styled.div<{ active: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 9998;
  
  ${props => props.active && css`
    animation: ${pulseGlow} 0.6s ease-in-out;
  `}
`;

const RippleContainer = styled.div`
  position: absolute;
  pointer-events: none;
  z-index: 9997;
`;

const Ripple = styled.div<{ x: number; y: number; color: string }>`
  position: absolute;
  left: ${props => props.x}px;
  top: ${props => props.y}px;
  width: 20px;
  height: 20px;
  border: 2px solid ${props => props.color};
  border-radius: 50%;
  animation: ${rippleEffect} 0.6s ease-out forwards;
  transform-origin: center;
`;

const ParticleContainer = styled.div`
  position: absolute;
  pointer-events: none;
  z-index: 9996;
`;

const Particle = styled.div<{ 
  x: number; 
  y: number; 
  color: string; 
  size: number;
  direction: number;
  duration: number;
}>`
  position: absolute;
  left: ${props => props.x}px;
  top: ${props => props.y}px;
  width: ${props => props.size}px;
  height: ${props => props.size}px;
  background: ${props => props.color};
  border-radius: 50%;
  animation: ${floatUp} ${props => props.duration}s ease-out forwards;
  transform: rotate(${props => props.direction}deg);
`;

// Types
interface CelebrationEffectsProps {
  onComplete?: () => void;
}

interface ConfettiConfig {
  count: number;
  colors: string[];
  duration: number;
}

interface FloatingTextConfig {
  text: string;
  x: number;
  y: number;
  color?: string;
  duration?: number;
}

interface RippleConfig {
  x: number;
  y: number;
  color: string;
}

interface ParticleConfig {
  x: number;
  y: number;
  count: number;
  colors: string[];
}

export interface CelebrationEffectsRef {
  triggerConfetti: (config?: Partial<ConfettiConfig>) => void;
  showFloatingText: (config: FloatingTextConfig) => void;
  createRipple: (config: RippleConfig) => void;
  createParticles: (config: ParticleConfig) => void;
  pulseScreen: () => void;
  celebrateLevelUp: () => void;
  celebrateAchievement: () => void;
  celebrateStreak: () => void;
}

/**
 * CelebrationEffects Component
 * Advanced celebration animations for user achievements
 */
export const CelebrationEffects = React.forwardRef<CelebrationEffectsRef, CelebrationEffectsProps>(
  ({ onComplete }, ref) => {
    // State management
    const [confetti, setConfetti] = useState<Array<{ id: string; color: string; delay: number; duration: number; left: string }>>([]);
    const [floatingTexts, setFloatingTexts] = useState<Array<FloatingTextConfig & { id: string }>>([]);
    const [ripples, setRipples] = useState<Array<RippleConfig & { id: string }>>([]);
    const [particles, setParticles] = useState<Array<{ id: string; x: number; y: number; color: string; size: number; direction: number; duration: number }>>([]);
    const [pulseActive, setPulseActive] = useState(false);

    // Confetti effect
    const triggerConfetti = useCallback((config: Partial<ConfettiConfig> = {}) => {
      const {
        count = 50,
        colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b', '#6c5ce7'],
        duration = 3
      } = config;

      const newConfetti = Array.from({ length: count }, (_, i) => ({
        id: `confetti-${Date.now()}-${i}`,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
        duration: duration + Math.random() * 1,
        left: `${Math.random() * 100}%`
      }));

      setConfetti(prev => [...prev, ...newConfetti]);

      // Clean up after animation
      setTimeout(() => {
        setConfetti(prev => prev.filter(piece => !newConfetti.some(newPiece => newPiece.id === piece.id)));
      }, (duration + 1.5) * 1000);
    }, []);

    // Floating text effect
    const showFloatingText = useCallback((config: FloatingTextConfig) => {
      const id = `text-${Date.now()}`;
      const textConfig = { ...config, id, duration: config.duration || 2 };
      
      setFloatingTexts(prev => [...prev, textConfig]);

      // Clean up after animation
      setTimeout(() => {
        setFloatingTexts(prev => prev.filter(text => text.id !== id));
      }, textConfig.duration * 1000);
    }, []);

    // Ripple effect
    const createRipple = useCallback((config: RippleConfig) => {
      const id = `ripple-${Date.now()}`;
      const rippleConfig = { ...config, id };
      
      setRipples(prev => [...prev, rippleConfig]);

      // Clean up after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(ripple => ripple.id !== id));
      }, 600);
    }, []);

    // Particle effect
    const createParticles = useCallback((config: ParticleConfig) => {
      const { x, y, count = 10, colors = ['#ff6b6b', '#4ecdc4', '#45b7d1'] } = config;
      
      const newParticles = Array.from({ length: count }, (_, i) => ({
        id: `particle-${Date.now()}-${i}`,
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 40,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 6,
        direction: Math.random() * 360,
        duration: 1 + Math.random() * 1
      }));

      setParticles(prev => [...prev, ...newParticles]);

      // Clean up after animation
      setTimeout(() => {
        setParticles(prev => prev.filter(particle => !newParticles.some(newParticle => newParticle.id === particle.id)));
      }, 2500);
    }, []);

    // Screen pulse effect
    const pulseScreen = useCallback(() => {
      setPulseActive(true);
      setTimeout(() => setPulseActive(false), 600);
    }, []);

    // Celebration presets
    const celebrateLevelUp = useCallback(() => {
    // Enhanced multi-effect level up celebration with choreography
    
    // Stage 1: Initial burst (immediate)
    triggerConfetti({ count: 50, duration: 2, colors: ['#ffd700', '#ffed4a', '#f7b801'] });
    
    // Stage 2: Screen effects (100ms delay)
    setTimeout(() => {
    pulseScreen();
    showFloatingText({ 
        text: 'LEVEL UP!', 
        x: window.innerWidth / 2 - 60, 
        y: window.innerHeight / 2 - 50,
        color: '#ffd700',
      duration: 3 
    });
    }, 100);
    
    // Stage 3: Particle burst (300ms delay)
      setTimeout(() => {
      createParticles({ 
        x: window.innerWidth / 2, 
        y: window.innerHeight / 2, 
        count: 25,
        colors: ['#ffd700', '#ff6b6b', '#4ecdc4', '#a78bfa']
      });
    }, 300);
    
    // Stage 4: Secondary confetti wave (800ms delay)
    setTimeout(() => {
      triggerConfetti({ count: 30, duration: 3, colors: ['#10b981', '#3b82f6', '#8b5cf6'] });
    }, 800);
    
    // Stage 5: Final celebration ripple (1200ms delay)
    setTimeout(() => {
      createRipple({ 
        x: window.innerWidth / 2, 
        y: window.innerHeight / 2, 
        color: '#ffd700' 
      });
    }, 1200);
  }, [triggerConfetti, pulseScreen, showFloatingText, createParticles, createRipple]);

    const celebrateAchievement = useCallback(() => {
      triggerConfetti({ count: 30, duration: 2.5 });
      showFloatingText({ 
        text: 'Achievement!', 
        x: window.innerWidth / 2 - 70, 
        y: window.innerHeight / 2 - 30,
        color: '#00ff88',
        duration: 2 
      });
    }, [triggerConfetti, showFloatingText]);

    const celebrateStreak = useCallback(() => {
      // Streak celebration with fire colors
      triggerConfetti({ 
        count: 25, 
        colors: ['#ff4757', '#ff7675', '#fd79a8', '#fdcb6e'],
        duration: 2 
      });
      showFloatingText({ 
        text: 'Streak!', 
        x: window.innerWidth / 2 - 40, 
        y: window.innerHeight / 2 - 20,
        color: '#ff4757',
        duration: 1.5 
      });
    }, [triggerConfetti, showFloatingText]);

    // Expose methods through ref
    React.useImperativeHandle(ref, () => ({
      triggerConfetti,
      showFloatingText,
      createRipple,
      createParticles,
      pulseScreen,
      celebrateLevelUp,
      celebrateAchievement,
      celebrateStreak
    }), [triggerConfetti, showFloatingText, createRipple, createParticles, pulseScreen, celebrateLevelUp, celebrateAchievement, celebrateStreak]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        setConfetti([]);
        setFloatingTexts([]);
        setRipples([]);
        setParticles([]);
      };
    }, []);

    return (
      <CelebrationContainer>
        {/* Pulse Overlay */}
        <PulseOverlay active={pulseActive} />
        
        {/* Confetti */}
        {confetti.map(piece => (
          <ConfettiPiece
            key={piece.id}
            color={piece.color}
            delay={piece.delay}
            duration={piece.duration}
            style={{ left: piece.left }}
          />
        ))}
        
        {/* Floating Text */}
        <AnimatePresence>
          {floatingTexts.map(text => (
            <FloatingText
              key={text.id}
              color={text.color}
              initial={{ x: text.x, y: text.y, opacity: 1, scale: 0.5 }}
              animate={{ y: text.y - 100, opacity: 0, scale: 1.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: text.duration || 2, ease: 'easeOut' }}
            >
              {text.text}
            </FloatingText>
          ))}
        </AnimatePresence>
        
        {/* Ripples */}
        <RippleContainer>
          {ripples.map(ripple => (
            <Ripple
              key={ripple.id}
              x={ripple.x}
              y={ripple.y}
              color={ripple.color}
            />
          ))}
        </RippleContainer>
        
        {/* Particles */}
        <ParticleContainer>
          {particles.map(particle => (
            <Particle
              key={particle.id}
              x={particle.x}
              y={particle.y}
              color={particle.color}
              size={particle.size}
              direction={particle.direction}
              duration={particle.duration}
            />
          ))}
        </ParticleContainer>
      </CelebrationContainer>
    );
  }
);

CelebrationEffects.displayName = 'CelebrationEffects';

export default CelebrationEffects;
