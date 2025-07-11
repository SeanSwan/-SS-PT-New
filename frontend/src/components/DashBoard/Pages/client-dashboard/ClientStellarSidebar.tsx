/**
 * ClientStellarSidebar.tsx
 * ========================
 * 
 * Galactic Fitness Journey Sidebar for Client Dashboard
 * Implements the refactored client navigation from Alchemist's Opus v42
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Features:
 * - Galaxy Home constellation navigation with emerald-focused fitness theme
 * - Stellar gradients adapted for fitness journey excellence
 * - Advanced micro-interactions with galactic-level glow effects
 * - Mobile-first collapsible design with cosmic animations
 * - WCAG AA accessibility with keyboard navigation
 * - Performance-optimized with GPU acceleration
 * 
 * Refactored Navigation Structure (per Alchemist's Opus):
 * - GALAXY HOME: Overview, Workouts, Progress
 * - MISSION CONTROL: AI Forge, Meal Planner
 * - STAR NETWORK: Schedule, Community, Messages
 * - PERSONAL SPACE: Profile, Rewards
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import styled, { ThemeProvider, keyframes, css } from 'styled-components';
import { 
  Home, Dumbbell, TrendingUp, Calendar, MessageSquare, Users,
  ChevronLeft, ChevronRight, Menu, X, Star, Trophy, Brain, UtensilsCrossed,
  User, Award, Compass, Zap, Target
} from 'lucide-react';

// === CLIENT GALACTIC THEME ===
const clientGalacticTheme = {
  colors: {
    deepSpace: '#0a0a0f',
    galaxyEmerald: '#10b981',       // Primary emerald for clients
    cosmicGreen: '#22c55e',         // Bright green accents
    cyberCyan: '#00ffff',           // Keep signature cyan
    stellarWhite: '#ffffff',
    energyGreen: '#16a34a',         // Enhanced green energy
    warningAmber: '#f59e0b',        // Status indicators
    successGreen: '#10b981',        // Positive states
    criticalRed: '#ef4444',         // Alert states
    voidBlack: '#000000'
  },
  gradients: {
    galaxyHome: 'linear-gradient(135deg, #10b981 0%, #22c55e 50%, #00ffff 100%)',
    stellarNebula: 'linear-gradient(45deg, #0a1f0a 0%, #10b981 50%, #0a0a0f 100%)',
    dataFlow: 'radial-gradient(ellipse at top, #22c55e 0%, #10b981 50%, #0a0a0f 100%)',
    stellarCommand: 'conic-gradient(from 0deg, #00ffff, #22c55e, #10b981, #00ffff)',
    galaxyAurora: 'linear-gradient(270deg, #00ffff, #22c55e, #10b981, #00ffff)'
  },
  shadows: {
    stellarGlow: '0 0 30px rgba(16, 185, 129, 0.6)',
    galaxyNebula: '0 0 40px rgba(34, 197, 94, 0.4)',
    dataVisualization: '0 20px 40px rgba(0, 0, 0, 0.6)',
    cosmicGlow: '0 0 20px currentColor',
    galaxyCenter: 'inset 0 0 20px rgba(0, 255, 255, 0.2)'
  }
};

// === STYLED COMPONENTS ===
const ClientSidebarContainer = styled(motion.aside)`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: ${props => props.isCollapsed ? '80px' : '280px'};
  background: ${props => props.theme.gradients.stellarNebula};
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(16, 185, 129, 0.3);
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
      radial-gradient(2px 2px at 40px 60px, rgba(34, 197, 94, 0.3), transparent),
      radial-gradient(1px 1px at 90px 120px, rgba(16, 185, 129, 0.2), transparent),
      radial-gradient(1px 1px at 170px 80px, rgba(255, 255, 255, 0.1), transparent);
    background-size: 200px 160px;
    background-repeat: repeat;
    animation: galaxyFloat 60s linear infinite;
    opacity: 0.4;
    pointer-events: none;
  }
  
  @keyframes galaxyFloat {
    0% { transform: translateY(0) rotate(0deg); }
    100% { transform: translateY(-20px) rotate(360deg); }
  }
  
  @media (max-width: 768px) {
    transform: translateX(${props => props.isMobileOpen ? '0' : '-100%'});
    width: 280px;
    transition: transform 0.3s ease;
  }
`;

const ClientSidebarHeader = styled(motion.div)`
  padding: 1.5rem;
  border-bottom: 1px solid rgba(16, 185, 129, 0.2);
  position: relative;
  z-index: 2;
  
  .client-logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
    
    .client-logo-icon {
      width: 40px;
      height: 40px;
      background: ${props => props.theme.gradients.galaxyHome};
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${props => props.theme.colors.stellarWhite};
      box-shadow: ${props => props.theme.shadows.stellarGlow};
    }
    
    .client-logo-text {
      display: ${props => props.isCollapsed ? 'none' : 'flex'};
      flex-direction: column;
      
      .client-brand {
        font-size: 1.25rem;
        font-weight: 700;
        background: ${props => props.theme.gradients.galaxyHome};
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        line-height: 1.2;
      }
      
      .client-subtitle {
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.7);
        font-weight: 500;
      }
    }
  }
  
  .client-collapse-btn {
    position: absolute;
    top: 50%;
    right: -15px;
    transform: translateY(-50%);
    width: 30px;
    height: 30px;
    background: ${props => props.theme.gradients.galaxyHome};
    border: 2px solid rgba(16, 185, 129, 0.3);
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

const ClientNavigationSection = styled(motion.nav)`
  flex: 1;
  padding: 1rem 0;
  overflow-y: auto;
  position: relative;
  z-index: 2;
  
  .client-nav-section {
    margin-bottom: 2rem;
    
    .client-section-title {
      padding: 0.5rem 1.5rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.6);
      text-transform: uppercase;
      letter-spacing: 1px;
      display: ${props => props.isCollapsed ? 'none' : 'block'};
      margin-bottom: 0.5rem;
    }
    
    .client-nav-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
  }
`;

const ClientNavItem = styled(motion.div)`
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
    'rgba(16, 185, 129, 0.3)' : 
    'transparent'
  };
  
  border: 1px solid ${props => props.isActive ? 
    'rgba(16, 185, 129, 0.5)' : 
    'transparent'
  };
  
  &:hover {
    background: rgba(16, 185, 129, 0.2);
    border-color: rgba(16, 185, 129, 0.4);
    transform: translateX(4px);
    
    .client-nav-icon {
      color: ${props => props.theme.colors.cyberCyan};
      filter: drop-shadow(0 0 8px currentColor);
    }
  }
  
  .client-nav-icon {
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
  
  .client-nav-text {
    color: ${props => props.isActive ? 
      props.theme.colors.stellarWhite : 
      'rgba(255, 255, 255, 0.8)'
    };
    font-weight: ${props => props.isActive ? '600' : '500'};
    font-size: 0.9rem;
    display: ${props => props.isCollapsed ? 'none' : 'block'};
    transition: all 0.3s ease;
  }
  
  .client-nav-tooltip {
    position: absolute;
    left: calc(100% + 1rem);
    top: 50%;
    transform: translateY(-50%);
    background: rgba(16, 185, 129, 0.9);
    color: ${props => props.theme.colors.stellarWhite};
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    font-size: 0.8rem;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
    z-index: 1000;
    border: 1px solid rgba(16, 185, 129, 0.5);
    box-shadow: ${props => props.theme.shadows.stellarGlow};
    display: ${props => props.isCollapsed ? 'block' : 'none'};
  }
  
  &:hover .client-nav-tooltip {
    opacity: 1;
  }
`;

const ClientSidebarFooter = styled(motion.div)`
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(16, 185, 129, 0.2);
  position: relative;
  z-index: 2;
  
  .client-version-info {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.5);
    text-align: center;
    display: ${props => props.isCollapsed ? 'none' : 'block'};
  }
  
  .galaxy-signature {
    font-size: 0.6rem;
    color: rgba(16, 185, 129, 0.8);
    text-align: center;
    margin-top: 0.25rem;
    display: ${props => props.isCollapsed ? 'none' : 'block'};
  }
`;

// === NAVIGATION CONFIGURATION ===
const clientNavigationConfig = [
  {
    title: 'GALAXY HOME',
    items: [
      { 
        label: 'Overview', 
        path: '/client/overview', 
        icon: Home,
        description: 'Personalized hub with next workout and achievements'
      },
      { 
        label: 'My Workouts', 
        path: '/client/workouts', 
        icon: Dumbbell,
        description: 'List of assigned workout plans and routines'
      },
      { 
        label: 'My Progress', 
        path: '/client/progress', 
        icon: TrendingUp,
        description: 'Personal analytics, charts, and achievements'
      }
    ]
  },
  {
    title: 'MISSION CONTROL',
    items: [
      { 
        label: 'AI Workout Forge', 
        path: '/client/workout-forge', 
        icon: Brain,
        description: 'Generate personalized AI workouts (if package allows)'
      },
      { 
        label: 'AI Meal Planner', 
        path: '/client/meal-planner', 
        icon: UtensilsCrossed,
        description: 'Access to the Culinary Codex meal planning system'
      }
    ]
  },
  {
    title: 'STAR NETWORK',
    items: [
      { 
        label: 'Book My Session', 
        path: '/client/schedule', 
        icon: Calendar,
        description: 'Universal scheduling system for booking sessions'
      },
      { 
        label: 'Community & Challenges', 
        path: '/client/community', 
        icon: Users,
        description: 'Social feed and community challenge board'
      },
      { 
        label: 'Messages', 
        path: '/client/messages', 
        icon: MessageSquare,
        description: 'Inbox for trainer communications'
      }
    ]
  },
  {
    title: 'PERSONAL SPACE',
    items: [
      { 
        label: 'My Profile & Settings', 
        path: '/client/profile', 
        icon: User,
        description: 'Manage profile information and preferences'
      },
      { 
        label: 'My Rewards', 
        path: '/client/rewards', 
        icon: Award,
        description: 'View and redeem earned points and achievements'
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
interface ClientStellarSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onToggleMobile?: () => void;
}

const ClientStellarSidebar: React.FC<ClientStellarSidebarProps> = ({
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
    <ThemeProvider theme={clientGalacticTheme}>
      <ClientSidebarContainer
        isCollapsed={isMobile ? false : isCollapsed}
        isMobileOpen={isMobileOpen}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header */}
        <ClientSidebarHeader isCollapsed={isMobile ? false : isCollapsed}>
          <motion.div 
            className="client-logo"
            onClick={() => navigate('/client/overview')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="client-logo-icon">
              <Star size={20} />
            </div>
            <div className="client-logo-text">
              <div className="client-brand">Galaxy Home</div>
              <div className="client-subtitle">by SwanStudios</div>
            </div>
          </motion.div>
          
          {!isMobile && onToggleCollapse && (
            <motion.button
              className="client-collapse-btn"
              onClick={onToggleCollapse}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </motion.button>
          )}
        </ClientSidebarHeader>
        
        {/* Navigation */}
        <ClientNavigationSection isCollapsed={isMobile ? false : isCollapsed}>
          <motion.div variants={containerVariants}>
            {clientNavigationConfig.map((section, sectionIndex) => (
              <div key={section.title} className="client-nav-section">
                <div className="client-section-title">{section.title}</div>
                <div className="client-nav-group">
                  {section.items.map((item, itemIndex) => {
                    const IconComponent = item.icon;
                    const isActive = isActiveRoute(item.path);
                    
                    return (
                      <ClientNavItem
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
                        <div className="client-nav-icon">
                          <IconComponent size={20} />
                        </div>
                        <span className="client-nav-text">{item.label}</span>
                        <div className="client-nav-tooltip">{item.label}</div>
                      </ClientNavItem>
                    );
                  })}
                </div>
              </div>
            ))}
          </motion.div>
        </ClientNavigationSection>
        
        {/* Footer */}
        <ClientSidebarFooter isCollapsed={isMobile ? false : isCollapsed}>
          <div className="client-version-info">Galaxy Home v1.0</div>
          <div className="galaxy-signature">Journey by Seraphina</div>
        </ClientSidebarFooter>
      </ClientSidebarContainer>
    </ThemeProvider>
  );
};

export default ClientStellarSidebar;
