/**
 * RevolutionaryClientDashboard.tsx (RESTORED ENHANCED VERSION)
 * ============================================================
 * 
 * Revolutionary Client Dashboard implementing "The Gamified Galaxy" concept
 * Enhanced with Seraphina's Stellar Sidebar navigation system.
 * 
 * Key Features:
 * - Space exploration metaphor for fitness journey
 * - Stellar constellation sidebar navigation
 * - Achievement constellations with 3D effects
 * - Particle effects and nebula backgrounds
 * - Enhanced mobile-first design with collapsible sidebar
 * - WCAG AA accessibility compliance
 * 
 * Master Prompt v28 Alignment:
 * - Sensational aesthetics with stellar sidebar design
 * - Award-winning gradient systems and animations
 * - Mobile-first ultra-responsive layout
 * - Performance-optimized with GPU acceleration
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { ThemeProvider, keyframes } from 'styled-components';
import {
  OverviewGalaxy, WorkoutUniverse, ProgressConstellation,
  AchievementNebula, TimeWarp, OnboardingGalaxy,
  AccountGalaxy
} from './GalaxySections';
import StellarSidebar from './StellarSidebar';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const MessagingPage = lazy(() => import('../../pages/MessagingPage'));

const MessagesGalaxy: React.FC = () => (
  <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', color: 'rgba(255,255,255,0.7)' }}>Loading messages...</div>}>
    <MessagingPage />
  </Suspense>
);

// === THEME DEFINITION ===
const galaxyTheme = {
  colors: {
    deepSpace: '#0a0a0f',
    nebulaPurple: '#1e1e3f',
    cyberCyan: '#00ffff',
    stellarWhite: '#ffffff',
    cosmicPurple: '#7851a9',
    voidBlack: '#000000',
    starGold: '#ffd700',
    energyBlue: '#00c8ff',
    plasmaGreen: '#00ff88',
    warningRed: '#ff416c'
  },
  gradients: {
    galaxy: 'radial-gradient(ellipse at center, #1e1e3f 0%, #0a0a0f 70%)',
    nebula: 'linear-gradient(135deg, #7851a9 0%, #00ffff 50%, #1e1e3f 100%)',
    stellar: 'linear-gradient(45deg, #00ffff 0%, #ffd700 100%)',
    cosmic: 'radial-gradient(circle, #00ffff 0%, #7851a9 70%, #0a0a0f 100%)'
  },
  shadows: {
    stellar: '0 0 20px rgba(0, 255, 255, 0.5)',
    nebula: '0 0 30px rgba(120, 81, 169, 0.3)',
    cosmic: '0 15px 35px rgba(0, 0, 0, 0.5)',
    glow: '0 0 15px currentColor'
  }
};

// === KEYFRAME ANIMATIONS ===
const nebulaSpin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const starSparkle = keyframes`
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
`;

const particleFloat = keyframes`
  0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translate(100px, -100px) rotate(180deg); opacity: 0; }
`;

// === STYLED COMPONENTS ===
const GalaxyContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background: ${props => props.theme.gradients.galaxy};
  color: ${props => props.theme.colors.stellarWhite};
  font-family: 'Inter', 'Roboto', sans-serif;
  position: relative;
  
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(2px 2px at 20px 30px, ${props => props.theme.colors.cyberCyan}, transparent),
      radial-gradient(2px 2px at 40px 70px, ${props => props.theme.colors.starGold}, transparent),
      radial-gradient(1px 1px at 90px 40px, ${props => props.theme.colors.stellarWhite}, transparent),
      radial-gradient(1px 1px at 130px 80px, ${props => props.theme.colors.cyberCyan}, transparent),
      radial-gradient(2px 2px at 180px 30px, ${props => props.theme.colors.cosmicPurple}, transparent);
    background-repeat: repeat;
    background-size: 200px 100px;
    animation: ${nebulaSpin} 120s linear infinite;
    opacity: 0.6;
    pointer-events: none;
    z-index: -1;
  }
`;

const MainContent = styled(motion.main)`
  flex: 1;
  margin-left: 280px;
  margin-top: 56px; /* Account for fixed header */
  padding: 2rem;
  min-height: calc(100vh - 56px); /* Remaining height after header */
  position: relative;
  
  @media (max-width: 768px) {
    margin-left: 0;
    padding: 1rem;
    margin-top: 56px; /* Keep header space on mobile too */
  }
`;

const ContentHeader = styled(motion.div)`
  background: rgba(30, 30, 60, 0.4);
  backdrop-filter: blur(15px);
  border-radius: 20px;
  border: 1px solid rgba(0, 255, 255, 0.3);
  padding: 2rem;
  margin-bottom: 2rem;
  text-align: center;
  
  h1 {
    background: ${props => props.theme.gradients.stellar};
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0;
    letter-spacing: 1px;
  }
  
  p {
    color: rgba(255, 255, 255, 0.8);
    font-size: 1.1rem;
    margin: 1rem 0 0 0;
  }
  
  @media (max-width: 768px) {
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    
    h1 {
      font-size: 2rem;
    }
    
    p {
      font-size: 1rem;
    }
  }
`;

const ContentArea = styled(motion.div)`
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(15px);
  border-radius: 20px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  padding: 2rem;
  min-height: 60vh;
  
  /* Custom Scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(10, 10, 15, 0.5);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.colors.cyberCyan};
    border-radius: 4px;
    
    &:hover {
      background: ${props => props.theme.colors.stellarWhite};
    }
  }
  
  @media (max-width: 768px) {
    padding: 1.5rem;
    margin: 0;
  }
`;

const AchievementConstellation = styled(motion.div)`
  position: fixed;
  width: 60px;
  height: 60px;
  top: ${props => props.top || 'calc(56px + 15%)'}; /* Account for header */
  right: ${props => props.right || '10%'};
  z-index: 1;
  
  &::before {
    content: '✦';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 1.5rem;
    color: ${props => props.theme.colors.starGold};
    animation: ${starSparkle} 2s ease-in-out infinite;
    text-shadow: ${props => props.theme.shadows.glow};
  }
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const ParticleField = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
`;

const Particle = styled(motion.div)`
  position: absolute;
  width: 3px;
  height: 3px;
  background: ${props => props.theme.colors.cyberCyan};
  border-radius: 50%;
  opacity: 0;
`;

// === TAB MIGRATION: old IDs → new IDs ===
const TAB_MIGRATION: Record<string, string> = {
  community: 'overview',
  videos: 'overview',
  settings: 'account',
  logs: 'workouts',
  packages: 'account',
  profile: 'account',
  achievements: 'gamification', // renamed tab ID
};
const migrateTabId = (id: string): string => TAB_MIGRATION[id] ?? id;

// === SECTION MAPPING (7 tabs) ===
const sectionComponents: Record<string, React.FC> = {
  overview: OverviewGalaxy,
  onboarding: OnboardingGalaxy,
  schedule: TimeWarp,
  workouts: WorkoutUniverse,
  progress: ProgressConstellation,
  gamification: AchievementNebula,
  messages: MessagesGalaxy,
  account: AccountGalaxy,
};

const sectionTitles: Record<string, string> = {
  overview: 'Mission Control',
  onboarding: 'Your Fitness Profile',
  schedule: 'Time Warp Chamber',
  workouts: 'Training Universe',
  progress: 'Progress Constellation',
  gamification: 'Achievement Nebula',
  messages: 'Stellar Messages',
  account: 'My Account',
};

const sectionDescriptions: Record<string, string> = {
  overview: 'Your complete fitness command center',
  onboarding: 'Complete your profile to unlock personalized training',
  schedule: 'Navigate your training appointments through time',
  workouts: 'Explore training programs and exercise galaxies',
  progress: 'Track your transformation through the cosmos',
  gamification: 'Celebrate your stellar accomplishments',
  messages: 'Connect with your trainer and team',
  account: 'Session credits, profile, and account settings',
};

// === MAIN COMPONENT ===
const RevolutionaryClientDashboard: React.FC = () => {
  // Apply tab migration on initial hydration (handles stale localStorage values)
  const [activeSection, setActiveSection] = useState(() => {
    try {
      const stored = localStorage.getItem('clientDashboardTab');
      return stored ? migrateTabId(stored) : 'overview';
    } catch {
      return 'overview';
    }
  });
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Listen for internal tab navigation events (from child components)
  useEffect(() => {
    const handler = (e: Event) => {
      const tabId = (e as CustomEvent).detail;
      if (typeof tabId === 'string') handleSectionChange(tabId);
    };
    window.addEventListener('dashboard:navigate', handler);
    return () => window.removeEventListener('dashboard:navigate', handler);
  }, []);

  // Generate particles for background effect
  useEffect(() => {
    const generateParticles = () => {
      const newParticles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 5
      }));
      setParticles(newParticles);
    };

    generateParticles();
    const interval = setInterval(generateParticles, 15000);
    return () => clearInterval(interval);
  }, []);

  // Handle section change with migration
  const handleSectionChange = (sectionId: string) => {
    const migrated = migrateTabId(sectionId);
    setActiveSection(migrated);
    try {
      localStorage.setItem('clientDashboardTab', migrated);
    } catch { /* ignore storage errors */ }
  };

  // Resolve section with fallback — prevents blank panels from unknown tab IDs
  const resolvedSection = activeSection in sectionComponents ? activeSection : 'overview';
  const CurrentSectionComponent = sectionComponents[resolvedSection];
  const currentTitle = sectionTitles[resolvedSection] ?? 'Galaxy Dashboard';
  const currentDescription = sectionDescriptions[resolvedSection] ?? 'Welcome to your cosmic fitness journey';
  
  return (
    <ThemeProvider theme={galaxyTheme}>
      <GalaxyContainer>
        {/* Background Particles */}
        <ParticleField>
          {particles.map((particle) => (
            <Particle
              key={particle.id}
              initial={{ x: `${particle.x}%`, y: `${particle.y}%`, opacity: 0 }}
              animate={{ 
                x: `${particle.x + 20}%`, 
                y: `${particle.y - 20}%`, 
                opacity: [0, 1, 0] 
              }}
              transition={{
                duration: 12,
                delay: particle.delay,
                repeat: Infinity,
                repeatDelay: Math.random() * 10
              }}
            />
          ))}
        </ParticleField>
        
        {/* Achievement Constellations */}
        <AchievementConstellation
          top="calc(56px + 15%)"
          right="5%"
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        />
        <AchievementConstellation
          top="calc(56px + 75%)"
          right="8%"
          animate={{ rotate: -360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Stellar Sidebar */}
        <StellarSidebar
          activeSection={resolvedSection}
          onSectionChange={handleSectionChange}
        />
        
        {/* Main Content Area */}
        <MainContent
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Content Header */}
          <ContentHeader
            key={activeSection}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <h1>{currentTitle}</h1>
            <p>{currentDescription}</p>
          </ContentHeader>
          
          {/* Content Area */}
          <ContentArea
            key={`content-${activeSection}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.3 }}
              >
                <CurrentSectionComponent />
              </motion.div>
            </AnimatePresence>
          </ContentArea>
        </MainContent>
      </GalaxyContainer>
    </ThemeProvider>
  );
};

export default RevolutionaryClientDashboard;