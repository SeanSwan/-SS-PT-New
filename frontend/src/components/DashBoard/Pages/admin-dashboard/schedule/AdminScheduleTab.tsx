/**
 * AdminScheduleTab.tsx
 * 
 * Enhanced Admin Schedule Tab with full space utilization
 * - Revolutionary layout design following Digital Alchemist principles
 * - Mobile-first responsive approach with sensational aesthetics
 * - Full viewport height utilization
 * - Minimal footer integration
 */

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { Calendar, Crown, TrendingUp } from 'lucide-react';

// Import components
import UnifiedCalendar from '../../../../Schedule/schedule';
import DashboardFooter from '../../../../Footer/DashboardFooter';
import ScheduleInitializer from '../../../../Schedule/ScheduleInitializer';
import ScheduleErrorBoundary from '../../../../Schedule/ScheduleErrorBoundary';

// Revolutionary container following Digital Alchemist principles
const AdminScheduleContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background: 
    radial-gradient(circle at 10% 20%, rgba(0, 255, 255, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(120, 81, 169, 0.05) 0%, transparent 50%),
    linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%);
  position: relative;
  overflow: hidden;
  
  /* Sensational background effects */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      repeating-linear-gradient(
        90deg,
        transparent 0px,
        rgba(0, 255, 255, 0.01) 1px,
        transparent 2px,
        transparent 40px
      ),
      repeating-linear-gradient(
        0deg,
        transparent 0px,
        rgba(120, 81, 169, 0.01) 1px,
        transparent 2px,
        transparent 40px
      );
    pointer-events: none;
    z-index: 0;
  }
`;

// Revolutionary header with premium aesthetics
const AdminScheduleHeader = styled(motion.div)`
  position: relative;
  z-index: 2;
  padding: 20px 24px;
  background: rgba(15, 12, 41, 0.8);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 255, 255, 0.1);
  
  /* Signature gradient underline */
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
      #00ffff 25%, 
      #7851a9 75%, 
      transparent 100%
    );
    animation: shimmer 3s ease-in-out infinite;
  }
  
  @keyframes shimmer {
    0%, 100% { opacity: 0.5; transform: translateX(-100%); }
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

const AdminIcon = styled(motion.div)`
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #00ffff, #7851a9);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
  box-shadow: 0 4px 16px rgba(0, 255, 255, 0.3);
  position: relative;
  
  /* Glow animation */
  &::before {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 14px;
    background: linear-gradient(135deg, #00ffff, #7851a9);
    filter: blur(4px);
    opacity: 0.7;
    z-index: -1;
    animation: glow 2s ease-in-out infinite alternate;
  }
  
  @keyframes glow {
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
  background: linear-gradient(135deg, #ffffff, #00ffff);
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

const StatsBar = styled(motion.div)`
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

const StatItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 8px;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  
  svg {
    color: #00ffff;
    font-size: 0.9rem;
  }
  
  &:hover {
    background: rgba(0, 255, 255, 0.15);
    border-color: rgba(0, 255, 255, 0.3);
    transform: translateY(-1px);
  }
  
  @media (max-width: 480px) {
    padding: 6px 10px;
    font-size: 0.8rem;
    
    svg {
      font-size: 0.8rem;
    }
  }
`;

// Revolutionary main content area
const ScheduleMainContent = styled(motion.div)`
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
  overflow: hidden;
  
  /* Premium card container */
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 0;
  backdrop-filter: blur(10px);
  
  /* Inner content padding and styling */
  .schedule-content {
    flex: 1;
    padding: 0;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
    
    /* Full height calendar container - target all nested divs to ensure UnifiedCalendar fills space */
    > div {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100% !important;
      min-height: calc(100vh - 160px) !important;
      
      > div {
        flex: 1;
        height: 100% !important;
      }
      
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

const AdminScheduleTab: React.FC = () => {
  const dispatch = useDispatch();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Enhanced initialization with proper document title
    document.title = "🎯 Schedule Management | Admin Dashboard - SwanStudios";
    
    // Simulate loading delay for smooth animation
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AdminScheduleContainer
        variants={containerVariants}
        initial="hidden"
        animate={isLoaded ? "visible" : "hidden"}
      >
        {/* Revolutionary Header Section */}
        <AdminScheduleHeader variants={headerVariants}>
          <HeaderContent>
            <TitleSection>
              <AdminIcon
                whileHover={{ 
                  scale: 1.1, 
                  rotate: 5 
                }}
                whileTap={{ scale: 0.95 }}
              >
                <Crown />
              </AdminIcon>
              <TitleText>
                <MainTitle variants={itemVariants}>
                  Schedule Management
                </MainTitle>
                <Subtitle variants={itemVariants}>
                  Comprehensive oversight of all training sessions across the platform
                </Subtitle>
              </TitleText>
            </TitleSection>
            
            <StatsBar variants={itemVariants}>
              <StatItem
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Calendar />
                All Sessions
              </StatItem>
              <StatItem
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <TrendingUp />
                Analytics
              </StatItem>
            </StatsBar>
          </HeaderContent>
        </AdminScheduleHeader>

        {/* Revolutionary Main Content */}
        <ScheduleMainContent variants={contentVariants}>
          <div className="schedule-content">
            {/* Use the same schedule component as the header link */}
            <ScheduleInitializer>
              <ScheduleErrorBoundary>
                <UnifiedCalendar />
              </ScheduleErrorBoundary>
            </ScheduleInitializer>
          </div>
        </ScheduleMainContent>

        {/* Minimal Dashboard Footer */}
        <DashboardFooter />
      </AdminScheduleContainer>
    </>
  );
};

export default AdminScheduleTab;