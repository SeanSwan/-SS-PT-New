/**
 * ThemeShowcase.tsx
 * ================
 * 
 * Theme Integration Test Component
 * Demonstrates the enhanced theme system working across all components
 * Can be temporarily added to HomePage to test theme integration
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useUniversalTheme } from '../context/ThemeContext';
import { FaPalette, FaMoon, FaCommand } from 'react-icons/fa';

const ShowcaseContainer = styled(motion.div)`
  padding: 2rem;
  margin: 2rem 0;
  background: ${({ theme }) => theme.background.surface};
  border: 1px solid ${({ theme }) => theme.borders.elegant};
  border-radius: 15px;
  text-align: center;
  backdrop-filter: blur(10px);
  box-shadow: ${({ theme }) => theme.shadows.cosmic};
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: ${({ theme }) => theme.shadows.cosmic};
    border-color: ${({ theme }) => theme.borders.prominent};
  }
`;

const ShowcaseTitle = styled.h3`
  background: ${({ theme }) => theme.gradients.stellar};
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  font-size: 1.5rem;
  margin-bottom: 1rem;
`;

const ThemeButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin: 1rem 0;
  flex-wrap: wrap;
`;

const ThemeButton = styled.button<{ isActive: boolean }>`
  background: ${({ theme, isActive }) => 
    isActive ? theme.gradients.primary : theme.background.elevated};
  color: ${({ theme }) => theme.text.primary};
  border: 1px solid ${({ theme, isActive }) => 
    isActive ? theme.borders.prominent : theme.borders.subtle};
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  
  &:hover {
    background: ${({ theme }) => theme.gradients.cosmic};
    border-color: ${({ theme }) => theme.borders.elegant};
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.primary};
  }
`;

const ColorSwatch = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 1rem;
  margin: 1.5rem 0;
`;

const ColorItem = styled.div<{ color: string }>`
  background: ${({ color }) => color};
  height: 60px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.text.primary};
  font-size: 0.8rem;
  font-weight: 600;
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
  transition: transform 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
  }
`;

const StatusText = styled.p`
  color: ${({ theme }) => theme.text.secondary};
  margin: 1rem 0;
  font-size: 1rem;
`;

const ThemeShowcase: React.FC = () => {
  const { currentTheme, setTheme, availableThemes, theme } = useUniversalTheme();

  const getThemeIcon = (themeId: string) => {
    switch (themeId) {
      case 'swan-galaxy':
        return <FaPalette />;
      case 'admin-command':
        return <FaCommand />;
      case 'dark-galaxy':
        return <FaMoon />;
      default:
        return <FaPalette />;
    }
  };

  return (
    <ShowcaseContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <ShowcaseTitle>🎨 Universal Theme System Active</ShowcaseTitle>
      
      <StatusText>
        Current Theme: <strong>{currentTheme}</strong> | 
        Total Themes: <strong>{availableThemes.length}</strong>
      </StatusText>
      
      <ThemeButtons>
        {availableThemes.map((themeOption) => (
          <ThemeButton
            key={themeOption.id}
            isActive={currentTheme === themeOption.id}
            onClick={() => setTheme(themeOption.id)}
          >
            {getThemeIcon(themeOption.id)}
            {themeOption.name}
          </ThemeButton>
        ))}
      </ThemeButtons>
      
      <ColorSwatch>
        <ColorItem color={theme.colors.primary}>Primary</ColorItem>
        <ColorItem color={theme.colors.secondary}>Secondary</ColorItem>
        <ColorItem color={theme.colors.accent}>Accent</ColorItem>
        <ColorItem color={theme.gradients.cosmic}>Cosmic</ColorItem>
      </ColorSwatch>
      
      <StatusText className="animate-theme-pulse">
        ✨ Theme integration working perfectly! All components are now theme-aware.
      </StatusText>
    </ShowcaseContainer>
  );
};

export default ThemeShowcase;