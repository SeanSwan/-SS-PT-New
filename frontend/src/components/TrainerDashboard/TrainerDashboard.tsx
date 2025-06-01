/**
 * TrainerDashboard.tsx
 * 
 * Revolutionary Trainer Dashboard enhanced with Seraphina's Stellar Command Center
 * Implements the complete Swan Studios training platform with space-themed
 * navigation and sensational UI/UX design.
 * 
 * Master Prompt v28 Alignment:
 * - Stellar constellation sidebar navigation
 * - Award-winning cosmic aesthetics
 * - Mobile-first ultra-responsive design
 * - WCAG AA accessibility compliance
 */

import React from "react";
import { UniversalThemeProvider } from '../../context/ThemeContext';

// Import the enhanced Stellar Trainer Dashboard
import StellarTrainerDashboard from "./StellarComponents/StellarTrainerDashboard";

/**
 * TrainerDashboard Component
 * 
 * Revolutionary trainer dashboard that serves as the central cosmic hub for all
 * trainer interactions with the platform. Features stellar sidebar navigation,
 * space-themed design, and comprehensive training management.
 * 
 * Key Features:
 * - Stellar constellation sidebar with training-specific navigation sections
 * - Space exploration metaphor for training journey
 * - Award-winning gradient systems and particle effects
 * - Mobile-first collapsible navigation
 * - Real-time content transitions with smooth animations
 */
const TrainerDashboard: React.FC = () => {
  return (
    <StellarTrainerDashboard />
  );
};

export default TrainerDashboard;
