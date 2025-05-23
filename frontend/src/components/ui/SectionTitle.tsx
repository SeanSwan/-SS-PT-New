// src/components/ui/SectionTitle.tsx
import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

interface SectionTitleProps {
  children: React.ReactNode;
  theme?: 'light' | 'dark' | 'cosmic' | 'purple';
  className?: string;
}

const StyledTitle = styled(motion.h2)`
  text-align: center;
  font-size: 2.5rem;
  color: white;
  background: linear-gradient(90deg, #00ffff, #7851a9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  position: relative;
  margin: 0 auto 2rem;
  width: fit-content;
  display: table;
  
  &::after {
    content: "";
    position: absolute;
    bottom: -10px;
    left: 0;
    width: 100%;
    height: 3px;
    background: linear-gradient(90deg, #00ffff, #7851a9);
    border-radius: 3px;
  }
  
  @media (max-width: 768px) {
    font-size: 2.2rem;
  }
`;

const titleVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.7 } 
  }
};

const SectionTitle: React.FC<SectionTitleProps> = ({ 
  children, 
  className 
}) => {
  return (
    <StyledTitle 
      className={className}
      variants={titleVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      {children}
    </StyledTitle>
  );
};

export default SectionTitle;