/**
 * ScheduleContainer.tsx
 * 
 * Main container component for the scheduling system that:
 * - Manages all state, data fetching, and business logic
 * - Passes data and handlers to the CalendarView component
 * - Handles role-based permissions and socket connections
 * - Manages all modals and forms
 */

import React, { useEffect, useState, useRef, useMemo } from "react";
import { SlotInfo, View } from "react-big-calendar";
import moment from "moment";
// Socket.io is commented out as backend doesn't have socket.io configured yet
// import { io } from "socket.io-client";
import { useAnimation } from "framer-motion";
import { useAuth } from "../../context/AuthContext";

// Import CalendarView component
import CalendarView from "./CalendarView";

// Import services
import scheduleService from "../../services/schedule-service";

// Using global type declarations or casting as any if needed:
const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || "http://localhost:5000";

// Define interfaces - These can be moved to a separate types file for better organization
export interface SessionEvent {
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

export interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface ScheduleStats {
  totalSessions: number;
  bookedSessions: number;
  availableSessions: number;
  completedSessions: number;
  userBookedSessions: number;
}

const ScheduleContainer: React.FC = () => {
  const { user } = useAuth();
  
  // States
  const [events, setEvents] = useState<SessionEvent[]>([]);
  // Debounced loading state to prevent flickering for quick operations
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  // Add a separate API loading state for operations other than initial loading
  const [isOperationLoading, setIsOperationLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState<Date>(new Date());
  
  // Stats
  const [stats, setStats] = useState<ScheduleStats>({
    totalSessions: 0,
    bookedSessions: 0,
    availableSessions: 0,
    completedSessions: 0,
    userBookedSessions: 0
  });
  
  // User options for modals
  const [trainers, setTrainers] = useState<UserOption[]>([]);
  const [clients, setClients] = useState<UserOption[]>([]);
  
  // Modal states for different actions
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  const [selectedEvent, setSelectedEvent] = useState<SessionEvent | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  
  // Form states for modals
  const [newSessionForm, setNewSessionForm] = useState({
    trainerId: "",
    location: "Main Studio",
    duration: 60,
    notes: ""
  });
  
  const [recurringSessionForm, setRecurringSessionForm] = useState({
    startDate: moment().format("YYYY-MM-DD"),
    endDate: moment().add(2, "weeks").format("YYYY-MM-DD"),
    daysOfWeek: [1, 3, 5],  // Mon, Wed, Fri
    times: ["09:00", "14:00", "17:00"],
    trainerId: "",
    location: "Main Studio",
    duration: 60
  });
  
  const [assignForm, setAssignForm] = useState({
    trainerId: ""
  });
  
  const [cancelForm, setCancelForm] = useState({
    reason: ""
  });
  
  // Animation controls
  const controls = useAnimation();
  
  // Socket for real-time updates (currently disabled as backend socket.io is not configured)
  // Will be replaced with polling mechanism
  const socketRef = useRef<any>(null);

  // Processed events for calendar
  const calendarEvents = useMemo(() => {
    if (!events.length) return [];
    return scheduleService.formatEventsForCalendar(events);
  }, [events]);
  
  // Connect to socket and load initial data
  useEffect(() => {
    if (user) {
      // Initialize socket connection with error handling
      try {
        // Disable socket connection for now since the backend doesn't support it yet
        // Instead of trying to connect to a non-existent socket endpoint,
        // we'll just fetch the data directly and handle updates with polling
        
        // Initial data fetch
        fetchSessions();
        
        // Set up polling for updates every 30 seconds as a fallback for real-time socket updates
        const pollingInterval = setInterval(() => {
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
        
        // Cleanup interval on unmount
        return () => {
          clearInterval(pollingInterval);
          // Clear any pending loading timeouts
          if (loadingTimeout) {
            clearTimeout(loadingTimeout);
          }
        };
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Could not establish connection. Using offline mode.');
        
        // Still fetch data even if socket fails
        fetchSessions();
        if (user.role === 'admin') {
          fetchTrainers().catch(console.error);
          fetchClients().catch(console.error);
        }
      }
    } else {
      setLoading(false);
    }
  }, [user]);
  
  /**
   * Fetch all sessions from the API and categorize them
   * @param {boolean} isBackground - If true, don't show loading indicator (for background refreshes)
   */
  const fetchSessions = async (isBackground = false) => {
    // Clear any existing loading timeout
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
      setLoadingTimeout(null);
    }
    
    // Use debounced loading state to prevent UI flicker for quick operations
    if (!isBackground) {
      // Set loading after a short delay, which will be canceled if the operation completes quickly
      const timeout = setTimeout(() => setLoading(true), 400);
      setLoadingTimeout(timeout);
    }
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication required. Please log in again.");
        if (loadingTimeout) {
          clearTimeout(loadingTimeout);
          setLoadingTimeout(null);
        }
        setLoading(false);
        return;
      }
      
      // Different approaches based on user role
      let sessions = [];
      
      if (!user) {
        throw new Error("User information not available");
      }
      
      try {
        if (user.role === 'admin') {
          // Admins see all sessions
          sessions = await scheduleService.getSessions();
        } else if (user.role === 'trainer') {
          // Trainers see their assigned sessions
          sessions = await scheduleService.getSessions({ trainerId: user.id });
        } else {
          // Clients see their booked sessions and available sessions
          const [userSessions, availableSessions] = await Promise.all([
            scheduleService.getSessions({ userId: user.id }),
            scheduleService.getSessions({ status: 'available' })
          ]);
          
          // Filter out duplicates by ID
          const sessionMap = new Map();
          [...userSessions, ...availableSessions].forEach(session => {
            sessionMap.set(session.id, session);
          });
          
          sessions = Array.from(sessionMap.values());
        }
        
        // Validate sessions data
        if (!Array.isArray(sessions)) {
          console.error("Invalid sessions data:", sessions);
          throw new Error("Invalid data format received from server");
        }
        
        setEvents(sessions);
        
        // Calculate stats
        const totalSessions = sessions.length;
        const bookedSessions = sessions.filter((s: SessionEvent) => 
          ['booked', 'scheduled', 'confirmed'].includes(s.status)).length;
        const availableSessions = sessions.filter((s: SessionEvent) => s.status === 'available').length;
        const completedSessions = sessions.filter((s: SessionEvent) => s.status === 'completed').length;
        const userBookedSessions = sessions.filter((s: SessionEvent) => s.userId === user?.id).length;
        
        setStats({
          totalSessions,
          bookedSessions,
          availableSessions,
          completedSessions,
          userBookedSessions
        });
        
        setError("");
      } catch (fetchErr: any) {
        console.error("Error in fetch operation:", fetchErr);
        throw fetchErr; // Re-throw to be caught by the outer try-catch
      }
    } catch (err: any) {
      console.error("Error fetching sessions:", err);
      if (err.response && err.response.status === 401) {
        setError("Unauthorized. Please ensure you are logged in.");
      } else if (err.response && err.response.status === 403) {
        setError("You don't have permission to access this data.");
      } else if (err.message === "Network Error") {
        setError("Network error. Please check your internet connection.");
      } else {
        setError(`Could not fetch sessions. ${err.response?.data?.message || 'Please try again later.'}`);
      }
    } finally {
      // Clear loading timeout if it exists
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        setLoadingTimeout(null);
      }
      setLoading(false);
    }
  };

  /**
   * Fetch trainers for dropdown selection (admin only)
   */
  const fetchTrainers = async () => {
    try {
      const trainersData = await scheduleService.getTrainers();
      setTrainers(trainersData);
    } catch (err) {
      console.error("Error fetching trainers:", err);
    }
  };

  /**
   * Fetch clients for dropdown selection (admin only)
   */
  const fetchClients = async () => {
    try {
      const clientsData = await scheduleService.getClients();
      setClients(clientsData);
    } catch (err) {
      console.error("Error fetching clients:", err);
    }
  };

  /**
   * Handle event selection - different behavior based on user role and event status
   */
  const handleSelectEvent = (event: SessionEvent) => {
    setSelectedEvent(event);
    
    if (user?.role === "admin") {
      // Admins can view details, assign trainers, or cancel sessions
      setShowDetailsModal(true);
    } else if (user?.role === "trainer" && event.trainerId === user.id) {
      // Trainers can view details of their assigned sessions
      setShowDetailsModal(true);
    } else if (user?.role === "client" || user?.role === "user") {
      if (event.status === "available") {
        // Users can book available sessions
        setShowBookingModal(true);
      } else if (event.userId === user?.id) {
        // Users can view details or cancel their own bookings
        setShowDetailsModal(true);
      } else {
        // Show appropriate message for booked sessions
        setError("This session is already booked by someone else.");
        setTimeout(() => setError(""), 3000);
      }
    }
  };

  /**
   * Handle slot selection - different behavior based on user role
   */
  const handleSelectSlot = (slotInfo: SlotInfo) => {
    if (user?.role === "admin") {
      setSelectedSlot(slotInfo);
      setShowCreateModal(true);
    } else if (user?.role === "trainer") {
      setError("Only administrators can create new session slots.");
      setTimeout(() => setError(""), 3000);
    } else if (user?.role === "client" || user?.role === "user") {
      setError("Only administrators can create new session slots.");
      setTimeout(() => setError(""), 3000);
    }
  };

  /**
   * Book a session for the current user
   */
  const bookSession = async () => {
    if (!selectedEvent || !user) {
      setError("Unable to book: Missing session or user information");
      return;
    }
    
    // Validate session is still available before booking
    if (selectedEvent.status !== 'available') {
      setError("This session is no longer available. Please refresh and try again.");
      setTimeout(() => setError(""), 4000);
      return;
    }
    
    setIsOperationLoading(true);
    try {
      await scheduleService.bookSession(selectedEvent.id);
      
      setShowBookingModal(false);
      setSelectedEvent(null);
      await fetchSessions();
      
      // Show success feedback
      setError("Session booked successfully!");
      setTimeout(() => setError(""), 2000);
    } catch (err: any) {
      console.error("Error booking session:", err);
      if (err.response?.status === 409) {
        setError("This session has already been booked by someone else.");
      } else if (err.response?.status === 403) {
        setError("You don't have permission to book this session.");
      } else if (err.message === "Network Error") {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError(`Failed to book session: ${err.response?.data?.message || 'Please try again.'}`); 
      }
      setTimeout(() => setError(""), 4000);
    } finally {
      setIsOperationLoading(false);
    }
  };

  /**
   * Create a new session slot (admin only)
   */
  const createSession = async () => {
    if (!selectedSlot || !user) {
      setError("Missing session data or user information");
      return;
    }
    
    if (user.role !== "admin") {
      setError("You don't have permission to create sessions");
      return;
    }
    
    // Validate form inputs
    if (!newSessionForm.location.trim()) {
      setError("Please provide a location for the session");
      return;
    }
    
    if (newSessionForm.duration < 15 || newSessionForm.duration > 240) {
      setError("Session duration must be between 15 and 240 minutes");
      return;
    }
    
    // Ensure start time is in the future
    if (moment(selectedSlot.start).isBefore(moment())) {
      setError("Cannot create sessions in the past");
      return;
    }
    
    setIsOperationLoading(true);
    try {
      const slotData = {
        start: selectedSlot.start.toISOString(),
        end: moment(selectedSlot.start).add(newSessionForm.duration, 'minutes').toISOString(),
        trainerId: newSessionForm.trainerId || undefined,
        location: newSessionForm.location.trim(),
        notes: newSessionForm.notes.trim() || undefined
      };
      
      await scheduleService.createAvailableSlots([slotData]);
      
      setShowCreateModal(false);
      setSelectedSlot(null);
      // Reset form
      setNewSessionForm({
        trainerId: "",
        location: "Main Studio",
        duration: 60,
        notes: ""
      });
      
      // Show success feedback
      setError("Session created successfully!");
      setTimeout(() => setError(""), 2000);
      
      // Refresh sessions
      await fetchSessions();
    } catch (err: any) {
      console.error("Error creating session:", err);
      if (err.response?.status === 403) {
        setError("You don't have permission to create sessions");
      } else if (err.response?.status === 409) {
        setError("A session already exists at this time");
      } else if (err.message === "Network Error") {
        setError("Network error. Please check your connection and try again");
      } else {
        setError(`Failed to create session: ${err.response?.data?.message || 'Please try again'}`); 
      }
      setTimeout(() => setError(""), 4000);
    } finally {
      setIsOperationLoading(false);
    }
  };

  /**
   * Create recurring sessions (admin only)
   */
  const createRecurringSessions = async () => {
    if (!user) {
      setError("User information not available");
      return;
    }
    
    if (user.role !== "admin") {
      setError("You don't have permission to create recurring sessions");
      return;
    }
    
    // Validate form inputs
    if (!recurringSessionForm.location.trim()) {
      setError("Please provide a location for the sessions");
      return;
    }
    
    if (recurringSessionForm.duration < 15 || recurringSessionForm.duration > 240) {
      setError("Session duration must be between 15 and 240 minutes");
      return;
    }
    
    if (recurringSessionForm.daysOfWeek.length === 0) {
      setError("Please select at least one day of the week");
      return;
    }
    
    if (recurringSessionForm.times.length === 0) {
      setError("Please add at least one time slot");
      return;
    }
    
    const startDate = moment(recurringSessionForm.startDate);
    const endDate = moment(recurringSessionForm.endDate);
    
    if (!startDate.isValid() || !endDate.isValid()) {
      setError("Please provide valid start and end dates");
      return;
    }
    
    if (startDate.isAfter(endDate)) {
      setError("Start date must be before end date");
      return;
    }
    
    if (startDate.isBefore(moment().startOf('day'))) {
      setError("Start date cannot be in the past");
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
      const recurringData = {
        startDate: recurringSessionForm.startDate,
        endDate: recurringSessionForm.endDate,
        daysOfWeek: recurringSessionForm.daysOfWeek,
        times: recurringSessionForm.times,
        trainerId: recurringSessionForm.trainerId || undefined,
        location: recurringSessionForm.location.trim(),
        duration: recurringSessionForm.duration
      };
      
      const result = await scheduleService.createRecurringSessions(recurringData);
      const createdCount = Array.isArray(result) ? result.length : 0;
      
      setShowRecurringModal(false);
      // Reset form to defaults
      setRecurringSessionForm({
        startDate: moment().format("YYYY-MM-DD"),
        endDate: moment().add(2, "weeks").format("YYYY-MM-DD"),
        daysOfWeek: [1, 3, 5],
        times: ["09:00", "14:00", "17:00"],
        trainerId: "",
        location: "Main Studio",
        duration: 60
      });
      
      // Show success feedback
      setError(`Successfully created ${createdCount} recurring sessions!`); 
      setTimeout(() => setError(""), 3000);
      
      // Refresh sessions
      await fetchSessions();
    } catch (err: any) {
      console.error("Error creating recurring sessions:", err);
      if (err.response?.status === 403) {
        setError("You don't have permission to create recurring sessions");
      } else if (err.response?.status === 409) {
        setError("Some sessions could not be created due to conflicts");
      } else if (err.message === "Network Error") {
        setError("Network error. Please check your connection and try again");
      } else {
        setError(`Failed to create recurring sessions: ${err.response?.data?.message || 'Please try again'}`); 
      }
      setTimeout(() => setError(""), 4000);
    } finally {
      setIsOperationLoading(false);
    }
  };

  /**
   * Assign a trainer to a session (admin only)
   */
  const assignTrainer = async () => {
    if (!selectedEvent || !user) {
      setError("Missing session or user information");
      return;
    }
    
    if (user.role !== "admin") {
      setError("You don't have permission to assign trainers");
      return;
    }
    
    if (!assignForm.trainerId) {
      setError("Please select a trainer to assign");
      return;
    }
    
    setIsOperationLoading(true);
    try {
      await scheduleService.assignTrainer(selectedEvent.id, assignForm.trainerId);
      
      setShowAssignModal(false);
      setSelectedEvent(null);
      setAssignForm({ trainerId: "" });
      
      // Show success feedback
      setError("Trainer assigned successfully!");
      setTimeout(() => setError(""), 2000);
      
      await fetchSessions();
    } catch (err: any) {
      console.error("Error assigning trainer:", err);
      if (err.response?.status === 403) {
        setError("You don't have permission to assign trainers");
      } else if (err.response?.status === 404) {
        setError("Session or trainer not found");
      } else if (err.response?.status === 409) {
        setError("Trainer is not available during this time slot");
      } else {
        setError(`Failed to assign trainer: ${err.response?.data?.message || 'Please try again'}`); 
      }
      setTimeout(() => setError(""), 4000);
    } finally {
      setIsOperationLoading(false);
    }
  };

  /**
   * Cancel a session (admins can cancel any, users only their own)
   */
  const cancelSessionHandler = async () => {
    if (!selectedEvent || !user) {
      setError("Missing session or user information");
      return;
    }
    
    // Check permissions - only admin or session owner can cancel
    if (user.role !== 'admin' && selectedEvent.userId !== user.id) {
      setError("You don't have permission to cancel this session");
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
      setCancelForm({ reason: "" });
      
      // Show success feedback
      setError("Session cancelled successfully");
      setTimeout(() => setError(""), 2000);
      
      await fetchSessions();
    } catch (err: any) {
      console.error("Error cancelling session:", err);
      if (err.response?.status === 403) {
        setError("You don't have permission to cancel this session");
      } else if (err.response?.status === 404) {
        setError("Session not found");
      } else if (err.response?.status === 409) {
        setError("Cannot cancel session in its current state");
      } else {
        setError(`Failed to cancel session: ${err.response?.data?.message || 'Please try again'}`); 
      }
      setTimeout(() => setError(""), 4000);
    } finally {
      setIsOperationLoading(false);
    }
  };
  
  /**
   * Mark a session as completed (admin/trainer only)
   */
  const completeSession = async () => {
    if (!selectedEvent || !user) {
      setError("Missing session or user information");
      return;
    }
    
    if (user.role !== 'admin' && user.role !== 'trainer') {
      setError("You don't have permission to mark sessions as completed");
      return;
    }
    
    // For trainers, verify they are assigned to this session
    if (user.role === 'trainer' && selectedEvent.trainerId !== user.id) {
      setError("You can only mark your own sessions as completed");
      return;
    }
    
    // Validate session can be marked as completed
    if (!['confirmed', 'scheduled'].includes(selectedEvent.status)) {
      setError(`Cannot complete a session with status: ${selectedEvent.status}`);
      return;
    }
    
    setIsOperationLoading(true);
    try {
      await scheduleService.completeSession(selectedEvent.id);
      
      setShowDetailsModal(false);
      setSelectedEvent(null);
      
      // Show success feedback
      setError("Session marked as completed");
      setTimeout(() => setError(""), 2000);
      
      await fetchSessions();
    } catch (err: any) {
      console.error("Error completing session:", err);
      if (err.response?.status === 403) {
        setError("You don't have permission to mark this session as completed");
      } else if (err.response?.status === 404) {
        setError("Session not found");
      } else if (err.response?.status === 409) {
        setError("Cannot complete session in its current state");
      } else {
        setError(`Failed to mark session as completed: ${err.response?.data?.message || 'Please try again'}`); 
      }
      setTimeout(() => setError(""), 4000);
    } finally {
      setIsOperationLoading(false);
    }
  };
  
  /**
   * Confirm a session (admin/trainer only)
   */
  const confirmSession = async () => {
    if (!selectedEvent || !user) {
      setError("Missing session or user information");
      return;
    }
    
    if (user.role !== 'admin' && user.role !== 'trainer') {
      setError("You don't have permission to confirm sessions");
      return;
    }
    
    // For trainers, verify they are assigned to this session
    if (user.role === 'trainer' && selectedEvent.trainerId !== user.id) {
      setError("You can only confirm your own sessions");
      return;
    }
    
    // Validate session can be confirmed
    if (!['scheduled', 'requested'].includes(selectedEvent.status)) {
      setError(`Cannot confirm a session with status: ${selectedEvent.status}`);
      return;
    }
    
    setIsOperationLoading(true);
    try {
      await scheduleService.confirmSession(selectedEvent.id);
      
      setShowDetailsModal(false);
      setSelectedEvent(null);
      
      // Show success feedback
      setError("Session confirmed successfully");
      setTimeout(() => setError(""), 2000);
      
      await fetchSessions();
    } catch (err: any) {
      console.error("Error confirming session:", err);
      if (err.response?.status === 403) {
        setError("You don't have permission to confirm this session");
      } else if (err.response?.status === 404) {
        setError("Session not found");
      } else if (err.response?.status === 409) {
        setError("Cannot confirm session in its current state");
      } else {
        setError(`Failed to confirm session: ${err.response?.data?.message || 'Please try again'}`); 
      }
      setTimeout(() => setError(""), 4000);
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
  const eventPropGetter = (event: SessionEvent) => {
    let className = event.status || '';
    
    if (event.status === 'scheduled' || event.status === 'booked' || event.status === 'confirmed') {
      if (event.userId === user?.id) {
        className += ' user-booked';
      }
    }
    
    return { className };
  };
  
  // Update recurring form handlers
  const handleDayToggle = (day: number) => {
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
  
  const handleTimeAdd = () => {
    setRecurringSessionForm({
      ...recurringSessionForm,
      times: [...recurringSessionForm.times, "12:00"]
    });
  };
  
  const handleTimeChange = (index: number, value: string) => {
    const newTimes = [...recurringSessionForm.times];
    newTimes[index] = value;
    
    setRecurringSessionForm({
      ...recurringSessionForm,
      times: newTimes
    });
  };
  
  const handleTimeRemove = (index: number) => {
    const newTimes = [...recurringSessionForm.times];
    newTimes.splice(index, 1);
    
    setRecurringSessionForm({
      ...recurringSessionForm,
      times: newTimes
    });
  };

  // Update session form handlers
  const handleNewSessionChange = (field: string, value: any) => {
    setNewSessionForm({
      ...newSessionForm,
      [field]: value
    });
  };

  // Pass all necessary props to the CalendarView component
  return (
    <CalendarView
      // Current state
      user={user}
      events={calendarEvents}
      loading={loading || isOperationLoading} // Show loading for any operation
      operationInProgress={isOperationLoading} // Flag specifically for operations in progress
      error={error}
      view={view}
      date={date}
      stats={stats}
      selectedEvent={selectedEvent}
      selectedSlot={selectedSlot}
      
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
      closeBookingModal={() => { setShowBookingModal(false); setSelectedEvent(null); }}
      closeCreateModal={() => { 
        setShowCreateModal(false); 
        setSelectedSlot(null); 
        setNewSessionForm({
          trainerId: "",
          location: "Main Studio",
          duration: 60,
          notes: ""
        });
      }}
      closeDetailsModal={() => { setShowDetailsModal(false); setSelectedEvent(null); }}
      closeAssignModal={() => { 
        setShowAssignModal(false); 
        setSelectedEvent(null); 
        setAssignForm({ trainerId: "" });
      }}
      closeCancelModal={() => { 
        setShowCancelModal(false); 
        setSelectedEvent(null);
        setCancelForm({ reason: "" });
      }}
      closeRecurringModal={() => { 
        setShowRecurringModal(false);
        setRecurringSessionForm({
          startDate: moment().format("YYYY-MM-DD"),
          endDate: moment().add(2, "weeks").format("YYYY-MM-DD"),
          daysOfWeek: [1, 3, 5],
          times: ["09:00", "14:00", "17:00"],
          trainerId: "",
          location: "Main Studio",
          duration: 60
        });
      }}
      openRecurringModal={() => setShowRecurringModal(true)}
      openCreateModal={() => setShowCreateModal(true)}
      
      // Session action handlers
      bookSession={bookSession}
      createSession={createSession}
      createRecurringSessions={createRecurringSessions}
      assignTrainer={assignTrainer}
      cancelSession={cancelSessionHandler}
      completeSession={completeSession}
      confirmSession={confirmSession}
      showCancelModalFromDetails={() => {
        setShowDetailsModal(false);
        setShowCancelModal(true);
      }}
      showAssignModalFromDetails={() => {
        setShowDetailsModal(false);
        setShowAssignModal(true);
      }}
      
      // Form handlers
      onNewSessionChange={handleNewSessionChange}
      onAssignFormChange={(trainerId: string) => setAssignForm({ trainerId })}
      onCancelFormChange={(reason: string) => setCancelForm({ reason })}
      
      // Recurring session form handlers
      onRecurringFormChange={(field: string, value: any) => {
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
