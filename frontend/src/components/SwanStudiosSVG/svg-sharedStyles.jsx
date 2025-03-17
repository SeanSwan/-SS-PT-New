import React from 'react';
import styled, { keyframes } from 'styled-components';

// Animation keyframes
const dash = keyframes`
  from {
    stroke-dashoffset: 1000;
  }
  to {
    stroke-dashoffset: 0;
  }
`;

const flicker = keyframes`
  0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100% {
    opacity: 1;
    filter: drop-shadow(0 0 5px var(--color)) 
            drop-shadow(0 0 15px var(--color)) 
            drop-shadow(0 0 30px var(--color));
  }
  20%, 21.999%, 63%, 63.999%, 65%, 69.999% {
    opacity: 0.6;
    filter: none;
  }
`;

const glow = keyframes`
  0% {
    filter: drop-shadow(0 0 2px var(--color)) 
            drop-shadow(0 0 5px var(--color));
  }
  50% {
    filter: drop-shadow(0 0 7px var(--color)) 
            drop-shadow(0 0 15px var(--color)) 
            drop-shadow(0 0 25px var(--color));
  }
  100% {
    filter: drop-shadow(0 0 2px var(--color)) 
            drop-shadow(0 0 5px var(--color));
  }
`;

// Styled components
export const AnimatedPath = styled.path`
  fill: ${props => props.fill || 'none'};
  stroke: ${props => props.strokeColor || '#00ffff'};
  stroke-width: 2;
  --color: ${props => props.strokeColor || '#00ffff'};
  
  animation: ${dash} 2s ease forwards, 
             ${flicker} 5s infinite alternate, 
             ${glow} 3s infinite;
  
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  transition: all 0.3s ease;
  vector-effect: non-scaling-stroke;
`;

// Container for SVG elements
export const SVGContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: ${props => props.width || '100%'};
  height: ${props => props.height || 'auto'};
  overflow: visible;
  
  svg {
    max-width: 100%;
    height: auto;
    overflow: visible;
  }
  
  @media (max-width: 768px) {
    width: ${props => props.mobileWidth || props.width || '100%'};
    height: ${props => props.mobileHeight || props.height || 'auto'};
  }
`;

// Glass tube effect
export const GlassEffect = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.15) 0%,
    rgba(255, 255, 255, 0) 70%
  );
  pointer-events: none;
  z-index: 1;
`;

// For neon text
export const NeonText = styled.span`
  color: transparent;
  text-shadow: 0 0 5px ${props => props.color || '#00ffff'},
               0 0 10px ${props => props.color || '#00ffff'},
               0 0 20px ${props => props.color || '#00ffff'};
  animation: ${flicker} 5s infinite alternate;
  --color: ${props => props.color || '#00ffff'};
`;

// Background blur for neon-like effect
export const NeonBackground = styled.div`
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${props => props.color || '#00ffff'};
    opacity: 0.15;
    filter: blur(20px);
    z-index: -1;
  }
`;

export default {
  AnimatedPath,
  SVGContainer,
  GlassEffect,
  NeonText,
  NeonBackground
};