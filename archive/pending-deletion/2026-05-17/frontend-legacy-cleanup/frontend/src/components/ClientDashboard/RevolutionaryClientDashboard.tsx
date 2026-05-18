/**
 * RevolutionaryClientDashboard.tsx (RESTORED ENHANCED VERSION)
 * ============================================================
 * 
 * Revolutionary Client Dashboard implementing the Crystalline Swan concept
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

import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { ThemeProvider, keyframes } from 'styled-components';
import {
  OverviewCrystalline, WorkoutUniverse, ProgressConstellation,
  AchievementNebula, TimeWarp, OnboardingCrystalline,
  AccountCrystalline
} from './CrystallineSections';
import StellarSidebar from './StellarSidebar';
import HealthCrystalline from './sections/HealthCrystalline';
import ClientWorkoutLoggerSection from './sections/ClientWorkoutLoggerSection';
import ClientAIWorkoutCreator from './sections/ClientAIWorkoutCreator';
import AIAssistantFAB from '../AIAssistant/AIAssistantFAB';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const MessagingPage = lazy(() => import('../../pages/MessagingPage'));
const LazyFormAnalysisCrystalline = lazy(() => import('./sections/FormAnalysisCrystalline'));
const NutritionWorkspace = lazy(() => import('../DashBoard/workspaces/NutritionWorkspace'));

const FormCheckCrystalline: React.FC = () => (
  <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', color: 'rgba(255,255,255,0.7)' }}>Loading form analysis...</div>}>
    <LazyFormAnalysisCrystalline />
  </Suspense>
);

const FoodIntelCrystalline: React.FC = () => (
  <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', color: 'rgba(255,255,255,0.7)' }}>Loading nutrition workspace...</div>}>
    <NutritionWorkspace />
  </Suspense>
);

const MessagesCrystalline: React.FC = () => (
  <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', color: 'rgba(255,255,255,0.7)' }}>Loading messages...</div>}>
    <MessagingPage />
  </Suspense>
);

// === THEME DEFINITION (Variable Bridge → Crystalline Swan) ===
// CSS custom properties with Crystalline Swan fallbacks for theme changer support
const crystallineTheme = {
  colors: {
    deepSpace: 'var(--brand-primary, #002060)',     // Midnight Sapphire
    nebulaPurple: 'var(--brand-secondary, #003080)', // Royal Depth
    cyberCyan: 'var(--accent-cyan, #60C0F0)',        // Ice Wing
    stellarWhite: 'var(--text-primary, #E0ECF4)',    // Frost White
    cosmicPurple: 'var(--accent-purple, #8B5CF6)',   // Wing Purple
    voidBlack: 'var(--bg-base, #0A0A0F)',            // Obsidian Black
    starGold: 'var(--accent-gold, #C6A84B)',         // Gilded Fern
    energyBlue: 'var(--data-cyan, #50A0F0)',         // Arctic Cyan (data only)
    plasmaGreen: 'var(--accent-cyan, #60C0F0)',      // Ice Wing
    warningRed: 'var(--danger, #ef4444)'
  },
  gradients: {
    galaxy: 'radial-gradient(ellipse at center, var(--brand-secondary, #003080) 0%, var(--brand-primary, #002060) 70%)',
    nebula: 'var(--gradient-cosmic-nebula, linear-gradient(135deg, #8B5CF6 0%, #60C0F0 50%, #003080 100%))',
    stellar: 'linear-gradient(45deg, var(--accent-cyan, #60C0F0) 0%, var(--accent-gold, #C6A84B) 100%)',
    cosmic: 'radial-gradient(circle, var(--accent-cyan, #60C0F0) 0%, var(--accent-purple, #8B5CF6) 70%, var(--brand-primary, #002060) 100%)',
    aurora: 'linear-gradient(270deg, var(--accent-cyan, #60C0F0), var(--accent-purple, #8B5CF6), var(--accent-gold, #C6A84B), var(--accent-cyan, #60C0F0))',
  },
  shadows: {
    stellar: '0 0 20px rgba(139, 92, 246, 0.5)',
    nebula: '0 0 30px rgba(139, 92, 246, 0.3)',
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
const CrystallineContainer = styled.div`
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
  background: rgba(0, 32, 96, 0.4);
  backdrop-filter: blur(15px);
  border-radius: 20px;
  border: 1px solid rgba(139, 92, 246, 0.3);
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
  background: rgba(0, 32, 96, 0.3);
  backdrop-filter: blur(15px);
  border-radius: 20px;
  border: 1px solid rgba(139, 92, 246, 0.2);
  padding: 2rem;
  min-height: 60vh;
  
  /* Custom Scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(0, 16, 48, 0.5);
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
  overview: OverviewCrystalline,
  onboarding: OnboardingCrystalline,
  schedule: TimeWarp,
  workouts: WorkoutUniverse,
  logger: ClientWorkoutLoggerSection,
  'ai-workout': ClientAIWorkoutCreator,
  'form-check': FormCheckCrystalline,
  progress: ProgressConstellation,
  health: HealthCrystalline,
  'food-intel': FoodIntelCrystalline,
  gamification: AchievementNebula,
  messages: MessagesCrystalline,
  account: AccountCrystalline,
};

const sectionTitles: Record<string, string> = {
  overview: 'Mission Control',
  onboarding: 'Your Fitness Profile',
  schedule: 'Time Warp Chamber',
  workouts: 'Training Universe',
  logger: 'Workout Logger',
  'ai-workout': 'Workout Intelligence',
  'form-check': 'Movement Analysis Hub',
  progress: 'Progress Constellation',
  health: 'Health & Body Map',
  'food-intel': 'Nutrition Intelligence',
  gamification: 'Achievement Nebula',
  messages: 'Stellar Messages',
  account: 'My Account',
};

const sectionDescriptions: Record<string, string> = {
  overview: 'Your complete fitness command center',
  onboarding: 'Complete your profile to unlock personalized training',
  schedule: 'Navigate your training appointments through time',
  workouts: 'Explore training programs and exercise galaxies',
  'form-check': 'Upload videos or use your camera — Swan Coach analyzes your exercise form',
  progress: 'Track your transformation through the cosmos',
  health: 'Report pain, track injuries, and keep your trainer informed',
  gamification: 'Celebrate your stellar accomplishments',
  messages: 'Connect with your trainer and team',
  account: 'Session credits, profile, and account settings',
};

// === PARTICLE BACKGROUND (isolated to prevent parent re-renders) ===
const ParticleBackground = React.memo(() => {
  // Static particles — generated once on mount, animation handled by Framer Motion
  // Avoids setInterval GC spikes every 15s (AI Village Phase 2 consensus fix)
  const particles = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5
    })),
  []);

  return (
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
  );
});

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
  const { user } = useAuth();
  const navigate = useNavigate();

  // Handle section change with migration
  const handleSectionChange = React.useCallback((sectionId: string) => {
    const migrated = migrateTabId(sectionId);
    setActiveSection(migrated);
    try {
      localStorage.setItem('clientDashboardTab', migrated);
    } catch { /* ignore storage errors */ }
  }, []);

  // Listen for internal tab navigation events (from child components)
  useEffect(() => {
    const handler = (e: Event) => {
      const tabId = (e as CustomEvent).detail;
      if (typeof tabId === 'string') handleSectionChange(tabId);
    };
    window.addEventListener('dashboard:navigate', handler);
    return () => window.removeEventListener('dashboard:navigate', handler);
  }, [handleSectionChange]);

  // Resolve section with fallback — prevents blank panels from unknown tab IDs
  const resolvedSection = activeSection in sectionComponents ? activeSection : 'overview';
  const CurrentSectionComponent = sectionComponents[resolvedSection];
  const currentTitle = sectionTitles[resolvedSection] ?? 'Crystalline Dashboard';
  const currentDescription = sectionDescriptions[resolvedSection] ?? 'Welcome to your cosmic fitness journey';
  
  return (
    <ThemeProvider theme={crystallineTheme}>
      <CrystallineContainer>
        {/* Background Particles (isolated component prevents parent re-renders) */}
        <ParticleBackground />
        
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
          {resolvedSection === 'messages' ? (
            /* Messages section renders full-width, bypassing ContentHeader/ContentArea padding */
            <AnimatePresence mode="wait">
              <motion.div
                key="messages"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ height: 'calc(100vh - 56px - 2rem)' }}
              >
                <CurrentSectionComponent />
              </motion.div>
            </AnimatePresence>
          ) : (
            <>
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
            </>
          )}
        </MainContent>

        {/* AI Assistant Floating Button + Drawer */}
        <AIAssistantFAB userRole="client" />
      </CrystallineContainer>
    </ThemeProvider>
  );
};

export default RevolutionaryClientDashboard;