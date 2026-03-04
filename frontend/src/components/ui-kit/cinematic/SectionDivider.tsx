import React from 'react';
import styled from 'styled-components';

const DividerLine = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 0;
  display: flex;
  align-items: center;
  justify-content: center;

  &::after {
    content: '';
    display: block;
    width: 60%;
    height: 1px;
    background: ${({ theme }) => {
      if (theme.effects?.glowIntensity === 'none') {
        // Light and Mono themes: simple solid line
        return theme.id === 'crystalline-mono'
          ? 'rgba(255, 255, 255, 0.15)'
          : theme.borders?.subtle || '#E2E8F0';
      }
      // Dark themes: gradient line with glow
      return `linear-gradient(90deg, transparent, ${theme.colors?.primary || '#60C0F0'}, transparent)`;
    }};
    box-shadow: ${({ theme }) =>
      theme.effects?.glowIntensity === 'none'
        ? 'none'
        : `0 0 8px ${theme.colors?.primary || '#60C0F0'}40`
    };
  }
`;

const SectionDivider: React.FC<{ className?: string }> = ({ className }) => {
  return <DividerLine className={className} />;
};

export default SectionDivider;
