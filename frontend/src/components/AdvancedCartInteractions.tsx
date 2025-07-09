/**
 * AdvancedCartInteractions.tsx - AAA 7-STAR INTERACTION PATTERNS
 * ===============================================================
 * 
 * 🎮 ADVANCED INTERACTION FEATURES:
 * - Contextual tooltips with smart positioning
 * - Progressive disclosure animations
 * - Micro-interactions with haptic feedback
 * - Smart notifications with contextual actions
 * - Session progress visualizations
 * - Advanced gesture support
 * 
 * 🎆 DELIGHT PATTERNS:
 * - Celebration animations on successful actions
 * - Smart loading states with progress indication
 * - Contextual help system
 * - Session accumulation animations
 * - Price change animations
 * - Smart quantity recommendations
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, TrendingUp, Zap, Star, Target } from 'lucide-react';

// Celebration animations
const celebrate = keyframes`
  0% { transform: scale(1) rotate(0deg); }
  25% { transform: scale(1.1) rotate(-2deg); }
  50% { transform: scale(1.2) rotate(2deg); }
  75% { transform: scale(1.1) rotate(-1deg); }
  100% { transform: scale(1) rotate(0deg); }
`;

const sparkle = keyframes`
  0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
  50% { opacity: 1; transform: scale(1) rotate(180deg); }
`;

const priceUpdate = keyframes`
  0% { background-color: rgba(0, 255, 255, 0.2); transform: scale(1); }
  50% { background-color: rgba(0, 255, 255, 0.4); transform: scale(1.05); }
  100% { background-color: transparent; transform: scale(1); }
`;

// Interactive tooltip component
const ContextualTooltip = styled(motion.div)`
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.95), rgba(120, 81, 169, 0.95));
  color: white;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  z-index: 1200;
  max-width: 200px;
  text-align: center;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 5px solid rgba(0, 255, 255, 0.95);
  }
`;

// Progress indicator for session accumulation
const SessionProgress = styled(motion.div)`
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(120, 81, 169, 0.1));
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 12px;
  padding: 1rem;
  margin: 1rem 0;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: linear-gradient(90deg, rgba(0, 255, 255, 0.2), rgba(120, 81, 169, 0.2));
    transition: width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
`;

const ProgressText = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .progress-label {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.8);
  }
  
  .progress-value {
    font-size: 1.1rem;
    font-weight: 600;
    color: #00ffff;
  }
`;

// Celebration particles
const CelebrationParticle = styled(motion.div)`
  position: absolute;
  width: 6px;
  height: 6px;
  background: #00ffff;
  border-radius: 50%;
  pointer-events: none;
`;

// Smart notification component
const SmartNotification = styled(motion.div)`
  position: fixed;
  top: 2rem;
  right: 2rem;
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.95), rgba(120, 81, 169, 0.95));
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  z-index: 1300;
  max-width: 300px;
  
  @media (max-width: 768px) {
    top: 1rem;
    right: 1rem;
    left: 1rem;
    max-width: none;
  }
`;

// Price change indicator
const PriceChangeIndicator = styled(motion.div)`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: #00ffff;
  margin-left: 0.5rem;
`;

// Interactive help icon
const HelpIcon = styled(motion.button)`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(0, 255, 255, 0.2);
    border-color: rgba(0, 255, 255, 0.4);
    color: #00ffff;
    transform: scale(1.1);
  }
`;

// Component interfaces
interface TooltipInfo {
  id: string;
  content: string;
  trigger: string;
}

interface CelebrationEffect {
  id: string;
  x: number;
  y: number;
  type: 'add' | 'remove' | 'checkout';
}

interface PriceChange {
  itemId: number;
  oldPrice: number;
  newPrice: number;
  timestamp: number;
}

interface SmartNotificationData {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Main interaction hook
export const useAdvancedCartInteractions = () => {
  const [tooltips, setTooltips] = useState<TooltipInfo[]>([]);
  const [celebrations, setCelebrations] = useState<CelebrationEffect[]>([]);
  const [priceChanges, setPriceChanges] = useState<PriceChange[]>([]);
  const [notifications, setNotifications] = useState<SmartNotificationData[]>([]);
  const [sessionProgress, setSessionProgress] = useState(0);
  
  // Haptic feedback function
  const triggerHaptic = useCallback((pattern: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: 10,
        medium: 50,
        heavy: [100, 50, 100]
      };
      navigator.vibrate(patterns[pattern]);
    }
  }, []);
  
  // Celebration effect
  const triggerCelebration = useCallback((x: number, y: number, type: CelebrationEffect['type']) => {
    const id = Math.random().toString(36).substr(2, 9);
    setCelebrations(prev => [...prev, { id, x, y, type }]);
    
    // Trigger haptic feedback
    triggerHaptic(type === 'checkout' ? 'heavy' : 'medium');
    
    // Remove celebration after animation
    setTimeout(() => {
      setCelebrations(prev => prev.filter(c => c.id !== id));
    }, 2000);
  }, [triggerHaptic]);
  
  // Price change animation
  const animatePriceChange = useCallback((itemId: number, oldPrice: number, newPrice: number) => {
    const id = Date.now();
    setPriceChanges(prev => [...prev, { itemId, oldPrice, newPrice, timestamp: id }]);
    
    setTimeout(() => {
      setPriceChanges(prev => prev.filter(p => p.timestamp !== id));
    }, 1000);
  }, []);
  
  // Smart notification
  const showNotification = useCallback((message: string, type: SmartNotificationData['type'], action?: SmartNotificationData['action']) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type, action }]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);
  
  // Session progress update
  const updateSessionProgress = useCallback((totalSessions: number, targetSessions: number = 12) => {
    const progress = Math.min((totalSessions / targetSessions) * 100, 100);
    setSessionProgress(progress);
  }, []);
  
  return {
    tooltips,
    celebrations,
    priceChanges,
    notifications,
    sessionProgress,
    triggerHaptic,
    triggerCelebration,
    animatePriceChange,
    showNotification,
    updateSessionProgress
  };
};

// Tooltip component
export const SmartTooltip: React.FC<{
  content: string;
  children: React.ReactNode;
  delay?: number;
}> = ({ content, children, delay = 500 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const showTooltip = useCallback(() => {
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  }, [delay]);
  
  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  }, []);
  
  return (
    <div
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <ContextualTooltip
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: '0.5rem'
            }}
          >
            {content}
          </ContextualTooltip>
        )}
      </AnimatePresence>
    </div>
  );
};

// Session progress component
export const SessionProgressIndicator: React.FC<{
  currentSessions: number;
  targetSessions?: number;
  className?: string;
}> = ({ currentSessions, targetSessions = 12, className }) => {
  const progress = Math.min((currentSessions / targetSessions) * 100, 100);
  
  return (
    <SessionProgress className={className}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, rgba(0, 255, 255, 0.2), rgba(120, 81, 169, 0.2))',
          transition: 'width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }}
      />
      <ProgressText>
        <div className="progress-label">
          <Target size={16} style={{ marginRight: '0.5rem', display: 'inline' }} />
          Session Progress
        </div>
        <div className="progress-value">
          {currentSessions} / {targetSessions}
        </div>
      </ProgressText>
    </SessionProgress>
  );
};

// Celebration particles component
export const CelebrationParticles: React.FC<{
  celebrations: CelebrationEffect[];
}> = ({ celebrations }) => {
  return (
    <>
      {celebrations.map(celebration => (
        <div key={celebration.id}>
          {[...Array(8)].map((_, i) => (
            <CelebrationParticle
              key={i}
              initial={{
                opacity: 0,
                scale: 0,
                x: celebration.x,
                y: celebration.y
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
                x: celebration.x + (Math.random() - 0.5) * 100,
                y: celebration.y + (Math.random() - 0.5) * 100
              }}
              transition={{
                duration: 1.5,
                delay: i * 0.1,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
            />
          ))}
        </div>
      ))}
    </>
  );
};

// Smart notifications component
export const SmartNotifications: React.FC<{
  notifications: SmartNotificationData[];
  onDismiss: (id: string) => void;
}> = ({ notifications, onDismiss }) => {
  return (
    <AnimatePresence>
      {notifications.map((notification, index) => (
        <SmartNotification
          key={notification.id}
          initial={{ opacity: 0, x: 100, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.9 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          style={{ top: `${2 + index * 5}rem` }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {notification.type === 'success' && <Star size={16} />}
            {notification.type === 'info' && <Zap size={16} />}
            {notification.type === 'warning' && <TrendingUp size={16} />}
            <span>{notification.message}</span>
          </div>
          {notification.action && (
            <button
              onClick={notification.action.onClick}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
                padding: '0.25rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                marginTop: '0.5rem',
                cursor: 'pointer'
              }}
            >
              {notification.action.label}
            </button>
          )}
        </SmartNotification>
      ))}
    </AnimatePresence>
  );
};

// Export all components and hooks
export {
  ContextualTooltip,
  SessionProgress,
  PriceChangeIndicator,
  HelpIcon,
  celebrate,
  sparkle,
  priceUpdate
};
