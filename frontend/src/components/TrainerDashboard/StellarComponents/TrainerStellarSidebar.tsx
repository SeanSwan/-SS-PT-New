/**
 * TrainerStellarSidebar.tsx
 * =========================
 * 
 * Cosmic Training Command Center Sidebar for Trainer Dashboard
 * Adapted from Client Dashboard's stellar design with trainer-specific sections
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Features:
 * - Stellar constellation navigation with trainer command center theme
 * - Enhanced cosmic gradients with professional gold/cyan accents
 * - Advanced micro-interactions with training-focused glow effects
 * - Mobile-first collapsible design with stellar animations
 * - WCAG AA accessibility with keyboard navigation
 * - Performance-optimized with GPU acceleration
 * 
 * Master Prompt v28 Alignment:
 * - Professional aesthetics with cosmic training center grandeur
 * - Award-winning gradient systems with blue/purple/gold palette
 * - Mobile-first ultra-responsive design
 * - Accessibility as art with inclusive design
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { keyframes, css } from 'styled-components';
import { 
  Users, Calendar, TrendingUp, Target, Video, MessageSquare,
  FileText, Settings, BarChart3, Star, Upload, Clock,
  ChevronLeft, ChevronRight, Menu, X, Dumbbell, 
  UserCheck, Award, Zap, Camera, PlayCircle, Bell
} from 'lucide-react';
import { useUniversalTheme } from '../../../context/ThemeContext';

// === ENHANCED KEYFRAME ANIMATIONS ===
const stellarFloat = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.8; }
  33% { transform: translateY(-8px) rotate(1deg); opacity: 1; }
  66% { transform: translateY(-4px) rotate(-1deg); opacity: 0.95; }
`;

const cosmicPulse = keyframes`
  0%, 100% { 
    opacity: 0.7; 
    transform: scale(1); 
    filter: hue-rotate(0deg);
  }
  50% { 
    opacity: 1; 
    transform: scale(1.02); 
    filter: hue-rotate(30deg);
  }
`;

const trainingOrbit = keyframes`
  0% { 
    transform: rotate(0deg) translateX(15px) rotate(0deg); 
    opacity: 0; 
  }
  10%, 90% { 
    opacity: 1; 
  }
  100% { 
    transform: rotate(360deg) translateX(15px) rotate(-360deg); 
    opacity: 0; 
  }
`;

const stellarGlow = keyframes`
  0%, 100% { 
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
    border-color: rgba(0, 255, 255, 0.4);
  }
  50% { 
    box-shadow: 0 0 25px rgba(0, 255, 255, 0.6), 0 0 40px rgba(255, 215, 0, 0.3);
    border-color: rgba(0, 255, 255, 0.8);
  }
`;

const auroraShift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// === STYLED COMPONENTS ===
const TrainerSidebarContainer = styled(motion.aside)<{ isCollapsed: boolean; isMobile: boolean }>`
  position: fixed;
  top: 56px;
  left: 0;
  height: calc(100vh - 56px);
  width: ${props => props.isCollapsed ? '80px' : '280px'};
  background: ${props => props.theme.gradients?.hero || 'radial-gradient(ellipse at center, #1e1e3f 0%, #0a0a1a 70%)'};
  backdrop-filter: blur(20px);
  border-right: 2px solid ${props => props.theme.borders?.elegant || 'rgba(0, 255, 255, 0.2)'};
  z-index: 999;
  display: flex;
  flex-direction: column;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  
  /* Stellar particle background */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(2px 2px at 20px 30px, rgba(0, 255, 255, 0.4), transparent),
      radial-gradient(1px 1px at 40px 70px, rgba(255, 215, 0, 0.3), transparent),
      radial-gradient(1px 1px at 90px 40px, rgba(255, 255, 255, 0.2), transparent),
      radial-gradient(2px 2px at 130px 80px, rgba(120, 81, 169, 0.3), transparent),
      radial-gradient(1px 1px at 160px 110px, rgba(0, 255, 255, 0.2), transparent);
    background-size: 120px 100px;
    background-repeat: repeat;
    animation: ${stellarFloat} 10s ease-in-out infinite;
    opacity: 0.6;
    pointer-events: none;
  }
  
  /* Training command aurora effect */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(270deg, #00ffff, #FFD700, #7851A9, #00A0E3, #00ffff);
    background-size: 400% 400%;
    animation: ${auroraShift} 8s ease infinite;
    opacity: 0.8;
  }
  
  @media (max-width: 768px) {
    top: 0;
    height: 100vh;
    transform: translateX(${props => props.isMobile && props.isCollapsed ? '-100%' : '0'});
    width: 280px;
    border-right: none;
    box-shadow: ${props => props.theme.shadows?.elevation || '0 15px 35px rgba(0, 0, 0, 0.5)'};
    z-index: 1001;
  }
  
  /* Enhanced scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(10, 10, 15, 0.3);
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.gradients?.primary || 'linear-gradient(135deg, #00FFFF, #00A0E3)'};
    border-radius: 3px;
    
    &:hover {
      background: ${props => props.theme.colors?.accent || '#FFD700'};
    }
  }
`;

const TrainerSidebarHeader = styled(motion.div)<{ isCollapsed: boolean }>`
  padding: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: ${props => props.isCollapsed ? 'center' : 'space-between'};
  border-bottom: 1px solid ${props => props.theme.borders?.elegant || 'rgba(0, 255, 255, 0.2)'};
  position: relative;
  background: ${props => props.theme.gradients?.card || 'rgba(30, 30, 60, 0.4)'};
  backdrop-filter: blur(10px);
`;

const TrainerLogoContainer = styled(motion.div)<{ isCollapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  
  .trainer-logo-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: ${props => props.theme.gradients?.stellar || 'linear-gradient(45deg, #00FFFF 0%, #FFD700 100%)'};
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: ${props => props.theme.shadows?.cosmic || '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 40px rgba(0, 255, 255, 0.3)'};
    animation: ${cosmicPulse} 4s ease-in-out infinite;
    position: relative;
    color: #000000;
    
    /* Training orbit effect */
    &::before {
      content: '⚡';
      position: absolute;
      width: 8px;
      height: 8px;
      color: ${props => props.theme.colors?.accent || '#FFD700'};
      animation: ${trainingOrbit} 3s linear infinite;
    }
    
    &::after {
      content: '💪';
      position: absolute;
      width: 6px;
      height: 6px;
      animation: ${trainingOrbit} 4.5s linear infinite reverse;
      animation-delay: 1.5s;
      font-size: 0.7rem;
    }
  }
  
  .trainer-logo-text {
    font-size: 1.4rem;
    font-weight: 700;
    background: ${props => props.theme.gradients?.stellar || 'linear-gradient(45deg, #00FFFF 0%, #FFD700 100%)'};
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    opacity: ${props => props.isCollapsed ? '0' : '1'};
    transform: translateX(${props => props.isCollapsed ? '-20px' : '0'});
    transition: all 0.3s ease;
    letter-spacing: 0.5px;
  }
`;

const TrainerCollapseToggle = styled(motion.button)<{ isCollapsed: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  color: ${props => props.theme.colors?.primary || '#00FFFF'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(0, 255, 255, 0.2);
    border-color: rgba(0, 255, 255, 0.6);
    box-shadow: ${props => props.theme.shadows?.glow || '0 0 15px currentColor'};
    transform: scale(1.1);
  }
  
  &:focus {
    outline: 2px solid ${props => props.theme.colors?.accent || '#FFD700'};
    outline-offset: 2px;
  }
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const TrainerNavigationSection = styled(motion.div)`
  flex: 1;
  padding: 1rem 0;
  overflow-y: auto;
  overflow-x: hidden;
`;

const TrainerSectionTitle = styled(motion.h3)<{ isCollapsed: boolean }>`
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.6);
  margin: 1.5rem 1rem 0.75rem;
  opacity: ${props => props.isCollapsed ? '0' : '1'};
  transform: translateX(${props => props.isCollapsed ? '-20px' : '0'});
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &::before {
    content: '⭐';
    color: ${props => props.theme.colors?.accent || '#FFD700'};
    animation: ${cosmicPulse} 3s ease-in-out infinite;
  }
`;

const TrainerNavItem = styled(motion.button)<{ isActive: boolean; isCollapsed: boolean }>`
  width: 100%;
  padding: ${props => props.isCollapsed ? '1rem' : '1rem 1.5rem'};
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: ${props => props.isActive 
    ? 'linear-gradient(90deg, rgba(0, 255, 255, 0.2) 0%, rgba(255, 215, 0, 0.1) 100%)'
    : 'transparent'};
  border: none;
  border-left: 3px solid ${props => props.isActive 
    ? props.theme.colors?.primary || '#00FFFF' 
    : 'transparent'};
  color: ${props => props.isActive 
    ? props.theme.colors?.primary || '#00FFFF' 
    : 'rgba(255, 255, 255, 0.8)'};
  cursor: pointer;
  text-align: left;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  justify-content: ${props => props.isCollapsed ? 'center' : 'flex-start'};
  
  /* Stellar glow effect for active items */
  ${props => props.isActive && css`
    animation: ${stellarGlow} 3s ease-in-out infinite;
    
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      background: ${props => props.theme.gradients?.stellar || 'linear-gradient(45deg, #00FFFF 0%, #FFD700 100%)'};
      border-radius: 0 2px 2px 0;
    }
  `}
  
  .trainer-nav-icon {
    min-width: 24px;
    min-height: 24px;
    position: relative;
    transition: all 0.3s ease;
    
    /* Training effect for active icons */
    ${props => props.isActive && css`
      filter: drop-shadow(0 0 8px currentColor);
      
      &::before {
        content: '✨';
        position: absolute;
        top: -8px;
        right: -8px;
        font-size: 0.7rem;
        color: ${props => props.theme.colors?.accent || '#FFD700'};
        animation: ${stellarFloat} 2s ease-in-out infinite;
      }
    `}
  }
  
  .trainer-nav-text {
    font-size: 0.95rem;
    font-weight: 500;
    opacity: ${props => props.isCollapsed ? '0' : '1'};
    transform: translateX(${props => props.isCollapsed ? '-20px' : '0'});
    transition: all 0.3s ease;
    white-space: nowrap;
    letter-spacing: 0.3px;
  }
  
  /* Tooltip for collapsed state */
  .trainer-nav-tooltip {
    position: absolute;
    left: 100%;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(10, 10, 15, 0.9);
    color: ${props => props.theme.colors?.white || '#ffffff'};
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.85rem;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    margin-left: 10px;
    border: 1px solid ${props => props.theme.borders?.elegant || 'rgba(0, 255, 255, 0.2)'};
    box-shadow: ${props => props.theme.shadows?.cosmic || '0 8px 32px rgba(0, 0, 0, 0.4)'};
    z-index: 1000;
    
    &::before {
      content: '';
      position: absolute;
      left: -6px;
      top: 50%;
      transform: translateY(-50%);
      width: 0;
      height: 0;
      border-right: 6px solid rgba(10, 10, 15, 0.9);
      border-top: 6px solid transparent;
      border-bottom: 6px solid transparent;
    }
  }
  
  &:hover {
    background: ${props => props.isActive 
      ? 'linear-gradient(90deg, rgba(0, 255, 255, 0.3) 0%, rgba(255, 215, 0, 0.2) 100%)'
      : 'rgba(255, 255, 255, 0.05)'};
    color: ${props => props.theme.colors?.white || '#ffffff'};
    transform: translateX(${props => props.isCollapsed ? '0' : '4px'});
    
    .trainer-nav-icon {
      transform: scale(1.1);
      filter: drop-shadow(0 0 12px currentColor);
    }
    
    .trainer-nav-tooltip {
      opacity: ${props => props.isCollapsed ? '1' : '0'};
      transition: opacity 0.3s ease 0.2s;
    }
  }
  
  &:focus {
    outline: 2px solid ${props => props.theme.colors?.accent || '#FFD700'};
    outline-offset: -2px;
  }
  
  &:active {
    transform: scale(0.98);
  }
`;

const TrainerSidebarFooter = styled(motion.div)<{ isCollapsed: boolean }>`
  padding: 1rem;
  border-top: 1px solid ${props => props.theme.borders?.elegant || 'rgba(0, 255, 255, 0.2)'};
  background: ${props => props.theme.gradients?.card || 'rgba(30, 30, 60, 0.4)'};
  backdrop-filter: blur(10px);
  
  .trainer-version-info {
    text-align: center;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
    opacity: ${props => props.isCollapsed ? '0' : '1'};
    transition: all 0.3s ease;
  }
  
  .stellar-signature {
    background: ${props => props.theme.gradients?.stellar || 'linear-gradient(45deg, #00FFFF 0%, #FFD700 100%)'};
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-weight: 600;
    font-size: 0.8rem;
    text-align: center;
    margin-top: 0.5rem;
    opacity: ${props => props.isCollapsed ? '0' : '1'};
    transition: all 0.3s ease;
  }
`;

const TrainerMobileBackdrop = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  z-index: 1000;
  display: none;
  
  @media (max-width: 768px) {
    display: block;
  }
`;

const TrainerMobileToggle = styled(motion.button)`
  position: fixed;
  top: calc(56px + 1rem);
  left: 1rem;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: ${props => props.theme.gradients?.stellar || 'linear-gradient(45deg, #00FFFF 0%, #FFD700 100%)'};
  border: 2px solid ${props => props.theme.borders?.elegant || 'rgba(0, 255, 255, 0.2)'};
  color: #000000;
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 1002;
  box-shadow: ${props => props.theme.shadows?.cosmic || '0 8px 32px rgba(0, 0, 0, 0.4)'};
  
  @media (max-width: 768px) {
    display: flex;
  }
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 0 30px rgba(0, 255, 255, 0.8);
  }
  
  &:focus {
    outline: 2px solid ${props => props.theme.colors?.accent || '#FFD700'};
    outline-offset: 2px;
  }
`;

// === TRAINER NAVIGATION DATA ===
interface TrainerNavItemData {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  section: 'overview' | 'training' | 'content' | 'analytics' | 'tools';
  badge?: number;
}

const trainerNavigationItems: TrainerNavItemData[] = [
  // 🎯 TRAINING COMMAND CENTER
  { id: 'overview', label: 'Training Overview', icon: BarChart3, section: 'overview' },
  { id: 'schedule', label: 'Training Schedule', icon: Calendar, section: 'overview' },
  
  // 👥 CLIENT MANAGEMENT
  { id: 'clients', label: 'My Clients', icon: Users, section: 'training' },
  { id: 'log-workout', label: 'Log Workout', icon: Dumbbell, section: 'training' },
  { id: 'progress', label: 'Client Progress', icon: TrendingUp, section: 'training' },
  { id: 'assessments', label: 'Form Assessments', icon: UserCheck, section: 'training' },
  { id: 'goals', label: 'Goal Tracking', icon: Target, section: 'training' },
  
  // 🎬 CONTENT & MEDIA
  { id: 'videos', label: 'Training Videos', icon: Video, section: 'content' },
  { id: 'form-checks', label: 'Form Check Center', icon: Camera, section: 'content', badge: 3 },
  { id: 'content-library', label: 'Content Library', icon: PlayCircle, section: 'content' },
  { id: 'uploads', label: 'Upload Center', icon: Upload, section: 'content' },
  
  // 📊 PERFORMANCE ANALYTICS
  { id: 'analytics', label: 'Training Analytics', icon: BarChart3, section: 'analytics' },
  { id: 'achievements', label: 'Client Achievements', icon: Award, section: 'analytics' },
  { id: 'engagement', label: 'Engagement Metrics', icon: Zap, section: 'analytics' },
  
  // 🛠️ TRAINER TOOLS
  { id: 'messages', label: 'Client Messages', icon: MessageSquare, section: 'tools', badge: 5 },
  { id: 'notifications', label: 'Notifications', icon: Bell, section: 'tools' },
  { id: 'reports', label: 'Training Reports', icon: FileText, section: 'tools' },
  { id: 'settings', label: 'Trainer Settings', icon: Settings, section: 'tools' }
];

const trainerSectionTitles = {
  overview: '🎯 Command Center',
  training: '👥 Client Training',
  content: '🎬 Content Studio',
  analytics: '📊 Performance',
  tools: '🛠️ Trainer Tools'
};

// === COMPONENT PROPS ===
interface TrainerStellarSidebarProps {
  activeSection?: string;
  onSectionChange?: (sectionId: string) => void;
  className?: string;
}

// === MAIN COMPONENT ===
const TrainerStellarSidebar: React.FC<TrainerStellarSidebarProps> = ({
  activeSection = 'overview',
  onSectionChange,
  className
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { theme } = useUniversalTheme();
  
  // Check for mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth <= 768) {
        setIsCollapsed(true);
        setIsMobileOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Handle section change
  const handleSectionChange = (sectionId: string) => {
    if (onSectionChange) {
      onSectionChange(sectionId);
    }
    
    if (isMobile) {
      setIsMobileOpen(false);
    }
  };
  
  // Handle toggle
  const handleToggle = () => {
    if (isMobile) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };
  
  // Group navigation items by section
  const groupedItems = trainerNavigationItems.reduce((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = [];
    }
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, TrainerNavItemData[]>);
  
  // Animation variants
  const sidebarVariants = {
    expanded: { width: 280 },
    collapsed: { width: 80 }
  };
  
  const contentVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { staggerChildren: 0.05 }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };
  
  return (
    <>
      {/* Mobile Toggle */}
      <TrainerMobileToggle
        onClick={handleToggle}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Toggle trainer navigation menu"
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </TrainerMobileToggle>
      
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobile && isMobileOpen && (
          <TrainerMobileBackdrop
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>
      
      {/* Trainer Sidebar Container */}
      <TrainerSidebarContainer
        className={className}
        isCollapsed={isMobile ? !isMobileOpen : isCollapsed}
        isMobile={isMobile}
        variants={!isMobile ? sidebarVariants : undefined}
        animate={!isMobile ? (isCollapsed ? 'collapsed' : 'expanded') : undefined}
        initial={false}
      >
        {/* Header */}
        <TrainerSidebarHeader isCollapsed={isMobile ? !isMobileOpen : isCollapsed}>
          <TrainerLogoContainer
            isCollapsed={isMobile ? !isMobileOpen : isCollapsed}
            onClick={() => handleSectionChange('overview')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="trainer-logo-icon">
              <Dumbbell size={20} />
            </div>
            <span className="trainer-logo-text">Training Hub</span>
          </TrainerLogoContainer>
          
          {!isMobile && (
            <TrainerCollapseToggle
              isCollapsed={isCollapsed}
              onClick={() => setIsCollapsed(!isCollapsed)}
              whileHover={{ rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              aria-label={isCollapsed ? 'Expand trainer sidebar' : 'Collapse trainer sidebar'}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </TrainerCollapseToggle>
          )}
        </TrainerSidebarHeader>
        
        {/* Navigation */}
        <TrainerNavigationSection>
          <motion.div
            variants={contentVariants}
            initial="hidden"
            animate="visible"
          >
            {Object.entries(groupedItems).map(([section, items]) => (
              <div key={section}>
                <TrainerSectionTitle 
                  isCollapsed={isMobile ? !isMobileOpen : isCollapsed}
                  variants={itemVariants}
                >
                  {trainerSectionTitles[section as keyof typeof trainerSectionTitles]}
                </TrainerSectionTitle>
                
                {items.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = activeSection === item.id;
                  
                  return (
                    <TrainerNavItem
                      key={item.id}
                      isActive={isActive}
                      isCollapsed={isMobile ? !isMobileOpen : isCollapsed}
                      onClick={() => handleSectionChange(item.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSectionChange(item.id);
                        }
                      }}
                      variants={itemVariants}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      aria-label={`Navigate to ${item.label}`}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="trainer-nav-icon">
                        <IconComponent size={20} />
                        {item.badge && (
                          <span style={{
                            position: 'absolute',
                            top: '-4px',
                            right: '-4px',
                            background: theme.colors?.error || '#ff416c',
                            color: 'white',
                            borderRadius: '50%',
                            width: '16px',
                            height: '16px',
                            fontSize: '0.7rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <span className="trainer-nav-text">{item.label}</span>
                      <div className="trainer-nav-tooltip">{item.label}</div>
                    </TrainerNavItem>
                  );
                })}
              </div>
            ))}
          </motion.div>
        </TrainerNavigationSection>
        
        {/* Footer */}
        <TrainerSidebarFooter isCollapsed={isMobile ? !isMobileOpen : isCollapsed}>
          <div className="trainer-version-info">Training Command v1.0</div>
          <div className="stellar-signature">Stellar Training by Seraphina</div>
        </TrainerSidebarFooter>
      </TrainerSidebarContainer>
    </>
  );
};

export default TrainerStellarSidebar;