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
const StatCard = styled(motion.div)`
  background: rgba(30, 30, 60, 0.6);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  min-width: 140px;
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: ${pulseGlow} 4s infinite;
  
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
      rgba(255, 255, 255, 0.1) 50%,
      transparent 100%
    );
    transition: all 0.3s ease;
  }
  
  &:hover:before {
    left: 100%;
  }
`;

// Stat label
const StatLabel = styled.div`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 0.25rem;
`;

// Stat value with animated gradient
const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
  background: linear-gradient(45deg, #00ffff, #7851a9);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  animation: ${gradientShift} 3s ease infinite;
`;

// Calendar wrapper with custom styling
const CalendarWrapper = styled.div`
  flex: 1;
  position: relative;
  min-height: 500px;
  
  /* Custom styles for react-big-calendar */
  .rbc-calendar {
    width: 100%;
    height: 100%;
    background: rgba(20, 20, 35, 0.3);
    border-radius: 12px;
    padding: 0.5rem;
    overflow: hidden;
  }
  
  .rbc-toolbar {
    margin-bottom: 0.5rem;
    padding: 0.5rem;
    background: rgba(30, 30, 60, 0.5);
    border-radius: 8px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    
    @media (max-width: 768px) {
      flex-direction: column;
      align-items: flex-start;
    }
  }
  
  .rbc-toolbar-label {
    font-size: 1.25rem;
    font-weight: 300;
    letter-spacing: 0.5px;
    color: white;
  }
  
  .rbc-btn-group {
    button {
      background: rgba(30, 30, 60, 0.5);
      color: white;
      border: 1px solid rgba(120, 81, 169, 0.3);
      transition: all 0.2s ease;
      
      &:hover:not(.rbc-active) {
        background: rgba(120, 81, 169, 0.3);
      }
      
      &.rbc-active {
        background: rgba(120, 81, 169, 0.5);
        box-shadow: 0 0 10px rgba(120, 81, 169, 0.3);
      }
    }
  }
  
  .rbc-header {
    background: rgba(30, 30, 60, 0.5);
    color: white;
    padding: 0.5rem;
    font-weight: 300;
  }
  
  .rbc-date-cell {
    color: rgba(255, 255, 255, 0.8);
    padding: 0.25rem;
  }
  
  .rbc-today {
    background: rgba(120, 81, 169, 0.2);
  }
  
  .rbc-event {
    background: linear-gradient(45deg, rgba(0, 255, 255, 0.8), rgba(120, 81, 169, 0.8));
    border: none;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
    }
    
    &.available {
      background: linear-gradient(45deg, rgba(0, 200, 150, 0.8), rgba(0, 150, 100, 0.8));
    }
    
    &.booked {
      background: linear-gradient(45deg, rgba(120, 81, 169, 0.8), rgba(80, 50, 120, 0.8));
    }
    
    &.confirmed {
      background: linear-gradient(45deg, rgba(0, 255, 255, 0.8), rgba(0, 150, 200, 0.8));
    }
    
    &.completed {
      background: linear-gradient(45deg, rgba(100, 255, 100, 0.8), rgba(50, 200, 50, 0.8));
    }
    
    &.cancelled {
      background: linear-gradient(45deg, rgba(255, 100, 100, 0.8), rgba(200, 50, 50, 0.8));
      text-decoration: line-through;
      opacity: 0.7;
    }
  }
  
  .rbc-time-slot {
    background: rgba(30, 30, 60, 0.3);
    border-color: rgba(255, 255, 255, 0.05);
  }
  
  .rbc-time-content {
    border-color: rgba(255, 255, 255, 0.05);
  }
  
  .rbc-time-view {
    border-color: rgba(255, 255, 255, 0.05);
    background: rgba(30, 30, 60, 0.2);
  }
  
  .rbc-timeslot-group {
    border-color: rgba(255, 255, 255, 0.05);
  }
  
  .rbc-time-content > * + * > * {
    border-color: rgba(255, 255, 255, 0.05);
  }
  
  .rbc-time-header-content {
    border-color: rgba(255, 255, 255, 0.05);
  }
  
  .rbc-day-slot .rbc-time-slot {
    border-color: rgba(255, 255, 255, 0.05);
  }
  
  .rbc-month-view {
    border-color: rgba(255, 255, 255, 0.05);
  }
  
  .rbc-month-row + .rbc-month-row {
    border-color: rgba(255, 255, 255, 0.05);
  }
  
  .rbc-day-bg + .rbc-day-bg {
    border-color: rgba(255, 255, 255, 0.05);
  }
  
  .rbc-off-range-bg {
    background: rgba(30, 30, 60, 0.2);
  }
  
  .rbc-off-range {
    color: rgba(255, 255, 255, 0.3);
  }
`;

// Event tooltip content
const EventTooltip = styled.div`
  padding: 0.75rem;
  min-width: 200px;
  background: rgba(30, 30, 60, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  
  h4 {
    margin: 0 0 0.5rem;
    font-weight: 500;
    color: #00ffff;
  }
  
  p {
    margin: 0.25rem 0;
    font-size: 0.9rem;
  }
  
  .actions {
    margin-top: 0.75rem;
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }
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

// Modal content
const ModalContent = styled(motion.div)`
  background: rgba(30, 30, 60, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: 90%;
  max-width: 500px;
  padding: 2rem;
  position: relative;
  
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
  
  h2 {
    margin-top: 0;
    color: white;
    font-weight: 300;
    font-size: 1.5rem;
  }
  
  label {
    display: block;
    margin: 1rem 0 0.25rem;
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.9rem;
  }
  
  input, select, textarea {
    width: 100%;
    padding: 0.75rem;
    background: rgba(20, 20, 35, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: white;
    margin-bottom: 0.5rem;
    
    &:focus {
      outline: none;
      border-color: rgba(0, 255, 255, 0.5);
      box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.2);
    }
  }
  
  .button-group {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1.5rem;
  }
  
  .button {
    padding: 0.75rem 1.25rem;
    border-radius: 8px;
    border: none;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &.primary {
      background: linear-gradient(45deg, #00ffff, #7851a9);
      color: white;
      
      &:hover {
        box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
        transform: translateY(-2px);
      }
    }
    
    &.secondary {
      background: rgba(30, 30, 60, 0.6);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.1);
      
      &:hover {
        background: rgba(50, 50, 80, 0.6);
      }
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
    
    &:hover {
      color: white;
      background: rgba(255, 255, 255, 0.1);
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
    animation: ${rotate} 1s linear infinite;
  }
`;

/**
 * Main UnifiedCalendar Component
 */
const UnifiedCalendar: React.FC = () => {
  // Component state and hooks implementation would go here
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<SessionEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('create'); // 'create', 'view', 'book'
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    booked: 0,
    completed: 0
  });
  
  // Get authenticated user
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isTrainer = user?.role === 'trainer';
  const isClient = user?.role === 'client';
  
  // Calendar view state
  const [view, setView] = useState<View>('week');
  const [date, setDate] = useState(new Date());
  
  // Socket for real-time updates
  const socketRef = useRef<any>(null);
  
  // Theme and responsive hooks
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
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
    // This is a placeholder for actual implementation
  }, []);
  
  // Fetch session events
  useEffect(() => {
    // Code to fetch events would go here
    // This is a placeholder for actual implementation
    
    // Mock data for demonstration
    const mockEvents: SessionEvent[] = [
      {
        id: '1',
        title: 'Available Session',
        start: new Date(new Date().setHours(10, 0)),
        end: new Date(new Date().setHours(11, 0)),
        status: 'available',
        trainerId: 'trainer-1',
        trainer: {
          id: 'trainer-1',
          firstName: 'John',
          lastName: 'Doe',
          specialties: 'Weight Training'
        },
        location: 'Main Gym'
      },
      {
        id: '2',
        title: 'Booked Session with Client',
        start: new Date(new Date().setHours(14, 0)),
        end: new Date(new Date().setHours(15, 0)),
        status: 'booked',
        userId: 'client-1',
        trainerId: 'trainer-1',
        client: {
          id: 'client-1',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com'
        },
        trainer: {
          id: 'trainer-1',
          firstName: 'John',
          lastName: 'Doe',
          specialties: 'Weight Training'
        },
        location: 'Private Room 2',
        notes: 'Focus on upper body'
      }
    ];
    
    // Update state with mock data
    setTimeout(() => {
      setEvents(mockEvents);
      setIsLoading(false);
      setStats({
        total: mockEvents.length,
        available: mockEvents.filter(e => e.status === 'available').length,
        booked: mockEvents.filter(e => e.status === 'booked').length,
        completed: mockEvents.filter(e => e.status === 'completed').length
      });
    }, 1000);
  }, []);
  
  // Handler for selecting an event (session)
  const handleSelectEvent = (event: SessionEvent) => {
    setSelectedEvent(event);
    setModalType(event.status === 'available' && isClient ? 'book' : 'view');
    setShowModal(true);
  };
  
  // Handler for selecting a slot (to create a new session)
  const handleSelectSlot = (slotInfo: SlotInfo) => {
    if (isAdmin || isTrainer) {
      setSelectedSlot(slotInfo);
      setModalType('create');
      setShowModal(true);
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
    setIsLoading(true);
    // Code to fetch fresh data would go here
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };
  
  // Create a new session
  const handleCreateSession = (formData: any) => {
    // Code to create a new session would go here
    setShowModal(false);
  };
  
  // Book a session
  const handleBookSession = (eventId: string) => {
    // Code to book a session would go here
    setShowModal(false);
  };
  
  // Cancel a session
  const handleCancelSession = (eventId: string) => {
    // Code to cancel a session would go here
    setShowModal(false);
  };
  
  // Customize event display
  const eventStyleGetter = (event: SessionEvent) => {
    // Define custom styles based on session status
    let style: any = {
      className: event.status
    };
    
    return {
      style,
      className: event.status
    };
  };
  
  // Create event tooltip content
  const eventTooltip = (event: SessionEvent) => (
    <EventTooltip>
      <h4>{event.title}</h4>
      <p><strong>Status:</strong> {event.status.charAt(0).toUpperCase() + event.status.slice(1)}</p>
      <p><strong>Time:</strong> {moment(event.start).format('h:mm A')} - {moment(event.end).format('h:mm A')}</p>
      {event.location && <p><strong>Location:</strong> {event.location}</p>}
      {event.client && <p><strong>Client:</strong> {event.client.firstName} {event.client.lastName}</p>}
      {event.trainer && <p><strong>Trainer:</strong> {event.trainer.firstName} {event.trainer.lastName}</p>}
      {event.notes && <p><strong>Notes:</strong> {event.notes}</p>}
    </EventTooltip>
  );
  
  return (
    <CalendarContainer
      ref={containerRef}
      initial="hidden"
      animate={controls}
      variants={containerVariants}
    >
      <CalendarHeader variants={itemVariants}>
        <CalendarTitle>Fitness Schedule</CalendarTitle>
        <ActionsContainer>
          <RefreshButton onClick={handleRefresh} aria-label="Refresh calendar">
            <RefreshIcon className="refresh-icon" />
          </RefreshButton>
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
              startIcon={<AddIcon />}
              variant="contained"
              size="small"
            >
              New Session
            </GlowButton>
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
        {isLoading && (
          <Loader
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="loader-inner" />
          </Loader>
        )}
        
        {!isLoading && events.length === 0 ? (
          <NoSessions
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
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
                startIcon={<AddIcon />}
                variant="contained"
              >
                Create First Session
              </GlowButton>
            )}
          </NoSessions>
        ) : (
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 500 }}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable={isAdmin || isTrainer}
            view={view}
            onView={handleViewChange}
            date={date}
            onNavigate={handleNavigate}
            eventPropGetter={eventStyleGetter}
            tooltipAccessor={null}
            // components={{
            //   // Custom components would go here
            //   // For example: event: CustomEvent, toolbar: CustomToolbar, etc.
            // }}
            popup
            views={['month', 'week', 'day', 'agenda']}
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
            >
              <CloseButton onClick={() => setShowModal(false)}>
                <CancelIcon />
              </CloseButton>
              
              {/* Modal content would depend on modalType */}
              {modalType === 'create' && (
                <>
                  <h2>Create New Session</h2>
                  {/* Form for creating sessions would go here */}
                  <div className="button-group">
                    <button className="button secondary" onClick={() => setShowModal(false)}>
                      Cancel
                    </button>
                    <button className="button primary" onClick={() => handleCreateSession({})}>
                      Create Session
                    </button>
                  </div>
                </>
              )}
              
              {modalType === 'view' && selectedEvent && (
                <>
                  <h2>{selectedEvent.title}</h2>
                  {/* Details for viewing sessions would go here */}
                  <div className="button-group">
                    <button className="button secondary" onClick={() => setShowModal(false)}>
                      Close
                    </button>
                    {(isAdmin || (isTrainer && selectedEvent.trainerId === user?.id)) && (
                      <button
                        className="button primary"
                        onClick={() => handleCancelSession(selectedEvent.id)}
                      >
                        Cancel Session
                      </button>
                    )}
                  </div>
                </>
              )}
              
              {modalType === 'book' && selectedEvent && (
                <>
                  <h2>Book Session</h2>
                  {/* Form for booking sessions would go here */}
                  <div className="button-group">
                    <button className="button secondary" onClick={() => setShowModal(false)}>
                      Cancel
                    </button>
                    <button
                      className="button primary"
                      onClick={() => handleBookSession(selectedEvent.id)}
                    >
                      Confirm Booking
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
