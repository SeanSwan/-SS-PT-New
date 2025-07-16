/**
 * TrainerStellarSidebar.tsx
 * =========================
 * 
 * Professional Stellar Training Hub Sidebar for Trainer Dashboard
 * Implements the refactored trainer navigation from Alchemist's Opus v42
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Features:
 * - Training Hub constellation navigation with purple-focused professional theme
 * - Stellar gradients adapted for coaching excellence
 * - Advanced micro-interactions with training-level glow effects
 * - Mobile-first collapsible design with stellar animations
 * - WCAG AA accessibility with keyboard navigation
 * - Performance-optimized with GPU acceleration
 * 
 * Refactored Navigation Structure (per Alchemist's Opus):
 * - TRAINING HUB: Overview, Client Management, Content Studio
 * - UNIVERSAL TOOLS: Schedule, Messages
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import styled, { ThemeProvider, keyframes, css } from 'styled-components';
import { 
  Users, UserCheck, BarChart3, Video, MessageSquare, Calendar,
  ChevronLeft, ChevronRight, Menu, X, Dumbbell, Target,
  Activity, ClipboardCheck, Star, Zap, Brain
} from 'lucide-react';

// === TRAINER STELLAR THEME ===
const trainerStellarTheme = {
  colors: {
    deepSpace: '#0a0a0f',
    stellarPurple: '#7851a9',     // Primary purple for trainers
    cosmicAmethyst: '#9333ea',    // Bright purple accents
    cyberCyan: '#00ffff',         // Keep signature cyan
    stellarWhite: '#ffffff',
    energyPurple: '#8b5cf6',      // Enhanced purple energy
    warningAmber: '#f59e0b',      // Status indicators
    successGreen: '#10b981',      // Positive states
    criticalRed: '#ef4444',       // Alert states
    voidBlack: '#000000'
  },
  gradients: {
    trainingHub: 'linear-gradient(135deg, #7851a9 0%, #8b5cf6 50%, #00ffff 100%)',
    stellarNebula: 'linear-gradient(45deg, #0f0a1a 0%, #7851a9 50%, #0a0a0f 100%)',
    dataFlow: 'radial-gradient(ellipse at top, #9333ea 0%, #7851a9 50%, #0a0a0f 100%)',
    stellarCommand: 'conic-gradient(from 0deg, #00ffff, #9333ea, #7851a9, #00ffff)',
    trainingAurora: 'linear-gradient(270deg, #00ffff, #8b5cf6, #7851a9, #00ffff)'
  },
  shadows: {
    stellarGlow: '0 0 30px rgba(120, 81, 169, 0.6)',
    trainingNebula: '0 0 40px rgba(139, 92, 246, 0.4)',
    dataVisualization: '0 20px 40px rgba(0, 0, 0, 0.6)',
    cosmicGlow: '0 0 20px currentColor',
    trainingCenter: 'inset 0 0 20px rgba(0, 255, 255, 0.2)'
  }
};

// === STYLED COMPONENTS ===
const TrainerSidebarContainer = styled(motion.aside)`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: ${props => props.isCollapsed ? '80px' : '280px'};
  background: ${props => props.theme.gradients.stellarNebula};
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(120, 81, 169, 0.3);
  z-index: 1000;
  transition: width 0.3s ease;
  overflow: hidden;
  
  /* Cosmic particle background */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(2px 2px at 40px 60px, rgba(147, 51, 234, 0.3), transparent),
      radial-gradient(1px 1px at 90px 120px, rgba(139, 92, 246, 0.2), transparent),
      radial-gradient(1px 1px at 170px 80px, rgba(255, 255, 255, 0.1), transparent);
    background-size: 200px 160px;
    background-repeat: repeat;
    animation: stellarFloat 60s linear infinite;
    opacity: 0.4;
    pointer-events: none;
  }
  
  @keyframes stellarFloat {
    0% { transform: translateY(0) rotate(0deg); }
    100% { transform: translateY(-20px) rotate(360deg); }
  }
  
  @media (max-width: 768px) {
    transform: translateX(${props => props.isMobileOpen ? '0' : '-100%'});
    width: 280px;
    transition: transform 0.3s ease;
  }
`;

const TrainerSidebarHeader = styled(motion.div)`
  padding: 1.5rem;
  border-bottom: 1px solid rgba(120, 81, 169, 0.2);
  position: relative;
  z-index: 2;
  
  .trainer-logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
    
    .trainer-logo-icon {
      width: 40px;
      height: 40px;
      background: ${props => props.theme.gradients.trainingHub};
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${props => props.theme.colors.stellarWhite};
      box-shadow: ${props => props.theme.shadows.stellarGlow};
    }
    
    .trainer-logo-text {
      display: ${props => props.isCollapsed ? 'none' : 'flex'};
      flex-direction: column;
      
      .trainer-brand {
        font-size: 1.25rem;
        font-weight: 700;
        background: ${props => props.theme.gradients.trainingHub};
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        line-height: 1.2;
      }
      
      .trainer-subtitle {
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.7);
        font-weight: 500;
      }
    }
  }
  
  .trainer-collapse-btn {
    position: absolute;
    top: 50%;
    right: -15px;
    transform: translateY(-50%);
    width: 30px;
    height: 30px;
    background: ${props => props.theme.gradients.trainingHub};
    border: 2px solid rgba(120, 81, 169, 0.3);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: ${props => props.theme.colors.stellarWhite};
    transition: all 0.3s ease;
    
    &:hover {
      box-shadow: ${props => props.theme.shadows.stellarGlow};
      transform: translateY(-50%) scale(1.1);
    }
    
    @media (max-width: 768px) {
      display: none;
    }
  }
`;

const TrainerNavigationSection = styled(motion.nav)`
  flex: 1;
  padding: 1rem 0;
  overflow-y: auto;
  position: relative;
  z-index: 2;
  
  .trainer-nav-section {
    margin-bottom: 2rem;
    
    .trainer-section-title {
      padding: 0.5rem 1.5rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.6);
      text-transform: uppercase;
      letter-spacing: 1px;
      display: ${props => props.isCollapsed ? 'none' : 'block'};
      margin-bottom: 0.5rem;
    }
    
    .trainer-nav-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
  }
`;

const TrainerNavItem = styled(motion.div)`
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  margin: 0 0.5rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  background: ${props => props.isActive ? 
    'rgba(120, 81, 169, 0.3)' : 
    'transparent'
  };
  
  border: 1px solid ${props => props.isActive ? 
    'rgba(120, 81, 169, 0.5)' : 
    'transparent'
  };
  
  &:hover {
    background: rgba(120, 81, 169, 0.2);
    border-color: rgba(120, 81, 169, 0.4);
    transform: translateX(4px);
    
    .trainer-nav-icon {
      color: ${props => props.theme.colors.cyberCyan};
      filter: drop-shadow(0 0 8px currentColor);
    }
  }
  
  .trainer-nav-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${props => props.isActive ? 
      props.theme.colors.cyberCyan : 
      'rgba(255, 255, 255, 0.8)'
    };
    transition: all 0.3s ease;
    position: relative;
    min-width: 20px;
  }
  
  .trainer-nav-text {
    color: ${props => props.isActive ? 
      props.theme.colors.stellarWhite : 
      'rgba(255, 255, 255, 0.8)'
    };
    font-weight: ${props => props.isActive ? '600' : '500'};
    font-size: 0.9rem;
    display: ${props => props.isCollapsed ? 'none' : 'block'};
    transition: all 0.3s ease;
  }
  
  .trainer-nav-tooltip {
    position: absolute;
    left: calc(100% + 1rem);
    top: 50%;
    transform: translateY(-50%);
    background: rgba(120, 81, 169, 0.9);
    color: ${props => props.theme.colors.stellarWhite};
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    font-size: 0.8rem;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
    z-index: 1000;
    border: 1px solid rgba(120, 81, 169, 0.5);
    box-shadow: ${props => props.theme.shadows.stellarGlow};
    display: ${props => props.isCollapsed ? 'block' : 'none'};
  }
  
  &:hover .trainer-nav-tooltip {
    opacity: 1;
  }
`;

const TrainerSidebarFooter = styled(motion.div)`
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(120, 81, 169, 0.2);
  position: relative;
  z-index: 2;
  
  .trainer-version-info {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.5);
    text-align: center;
    display: ${props => props.isCollapsed ? 'none' : 'block'};
  }
  
  .training-signature {
    font-size: 0.6rem;
    color: rgba(120, 81, 169, 0.8);
    text-align: center;
    margin-top: 0.25rem;
    display: ${props => props.isCollapsed ? 'none' : 'block'};
  }
`;

// === NAVIGATION CONFIGURATION ===
const trainerNavigationConfig = [
  {
    title: 'TRAINING HUB',
    items: [
      { 
        label: 'Training Overview', 
        path: '/trainer/overview', 
        icon: Activity,
        description: 'Dashboard showing upcoming sessions and client achievements'
      }
    ]
  },
  {
    title: 'CLIENT MANAGEMENT',
    items: [
      { 
        label: 'My Clients', 
        path: '/trainer/clients', 
        icon: Users,
        description: 'List of assigned clients with progress tracking'
      },
      { 
        label: 'Log Client Workout', 
        path: '/dashboard/trainer/log-workout', 
        icon: ClipboardCheck,
        description: 'NASM-compliant workout logging interface'
      },
      { 
        label: 'Client Progress', 
        path: '/trainer/client-progress', 
        icon: BarChart3,
        description: 'Detailed analytics and charts for client development'
      },
      { 
        label: 'Form Assessments', 
        path: '/trainer/assessments', 
        icon: Target,
        description: 'YOLO AI form check interface and corrections'
      }
    ]
  },
  {
    title: 'CONTENT STUDIO',
    items: [
      { 
        label: 'Training Videos', 
        path: '/trainer/videos', 
        icon: Video,
        description: 'Library of reusable training video content'
      },
      { 
        label: 'AI Workout Forge', 
        path: '/trainer/workout-forge', 
        icon: Brain,
        description: 'Generate AI-powered workout plans using Olympian\'s Forge'
      }
    ]
  },
  {
    title: 'UNIVERSAL TOOLS',
    items: [
      { 
        label: 'My Schedule', 
        path: '/trainer/schedule', 
        icon: Calendar,
        description: 'Personal view of appointments and availability'
      },
      { 
        label: 'Client Messages', 
        path: '/trainer/messages', 
        icon: MessageSquare,
        description: 'Direct messaging hub with clients'
      }
    ]
  }
];

// === ANIMATION VARIANTS ===
const containerVariants = {
  hidden: { opacity: 0, x: -50 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { 
      duration: 0.6,
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3 }
  }
};

// === MAIN COMPONENT ===
interface TrainerStellarSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onToggleMobile?: () => void;
}

const TrainerStellarSidebar: React.FC<TrainerStellarSidebarProps> = ({
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onToggleMobile
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle navigation
  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile && onToggleMobile) {
      onToggleMobile();
    }
  };

  // Check if path is active
  const isActiveRoute = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <ThemeProvider theme={trainerStellarTheme}>
      <TrainerSidebarContainer
        isCollapsed={isMobile ? false : isCollapsed}
        isMobileOpen={isMobileOpen}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header */}
        <TrainerSidebarHeader isCollapsed={isMobile ? false : isCollapsed}>
          <motion.div 
            className="trainer-logo"
            onClick={() => navigate('/trainer/overview')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="trainer-logo-icon">
              <Dumbbell size={20} />
            </div>
            <div className="trainer-logo-text">
              <div className="trainer-brand">Training Hub</div>
              <div className="trainer-subtitle">by SwanStudios</div>
            </div>
          </motion.div>
          
          {!isMobile && onToggleCollapse && (
            <motion.button
              className="trainer-collapse-btn"
              onClick={onToggleCollapse}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </motion.button>
          )}
        </TrainerSidebarHeader>
        
        {/* Navigation */}
        <TrainerNavigationSection isCollapsed={isMobile ? false : isCollapsed}>
          <motion.div variants={containerVariants}>
            {trainerNavigationConfig.map((section, sectionIndex) => (
              <div key={section.title} className="trainer-nav-section">
                <div className="trainer-section-title">{section.title}</div>
                <div className="trainer-nav-group">
                  {section.items.map((item, itemIndex) => {
                    const IconComponent = item.icon;
                    const isActive = isActiveRoute(item.path);
                    
                    return (
                      <TrainerNavItem
                        key={item.path}
                        isActive={isActive}
                        isCollapsed={isMobile ? false : isCollapsed}
                        onClick={() => handleNavigation(item.path)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleNavigation(item.path);
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
                        </div>
                        <span className="trainer-nav-text">{item.label}</span>
                        <div className="trainer-nav-tooltip">{item.label}</div>
                      </TrainerNavItem>
                    );
                  })}
                </div>
              </div>
            ))}
          </motion.div>
        </TrainerNavigationSection>
        
        {/* Footer */}
        <TrainerSidebarFooter isCollapsed={isMobile ? false : isCollapsed}>
          <div className="trainer-version-info">Training Hub v1.0</div>
          <div className="training-signature">Excellence by Seraphina</div>
        </TrainerSidebarFooter>
      </TrainerSidebarContainer>
    </ThemeProvider>
  );
};

export default TrainerStellarSidebar;
