/**
 * CalendarView.jsx
 * 
 * The presentational component for the calendar interface:
 * - Handles all UI rendering for the scheduling system
 * - Receives data and event handlers from the ScheduleContainer
 * - Implements premium styled modals for all scheduler actions
 * - Adapts to different user roles (admin, trainer, client)
 */

import React, { useEffect } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import styled, { keyframes } from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Button, TextField, 
  MenuItem, FormControl, InputLabel, Select, Typography, Box, Chip, Tooltip, 
  CircularProgress, Snackbar, Alert, Divider, Grid, Card, CardContent, Switch, FormControlLabel } from "@mui/material";
import { Close, Event, Refresh, Today, Add, CalendarToday, AccessTime, Check, Cancel, 
  LocationOn, Person, Assignment, Save, Info, Done } from "@mui/icons-material";

// Import big calendar styles
import "react-big-calendar/lib/css/react-big-calendar.css";

// Import gamification icons
import { EmojiEvents, Whatshot, Star, LocalFireDepartment, Celebration } from '@mui/icons-material';

// Import session logging button
import SessionLogButton from '../SessionLogging/SessionLogButton';

// Import workout generator button
import WorkoutGeneratorButton from '../WorkoutGenerator/WorkoutGeneratorButton';

// Set up the localizer for calendar
const localizer = momentLocalizer(moment);

// Animation keyframes
const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
  100% { transform: translateY(0px); }
`;

const pulseGlow = keyframes`
  0% { box-shadow: 0 0 15px rgba(120, 81, 169, 0.4); }
  50% { box-shadow: 0 0 25px rgba(120, 81, 169, 0.7); }
  100% { box-shadow: 0 0 15px rgba(120, 81, 169, 0.4); }
`;

// Styled components
const CalendarContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  background: rgba(30, 30, 60, 0.5);
  border-radius: 16px;
  padding: 1rem;
  position: relative;
  height: 100%;
  width: 100%;
  min-height: 600px;
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
  
  /* Custom styling for react-big-calendar */
  .rbc-calendar {
    background: rgba(20, 20, 40, 0.7);
    border-radius: 8px;
    overflow: hidden;
    height: calc(100% - 140px);
  }
  
  .rbc-header {
    padding: 12px 0;
    background: rgba(0, 0, 0, 0.2);
    color: #fff;
    font-weight: 500;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .rbc-time-view, .rbc-month-view, .rbc-agenda-view {
    background: rgba(30, 30, 50, 0.5);
  }
  
  .rbc-time-header {
    background: rgba(0, 0, 0, 0.2);
  }
  
  .rbc-day-bg {
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  .rbc-today {
    background: rgba(0, 255, 255, 0.1);
  }
  
  .rbc-event {
    border-radius: 4px;
    padding: 4px;
    border: none;
    background: rgba(120, 81, 169, 0.8);
    color: white;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    
    &:hover {
      transform: scale(1.02);
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
    }
  }
  
  /* Status-based event styling */
  .rbc-event.available {
    background: rgba(0, 255, 255, 0.7);
    color: #003333;
  }
  
  .rbc-event.scheduled, .rbc-event.booked {
    background: rgba(255, 152, 0, 0.7);
    color: #333;
  }
  
  .rbc-event.confirmed {
    background: rgba(76, 175, 80, 0.7);
    color: #333;
  }
  
  .rbc-event.completed {
    background: rgba(63, 81, 181, 0.7);
    color: white;
  }
  
  .rbc-event.cancelled {
    background: rgba(211, 47, 47, 0.5);
    color: white;
    text-decoration: line-through;
  }
  
  .rbc-event.user-booked {
    box-shadow: 0 0 0 2px white, 0 0 10px rgba(255, 255, 255, 0.5);
  }
  
  .rbc-time-gutter, .rbc-label {
    color: rgba(255, 255, 255, 0.7);
  }
  
  .rbc-time-content {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .rbc-timeslot-group {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  .rbc-time-slot {
    border-top: 1px solid rgba(255, 255, 255, 0.03);
  }
  
  .rbc-toolbar {
    color: white;
    margin-bottom: 20px;
    
    .rbc-btn-group {
      background: rgba(30, 30, 60, 0.6);
      border-radius: 8px;
      overflow: hidden;
      
      button {
        color: white;
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.1);
        
        &:hover:not(.rbc-active) {
          background: rgba(255, 255, 255, 0.1);
        }
        
        &.rbc-active {
          background: rgba(0, 255, 255, 0.3);
          color: white;
          box-shadow: none;
        }
      }
    }
  }
  
  .rbc-off-range-bg {
    background: rgba(0, 0, 0, 0.2);
  }
  
  .rbc-date-cell {
    color: rgba(255, 255, 255, 0.7);
    
    &.rbc-now {
      color: #00ffff;
      font-weight: bold;
    }
  }
`;

const CalendarHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0 0.5rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
`;

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

const ActionsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const StatsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
  
  @media (max-width: 768px) {
    width: 100%;
  }
`;

const StatCard = styled(Card)`
  && {
    background: rgba(30, 30, 60, 0.7);
    color: white;
    border-radius: 8px;
    flex: 1;
    min-width: 120px;
    max-width: 180px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    }
    
    @media (max-width: 768px) {
      min-width: calc(50% - 0.75rem);
      max-width: none;
    }
    
    @media (max-width: 480px) {
      min-width: 100%;
    }
  }
`;

const GamificationCard = styled(Card)`
  && {
    background: linear-gradient(135deg, rgba(30, 30, 60, 0.8), rgba(120, 81, 169, 0.6));
    color: white;
    border-radius: 8px;
    flex: 1;
    min-width: 120px;
    max-width: 180px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    animation: ${pulseGlow} 2s infinite ease-in-out;
    box-shadow: 0 0 15px rgba(120, 81, 169, 0.4);
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    }
    
    @media (max-width: 768px) {
      min-width: calc(50% - 0.75rem);
      max-width: none;
    }
    
    @media (max-width: 480px) {
      min-width: 100%;
    }
  }
`;

const GamificationIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
  animation: ${float} 3s infinite ease-in-out;
  color: #00ffff;
`;

const GamificationValue = styled.div`
  font-size: 1.8rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
  background: linear-gradient(90deg, #00ffff, #7851a9);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
`;

const GamificationLabel = styled.div`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatValue = styled.div`
  font-size: 1.8rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
  color: #00ffff;
`;

const StatLabel = styled.div`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(20, 20, 40, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  backdrop-filter: blur(5px);
  border-radius: 16px;
`;

const ErrorContainer = styled.div`
  background: rgba(211, 47, 47, 0.2);
  border: 1px solid rgba(211, 47, 47, 0.5);
  color: white;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StyledFormControl = styled(FormControl)`
  && {
    margin-bottom: 1rem;
    
    .MuiInputLabel-root {
      color: rgba(255, 255, 255, 0.7);
    }
    
    .MuiOutlinedInput-root {
      fieldset {
        border-color: rgba(255, 255, 255, 0.2);
      }
      
      &:hover fieldset {
        border-color: rgba(0, 255, 255, 0.5);
      }
      
      &.Mui-focused fieldset {
        border-color: #00ffff;
      }
    }
    
    .MuiOutlinedInput-input {
      color: white;
    }
    
    .MuiSelect-icon {
      color: rgba(255, 255, 255, 0.5);
    }
  }
`;

const StyledTextField = styled(TextField)`
  && {
    margin-bottom: 1rem;
    
    .MuiInputLabel-root {
      color: rgba(255, 255, 255, 0.7);
    }
    
    .MuiOutlinedInput-root {
      fieldset {
        border-color: rgba(255, 255, 255, 0.2);
      }
      
      &:hover fieldset {
        border-color: rgba(0, 255, 255, 0.5);
      }
      
      &.Mui-focused fieldset {
        border-color: #00ffff;
      }
    }
    
    .MuiOutlinedInput-input {
      color: white;
    }
  }
`;

const StyledModalButton = styled(Button)`
  && {
    background: ${props => props.color === 'primary' ? 'linear-gradient(90deg, #00ffff, #7851a9)' : 'rgba(30, 30, 60, 0.7)'};
    color: white;
    border-radius: 8px;
    padding: 0.5rem 1.5rem;
    text-transform: none;
    font-weight: 500;
    position: relative;
    overflow: hidden;
    transition: transform 0.2s ease;
    
    &:hover {
      background: ${props => props.color === 'primary' ? 'linear-gradient(90deg, #00ffff, #7851a9)' : 'rgba(50, 50, 80, 0.7)'};
      transform: translateY(-2px);
      
      &:before {
        transform: translateX(100%);
      }
    }
    
    &:before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.2),
        transparent
      );
      transition: transform 0.5s ease;
    }
    
    &:disabled {
      background: rgba(30, 30, 60, 0.3);
      color: rgba(255, 255, 255, 0.4);
    }
  }
`;

const StyledDialogTitle = styled(DialogTitle)`
  && {
    background: linear-gradient(135deg, rgba(30, 30, 60, 0.9), rgba(60, 60, 90, 0.9));
    color: white;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding: 1rem 1.5rem;
  }
`;

const StyledDialogContent = styled(DialogContent)`
  && {
    background: rgba(30, 30, 60, 0.95);
    color: white;
    padding: 1.5rem;
  }
`;

const StyledDialogActions = styled(DialogActions)`
  && {
    background: rgba(20, 20, 40, 0.95);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding: 1rem;
  }
`;

const EventDetailsRow = styled.div`
  display: flex;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
  
  @media (max-width: 480px) {
    flex-direction: column;
    gap: 0.5rem;
  }
`;

const EventPropertyLabel = styled.span`
  color: rgba(255, 255, 255, 0.7);
  min-width: 100px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  @media (max-width: 480px) {
    min-width: auto;
  }
`;

const EventPropertyValue = styled.span`
  color: white;
  flex: 1;
`;

const DayCheckboxes = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const DayCheckbox = styled.div`
  border: 1px solid ${props => props.selected ? '#00ffff' : 'rgba(255, 255, 255, 0.3)'};
  background: ${props => props.selected ? 'rgba(0, 255, 255, 0.2)' : 'transparent'};
  color: ${props => props.selected ? '#00ffff' : 'white'};
  border-radius: 4px;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${props => props.selected ? '#00ffff' : 'rgba(0, 255, 255, 0.5)'};
    background: ${props => props.selected ? 'rgba(0, 255, 255, 0.3)' : 'rgba(0, 255, 255, 0.1)'};
  }
`;

const TimeSlotContainer = styled.div`
  margin-bottom: 1rem;
`;

const TimeSlot = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const DashboardActionButton = styled(Button)`
  && {
    background: ${props => props.highlight ? 'linear-gradient(90deg, #00ffff, #7851a9)' : 'rgba(30, 30, 60, 0.7)'};
    color: white;
    border-radius: 8px;
    margin-right: 0.5rem;
    margin-bottom: 0.5rem;
    text-transform: none;
    position: relative;
    overflow: hidden;
    
    &:hover {
      background: ${props => props.highlight ? 'linear-gradient(90deg, #00ffff, #7851a9)' : 'rgba(50, 50, 80, 0.7)'};
      
      &:before {
        transform: translateX(100%);
      }
    }
    
    &:before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.2),
        transparent
      );
      transition: transform 0.5s ease;
    }
  }
`;

// Gamification reward popup animation
const popIn = keyframes`
  0% { transform: scale(0.5); opacity: 0; }
  70% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
`;

const fadeOut = keyframes`
  0% { opacity: 1; }
  100% { opacity: 0; }
`;

const RewardPopup = styled(motion.div)`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: linear-gradient(135deg, rgba(30, 30, 60, 0.9), rgba(120, 81, 169, 0.8));
  border-radius: 16px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  box-shadow: 0 0 50px rgba(0, 255, 255, 0.5);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(0, 255, 255, 0.4);
  max-width: 350px;
  text-align: center;
  animation: ${popIn} 0.5s ease-out, ${fadeOut} 0.5s ease-in 3.5s forwards;
`;

const RewardIcon = styled.div`
  font-size: 4rem;
  color: #00ffff;
  margin-bottom: 1rem;
  animation: ${float} 2s infinite ease-in-out;
`;

const RewardTitle = styled.h3`
  font-size: 1.8rem;
  margin: 0 0 0.75rem 0;
  background: linear-gradient(90deg, #00ffff, #7851a9);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-weight: 700;
`;

// Helper functions
const formatDateTime = (date) => {
  return moment(date).format('dddd, MMMM D, YYYY h:mm A');
};

const formatTime = (date) => {
  return moment(date).format('h:mm A');
};

const getDayName = (dayNumber) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNumber];
};

/**
 * Calendar View Component
 * This is the presentational component that renders the calendar and all the modals
 */
const CalendarView = ({
  // State
  user,
  events,
  loading,
  operationInProgress,
  error,
  view,
  date,
  stats,
  selectedEvent,
  selectedSlot,
  gamificationData,
  
  // Modal states
  showBookingModal,
  showCreateModal,
  showCancelModal,
  showRecurringModal,
  showAssignModal,
  showDetailsModal,
  
  // Form states
  newSessionForm,
  recurringSessionForm,
  assignForm,
  cancelForm,
  trainers,
  clients,
  
  // Event handlers
  onSelectEvent,
  onSelectSlot,
  onViewChange,
  onDateChange,
  goToToday,
  fetchSessions,
  eventPropGetter,
  
  // Modal actions
  closeBookingModal,
  closeCreateModal,
  closeDetailsModal,
  closeAssignModal,
  closeCancelModal,
  closeRecurringModal,
  openRecurringModal,
  openCreateModal,
  
  // Session action handlers
  bookSession,
  createSession,
  createRecurringSessions,
  assignTrainer,
  cancelSession,
  completeSession,
  confirmSession,
  showCancelModalFromDetails,
  showAssignModalFromDetails,
  
  // Form handlers
  onNewSessionChange,
  onRecurringFormChange,
  onAssignFormChange,
  onCancelFormChange,
  onDayToggle,
  onTimeAdd,
  onTimeChange,
  onTimeRemove
}) => {
  // Determining what actions to show based on user role
  const isAdmin = user?.role === 'admin';
  const isTrainer = user?.role === 'trainer';
  const isClient = user?.role === 'client' || user?.role === 'user';
  
  // Whether the selected event belongs to the current user
  const isMyEvent = selectedEvent && (
    (isClient && selectedEvent.userId === user?.id) ||
    (isTrainer && selectedEvent.trainerId === user?.id)
  );
  
  // Calendar configuration
  const calendarConfig = {
    localizer,
    events,
    defaultView: view,
    views: ['month', 'week', 'day', 'agenda'],
    onView: onViewChange,
    date,
    onNavigate: onDateChange,
    selectable: true,
    onSelectEvent,
    onSelectSlot,
    eventPropGetter,
    step: 30, // 30 minute intervals
    timeslots: 2, // 2 slots per step (15 minute intervals)
    formats: {
      // Custom time format
      timeGutterFormat: (date, culture, localizer) =>
        localizer.format(date, 'h:mm A', culture),
      
      // Event time format
      eventTimeRangeFormat: ({ start, end }, culture, localizer) =>
        `${localizer.format(start, 'h:mm A', culture)} - ${localizer.format(end, 'h:mm A', culture)}`,
      
      // Day header format
      dayHeaderFormat: (date, culture, localizer) =>
        localizer.format(date, 'dddd, MMMM D', culture),
    }
  };

  // State for gamification rewards popup
  const [showReward, setShowReward] = React.useState(false);
  const [rewardData, setRewardData] = React.useState({ title: '', points: 0, icon: <Star />, message: '' });

  // Function to display a gamification reward
  const displayReward = (title, points, icon, message) => {
    setRewardData({
      title,
      points,
      icon: icon || <EmojiEvents />,
      message: message || 'Keep up the great work!'
    });
    setShowReward(true);
    
    // Auto-hide the reward after 4 seconds
    setTimeout(() => {
      setShowReward(false);
    }, 4000);
  };

  // Check for session completion rewards
  React.useEffect(() => {
    if (gamificationData && gamificationData.recentRewards) {
      const rewards = gamificationData.recentRewards;
      if (rewards.pointsAwarded) {
        let title = '';
        let icon = <EmojiEvents />;
        let message = '';
        
        if (rewards.achievements && rewards.achievements.length > 0) {
          // Achievement unlocked
          title = 'Achievement Unlocked!';
          icon = <Celebration />;
          message = rewards.achievements[0].title;
        } else if (rewards.actionType === 'SESSION_COMPLETED') {
          // Session completed
          title = 'Session Completed!';
          icon = <Done />;
          message = `Great job! +${rewards.pointsAwarded} points`;
        } else if (rewards.actionType === 'SESSION_BOOKED') {
          // Session booked
          title = 'Session Booked!';
          icon = <CalendarToday />;
          message = `Keep it up! +${rewards.pointsAwarded} points`;
        } else if (rewards.actionType === 'SESSION_ATTENDED') {
          // Session attended
          title = 'Session Attended!';
          icon = <Check />;
          message = `Well done! +${rewards.pointsAwarded} points`;
        }
        
        if (title) {
          displayReward(title, rewards.pointsAwarded, icon, message);
        }
      }
    }
  }, [gamificationData?.recentRewards]);

  return (
    <CalendarContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <CalendarHeader>
        <CalendarTitle>Premium Scheduling</CalendarTitle>
        
        <ActionsContainer>
          <Tooltip title="Go to today">
            <IconButton 
              onClick={goToToday}
              sx={{ 
                color: '#00ffff', 
                background: 'rgba(0, 255, 255, 0.1)',
                '&:hover': { background: 'rgba(0, 255, 255, 0.2)' }
              }}
            >
              <Today />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Refresh">
            <IconButton 
              onClick={() => fetchSessions()}
              disabled={loading || operationInProgress}
              sx={{ 
                color: '#00ffff', 
                background: 'rgba(0, 255, 255, 0.1)',
                '&:hover': { background: 'rgba(0, 255, 255, 0.2)' }
              }}
            >
              <Refresh />
            </IconButton>
          </Tooltip>
          
          {/* Admin-only actions */}
          {isAdmin && (
            <>
              <Tooltip title="Create recurring sessions">
                <IconButton 
                  onClick={openRecurringModal}
                  disabled={loading || operationInProgress}
                  sx={{ 
                    color: '#00ffff', 
                    background: 'rgba(0, 255, 255, 0.1)',
                    '&:hover': { background: 'rgba(0, 255, 255, 0.2)' }
                  }}
                >
                  <Event />
                </IconButton>
              </Tooltip>
              
              <DashboardActionButton
                variant="contained"
                startIcon={<Add />}
                highlight={true}
                onClick={openCreateModal}
                disabled={loading || operationInProgress}
              >
                New Session
              </DashboardActionButton>
            </>
          )}
        </ActionsContainer>
      </CalendarHeader>
      
      {/* Stats cards */}
      <StatsContainer>
        <StatCard>
          <CardContent>
            <StatValue>{stats.availableSessions || 0}</StatValue>
            <StatLabel>Available</StatLabel>
          </CardContent>
        </StatCard>
        
        <StatCard>
          <CardContent>
            <StatValue>{stats.bookedSessions || 0}</StatValue>
            <StatLabel>Booked</StatLabel>
          </CardContent>
        </StatCard>
        
        <StatCard>
          <CardContent>
            <StatValue>{stats.completedSessions || 0}</StatValue>
            <StatLabel>Completed</StatLabel>
          </CardContent>
        </StatCard>
        
        {/* Client-specific stat */}
        {isClient && (
          <StatCard>
            <CardContent>
              <StatValue>{stats.userBookedSessions || 0}</StatValue>
              <StatLabel>Your Sessions</StatLabel>
            </CardContent>
          </StatCard>
        )}
        
        {/* Trainer-specific stat */}
        {isTrainer && (
          <StatCard>
            <CardContent>
              <StatValue>{stats.assignedSessions || 0}</StatValue>
              <StatLabel>Assigned</StatLabel>
            </CardContent>
          </StatCard>
        )}
        
        {/* Admin-specific stats */}
        {isAdmin && (
          <>
            <StatCard>
              <CardContent>
                <StatValue>{stats.totalClients || 0}</StatValue>
                <StatLabel>Clients</StatLabel>
              </CardContent>
            </StatCard>
            
            <StatCard>
              <CardContent>
                <StatValue>{stats.totalTrainers || 0}</StatValue>
                <StatLabel>Trainers</StatLabel>
              </CardContent>
            </StatCard>
          </>
        )}
        
        {/* Gamification cards - only for clients/users */}
        {isClient && gamificationData && (
          <>
            <GamificationCard>
              <CardContent>
                <GamificationIcon>
                  <EmojiEvents fontSize="large" />
                </GamificationIcon>
                <GamificationValue>{gamificationData.points || 0}</GamificationValue>
                <GamificationLabel>Points</GamificationLabel>
              </CardContent>
            </GamificationCard>
            
            <GamificationCard>
              <CardContent>
                <GamificationIcon>
                  <Whatshot fontSize="large" />
                </GamificationIcon>
                <GamificationValue>{gamificationData.streakDays || 0}</GamificationValue>
                <GamificationLabel>Day Streak</GamificationLabel>
              </CardContent>
            </GamificationCard>
            
            <GamificationCard>
              <CardContent>
                <GamificationIcon>
                  <Star fontSize="large" />
                </GamificationIcon>
                <GamificationValue>Level {gamificationData.level || 1}</GamificationValue>
                <GamificationLabel>Trainer</GamificationLabel>
              </CardContent>
            </GamificationCard>
          </>
        )}
      </StatsContainer>
      
      {/* Error message */}
      {error && (
        <ErrorContainer>
          <Cancel color="error" />
          <span>{error}</span>
        </ErrorContainer>
      )}
      
      {/* Main Calendar */}
      <Calendar {...calendarConfig} />
      
      {/* Loading overlay */}
      {loading && (
        <LoadingOverlay>
          <CircularProgress 
            sx={{ 
              color: '#00ffff',
              filter: 'drop-shadow(0 0 10px rgba(0, 255, 255, 0.5))'
            }} 
          />
        </LoadingOverlay>
      )}
      
      {/* Session Booking Modal */}
      <Dialog 
        open={showBookingModal} 
        onClose={closeBookingModal}
        PaperProps={{
          style: {
            background: 'rgba(30, 30, 60, 0.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            width: '100%',
            maxWidth: '500px'
          }
        }}
      >
        <StyledDialogTitle>
          Book Session
          <IconButton
            aria-label="close"
            onClick={closeBookingModal}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'white',
            }}
          >
            <Close />
          </IconButton>
        </StyledDialogTitle>
        
        <StyledDialogContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Session Details
          </Typography>
          
          <EventDetailsRow>
            <EventPropertyLabel>
              <CalendarToday fontSize="small" /> Date:
            </EventPropertyLabel>
            <EventPropertyValue>
              {selectedEvent ? formatDateTime(selectedEvent.start) : 'N/A'}
            </EventPropertyValue>
          </EventDetailsRow>
          
          <EventDetailsRow>
            <EventPropertyLabel>
              <AccessTime fontSize="small" /> Duration:
            </EventPropertyLabel>
            <EventPropertyValue>
              {selectedEvent?.duration ? `${selectedEvent.duration} minutes` : '60 minutes'}
            </EventPropertyValue>
          </EventDetailsRow>
          
          <EventDetailsRow>
            <EventPropertyLabel>
              <LocationOn fontSize="small" /> Location:
            </EventPropertyLabel>
            <EventPropertyValue>
              {selectedEvent?.location || 'Main Studio'}
            </EventPropertyValue>
          </EventDetailsRow>
          
          {selectedEvent?.trainer && (
            <EventDetailsRow>
              <EventPropertyLabel>
                <Person fontSize="small" /> Trainer:
              </EventPropertyLabel>
              <EventPropertyValue>
                {`${selectedEvent.trainer.firstName} ${selectedEvent.trainer.lastName}`}
              </EventPropertyValue>
            </EventDetailsRow>
          )}
          
          <Typography variant="body2" sx={{ mt: 2, mb: 2, color: 'rgba(255, 255, 255, 0.7)' }}>
            By booking this session, you agree to our cancellation policy. 
            Sessions cancelled less than 24 hours in advance may be charged.
          </Typography>
        </StyledDialogContent>
        
        <StyledDialogActions>
          <StyledModalButton 
            onClick={closeBookingModal}
            disabled={operationInProgress}
          >
            Cancel
          </StyledModalButton>
          <StyledModalButton 
            color="primary"
            onClick={bookSession}
            disabled={operationInProgress}
            startIcon={operationInProgress ? <CircularProgress size={20} /> : <Check />}
          >
            Book Session
          </StyledModalButton>
        </StyledDialogActions>
      </Dialog>
      
      {/* Create Session Modal */}
      <Dialog 
        open={showCreateModal} 
        onClose={closeCreateModal}
        PaperProps={{
          style: {
            background: 'rgba(30, 30, 60, 0.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            width: '100%',
            maxWidth: '500px'
          }
        }}
      >
        <StyledDialogTitle>
          Create New Session
          <IconButton
            aria-label="close"
            onClick={closeCreateModal}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'white',
            }}
          >
            <Close />
          </IconButton>
        </StyledDialogTitle>
        
        <StyledDialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Creating session for: <strong>{selectedSlot ? formatDateTime(selectedSlot.start) : 'N/A'}</strong>
          </Typography>
          
          <StyledFormControl fullWidth>
            <InputLabel id="trainer-select-label">Assign Trainer (Optional)</InputLabel>
            <Select
              labelId="trainer-select-label"
              value={newSessionForm.trainerId}
              onChange={(e) => onNewSessionChange('trainerId', e.target.value)}
              label="Assign Trainer (Optional)"
            >
              <MenuItem value="">
                <em>None (Available to All)</em>
              </MenuItem>
              {trainers.map((trainer) => (
                <MenuItem key={trainer.id} value={trainer.id}>
                  {`${trainer.firstName} ${trainer.lastName}`}
                </MenuItem>
              ))}
            </Select>
          </StyledFormControl>
          
          <StyledTextField
            label="Location"
            value={newSessionForm.location}
            onChange={(e) => onNewSessionChange('location', e.target.value)}
            fullWidth
            variant="outlined"
          />
          
          <StyledFormControl fullWidth>
            <InputLabel id="duration-select-label">Duration</InputLabel>
            <Select
              labelId="duration-select-label"
              value={newSessionForm.duration}
              onChange={(e) => onNewSessionChange('duration', e.target.value)}
              label="Duration"
            >
              <MenuItem value={30}>30 minutes</MenuItem>
              <MenuItem value={60}>60 minutes</MenuItem>
              <MenuItem value={90}>90 minutes</MenuItem>
              <MenuItem value={120}>2 hours</MenuItem>
            </Select>
          </StyledFormControl>
          
          <StyledTextField
            label="Notes (Optional)"
            value={newSessionForm.notes}
            onChange={(e) => onNewSessionChange('notes', e.target.value)}
            fullWidth
            variant="outlined"
            multiline
            rows={3}
          />
        </StyledDialogContent>
        
        <StyledDialogActions>
          <StyledModalButton 
            onClick={closeCreateModal}
            disabled={operationInProgress}
          >
            Cancel
          </StyledModalButton>
          <StyledModalButton 
            color="primary"
            onClick={createSession}
            disabled={operationInProgress}
            startIcon={operationInProgress ? <CircularProgress size={20} /> : <Add />}
          >
            Create Session
          </StyledModalButton>
        </StyledDialogActions>
      </Dialog>
      
      {/* Create Recurring Sessions Modal */}
      <Dialog 
        open={showRecurringModal} 
        onClose={closeRecurringModal}
        PaperProps={{
          style: {
            background: 'rgba(30, 30, 60, 0.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            width: '100%',
            maxWidth: '600px'
          }
        }}
      >
        <StyledDialogTitle>
          Create Recurring Sessions
          <IconButton
            aria-label="close"
            onClick={closeRecurringModal}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'white',
            }}
          >
            <Close />
          </IconButton>
        </StyledDialogTitle>
        
        <StyledDialogContent>
          <Typography variant="body2" sx={{ mb: 3, color: 'rgba(255, 255, 255, 0.7)' }}>
            Create multiple session slots based on a recurring pattern.
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <StyledTextField
                label="Start Date"
                type="date"
                value={recurringSessionForm.startDate}
                onChange={(e) => onRecurringFormChange('startDate', e.target.value)}
                fullWidth
                variant="outlined"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <StyledTextField
                label="End Date"
                type="date"
                value={recurringSessionForm.endDate}
                onChange={(e) => onRecurringFormChange('endDate', e.target.value)}
                fullWidth
                variant="outlined"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
          
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
            Days of Week
          </Typography>
          
          <DayCheckboxes>
            {[0, 1, 2, 3, 4, 5, 6].map((day) => (
              <DayCheckbox
                key={day}
                selected={recurringSessionForm.daysOfWeek.includes(day)}
                onClick={() => onDayToggle(day)}
              >
                {getDayName(day).substring(0, 3)}
              </DayCheckbox>
            ))}
          </DayCheckboxes>
          
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
            Time Slots
          </Typography>
          
          <TimeSlotContainer>
            {recurringSessionForm.times.map((time, index) => (
              <TimeSlot key={index}>
                <StyledTextField
                  type="time"
                  value={time}
                  onChange={(e) => onTimeChange(index, e.target.value)}
                  variant="outlined"
                  sx={{ width: '150px' }}
                  InputLabelProps={{ shrink: true }}
                />
                
                <IconButton 
                  onClick={() => onTimeRemove(index)}
                  sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                  disabled={recurringSessionForm.times.length <= 1}
                >
                  <Cancel />
                </IconButton>
              </TimeSlot>
            ))}
            
            <Button
              variant="outlined"
              onClick={onTimeAdd}
              sx={{ 
                mt: 1, 
                color: '#00ffff',
                borderColor: 'rgba(0, 255, 255, 0.5)',
                '&:hover': {
                  borderColor: '#00ffff',
                  background: 'rgba(0, 255, 255, 0.1)'
                }
              }}
              startIcon={<Add />}
            >
              Add Time Slot
            </Button>
          </TimeSlotContainer>
          
          <StyledFormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="recurring-trainer-select-label">Assign Trainer (Optional)</InputLabel>
            <Select
              labelId="recurring-trainer-select-label"
              value={recurringSessionForm.trainerId}
              onChange={(e) => onRecurringFormChange('trainerId', e.target.value)}
              label="Assign Trainer (Optional)"
            >
              <MenuItem value="">
                <em>None (Available to All)</em>
              </MenuItem>
              {trainers.map((trainer) => (
                <MenuItem key={trainer.id} value={trainer.id}>
                  {`${trainer.firstName} ${trainer.lastName}`}
                </MenuItem>
              ))}
            </Select>
          </StyledFormControl>
          
          <StyledTextField
            label="Location"
            value={recurringSessionForm.location}
            onChange={(e) => onRecurringFormChange('location', e.target.value)}
            fullWidth
            variant="outlined"
            sx={{ mt: 2 }}
          />
          
          <StyledFormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="recurring-duration-select-label">Duration</InputLabel>
            <Select
              labelId="recurring-duration-select-label"
              value={recurringSessionForm.duration}
              onChange={(e) => onRecurringFormChange('duration', e.target.value)}
              label="Duration"
            >
              <MenuItem value={30}>30 minutes</MenuItem>
              <MenuItem value={60}>60 minutes</MenuItem>
              <MenuItem value={90}>90 minutes</MenuItem>
              <MenuItem value={120}>2 hours</MenuItem>
            </Select>
          </StyledFormControl>
        </StyledDialogContent>
        
        <StyledDialogActions>
          <StyledModalButton 
            onClick={closeRecurringModal}
            disabled={operationInProgress}
          >
            Cancel
          </StyledModalButton>
          <StyledModalButton 
            color="primary"
            onClick={createRecurringSessions}
            disabled={operationInProgress}
            startIcon={operationInProgress ? <CircularProgress size={20} /> : <Event />}
          >
            Create Recurring Sessions
          </StyledModalButton>
        </StyledDialogActions>
      </Dialog>
      
      {/* Assign Trainer Modal */}
      <Dialog 
        open={showAssignModal} 
        onClose={closeAssignModal}
        PaperProps={{
          style: {
            background: 'rgba(30, 30, 60, 0.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            width: '100%',
            maxWidth: '500px'
          }
        }}
      >
        <StyledDialogTitle>
          Assign Trainer
          <IconButton
            aria-label="close"
            onClick={closeAssignModal}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'white',
            }}
          >
            <Close />
          </IconButton>
        </StyledDialogTitle>
        
        <StyledDialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Assigning trainer for session on: <strong>{selectedEvent ? formatDateTime(selectedEvent.start) : 'N/A'}</strong>
          </Typography>
          
          <StyledFormControl fullWidth>
            <InputLabel id="assign-trainer-select-label">Select Trainer</InputLabel>
            <Select
              labelId="assign-trainer-select-label"
              value={assignForm.trainerId}
              onChange={(e) => onAssignFormChange(e.target.value)}
              label="Select Trainer"
              required
            >
              <MenuItem value="" disabled>
                <em>Choose a Trainer</em>
              </MenuItem>
              {trainers.map((trainer) => (
                <MenuItem key={trainer.id} value={trainer.id}>
                  {`${trainer.firstName} ${trainer.lastName}`}
                </MenuItem>
              ))}
            </Select>
          </StyledFormControl>
          
          <Typography variant="body2" sx={{ mt: 3, color: 'rgba(255, 255, 255, 0.7)' }}>
            The trainer will be notified via email about this assignment.
          </Typography>
        </StyledDialogContent>
        
        <StyledDialogActions>
          <StyledModalButton 
            onClick={closeAssignModal}
            disabled={operationInProgress}
          >
            Cancel
          </StyledModalButton>
          <StyledModalButton 
            color="primary"
            onClick={assignTrainer}
            disabled={operationInProgress || !assignForm.trainerId}
            startIcon={operationInProgress ? <CircularProgress size={20} /> : <Person />}
          >
            Assign Trainer
          </StyledModalButton>
        </StyledDialogActions>
      </Dialog>
      
      {/* Cancel Session Modal */}
      <Dialog 
        open={showCancelModal} 
        onClose={closeCancelModal}
        PaperProps={{
          style: {
            background: 'rgba(30, 30, 60, 0.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            width: '100%',
            maxWidth: '500px'
          }
        }}
      >
        <StyledDialogTitle>
          Cancel Session
          <IconButton
            aria-label="close"
            onClick={closeCancelModal}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'white',
            }}
          >
            <Close />
          </IconButton>
        </StyledDialogTitle>
        
        <StyledDialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to cancel the session on: <strong>{selectedEvent ? formatDateTime(selectedEvent.start) : 'N/A'}</strong>?
          </Typography>
          
          <StyledTextField
            label="Reason for Cancellation (Optional)"
            value={cancelForm.reason}
            onChange={(e) => onCancelFormChange(e.target.value)}
            fullWidth
            variant="outlined"
            multiline
            rows={3}
          />
          
          <Typography variant="body2" sx={{ mt: 3, mb: 1, color: 'rgba(255, 255, 255, 0.7)' }}>
            Cancellation Policy:
          </Typography>
          
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            • Cancellations made less than 24 hours before the session may be subject to charges.
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            • All affected parties will be notified about this cancellation.
          </Typography>
        </StyledDialogContent>
        
        <StyledDialogActions>
          <StyledModalButton 
            onClick={closeCancelModal}
            disabled={operationInProgress}
          >
            Back
          </StyledModalButton>
          <StyledModalButton 
            color="error"
            onClick={cancelSession}
            disabled={operationInProgress}
            startIcon={operationInProgress ? <CircularProgress size={20} /> : <Cancel />}
            sx={{ 
              background: 'rgba(211, 47, 47, 0.7) !important',
              '&:hover': {
                background: 'rgba(211, 47, 47, 0.9) !important'
              }
            }}
          >
            Cancel Session
          </StyledModalButton>
        </StyledDialogActions>
      </Dialog>
      
      {/* Session Details Modal */}
      <Dialog 
        open={showDetailsModal} 
        onClose={closeDetailsModal}
        PaperProps={{
          style: {
            background: 'rgba(30, 30, 60, 0.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            width: '100%',
            maxWidth: '500px'
          }
        }}
      >
        <StyledDialogTitle>
          Session Details
          <IconButton
            aria-label="close"
            onClick={closeDetailsModal}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'white',
            }}
          >
            <Close />
          </IconButton>
        </StyledDialogTitle>
        
        <StyledDialogContent>
          <Box sx={{ mb: 2 }}>
            <Chip 
              label={selectedEvent?.status?.toUpperCase() || 'UNKNOWN'} 
              sx={{ 
                backgroundColor: (() => {
                  switch(selectedEvent?.status) {
                    case 'available': return 'rgba(0, 255, 255, 0.2)';
                    case 'scheduled': 
                    case 'booked': return 'rgba(255, 152, 0, 0.2)';
                    case 'confirmed': return 'rgba(76, 175, 80, 0.2)';
                    case 'completed': return 'rgba(63, 81, 181, 0.2)';
                    case 'cancelled': return 'rgba(211, 47, 47, 0.2)';
                    default: return 'rgba(120, 120, 120, 0.2)';
                  }
                })(),
                color: (() => {
                  switch(selectedEvent?.status) {
                    case 'available': return '#00ffff';
                    case 'scheduled': 
                    case 'booked': return '#ff9800';
                    case 'confirmed': return '#4caf50';
                    case 'completed': return '#3f51b5';
                    case 'cancelled': return '#ff5252';
                    default: return 'white';
                  }
                })(),
                fontWeight: 'bold'
              }} 
            />
          </Box>
          
          <EventDetailsRow>
            <EventPropertyLabel>
              <CalendarToday fontSize="small" /> Date:
            </EventPropertyLabel>
            <EventPropertyValue>
              {selectedEvent ? formatDateTime(selectedEvent.start) : 'N/A'}
            </EventPropertyValue>
          </EventDetailsRow>
          
          <EventDetailsRow>
            <EventPropertyLabel>
              <AccessTime fontSize="small" /> Duration:
            </EventPropertyLabel>
            <EventPropertyValue>
              {selectedEvent?.duration ? `${selectedEvent.duration} minutes` : '60 minutes'}
            </EventPropertyValue>
          </EventDetailsRow>
          
          <EventDetailsRow>
            <EventPropertyLabel>
              <LocationOn fontSize="small" /> Location:
            </EventPropertyLabel>
            <EventPropertyValue>
              {selectedEvent?.location || 'Main Studio'}
            </EventPropertyValue>
          </EventDetailsRow>
          
          {selectedEvent?.client && (
            <EventDetailsRow>
              <EventPropertyLabel>
                <Person fontSize="small" /> Client:
              </EventPropertyLabel>
              <EventPropertyValue>
                {`${selectedEvent.client.firstName} ${selectedEvent.client.lastName}`}
              </EventPropertyValue>
            </EventDetailsRow>
          )}
          
          {selectedEvent?.trainer ? (
            <EventDetailsRow>
              <EventPropertyLabel>
                <Person fontSize="small" /> Trainer:
              </EventPropertyLabel>
              <EventPropertyValue>
                {`${selectedEvent.trainer.firstName} ${selectedEvent.trainer.lastName}`}
              </EventPropertyValue>
            </EventDetailsRow>
          ) : (
            isAdmin && selectedEvent?.status !== 'cancelled' && (
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="outlined"
                  onClick={showAssignModalFromDetails}
                  startIcon={<Person />}
                  sx={{ 
                    mt: 1, 
                    color: '#00ffff',
                    borderColor: 'rgba(0, 255, 255, 0.5)',
                    '&:hover': {
                      borderColor: '#00ffff',
                      background: 'rgba(0, 255, 255, 0.1)'
                    }
                  }}
                >
                  Assign Trainer
                </Button>
              </Box>
            )
          )}
          
          {selectedEvent?.notes && (
            <EventDetailsRow>
              <EventPropertyLabel>
                <Assignment fontSize="small" /> Notes:
              </EventPropertyLabel>
              <EventPropertyValue>
                {selectedEvent.notes}
              </EventPropertyValue>
            </EventDetailsRow>
          )}
          
          {/* Private notes for admin/trainer */}
          {(isAdmin || isTrainer) && selectedEvent?.privateNotes && (
            <EventDetailsRow>
              <EventPropertyLabel>
                <Info fontSize="small" /> Private Notes:
              </EventPropertyLabel>
              <EventPropertyValue>
                {selectedEvent.privateNotes}
              </EventPropertyValue>
            </EventDetailsRow>
          )}
        </StyledDialogContent>
        
        <StyledDialogActions>
          <StyledModalButton 
            onClick={closeDetailsModal}
            disabled={operationInProgress}
          >
            Close
          </StyledModalButton>
          
          {/* Workout Generator Button (for trainers/admin) */}
          {['scheduled', 'confirmed', 'completed'].includes(selectedEvent?.status) && 
           (isAdmin || (isTrainer && selectedEvent?.trainerId === user?.id)) && 
           selectedEvent?.client && (
            <WorkoutGeneratorButton 
              client={selectedEvent.client}
              sessionId={selectedEvent?.id}
              variant="desktop"
            />
          )}
          
          {/* Session Logger Button (for trainers/admin) */}
          {['scheduled', 'confirmed'].includes(selectedEvent?.status) && 
           (isAdmin || (isTrainer && selectedEvent?.trainerId === user?.id)) && (
            <SessionLogButton 
              sessionId={selectedEvent?.id}
              sessionData={selectedEvent}
              variant="desktop"
            />
          )}
          
          {/* Session actions based on status and user role */}
          {/* Cancel button for scheduled/confirmed sessions */}
          {['scheduled', 'confirmed', 'available'].includes(selectedEvent?.status) && 
           (isAdmin || isMyEvent) && (
            <StyledModalButton 
              color="error"
              onClick={showCancelModalFromDetails}
              disabled={operationInProgress}
              startIcon={<Cancel />}
              sx={{ 
                background: 'rgba(211, 47, 47, 0.7) !important',
                '&:hover': {
                  background: 'rgba(211, 47, 47, 0.9) !important'
                }
              }}
            >
              Cancel
            </StyledModalButton>
          )}
          
          {/* Confirm button for trainers/admins */}
          {['scheduled', 'requested'].includes(selectedEvent?.status) && 
           (isAdmin || (isTrainer && selectedEvent?.trainerId === user?.id)) && (
            <StyledModalButton 
              color="primary"
              onClick={confirmSession}
              disabled={operationInProgress}
              startIcon={operationInProgress ? <CircularProgress size={20} /> : <Check />}
            >
              Confirm
            </StyledModalButton>
          )}
          
          {/* Complete button for trainers/admins */}
          {['confirmed', 'scheduled'].includes(selectedEvent?.status) && 
           (isAdmin || (isTrainer && selectedEvent?.trainerId === user?.id)) && (
            <StyledModalButton 
              color="primary"
              onClick={completeSession}
              disabled={operationInProgress}
              startIcon={operationInProgress ? <CircularProgress size={20} /> : <Done />}
            >
              Complete
            </StyledModalButton>
          )}
        </StyledDialogActions>
      </Dialog>
      
      {/* Operation in progress snackbar */}
      <Snackbar 
        open={operationInProgress && !loading} 
        message="Operation in progress..."
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      {/* Mobile session logging button for trainers */}
      {isTrainer && (
        <SessionLogButton 
          sessionId={selectedEvent?.id}
          sessionData={selectedEvent}
          variant="mobile"
        />
      )}

      {/* Gamification reward popup */}
      {showReward && (
        <RewardPopup>
          <RewardIcon>
            {rewardData.icon}
          </RewardIcon>
          <RewardTitle>{rewardData.title}</RewardTitle>
          <Typography variant="body1" sx={{ color: 'white', mb: 1 }}>
            {rewardData.message}
          </Typography>
          {rewardData.points > 0 && (
            <Chip 
              label={`+${rewardData.points} points`}
              sx={{ 
                background: 'linear-gradient(90deg, #00ffff, #7851a9)',
                color: 'white',
                fontWeight: 'bold',
                mt: 1
              }} 
            />
          )}
        </RewardPopup>
      )}
    </CalendarContainer>
  );
};

export default CalendarView;
