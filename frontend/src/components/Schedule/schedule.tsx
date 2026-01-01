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

import React, { useEffect, useState, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import {
  fetchEvents,           // was: fetchSessions
  bookSession,
  createAvailableSessions,  // was: createSession  
  // createBlockedTime,     // doesn't exist - removed
  // deleteBlockedTime,     // doesn't exist - removed
  confirmSession,
  cancelSession,
  fetchTrainers,
  selectAllSessions,
  selectScheduleStatus,
  selectScheduleError,
  selectScheduleStats,
  selectTrainers
  // setInitialState        // doesn't exist - removed
} from "../../redux/slices/scheduleSlice";
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

// Import custom accessible components
import CustomToolbar from './CustomToolbar';
import AccessibleEvent from './AccessibleEvent';
import HighContrastToggle from './HighContrastToggle';
import ScreenReaderAnnouncements, { useScreenReaderAnnouncement } from './ScreenReaderAnnouncements';

// Custom components
import GlowButton from "../ui/buttons/GlowButton";
import { useAuth } from "../../context/AuthContext";

// Import services
import scheduleService from "../../services/schedule-service";

// Import design tokens
import { theme, prefersReducedMotion } from "../../theme/tokens";

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

// Mode for blocking time slots
const blockTimeButtonVariants = {
  default: {
    scale: 1,
    opacity: 1,
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)"
  },
  hover: {
    scale: 1.05,
    boxShadow: "0 6px 12px rgba(0, 0, 0, 0.3)",
    transition: { type: "spring", stiffness: 400, damping: 10 }
  },
  active: {
    scale: 0.98,
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
    transition: { type: "spring", stiffness: 400, damping: 10 }
  },
  disabled: {
    opacity: 0.6,
    scale: 1,
    boxShadow: "none"
  }
};

/* ========== Styled Components ========== */

// Make the calendar take up the remaining space in the container
const CalendarContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  flex: 1; /* Take up all remaining space */
  background: rgba(24, 24, 48, 0.8); /* Darker background for better contrast */
  border-radius: 16px;
  padding: 1.5rem; /* Slightly more padding for better spacing */
  position: relative;
  width: 100%;
  overflow: hidden;
  
  /* Glass morphism effect with improved visibility */
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.15); /* Thicker border for better visibility */
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  
  /* Gradient border effect */
  &:before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 16px;
    padding: 2px; /* Thicker gradient border */
    background: linear-gradient(45deg, #00ffff, #7851a9);
    -webkit-mask: 
      linear-gradient(#fff 0 0) content-box, 
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0.7; /* Slightly increased opacity */
    z-index: -1;
  }
`;

// Header section with premium styling
const CalendarHeader = styled(motion.div)`
  display: flex;
  flex-direction: column;
  margin-bottom: 1.5rem;
  padding: 0.5rem 1rem;
  gap: 1rem;
  min-height: 120px;
  
  @media (min-width: 769px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
    min-height: 80px;
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

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

// Actions container for buttons with proper spacing
const ActionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: flex-start;
  width: 100%;
  
  @media (min-width: 769px) {
    flex-direction: row;
    align-items: center;
    width: auto;
    gap: 0.5rem;
  }
`;

// Top controls container for settings and refresh
const TopControlsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-shrink: 0;
`;

// Button container specifically for New Session and Block Time buttons
const SessionActionsContainer = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 0.75rem 1rem;
  border: 2px solid rgba(0, 255, 255, 0.3);
  background: rgba(0, 255, 255, 0.05);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  flex-shrink: 0;
  margin-top: 0.5rem;
  
  @media (min-width: 769px) {
    margin-top: 0;
    margin-left: 1rem;
  }
`;

// Refresh button with animation
const RefreshButton = styled(IconButton)`
  &.MuiIconButton-root {
    color: #00ffff;
    background: rgba(0, 255, 255, 0.1);
    border: 1px solid rgba(0, 255, 255, 0.3);

    &:hover {
      background: rgba(0, 255, 255, 0.2);
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

// Stat card with glass effect - enhanced for accessibility
const StatCard = styled(motion.div)`
  background: rgba(30, 30, 60, 0.7); /* Slightly darker for better contrast */
  border-radius: 12px;
  padding: 1rem 1.25rem; /* Increased padding for better touch targets */
  min-width: 160px; /* Slightly larger minimum width */
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.15); /* More visible border */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2); /* Added shadow for depth */
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
  }

  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.15) 50%, /* Slightly more visible gradient */
      transparent 100%
    );
    transition: all 0.3s ease;
  }

  &:hover:before {
    left: 100%;
  }

  ${prefersReducedMotion} {
    animation: none !important;
    transition: none !important;

    &:hover {
      transform: none;
    }

    &:before {
      transition: none;
    }

    &:hover:before {
      left: -100%;
    }
  }
`;

// Stat label with improved readability
const StatLabel = styled.div`
  font-size: 1rem; /* Larger font size for better readability */
  font-weight: 500; /* Slightly bolder */
  color: rgba(255, 255, 255, 0.85); /* Higher contrast for better visibility */
  margin-bottom: 0.4rem; /* Slightly more spacing */
`;

// Stat value with animated gradient - enhanced visibility
const StatValue = styled.div`
  font-size: 1.8rem; /* Larger font size for better readability */
  font-weight: 700; /* Bolder */
  background: linear-gradient(45deg, #00ffff, #7851a9);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  text-shadow: 0 0 8px rgba(120, 81, 169, 0.5); /* Subtle glow for prominence */
  padding: 0.2rem 0; /* Add padding for better touch area */

  /* Add a base color that will show if gradient isn't supported */
  @supports not (background-clip: text) {
    color: #00ffff;
    background: transparent;
  }
`;

// Calendar wrapper with custom styling and accessibility improvements
const CalendarWrapper = styled.div`
  flex: 1;
  position: relative;
  min-height: 500px;
  display: flex; /* Add flex display */
  flex-direction: column; /* Stack children vertically */
  
  /* Ensure the calendar view takes up the remaining space */
  .rbc-calendar {
    width: 100%;
    height: 100% !important; /* Force height to 100% of parent container */
    min-height: 600px; /* Ensure minimum height */
    background: rgba(24, 24, 48, 0.5); /* Darker for better contrast */
    border-radius: 12px;
    padding: 0.75rem; /* More padding */
    overflow: hidden;
    font-size: 16px; /* Base font size for better readability */
  }
  
  .rbc-toolbar {
    margin-bottom: 0.75rem;
    padding: 0.75rem;
    background: rgba(35, 35, 70, 0.7); /* Darker background for better contrast */
    border-radius: 8px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;
    
    @media (max-width: 768px) {
      flex-direction: column;
      align-items: flex-start;
    }
  }
  
  .rbc-toolbar-label {
    font-size: 1.4rem; /* Larger font size */
    font-weight: 500; /* Bolder for better visibility */
    letter-spacing: 0.5px;
    color: white;
  }
  
  .rbc-btn-group {
    button {
      background: rgba(30, 30, 60, 0.7); /* Darker background */
      color: white;
      border: 1px solid rgba(120, 81, 169, 0.4); /* More visible border */
      transition: all 0.2s ease;
      padding: 0.6rem 1rem; /* Larger touch targets */
      font-size: 1rem; /* Larger text */
      border-radius: 6px; /* Slightly rounded corners */
      margin: 0 2px; /* Slight spacing between buttons */
      
      &:hover:not(.rbc-active) {
        background: rgba(120, 81, 169, 0.4);
      }
      
      &.rbc-active {
        background: rgba(120, 81, 169, 0.6); /* More visible when active */
        box-shadow: 0 0 12px rgba(120, 81, 169, 0.4);
        font-weight: 600; /* Bolder when active */
      }
      
      &:focus {
        outline: 2px solid #00ffff; /* Focus outline for accessibility */
        outline-offset: 2px;
      }
    }
  }
  
  .rbc-header {
    background: rgba(35, 35, 70, 0.8); /* Darker for better contrast */
    color: white;
    padding: 0.75rem 0.5rem; /* More vertical padding */
    font-weight: 500; /* Bolder for readability */
    font-size: 1.1rem; /* Larger text */
  }
  
  .rbc-date-cell {
    color: rgba(255, 255, 255, 0.9); /* Higher contrast */
    padding: 0.35rem; /* More padding */
    font-size: 1.1rem; /* Larger text */
  }
  
  .rbc-today {
    background: rgba(100, 100, 200, 0.3); /* More visible today highlight */
  }
  
  .rbc-event {
    background: linear-gradient(45deg, rgba(0, 255, 255, 0.9), rgba(120, 81, 169, 0.9)); /* More saturated colors */
    border: none;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease;
    padding: 6px; /* More padding inside events */
    min-height: 36px; /* Minimum height for better clickability */
    font-weight: 500; /* Bolder text */
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
    }
    
    &:focus {
      outline: 3px solid white; /* Focus outline for accessibility */
    }
    
    /* Better contrasting colors for status differentiation */
    &.available {
      background: rgba(0, 200, 150, 0.9); /* Solid color instead of gradient */
      color: #000; /* Black text on green for better contrast */
    }
    
    &.booked {
      background: rgba(150, 100, 230, 0.9); /* Bright purple */
      color: #fff; /* White text for contrast */
    }
    
    &.confirmed {
      background: rgba(0, 180, 230, 0.9); /* Bright blue */
      color: #000; /* Black text for contrast */
    }
    
    &.completed {
      background: rgba(70, 200, 70, 0.9); /* Bright green */
      color: #000; /* Black text for contrast */
    }
    
    &.cancelled {
      background: rgba(230, 80, 80, 0.9); /* Bright red */
      color: #fff; /* White text for contrast */
      text-decoration: line-through;
      opacity: 0.8; /* Slightly higher opacity than before */
    }
  }
  
  /* Text and background styles specifically for month view events */
  .rbc-month-view .rbc-event {
    font-size: 0.9rem; /* Slightly larger font in month view */
    padding: 3px 5px; /* Better padding for month view */
  }
  
  .rbc-time-slot {
    background: rgba(30, 30, 60, 0.3);
    border-color: rgba(255, 255, 255, 0.1); /* More visible borders */
    font-size: 0.95rem; /* Larger text */
  }
  
  /* Consistent border colors with slightly higher contrast */
  .rbc-time-content,
  .rbc-time-view,
  .rbc-timeslot-group,
  .rbc-time-content > * + * > *,
  .rbc-time-header-content,
  .rbc-day-slot .rbc-time-slot,
  .rbc-month-view,
  .rbc-month-row + .rbc-month-row,
  .rbc-day-bg + .rbc-day-bg {
    border-color: rgba(255, 255, 255, 0.1); /* Standardized, slightly more visible borders */
  }
  
  .rbc-time-view {
    background: rgba(30, 30, 60, 0.3); /* Slightly darker */
  }
  
  .rbc-off-range-bg {
    background: rgba(30, 30, 60, 0.3); /* Darker for better contrast */
  }
  
  .rbc-off-range {
    color: rgba(255, 255, 255, 0.4); /* Slightly more visible */
  }
  
  /* Improve keyboard navigation focus styles */
  .rbc-day-slot .rbc-events-container {
    margin-right: 0; /* Fix alignment issues */
  }
`;

// Event tooltip content with improved accessibility
const EventTooltip = styled.div`
  padding: 1rem; /* More padding */
  min-width: 250px; /* Wider tooltip */
  background: rgba(30, 30, 60, 0.95); /* More opaque for readability */
  backdrop-filter: blur(10px);
  border-radius: 8px;
  border: 2px solid rgba(255, 255, 255, 0.15); /* Thicker, more visible border */
  color: white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5); /* Stronger shadow for depth */
  
  h4 {
    margin: 0 0 0.75rem; /* More bottom margin */
    font-weight: 600; /* Bolder */
    font-size: 1.2rem; /* Larger heading */
    color: #00ffff;
  }
  
  p {
    margin: 0.35rem 0; /* More vertical spacing */
    font-size: 1rem; /* Larger text */
    line-height: 1.4; /* Better line height for readability */
  }
  
  .actions {
    margin-top: 1rem; /* More top margin */
    display: flex;
    gap: 0.75rem; /* More spacing between buttons */
    justify-content: flex-end;
  }
  
  /* Status indicators */
  .status {
    display: inline-block;
    padding: 0.35rem 0.75rem;
    margin-top: 0.5rem;
    border-radius: 4px;
    font-weight: 600;
    text-align: center;
  }
  
  .status.available { background: rgba(0, 200, 150, 0.2); color: rgb(0, 220, 170); }
  .status.booked { background: rgba(150, 100, 230, 0.2); color: rgb(170, 130, 240); }
  .status.confirmed { background: rgba(0, 180, 230, 0.2); color: rgb(20, 200, 250); }
  .status.completed { background: rgba(70, 200, 70, 0.2); color: rgb(100, 230, 100); }
  .status.cancelled { background: rgba(230, 80, 80, 0.2); color: rgb(250, 100, 100); }
`;

// Modal backdrop
const ModalBackdrop = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

// Modal content with accessibility improvements and proper overflow handling
const ModalContent = styled(motion.div)`
  background: rgba(30, 30, 60, 0.95); /* More opaque for readability */
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 2px solid rgba(255, 255, 255, 0.15); /* Thicker, more visible border */
  width: 92%;
  max-width: 800px; /* Slightly wider for unified interface */
  max-height: 90vh; /* Optimized height for better content display */
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden; /* Prevent content from leaking outside */
  
  /* Gradient border effect */
  &:before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 16px;
    padding: 2px; /* Thicker gradient */
    background: linear-gradient(45deg, #00ffff, #7851a9);
    -webkit-mask: 
      linear-gradient(#fff 0 0) content-box, 
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0.7; /* Slightly increased opacity */
    z-index: -1;
  }
  
  /* Modal Header - Fixed at top */
  .modal-header {
    padding: 1.5rem 2.5rem 1rem;
    flex-shrink: 0;
    position: relative;
    background: rgba(25, 25, 50, 0.5);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  /* Modal Body - Scrollable content */
  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem 2.5rem;
    max-height: calc(90vh - 180px); /* Account for header and footer with optimized spacing */
    
    /* Custom scrollbar styling */
    &::-webkit-scrollbar {
      width: 8px;
    }
    
    &::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      
      &:hover {
        background: rgba(255, 255, 255, 0.3);
      }
    }
  }
  
  /* Modal Footer - Fixed at bottom */
  .modal-footer {
    padding: 1.5rem 2.5rem 2rem;
    flex-shrink: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(20, 20, 40, 0.5);
  }
  
  h2 {
    margin-top: 0;
    color: white;
    font-weight: 500; /* Bolder heading */
    font-size: 1.6rem; /* Slightly smaller to save space */
    margin-bottom: 1rem; /* Less spacing to save vertical space */
  }
  
  label {
    display: block;
    margin: 1rem 0 0.35rem; /* More spacing above and below */
    color: rgba(255, 255, 255, 0.9); /* Higher contrast */
    font-size: 1.05rem; /* Larger label text */
    font-weight: 500; /* Bolder labels */
  }
  
  input, select, textarea {
    width: 100%;
    padding: 0.9rem; /* Larger input fields */
    background: rgba(20, 20, 35, 0.7); /* Darker for contrast */
    border: 1px solid rgba(255, 255, 255, 0.2); /* More visible border */
    border-radius: 8px;
    color: white;
    margin-bottom: 0.75rem; /* More spacing below */
    font-size: 1rem; /* Larger font size in inputs */
    
    &:focus {
      outline: none;
      border-color: rgba(0, 255, 255, 0.6); /* More visible focus border */
      box-shadow: 0 0 0 3px rgba(0, 255, 255, 0.3); /* Stronger focus indicator */
    }
    
    /* Enhanced select styling for better cross-browser compatibility */
    &[type="select"], select {
      cursor: pointer;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 5"><path fill="%23ffffff" d="M2 0L0 2h4zm0 5L0 3h4z"/></svg>');
      background-repeat: no-repeat;
      background-position: right 0.7rem center;
      background-size: 0.75rem;
      padding-right: 2.5rem;
    }
    
    /* Option styling */
    option {
      background: rgba(30, 30, 60, 0.95);
      color: white;
      padding: 0.5rem;
    }
  }
  
  .button-group {
    display: flex;
    justify-content: flex-end;
    gap: 1.25rem; /* More spacing between buttons */
    margin-top: 2rem; /* More space above buttons */
  }
  
  .button {
    padding: 0.9rem 1.5rem; /* Larger buttons */
    border-radius: 8px;
    border: none;
    font-weight: 600; /* Bolder text */
    font-size: 1.05rem; /* Larger button text */
    cursor: pointer;
    transition: all 0.2s ease;
    
    &.primary {
      background: linear-gradient(45deg, #00ffff, #7851a9);
      color: white;
      
      &:hover {
        box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
        transform: translateY(-2px);
      }
      
      &:disabled {
        background: rgba(100, 100, 100, 0.5);
        cursor: not-allowed;
        opacity: 0.6;
        
        &:hover {
          box-shadow: none;
          transform: none;
        }
      }
    }
    
    &.secondary {
      background: rgba(40, 40, 75, 0.7); /* Darker for better contrast */
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2); /* More visible border */
      
      &:hover {
        background: rgba(60, 60, 100, 0.7);
      }
    }
    
    &:focus {
      outline: 3px solid rgba(0, 255, 255, 0.5); /* Focus outline for accessibility */
      outline-offset: 2px;
    }
  }
  
  /* Section styles for better organization */
  .form-section {
    margin-bottom: 1.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    
    &:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
  }
  
  .section-heading {
    font-size: 1.2rem;
    color: #00ffff;
    margin-bottom: 1rem;
    position: relative;
    
    &::after {
      content: '';
      position: absolute;
      bottom: -0.5rem;
      left: 0;
      width: 50px;
      height: 2px;
      background: linear-gradient(45deg, #00ffff, #7851a9);
      border-radius: 1px;
    }
  }
  
  /* Details styling for session details */
  .detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    
    &:last-child {
      border-bottom: none;
    }
    
    .detail-label {
      font-weight: 600;
      color: rgba(255, 255, 255, 0.8);
      margin-right: 1rem;
    }
    
    .detail-value {
      color: white;
      font-weight: 500;
      text-align: right;
    }
  }
  
  /* Status badge styling */
  .status-badge {
    display: inline-block;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-weight: bold;
    margin-bottom: 1rem;
    text-align: center;
    background: rgba(0, 255, 255, 0.2);
    color: #00ffff;
    border: 1px solid rgba(0, 255, 255, 0.3);
  }
  
  /* Two-column form layout for larger screens */
  .form-row {
    display: flex;
    gap: 1rem;
    
    @media (max-width: 600px) {
      flex-direction: column;
    }
  }
  
  .form-group {
    flex: 1;
  }
  
  /* Enhanced styling for role context banner */
  .role-context-banner {
  }

  /* Enhanced styling for time slot preview */
  .time-slot-preview {
  }
  
  /* Enhanced styling for recurring section */
  .recurring-section {
    background: rgba(30, 30, 60, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    transition: all 0.3s ease;
    
    &:hover {
      background: rgba(35, 35, 70, 0.7);
      border-color: rgba(255, 255, 255, 0.2);
    }
  }
  
  /* Responsive adjustments for mobile */
  @media (max-width: 768px) {
    width: 95%;
    max-height: 90vh;
    
    .modal-header {
      padding: 1rem 1.5rem 0.75rem;
    }
    
    .modal-body {
      padding: 0 1.5rem 1.5rem;
      max-height: calc(90vh - 160px);
    }
    
    .modal-footer {
      padding: 1rem 1.5rem 1.5rem;
    }
    
    .role-context-banner {
      flex-direction: column;
      text-align: center;
      gap: 0.5rem;
    }
    
    .time-slot-preview {
      padding: 1rem;
    }
    
    .recurring-section {
      padding: 1rem;
    }
    
    .days-of-week {
      grid-template-columns: repeat(auto-fit, minmax(60px, 1fr)) !important;
      gap: 0.5rem !important;
    }
  }
`;

// Close button
const CloseButton = styled(IconButton)`
  &.MuiIconButton-root {
    position: absolute;
    top: 1rem;
    right: 1rem;
    color: rgba(255, 255, 255, 0.7);
    z-index: 10;
    
    &:hover {
      color: white;
      background: rgba(255, 255, 255, 0.1);
    }
  }
`;

// Mode toggle for switching between session and block modes
const ModeToggle = styled.div`
  display: flex;
  background: rgba(20, 20, 40, 0.8);
  border-radius: 12px;
  padding: 0.25rem;
  margin-bottom: 1.5rem;
  gap: 0.25rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  
  .mode-button {
    flex: 1;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: rgba(255, 255, 255, 0.7);
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    
    &.active {
      background: linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(120, 81, 169, 0.2));
      color: white;
      box-shadow: 0 2px 8px rgba(0, 255, 255, 0.3);
      
      &.block-mode {
        background: linear-gradient(135deg, rgba(230, 80, 80, 0.3), rgba(255, 107, 107, 0.3));
        box-shadow: 0 2px 8px rgba(230, 80, 80, 0.3);
      }
    }
    
    &:hover:not(.active) {
      background: rgba(255, 255, 255, 0.05);
      color: rgba(255, 255, 255, 0.9);
    }
    
    &:focus {
      outline: 2px solid rgba(0, 255, 255, 0.5);
      outline-offset: 2px;
    }
    
    svg {
      font-size: 1.2rem;
    }
  }
  
  @media (max-width: 600px) {
    .mode-button {
      padding: 0.6rem 1rem;
      font-size: 0.9rem;
      
      svg {
        font-size: 1rem;
      }
    }
  }
`;

// NoSessions component with animation
const NoSessions = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  height: 100%;
  min-height: 300px;
  
  svg {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }
  
  h3 {
    font-weight: 300;
    margin-bottom: 0.5rem;
    font-size: 1.5rem;
  }
  
  p {
    max-width: 500px;
    margin-bottom: 1.5rem;
  }
`;

// Loader component
const Loader = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(20, 20, 35, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
  backdrop-filter: blur(3px);

  .loader-inner {
    width: 50px;
    height: 50px;
    border: 3px solid rgba(0, 255, 255, 0.3);
    border-top: 3px solid rgba(0, 255, 255, 1);
    border-radius: 50%;
  }
`;

/**
 * Main UnifiedCalendar Component
 */
const UnifiedCalendar: React.FC = () => {
  // Add global styles for screen reader classes
  React.useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
      }
      
      .visible-sr-only {
        border: 0;
        clip: rect(0 0 0 0);
        height: 1px;
        margin: -1px;
        overflow: hidden;
        padding: 0;
        position: absolute;
        width: 1px;
        white-space: nowrap;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Redux hooks with safety checks
  const dispatch = useAppDispatch();
  const sessions = useAppSelector(state => {
    const sessions = selectAllSessions(state);
    return Array.isArray(sessions) ? sessions : [];
  });
  const status = useAppSelector(state => {
    const status = selectScheduleStatus(state);
    return status || 'idle';
  });
  const error = useAppSelector(state => {
    return selectScheduleError(state) || null;
  });
  const stats = useAppSelector(state => {
    const stats = selectScheduleStats(state);
    return stats || {
      total: 0,
      available: 0,
      booked: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      blocked: 0,
      upcoming: 0
    };
  });
  
  // Get authenticated user with enhanced role detection
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isTrainer = user?.role === 'trainer';
  const isClient = user?.role === 'client';
  
  // For development/debugging - ensure buttons are visible
  const hasAdminBypass = localStorage.getItem('bypass_admin_verification') === 'true';
  
  // Make sure we show admin controls if user is admin or has admin bypass
  const showAdminControls = isAdmin || hasAdminBypass;
  
  // Component state with proper role-based initialization
  const [selectedEvent, setSelectedEvent] = useState<SessionEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('create'); // 'create', 'view', 'book', 'block'
  const [createModalMode, setCreateModalMode] = useState<'session' | 'block'>('session'); // Sub-mode for create modal
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [formData, setFormData] = useState({
    title: 'Available Session',
    location: '',
    notes: '',
    trainerId: isTrainer ? user?.id || '' : '',
    duration: 60,
    reason: '',
    
    // Enhanced form data structure for flexible period blocking
    startDate: moment().format('YYYY-MM-DD'),
    startTime: moment().format('HH:mm'),
    blockType: 'single' as 'single' | 'weekly' | 'monthly' | 'yearly',
    
    // Period-specific options
    weeklyOptions: {
      daysOfWeek: [1, 2, 3, 4, 5], // Default to weekdays only (Mon-Fri)
      numberOfWeeks: 1
    },
    monthlyOptions: {
      datesOfMonth: [1], // e.g., 1st of each month
      numberOfMonths: 1
    },
    yearlyOptions: {
      monthsIncluded: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] // All months by default
    },
    
    // Legacy support for existing functionality
    isRecurring: false,
    recurringDays: [1, 2, 3, 4, 5], // Default to weekdays only (Mon-Fri)
    untilDate: moment().add(1, 'year').format('YYYY-MM-DD') // Default recurring until 1 year from now
  });
  
  // Enhanced role detection for better debugging
  React.useEffect(() => {
    console.log('Schedule Component - Current User Role:', {
      user: user,
      isAdmin,
      isTrainer,
      isClient,
      hasAdminBypass,
      showAdminControls
    });
  }, [user, isAdmin, isTrainer, isClient, hasAdminBypass, showAdminControls]);
  
  // Get trainers from Redux state with defensive selector
  const trainers = useAppSelector(state => {
    const trainers = selectTrainers(state);
    return Array.isArray(trainers) ? trainers : [];
  });
  
  // Calendar view state
  const [view, setView] = useState<View>('week');
  const [date, setDate] = useState(new Date());
  
  // Socket for real-time updates
  const socketRef = useRef<any>(null);
  
  // Theme and responsive hooks
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // No longer need to initialize store here as it's handled by storeInitSafeguard.js
  useEffect(() => {
    console.log('UnifiedCalendar component mounted, using pre-initialized Redux store');
  }, []);
  
  // Animation controls
  const controls = useAnimation();
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true });
  
  // Effect to start animations when component is in view
  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [controls, isInView]);
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };
  
  // Initialize socket connection for real-time updates
  useEffect(() => {
    // Code for socket initialization would go here
  }, []);
  
  // Fetch session events and trainers from Redux with error handling
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (status === 'idle') {
          console.log('Fetching schedule data...');
          await dispatch(fetchEvents()).unwrap();
          await dispatch(fetchTrainers()).unwrap();
          console.log('Schedule data loaded successfully');
        }
      } catch (error) {
        console.error('Error fetching schedule data:', error);
        dispatch({
          type: 'schedule/resetState',
          payload: {
            sessions: [],
            trainers: [],
            clients: [],
            stats: {
              total: 0,
              available: 0,
              booked: 0,
              confirmed: 0,
              completed: 0,
              cancelled: 0,
              blocked: 0,
              upcoming: 0
            },
            status: 'failed',
            error: 'Failed to load schedule data. Please try again.',
            fetched: false
          }
        });
      }
    };
    
    fetchData();
  }, [dispatch, status]);
  
  // Handler for form input changes - enhanced for nested structure
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle nested form data structures
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: name === 'monthlyOptions.datesOfMonth' ? [parseInt(value)] : 
                  name === 'weeklyOptions.numberOfWeeks' || name === 'monthlyOptions.numberOfMonths' ? parseInt(value) :
                  value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // Use the screen reader announcement hook
  const { announce: announceToScreenReader } = useScreenReaderAnnouncement('calendar-announcer');
  
  // Handler for selecting an event (session)
  const handleSelectEvent = (event: SessionEvent) => {
    setSelectedEvent(event);
    setModalType(event.status === 'available' && isClient ? 'book' : 'view');
    setShowModal(true);
    
    const announcement = `${event.title} details opened. Status: ${event.status}.`;
    announceToScreenReader(announcement);
  };
  
  // Handler for selecting a slot (to create a new session or block time)
  const handleSelectSlot = (slotInfo: SlotInfo) => {
    if (showAdminControls || isTrainer) {
      setSelectedSlot(slotInfo);
      setModalType('create');
      setCreateModalMode('session');
      setShowModal(true);
      
      const startDateTime = moment(slotInfo.start);
      setFormData({
        title: 'Available Session',
        location: '',
        notes: '',
        trainerId: isTrainer ? user?.id || '' : '',
        duration: 60,
        reason: '',
        
        startDate: startDateTime.format('YYYY-MM-DD'),
        startTime: startDateTime.format('HH:mm'),
        blockType: 'single' as 'single' | 'weekly' | 'monthly' | 'yearly',
        
        weeklyOptions: {
          daysOfWeek: [1, 2, 3, 4, 5],
          numberOfWeeks: 1
        },
        monthlyOptions: {
          datesOfMonth: [startDateTime.date()],
          numberOfMonths: 1
        },
        yearlyOptions: {
          monthsIncluded: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
        },
        
        isRecurring: false,
        recurringDays: [1, 2, 3, 4, 5],
        untilDate: moment().add(1, 'year').format('YYYY-MM-DD')
      });
      
      const dateStr = moment(slotInfo.start).format('dddd, MMMM D');
      const timeStr = moment(slotInfo.start).format('h:mm A');
      announceToScreenReader(`Schedule management opened for ${dateStr} at ${timeStr}. Choose between creating a session or blocking time.`);
    }
  };
  
  // Handler for changing views (day, week, month)
  const handleViewChange = (newView: View) => {
    setView(newView);
  };
  
  // Handler for navigating to a specific date
  const handleNavigate = (newDate: Date) => {
    setDate(newDate);
  };
  
  // Refresh calendar data
  const handleRefresh = () => {
    dispatch(fetchEvents());
  };
  
  // Create a new session
  const handleCreateSession = () => {
    if (!selectedSlot) return;
    
    const sessionData = {
      start: selectedSlot.start,
      end: selectedSlot.end,
      title: formData.title,
      location: formData.location,
      trainerId: formData.trainerId || undefined,
      notes: formData.notes,
      duration: formData.duration,
      status: 'available'
    };
    
    dispatch(createAvailableSessions([sessionData]));
    setShowModal(false);
    
    const dateStr = moment(selectedSlot.start).format('dddd, MMMM D');
    const timeStr = moment(selectedSlot.start).format('h:mm A');
    announceToScreenReader(`New session created for ${dateStr} at ${timeStr}.`);
  };
  
  // Enhanced blocked time creation
  const handleCreateBlockedTime = () => {
    const startDateTime = moment(`${formData.startDate} ${formData.startTime}`, 'YYYY-MM-DD HH:mm');
    
    if (!startDateTime.isValid()) {
      console.error('Invalid start date/time');
      return;
    }
    
    const endDateTime = startDateTime.clone().add(formData.duration, 'minutes');
    
    let targetTrainerId = formData.trainerId;
    
    if (isTrainer && !isAdmin) {
      targetTrainerId = user?.id || '';
    }
    
    if (isAdmin && !targetTrainerId) {
      targetTrainerId = undefined;
    }
    
    const blockedTimeData = {
      start: startDateTime.toDate(),
      end: endDateTime.toDate(),
      duration: Number(formData.duration),
      reason: formData.reason || 'Unavailable',
      location: formData.location,
      trainerId: targetTrainerId,
      status: 'blocked',
      blockType: formData.blockType,
      
      isRecurring: formData.blockType !== 'single',
      recurringPattern: formData.blockType !== 'single' ? {
        type: formData.blockType,
        
        ...(formData.blockType === 'weekly' && {
          daysOfWeek: formData.weeklyOptions.daysOfWeek,
          numberOfWeeks: formData.weeklyOptions.numberOfWeeks,
          untilDate: moment(startDateTime).add(formData.weeklyOptions.numberOfWeeks, 'weeks').format('YYYY-MM-DD')
        }),
        
        ...(formData.blockType === 'monthly' && {
          datesOfMonth: formData.monthlyOptions.datesOfMonth,
          numberOfMonths: formData.monthlyOptions.numberOfMonths,
          untilDate: moment(startDateTime).add(formData.monthlyOptions.numberOfMonths, 'months').format('YYYY-MM-DD')
        }),
        
        ...(formData.blockType === 'yearly' && {
          monthsIncluded: formData.yearlyOptions.monthsIncluded,
          untilDate: moment(startDateTime).add(1, 'year').format('YYYY-MM-DD')
        }),
        
        daysOfWeek: formData.blockType === 'weekly' ? formData.weeklyOptions.daysOfWeek : formData.recurringDays,
        untilDate: formData.blockType === 'weekly' 
          ? moment(startDateTime).add(formData.weeklyOptions.numberOfWeeks, 'weeks').format('YYYY-MM-DD')
          : formData.blockType === 'monthly'
          ? moment(startDateTime).add(formData.monthlyOptions.numberOfMonths, 'months').format('YYYY-MM-DD')
          : moment(startDateTime).add(1, 'year').format('YYYY-MM-DD')
      } : undefined,
      
      createdByUserId: user?.id,
      createdByRole: user?.role,
      title: `${formData.reason || 'Blocked'} - ${isTrainer && !targetTrainerId ? user?.firstName || 'Trainer' : targetTrainerId ? trainers.find(t => t.id === targetTrainerId)?.firstName || 'Trainer' : 'All Trainers'}`
    };
    
    // Note: createBlockedTime functionality needs to be implemented
    // For now, we'll create a blocked session using createAvailableSessions
    const blockedSessionData = {
      start: startDateTime.toDate(),
      end: endDateTime.toDate(),
      title: `${formData.reason || 'Blocked'} - ${isTrainer && !targetTrainerId ? user?.firstName || 'Trainer' : targetTrainerId ? trainers.find(t => t.id === targetTrainerId)?.firstName || 'Trainer' : 'All Trainers'}`,
      location: formData.location,
      notes: `BLOCKED: ${formData.reason || 'Unavailable'}`,
      trainerId: targetTrainerId,
      status: 'blocked',
      duration: Number(formData.duration)
    };
    
    dispatch(createAvailableSessions([blockedSessionData]));
    setShowModal(false);
    
    // Reset form data
    setFormData({
      title: 'Available Session',
      location: '',
      notes: '',
      trainerId: isTrainer ? user?.id || '' : '',
      duration: 60,
      reason: '',
      
      startDate: moment().format('YYYY-MM-DD'),
      startTime: moment().format('HH:mm'),
      blockType: 'single' as 'single' | 'weekly' | 'monthly' | 'yearly',
      
      weeklyOptions: {
        daysOfWeek: [1, 2, 3, 4, 5],
        numberOfWeeks: 1
      },
      monthlyOptions: {
        datesOfMonth: [1],
        numberOfMonths: 1
      },
      yearlyOptions: {
        monthsIncluded: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      },
      
      isRecurring: false,
      recurringDays: [1, 2, 3, 4, 5],
      untilDate: moment().add(1, 'year').format('YYYY-MM-DD')
    });
    
    const dateStr = startDateTime.format('dddd, MMMM D');
    const timeStr = startDateTime.format('h:mm A');
    
    let message = '';
    
    switch (formData.blockType) {
      case 'weekly':
        message = `Weekly blocked time created for ${formData.weeklyOptions.numberOfWeeks} weeks starting from ${dateStr} at ${timeStr}`;
        break;
      case 'monthly':
        message = `Monthly blocked time created for ${formData.monthlyOptions.numberOfMonths} months starting from ${dateStr} at ${timeStr}`;
        break;
      case 'yearly':
        message = `Yearly blocked time created starting from ${dateStr} at ${timeStr}`;
        break;
      default:
        message = `Blocked time created for ${dateStr} at ${timeStr}`;
    }
    
    if (isTrainer && !isAdmin) {
      message += ` for your personal schedule`;
    } else if (isAdmin && targetTrainerId) {
      const trainerName = trainers.find(t => t.id === targetTrainerId)?.firstName || 'trainer';
      message += ` for ${trainerName}'s schedule`;
    } else if (isAdmin && !targetTrainerId) {
      message += ` as a global block affecting all trainers`;
    }
    
    announceToScreenReader(message + '.');
  };
  
  // Book a session
  const handleBookSession = (eventId: string) => {
    dispatch(bookSession(eventId));
    setShowModal(false);
    
    if (selectedEvent) {
      const dateStr = moment(selectedEvent.start).format('dddd, MMMM D');
      const timeStr = moment(selectedEvent.start).format('h:mm A');
      announceToScreenReader(`Session successfully booked for ${dateStr} at ${timeStr}.`);
    }
  };
  
  // Cancel a session
  const handleCancelSession = (eventId: string) => {
    dispatch(cancelSession(eventId));
    setShowModal(false);
    
    if (selectedEvent) {
      const dateStr = moment(selectedEvent.start).format('dddd, MMMM D');
      const timeStr = moment(selectedEvent.start).format('h:mm A');
      announceToScreenReader(`Session for ${dateStr} at ${timeStr} has been cancelled.`);
    }
  };
  
  // Delete a blocked time - simplified implementation
  const handleDeleteBlockedTime = (eventId: string, removeAll: boolean = false) => {
    // Note: deleteBlockedTime functionality needs to be implemented
    // For now, we'll use cancelSession
    dispatch(cancelSession(eventId));
    setShowModal(false);
    
    if (selectedEvent) {
      const dateStr = moment(selectedEvent.start).format('dddd, MMMM D');
      const timeStr = moment(selectedEvent.start).format('h:mm A');
      const message = removeAll 
        ? `Recurring blocked time series starting on ${dateStr} has been deleted.`
        : `Blocked time for ${dateStr} at ${timeStr} has been deleted.`;
      announceToScreenReader(message);
    }
  };
  
  // Confirm a session
  const handleConfirmSession = (eventId: string) => {
    dispatch(confirmSession(eventId));
    setShowModal(false);
    
    if (selectedEvent) {
      const dateStr = moment(selectedEvent.start).format('dddd, MMMM D');
      const timeStr = moment(selectedEvent.start).format('h:mm A');
      announceToScreenReader(`Session for ${dateStr} at ${timeStr} has been confirmed.`);
    }
  };
  
  // Customize event display
  const eventStyleGetter = (event: SessionEvent) => {
    const baseStyle = {
      borderRadius: '8px',
      padding: '6px 8px',
      border: 'none',
      borderLeft: '4px solid',
      fontSize: '0.875rem',
      fontWeight: 500,
    };

    const statusColors = {
      available: { bg: 'rgba(34, 197, 94, 0.2)', border: '#22c55e', text: '#ffffff' },
      booked: { bg: 'rgba(59, 130, 246, 0.2)', border: '#3b82f6', text: '#ffffff' },
      confirmed: { bg: 'rgba(124, 58, 237, 0.2)', border: '#7c3aed', text: '#ffffff' },
      completed: { bg: 'rgba(107, 114, 128, 0.2)', border: '#6b7280', text: '#ffffff' },
      cancelled: { bg: 'rgba(239, 68, 68, 0.2)', border: '#ef4444', text: '#ffffff' },
      blocked: { bg: 'rgba(245, 158, 11, 0.2)', border: '#f59e0b', text: '#ffffff' },
      scheduled: { bg: 'rgba(59, 130, 246, 0.2)', border: '#3b82f6', text: '#ffffff' },
    };

    const colors = statusColors[event.status as keyof typeof statusColors] || statusColors.booked;

    return {
      style: {
        ...baseStyle,
        backgroundColor: colors.bg,
        borderLeftColor: colors.border,
        color: colors.text,
      }
    };
  };
  
  return (
    <CalendarContainer
      ref={containerRef}
      initial="hidden"
      animate={controls}
      variants={containerVariants}
      role="region"
      aria-label="Schedule management"
    >
      <ScreenReaderAnnouncements id="calendar-announcer" />
      <div id="calendar-description" className="sr-only">
        This calendar shows all fitness sessions. {isAdmin || isTrainer ? 'You can create sessions by clicking on empty time slots.' : ''}
        {isClient ? 'You can book available sessions by clicking on them.' : ''} Use arrow keys to navigate between dates.
      </div>
      
      <CalendarHeader variants={itemVariants}>
        <CalendarTitle>Fitness Schedule</CalendarTitle>
        <ActionsContainer>
          <TopControlsContainer>
            <HighContrastToggle />
            <RefreshButton 
              onClick={handleRefresh} 
              aria-label="Refresh calendar"
              title="Refresh schedule"
            >
              <RefreshIcon className="refresh-icon" />
            </RefreshButton>
          </TopControlsContainer>
          
          {(showAdminControls || isTrainer) && (
            <SessionActionsContainer>
              <GlowButton
                onClick={() => {
                  setSelectedSlot({
                    start: new Date(),
                    end: new Date(new Date().setHours(new Date().getHours() + 1)),
                    slots: [],
                    action: 'click',
                    bounds: null,
                    box: null
                  });
                  setModalType('create');
                  setCreateModalMode('session');
                  setShowModal(true);
                }}
                leftIcon={<AddIcon />}
                text="New Session"
                size="small"
                aria-label="Create new session"
              />
              <GlowButton
                onClick={() => {
                  setSelectedSlot({
                    start: new Date(),
                    end: new Date(new Date().setHours(new Date().getHours() + 1)),
                    slots: [],
                    action: 'click',
                    bounds: null,
                    box: null
                  });
                  setModalType('create');
                  setCreateModalMode('block');
                  setShowModal(true);
                  
                  setFormData({
                    title: 'Blocked Time',
                    location: '',
                    notes: '',
                    trainerId: isTrainer && !isAdmin ? user?.id || '' : (isAdmin ? '' : ''),
                    duration: 60,
                    reason: '',
                    
                    startDate: moment().format('YYYY-MM-DD'),
                    startTime: moment().format('HH:mm'),
                    blockType: 'single' as 'single' | 'weekly' | 'monthly' | 'yearly',
                    
                    weeklyOptions: {
                      daysOfWeek: [1, 2, 3, 4, 5],
                      numberOfWeeks: 1
                    },
                    monthlyOptions: {
                      datesOfMonth: [1],
                      numberOfMonths: 1
                    },
                    yearlyOptions: {
                      monthsIncluded: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
                    },
                    
                    isRecurring: false,
                    recurringDays: [1, 2, 3, 4, 5],
                    untilDate: moment().add(1, 'year').format('YYYY-MM-DD')
                  });
                }}
                leftIcon={<CancelIcon />}
                text="Block Time"
                size="small"
                style={{ backgroundColor: 'rgba(230, 80, 80, 0.7)' }}
                aria-label="Block time slot"
              />
            </SessionActionsContainer>
          )}
        </ActionsContainer>
      </CalendarHeader>
      
      <StatsContainer variants={itemVariants}>
        <StatCard whileHover={{ y: -5 }}>
          <StatLabel>Total Sessions</StatLabel>
          <StatValue>{stats.total}</StatValue>
        </StatCard>
        <StatCard whileHover={{ y: -5 }}>
          <StatLabel>Available</StatLabel>
          <StatValue>{stats.available}</StatValue>
        </StatCard>
        <StatCard whileHover={{ y: -5 }}>
          <StatLabel>Booked</StatLabel>
          <StatValue>{stats.booked}</StatValue>
        </StatCard>
        <StatCard whileHover={{ y: -5 }}>
          <StatLabel>Completed</StatLabel>
          <StatValue>{stats.completed}</StatValue>
        </StatCard>
      </StatsContainer>
      
      <CalendarWrapper variants={itemVariants}>
        {status === 'loading' && (
          <Loader
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="loader-inner" />
          </Loader>
        )}
        
        {status === 'failed' && error && (
          <NoSessions
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div style={{ color: "rgba(255, 100, 100, 0.9)", marginBottom: "1rem" }}>
              <h3>Error Loading Schedule</h3>
              <p>{error}</p>
            </div>
            <GlowButton
              onClick={handleRefresh}
              text="Retry"
              aria-label="Retry loading schedule"
            />
          </NoSessions>
        )}
        
        {status === 'succeeded' && sessions.length === 0 ? (
          <NoSessions
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            aria-live="polite"
            role="status"
          >
            <EventIcon fontSize="large" />
            <h3>No Sessions Found</h3>
            <p>
              {isAdmin || isTrainer
                ? "You haven't created any sessions yet. Click 'New Session' to get started."
                : "There are no available sessions to book right now. Please check back later."}
            </p>
            {(isAdmin || isTrainer) && (
              <GlowButton
                onClick={() => {
                  setSelectedSlot({
                    start: new Date(),
                    end: new Date(new Date().setHours(new Date().getHours() + 1)),
                    slots: [],
                    action: 'click',
                    bounds: null,
                    box: null
                  });
                  setModalType('create');
                  setShowModal(true);
                }}
                leftIcon={<AddIcon />}
                text="Create First Session"
                aria-label="Create first session"
              />
            )}
          </NoSessions>
        ) : (
          <Calendar
            localizer={localizer}
            events={sessions}
            startAccessor="start"
            endAccessor="end"
            style={{ height: "calc(100% - 20px)", flex: 1 }}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable={isAdmin || isTrainer}
            view={view}
            onView={handleViewChange}
            date={date}
            onNavigate={handleNavigate}
            eventPropGetter={eventStyleGetter}
            tooltipAccessor={null}
            components={{
              toolbar: CustomToolbar,
              event: AccessibleEvent,
            }}
            popup
            views={['month', 'week', 'day', 'agenda']}
            messages={{
              today: 'Today',
              previous: 'Back',
              next: 'Forward',
              month: 'Month',
              week: 'Week',
              day: 'Day',
              agenda: 'List',
              showMore: total => `+${total} more`
            }}
            aria-label="Fitness schedule calendar"
            aria-describedby="calendar-description"
          />
        )}
      </CalendarWrapper>
      
      {/* Modal for creating, viewing, or booking sessions */}
      <AnimatePresence>
        {showModal && (
          <ModalBackdrop
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <ModalContent
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              role="dialog"
              aria-labelledby="modal-title"
              aria-modal="true"
            >
              <CloseButton 
                onClick={() => {
                  setShowModal(false);
                  announceToScreenReader("Dialog closed");
                }}
                aria-label="Close modal"
              >
                <CancelIcon />
              </CloseButton>
              
              {/* Unified Create Modal - Session & Block Time */}
              {modalType === 'create' && (
                <>
                  <div className="modal-header">
                    <h2 id="modal-title">
                      Schedule Management
                      <div style={{ fontSize: '1rem', fontWeight: '400', marginTop: '0.5rem', opacity: 0.8 }}>
                        {selectedSlot && moment(selectedSlot.start).format('dddd, MMMM D, YYYY [at] h:mm A')}
                      </div>
                    </h2>
                    
                    {/* Enhanced Mode Toggle with Icons and Better Visual Hierarchy */}
                    <ModeToggle>
                      <button
                        className={`mode-button ${createModalMode === 'session' ? 'active' : ''}`}
                        onClick={() => {
                          setCreateModalMode('session');
                          announceToScreenReader('Switched to session creation mode');
                        }}
                        aria-label="Switch to session creation mode"
                        role="tab"
                        aria-selected={createModalMode === 'session'}
                      >
                        <EventIcon />
                        Create Session
                      </button>
                      <button
                        className={`mode-button ${createModalMode === 'block' ? 'active block-mode' : ''}`}
                        onClick={() => {
                          setCreateModalMode('block');
                          announceToScreenReader('Switched to time blocking mode');
                        }}
                        aria-label="Switch to time blocking mode"
                        role="tab"
                        aria-selected={createModalMode === 'block'}
                      >
                        <CancelIcon />
                        Block Time
                      </button>
                    </ModeToggle>
                  </div>
                  
                  <div className="modal-body" role="tabpanel" aria-labelledby="modal-title">
                    {/* Enhanced Session Creation Form */}
                    {createModalMode === 'session' && (
                      <div className="session-form-container">
                        <div className="form-section">
                          <h3 className="section-heading">📋 Session Details</h3>
                          
                          <div className="form-group">
                            <label htmlFor="title" id="title-label">Session Title *</label>
                            <input 
                              type="text" 
                              id="title" 
                              name="title" 
                              value={formData.title}
                              onChange={handleFormChange}
                              aria-labelledby="title-label"
                              required
                              aria-required="true"
                              placeholder="e.g., Personal Training Session"
                            />
                          </div>
                    
                          <div className="form-row">
                            <div className="form-group">
                              <label htmlFor="location" id="location-label">Location</label>
                              <input 
                                type="text" 
                                id="location" 
                                name="location" 
                                value={formData.location}
                                onChange={handleFormChange}
                                aria-labelledby="location-label"
                                placeholder="e.g., Main Studio, Virtual"
                                aria-describedby="location-desc"
                              />
                              <div id="location-desc" className="sr-only">Enter the physical or virtual location for this session</div>
                            </div>
                            
                            <div className="form-group">
                              <label htmlFor="duration" id="duration-label">Duration *</label>
                              <select
                                id="duration" 
                                name="duration" 
                                value={formData.duration}
                                onChange={handleFormChange}
                                aria-labelledby="duration-label"
                                required
                                aria-required="true"
                                aria-describedby="duration-desc"
                              >
                                <option value={30}>30 minutes</option>
                                <option value={45}>45 minutes</option>
                                <option value={60}>1 hour</option>
                                <option value={90}>1.5 hours</option>
                                <option value={120}>2 hours</option>
                              </select>
                              <div id="duration-desc" className="sr-only">Select session duration</div>
                            </div>
                          </div>
                          
                          {isAdmin && (
                            <div className="form-group">
                              <label htmlFor="trainerId" id="trainer-label">👨‍🏫 Assign Trainer</label>
                              <select 
                                id="trainerId" 
                                name="trainerId" 
                                value={formData.trainerId}
                                onChange={handleFormChange}
                                aria-labelledby="trainer-label"
                              >
                                <option value="">🌐 No Specific Trainer</option>
                                {trainers.map(trainer => (
                                  <option key={trainer.id} value={trainer.id}>
                                    👤 {trainer.firstName} {trainer.lastName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                        
                        <div className="form-section">
                          <h3 className="section-heading">📝 Additional Information</h3>
                          <div className="form-group">
                            <label htmlFor="notes" id="notes-label">Session Notes</label>
                            <textarea 
                              id="notes" 
                              name="notes" 
                              value={formData.notes}
                              onChange={handleFormChange}
                              rows={3}
                              aria-labelledby="notes-label"
                              placeholder="Any specific instructions or details about this session..."
                            ></textarea>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Enhanced Time Blocking Form */}
                    {createModalMode === 'block' && (
                      <div className="block-form-container">
                        {/* Role Context Banner */}
                        <div className="role-context-banner" style={{
                          background: 'linear-gradient(135deg, rgba(230, 80, 80, 0.15), rgba(255, 107, 107, 0.15))',
                          border: '1px solid rgba(230, 80, 80, 0.3)',
                          borderRadius: '12px',
                          padding: '1rem 1.5rem',
                          marginBottom: '1.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem'
                        }}>
                          <div style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: (isAdmin || hasAdminBypass) ? 'linear-gradient(135deg, #00ffff, #7851a9)' : 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
                            boxShadow: `0 0 10px ${(isAdmin || hasAdminBypass) ? '#00ffff' : '#ff6b6b'}30`
                          }} />
                          <div>
                            <div style={{ color: 'white', fontWeight: '600', fontSize: '1rem', marginBottom: '0.25rem' }}>
                              {(isAdmin || hasAdminBypass) ? '👑 Admin Mode' : '👨‍🏫 Trainer Mode'}
                              {hasAdminBypass && !isAdmin && ' (Debug)'}
                            </div>
                            <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.85rem' }}>
                              {(isAdmin || hasAdminBypass) 
                                ? 'Block time for specific trainers or create global blocks'
                                : 'Block time on your personal training schedule'
                              }
                            </div>
                          </div>
                        </div>

                        {/* Date and Time Selection */}
                        <div className="form-section">
                          <h3 className="section-heading">📅 When to Block</h3>
                          <div className="form-row">
                            <div className="form-group">
                              <label htmlFor="block-date" id="block-date-label">
                                Date *
                              </label>
                              <input
                                type="date"
                                id="block-date"
                                name="startDate"
                                value={formData.startDate}
                                onChange={handleFormChange}
                                min={moment().format('YYYY-MM-DD')}
                                required
                                aria-required="true"
                              />
                            </div>
                            <div className="form-group">
                              <label htmlFor="block-time" id="block-time-label">
                                Start Time *
                              </label>
                              <input
                                type="time"
                                id="block-time"
                                name="startTime"
                                value={formData.startTime}
                                onChange={handleFormChange}
                                required
                                aria-required="true"
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* Block Details */}
                        <div className="form-section">
                          <h3 className="section-heading">📝 Block Details</h3>
                          <div className="form-row">
                            <div className="form-group">
                              <label htmlFor="block-reason" id="reason-label">
                                Reason for Blocking *
                              </label>
                              <input 
                                type="text" 
                                id="block-reason" 
                                name="reason" 
                                value={formData.reason}
                                onChange={handleFormChange}
                                aria-labelledby="reason-label"
                                placeholder="e.g., Personal Training, Vacation, Equipment Maintenance"
                                required
                                aria-required="true"
                              />
                            </div>
                            
                            <div className="form-group">
                              <label htmlFor="block-duration" id="block-duration-label">
                                Duration *
                              </label>
                              <select
                                id="block-duration" 
                                name="duration" 
                                value={formData.duration}
                                onChange={handleFormChange}
                                aria-labelledby="block-duration-label"
                                required
                                aria-required="true"
                              >
                                <option value={15}>15 minutes</option>
                                <option value={30}>30 minutes</option>
                                <option value={45}>45 minutes</option>
                                <option value={60}>1 hour</option>
                                <option value={90}>1.5 hours</option>
                                <option value={120}>2 hours</option>
                                <option value={180}>3 hours</option>
                                <option value={240}>4 hours</option>
                                <option value={480}>8 hours (Half Day)</option>
                                <option value={1440}>24 hours (Full Day)</option>
                              </select>
                            </div>
                          </div>
                          
                          {(isAdmin || hasAdminBypass) && (
                            <div className="form-group">
                              <label htmlFor="block-trainerId" id="block-trainer-label" style={{ color: '#ff6b6b', fontWeight: '600' }}>
                                👨‍🏫 Target Trainer
                              </label>
                              <select 
                                id="block-trainerId" 
                                name="trainerId" 
                                value={formData.trainerId}
                                onChange={handleFormChange}
                                aria-labelledby="block-trainer-label"
                              >
                                <option value="">🌐 All Trainers (Global Block)</option>
                                {trainers.map(trainer => (
                                  <option key={trainer.id} value={trainer.id}>
                                    👤 {trainer.firstName} {trainer.lastName}
                                  </option>
                                ))}
                              </select>
                              <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                                💡 Leave blank to block time for all trainers, or select a specific trainer
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Recurring Options */}
                        <div className="form-section">
                          <div className="recurring-section" style={{
                            padding: '1.25rem',
                            background: 'rgba(30, 30, 60, 0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                              <input
                                type="checkbox"
                                id="is-recurring"
                                name="isRecurring"
                                checked={formData.isRecurring}
                                onChange={(e) => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))}
                                style={{ marginRight: '0.75rem', width: '18px', height: '18px', accentColor: '#ff6b6b' }}
                              />
                              <label htmlFor="is-recurring" style={{ color: '#ff6b6b', fontWeight: '600', fontSize: '1.1rem', cursor: 'pointer' }}>
                                🔄 Make this a recurring block
                              </label>
                            </div>
                            
                            {formData.isRecurring && (
                              <>
                                <label style={{ color: 'white', fontSize: '1rem', fontWeight: '500', marginBottom: '0.75rem', display: 'block' }}>
                                  📅 Repeat on these days:
                                </label>
                                <div className="days-of-week" style={{ 
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))',
                                  gap: '0.5rem',
                                  marginBottom: '1rem'
                                }}>
                                  {[
                                    { value: 0, label: 'Sun' },
                                    { value: 1, label: 'Mon' },
                                    { value: 2, label: 'Tue' },
                                    { value: 3, label: 'Wed' },
                                    { value: 4, label: 'Thu' },
                                    { value: 5, label: 'Fri' },
                                    { value: 6, label: 'Sat' }
                                  ].map(day => {
                                    const isSelected = formData.recurringDays.includes(day.value);
                                    return (
                                      <div 
                                        key={day.value}
                                        style={{ 
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          padding: '0.75rem',
                                          background: isSelected ? 'rgba(230, 80, 80, 0.3)' : 'rgba(40, 40, 70, 0.5)',
                                          borderRadius: '8px',
                                          cursor: 'pointer',
                                          border: isSelected ? '2px solid rgba(230, 80, 80, 0.6)' : '2px solid transparent',
                                          transition: 'all 0.2s ease',
                                          fontWeight: isSelected ? '600' : '400',
                                          color: isSelected ? 'white' : 'rgba(255, 255, 255, 0.7)'
                                        }}
                                        onClick={() => {
                                          const updatedDays = formData.recurringDays.includes(day.value)
                                            ? formData.recurringDays.filter(d => d !== day.value)
                                            : [...formData.recurringDays, day.value];
                                          setFormData(prev => ({ ...prev, recurringDays: updatedDays }));
                                        }}
                                      >
                                        {day.label}
                                      </div>
                                    );
                                  })}
                                </div>
                                
                                <label htmlFor="until-date" style={{ color: 'white', fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                                  📆 Repeat until:
                                </label>
                                <input
                                  type="date"
                                  id="until-date"
                                  name="untilDate"
                                  value={formData.untilDate}
                                  onChange={handleFormChange}
                                  min={moment().format('YYYY-MM-DD')}
                                  style={{ width: '100%' }}
                                />
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Enhanced Unified Footer */}
                  <div className="modal-footer">
                    <div className="button-group">
                      <button 
                        className="button secondary" 
                        onClick={() => {
                          setShowModal(false);
                          announceToScreenReader('Modal closed');
                        }}
                        aria-label="Cancel and close modal"
                      >
                        ❌ Cancel
                      </button>
                      <button 
                        className="button primary" 
                        onClick={createModalMode === 'session' ? handleCreateSession : handleCreateBlockedTime}
                        disabled={
                          createModalMode === 'session' 
                            ? !formData.title.trim() 
                            : !formData.reason.trim() || !formData.startDate || !formData.startTime
                        }
                        aria-label={createModalMode === 'session' ? "Create new session" : "Block selected time"}
                        style={{
                          background: createModalMode === 'session' 
                            ? 'linear-gradient(135deg, #00ffff, #7851a9)'
                            : 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
                          opacity: (
                            createModalMode === 'session' 
                              ? formData.title.trim() 
                              : formData.reason.trim() && formData.startDate && formData.startTime
                          ) ? 1 : 0.6
                        }}
                      >
                        {createModalMode === 'session' ? '✨ Create Session' : '🚫 Block Time'}
                        {createModalMode === 'block' && formData.isRecurring && ' (Recurring)'}
                      </button>
                    </div>
                  </div>
                </>
              )}
              
              {/* View session details */}
              {modalType === 'view' && selectedEvent && (
                <>
                  <h2 id="modal-title">{selectedEvent.title}</h2>
                  
                  <div className="form-section">
                    <div className="status-badge" style={{
                      display: 'inline-block',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      fontWeight: 'bold',
                      marginBottom: '1rem',
                      backgroundColor: 
                        selectedEvent.status === 'available' ? 'rgba(0, 200, 150, 0.2)' :
                        selectedEvent.status === 'booked' ? 'rgba(150, 100, 230, 0.2)' :
                        selectedEvent.status === 'confirmed' ? 'rgba(0, 180, 230, 0.2)' :
                        selectedEvent.status === 'completed' ? 'rgba(70, 200, 70, 0.2)' :
                        'rgba(230, 80, 80, 0.2)',
                      color: 
                        selectedEvent.status === 'available' ? 'rgb(0, 200, 150)' :
                        selectedEvent.status === 'booked' ? 'rgb(150, 100, 230)' :
                        selectedEvent.status === 'confirmed' ? 'rgb(0, 180, 230)' :
                        selectedEvent.status === 'completed' ? 'rgb(70, 200, 70)' :
                        'rgb(230, 80, 80)'
                    }}>
                      {selectedEvent.status.toUpperCase()}
                    </div>
                    
                    <div className="detail-item">
                      <span className="detail-label">Date:</span>
                      <span className="detail-value">{moment(selectedEvent.start).format('dddd, MMMM D, YYYY')}</span>
                    </div>
                    
                    <div className="detail-item">
                      <span className="detail-label">Time:</span>
                      <span className="detail-value">{moment(selectedEvent.start).format('h:mm A')} - {moment(selectedEvent.end).format('h:mm A')}</span>
                    </div>
                    
                    {selectedEvent.location && (
                      <div className="detail-item">
                        <span className="detail-label">Location:</span>
                        <span className="detail-value">{selectedEvent.location}</span>
                      </div>
                    )}
                    
                    {selectedEvent.trainer && (
                      <div className="detail-item">
                        <span className="detail-label">Trainer:</span>
                        <span className="detail-value">{selectedEvent.trainer.firstName} {selectedEvent.trainer.lastName}</span>
                      </div>
                    )}
                    
                    {selectedEvent.client && (
                      <div className="detail-item">
                        <span className="detail-label">Client:</span>
                        <span className="detail-value">{selectedEvent.client.firstName} {selectedEvent.client.lastName}</span>
                      </div>
                    )}
                  </div>
                  
                  {selectedEvent.notes && (
                    <div className="form-section">
                      <h3 className="section-heading">Notes</h3>
                      <p>{selectedEvent.notes}</p>
                    </div>
                  )}
                  
                  <div className="button-group">
                    <button 
                      className="button secondary" 
                      onClick={() => setShowModal(false)}
                      aria-label="Close session details"
                    >
                      Close
                    </button>
                    
                    {selectedEvent.status === 'booked' && (isAdmin || 
                      (isTrainer && selectedEvent.trainerId === user?.id)) && (
                      <button
                        className="button primary"
                        onClick={() => handleConfirmSession(selectedEvent.id)}
                        aria-label="Confirm this session"
                      >
                        Confirm Session
                      </button>
                    )}
                    
                    {['available', 'booked', 'confirmed'].includes(selectedEvent.status) && 
                     (isAdmin || (isTrainer && selectedEvent.trainerId === user?.id) || 
                      (isClient && selectedEvent.userId === user?.id)) && (
                      <button
                        className="button secondary"
                        style={{ backgroundColor: 'rgba(230, 80, 80, 0.3)' }}
                        onClick={() => handleCancelSession(selectedEvent.id)}
                        aria-label="Cancel this session"
                      >
                        Cancel Session
                      </button>
                    )}
                    
                    {selectedEvent.status === 'blocked' && (isAdmin || 
                      (isTrainer && (selectedEvent.trainerId === user?.id || !selectedEvent.trainerId))) && (
                      <>
                        <button
                          className="button secondary"
                          style={{ backgroundColor: 'rgba(230, 80, 80, 0.3)' }}
                          onClick={() => handleDeleteBlockedTime(selectedEvent.id, false)}
                          aria-label="Delete this blocked time"
                        >
                          Delete Blocked Time
                        </button>
                        {selectedEvent.isRecurring && (
                          <button
                            className="button secondary"
                            style={{ backgroundColor: 'rgba(230, 80, 80, 0.6)' }}
                            onClick={() => handleDeleteBlockedTime(selectedEvent.id, true)}
                            aria-label="Delete all recurring blocked times"
                          >
                            Delete All Recurring
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
              
              {/* Book session form */}
              {modalType === 'book' && selectedEvent && (
                <>
                  <h2 id="modal-title">Book This Session</h2>
                  
                  <div className="form-section">
                    <div className="detail-item">
                      <span className="detail-label">Date:</span>
                      <span className="detail-value">{moment(selectedEvent.start).format('dddd, MMMM D, YYYY')}</span>
                    </div>
                    
                    <div className="detail-item">
                      <span className="detail-label">Time:</span>
                      <span className="detail-value">{moment(selectedEvent.start).format('h:mm A')} - {moment(selectedEvent.end).format('h:mm A')}</span>
                    </div>
                    
                    {selectedEvent.location && (
                      <div className="detail-item">
                        <span className="detail-label">Location:</span>
                        <span className="detail-value">{selectedEvent.location}</span>
                      </div>
                    )}
                    
                    {selectedEvent.trainer && (
                      <div className="detail-item">
                        <span className="detail-label">Trainer:</span>
                        <span className="detail-value">{selectedEvent.trainer.firstName} {selectedEvent.trainer.lastName}</span>
                      </div>
                    )}
                    
                    <div className="form-section" style={{ marginTop: '1.5rem' }}>
                      <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.1rem', textAlign: 'center' }}>
                        Click "Book Session" to reserve this time slot
                      </p>
                    </div>
                  </div>
                  
                  <div className="button-group">
                    <button 
                      className="button secondary" 
                      onClick={() => setShowModal(false)}
                      aria-label="Cancel booking"
                    >
                      Cancel
                    </button>
                    <button 
                      className="button primary" 
                      onClick={() => handleBookSession(selectedEvent.id)}
                      aria-label="Confirm booking"
                    >
                      Book Session
                    </button>
                  </div>
                </>
              )}
            </ModalContent>
          </ModalBackdrop>
        )}
      </AnimatePresence>
    </CalendarContainer>
  );
};

export default UnifiedCalendar;