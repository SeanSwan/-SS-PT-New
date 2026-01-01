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
import { FaCalendarCheck, FaUserGraduate, FaDumbbell, FaClock, FaCalendar } from 'react-icons/fa';

// Import components
import ScheduleContainer from '../../../../Schedule/ScheduleContainer';
import DashboardFooter from '../../../../Footer/DashboardFooter';
import { theme, prefersReducedMotion } from '../../../../../theme/tokens';

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
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  min-height: 60px;
  background: rgba(30, 15, 41, 0.85);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(120, 81, 169, 0.2);

  /* Trainer signature gradient underline - static */
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
    opacity: 0.8;
  }

  /* Mobile-first responsive */
  @media (max-width: ${theme.breakpoints.tablet}) {
    padding: ${theme.spacing.md} ${theme.spacing.md};
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    padding: ${theme.spacing.sm} ${theme.spacing.md};
  }
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.md};

  @media (max-width: ${theme.breakpoints.tablet}) {
    flex-direction: column;
    align-items: flex-start;
    gap: ${theme.spacing.sm};
  }
`;

const TitleSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
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

  /* Static glow effect */
  &::before {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 14px;
    background: linear-gradient(135deg, #7851a9, #00ffff);
    filter: blur(4px);
    opacity: 0.7;
    z-index: -1;
  }

  @media (max-width: ${theme.breakpoints.tablet}) {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }
`;

const TitleText = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const MainTitle = styled(motion.h1)`
  font-size: 1.75rem;
  font-weight: ${theme.typography.weight.bold};
  margin: 0;
  background: linear-gradient(135deg, #ffffff, #7851a9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;

  @media (max-width: ${theme.breakpoints.tablet}) {
    font-size: 1.5rem;
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    font-size: 1.25rem;
  }
`;

const Subtitle = styled(motion.p)`
  font-size: 0.9rem;
  color: ${theme.colors.text.secondary};
  margin: 0;
  font-weight: ${theme.typography.weight.normal};

  @media (max-width: ${theme.breakpoints.tablet}) {
    font-size: 0.8rem;
  }
`;

const TrainerStatsBar = styled(motion.div)`
  display: flex;
  gap: ${theme.spacing.md};
  align-items: center;

  @media (max-width: ${theme.breakpoints.tablet}) {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: ${theme.spacing.sm};
  }
`;

const TrainerStatItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.sm};
  background: rgba(120, 81, 169, 0.1);
  border: 1px solid rgba(120, 81, 169, 0.2);
  border-radius: 8px;
  font-size: ${theme.typography.scale.sm};
  color: ${theme.colors.text.primary};
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;

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

  ${prefersReducedMotion} {
    transition: none !important;

    &:hover {
      transform: none !important;
    }
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    padding: 6px 10px;
    font-size: 0.8rem;

    svg {
      font-size: 0.8rem;
    }
  }
`;

const TodayFilterButton = styled(motion.button)`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  min-height: 44px;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 8px;
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.scale.sm};
  font-weight: ${theme.typography.weight.semibold};
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};

  svg {
    color: #00ffff;
    font-size: 0.9rem;
  }

  &:hover:not(:disabled) {
    background: rgba(0, 255, 255, 0.2);
    border-color: rgba(0, 255, 255, 0.4);
    transform: translateY(-1px);
  }

  &:focus {
    outline: 3px solid rgba(0, 255, 255, 0.5);
    outline-offset: 2px;
  }

  ${prefersReducedMotion} {
    transition: none !important;

    &:hover:not(:disabled) {
      transform: none !important;
    }
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    padding: 6px 10px;
    font-size: 0.8rem;
    min-height: 36px;

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

      @media (max-width: ${theme.breakpoints.tablet}) {
        min-height: calc(100vh - 140px) !important;
      }

      @media (max-width: ${theme.breakpoints.mobile}) {
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
              <TodayFilterButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  // Filter to today's sessions
                  const today = new Date().toDateString();
                  console.log('Filtering to today:', today);
                }}
              >
                <FaCalendar />
                Today's Sessions
              </TodayFilterButton>
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