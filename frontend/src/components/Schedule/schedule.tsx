/**
 * UnifiedCalendar.tsx
 * 
 * A 7-star premium calendar component that seamlessly integrates with the admin dashboard.
 * - Administrators can create new session slots by clicking on empty time slots
 * - Clients can book available sessions by clicking on session events
 * - Features luxury styling with glass-morphism, animations, and responsive design
 * - Role-based functionality with permissions handling
 */

import React, { useEffect, useState, useRef } from "react";
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

// Custom components
import GlowButton from "../../components/Button/glowButton";
import { useAuth } from "../../context/AuthContext";

// Import big calendar styles
import "react-big-calendar/lib/css/react-big-calendar.css";

// Using global type declarations or casting as any if needed:
const SCHEDULE_URL =
  (import.meta as any).env.VITE_SCHEDULE_API_URL || "http://localhost:5000/api/schedule";

// Set up the localizer for calendar
const localizer = momentLocalizer(moment);

// Define event interfaces
interface SessionEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  status: string; // "available" or "booked"
  userId?: number | null; // ID of user who booked (if any)
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
    
    &.booked {
      background-color: rgba(120, 81, 169, 0.7);
    }
    
    &.user-booked {
      background-color: rgba(0, 200, 83, 0.7);
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
  max-width: 450px;
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
  margin-bottom: 2rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
  
  span {
    color: #00ffff;
    font-weight: 500;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  
  @media (max-width: 480px) {
    flex-direction: column;
    gap: 0.75rem;
  }
`;

const ErrorMessage = styled(motion.div)`
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 10px;
  background: rgba(255, 50, 50, 0.1);
  border-left: 3px solid #ff5555;
  color: #ff5555;
  font-size: 1rem;
`;

/* ========== UnifiedCalendar Component ========== */
const UnifiedCalendar: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // States
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState<Date>(new Date());
  
  // Stats
  const [stats, setStats] = useState({
    totalSessions: 0,
    bookedSessions: 0,
    availableSessions: 0,
    userBookedSessions: 0
  });
  
  // Modal states for different actions
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SessionEvent | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  
  // Animation refs and controls
  const containerRef = useRef(null);
  const calendarRef = useRef(null);
  const controls = useAnimation();
  const isInView = useInView(containerRef, { once: true });
  
  // Load sessions on component mount
  useEffect(() => {
    if (user) {
      fetchSessions();
    } else {
      setLoading(false);
    }
  }, [user]);
  
  // Start animations when components come into view
  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [isInView, controls]);
  
  /**
   * Fetch all sessions from the API and categorize them
   */
  const fetchSessions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication required. Please log in again.");
        setLoading(false);
        return;
      }
      
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(SCHEDULE_URL, { headers });
      
      const formattedSessions: SessionEvent[] = response.data.map((session: any) => ({
        id: session.id,
        title: session.status === "available" 
          ? "Available" 
          : (session.userId === user?.id ? "Your Session" : "Booked"),
        start: new Date(session.sessionDate),
        end: new Date(new Date(session.sessionDate).getTime() + 60 * 60 * 1000), // Add 1 hour
        allDay: false,
        status: session.status,
        userId: session.userId || null
      }));
      
      setEvents(formattedSessions);
      
      // Calculate stats
      const totalSessions = formattedSessions.length;
      const bookedSessions = formattedSessions.filter(e => e.status === "booked").length;
      const availableSessions = totalSessions - bookedSessions;
      const userBookedSessions = formattedSessions.filter(e => e.userId === user?.id).length;
      
      setStats({
        totalSessions,
        bookedSessions,
        availableSessions,
        userBookedSessions
      });
      
      setError("");
    } catch (err: any) {
      console.error("Error fetching sessions:", err);
      if (err.response && err.response.status === 401) {
        setError("Unauthorized. Please ensure you are logged in.");
      } else {
        setError("Could not fetch sessions. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle event selection - different behavior based on user role and event status
   */
  const handleSelectEvent = (event: SessionEvent) => {
    setSelectedEvent(event);
    
    if (user?.role === "admin") {
      // Admins can cancel any session
      setShowCancelModal(true);
    } else if (user?.role === "user" && event.status === "available") {
      // Users can book available sessions
      setShowBookingModal(true);
    } else if (user?.role === "user" && event.userId === user.id) {
      // Users can cancel their own bookings
      setShowCancelModal(true);
    } else {
      // Show appropriate message for booked sessions
      setError("This session is already booked by someone else.");
      setTimeout(() => setError(""), 3000);
    }
  };

  /**
   * Handle slot selection - different behavior based on user role
   */
  const handleSelectSlot = (slotInfo: SlotInfo) => {
    if (user?.role === "admin") {
      setSelectedSlot(slotInfo);
      setShowCreateModal(true);
    } else if (user?.role === "user") {
      setError("Only administrators can create new session slots.");
      setTimeout(() => setError(""), 3000);
    }
  };

  /**
   * Book a session for the current user
   */
  const bookSession = async () => {
    if (!selectedEvent || !user) return;
    
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post(`${SCHEDULE_URL}/book`, { sessionId: selectedEvent.id }, { headers });
      
      setShowBookingModal(false);
      setSelectedEvent(null);
      fetchSessions();
    } catch (err: any) {
      console.error("Error booking session:", err);
      setError("Failed to book session. Please try again.");
      setTimeout(() => setError(""), 3000);
    }
  };

  /**
   * Create a new session slot (admin only)
   */
  const createSession = async () => {
    if (!selectedSlot || !user || user.role !== "admin") return;
    
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post(`${SCHEDULE_URL}/create`, { 
        sessionDate: selectedSlot.start.toISOString() 
      }, { headers });
      
      setShowCreateModal(false);
      setSelectedSlot(null);
      fetchSessions();
    } catch (err: any) {
      console.error("Error creating session:", err);
      setError("Failed to create session. Please try again.");
      setTimeout(() => setError(""), 3000);
    }
  };

  /**
   * Cancel a session (admins can cancel any, users only their own)
   */
  const cancelSession = async () => {
    if (!selectedEvent || !user) return;
    
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post(`${SCHEDULE_URL}/cancel`, { sessionId: selectedEvent.id }, { headers });
      
      setShowCancelModal(false);
      setSelectedEvent(null);
      fetchSessions();
    } catch (err: any) {
      console.error("Error cancelling session:", err);
      setError("Failed to cancel session. Please try again.");
      setTimeout(() => setError(""), 3000);
    }
  };
  
  /**
   * Jump to today in calendar
   */
  const goToToday = () => {
    setDate(new Date());
  };

  /**
   * Custom event styling based on status
   */
  const eventPropGetter = (event: SessionEvent) => {
    let className = '';
    
    if (event.status === 'booked') {
      if (event.userId === user?.id) {
        className = 'user-booked';
      } else {
        className = 'booked';
      }
    }
    
    return { className };
  };
  
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
  
  return (
    <CalendarContainer
      ref={containerRef}
      initial="hidden"
      animate={controls}
      variants={containerVariants}
    >
      {/* Calendar Header */}
      <CalendarHeader variants={itemVariants}>
        <CalendarTitle>Session Calendar</CalendarTitle>
        
        <ActionsContainer>
          <Tooltip title="Go to Today">
            <IconButton 
              onClick={goToToday}
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
          
          <RefreshButton onClick={fetchSessions}>
            <RefreshIcon className="refresh-icon" />
          </RefreshButton>
          
          {user?.role === 'admin' && (
            <Tooltip title="Create New Session">
              <IconButton 
                onClick={() => setShowCreateModal(true)}
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
          )}
        </ActionsContainer>
      </CalendarHeader>
      
      {/* Stats Cards */}
      <StatsContainer variants={itemVariants}>
        <StatCard elevation={0}>
          <EventIcon sx={{ color: '#00ffff' }} />
          <Box>
            <Typography className="stat-value">{stats.totalSessions}</Typography>
            <Typography className="stat-label">Total Sessions</Typography>
          </Box>
        </StatCard>
        
        <StatCard elevation={0}>
          <Box sx={{ color: '#00ffff' }}>
            <CheckCircleIcon />
          </Box>
          <Box>
            <Typography className="stat-value">{stats.availableSessions}</Typography>
            <Typography className="stat-label">Available</Typography>
          </Box>
        </StatCard>
        
        {user?.role === 'user' && (
          <StatCard elevation={0}>
            <Box sx={{ color: 'rgba(0, 200, 83, 0.9)' }}>
              <EventIcon />
            </Box>
            <Box>
              <Typography className="stat-value" sx={{ color: 'rgba(0, 200, 83, 0.9)' }}>
                {stats.userBookedSessions}
              </Typography>
              <Typography className="stat-label">Your Sessions</Typography>
            </Box>
          </StatCard>
        )}
      </StatsContainer>
      
      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <ErrorMessage
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {error}
          </ErrorMessage>
        )}
      </AnimatePresence>
      
      {/* Calendar */}
      <StyledCalendarWrapper ref={calendarRef}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={(newView) => setView(newView)}
          date={date}
          onNavigate={setDate}
          views={["month", "week", "day", "agenda"]}
          selectable
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          eventPropGetter={eventPropGetter}
          style={{ height: "100%" }}
          defaultView={isMobile ? "day" : "week"}
          toolbar={true}
        />
        
        {loading && (
          <LoadingOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LoadingSpinner />
          </LoadingOverlay>
        )}
      </StyledCalendarWrapper>
      
      {/* Booking Modal */}
      <AnimatePresence>
        {showBookingModal && selectedEvent && (
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
                Would you like to book a session on <span>{moment(selectedEvent.start).format('MMMM Do, YYYY [at] h:mm A')}</span>?
              </ModalText>
              <ButtonGroup>
                <GlowButton
                  text="Confirm Booking"
                  theme="cosmic"
                  size="medium"
                  onClick={bookSession}
                  animateOnRender
                />
                <GlowButton
                  text="Cancel"
                  theme="dark"
                  size="medium"
                  onClick={() => { setShowBookingModal(false); setSelectedEvent(null); }}
                />
              </ButtonGroup>
            </ModalContainer>
          </ModalOverlay>
        )}
      </AnimatePresence>
      
      {/* Create Session Modal */}
      <AnimatePresence>
        {showCreateModal && (selectedSlot || user?.role === 'admin') && (
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
              <ModalText>
                {selectedSlot ? (
                  <>Create a new session slot for <span>{moment(selectedSlot.start).format('MMMM Do, YYYY [at] h:mm A')}</span>?</>
                ) : (
                  <>Create a new session?</>
                )}
              </ModalText>
              <ButtonGroup>
                <GlowButton
                  text="Create Session"
                  theme="cosmic"
                  size="medium"
                  onClick={createSession}
                  animateOnRender
                />
                <GlowButton
                  text="Cancel"
                  theme="dark"
                  size="medium"
                  onClick={() => { setShowCreateModal(false); setSelectedSlot(null); }}
                />
              </ButtonGroup>
            </ModalContainer>
          </ModalOverlay>
        )}
      </AnimatePresence>
      
      {/* Cancel Session Modal */}
      <AnimatePresence>
        {showCancelModal && selectedEvent && (
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
                Are you sure you want to cancel the session on <span>{moment(selectedEvent.start).format('MMMM Do, YYYY [at] h:mm A')}</span>?
              </ModalText>
              <ButtonGroup>
                <GlowButton
                  text="Yes, Cancel"
                  theme="cosmic"
                  size="medium"
                  onClick={cancelSession}
                  animateOnRender
                />
                <GlowButton
                  text="Keep Session"
                  theme="dark"
                  size="medium"
                  onClick={() => { setShowCancelModal(false); setSelectedEvent(null); }}
                />
              </ButtonGroup>
            </ModalContainer>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </CalendarContainer>
  );
};

export default UnifiedCalendar;