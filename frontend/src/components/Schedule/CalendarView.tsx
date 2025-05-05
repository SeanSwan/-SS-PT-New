/**
 * CalendarView.tsx
 * 
 * UI component for the scheduling system that:
 * - Displays the calendar and UI elements
 * - Receives props and handlers from ScheduleContainer
 * - Handles styling and animations
 * - Renders modal dialogs
 */

import React, { useRef } from "react";
import { Calendar, momentLocalizer, SlotInfo, View } from "react-big-calendar";
import moment from "moment";
import styled, { keyframes } from "styled-components";
import { motion, AnimatePresence, AnimationControls, useInView } from "framer-motion";
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

// Custom components
import GlowButton from "../Button/glowButton";

// Import big calendar styles
import "react-big-calendar/lib/css/react-big-calendar.css";

// Import types from container
import { SessionEvent, UserOption, ScheduleStats } from "./ScheduleContainer";

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
const StatCard = styled(Paper)`
  &.MuiPaper-root {
    background: rgba(30, 30, 60, 0.4);
    color: white;
    border-radius: 12px;
    padding: 0.75rem 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    backdrop-filter: blur(5px);
    border: 1px solid rgba(255, 255, 255, 0.05);
    flex: 1;
    min-width: 170px;
    
    .stat-value {
      font-size: 1.25rem;
      font-weight: 400;
      color: #00ffff;
      margin: 0;
    }
    
    .stat-label {
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.7);
      margin: 0;
    }
  }
`;

// Calendar wrapper with custom styling
const StyledCalendarWrapper = styled.div`
  flex: 1;
  min-height: 500px;
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(30, 30, 60, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.05);
  
  /* Custom styling for react-big-calendar */
  .rbc-calendar {
    background: transparent;
    height: 100%;
    color: white;
  }
  
  .rbc-header {
    padding: 12px 0;
    font-weight: 400;
    color: #00ffff;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .rbc-btn-group {
    button {
      color: white;
      background: rgba(30, 30, 60, 0.5);
      border-color: rgba(255, 255, 255, 0.1);
      
      &:hover:not(:disabled) {
        background: rgba(0, 255, 255, 0.2);
        border-color: rgba(0, 255, 255, 0.3);
      }
      
      &.rbc-active {
        background: rgba(0, 255, 255, 0.3);
        border-color: #00ffff;
        box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
      }
    }
  }
  
  .rbc-toolbar button {
    color: white;
    background: rgba(30, 30, 60, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 8px 16px;
    transition: all 0.3s ease;
    
    &:hover {
      background: rgba(0, 255, 255, 0.2);
      border-color: rgba(0, 255, 255, 0.5);
    }
    
    &.rbc-active {
      background: rgba(0, 255, 255, 0.3);
      border-color: #00ffff;
      box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
    }
  }
  
  .rbc-month-view, .rbc-time-view, .rbc-agenda-view {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px;
  }
  
  .rbc-month-row, .rbc-time-header, .rbc-time-content {
    border-color: rgba(255, 255, 255, 0.05);
  }
  
  .rbc-day-bg {
    transition: background-color 0.3s ease;
    
    &.rbc-today {
      background-color: rgba(0, 255, 255, 0.1);
    }
    
    &:hover {
      background-color: rgba(120, 81, 169, 0.1);
    }
  }
  
  .rbc-off-range-bg {
    background: rgba(0, 0, 0, 0.2);
  }
  
  .rbc-event {
    background-color: rgba(0, 255, 255, 0.7);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    color: #000;
    font-weight: 600;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    
    &:hover {
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 6px 15px rgba(0, 0, 0, 0.3);
    }
    
    &.scheduled, &.booked, &.confirmed {
      background-color: rgba(120, 81, 169, 0.7);
    }
    
    &.completed {
      background-color: rgba(0, 200, 83, 0.7);
    }
    
    &.cancelled {
      background-color: rgba(255, 70, 70, 0.7);
      text-decoration: line-through;
    }
    
    &.user-booked {
      background-color: rgba(0, 200, 83, 0.7);
    }
    
    &.available {
      background-color: rgba(0, 255, 255, 0.7);
    }
  }
  
  .rbc-time-slot {
    border-color: rgba(255, 255, 255, 0.05);
  }
  
  .rbc-time-gutter {
    color: rgba(255, 255, 255, 0.7);
  }
  
  .rbc-label {
    color: rgba(255, 255, 255, 0.7);
  }
  
  .rbc-current-time-indicator {
    background-color: #00ffff;
    height: 2px;
  }
  
  .rbc-day-slot .rbc-time-slot {
    border-color: rgba(255, 255, 255, 0.05);
  }
`;

// Loading spinner with animation
const LoadingOverlay = styled(motion.div)`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 10, 26, 0.7);
  backdrop-filter: blur(5px);
  z-index: 10;
  border-radius: 12px;
`;

const LoadingSpinner = styled.div`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 3px solid rgba(0, 255, 255, 0.1);
  border-top-color: #00ffff;
  animation: ${rotate} 1s linear infinite;
`;

// Premium modal components
const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(10, 10, 26, 0.8);
  backdrop-filter: blur(8px);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ModalContainer = styled(motion.div)`
  background: rgba(30, 30, 60, 0.6);
  backdrop-filter: blur(15px);
  padding: 2.5rem;
  border-radius: 20px;
  width: 90%;
  max-width: 500px;
  color: white;
  text-align: center;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
  position: relative;
  overflow: hidden;
  
  /* Gradient border effect */
  &:before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 20px;
    padding: 2px;
    background: linear-gradient(45deg, #00ffff, #7851a9);
    -webkit-mask: 
      linear-gradient(#fff 0 0) content-box, 
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0.8;
    z-index: -1;
  }
  
  /* Background gradient animation */
  &:after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      rgba(0, 255, 255, 0.1),
      rgba(120, 81, 169, 0.1),
      rgba(0, 255, 255, 0.1)
    );
    background-size: 200% 200%;
    animation: ${gradientShift} 10s ease infinite;
    z-index: -1;
  }
`;

const ModalTitle = styled.h3`
  font-size: 1.8rem;
  font-weight: 300;
  margin-bottom: 1.5rem;
  color: #00ffff;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
`;

const ModalText = styled.p`
  font-size: 1.1rem;
  margin-bottom: 1.5rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
  
  span {
    color: #00ffff;
    font-weight: 500;
  }
`;

// Form elements with modern styling
const FormGroup = styled.div`
  margin-bottom: 1.5rem;
  text-align: left;
`;

const FormLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
`;

const FormInput = styled.input`
  width: 100%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: white;
  font-size: 1rem;
  transition: all 0.3s;

  &:focus {
    outline: none;
    border-color: #00ffff;
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.2);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
`;

const FormSelect = styled.select`
  width: 100%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: white;
  font-size: 1rem;
  transition: all 0.3s;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 0.7rem top 50%;
  background-size: 0.65rem auto;

  &:focus {
    outline: none;
    border-color: #00ffff;
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.2);
  }

  option {
    background-color: rgba(30, 30, 60, 0.95);
  }
`;

const FormTextarea = styled.textarea`
  width: 100%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: white;
  font-size: 1rem;
  min-height: 100px;
  resize: vertical;
  transition: all 0.3s;

  &:focus {
    outline: none;
    border-color: #00ffff;
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.2);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.5rem;
  
  @media (max-width: 480px) {
    flex-direction: column;
    gap: 0.75rem;
  }
`;

const FeedbackMessage = styled(motion.div)<{ $isError?: boolean; $isSuccess?: boolean }>`
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 10px;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 10px;
  
  /* Error styling (default) */
  background: ${props => props.$isSuccess ? 'rgba(0, 200, 83, 0.1)' : 'rgba(255, 50, 50, 0.1)'};
  border-left: 3px solid ${props => props.$isSuccess ? '#00c853' : '#ff5555'};
  color: ${props => props.$isSuccess ? '#00c853' : '#ff5555'};
`;

// DetailRow component for the details modal
const DetailRow = styled.div`
  display: flex;
  margin-bottom: 0.75rem;
  text-align: left;
`;

const DetailLabel = styled.span`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  width: 120px;
  flex-shrink: 0;
`;

const DetailValue = styled.span`
  font-size: 1rem;
  color: white;
  flex: 1;
`;

// Animation variants
const containerVariants = {
  hidden: { 
    opacity: 0,
    y: 20
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
};

const itemVariants = {
  hidden: { 
    opacity: 0,
    y: 10
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.9
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: {
      duration: 0.3,
      ease: "easeIn"
    }
  }
};

// Set up the localizer for calendar
const localizer = momentLocalizer(moment);

// Define props interface for CalendarView component
interface CalendarViewProps {
  // Current state
  user: any;
  events: any[];
  loading: boolean;
  operationInProgress?: boolean; // Flag for operations in progress
  error: string;
  view: View;
  date: Date;
  stats: ScheduleStats;
  selectedEvent: SessionEvent | null;
  selectedSlot: SlotInfo | null;
  
  // Modal states
  showBookingModal: boolean;
  showCreateModal: boolean;
  showCancelModal: boolean;
  showRecurringModal: boolean;
  showAssignModal: boolean;
  showDetailsModal: boolean;
  
  // Form states
  newSessionForm: {
    trainerId: string;
    location: string;
    duration: number;
    notes: string;
  };
  recurringSessionForm: {
    startDate: string;
    endDate: string;
    daysOfWeek: number[];
    times: string[];
    trainerId: string;
    location: string;
    duration: number;
  };
  assignForm: { trainerId: string };
  cancelForm: { reason: string };
  trainers: UserOption[];
  clients: UserOption[];
  
  // Animation controls
  controls: AnimationControls;
  
  // Event handlers
  onSelectEvent: (event: SessionEvent) => void;
  onSelectSlot: (slotInfo: SlotInfo) => void;
  onViewChange: (view: View) => void;
  onDateChange: (date: Date) => void;
  goToToday: () => void;
  fetchSessions: () => void;
  eventPropGetter: (event: SessionEvent) => { className: string };
  
  // Modal actions
  closeBookingModal: () => void;
  closeCreateModal: () => void;
  closeDetailsModal: () => void;
  closeAssignModal: () => void;
  closeCancelModal: () => void;
  closeRecurringModal: () => void;
  openRecurringModal: () => void;
  openCreateModal: () => void;
  
  // Session action handlers
  bookSession: () => void;
  createSession: () => void;
  createRecurringSessions: () => void;
  assignTrainer: () => void;
  cancelSession: () => void;
  completeSession: () => void;
  confirmSession: () => void;
  showCancelModalFromDetails: () => void;
  showAssignModalFromDetails: () => void;
  
  // Form handlers
  onNewSessionChange: (field: string, value: any) => void;
  onAssignFormChange: (trainerId: string) => void;
  onCancelFormChange: (reason: string) => void;
  
  // Recurring session form handlers
  onRecurringFormChange: (field: string, value: any) => void;
  onDayToggle: (day: number) => void;
  onTimeAdd: () => void;
  onTimeChange: (index: number, value: string) => void;
  onTimeRemove: (index: number) => void;
}

const CalendarView: React.FC<CalendarViewProps> = (props) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Refs for animations
  const containerRef = useRef(null);
  const calendarRef = useRef(null);
  const isInView = useInView(containerRef, { once: true });
  
  // Start animations when component comes into view
  React.useEffect(() => {
    if (isInView) {
      props.controls.start("visible");
    }
  }, [isInView, props.controls]);
  
  return (
    <CalendarContainer
      ref={containerRef}
      initial="hidden"
      animate={props.controls}
      variants={containerVariants}
    >
      {/* Calendar Header */}
      <CalendarHeader variants={itemVariants}>
        <CalendarTitle>Session Calendar</CalendarTitle>
        
        <ActionsContainer>
          <Tooltip title="Go to Today">
            <IconButton 
              onClick={props.goToToday}
              sx={{ 
                color: '#00ffff', 
                background: 'rgba(0, 255, 255, 0.1)',
                border: '1px solid rgba(0, 255, 255, 0.3)',
                '&:hover': { background: 'rgba(0, 255, 255, 0.2)' }
              }}
            >
              <TodayIcon />
            </IconButton>
          </Tooltip>
          
          <RefreshButton onClick={props.fetchSessions}>
            <RefreshIcon className="refresh-icon" />
          </RefreshButton>
          
          {props.user?.role === 'admin' && (
            <>
              <Tooltip title="Create New Session">
                <IconButton 
                  onClick={props.openCreateModal}
                  sx={{ 
                    color: '#00ffff', 
                    background: 'rgba(0, 255, 255, 0.1)',
                    border: '1px solid rgba(0, 255, 255, 0.3)',
                    '&:hover': { background: 'rgba(0, 255, 255, 0.2)' }
                  }}
                >
                  <AddIcon />
                </IconButton>
              </Tooltip>
              
              <GlowButton
                text="Recurring Sessions"
                theme="cosmic"
                size="small"
                onClick={props.openRecurringModal}
              />
            </>
          )}
        </ActionsContainer>
      </CalendarHeader>
      
      {/* Stats Cards */}
      <StatsContainer variants={itemVariants}>
        <StatCard elevation={0}>
          <EventIcon sx={{ color: '#00ffff' }} />
          <Box>
            <Typography className="stat-value">{props.stats.totalSessions}</Typography>
            <Typography className="stat-label">Total Sessions</Typography>
          </Box>
        </StatCard>
        
        <StatCard elevation={0}>
          <Box sx={{ color: '#00ffff' }}>
            <CheckCircleIcon />
          </Box>
          <Box>
            <Typography className="stat-value">{props.stats.availableSessions}</Typography>
            <Typography className="stat-label">Available</Typography>
          </Box>
        </StatCard>
        
        {(props.user?.role === 'admin' || props.user?.role === 'trainer') && (
          <StatCard elevation={0}>
            <Box sx={{ color: 'rgba(120, 81, 169, 0.9)' }}>
              <EventIcon />
            </Box>
            <Box>
              <Typography className="stat-value" sx={{ color: 'rgba(120, 81, 169, 0.9)' }}>
                {props.stats.bookedSessions}
              </Typography>
              <Typography className="stat-label">Booked Sessions</Typography>
            </Box>
          </StatCard>
        )}
        
        {(props.user?.role === 'client' || props.user?.role === 'user') && (
          <StatCard elevation={0}>
            <Box sx={{ color: 'rgba(0, 200, 83, 0.9)' }}>
              <EventIcon />
            </Box>
            <Box>
              <Typography className="stat-value" sx={{ color: 'rgba(0, 200, 83, 0.9)' }}>
                {props.stats.userBookedSessions}
              </Typography>
              <Typography className="stat-label">Your Sessions</Typography>
            </Box>
          </StatCard>
        )}
      </StatsContainer>
      
      {/* Feedback Message - Error or Success */}
      <AnimatePresence>
        {props.error && (
          <FeedbackMessage
            $isSuccess={props.error.includes('success') || props.error.includes('Successfully')}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {props.error.includes('success') || props.error.includes('Successfully') ? (
              <>
                <CheckCircleIcon fontSize="small" />
                {props.error}
              </>
            ) : (
              <>
                <CancelIcon fontSize="small" />
                {props.error}
              </>
            )}
          </FeedbackMessage>
        )}
      </AnimatePresence>
      
      {/* Calendar */}
      <StyledCalendarWrapper ref={calendarRef}>
        <Calendar
          localizer={localizer}
          events={props.events}
          startAccessor="start"
          endAccessor="end"
          view={props.view}
          onView={props.onViewChange}
          date={props.date}
          onNavigate={props.onDateChange}
          views={["month", "week", "day", "agenda"]}
          selectable
          onSelectEvent={props.onSelectEvent}
          onSelectSlot={props.onSelectSlot}
          eventPropGetter={props.eventPropGetter}
          style={{ height: "100%" }}
          defaultView={isMobile ? "day" : "week"}
          toolbar={true}
        />
        
        {/* Full Loading Overlay */}
        {props.loading && (
          <LoadingOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <LoadingSpinner />
              {props.operationInProgress && (
                <Typography sx={{ color: 'white', fontSize: '0.9rem' }}>
                  Processing your request...
                </Typography>
              )}
            </div>
          </LoadingOverlay>
        )}
      </StyledCalendarWrapper>
      
      {/* Booking Modal */}
      <AnimatePresence>
        {props.showBookingModal && props.selectedEvent && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ModalContainer
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <ModalTitle>Book Session</ModalTitle>
              <ModalText>
                Would you like to book a session on <span>{moment(props.selectedEvent.start).format('MMMM Do, YYYY [at] h:mm A')}</span>?
                {props.selectedEvent.trainer && (
                  <><br/>Trainer: <span>{props.selectedEvent.trainer.firstName} {props.selectedEvent.trainer.lastName}</span></>
                )}
                {props.selectedEvent.location && (
                  <><br/>Location: <span>{props.selectedEvent.location}</span></>
                )}
              </ModalText>
              <ButtonGroup>
                <GlowButton
                  text="Confirm Booking"
                  theme="cosmic"
                  size="medium"
                  onClick={props.bookSession}
                  animateOnRender
                />
                <GlowButton
                  text="Cancel"
                  theme="dark"
                  size="medium"
                  onClick={props.closeBookingModal}
                />
              </ButtonGroup>
            </ModalContainer>
          </ModalOverlay>
        )}
      </AnimatePresence>
      
      {/* Create Session Modal */}
      <AnimatePresence>
        {props.showCreateModal && (props.selectedSlot || props.user?.role === 'admin') && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ModalContainer
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <ModalTitle>Create Session</ModalTitle>
              
              {props.selectedSlot && (
                <ModalText>
                  Create a new session slot for <span>{moment(props.selectedSlot.start).format('MMMM Do, YYYY [at] h:mm A')}</span>
                </ModalText>
              )}
              
              <FormGroup>
                <FormLabel>Trainer (Optional)</FormLabel>
                <FormSelect 
                  value={props.newSessionForm.trainerId} 
                  onChange={(e) => props.onNewSessionChange('trainerId', e.target.value)}
                >
                  <option value="">-- Select Trainer --</option>
                  {props.trainers.map((trainer) => (
                    <option key={trainer.id} value={trainer.id}>
                      {trainer.firstName} {trainer.lastName}
                    </option>
                  ))}
                </FormSelect>
              </FormGroup>
              
              <FormGroup>
                <FormLabel>Location</FormLabel>
                <FormInput 
                  type="text" 
                  value={props.newSessionForm.location} 
                  onChange={(e) => props.onNewSessionChange('location', e.target.value)}
                  placeholder="Main Studio"
                />
              </FormGroup>
              
              <FormGroup>
                <FormLabel>Duration (minutes)</FormLabel>
                <FormInput 
                  type="number" 
                  value={props.newSessionForm.duration} 
                  onChange={(e) => props.onNewSessionChange('duration', parseInt(e.target.value))}
                  min="15"
                  step="15"
                />
              </FormGroup>
              
              <FormGroup>
                <FormLabel>Notes (Optional)</FormLabel>
                <FormTextarea 
                  value={props.newSessionForm.notes} 
                  onChange={(e) => props.onNewSessionChange('notes', e.target.value)}
                  placeholder="Add any additional notes here..."
                />
              </FormGroup>
              
              <ButtonGroup>
                <GlowButton
                  text="Create Session"
                  theme="cosmic"
                  size="medium"
                  onClick={props.createSession}
                  animateOnRender
                />
                <GlowButton
                  text="Cancel"
                  theme="dark"
                  size="medium"
                  onClick={props.closeCreateModal}
                />
              </ButtonGroup>
            </ModalContainer>
          </ModalOverlay>
        )}
      </AnimatePresence>
      
      {/* Recurring Sessions Modal */}
      <AnimatePresence>
        {props.showRecurringModal && props.user?.role === 'admin' && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ModalContainer
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <ModalTitle>Create Recurring Sessions</ModalTitle>
              
              <FormGroup>
                <FormLabel>Start Date</FormLabel>
                <FormInput 
                  type="date" 
                  value={props.recurringSessionForm.startDate} 
                  onChange={(e) => props.onRecurringFormChange('startDate', e.target.value)}
                />
              </FormGroup>
              
              <FormGroup>
                <FormLabel>End Date</FormLabel>
                <FormInput 
                  type="date" 
                  value={props.recurringSessionForm.endDate} 
                  onChange={(e) => props.onRecurringFormChange('endDate', e.target.value)}
                />
              </FormGroup>
              
              <FormGroup>
                <FormLabel>Days of Week</FormLabel>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Mon', value: 1 },
                    { label: 'Tue', value: 2 },
                    { label: 'Wed', value: 3 },
                    { label: 'Thu', value: 4 },
                    { label: 'Fri', value: 5 },
                    { label: 'Sat', value: 6 },
                    { label: 'Sun', value: 0 },
                  ].map(day => (
                    <div 
                      key={day.value} 
                      onClick={() => props.onDayToggle(day.value)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: props.recurringSessionForm.daysOfWeek.includes(day.value) 
                          ? 'rgba(0, 255, 255, 0.3)' 
                          : 'rgba(255, 255, 255, 0.1)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {day.label}
                    </div>
                  ))}
                </div>
              </FormGroup>
              
              <FormGroup>
                <FormLabel>Times</FormLabel>
                {props.recurringSessionForm.times.map((time, index) => (
                  <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <FormInput 
                      type="time" 
                      value={time} 
                      onChange={(e) => props.onTimeChange(index, e.target.value)}
                      style={{ flex: 1 }}
                    />
                    {props.recurringSessionForm.times.length > 1 && (
                      <IconButton 
                        onClick={() => props.onTimeRemove(index)}
                        sx={{ 
                          color: '#ff5555', 
                          background: 'rgba(255, 85, 85, 0.1)',
                          border: '1px solid rgba(255, 85, 85, 0.3)',
                          '&:hover': { background: 'rgba(255, 85, 85, 0.2)' },
                          width: '40px',
                          height: '40px'
                        }}
                      >
                        <CancelIcon fontSize="small" />
                      </IconButton>
                    )}
                  </div>
                ))}
                <GlowButton
                  text="Add Time"
                  theme="dark"
                  size="small"
                  onClick={props.onTimeAdd}
                  style={{ marginTop: '10px' }}
                />
              </FormGroup>
              
              <FormGroup>
                <FormLabel>Trainer (Optional)</FormLabel>
                <FormSelect 
                  value={props.recurringSessionForm.trainerId} 
                  onChange={(e) => props.onRecurringFormChange('trainerId', e.target.value)}
                >
                  <option value="">-- Select Trainer --</option>
                  {props.trainers.map((trainer) => (
                    <option key={trainer.id} value={trainer.id}>
                      {trainer.firstName} {trainer.lastName}
                    </option>
                  ))}
                </FormSelect>
              </FormGroup>
              
              <FormGroup>
                <FormLabel>Location</FormLabel>
                <FormInput 
                  type="text" 
                  value={props.recurringSessionForm.location} 
                  onChange={(e) => props.onRecurringFormChange('location', e.target.value)}
                  placeholder="Main Studio"
                />
              </FormGroup>
              
              <FormGroup>
                <FormLabel>Duration (minutes)</FormLabel>
                <FormInput 
                  type="number" 
                  value={props.recurringSessionForm.duration} 
                  onChange={(e) => props.onRecurringFormChange('duration', parseInt(e.target.value))}
                  min="15"
                  step="15"
                />
              </FormGroup>
              
              <ButtonGroup>
                <GlowButton
                  text="Create Recurring Sessions"
                  theme="cosmic"
                  size="medium"
                  onClick={props.createRecurringSessions}
                  animateOnRender
                />
                <GlowButton
                  text="Cancel"
                  theme="dark"
                  size="medium"
                  onClick={props.closeRecurringModal}
                />
              </ButtonGroup>
            </ModalContainer>
          </ModalOverlay>
        )}
      </AnimatePresence>
      
      {/* Session Details Modal */}
      <AnimatePresence>
        {props.showDetailsModal && props.selectedEvent && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ModalContainer
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <ModalTitle>Session Details</ModalTitle>
              
              <div style={{ marginBottom: '2rem' }}>
                <DetailRow>
                  <DetailLabel>Date & Time:</DetailLabel>
                  <DetailValue>{moment(props.selectedEvent.start).format('MMMM Do, YYYY [at] h:mm A')}</DetailValue>
                </DetailRow>
                
                <DetailRow>
                  <DetailLabel>Duration:</DetailLabel>
                  <DetailValue>{props.selectedEvent.duration || 60} minutes</DetailValue>
                </DetailRow>
                
                <DetailRow>
                  <DetailLabel>Status:</DetailLabel>
                  <DetailValue>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        backgroundColor: props.selectedEvent.status === 'available'
                          ? 'rgba(0, 255, 255, 0.2)'
                          : props.selectedEvent.status === 'completed'
                            ? 'rgba(0, 200, 83, 0.2)'
                            : props.selectedEvent.status === 'cancelled'
                              ? 'rgba(255, 70, 70, 0.2)'
                              : 'rgba(120, 81, 169, 0.2)',
                        color: props.selectedEvent.status === 'available'
                          ? '#00ffff'
                          : props.selectedEvent.status === 'completed'
                            ? '#00c853'
                            : props.selectedEvent.status === 'cancelled'
                              ? '#ff4646'
                              : '#7851a9'
                      }}
                    >
                      {props.selectedEvent.status.charAt(0).toUpperCase() + props.selectedEvent.status.slice(1)}
                    </span>
                  </DetailValue>
                </DetailRow>
                
                {props.selectedEvent.location && (
                  <DetailRow>
                    <DetailLabel>Location:</DetailLabel>
                    <DetailValue>{props.selectedEvent.location}</DetailValue>
                  </DetailRow>
                )}
                
                {props.selectedEvent.client && (
                  <DetailRow>
                    <DetailLabel>Client:</DetailLabel>
                    <DetailValue>{props.selectedEvent.client.firstName} {props.selectedEvent.client.lastName}</DetailValue>
                  </DetailRow>
                )}
                
                {props.selectedEvent.trainer && (
                  <DetailRow>
                    <DetailLabel>Trainer:</DetailLabel>
                    <DetailValue>{props.selectedEvent.trainer.firstName} {props.selectedEvent.trainer.lastName}</DetailValue>
                  </DetailRow>
                )}
                
                {props.selectedEvent.notes && (
                  <DetailRow>
                    <DetailLabel>Notes:</DetailLabel>
                    <DetailValue>{props.selectedEvent.notes}</DetailValue>
                  </DetailRow>
                )}
              </div>
              
              <ButtonGroup>
                {/* Different action buttons based on session status and user role */}
                {(props.user?.role === 'admin' || props.user?.role === 'trainer') && (
                  <>
                    {props.selectedEvent.status === 'available' && !props.selectedEvent.trainer && props.user?.role === 'admin' && (
                      <GlowButton
                        text="Assign Trainer"
                        theme="cosmic"
                        size="small"
                        onClick={props.showAssignModalFromDetails}
                      />
                    )}
                    
                    {['scheduled', 'requested'].includes(props.selectedEvent.status) && (
                      <GlowButton
                        text="Confirm Session"
                        theme="cosmic"
                        size="small"
                        onClick={props.confirmSession}
                      />
                    )}
                    
                    {['confirmed', 'scheduled'].includes(props.selectedEvent.status) && (
                      <GlowButton
                        text="Mark Completed"
                        theme="cosmic"
                        size="small"
                        onClick={props.completeSession}
                      />
                    )}
                  </>
                )}
                
                {/* Cancel button for all users who own their session */}
                {['available', 'scheduled', 'confirmed'].includes(props.selectedEvent.status) && (
                  (props.user?.role === 'admin' || props.selectedEvent.userId === props.user?.id) && (
                    <GlowButton
                      text="Cancel Session"
                      theme="warning"
                      size="small"
                      onClick={props.showCancelModalFromDetails}
                    />
                  )
                )}
                
                <GlowButton
                  text="Close"
                  theme="dark"
                  size="small"
                  onClick={props.closeDetailsModal}
                />
              </ButtonGroup>
            </ModalContainer>
          </ModalOverlay>
        )}
      </AnimatePresence>
      
      {/* Assign Trainer Modal */}
      <AnimatePresence>
        {props.showAssignModal && props.selectedEvent && props.user?.role === 'admin' && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ModalContainer
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <ModalTitle>Assign Trainer</ModalTitle>
              
              <FormGroup>
                <FormLabel>Select Trainer</FormLabel>
                <FormSelect 
                  value={props.assignForm.trainerId} 
                  onChange={(e) => props.onAssignFormChange(e.target.value)}
                >
                  <option value="">-- Select Trainer --</option>
                  {props.trainers.map((trainer) => (
                    <option key={trainer.id} value={trainer.id}>
                      {trainer.firstName} {trainer.lastName}
                    </option>
                  ))}
                </FormSelect>
              </FormGroup>
              
              <ButtonGroup>
                <GlowButton
                  text="Assign Trainer"
                  theme="cosmic"
                  size="medium"
                  onClick={props.assignTrainer}
                  animateOnRender
                />
                <GlowButton
                  text="Cancel"
                  theme="dark"
                  size="medium"
                  onClick={props.closeAssignModal}
                />
              </ButtonGroup>
            </ModalContainer>
          </ModalOverlay>
        )}
      </AnimatePresence>
      
      {/* Cancel Session Modal */}
      <AnimatePresence>
        {props.showCancelModal && props.selectedEvent && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ModalContainer
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <ModalTitle>Cancel Session</ModalTitle>
              
              <ModalText>
                Are you sure you want to cancel this session on <span>{moment(props.selectedEvent.start).format('MMMM Do, YYYY [at] h:mm A')}</span>?
              </ModalText>
              
              <FormGroup>
                <FormLabel>Reason for Cancellation (Optional)</FormLabel>
                <FormTextarea 
                  value={props.cancelForm.reason} 
                  onChange={(e) => props.onCancelFormChange(e.target.value)}
                  placeholder="Please provide a reason for cancellation..."
                />
              </FormGroup>
              
              <ButtonGroup>
                <GlowButton
                  text="Confirm Cancellation"
                  theme="warning"
                  size="medium"
                  onClick={props.cancelSession}
                  animateOnRender
                />
                <GlowButton
                  text="Back"
                  theme="dark"
                  size="medium"
                  onClick={props.closeCancelModal}
                />
              </ButtonGroup>
            </ModalContainer>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </CalendarContainer>
  );
};

export default CalendarView;
