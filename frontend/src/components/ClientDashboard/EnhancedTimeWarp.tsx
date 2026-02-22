/**
 * EnhancedTimeWarp.tsx
 * ====================
 *
 * Schedule Integration for Client Dashboard
 * Wraps UniversalSchedule with Galaxy-Swan stellar theme overrides.
 *
 * Features:
 * - Full schedule calendar integration (real data, no mocks)
 * - Stellar cosmic theme overlay on calendar controls
 * - Client-specific role permissions via UniversalSchedule mode="client"
 * - Real-time session updates from backend
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';

// Import the full schedule component
import UniversalSchedule from '../Schedule/UniversalSchedule';

// === STELLAR THEME KEYFRAMES ===
const stellarPulse = keyframes`
  0%, 100% {
    opacity: 0.7;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
`;

const cosmicOrbit = keyframes`
  0% { transform: rotate(0deg) translateX(10px) rotate(0deg); }
  100% { transform: rotate(360deg) translateX(10px) rotate(-360deg); }
`;

const nebulaDrift = keyframes`
  0%, 100% { transform: translateY(0px) translateX(0px); }
  33% { transform: translateY(-10px) translateX(5px); }
  66% { transform: translateY(5px) translateX(-3px); }
`;

// === STYLED COMPONENTS ===
const StellarTimeWarpContainer = styled(motion.div)`
  position: relative;
  background: rgba(10, 10, 15, 0.8);
  border-radius: 20px;
  border: 2px solid rgba(0, 255, 255, 0.3);
  box-shadow:
    0 15px 35px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background:
      radial-gradient(ellipse at 20% 20%, rgba(0, 255, 255, 0.15) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 80%, rgba(120, 81, 169, 0.15) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 50%, rgba(255, 215, 0, 0.05) 0%, transparent 70%);
    pointer-events: none;
    z-index: 1;
  }

  &::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background:
      radial-gradient(2px 2px at 20px 30px, rgba(0, 255, 255, 0.6), transparent),
      radial-gradient(2px 2px at 40px 70px, rgba(255, 215, 0, 0.6), transparent),
      radial-gradient(1px 1px at 90px 40px, rgba(255, 255, 255, 0.8), transparent),
      radial-gradient(1px 1px at 130px 80px, rgba(0, 255, 255, 0.6), transparent);
    background-repeat: repeat;
    background-size: 200px 100px;
    animation: ${nebulaDrift} 30s ease-in-out infinite;
    opacity: 0.4;
    pointer-events: none;
    z-index: 0;
  }
`;

const StellarHeader = styled(motion.div)`
  position: relative;
  z-index: 2;
  padding: 2rem 2rem 1rem;
  background: rgba(30, 30, 60, 0.4);
  backdrop-filter: blur(15px);
  border-bottom: 1px solid rgba(0, 255, 255, 0.2);
`;

const StellarTitle = styled.h2`
  margin: 0 0 1rem 0;
  font-size: 2rem;
  font-weight: 300;
  background: linear-gradient(135deg, #00ffff, #7851a9, #ffd700);
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  animation: ${stellarPulse} 4s ease-in-out infinite;
  display: flex;
  align-items: center;
  gap: 1rem;

  &::before {
    content: '✦';
    color: #ffd700;
    animation: ${cosmicOrbit} 8s linear infinite;
    font-size: 1.5rem;
  }
`;

const StellarSubtitle = styled.p`
  margin: 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 1.1rem;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
`;

const ScheduleWrapper = styled(motion.div)`
  position: relative;
  z-index: 2;
  padding: 1rem;

  /* Override schedule component styling to match stellar theme */
  .rbc-calendar {
    background: rgba(30, 30, 60, 0.2) !important;
    border: 1px solid rgba(0, 255, 255, 0.2) !important;
    border-radius: 15px !important;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3) !important;
  }

  .rbc-toolbar {
    background: rgba(20, 20, 40, 0.8) !important;
    border: 1px solid rgba(0, 255, 255, 0.3) !important;
    border-radius: 12px !important;
    margin-bottom: 1rem !important;
    backdrop-filter: blur(10px) !important;
  }

  .rbc-toolbar-label {
    color: #00ffff !important;
    text-shadow: 0 0 10px rgba(0, 255, 255, 0.5) !important;
    font-weight: 600 !important;
  }

  .rbc-btn-group button {
    background: rgba(0, 255, 255, 0.1) !important;
    border: 1px solid rgba(0, 255, 255, 0.3) !important;
    color: #00ffff !important;
    border-radius: 8px !important;
    margin: 0 2px !important;
    transition: all 0.3s ease !important;

    &:hover {
      background: rgba(0, 255, 255, 0.2) !important;
      box-shadow: 0 0 15px rgba(0, 255, 255, 0.4) !important;
    }

    &.rbc-active {
      background: linear-gradient(135deg, #00ffff, #7851a9) !important;
      color: #000 !important;
      font-weight: bold !important;
      box-shadow: 0 0 20px rgba(0, 255, 255, 0.6) !important;
    }
  }

  .rbc-header {
    background: rgba(0, 255, 255, 0.1) !important;
    color: #00ffff !important;
    border-bottom: 1px solid rgba(0, 255, 255, 0.3) !important;
    font-weight: 600 !important;
    text-shadow: 0 0 8px rgba(0, 255, 255, 0.5) !important;
  }

  .rbc-today {
    background: rgba(255, 215, 0, 0.2) !important;
    box-shadow: inset 0 0 15px rgba(255, 215, 0, 0.3) !important;
  }

  .rbc-event {
    background: linear-gradient(135deg, rgba(0, 255, 255, 0.8), rgba(120, 81, 169, 0.8)) !important;
    border: none !important;
    border-radius: 10px !important;
    box-shadow: 0 4px 15px rgba(0, 255, 255, 0.3) !important;
    transition: all 0.3s ease !important;

    &:hover {
      transform: translateY(-2px) !important;
      box-shadow: 0 6px 20px rgba(0, 255, 255, 0.5) !important;
    }

    &.available {
      background: linear-gradient(135deg, rgba(0, 255, 136, 0.9), rgba(16, 185, 129, 0.9)) !important;
      color: #000 !important;
    }

    &.booked {
      background: linear-gradient(135deg, rgba(120, 81, 169, 0.9), rgba(167, 125, 212, 0.9)) !important;
      color: #fff !important;
    }

    &.confirmed {
      background: linear-gradient(135deg, rgba(0, 200, 255, 0.9), rgba(59, 130, 246, 0.9)) !important;
      color: #fff !important;
    }

    &.completed {
      background: linear-gradient(135deg, rgba(255, 215, 0, 0.9), rgba(251, 191, 36, 0.9)) !important;
      color: #000 !important;
    }
  }

  .rbc-time-slot {
    border-color: rgba(0, 255, 255, 0.1) !important;
  }

  .rbc-timeslot-group {
    border-color: rgba(0, 255, 255, 0.1) !important;
  }

  .rbc-day-bg + .rbc-day-bg {
    border-left: 1px solid rgba(0, 255, 255, 0.1) !important;
  }

  .rbc-month-view {
    border-color: rgba(0, 255, 255, 0.1) !important;
  }

  .rbc-month-row + .rbc-month-row {
    border-top: 1px solid rgba(0, 255, 255, 0.1) !important;
  }
`;

// === COMPONENT ===
interface EnhancedTimeWarpProps {
  className?: string;
}

const EnhancedTimeWarp: React.FC<EnhancedTimeWarpProps> = ({ className }) => {
  return (
    <StellarTimeWarpContainer
      className={className}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <StellarHeader
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <StellarTitle>
          <Calendar size={32} color="#00ffff" />
          Your Schedule
        </StellarTitle>
        <StellarSubtitle>
          View and manage your training sessions
        </StellarSubtitle>
      </StellarHeader>

      <ScheduleWrapper
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        <UniversalSchedule mode="client" />
      </ScheduleWrapper>
    </StellarTimeWarpContainer>
  );
};

export default EnhancedTimeWarp;
