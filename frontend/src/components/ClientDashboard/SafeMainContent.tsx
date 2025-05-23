import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";

// Fallback theme values in case theme is undefined
const fallbackTheme = {
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px'
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px'
  },
  colors: {
    text: '#ffffff',
    primary: '#00ffff'
  },
  breakpoints: {
    xs: '0px',
    sm: '600px',
    md: '960px',
    lg: '1280px',
    xl: '1920px'
  },
  transitions: {
    short: 'all 0.2s ease',
    medium: 'all 0.3s ease-in-out'
  }
};

// Helper function to safely access theme properties
const getThemeValue = (props, path, fallback) => {
  try {
    // Split the path into parts (e.g., "spacing.lg" -> ["spacing", "lg"])
    const pathParts = path.split('.');
    
    // Start with the theme object or fallback if theme is missing
    let value = props.theme || fallbackTheme;
    
    // Navigate through the path parts
    for (const part of pathParts) {
      // If the current level exists and has the property, move to next level
      if (value && value[part] !== undefined) {
        value = value[part];
      } else {
        // Property not found in theme, use fallback
        return fallback;
      }
    }
    
    return value;
  } catch (error) {
    // If any error occurs, use fallback
    console.warn(`Theme error: ${error.message}, using fallback value`);
    return fallback;
  }
};

// Styled components using the safe accessor function
const MainWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => getThemeValue(props, 'spacing.lg', '24px')};
  height: 100%;
  width: 100%;
`;

const ContentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${props => getThemeValue(props, 'spacing.md', '16px')};
`;

const PageTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${props => getThemeValue(props, 'colors.text', '#ffffff')};
  margin: 0;
  
  @media (max-width: ${props => getThemeValue(props, 'breakpoints.md', '960px')}) {
    font-size: 1.5rem;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: ${props => getThemeValue(props, 'spacing.sm', '8px')};
`;

const ContentContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => getThemeValue(props, 'spacing.md', '16px')};
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
interface SafeMainContentProps {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * SafeMainContent Component
 * 
 * A safer version of ClientMainContent that handles theme errors gracefully.
 * Provides consistent layout, animations, and styling for all dashboard sections.
 * 
 * @param {string} title - The title of the current section
 * @param {ReactNode} actions - Optional buttons or actions to display in header
 * @param {ReactNode} children - The main content to display
 */
const SafeMainContent: React.FC<SafeMainContentProps> = ({
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

export default SafeMainContent;

// Additional exports for reusable components with safe theme access
export const Card = styled(motion.div).attrs(() => ({
  variants: itemVariants
}))`
  background-color: #1d1f2b;
  border-radius: ${props => getThemeValue(props, 'borderRadius.lg', '12px')};
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  padding: ${props => getThemeValue(props, 'spacing.lg', '24px')};
  transition: ${props => getThemeValue(props, 'transitions.medium', 'all 0.3s ease-in-out')};
  border: 1px solid rgba(66, 70, 93, 0.5);
  margin-bottom: ${props => getThemeValue(props, 'spacing.md', '16px')};
  
  &:hover {
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(80, 87, 122, 0.6);
  }
  
  @media (max-width: ${props => getThemeValue(props, 'breakpoints.md', '960px')}) {
    padding: ${props => getThemeValue(props, 'spacing.md', '16px')};
  }
`;

export const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${props => getThemeValue(props, 'spacing.md', '16px')};
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
  gap: ${props => getThemeValue(props, 'spacing.md', '16px')};
`;

export const CardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: ${props => getThemeValue(props, 'spacing.md', '16px')};
  padding-top: ${props => getThemeValue(props, 'spacing.md', '16px')};
  border-top: 1px solid rgba(120, 81, 169, 0.5);
`;

export const Grid = styled.div<{ columns?: number }>`
  display: grid;
  grid-template-columns: repeat(${({ columns }) => columns || 3}, 1fr);
  gap: ${props => getThemeValue(props, 'spacing.md', '16px')};
  
  @media (max-width: ${props => getThemeValue(props, 'breakpoints.lg', '1280px')}) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: ${props => getThemeValue(props, 'breakpoints.md', '960px')}) {
    grid-template-columns: 1fr;
  }
`;

export const Flex = styled.div<{ gap?: string, direction?: string, align?: string, justify?: string }>`
  display: flex;
  flex-direction: ${({ direction }) => direction || 'row'};
  gap: ${props => props.gap || getThemeValue(props, 'spacing.md', '16px')};
  align-items: ${({ align }) => align || 'center'};
  justify-content: ${({ justify }) => justify || 'flex-start'};
  
  @media (max-width: ${props => getThemeValue(props, 'breakpoints.md', '960px')}) {
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
    background-color: ${props => props.color || getThemeValue(props, 'colors.primary', '#00ffff')};
    border-radius: 4px;
    transition: width 0.5s ease;
  }
`;

export const Badge = styled.span<{ color?: string }>`
  display: inline-block;
  padding: ${props => `${getThemeValue(props, 'spacing.xs', '4px')} ${getThemeValue(props, 'spacing.sm', '8px')}`};
  background-color: ${({ color }) => color ? `${color}22` : `rgba(0, 255, 255, 0.15)`};
  color: ${({ color }) => color || '#00ffff'};
  border-radius: ${props => getThemeValue(props, 'borderRadius.md', '8px')};
  font-size: 0.8rem;
  font-weight: 500;
`;

export const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'outline' | 'text' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${props => getThemeValue(props, 'spacing.sm', '8px')};
  padding: ${props => `${getThemeValue(props, 'spacing.sm', '8px')} ${getThemeValue(props, 'spacing.md', '16px')}`};
  border-radius: ${props => getThemeValue(props, 'borderRadius.md', '8px')};
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: ${props => getThemeValue(props, 'transitions.short', 'all 0.2s ease')};
  
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
          padding: 4px 8px;
          
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
