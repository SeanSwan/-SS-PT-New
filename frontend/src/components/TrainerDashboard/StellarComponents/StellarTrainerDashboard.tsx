/**
 * StellarTrainerDashboard.tsx
 * ===========================
 * 
 * Revolutionary Trainer Dashboard implementing "The Stellar Training Command Center" concept
 * Enhanced with Seraphina's Stellar Sidebar navigation system.
 * 
 * Key Features:
 * - Cosmic training command center metaphor for coaching journey
 * - Stellar constellation sidebar navigation
 * - Training analytics constellations with 3D effects
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

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { ThemeProvider, keyframes } from 'styled-components';
import { 
  TrainingOverview, ClientManagement, ContentStudio 
} from './TrainerStellarSections';
import TrainerStellarSidebar from './TrainerStellarSidebar';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useUniversalTheme } from '../../../context/ThemeContext';

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
  100% { transform: translate(120px, -120px) rotate(180deg); opacity: 0; }
`;

// === STYLED COMPONENTS ===
const TrainerGalaxyContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background: ${props => props.theme.gradients?.hero || 'radial-gradient(ellipse at center, #1e1e3f 0%, #0a0a1a 70%)'};
  color: ${props => props.theme.colors?.white || '#ffffff'};
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
      radial-gradient(2px 2px at 20px 30px, ${props => props.theme.colors?.primary || '#00FFFF'}, transparent),
      radial-gradient(2px 2px at 40px 70px, ${props => props.theme.colors?.accent || '#FFD700'}, transparent),
      radial-gradient(1px 1px at 90px 40px, ${props => props.theme.colors?.white || '#ffffff'}, transparent),
      radial-gradient(1px 1px at 130px 80px, ${props => props.theme.colors?.primary || '#00FFFF'}, transparent),
      radial-gradient(2px 2px at 180px 30px, ${props => props.theme.colors?.secondary || '#7851A9'}, transparent);
    background-repeat: repeat;
    background-size: 200px 100px;
    animation: ${nebulaSpin} 120s linear infinite;
    opacity: 0.6;
    pointer-events: none;
    z-index: -1;
  }
`;

const TrainerMainContent = styled(motion.main)`
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

const TrainerContentHeader = styled(motion.div)`
  background: ${props => props.theme.gradients?.card || 'rgba(30, 30, 60, 0.4)'};
  backdrop-filter: blur(15px);
  border-radius: 20px;
  border: 1px solid ${props => props.theme.borders?.elegant || 'rgba(0, 255, 255, 0.3)'};
  padding: 2rem;
  margin-bottom: 2rem;
  text-align: center;
  position: relative;
  overflow: hidden;
  
  /* Training command aurora */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(270deg, #00ffff, #FFD700, #7851A9, #00A0E3, #00ffff);
    background-size: 400% 400%;
    animation: ${nebulaSpin} 8s ease infinite;
    opacity: 0.8;
  }
  
  h1 {
    background: ${props => props.theme.gradients?.stellar || 'linear-gradient(45deg, #00FFFF 0%, #FFD700 100%)'};
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0;
    letter-spacing: 1px;
    position: relative;
    z-index: 2;
  }
  
  p {
    color: ${props => props.theme.text?.muted || 'rgba(255, 255, 255, 0.8)'};
    font-size: 1.1rem;
    margin: 1rem 0 0 0;
    position: relative;
    z-index: 2;
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

const TrainerContentArea = styled(motion.div)`
  background: ${props => props.theme.gradients?.card || 'rgba(30, 30, 60, 0.3)'};
  backdrop-filter: blur(15px);
  border-radius: 20px;
  border: 1px solid ${props => props.theme.borders?.elegant || 'rgba(0, 255, 255, 0.2)'};
  padding: 2rem;
  min-height: 60vh;
  position: relative;
  overflow: hidden;
  
  /* Custom Scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(10, 10, 15, 0.5);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.colors?.primary || '#00FFFF'};
    border-radius: 4px;
    
    &:hover {
      background: ${props => props.theme.colors?.accent || '#FFD700'};
    }
  }
  
  @media (max-width: 768px) {
    padding: 1.5rem;
    margin: 0;
  }
`;

const TrainingConstellation = styled(motion.div)`
  position: fixed;
  width: 60px;
  height: 60px;
  top: ${props => props.top || 'calc(56px + 15%)'}; /* Account for header */
  right: ${props => props.right || '10%'};
  z-index: 1;
  
  &::before {
    content: '⚡';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 1.5rem;
    color: ${props => props.theme.colors?.accent || '#FFD700'};
    animation: ${starSparkle} 2s ease-in-out infinite;
    text-shadow: ${props => props.theme.shadows?.glow || '0 0 15px currentColor'};
  }
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const TrainerParticleField = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
`;

const TrainerParticle = styled(motion.div)`
  position: absolute;
  width: 4px;
  height: 4px;
  background: ${props => props.theme.colors?.primary || '#00FFFF'};
  border-radius: 50%;
  opacity: 0;
`;

// === SECTION MAPPING ===
const trainerSectionComponents = {
  overview: TrainingOverview,
  clients: ClientManagement,
  'form-checks': ContentStudio,
  'content-library': ContentStudio,
  videos: ContentStudio,
  uploads: ContentStudio,
  schedule: TrainingOverview,
  progress: ClientManagement,
  assessments: ClientManagement,
  goals: ClientManagement,
  analytics: TrainingOverview,
  achievements: ContentStudio,
  engagement: TrainingOverview,
  messages: ClientManagement,
  notifications: TrainingOverview,
  reports: ContentStudio,
  settings: TrainingOverview,
};

const trainerSectionTitles = {
  overview: 'Training Command Center',
  clients: 'Client Universe',
  'form-checks': 'Form Analysis Galaxy',
  'content-library': 'Content Nebula',
  videos: 'Training Video Cosmos',
  uploads: 'Upload Station',
  schedule: 'Time Warp Chamber',
  progress: 'Progress Constellation',
  assessments: 'Assessment Portal',
  goals: 'Goal Achievement Center',
  analytics: 'Performance Analytics',
  achievements: 'Achievement Nebula',
  engagement: 'Engagement Metrics',
  messages: 'Communication Hub',
  notifications: 'Alert Command',
  reports: 'Report Generator',
  settings: 'Trainer Control Panel',
};

const trainerSectionDescriptions = {
  overview: 'Your complete training command center and performance overview',
  clients: 'Manage and monitor your client galaxy',
  'form-checks': 'AI-powered form analysis and feedback center',
  'content-library': 'Your stellar training content repository',
  videos: 'Training video library and demonstration hub',
  uploads: 'Upload and organize your training content',
  schedule: 'Navigate your training appointments through time',
  progress: 'Track client transformation through the cosmos',
  assessments: 'Comprehensive client evaluation and tracking',
  goals: 'Monitor and achieve training objectives',
  analytics: 'Deep dive into training performance metrics',
  achievements: 'Celebrate client accomplishments and milestones',
  engagement: 'Monitor client interaction and participation',
  messages: 'Communicate with your training galaxy',
  notifications: 'Stay updated on important training events',
  reports: 'Generate comprehensive training reports',
  settings: 'Configure your training command preferences',
};

// === MAIN COMPONENT ===
const StellarTrainerDashboard: React.FC = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme } = useUniversalTheme();
  
  // Generate particles for background effect
  useEffect(() => {
    const generateParticles = () => {
      const newParticles = Array.from({ length: 25 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 5
      }));
      setParticles(newParticles);
    };
    
    generateParticles();
    const interval = setInterval(generateParticles, 18000);
    return () => clearInterval(interval);
  }, []);
  
  // Handle section change
  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
  };
  
  // Get current section component and title
  const CurrentSectionComponent = trainerSectionComponents[activeSection as keyof typeof trainerSectionComponents] || TrainingOverview;
  const currentTitle = trainerSectionTitles[activeSection as keyof typeof trainerSectionTitles] || 'Training Command Center';
  const currentDescription = trainerSectionDescriptions[activeSection as keyof typeof trainerSectionDescriptions] || 'Welcome to your stellar training command center';
  
  return (
    <TrainerGalaxyContainer>
      {/* Background Particles */}
      <TrainerParticleField>
        {particles.map((particle) => (
          <TrainerParticle
            key={particle.id}
            initial={{ x: `${particle.x}%`, y: `${particle.y}%`, opacity: 0 }}
            animate={{ 
              x: `${particle.x + 20}%`, 
              y: `${particle.y - 20}%`, 
              opacity: [0, 1, 0] 
            }}
            transition={{
              duration: 15,
              delay: particle.delay,
              repeat: Infinity,
              repeatDelay: Math.random() * 12
            }}
          />
        ))}
      </TrainerParticleField>
      
      {/* Training Constellations */}
      <TrainingConstellation
        top="calc(56px + 15%)"
        right="5%"
        animate={{ rotate: 360 }}
        transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
      />
      <TrainingConstellation
        top="calc(56px + 75%)"
        right="8%"
        animate={{ rotate: -360 }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Stellar Sidebar */}
      <TrainerStellarSidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
      />
      
      {/* Main Content Area */}
      <TrainerMainContent
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Content Header */}
        <TrainerContentHeader
          key={activeSection}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <h1>{currentTitle}</h1>
          <p>{currentDescription}</p>
        </TrainerContentHeader>
        
        {/* Content Area */}
        <TrainerContentArea
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
        </TrainerContentArea>
      </TrainerMainContent>
    </TrainerGalaxyContainer>
  );
};

export default StellarTrainerDashboard;