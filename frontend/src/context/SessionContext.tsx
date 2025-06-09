/**
 * SessionContext.tsx
 * Enhanced session management for SwanStudios platform
 * Tracks workout sessions, training progress, and session analytics
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import apiService from '../services/api.service';

// Session Types
export interface WorkoutSession {
  id: string;
  userId: string;
  workoutPlanId?: string;
  title: string;
  description?: string;
  duration: number; // in minutes
  status: 'planned' | 'active' | 'paused' | 'completed' | 'cancelled';
  startTime: string;
  endTime?: string;
  exercises: SessionExercise[];
  notes?: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  caloriesBurned?: number;
  heartRateData?: HeartRateData[];
  createdAt: string;
  updatedAt: string;
}

export interface SessionExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  sets: ExerciseSet[];
  restTime?: number; // in seconds
  notes?: string;
  completed: boolean;
}

export interface ExerciseSet {
  id: string;
  reps: number;
  weight?: number;
  duration?: number; // for time-based exercises
  restTime?: number;
  completed: boolean;
  difficulty?: 1 | 2 | 3 | 4 | 5;
}

export interface HeartRateData {
  timestamp: string;
  heartRate: number;
}

export interface SessionAnalytics {
  totalSessions: number;
  totalDuration: number; // in minutes
  averageDuration: number;
  caloriesBurned: number;
  favoriteExercises: string[];
  weeklyProgress: WeeklyProgress[];
  currentStreak: number;
  longestStreak: number;
}

export interface WeeklyProgress {
  week: string;
  sessionsCompleted: number;
  totalDuration: number;
  caloriesBurned: number;
}

// Context Interface
interface SessionContextType {
  currentSession: WorkoutSession | null;
  sessions: WorkoutSession[];
  sessionAnalytics: SessionAnalytics | null;
  loading: boolean;
  error: string | null;
  
  // Session Management
  startSession: (workoutPlanId?: string, title?: string) => Promise<WorkoutSession>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  completeSession: (notes?: string) => Promise<void>;
  cancelSession: () => Promise<void>;
  
  // Exercise Management
  addExercise: (exercise: Omit<SessionExercise, 'id' | 'completed'>) => Promise<void>;
  updateExercise: (exerciseId: string, updates: Partial<SessionExercise>) => Promise<void>;
  completeExercise: (exerciseId: string) => Promise<void>;
  
  // Set Management
  addSet: (exerciseId: string, set: Omit<ExerciseSet, 'id' | 'completed'>) => Promise<void>;
  updateSet: (exerciseId: string, setId: string, updates: Partial<ExerciseSet>) => Promise<void>;
  completeSet: (exerciseId: string, setId: string) => Promise<void>;
  
  // Data Management
  fetchSessions: (limit?: number) => Promise<void>;
  fetchSessionAnalytics: () => Promise<void>;
  saveSessionData: () => Promise<void>;
  
  // Role-based data access (NEW)
  fetchClientSessions: (clientId?: string) => Promise<WorkoutSession[]>;
  fetchAllUserSessions: () => Promise<WorkoutSession[]>; // Admin only
  fetchTrainerStats: () => Promise<any>; // Trainer stats
  fetchAdminStats: () => Promise<any>; // Admin stats
  
  // Timer functions
  sessionTimer: number; // current session time in seconds
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
}

// Create Context
const SessionContext = createContext<SessionContextType>({
  currentSession: null,
  sessions: [],
  sessionAnalytics: null,
  loading: false,
  error: null,
  startSession: async () => ({} as WorkoutSession),
  pauseSession: async () => {},
  resumeSession: async () => {},
  completeSession: async () => {},
  cancelSession: async () => {},
  addExercise: async () => {},
  updateExercise: async () => {},
  completeExercise: async () => {},
  addSet: async () => {},
  updateSet: async () => {},
  completeSet: async () => {},
  fetchSessions: async () => {},
  fetchSessionAnalytics: async () => {},
  saveSessionData: async () => {},
  fetchClientSessions: async () => [],
  fetchAllUserSessions: async () => [],
  fetchTrainerStats: async () => ({}),
  fetchAdminStats: async () => ({}),
  sessionTimer: 0,
  startTimer: () => {},
  pauseTimer: () => {},
  resetTimer: () => {}
});

// Provider Component
export const SessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [currentSession, setCurrentSession] = useState<WorkoutSession | null>(null);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [sessionAnalytics, setSessionAnalytics] = useState<SessionAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  
  // ENHANCED: Tab synchronization state to prevent localStorage race conditions
  const [tabId] = useState(() => `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [isActiveTab, setIsActiveTab] = useState(true);

  // CRITICAL FIX: saveSessionData function definition with enhanced error handling
  const saveSessionData = useCallback(async (): Promise<void> => {
    if (!currentSession || !user) return;
    
    try {
      await apiService.put(`/api/sessions/${currentSession.id}`, {
        ...currentSession,
        duration: sessionTimer,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.warn('Failed to auto-save session to backend');
      // ENHANCED: Safe localStorage write with tab coordination
      if (isActiveTab) {
        localStorage.setItem(`activeSession_${user.id}`, JSON.stringify({
          ...currentSession,
          duration: sessionTimer,
          updatedAt: new Date().toISOString()
        }));
      }
    }
  }, [currentSession, user, sessionTimer, isActiveTab]);

  // Auto-save current session data - ENHANCED WITH PROPER CLEANUP AND ERROR HANDLING
  useEffect(() => {
    let autoSaveInterval: NodeJS.Timeout | null = null;
    
    // Defensive check to ensure saveSessionData is available
    if (currentSession && currentSession.status === 'active' && saveSessionData) {
      autoSaveInterval = setInterval(() => {
        try {
          saveSessionData();
        } catch (error) {
          console.warn('[SessionContext] Auto-save error:', error);
        }
      }, 30000); // Auto-save every 30 seconds
    }
    
    // Cleanup function - prevents memory leaks
    return () => {
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
      }
    };
  }, [currentSession, saveSessionData]); // Added saveSessionData to dependencies

  // ENHANCED: Comprehensive timer cleanup on unmount and state changes
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
    };
  }, []); // Empty dependency array for unmount cleanup only

  // ENHANCED: Additional cleanup when session changes to prevent multiple timers
  useEffect(() => {
    if (!currentSession || currentSession.status !== 'active') {
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
    }
  }, [currentSession, timerInterval]);

  // ENHANCED: Tab synchronization system to prevent localStorage race conditions
  useEffect(() => {
    // Mark this tab as active
    localStorage.setItem('activeSessionTab', tabId);
    
    // Listen for tab visibility changes
    const handleVisibilityChange = () => {
      const nowActive = !document.hidden;
      setIsActiveTab(nowActive);
      
      if (nowActive) {
        // When tab becomes active, check if we should take over session management
        const currentActiveTab = localStorage.getItem('activeSessionTab');
        if (!currentActiveTab || currentActiveTab === tabId) {
          localStorage.setItem('activeSessionTab', tabId);
        }
      }
    };
    
    // Listen for localStorage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (!user) return;
      
      // Session data changed in another tab
      if (e.key === `activeSession_${user.id}` && e.newValue) {
        try {
          const sessionFromOtherTab = JSON.parse(e.newValue);
          const currentActiveTab = localStorage.getItem('activeSessionTab');
          
          // Only update if this isn't the active tab managing the session
          if (currentActiveTab !== tabId) {
            setCurrentSession(sessionFromOtherTab);
            
            // Sync timer if session is active
            if (sessionFromOtherTab.status === 'active' && sessionFromOtherTab.startTime) {
              const startTime = new Date(sessionFromOtherTab.startTime).getTime();
              const elapsed = Math.floor((Date.now() - startTime) / 1000);
              setSessionTimer(elapsed);
            }
          }
        } catch (error) {
          console.warn('[SessionContext] Error syncing session from other tab:', error);
        }
      }
      
      // Active tab changed
      if (e.key === 'activeSessionTab' && e.newValue !== tabId) {
        setIsActiveTab(false);
        // Stop timer if we're no longer the active tab
        if (timerInterval) {
          clearInterval(timerInterval);
          setTimerInterval(null);
        }
      }
    };
    
    // Register event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('beforeunload', () => {
      // Clear our tab as active when unloading
      const currentActiveTab = localStorage.getItem('activeSessionTab');
      if (currentActiveTab === tabId) {
        localStorage.removeItem('activeSessionTab');
      }
    });
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
      
      // Clean up our active tab status
      const currentActiveTab = localStorage.getItem('activeSessionTab');
      if (currentActiveTab === tabId) {
        localStorage.removeItem('activeSessionTab');
      }
    };
  }, [tabId, user, timerInterval]);

  // Load session data when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchSessions(10); // Load last 10 sessions
      fetchSessionAnalytics();
      
      // Check for any active session from localStorage
      const savedSession = localStorage.getItem(`activeSession_${user.id}`);
      if (savedSession) {
        try {
          const parsedSession = JSON.parse(savedSession);
          setCurrentSession(parsedSession);
          
          // Resume timer if session was active
          if (parsedSession.status === 'active') {
            const startTime = new Date(parsedSession.startTime).getTime();
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            setSessionTimer(elapsed);
            startTimer();
          }
        } catch (error) {
          console.error('Error loading saved session:', error);
          localStorage.removeItem(`activeSession_${user.id}`);
        }
      }
    }
  }, [isAuthenticated, user]);

  // Session notification helper
  const showSessionNotification = useCallback((message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    const colors = {
      success: { bg: 'linear-gradient(135deg, #00ffff, #0080ff)', color: '#000' },
      info: { bg: 'linear-gradient(135deg, #4facfe, #00f2fe)', color: '#000' },
      warning: { bg: 'linear-gradient(135deg, #ffa726, #ff9800)', color: '#000' },
      error: { bg: 'linear-gradient(135deg, #ff6b9d, #ff4d6d)', color: '#fff' }
    };

    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: ${colors[type].bg};
      color: ${colors[type].color};
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      max-width: 300px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.style.transform = 'translateX(0)', 100);
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 4000);
  }, []);

  // Timer Functions
  const startTimer = useCallback(() => {
    if (timerInterval) clearInterval(timerInterval);
    
    const interval = setInterval(() => {
      setSessionTimer(prev => prev + 1);
    }, 1000);
    
    setTimerInterval(interval);
  }, [timerInterval]);

  const pauseTimer = useCallback(() => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  }, [timerInterval]);

  const resetTimer = useCallback(() => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setSessionTimer(0);
  }, [timerInterval]);

  // Session Management Functions
  const startSession = useCallback(async (workoutPlanId?: string, title?: string): Promise<WorkoutSession> => {
    if (!isAuthenticated || !user) {
      throw new Error('User must be logged in to start a session');
    }

    if (currentSession && currentSession.status === 'active') {
      throw new Error('A session is already active. Please complete or cancel the current session first.');
    }

    setLoading(true);
    setError(null);

    try {
      const newSession: WorkoutSession = {
        id: `session_${Date.now()}`,
        userId: user.id,
        workoutPlanId,
        title: title || `Workout Session ${new Date().toLocaleDateString()}`,
        duration: 0,
        status: 'active',
        startTime: new Date().toISOString(),
        exercises: [],
        difficulty: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Try to save to backend
      try {
        const response = await apiService.post('/api/sessions', newSession);
        if (response.data) {
          newSession.id = response.data.id;
        }
      } catch (apiError) {
        console.warn('Failed to save session to backend, using local storage:', apiError);
      }

      setCurrentSession(newSession);
      
      // ENHANCED: Safe localStorage write with tab coordination
      if (isActiveTab) {
        localStorage.setItem(`activeSession_${user.id}`, JSON.stringify(newSession));
      }
      
      resetTimer();
      startTimer();
      
      showSessionNotification('Workout session started! Let\'s get moving! 💪', 'success');
      
      return newSession;
    } catch (error: any) {
      const message = error.message || 'Failed to start session';
      setError(message);
      showSessionNotification(message, 'error');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, currentSession, showSessionNotification, resetTimer, startTimer]);

  const pauseSession = useCallback(async (): Promise<void> => {
    if (!currentSession || currentSession.status !== 'active') {
      throw new Error('No active session to pause');
    }

    setLoading(true);
    try {
      const updatedSession = {
        ...currentSession,
        status: 'paused' as const,
        duration: sessionTimer,
        updatedAt: new Date().toISOString()
      };

      setCurrentSession(updatedSession);
      
      // ENHANCED: Safe localStorage write with tab coordination
      if (isActiveTab) {
        localStorage.setItem(`activeSession_${user!.id}`, JSON.stringify(updatedSession));
      }
      
      pauseTimer();
      showSessionNotification('Session paused. Take a break! ⏸️', 'info');
      
      // Try to update backend
      try {
        await apiService.put(`/api/sessions/${currentSession.id}`, updatedSession);
      } catch (apiError) {
        console.warn('Failed to update session on backend:', apiError);
      }
    } catch (error: any) {
      const message = error.message || 'Failed to pause session';
      setError(message);
      showSessionNotification(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [currentSession, sessionTimer, user, showSessionNotification, pauseTimer]);

  const resumeSession = useCallback(async (): Promise<void> => {
    if (!currentSession || currentSession.status !== 'paused') {
      throw new Error('No paused session to resume');
    }

    setLoading(true);
    try {
      const updatedSession = {
        ...currentSession,
        status: 'active' as const,
        updatedAt: new Date().toISOString()
      };

      setCurrentSession(updatedSession);
      
      // ENHANCED: Safe localStorage write with tab coordination
      if (isActiveTab) {
        localStorage.setItem(`activeSession_${user!.id}`, JSON.stringify(updatedSession));
      }
      
      startTimer();
      showSessionNotification('Session resumed! Keep going! 🔥', 'success');
      
      // Try to update backend
      try {
        await apiService.put(`/api/sessions/${currentSession.id}`, updatedSession);
      } catch (apiError) {
        console.warn('Failed to update session on backend:', apiError);
      }
    } catch (error: any) {
      const message = error.message || 'Failed to resume session';
      setError(message);
      showSessionNotification(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [currentSession, user, showSessionNotification, startTimer]);

  const completeSession = useCallback(async (notes?: string): Promise<void> => {
    if (!currentSession) {
      throw new Error('No session to complete');
    }

    setLoading(true);
    try {
      const completedSession = {
        ...currentSession,
        status: 'completed' as const,
        endTime: new Date().toISOString(),
        duration: sessionTimer,
        notes,
        updatedAt: new Date().toISOString()
      };

      // Add to sessions history
      setSessions(prev => [completedSession, ...prev]);
      
      // Clear current session
      setCurrentSession(null);
      
      // ENHANCED: Safe localStorage cleanup with tab coordination
      if (isActiveTab) {
        localStorage.removeItem(`activeSession_${user!.id}`);
      }
      
      pauseTimer();
      resetTimer();
      
      showSessionNotification(`Great job! Session completed in ${Math.floor(sessionTimer / 60)} minutes! 🎉`, 'success');
      
      // Try to save completed session to backend
      try {
        await apiService.put(`/api/sessions/${currentSession.id}`, completedSession);
      } catch (apiError) {
        console.warn('Failed to save completed session to backend:', apiError);
        // Save to local storage as backup
        const localSessions = JSON.parse(localStorage.getItem(`sessions_${user!.id}`) || '[]');
        localSessions.unshift(completedSession);
        localStorage.setItem(`sessions_${user!.id}`, JSON.stringify(localSessions.slice(0, 50))); // Keep last 50
      }
      
      // Refresh analytics
      fetchSessionAnalytics();
    } catch (error: any) {
      const message = error.message || 'Failed to complete session';
      setError(message);
      showSessionNotification(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [currentSession, sessionTimer, user, showSessionNotification, pauseTimer, resetTimer]);

  // Placeholder implementations for other functions
  const cancelSession = useCallback(async (): Promise<void> => {
    if (!currentSession) return;
    
    setCurrentSession(null);
    
    // ENHANCED: Safe localStorage cleanup with tab coordination
    if (isActiveTab) {
      localStorage.removeItem(`activeSession_${user!.id}`);
    }
    pauseTimer();
    resetTimer();
    showSessionNotification('Session cancelled', 'warning');
  }, [currentSession, user, isActiveTab, showSessionNotification, pauseTimer, resetTimer]);

  const addExercise = useCallback(async (exercise: Omit<SessionExercise, 'id' | 'completed'>): Promise<void> => {
    if (!currentSession) throw new Error('No active session');
    
    const newExercise: SessionExercise = {
      ...exercise,
      id: `exercise_${Date.now()}`,
      completed: false
    };
    
    const updatedSession = {
      ...currentSession,
      exercises: [...currentSession.exercises, newExercise],
      updatedAt: new Date().toISOString()
    };
    
    setCurrentSession(updatedSession);
    
    // ENHANCED: Safe localStorage write with tab coordination
    if (isActiveTab) {
      localStorage.setItem(`activeSession_${user!.id}`, JSON.stringify(updatedSession));
    }
    showSessionNotification(`${exercise.exerciseName} added to session`, 'success');
  }, [currentSession, user, isActiveTab, showSessionNotification]);

  const updateExercise = useCallback(async (exerciseId: string, updates: Partial<SessionExercise>): Promise<void> => {
    if (!currentSession) throw new Error('No active session');
    
    const updatedSession = {
      ...currentSession,
      exercises: currentSession.exercises.map(ex => 
        ex.id === exerciseId ? { ...ex, ...updates } : ex
      ),
      updatedAt: new Date().toISOString()
    };
    
    setCurrentSession(updatedSession);
    
    // ENHANCED: Safe localStorage write with tab coordination
    if (isActiveTab) {
      localStorage.setItem(`activeSession_${user!.id}`, JSON.stringify(updatedSession));
    }
  }, [currentSession, user, isActiveTab]);

  const completeExercise = useCallback(async (exerciseId: string): Promise<void> => {
    await updateExercise(exerciseId, { completed: true });
    showSessionNotification('Exercise completed! 💪', 'success');
  }, [updateExercise, showSessionNotification]);

  const addSet = useCallback(async (exerciseId: string, set: Omit<ExerciseSet, 'id' | 'completed'>): Promise<void> => {
    if (!currentSession) throw new Error('No active session');
    
    const newSet: ExerciseSet = {
      ...set,
      id: `set_${Date.now()}`,
      completed: false
    };
    
    const updatedSession = {
      ...currentSession,
      exercises: currentSession.exercises.map(ex => 
        ex.id === exerciseId 
          ? { ...ex, sets: [...ex.sets, newSet] }
          : ex
      ),
      updatedAt: new Date().toISOString()
    };
    
    setCurrentSession(updatedSession);
    
    // ENHANCED: Safe localStorage write with tab coordination
    if (isActiveTab) {
      localStorage.setItem(`activeSession_${user!.id}`, JSON.stringify(updatedSession));
    }
  }, [currentSession, user, isActiveTab]);

  const updateSet = useCallback(async (exerciseId: string, setId: string, updates: Partial<ExerciseSet>): Promise<void> => {
    if (!currentSession) throw new Error('No active session');
    
    const updatedSession = {
      ...currentSession,
      exercises: currentSession.exercises.map(ex => 
        ex.id === exerciseId 
          ? {
              ...ex,
              sets: ex.sets.map(set => 
                set.id === setId ? { ...set, ...updates } : set
              )
            }
          : ex
      ),
      updatedAt: new Date().toISOString()
    };
    
    setCurrentSession(updatedSession);
    
    // ENHANCED: Safe localStorage write with tab coordination
    if (isActiveTab) {
      localStorage.setItem(`activeSession_${user!.id}`, JSON.stringify(updatedSession));
    }
  }, [currentSession, user, isActiveTab]);

  const completeSet = useCallback(async (exerciseId: string, setId: string): Promise<void> => {
    await updateSet(exerciseId, setId, { completed: true });
    showSessionNotification('Set completed! Keep it up! 🔥', 'success');
  }, [updateSet, showSessionNotification]);

  const fetchSessions = useCallback(async (limit: number = 10): Promise<void> => {
    if (!isAuthenticated || !user) return;
    
    setLoading(true);
    try {
      const response = await apiService.get(`/api/sessions?limit=${limit}`);
      if (response.data) {
        setSessions(response.data);
      }
    } catch (error) {
      console.warn('Failed to fetch sessions from backend, using local storage');
      const localSessions = JSON.parse(localStorage.getItem(`sessions_${user.id}`) || '[]');
      setSessions(localSessions.slice(0, limit));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  const fetchSessionAnalytics = useCallback(async (): Promise<void> => {
    if (!isAuthenticated || !user) return;
    
    try {
      const response = await apiService.get('/api/sessions/analytics');
      if (response.data) {
        setSessionAnalytics(response.data);
      }
    } catch (error) {
      console.warn('Failed to fetch analytics from backend');
      // Generate basic analytics from local sessions
      const totalSessions = sessions.length;
      const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);
      const basicAnalytics: SessionAnalytics = {
        totalSessions,
        totalDuration,
        averageDuration: totalSessions > 0 ? totalDuration / totalSessions : 0,
        caloriesBurned: sessions.reduce((sum, s) => sum + (s.caloriesBurned || 0), 0),
        favoriteExercises: [],
        weeklyProgress: [],
        currentStreak: 0,
        longestStreak: 0
      };
      setSessionAnalytics(basicAnalytics);
    }
  }, [isAuthenticated, user, sessions]);

  // Role-based data access functions
  const fetchClientSessions = useCallback(async (clientId?: string): Promise<WorkoutSession[]> => {
    if (!isAuthenticated || !user) return [];
    
    // If no clientId provided and user is client, fetch their own sessions
    const targetId = clientId || (user.role === 'client' ? user.id : null);
    
    if (!targetId) {
      console.warn('No client ID provided for fetching sessions');
      return [];
    }
    
    try {
      const response = await apiService.get(`/api/sessions/client/${targetId}`);
      return response.data || [];
    } catch (error) {
      console.warn('Failed to fetch client sessions from backend');
      // Return mock data for demo
      return [
        {
          id: 'demo-session-1',
          userId: targetId,
          title: 'Morning Workout',
          duration: 2400,
          status: 'completed',
          startTime: new Date(Date.now() - 86400000).toISOString(),
          exercises: [],
          difficulty: 4,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 86400000).toISOString()
        } as WorkoutSession
      ];
    }
  }, [isAuthenticated, user]);

  const fetchAllUserSessions = useCallback(async (): Promise<WorkoutSession[]> => {
    if (!isAuthenticated || !user || user.role !== 'admin') {
      console.warn('Admin access required for fetching all user sessions');
      return [];
    }
    
    try {
      const response = await apiService.get('/api/admin/all-sessions');
      return response.data || [];
    } catch (error) {
      console.warn('Failed to fetch all sessions from backend');
      // Return mock data for demo
      return [
        {
          id: 'admin-demo-1',
          userId: 'user1',
          title: 'Client Session 1',
          duration: 1800,
          status: 'completed',
          startTime: new Date(Date.now() - 3600000).toISOString(),
          exercises: [],
          difficulty: 3,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString()
        } as WorkoutSession
      ];
    }
  }, [isAuthenticated, user]);

  const fetchTrainerStats = useCallback(async (): Promise<any> => {
    if (!isAuthenticated || !user || !['trainer', 'admin'].includes(user.role)) {
      console.warn('Trainer or Admin access required for trainer stats');
      return {};
    }
    
    try {
      const response = await apiService.get('/api/trainer/stats');
      return response.data || {};
    } catch (error) {
      console.warn('Failed to fetch trainer stats from backend');
      // Return mock data for demo
      return {
        totalClients: 12,
        activeClients: 3,
        todaySessions: 8,
        weekSessions: 34,
        monthSessions: 142,
        avgSessionDuration: 45,
        clientProgress: {
          improved: 8,
          maintained: 3,
          needsAttention: 1
        }
      };
    }
  }, [isAuthenticated, user]);

  const fetchAdminStats = useCallback(async (): Promise<any> => {
    if (!isAuthenticated || !user || user.role !== 'admin') {
      console.warn('Admin access required for admin stats');
      return {};
    }
    
    try {
      const response = await apiService.get('/api/admin/session-stats');
      return response.data || {};
    } catch (error) {
      console.warn('Failed to fetch admin stats from backend');
      // Return mock data for demo
      return {
        totalSessions: 1247,
        activeSessions: 23,
        totalUsers: 342,
        avgSessionDuration: 45,
        todaySessions: 67,
        weekSessions: 289,
        monthSessions: 1107,
        platformHealth: {
          uptime: 99.8,
          avgResponseTime: 145,
          errorRate: 0.02
        },
        topTrainers: [
          { id: '1', name: 'Sarah Johnson', sessions: 89, rating: 4.9 },
          { id: '2', name: 'Mike Chen', sessions: 76, rating: 4.8 },
          { id: '3', name: 'Emma Davis', sessions: 62, rating: 4.7 }
        ],
        userGrowth: {
          newUsersThisWeek: 23,
          newUsersThisMonth: 87,
          churnRate: 2.1
        }
      };
    }
  }, [isAuthenticated, user]);

  const value: SessionContextType = {
    currentSession,
    sessions,
    sessionAnalytics,
    loading,
    error,
    startSession,
    pauseSession,
    resumeSession,
    completeSession,
    cancelSession,
    addExercise,
    updateExercise,
    completeExercise,
    addSet,
    updateSet,
    completeSet,
    fetchSessions,
    fetchSessionAnalytics,
    saveSessionData,
    fetchClientSessions,
    fetchAllUserSessions,
    fetchTrainerStats,
    fetchAdminStats,
    sessionTimer,
    startTimer,
    pauseTimer,
    resetTimer
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

// Custom hook
export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

export default SessionContext;