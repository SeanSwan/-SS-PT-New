/**
 * UnifiedCalendar.tsx
 * 
 * A premium calendar component that seamlessly integrates with both client and admin dashboards.
 * - Administrators can create new session slots by clicking on empty time slots
 * - Trainers can view and manage their assigned sessions
 * - Clients can book available sessions by clicking on session events
 * - Features luxury styling with glass-morphism, animations, and responsive design
 * - Role-based functionality with permissions handling
 */

import React, { useEffect, useState, useRef, useMemo } from "react";
import { Calendar, momentLocalizer, SlotInfo, View } from "react-big-calendar";
import moment from "moment";
import axios from "axios";
import styled, { keyframes, css } from "styled-components";
import { motion, AnimatePresence, useAnimation, useInView } from "framer-motion";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import EventIcon from "@mui/icons-material/Event";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import TodayIcon from "@mui/icons-material/Today";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { io } from "socket.io-client";

// Custom components
import GlowButton from "../Button/glowButton";
import { useAuth } from "../../context/AuthContext";

// Import services
import scheduleService from "../../services/schedule-service";

// Import big calendar styles
import "react-big-calendar/lib/css/react-big-calendar.css";

// Using global type declarations or casting as any if needed:
const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || "http://localhost:5000";

// Set up the localizer for calendar
const localizer = momentLocalizer(moment);

// Define interfaces
interface SessionEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  status: string; // "available", "booked", "scheduled", "confirmed", "completed", "cancelled"
  userId?: string | null;
  trainerId?: string | null;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  trainer?: {
    id: string;
    firstName: string;
    lastName: string;
    specialties?: string;
  };
  location?: string;
  notes?: string;
  duration?: number;
  resource?: any;
}

interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

/* ========== Animation Keyframes ========== */
const shimmer = keyframes`
  0% {
    background-position: -100% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

const float = keyframes`
  0% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-5px) rotate(1deg); }
  100% { transform: translateY(0px) rotate(0deg); }
`;

const pulseGlow = keyframes`
  0% {
    box-shadow: 0 0 15px rgba(120, 81, 169, 0.4);
  }
  50% {
    box-shadow: 0 0 25px rgba(120, 81, 169, 0.7);
  }
  100% {
    box-shadow: 0 0 15px rgba(120, 81, 169, 0.4);
  }
`;

const gradientShift = keyframes`
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`;

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

/* ========== Styled Components ========== */

// Main container that adapts to dashboard layout
const CalendarContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  background: rgba(30, 30, 60, 0.5);
  border-radius: 16px;
  padding: 1rem;
  position: relative;
  height: 100%;
  width: 100%;
  overflow: hidden;
  
  /* Glass morphism effect */
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  
  /* Gradient border effect */
  &:before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 16px;
    padding: 1px;
    background: linear-gradient(45deg, #00ffff, #7851a9);
    -webkit-mask: 
      linear-gradient(#fff 0 0) content-box, 
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0.6;
    z-index: -1;
  }
`;

// Header section with premium styling
const CalendarHeader = styled(motion.div)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0.5rem 1rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
`;

// Title with animated gradient
const CalendarTitle = styled.h2`
  font-size: 1.8rem;
  font-weight: 300;
  margin: 0;
  background: linear-gradient(
    to right,
    #a9f8fb,
    #46cdcf,
    #7b2cbf,
    #c8b6ff,
    #a9f8fb
  );
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  animation: ${shimmer} 4s linear infinite;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

// Actions container for buttons
const ActionsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

// Refresh button with animation
const RefreshButton = styled(IconButton)`
  &.MuiIconButton-root {
    color: #00ffff;
    background: rgba(0, 255, 255, 0.1);
    border: 1px solid rgba(0, 255, 255, 0.3);
    
    &:hover {
      background: rgba(0, 255, 255, 0.2);
      
      .refresh-icon {
        animation: ${rotate} 1s ease;
      }
    }
  }
`;

// Stats container
const StatsContainer = styled(motion.div)`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  
  @media (max-width: 600px) {
    flex-direction: column;
    gap: 0.5rem;
  }
`;

// Stat card with glass effect
const StatCard =