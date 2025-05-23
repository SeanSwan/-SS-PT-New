/**
 * AdminScheduleTab.tsx
 * ====================
 * 
 * Executive Command Intelligence Schedule Management
 * Integrates the unified calendar component within the admin dashboard
 * Maintains the stellar blue-focused command center aesthetic
 * 
 * Features:
 * - Full calendar functionality with admin privileges
 * - Executive Command Intelligence theme consistency
 * - Mobile-responsive pixel-perfect design
 * - Real-time session management capabilities
 * - Seamless integration with existing schedule component
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import ScheduleErrorBoundary from '../../../Schedule/ScheduleErrorBoundary';
import ScheduleInitializer from '../../../Schedule/ScheduleInitializer';
import UnifiedCalendar from '../../../Schedule/schedule';

// Executive Command Intelligence Theme Colors
const executiveTheme = {
  deepSpace: '#0a0a0f',
  commandNavy: '#1e3a8a',
  stellarAuthority: '#3b82f6',
  cyberIntelligence: '#0ea5e9',
  executiveAccent: '#0891b2',
  stellarWhite: '#ffffff',
  platinumSilver: '#e5e7eb',
  cosmicGray: '#9ca3af',
};

// === STYLED COMPONENTS ===
const ScheduleContainer = styled(motion.div)`
  width: 100%;
  height: calc(100vh - 100px); /* Adjust for admin header */
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, 
    rgba(30, 58, 138, 0.05) 0%, 
    rgba(14, 165, 233, 0.02) 50%, 
    rgba(8, 145, 178, 0.05) 100%
  );
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  
  /* Executive glass effect */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, 
      rgba(30, 58, 138, 0.1) 0%, 
      rgba(14, 165, 233, 0.05) 100%
    );
    backdrop-filter: blur(10px);
    z-index: -1;
  }
  
  @media (max-width: 768px) {
    height: calc(100vh - 80px); /* Smaller header on mobile */
  }
`;

const ScheduleHeader = styled.div`
  padding: 2rem 2.5rem 1.5rem;
  background: linear-gradient(135deg, 
    rgba(30, 58, 138, 0.15) 0%, 
    rgba(59, 130, 246, 0.1) 100%
  );
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  backdrop-filter: blur(20px);
  
  @media (max-width: 768px) {
    padding: 1.5rem 1rem 1rem;
  }
`;

const HeaderTitle = styled.h1`
  font-size: 2rem;
  font-weight: 300;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, ${executiveTheme.stellarAuthority} 0%, ${executiveTheme.cyberIntelligence} 100%);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  margin: 0;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const HeaderSubtitle = styled.p`
  font-size: 0.95rem;
  color: ${executiveTheme.cosmicGray};
  margin: 0.5rem 0 0;
  font-weight: 400;
  
  @media (max-width: 768px) {
    font-size: 0.85rem;
  }
`;

const CalendarWrapper = styled.div`
  flex: 1;
  position: relative;
  overflow: hidden;
  padding: 1.5rem;
  display: flex;
  
  /* Override calendar component styling to match Executive theme */
  & > div {
    flex: 1;
    
    /*