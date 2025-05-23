/**
 * StellarSidebar.tsx
 * ==================
 * 
 * Revolutionary Stellar Constellation Sidebar for the Galaxy Dashboard
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Features:
 * - Cosmic constellation navigation with particle effects
 * - Fluid gradient mastery with dynamic color transitions
 * - Advanced micro-interactions with stellar glow effects
 * - Mobile-first collapsible design with stellar animations
 * - WCAG AA accessibility with keyboard navigation
 * - Performance-optimized with GPU acceleration
 * 
 * Master Prompt v28 Alignment:
 * - Sensational aesthetics with cosmic grandeur
 * - Award-winning gradient systems and particle physics
 * - Mobile-first ultra-responsive design
 * - Accessibility as art with inclusive design
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import styled, { ThemeProvider, keyframes, css } from 'styled-components';
import { 
  Home, Activity, Video, TrendingUp, BarChart3, Trophy, 
  Package, Calendar, Star, MessageCircle, User, Settings,
  ChevronLeft, ChevronRight, Menu, X, Sparkles
} from 'lucide-react';

// === COSMIC THEME ENHANCEMENT ===
const stellarTheme = {
  colors: {
    deepSpace: '#0a0a0f',
    nebulaPurple: '#1e1e3f',
    cyberCyan: '#00ffff',
    stellarWhite: '#ffffff',
    cosmicPurple: '#7851a9',
    starGold: '#ffd700',
    energyBlue: '#00c8ff',
    plasmaGreen: '#00ff88',
    warningRed: '#ff416c',
    voidBlack: '#000000'
  },
  gradients: {
    stellar: 'linear-gradient(135deg, #00ffff 0%, #7851a9 50%, #ffd700 100%)',
    nebula: 'linear-gradient(45deg, #1e1e3f 0%, #7851a9 50%, #0a0a0f 100%)',
    cosmic: 'radial-gradient(ellipse at top, #00ffff 0%, #1e1e3f 50%, #0a0a0f 100%)',
    aurora: 'linear-gradient(270deg, #00ffff, #7851a9, #ffd700, #00ffff)',
    constellation: 'conic-gradient(from 0deg, #00ffff, #7851a9, #ffd700, #00ffff)'
  },
  shadows: {
    stellar: '0 0 30px rgba(0, 255, 255, 0.6)',
    nebula: '0 0 40px rgba(120, 81, 169, 0.4)',
    cosmic: '0 20px 40px rgba(0, 0, 0, 0.6)',
    glow: '0 0 20px currentColor',
    constellation: 'inset 0 0 20px rgba(0, 255, 255, 0.2)'
  }
};

// === ADVANCED KEYFRAME ANIMATIONS ===
const stellarFloat = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.7; }
  33% { transform: translateY(-8px) rotate(1deg); opacity: 1; }
  66% { transform: translateY(-4px) rotate(-1deg); opacity: 0.9; }
`;

const cosmicPulse = keyframes`
  0%, 100% { 
    opacity: 0.6; 
    transform: scale(1); 
    filter: hue-rotate(0deg);
  }
  50% { 
    opacity: 1; 
    transform: scale(1.02); 
    filter: hue-rotate(45deg);
  }
`;

const particleOrbit = keyframes`
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

const constellationGlow = keyframes`
  0%, 100% { 
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
    border-color: rgba(0, 255, 255, 0.4);
  }
  50% { 
    box-shadow: 0 0 25px rgba(0, 255, 255, 0.6), 0 0 40px rgba(120, 81, 169, 0.3);
    border-color: rgba(0, 255, 255, 0.8);
  }
`;

const auroraShift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// === STYLED COMPONENTS ===

const SidebarContainer = styled(motion.aside)<{ isCollapsed: boolean; isMobile: boolean }>`
  position: fixed;
  top: 56px; /* Start below header */
  left: 0;
  height: calc(100vh - 56px); /* Full height minus header */
  width: ${props => props.isCollapsed ? '80px' : '280px'};
  background: ${props => props.theme.gradients.nebula};
  backdrop-filter: blur(20px);
  border-right: 2px solid rgba(0, 255, 255, 0.2);
  z-index: 999; /* Below header (1000) but above content */
  display: flex;
  flex-direction: column;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  
  /* Particle Background */
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
      radial-gradient(2px 2px at 130px 80px, rgba(0, 255, 255, 0.3), transparent);
    background-size: 100px 80px;
    background-repeat: repeat;
    animation: ${stellarFloat} 8s ease-in-out infinite;
    opacity: 0.6;
    pointer-events: none;
  }
  
  /* Aurora Effect */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${props => props.theme.gradients.aurora};
    background-size: 300% 300%;
    animation: ${auroraShift} 6s ease infinite;
    opacity: 0.8;
  }
  
  @media (max-width: 768px) {
    top: 0; /* Full height on mobile for overlay */
    height: 100vh;
    transform: translateX(${props => props.isMobile && props.isCollapsed ? '-100%' : '0'});
    width: 280px;
    border-right: none;
    box-shadow: ${props => props.theme.shadows.cosmic};
    z-index: 1001; /* Above header on mobile overlay */
  }
  
  /* Enhanced scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(10, 10, 15, 0.3);
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.gradients.stellar};
    border-radius: 3px;
    
    &:hover {
      background: ${props => props.theme.colors.cyberCyan};
    }
  }
`;

const SidebarHeader = styled(motion.div)<{ isCollapsed: boolean }>`
  padding: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: ${props => props.isCollapsed ? 'center' : 'space-between'};
  border-bottom: 1px solid rgba(0, 255, 255, 0.2);
  position: relative;
  background: rgba(30, 30, 63, 0.3);
  backdrop-filter: blur(10px);
`;

const LogoContainer = styled(motion.div)<{ isCollapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  
  .logo-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: ${props => props.theme.gradients.stellar};
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: ${props => props.theme.shadows.stellar};
    animation: ${cosmicPulse} 4s ease-in-out infinite;
    position: relative;
    
    /* Particle orbit effect */
    &::before {
      content: '✦';
      position: absolute;
      width: 8px;
      height: 8px;
      color: ${props => props.theme.colors.starGold};
      animation: ${particleOrbit} 3s linear infinite;
    }
    
    &::after {
      content: '✧';
      position: absolute;
      width: 6px;
      height: 6px;
      color: ${props => props.theme.colors.cyberCyan};
      animation: ${particleOrbit} 4s linear infinite reverse;
      animation-delay: 1.5s;
    }
  }
  
  .logo-text {
    font-size: 1.4rem;
    font-weight: 700;
    background: ${props => props.theme.gradients.stellar};
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    opacity: ${props => props.isCollapsed ? '0' : '1'};
    transform: translateX(${props => props.isCollapsed ? '-20px' : '0'});
    transition: all 0.3s ease;
    letter-spacing: 0.5px;
  }
`;

const CollapseToggle = styled(motion.button)<{ isCollapsed: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  color: ${props => props.theme.colors.cyberCyan};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(0, 255, 255, 0.2);
    border-color: rgba(0, 255, 255, 0.6);
    box-shadow: ${props => props.theme.shadows.glow};
    transform: scale(1.1);
  }
  
  &:focus {
    outline: 2px solid ${props => props.theme.colors.cyberCyan};
    outline-offset: 2px;
  }
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const NavigationSection = styled(motion.div)`
  flex: 1;
  padding: 1rem 0;
  overflow-y: auto;
  overflow-x: hidden;
`;

const SectionTitle = styled(motion.h3)<{ isCollapsed: boolean }>`
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
    content: '◆';
    color: ${props => props.theme.colors.starGold};
    animation: ${cosmicPulse} 3s ease-in-out infinite;
  }
`;

const NavItem = styled(motion.button)<{ isActive: boolean; isCollapsed: boolean }>`
  width: 100%;
  padding: ${props => props.isCollapsed ? '1rem' : '1rem 1.5rem'};
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: ${props => props.isActive 
    ? 'linear-gradient(90deg, rgba(0, 255, 255, 0.2) 0%, rgba(120, 81, 169, 0.1) 100%)'
    : 'transparent'};
  border: none;
  border-left: 3px solid ${props => props.isActive 
    ? props.theme.colors.cyberCyan 
    : 'transparent'};
  color: ${props => props.isActive 
    ? props.theme.colors.cyberCyan 
    : 'rgba(255, 255, 255, 0.8)'};
  cursor: pointer;
  text-align: left;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  justify-content: ${props => props.isCollapsed ? 'center' : 'flex-start'};
  
  /* Constellation glow effect for active items */
  ${props => props.isActive && css`
    animation: ${constellationGlow} 3s ease-in-out infinite;
    
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      background: ${props => props.theme.gradients.stellar};
      border-radius: 0 2px 2px 0;
    }
  `}
  
  .nav-icon {
    min-width: 24px;
    min-height: 24px;
    position: relative;
    transition: all 0.3s ease;
    
    /* Particle effect for active icons */
    ${props => props.isActive && css`
      filter: drop-shadow(0 0 8px currentColor);
      
      &::before {
        content: '✨';
        position: absolute;
        top: -8px;
        right: -8px;
        font-size: 0.7rem;
        color: ${props => props.theme.colors.starGold};
        animation: ${stellarFloat} 2s ease-in-out infinite;
      }
    `}
  }
  
  .nav-text {
    font-size: 0.95rem;
    font-weight: 500;
    opacity: ${props => props.isCollapsed ? '0' : '1'};
    transform: translateX(${props => props.isCollapsed ? '-20px' : '0'});
    transition: all 0.3s ease;
    white-space: nowrap;
    letter-spacing: 0.3px;
  }
  
  /* Tooltip for collapsed state */
  .nav-tooltip {
    position: absolute;
    left: 100%;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(10, 10, 15, 0.9);
    color: ${props => props.theme.colors.stellarWhite};
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.85rem;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    margin-left: 10px;
    border: 1px solid rgba(0, 255, 255, 0.3);
    box-shadow: ${props => props.theme.shadows.stellar};
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
      ? 'linear-gradient(90deg, rgba(0, 255, 255, 0.3) 0%, rgba(120, 81, 169, 0.2) 100%)'
      : 'rgba(255, 255, 255, 0.05)'};
    color: ${props => props.theme.colors.stellarWhite};
    transform: translateX(${props => props.isCollapsed ? '0' : '4px'});
    
    .nav-icon {
      transform: scale(1.1);
      filter: drop-shadow(0 0 12px currentColor);
    }
    
    .nav-tooltip {
      opacity: ${props => props.isCollapsed ? '1' : '0'};
      transition: opacity 0.3s ease 0.2s;
    }
  }
  
  &:focus {
    outline: 2px solid ${props => props.theme.colors.cyberCyan};
    outline-offset: -2px;
  }
  
  &:active {
    transform: scale(0.98);
  }
`;

const SidebarFooter = styled(motion.div)<{ isCollapsed: boolean }>`
  padding: 1rem;
  border-top: 1px solid rgba(0, 255, 255, 0.2);
  background: rgba(30, 30, 63, 0.3);
  backdrop-filter: blur(10px);
  
  .version-info {
    text-align: center;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
    opacity: ${props => props.isCollapsed ? '0' : '1'};
    transition: all 0.3s ease;
  }
  
  .stellar-signature {
    background: ${props => props.theme.gradients.stellar};
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

const MobileBackdrop = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  z-index: 1000; /* Above main content, below sidebar */
  display: none;
  
  @media (max-width: 768px) {
    display: block;
  }
`;

const MobileToggle = styled(motion.button)`
  position: fixed;
  top: calc(56px + 1rem); /* Below header + margin */
  left: 1rem;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: ${props => props.theme.gradients.stellar};
  border: 2px solid rgba(0, 255, 255, 0.3);
  color: ${props => props.theme.colors.deepSpace};
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 1002; /* Above sidebar on mobile */
  box-shadow: ${props => props.theme.shadows.stellar};
  
  @media (max-width: 768px) {
    display: flex;
  }
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 0 30px rgba(0, 255, 255, 0.8);
  }
  
  &:focus {
    outline: 2px solid ${props => props.theme.colors.cyberCyan};
    outline-offset: 2px;
  }
`;

// === NAVIGATION DATA ===
interface NavItemData {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  section: 'main' | 'tools' | 'social' | 'account';
}

const navigationItems: NavItemData[] = [
  // Main Dashboard
  { id: 'overview', label: 'Overview', icon: Home, section: 'main' },
  { id: 'workouts', label: 'Workouts', icon: Activity, section: 'main' },
  { id: 'progress', label: 'Progress', icon: TrendingUp, section: 'main' },
  { id: 'achievements', label: 'Achievements', icon: Trophy, section: 'main' },
  
  // Tools & Content
  { id: 'videos', label: 'Videos', icon: Video, section: 'tools' },
  { id: 'logs', label: 'Logs & Trackers', icon: BarChart3, section: 'tools' },
  { id: 'packages', label: 'Packages', icon: Package, section: 'tools' },
  { id: 'schedule', label: 'Schedule', icon: Calendar, section: 'tools' },
  
  // Social & Communication
  { id: 'community', label: 'Community', icon: Star, section: 'social' },
  { id: 'messages', label: 'Messages', icon: MessageCircle, section: 'social' },
  
  // Account
  { id: 'profile', label: 'Profile', icon: User, section: 'account' },
  { id: 'settings', label: 'Settings', icon: Settings, section: 'account' }
];

const sectionTitles = {
  main: 'Command Center',
  tools: 'Mission Tools',
  social: 'Star Network',
  account: 'Personal Space'
};

// === COMPONENT PROPS ===
interface StellarSidebarProps {
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  className?: string;
}

// === MAIN COMPONENT ===
const StellarSidebar: React.FC<StellarSidebarProps> = ({
  activeSection,
  onSectionChange,
  className
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
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
    onSectionChange(sectionId);
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
  const groupedItems = navigationItems.reduce((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = [];
    }
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, NavItemData[]>);
  
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
    <ThemeProvider theme={stellarTheme}>
      {/* Mobile Toggle */}
      <MobileToggle
        onClick={handleToggle}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Toggle navigation menu"
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </MobileToggle>
      
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobile && isMobileOpen && (
          <MobileBackdrop
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>
      
      {/* Sidebar Container */}
      <SidebarContainer
        className={className}
        isCollapsed={isMobile ? !isMobileOpen : isCollapsed}
        isMobile={isMobile}
        variants={!isMobile ? sidebarVariants : undefined}
        animate={!isMobile ? (isCollapsed ? 'collapsed' : 'expanded') : undefined}
        initial={false}
      >
        {/* Header */}
        <SidebarHeader isCollapsed={isMobile ? !isMobileOpen : isCollapsed}>
          <LogoContainer
            isCollapsed={isMobile ? !isMobileOpen : isCollapsed}
            onClick={() => handleSectionChange('overview')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="logo-icon">
              <Sparkles size={20} color={stellarTheme.colors.deepSpace} />
            </div>
            <span className="logo-text">Galaxy</span>
          </LogoContainer>
          
          {!isMobile && (
            <CollapseToggle
              isCollapsed={isCollapsed}
              onClick={() => setIsCollapsed(!isCollapsed)}
              whileHover={{ rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </CollapseToggle>
          )}
        </SidebarHeader>
        
        {/* Navigation */}
        <NavigationSection>
          <motion.div
            variants={contentVariants}
            initial="hidden"
            animate="visible"
          >
            {Object.entries(groupedItems).map(([section, items]) => (
              <div key={section}>
                <SectionTitle 
                  isCollapsed={isMobile ? !isMobileOpen : isCollapsed}
                  variants={itemVariants}
                >
                  {sectionTitles[section as keyof typeof sectionTitles]}
                </SectionTitle>
                
                {items.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = activeSection === item.id;
                  
                  return (
                    <NavItem
                      key={item.id}
                      isActive={isActive}
                      isCollapsed={isMobile ? !isMobileOpen : isCollapsed}
                      onClick={() => handleSectionChange(item.id)}
                      variants={itemVariants}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      aria-label={`Navigate to ${item.label}`}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="nav-icon">
                        <IconComponent size={20} />
                      </div>
                      <span className="nav-text">{item.label}</span>
                      <div className="nav-tooltip">{item.label}</div>
                    </NavItem>
                  );
                })}
              </div>
            ))}
          </motion.div>
        </NavigationSection>
        
        {/* Footer */}
        <SidebarFooter isCollapsed={isMobile ? !isMobileOpen : isCollapsed}>
          <div className="version-info">Galaxy Dashboard v2.0</div>
          <div className="stellar-signature">Designed by Seraphina</div>
        </SidebarFooter>
      </SidebarContainer>
    </ThemeProvider>
  );
};

export default StellarSidebar;