/**
 * TrainerScheduleTab.tsx
 * 
 * Enhanced Trainer Schedule Tab with full space utilization
 * - Revolutionary layout design following Digital Alchemist principles
 * - Mobile-first responsive approach with sensational aesthetics
 * - Full viewport height utilization
 * - Trainer-specific styling and context
 */

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { FaCalendarCheck, FaUserGraduate, FaDumbbell, FaClock } from 'react-icons/fa';

// Import components
import ScheduleContainer from '../../../../Schedule/ScheduleContainer';
import DashboardFooter from '../../../../Footer/DashboardFooter';

// Revolutionary container with trainer-specific aesthetics
const TrainerScheduleContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background: 
    radial-gradient(circle at 20% 80%, rgba(120, 81, 169, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(0, 255, 255, 0.05) 0%, transparent 50%),
    linear-gradient(135deg, #0f0a1e 0%, #1e1a2e 50%, #2e1e3e 100%);
  position: relative;
  overflow: hidden;
  
  /* Trainer-specific background pattern */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      repeating-linear-gradient(
        45deg,
        transparent 0px,
        rgba(120, 81, 169, 0.01) 1px,
        transparent 2px,
        transparent 60px
      ),
      repeating-linear-gradient(
        -45deg,
        transparent 0px,
        rgba(0, 255, 255, 0.01) 1px,
        transparent 2px,
        transparent 60px
      );
    pointer-events: none;
    z-index: 0;
  }
`;

// Trainer-specific header with premium aesthetics
const TrainerScheduleHeader = styled(motion.div)`
  position: relative;
  z-index: 2;
  padding: 20px 24px;
  background: rgba(30, 15, 41, 0.85);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(120, 81, 169, 0.2);
  
  /* Trainer signature gradient underline */
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(
      90deg, 
      transparent 0%, 
      #7851a9 25%, 
      #00ffff 75%, 
      transparent 100%
    );
    animation: trainerShimmer 3s ease-in-out infinite;
  }
  
  @keyframes trainerShimmer {
    0%, 100% { opacity: 0.6; transform: translateX(-100%); }
    50% { opacity: 1; transform: translateX(100%); }
  }
  
  /* Mobile-first responsive */
  @media (max-width: 768px) {
    padding: 16px 20px;
  }
  
  @media (max-width: 480px) {
    padding: 12px 16px;
  }
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
`;

const TitleSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const TrainerIcon = styled(motion.div)`
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #7851a9, #00ffff);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
  box-shadow: 0 4px 16px rgba(120, 81, 169, 0.4);
  position: relative;
  
  /* Trainer-specific glow animation */
  &::before {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 14px;
    background: linear-gradient(135deg, #7851a9, #00ffff);
    filter: blur(4px);
    opacity: 0.7;
    z-index: -1;
    animation: trainerGlow 2.5s ease-in-out infinite alternate;
  }
  
  @keyframes trainerGlow {
    from { opacity: 0.7; transform: scale(1); }
    to { opacity: 1; transform: scale(1.05); }
  }
  
  @media (max-width: 768px) {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }
`;

const TitleText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const MainTitle = styled(motion.h1)`
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, #ffffff, #7851a9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.25rem;
  }
`;

const Subtitle = styled(motion.p)`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  font-weight: 400;
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
  }
`;

const TrainerStatsBar = styled(motion.div)`
  display: flex;
  gap: 16px;
  align-items: center;
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
    gap: 12px;
  }
  
  @media (max-width: 480px) {
    flex-wrap: wrap;
    gap: 8px;
  }
`;

const TrainerStatItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(120, 81, 169, 0.1);
  border: 1px solid rgba(120, 81, 169, 0.2);
  border-radius: 8px;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  
  svg {
    color: #7851a9;
    font-size: 0.9rem;
  }
  
  &:hover {
    background: rgba(120, 81, 169, 0.15);
    border-color: rgba(120, 81, 169, 0.3);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(120, 81, 169, 0.2);
  }
  
  @media (max-width: 480px) {
    padding: 6px 10px;
    font-size: 0.8rem;
    
    svg {
      font-size: 0.8rem;
    }
  }
`;

// Revolutionary main content area for trainers
const TrainerScheduleMainContent = styled(motion.div)`
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
  overflow: hidden;
  
  /* Premium card container with trainer styling */
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(120, 81, 169, 0.1);
  border-radius: 0;
  backdrop-filter: blur(10px);
  
  /* Inner content padding and styling */
  .schedule-content {
    flex: 1;
    padding: 0;
    overflow: hidden;
    position: relative;
    
    /* Full height calendar container */
    > div {
      height: 100% !important;
      min-height: calc(100vh - 160px) !important;
      
      @media (max-width: 768px) {
        min-height: calc(100vh - 140px) !important;
      }
      
      @media (max-width: 480px) {
        min-height: calc(100vh - 120px) !important;
      }
    }
  }
`;

// Animation variants following Digital Alchemist principles
const containerVariants = {
  hidden: { 
    opacity: 0,
    scale: 0.95
  },
  visible: { 
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.1
    }
  }
};

const headerVariants = {
  hidden: { 
    opacity: 0, 
    y: -30 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

const contentVariants = {
  hidden: { 
    opacity: 0, 
    y: 20 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
      delay: 0.2,
      ease: "easeOut"
    }
  }
};

const itemVariants = {
  hidden: { 
    opacity: 0, 
    x: -20 
  },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

const TrainerScheduleTab: React.FC = () => {
  const dispatch = useDispatch();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Enhanced initialization with proper document title
    document.title = "💪 My Training Schedule | Trainer Dashboard - SwanStudios";
    
    // Simulate loading delay for smooth animation
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <TrainerScheduleContainer
        variants={containerVariants}
        initial="hidden"
        animate={isLoaded ? "visible" : "hidden"}
      >
        {/* Revolutionary Header Section */}
        <TrainerScheduleHeader variants={headerVariants}>
          <HeaderContent>
            <TitleSection>
              <TrainerIcon
                whileHover={{ 
                  scale: 1.1, 
                  rotate: -5 
                }}
                whileTap={{ scale: 0.95 }}
              >
                <FaUserGraduate />
              </TrainerIcon>
              <TitleText>
                <MainTitle variants={itemVariants}>
                  My Training Schedule
                </MainTitle>
                <Subtitle variants={itemVariants}>
                  Manage your sessions, track client progress, and optimize your training schedule
                </Subtitle>
              </TitleText>
            </TitleSection>
            
            <TrainerStatsBar variants={itemVariants}>
              <TrainerStatItem
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <FaCalendarCheck />
                My Sessions
              </TrainerStatItem>
              <TrainerStatItem
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <FaDumbbell />
                Active Clients
              </TrainerStatItem>
              <TrainerStatItem
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <FaClock />
                Today's Schedule
              </TrainerStatItem>
            </TrainerStatsBar>
          </HeaderContent>
        </TrainerScheduleHeader>

        {/* Revolutionary Main Content */}
        <TrainerScheduleMainContent variants={contentVariants}>
          <div className="schedule-content">
            <ScheduleContainer />
          </div>
        </TrainerScheduleMainContent>

        {/* Minimal Dashboard Footer */}
        <DashboardFooter />
      </TrainerScheduleContainer>
    </>
  );
};

export default TrainerScheduleTab;