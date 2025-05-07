/**
 * ScheduleWrapper.jsx
 * 
 * A high-level component that integrates the scheduling system into the application:
 * - Provides the container and routing integration for the schedule functionality
 * - Handles common layout concerns and ensures consistent styling
 * - Sets up the ScheduleContainer component with needed context
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import ScheduleContainer from './ScheduleContainer'; 

// Styled components
const SchedulePageContainer = styled(motion.div)`
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  position: relative;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
  
  // Gradient background effect
  background: linear-gradient(135deg, #13131f, #1a1a2e);
  
  // Grid pattern overlay
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
      linear-gradient(rgba(60, 60, 90, 0.1) 1px, transparent 1px),
      linear-gradient(90deg, rgba(60, 60, 90, 0.1) 1px, transparent 1px);
    background-size: 20px 20px;
    background-position: -1px -1px;
    z-index: 0;
    pointer-events: none;
  }
`;

const ContentWrapper = styled.div`
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const PageHeading = styled.h1`
  font-size: 2rem;
  font-weight: 300;
  color: white;
  margin-bottom: 1.5rem;
  
  @media (max-width: 768px) {
    font-size: 1.6rem;
  }
`;

// Animation variants
const pageVariants = {
  initial: {
    opacity: 0,
    y: 20
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut'
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: 'easeIn'
    }
  }
};

/**
 * Schedule Wrapper Component
 * This component provides the layout and context for the scheduling functionality
 */
const ScheduleWrapper = () => {
  const { user, isAuthenticated } = useAuth();
  
  // Title based on user role
  let pageTitle = 'Schedule';
  
  if (user?.role === 'admin') {
    pageTitle = 'Master Schedule Management';
  } else if (user?.role === 'trainer') {
    pageTitle = 'Trainer Schedule';
  } else if (user?.role === 'client') {
    pageTitle = 'Book Your Sessions';
  }
  
  return (
    <SchedulePageContainer
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
    >
      <ContentWrapper>
        <PageHeading>{pageTitle}</PageHeading>
        
        {/* Only render the schedule when authenticated */}
        {isAuthenticated ? (
          <ScheduleContainer />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <p>Please log in to access the scheduling system.</p>
          </motion.div>
        )}
      </ContentWrapper>
    </SchedulePageContainer>
  );
};

export default ScheduleWrapper;
