/**
 * GlowButton.tsx
 * 
 * A premium styled button component with glow effects, animations, and different themes.
 * Used throughout the application for a consistent premium look and feel.
 */

import React from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion } from 'framer-motion';

// Animation keyframes
const pulse = keyframes`
  0% {
    box-shadow: 0 0 8px 0 rgba(0, 255, 255, 0.4), 0 0 12px 0 rgba(0, 255, 255, 0.2);
  }
  50% {
    box-shadow: 0 0 16px 2px rgba(0, 255, 255, 0.6), 0 0 20px 4px rgba(0, 255, 255, 0.3);
  }
  100% {
    box-shadow: 0 0 8px 0 rgba(0, 255, 255, 0.4), 0 0 12px 0 rgba(0, 255, 255, 0.2);
  }
`;

const cosmicPulse = keyframes`
  0% {
    box-shadow: 0 0 8px 0 rgba(120, 81, 169, 0.4), 0 0 12px 0 rgba(0, 255, 255, 0.2);
  }
  50% {
    box-shadow: 0 0 16px 2px rgba(120, 81, 169, 0.6), 0 0 20px 4px rgba(0, 255, 255, 0.3);
  }
  100% {
    box-shadow: 0 0 8px 0 rgba(120, 81, 169, 0.4), 0 0 12px 0 rgba(0, 255, 255, 0.2);
  }
`;

const warningPulse = keyframes`
  0% {
    box-shadow: 0 0 8px 0 rgba(255, 64, 64, 0.4), 0 0 12px 0 rgba(255, 64, 64, 0.2);
  }
  50% {
    box-shadow: 0 0 16px 2px rgba(255, 64, 64, 0.6), 0 0 20px 4px rgba(255, 64, 64, 0.3);
  }
  100% {
    box-shadow: 0 0 8px 0 rgba(255, 64, 64, 0.4), 0 0 12px 0 rgba(255, 64, 64, 0.2);
  }
`;

// Improved natural diagonal glimmer animation
const diagonalGlimmer = keyframes`
  0%, 20%, 80%, 100% {
    background-position: -200% 200%;
  }
  50% {
    background-position: 200% -200%;
  }
`;

// Define theme variants
const themeVariants = {
  primary: css`
    background: linear-gradient(45deg, #00a8ff, #0097e6);
    color: white;
    
    &:hover {
      background: linear-gradient(45deg, #0097e6, #00a8ff);
    }
    
    &:active {
      background: linear-gradient(45deg, #0088cc, #0088cc);
    }
  `,
  cosmic: css`
    background: linear-gradient(45deg, #00ffff, #7851a9);
    color: #ffffff;
    animation: ${cosmicPulse} 2s infinite ease-in-out;
    
    &:hover {
      background: linear-gradient(45deg, #7851a9, #00ffff);
    }
    
    &:active {
      background: linear-gradient(45deg, #673ab7, #00e5ff);
      animation: none;
    }
  `,
  neon: css`
    background: transparent;
    color: #00ffff;
    border: 2px solid #00ffff;
    animation: ${pulse} 2s infinite ease-in-out;
    
    &:hover {
      background: rgba(0, 255, 255, 0.1);
    }
    
    &:active {
      background: rgba(0, 255, 255, 0.2);
      animation: none;
    }
  `,
  dark: css`
    background: rgba(30, 30, 60, 0.5);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
    
    &:hover {
      background: rgba(30, 30, 60, 0.7);
      border-color: rgba(255, 255, 255, 0.3);
    }
    
    &:active {
      background: rgba(20, 20, 40, 0.8);
    }
  `,
  warning: css`
    background: linear-gradient(45deg, #ff4040, #ff6b6b);
    color: white;
    animation: ${warningPulse} 2s infinite ease-in-out;
    
    &:hover {
      background: linear-gradient(45deg, #ff6b6b, #ff4040);
    }
    
    &:active {
      background: linear-gradient(45deg, #ff3333, #ff3333);
      animation: none;
    }
  `,