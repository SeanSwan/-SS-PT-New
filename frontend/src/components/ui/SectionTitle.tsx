// src/components/ui/SectionTitle.tsx
import React from 'react';
import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';

// === EW tokens (scoped to variant="ew") ===
const ewTokens = {
  text: '#F0F8FF',
  primary: '#00D4AA',
  secondary: '#7851A9',
} as const;

interface SectionTitleProps {
  children: React.ReactNode;
  theme?: 'light' | 'dark' | 'cosmic' | 'purple';
  variant?: 'default' | 'ew';
  className?: string;
}

const ewStyles = css`
  font-family: 'Cormorant Garamond', 'Georgia', serif;
  font-style: italic;
  font-weight: 600;
  background: linear-gradient(135deg, ${ewTokens.text}, ${ewTokens.primary});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;

  &::after {
    background: linear-gradient(90deg, ${ewTokens.primary}, ${ewTokens.secondary});
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const StyledTitle = styled(motion.h2)<{ $variant?: 'default' | 'ew' }>`
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

  ${({ $variant }) => $variant === 'ew' && ewStyles}
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
  variant = 'default',
  className
}) => {
  return (
    <StyledTitle
      className={className}
      $variant={variant}
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
