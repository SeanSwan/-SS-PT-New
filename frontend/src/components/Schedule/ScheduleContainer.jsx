/**
 * ScheduleContainer.jsx
 * 
 * Business logic container component for the scheduling system that:
 * - Manages state, data fetching, and handles the application logic
 * - Connects to the backend services and processes API responses
 * - Handles all scheduling operations (create, book, assign, cancel, etc.)
 * - Passes processed data to the CalendarView for presentation
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View } from 'react-big-calendar';
import moment from 'moment';
import { useAnimation } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from 'notistack';

// Import CalendarView component for presentation
import CalendarView from './CalendarView';

// Import services
import scheduleService from '../../services/enhanced-schedule-service';
import gamificationService from '../../services/gamification/gamification-service';

// Define interface types
export const SessionEvent = {
  id: '',
  title: '',
  start: new Date(),
  end: new Date(),
  allDay: false,
  status: '',
  userId: null,
  trainerId: null,
  client: null,
  trainer: null,
  location: '',
  notes: '',
  duration: 60,
};

/**
 * ScheduleContainer Component
 * This component handles all business logic for the scheduling system
 */
const ScheduleContainer = () => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar ? useSnackbar() : { enqueueSnackbar: (msg, opts) => console.log(msg) };
  
  // States
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOperationLoading, setIsOperationLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState('week');
  const [date, setDate] = useState(new Date());
  
  // Stats
  const [stats, setStats] = useState({
    totalSessions: 0,
    bookedSessions: 0,
    availableSessions: 0,
    completedSessions: 0,
    userBookedSessions: 0
  });
  
  // Gamification data
  const [gamificationData, setGamificationData] = useState({
    points: 0,
    level: 1,
    streakDays: 0,
    achievements: [],
    recentRewards: null
  });
  
  // User options for modals
  const [trainers, setTrainers] = useState([]);
  const [clients, setClients] = useState([]);
  
  // Modal states for different actions
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  // Form states for modals
  const [newSessionForm, setNewSessionForm] = useState({
    trainerId: '',
    location: 'Main Studio',
    duration: 60,
    notes: ''
  });
  
  const [recurringSessionForm, setRecurringSessionForm] = useState({
    startDate: moment().format('YYYY-MM-DD'),
    endDate: moment().add(2, 'weeks').format('YYYY-MM-DD'),
    daysOfWeek: [1, 3, 5],  // Mon, Wed, Fri
    times: ['09:00', '14:00', '17:00'],
    trainerId: '',
    location: 'Main Studio',
    duration: 60
  });
  
  const [assignForm, setAssignForm] = useState({
    trainerId: ''
  });
  
  const [cancelForm, setCancelForm] = useState({
    reason: ''
  });
  
  // Animation controls
  const controls = useAnimation();
  
  // Polling interval reference for cleanup
  const pollingIntervalRef = useRef(null);
  
  // Loading timeout reference for debounced loading
  const loadingTimeoutRef = useRef(null);

  // Initialize data fetching and polling mechanism
  useEffect(() => {
    if (user) {
      // Initial data fetch
      fetchSessions();
      
      // Set up polling for updates every 30 seconds
      pollingIntervalRef.current = setInterval(() => {
        fetchSessions(true); // true = background refresh (no loading indicator)
      }, 30000);
      
      // Fetch trainers and clients if admin
      if (user.role === 'admin') {
        Promise.all([
          fetchTrainers(),
          fetchClients()
        ]).catch(err => {
          console.error('Error fetching users:', err);
          setError('Error loading user data. Some features may be limited.');
        });
      }
      
      // Fetch trainers if trainer
      if (user.role === 'trainer') {
        fetchTrainers().catch(err => {
          console.error('Error fetching trainers:', err);
        });
      }
      
      // Fetch gamification data if client
      if (user.role === 'client' || user.role === 'user') {
        fetchGamificationData().catch(err => {
          console.error('Error fetching gamification data:', err);
          // Don't display error to user - non-critical functionality
        });
      }
      
      // Fetch schedule stats
      fetchStats();
      
      // Cleanup interval on unmount
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        
        // Clear any pending loading timeouts
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
      };
    } else {
      setLoading(false);
    }
  }, [user]);
  
  /**
   * Fetch all sessions from the API
   * @param {boolean} isBackground - If true, don't show loading indicator (for background refreshes)
   */
  const fetchSessions = async (isBackground = false) => {
    // Clear any existing loading timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    
    // Use debounced loading state to prevent UI flicker for quick operations
    if (!isBackground) {
      // Set loading after a short delay, which will be canceled if the operation completes quickly
      loadingTimeoutRef.current = setTimeout(() => setLoading(true), 400);
    }
    
    try {
      // Use different approaches based on user role through our enhanced schedule service
      let sessions = [];
      
      try {
        sessions = await scheduleService.getSessions();
        
        // Validate sessions data
        if (!Array.isArray(sessions)) {
          console.error('Invalid sessions data:', sessions);
          throw new Error('Invalid data format received from server');
        }
        
        setEvents(sessions);
        
        // Refresh stats after fetching sessions
        fetchStats();
        
        setError('');
      } catch (fetchErr) {
        console.error('Error in fetch operation:', fetchErr);
        throw fetchErr; // Re-throw to be caught by the outer try-catch
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
      
      if (err.response && err.response.status === 401) {
        setError('Unauthorized. Please ensure you are logged in.');
      } else if (err.response && err.response.status === 403) {
        setError('You don\'t have permission to access this data.');
      } else if (err.message === 'Network Error') {
        setError('Network error. Please check your internet connection.');
      } else {
        setError(`Could not fetch sessions. ${err.response?.data?.message || 'Please try again later.'}`);
      }
    } finally {
      // Clear loading timeout if it exists
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      setLoading(false);
    }
  };

  /**
   * Fetch schedule statistics
   */
  const fetchStats = async () => {
    try {
      const response = await scheduleService.getScheduleStats();
      if (response && response.stats) {
        setStats(response.stats);
      }
    } catch (err) {
      console.error('Error fetching schedule stats:', err);
      // Don't set error state here to avoid overriding more important errors
    }
  };
  
  /**
   * Fetch gamification data for the current user
   */
  const fetchGamificationData = async () => {
    if (!user || user.role !== 'client') {
      return; // Only fetch for clients
    }
    
    try {
      // Get user's gamification data
      const gamificationInfo = await gamificationService.getUserGamificationData();
      
      // Get streak information
      const streakInfo = await gamificationService.getStreakInfo();
      
      // Get achievements
      const achievements = await gamificationService.getAchievements();
      
      // Get level information
      const levelInfo = await gamificationService.getLevelInfo();
      
      // Update gamification state
      setGamificationData({
        points: gamificationInfo.points || 0,
        level: levelInfo.level || 1,
        streakDays: streakInfo.currentStreak || 0,
        achievements: achievements || [],
        nextLevelPoints: levelInfo.nextLevelPoints,
        recentRewards: gamificationData.recentRewards // Preserve recent rewards
      });
    } catch (err) {
      console.error('Error fetching gamification data:', err);
      // Don't set error state here to avoid interrupting main flow
    }
  };

  /**
   * Fetch trainers for dropdown selection
   */
  const fetchTrainers = async () => {
    try {
      const trainersData = await scheduleService.getTrainers();
      setTrainers(trainersData);
      return trainersData;
    } catch (err) {
      console.error('Error fetching trainers:', err);
      throw err;
    }
  };

  /**
   * Fetch clients for dropdown selection (admin only)
   */
  const fetchClients = async () => {
    try {
      const clientsData = await scheduleService.getClients();
      setClients(clientsData);
      return clientsData;
    } catch (err) {
      console.error('Error fetching clients:', err);
      throw err;
    }
  };

  /**
   * Handle event selection - different behavior based on user role and event status
   */
  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    
    if (user?.role === 'admin') {
      // Admins can view details, assign trainers, or cancel sessions
      setShowDetailsModal(true);
    } else if (user?.role === 'trainer' && event.trainerId === user.id) {
      // Trainers can view details of their assigned sessions
      setShowDetailsModal(true);
    } else if (user?.role === 'client' || user?.role === 'user') {
      if (event.status === 'available') {
        // Users can book available sessions
        setShowBookingModal(true);
      } else if (event.userId === user?.id) {
        // Users can view details or cancel their own bookings
        setShowDetailsModal(true);
      } else {
        // Show appropriate message for booked sessions
        setError('This session is already booked by someone else.');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  /**
   * Handle slot selection - different behavior based on user role
   */
  const handleSelectSlot = (slotInfo) => {
    if (user?.role === 'admin') {
      setSelectedSlot(slotInfo);
      setShowCreateModal(true);
    } else if (user?.role === 'trainer') {
      setError('Only administrators can create new session slots.');
      setTimeout(() => setError(''), 3000);
    } else if (user?.role === 'client' || user?.role === 'user') {
      setError('Only administrators can create new session slots.');
      setTimeout(() => setError(''), 3000);
    }
  };

  /**
  * Book a session for the current user
  */
  const bookSession = async () => {
  if (!selectedEvent || !user) {
  setError('Unable to book: Missing session or user information');
  return;
  }
  
  // Validate session is still available before booking
  if (selectedEvent.status !== 'available') {
  setError('This session is no longer available. Please refresh and try again.');
  setTimeout(() => setError(''), 4000);
  return;
  }
  
  setIsOperationLoading(true);
  try {
  const result = await scheduleService.bookSession(selectedEvent.id);
  
  // Check for gamification rewards
  if (result.gamification && result.gamification.success) {
    // Update gamification data
    setGamificationData(prevData => ({
      ...prevData,
      recentRewards: result.gamification,
    points: (result.gamification.newTotal || prevData.points)
  }));
    
      // Show gamification reward notification
    if (result.gamification.pointsAwarded) {
      enqueueSnackbar(`+${result.gamification.pointsAwarded} points for booking session!`, { 
        variant: 'success',
      autoHideDuration: 5000
      });
  }
    
  // Show achievement notifications if any
    if (result.gamification.achievements && result.gamification.achievements.length > 0) {
    result.gamification.achievements.forEach(achievement => {
        enqueueSnackbar(`Achievement Unlocked: ${achievement.title}`, { 
          variant: 'success',
            autoHideDuration: 5000
        });
        });
        }
      }
      
      setShowBookingModal(false);
      setSelectedEvent(null);
      await fetchSessions();
      
      // Show success message
      enqueueSnackbar('Session booked successfully!', { 
        variant: 'success',
        autoHideDuration: 3000
      });
      
      // Fetch updated gamification data in the background
      fetchGamificationData();
    } catch (err) {
      console.error('Error booking session:', err);
      
      if (err.response?.status === 409) {
        setError('This session has already been booked by someone else.');
      } else if (err.response?.status === 403) {
        setError('You don\'t have permission to book this session.');
      } else if (err.message === 'Network Error') {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(`Failed to book session: ${err.response?.data?.message || 'Please try again.'}`);
      }
      setTimeout(() => setError(''), 4000);
    } finally {
      setIsOperationLoading(false);
    }
  };

  /**
   * Create a new session slot (admin only)
   */
  const createSession = async () => {
    if (!selectedSlot || !user) {
      setError('Missing session data or user information');
      return;
    }
    
    if (user.role !== 'admin') {
      setError('You don\'t have permission to create sessions');
      return;
    }
    
    // Validate form inputs
    if (!newSessionForm.location.trim()) {
      setError('Please provide a location for the session');
      return;
    }
    
    if (newSessionForm.duration < 15 || newSessionForm.duration > 240) {
      setError('Session duration must be between 15 and 240 minutes');
      return;
    }
    
    // Ensure start time is in the future
    if (moment(selectedSlot.start).isBefore(moment())) {
      setError('Cannot create sessions in the past');
      return;
    }
    
    setIsOperationLoading(true);
    try {
      const sessions = [
        {
          start: selectedSlot.start.toISOString(),
          end: moment(selectedSlot.start).add(newSessionForm.duration, 'minutes').toISOString(),
          trainerId: newSessionForm.trainerId || undefined,
          location: newSessionForm.location.trim(),
          notes: newSessionForm.notes.trim() || undefined,
          duration: newSessionForm.duration
        }
      ];
      
      await scheduleService.createAvailableSessions({ sessions });
      
      setShowCreateModal(false);
      setSelectedSlot(null);
      // Reset form
      setNewSessionForm({
        trainerId: '',
        location: 'Main Studio',
        duration: 60,
        notes: ''
      });
      
      // Show success message
      enqueueSnackbar('Session created successfully!', {
        variant: 'success',
        autoHideDuration: 3000
      });
      
      // Refresh sessions
      await fetchSessions();
    } catch (err) {
      console.error('Error creating session:', err);
      
      if (err.response?.status === 403) {
        setError('You don\'t have permission to create sessions');
      } else if (err.response?.status === 409) {
        setError('A session already exists at this time');
      } else if (err.message === 'Network Error') {
        setError('Network error. Please check your connection and try again');
      } else {
        setError(`Failed to create session: ${err.response?.data?.message || 'Please try again'}`); 
      }
      setTimeout(() => setError(''), 4000);
    } finally {
      setIsOperationLoading(false);
    }
  };

  /**
   * Create recurring sessions (admin only)
   */
  const createRecurringSessions = async () => {
    if (!user) {
      setError('User information not available');
      return;
    }
    
    if (user.role !== 'admin') {
      setError('You don\'t have permission to create recurring sessions');
      return;
    }
    
    // Validate form inputs
    if (!recurringSessionForm.location.trim()) {
      setError('Please provide a location for the sessions');
      return;
    }
    
    if (recurringSessionForm.duration < 15 || recurringSessionForm.duration > 240) {
      setError('Session duration must be between 15 and 240 minutes');
      return;
    }
    
    if (recurringSessionForm.daysOfWeek.length === 0) {
      setError('Please select at least one day of the week');
      return;
    }
    
    if (recurringSessionForm.times.length === 0) {
      setError('Please add at least one time slot');
      return;
    }
    
    const startDate = moment(recurringSessionForm.startDate);
    const endDate = moment(recurringSessionForm.endDate);
    
    if (!startDate.isValid() || !endDate.isValid()) {
      setError('Please provide valid start and end dates');
      return;
    }
    
    if (startDate.isAfter(endDate)) {
      setError('Start date must be before end date');
      return;
    }
    
    if (startDate.isBefore(moment().startOf('day'))) {
      setError('Start date cannot be in the past');
      return;
    }
    
    // Limit recurring sessions to prevent accidental creation of too many
    const daysDiff = endDate.diff(startDate, 'days') + 1;
    const maxSessions = daysDiff * recurringSessionForm.daysOfWeek.length * recurringSessionForm.times.length;
    
    if (maxSessions > 100) {
      setError(`This would create ${maxSessions} sessions, which exceeds the maximum of 100. Please select a shorter date range.`);
      return;
    }
    
    setIsOperationLoading(true);
    try {
      await scheduleService.createRecurringSessions(recurringSessionForm);
      
      setShowRecurringModal(false);
      // Reset form to defaults
      setRecurringSessionForm({
        startDate: moment().format('YYYY-MM-DD'),
        endDate: moment().add(2, 'weeks').format('YYYY-MM-DD'),
        daysOfWeek: [1, 3, 5],
        times: ['09:00', '14:00', '17:00'],
        trainerId: '',
        location: 'Main Studio',
        duration: 60
      });
      
      // Show success message
      enqueueSnackbar('Recurring sessions created successfully!', {
        variant: 'success',
        autoHideDuration: 3000
      });
      
      // Refresh sessions
      await fetchSessions();
    } catch (err) {
      console.error('Error creating recurring sessions:', err);
      
      if (err.response?.status === 403) {
        setError('You don\'t have permission to create recurring sessions');
      } else if (err.response?.status === 409) {
        setError('Some sessions could not be created due to conflicts');
      } else if (err.message === 'Network Error') {
        setError('Network error. Please check your connection and try again');
      } else {
        setError(`Failed to create recurring sessions: ${err.response?.data?.message || 'Please try again'}`); 
      }
      setTimeout(() => setError(''), 4000);
    } finally {
      setIsOperationLoading(false);
    }
  };

  /**
   * Assign a trainer to a session (admin only)
   */
  const assignTrainer = async () => {
    if (!selectedEvent || !user) {
      setError('Missing session or user information');
      return;
    }
    
    if (user.role !== 'admin') {
      setError('You don\'t have permission to assign trainers');
      return;
    }
    
    if (!assignForm.trainerId) {
      setError('Please select a trainer to assign');
      return;
    }
    
    setIsOperationLoading(true);
    try {
      await scheduleService.assignTrainer(selectedEvent.id, assignForm.trainerId);
      
      setShowAssignModal(false);
      setSelectedEvent(null);
      setAssignForm({ trainerId: '' });
      
      // Show success message
      enqueueSnackbar('Trainer assigned successfully!', {
        variant: 'success',
        autoHideDuration: 3000
      });
      
      await fetchSessions();
    } catch (err) {
      console.error('Error assigning trainer:', err);
      
      if (err.response?.status === 403) {
        setError('You don\'t have permission to assign trainers');
      } else if (err.response?.status === 404) {
        setError('Session or trainer not found');
      } else if (err.response?.status === 409) {
        setError('Trainer is not available during this time slot');
      } else {
        setError(`Failed to assign trainer: ${err.response?.data?.message || 'Please try again'}`); 
      }
      setTimeout(() => setError(''), 4000);
    } finally {
      setIsOperationLoading(false);
    }
  };

  /**
   * Cancel a session (admins can cancel any, users only their own)
   */
  const cancelSessionHandler = async () => {
    if (!selectedEvent || !user) {
      setError('Missing session or user information');
      return;
    }
    
    // Check permissions - only admin or session owner can cancel
    if (user.role !== 'admin' && selectedEvent.userId !== user.id) {
      setError('You don\'t have permission to cancel this session');
      return;
    }
    
    // Validate session can be cancelled
    if (!['available', 'booked', 'scheduled', 'confirmed'].includes(selectedEvent.status)) {
      setError(`Cannot cancel a session with status: ${selectedEvent.status}`);
      return;
    }
    
    setIsOperationLoading(true);
    try {
      await scheduleService.cancelSession(selectedEvent.id, cancelForm.reason);
      
      setShowCancelModal(false);
      setSelectedEvent(null);
      setCancelForm({ reason: '' });
      
      // Show success message
      enqueueSnackbar('Session cancelled successfully', {
        variant: 'success',
        autoHideDuration: 3000
      });
      
      await fetchSessions();
    } catch (err) {
      console.error('Error cancelling session:', err);
      
      if (err.response?.status === 403) {
        setError('You don\'t have permission to cancel this session');
      } else if (err.response?.status === 404) {
        setError('Session not found');
      } else if (err.response?.status === 409) {
        setError('Cannot cancel session in its current state');
      } else {
        setError(`Failed to cancel session: ${err.response?.data?.message || 'Please try again'}`); 
      }
      setTimeout(() => setError(''), 4000);
    } finally {
      setIsOperationLoading(false);
    }
  };
  
  /**
   * Mark a session as completed (admin/trainer only)
   */
  const completeSession = async () => {
    if (!selectedEvent || !user) {
      setError('Missing session or user information');
      return;
    }
    
    if (user.role !== 'admin' && user.role !== 'trainer') {
      setError('You don\'t have permission to mark sessions as completed');
      return;
    }
    
    // For trainers, verify they are assigned to this session
    if (user.role === 'trainer' && selectedEvent.trainerId !== user.id) {
      setError('You can only mark your own sessions as completed');
      return;
    }
    
    // Validate session can be marked as completed
    if (!['confirmed', 'scheduled'].includes(selectedEvent.status)) {
      setError(`Cannot complete a session with status: ${selectedEvent.status}`);
      return;
    }
    
    setIsOperationLoading(true);
    try {
      const result = await scheduleService.completeSession(selectedEvent.id);
      
      setShowDetailsModal(false);
      setSelectedEvent(null);
      
      // Show success message
      enqueueSnackbar('Session marked as completed', {
        variant: 'success',
        autoHideDuration: 3000
      });
      
      // Handle gamification rewards if applicable
      if (result.gamification && result.gamification.success) {
        // Show point rewards
        if (result.gamification.pointsAwarded) {
          enqueueSnackbar(`Client earned +${result.gamification.pointsAwarded} points for completing this session!`, {
            variant: 'success',
            autoHideDuration: 5000
          });
        }
        
        // Show streak information if available
        if (result.streakInfo && result.streakInfo.currentStreak > 0) {
          enqueueSnackbar(`Client is on a ${result.streakInfo.currentStreak}-day streak!`, {
            variant: 'success',
            autoHideDuration: 5000
          });
        }
        
        // Show achievement notifications if any
        if (result.gamification.achievements && result.gamification.achievements.length > 0) {
          result.gamification.achievements.forEach(achievement => {
            enqueueSnackbar(`Client Achievement: ${achievement.title}`, {
              variant: 'success',
              autoHideDuration: 5000
            });
          });
        }
      }
      
      await fetchSessions();
    } catch (err) {
      console.error('Error completing session:', err);
      
      if (err.response?.status === 403) {
        setError('You don\'t have permission to mark this session as completed');
      } else if (err.response?.status === 404) {
        setError('Session not found');
      } else if (err.response?.status === 409) {
        setError('Cannot complete session in its current state');
      } else {
        setError(`Failed to mark session as completed: ${err.response?.data?.message || 'Please try again'}`); 
      }
      setTimeout(() => setError(''), 4000);
    } finally {
      setIsOperationLoading(false);
    }
  };
  
  /**
   * Confirm a session (admin/trainer only)
   */
  const confirmSession = async () => {
    if (!selectedEvent || !user) {
      setError('Missing session or user information');
      return;
    }
    
    if (user.role !== 'admin' && user.role !== 'trainer') {
      setError('You don\'t have permission to confirm sessions');
      return;
    }
    
    // For trainers, verify they are assigned to this session
    if (user.role === 'trainer' && selectedEvent.trainerId !== user.id) {
      setError('You can only confirm your own sessions');
      return;
    }
    
    // Validate session can be confirmed
    if (!['scheduled', 'requested'].includes(selectedEvent.status)) {
      setError(`Cannot confirm a session with status: ${selectedEvent.status}`);
      return;
    }
    
    setIsOperationLoading(true);
    try {
      const result = await scheduleService.confirmSession(selectedEvent.id);
      
      setShowDetailsModal(false);
      setSelectedEvent(null);
      
      // Show success message
      enqueueSnackbar('Session confirmed successfully', {
        variant: 'success',
        autoHideDuration: 3000
      });
      
      // Handle gamification rewards if applicable
      if (result.gamification && result.gamification.success) {
        // Show point rewards
        if (result.gamification.pointsAwarded) {
          enqueueSnackbar(`Client earned +${result.gamification.pointsAwarded} points for attending this session!`, {
            variant: 'success',
            autoHideDuration: 5000
          });
        }
      }
      
      await fetchSessions();
    } catch (err) {
      console.error('Error confirming session:', err);
      
      if (err.response?.status === 403) {
        setError('You don\'t have permission to confirm this session');
      } else if (err.response?.status === 404) {
        setError('Session not found');
      } else if (err.response?.status === 409) {
        setError('Cannot confirm session in its current state');
      } else {
        setError(`Failed to confirm session: ${err.response?.data?.message || 'Please try again'}`); 
      }
      setTimeout(() => setError(''), 4000);
    } finally {
      setIsOperationLoading(false);
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
  const eventPropGetter = (event) => {
    let className = event.status || '';
    
    if (event.status === 'scheduled' || event.status === 'booked' || event.status === 'confirmed') {
      if (event.userId === user?.id) {
        className += ' user-booked';
      }
    }
    
    return { className };
  };
  
  // Handle day toggle for recurring sessions
  const handleDayToggle = (day) => {
    const currentDays = [...recurringSessionForm.daysOfWeek];
    const index = currentDays.indexOf(day);
    
    if (index > -1) {
      currentDays.splice(index, 1);
    } else {
      currentDays.push(day);
    }
    
    setRecurringSessionForm({
      ...recurringSessionForm,
      daysOfWeek: currentDays
    });
  };
  
  // Handle time add for recurring sessions
  const handleTimeAdd = () => {
    setRecurringSessionForm({
      ...recurringSessionForm,
      times: [...recurringSessionForm.times, '12:00']
    });
  };
  
  // Handle time change for recurring sessions
  const handleTimeChange = (index, value) => {
    const newTimes = [...recurringSessionForm.times];
    newTimes[index] = value;
    
    setRecurringSessionForm({
      ...recurringSessionForm,
      times: newTimes
    });
  };
  
  // Handle time remove for recurring sessions
  const handleTimeRemove = (index) => {
    const newTimes = [...recurringSessionForm.times];
    newTimes.splice(index, 1);
    
    setRecurringSessionForm({
      ...recurringSessionForm,
      times: newTimes
    });
  };

  // Update session form handlers
  const handleNewSessionChange = (field, value) => {
    setNewSessionForm({
      ...newSessionForm,
      [field]: value
    });
  };

  // Modal actions
  const closeBookingModal = () => {
    setShowBookingModal(false);
    setSelectedEvent(null);
  };
  
  const closeCreateModal = () => {
    setShowCreateModal(false);
    setSelectedSlot(null);
    setNewSessionForm({
      trainerId: '',
      location: 'Main Studio',
      duration: 60,
      notes: ''
    });
  };
  
  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedEvent(null);
  };
  
  const closeAssignModal = () => {
    setShowAssignModal(false);
    setSelectedEvent(null);
    setAssignForm({ trainerId: '' });
  };
  
  const closeCancelModal = () => {
    setShowCancelModal(false);
    setSelectedEvent(null);
    setCancelForm({ reason: '' });
  };
  
  const closeRecurringModal = () => {
    setShowRecurringModal(false);
    setRecurringSessionForm({
      startDate: moment().format('YYYY-MM-DD'),
      endDate: moment().add(2, 'weeks').format('YYYY-MM-DD'),
      daysOfWeek: [1, 3, 5],
      times: ['09:00', '14:00', '17:00'],
      trainerId: '',
      location: 'Main Studio',
      duration: 60
    });
  };
  
  const openRecurringModal = () => {
    setShowRecurringModal(true);
  };
  
  const openCreateModal = () => {
    // Create default slot for current day and time
    const now = new Date();
    const startTime = new Date(now);
    startTime.setHours(now.getHours() + 1, 0, 0, 0); // Round to next hour
    
    setSelectedSlot({
      start: startTime,
      end: new Date(startTime.getTime() + 60 * 60 * 1000) // +1 hour
    });
    
    setShowCreateModal(true);
  };
  
  const showCancelModalFromDetails = () => {
    setShowDetailsModal(false);
    setShowCancelModal(true);
  };
  
  const showAssignModalFromDetails = () => {
    setShowDetailsModal(false);
    setShowAssignModal(true);
  };

  // Pass all necessary props to the CalendarView component
  return (
    <CalendarView
      // Current state
      user={user}
      events={events}
      loading={loading || isOperationLoading} // Show loading for any operation
      operationInProgress={isOperationLoading} // Flag specifically for operations in progress
      error={error}
      view={view}
      date={date}
      stats={stats}
      selectedEvent={selectedEvent}
      selectedSlot={selectedSlot}
      gamificationData={gamificationData}
      
      // Modal states
      showBookingModal={showBookingModal}
      showCreateModal={showCreateModal}
      showCancelModal={showCancelModal}
      showRecurringModal={showRecurringModal}
      showAssignModal={showAssignModal}
      showDetailsModal={showDetailsModal}
      
      // Form states
      newSessionForm={newSessionForm}
      recurringSessionForm={recurringSessionForm}
      assignForm={assignForm}
      cancelForm={cancelForm}
      trainers={trainers}
      clients={clients}
      
      // Animation controls
      controls={controls}
      
      // Event handlers
      onSelectEvent={handleSelectEvent}
      onSelectSlot={handleSelectSlot}
      onViewChange={setView}
      onDateChange={setDate}
      goToToday={goToToday}
      fetchSessions={fetchSessions}
      eventPropGetter={eventPropGetter}
      
      // Modal actions
      closeBookingModal={closeBookingModal}
      closeCreateModal={closeCreateModal}
      closeDetailsModal={closeDetailsModal}
      closeAssignModal={closeAssignModal}
      closeCancelModal={closeCancelModal}
      closeRecurringModal={closeRecurringModal}
      openRecurringModal={openRecurringModal}
      openCreateModal={openCreateModal}
      
      // Session action handlers
      bookSession={bookSession}
      createSession={createSession}
      createRecurringSessions={createRecurringSessions}
      assignTrainer={assignTrainer}
      cancelSession={cancelSessionHandler}
      completeSession={completeSession}
      confirmSession={confirmSession}
      showCancelModalFromDetails={showCancelModalFromDetails}
      showAssignModalFromDetails={showAssignModalFromDetails}
      
      // Form handlers
      onNewSessionChange={handleNewSessionChange}
      onAssignFormChange={(trainerId) => setAssignForm({ trainerId })}
      onCancelFormChange={(reason) => setCancelForm({ reason })}
      
      // Recurring session form handlers
      onRecurringFormChange={(field, value) => {
        setRecurringSessionForm({
          ...recurringSessionForm,
          [field]: value
        });
      }}
      onDayToggle={handleDayToggle}
      onTimeAdd={handleTimeAdd}
      onTimeChange={handleTimeChange}
      onTimeRemove={handleTimeRemove}
    />
  );
};

export default ScheduleContainer;
