import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { itemVariants } from './animation-variants';

// Styled component for dashboard sections
const DashboardSectionContainer = styled(motion.div)`
  margin-bottom: 1.5rem;
  padding: 1.5rem;
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
`;

interface DashboardSectionProps {
  children: React.ReactNode;
  variants?: any;
  style?: React.CSSProperties;
  className?: string;
}

const DashboardSection: React.FC<DashboardSectionProps> = ({ 
  children, 
  variants = itemVariants, 
  style 
}) => {
  return (
    <DashboardSectionContainer variants={variants} style={style}>
      {children}
    </DashboardSectionContainer>
  );
};

export default DashboardSection;
