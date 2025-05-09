import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";

// Styled components for the main content area
const MainWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
  height: 100%;
  width: 100%;
`;

const ContentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const PageTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    font-size: 1.5rem;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const ContentContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
  width: 100%;
`;

// Animation variants for content transitions
const contentVariants = {
  hidden: { 
    opacity: 0,
    y: 20 
  },
  visible: { 
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
      staggerChildren: 0.1
    }
  },
  exit: { 
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2 
    }
  }
};

// Animation variants for individual cards/items
const itemVariants = {
  hidden: { 
    opacity: 0,
    y: 15 
  },
  visible: { 
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3
    }
  }
};

// Props interface
interface ClientMainContentProps {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * ClientMainContent Component
 * 
 * A container for the main content area of the client dashboard.
 * Provides consistent layout, animations, and styling for all dashboard sections.
 * 
 * @param {string} title - The title of the current section
 * @param {ReactNode} actions - Optional buttons or actions to display in header
 * @param {ReactNode} children - The main content to display
 */
const ClientMainContent: React.FC<ClientMainContentProps> = ({
  title,
  actions,
  children
}) => {
  return (
    <MainWrapper>
      <ContentHeader>
        <PageTitle>{title}</PageTitle>
        {actions && <HeaderActions>{actions}</HeaderActions>}
      </ContentHeader>
      
      <motion.div
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={contentVariants}
      >
        <ContentContainer>{children}</ContentContainer>
      </motion.div>
    </MainWrapper>
  );
};

export default ClientMainContent;

// Additional exports for reusable components
export const Card = styled(motion.div).attrs(() => ({
  variants: itemVariants
}))`
  background-color: #1d1f2b;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  padding: ${({ theme }) => theme.spacing.lg};
  transition: ${({ theme }) => theme.transitions.medium};
  border: 1px solid rgba(66, 70, 93, 0.5);
  margin-bottom: ${({ theme }) => theme.spacing.md};
  
  &:hover {
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(80, 87, 122, 0.6);
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    padding: ${({ theme }) => theme.spacing.md};
  }
`;

export const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

export const CardTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
`;

export const CardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

export const CardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: ${({ theme }) => theme.spacing.md};
  padding-top: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid rgba(120, 81, 169, 0.5);
`;

export const Grid = styled.div<{ columns?: number }>`
  display: grid;
  grid-template-columns: repeat(${({ columns }) => columns || 3}, 1fr);
  gap: ${({ theme }) => theme.spacing.md};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
`;

export const Flex = styled.div<{ gap?: string, direction?: string, align?: string, justify?: string }>`
  display: flex;
  flex-direction: ${({ direction }) => direction || 'row'};
  gap: ${({ gap, theme }) => gap || theme.spacing.md};
  align-items: ${({ align }) => align || 'center'};
  justify-content: ${({ justify }) => justify || 'flex-start'};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    flex-direction: ${({ direction }) => direction || 'column'};
  }
`;

export const ProgressBar = styled.div<{ value: number; max?: number; color?: string }>`
  width: 100%;
  height: 8px;
  background-color: rgba(48, 51, 78, 0.5);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: ${({ value, max = 100 }) => `${Math.min(100, (value / max) * 100)}%`};
    background-color: ${({ theme, color }) => color || '#00ffff'};
    border-radius: 4px;
    transition: width 0.5s ease;
  }
`;

export const Badge = styled.span<{ color?: string }>`
  display: inline-block;
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
  background-color: ${({ color }) => color ? `${color}22` : `rgba(0, 255, 255, 0.15)`};
  color: ${({ color }) => color || '#00ffff'};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 0.8rem;
  font-weight: 500;
`;

export const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'outline' | 'text' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.short};
  
  ${({ variant }) => {
    switch (variant) {
      case 'primary':
        return `
          background-color: #00ffff;
          color: #121212;
          border: none;
          
          &:hover, &:focus {
            background-color: #33ccff;
          }
        `;
      case 'secondary':
        return `
          background-color: #7851a9;
          color: #00ffff;
          border: none;
          
          &:hover, &:focus {
            background-color: #8a62ba;
          }
        `;
      case 'outline':
        return `
          background-color: transparent;
          color: #00ffff;
          border: 1px solid #00ffff;
          
          &:hover, &:focus {
            background-color: rgba(0, 255, 255, 0.1);
          }
        `;
      case 'text':
        return `
          background-color: transparent;
          color: #7851a9;
          border: none;
          padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
          
          &:hover, &:focus {
            background-color: rgba(0, 187, 255, 0.1);
          }
        `;
      default:
        return `
          background-color: #7851a9;
          color: #121212;
          border: none;
          
          &:hover, &:focus {
            background-color: #9068c0;
          }
        `;
    }
  }}
  
  &:focus {
    outline: 2px solid #00ffff;
    outline-offset: 2px;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
