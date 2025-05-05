/**
 * ScheduleWrapper.tsx
 * 
 * A wrapper component for the Schedule page that provides consistent styling
 * with the rest of the application and proper page structure.
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import ScheduleContainer from './ScheduleContainer';

// Styled Components
const PageContainer = styled(motion.div)`
  min-height: 100vh;
  padding: 100px 20px 40px;
  background: linear-gradient(135deg, #090420 0%, #10032c 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  
  @media (max-width: 768px) {
    padding: 90px 10px 30px;
  }
`;

const ContentWrapper = styled(motion.div)`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  background: rgba(20, 17, 40, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const PageTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 300;
  color: white;
  margin-bottom: 2rem;
  text-align: center;
  background: linear-gradient(to right, #00ffff, #7851a9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  
  @media (max-width: 768px) {
    font-size: 1.8rem;
    margin-bottom: 1.5rem;
  }
`;

// Animation variants
const pageVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { 
      duration: 0.5,
      when: "beforeChildren",
      staggerChildren: 0.1
    } 
  },
  exit: { opacity: 0, transition: { duration: 0.3 } }
};

const contentVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.5,
      type: "spring", 
      stiffness: 100, 
      damping: 15
    } 
  },
  exit: { opacity: 0, y: 10, transition: { duration: 0.2 } }
};

const ScheduleWrapper: React.FC = () => {
  return (
    <PageContainer
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
    >
      <ContentWrapper variants={contentVariants}>
        <PageTitle>Training Schedule</PageTitle>
        <ScheduleContainer />
      </ContentWrapper>
    </PageContainer>
  );
};

export default ScheduleWrapper;
