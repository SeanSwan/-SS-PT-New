/**
 * SessionContext.tsx
 * Enhanced session management for SwanStudios platform
 * Tracks workout sessions, training progress, and session analytics
 */

import React, { createContext, useState, useEffect, useLayoutEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import apiService from '../services/api.service';
import { logger } from '@/utils/logger';

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

  // User Session Booking (NEW - FIXED ENDPOINTS)
  fetchAvailableSessions: () => Promise<WorkoutSession[]>;
  bookAvailableSession: (sessionId: string) => Promise<void>;

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
  fetchAvailableSessions: async () => [],
  bookAvailableSession: async () => {},
  fetchClientSessions: async () => [],
  fetchAllUserSessions: async () => [],
  fetchTrainerStats: async () => ({}),
  fetchAdminStats: async () => ({}),
  sessionTimer: 0,
  startTimer: () => {},
  pauseTimer: () => {},
  resetTimer: () => {}
});

let sessionTabIdFallbackCounter = 0;

const createSessionTabId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `tab_${globalThis.crypto.randomUUID()}`;
  }

  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const values = new Uint32Array(2);
    globalThis.crypto.getRandomValues(values);
    return `tab_${values[0].toString(36)}_${values[1].toString(36)}`;
  }

  sessionTabIdFallbackCounter += 1;
  return `tab_${Date.now()}_${sessionTabIdFallbackCounter}`;
};

// Provider Component
export const SessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const actorId = isAuthenticated && user?.id != null ? String(user.id).trim() || null : null;
  const actorRole = actorId && typeof user?.role === 'string' ? user.role : null;
  const identity = actorId ? JSON.stringify([actorId, actorRole]) : null;
  const [currentSession, publishCurrentSession] = useState<WorkoutSession | null>(null);
  const [sessions, publishSessions] = useState<WorkoutSession[]>([]);
  const [sessionAnalytics, setSessionAnalytics] = useState<SessionAnalytics | null>(null);
  const [analyticsFromHistory, setAnalyticsFromHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionTimer, publishSessionTimer] = useState(0);
  // These refs are synchronous reads of the same state, not a second session owner.
  const currentSessionRef = useRef(currentSession);
  const sessionsRef = useRef(sessions);
  const sessionTimerRef = useRef(sessionTimer);
  const saveSequenceRef = useRef(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notificationTimersRef = useRef(new Set<ReturnType<typeof setTimeout>>());
  const notificationsRef = useRef(new Set<HTMLElement>());
  const [tabId] = useState(createSessionTabId);
  const isActiveTabRef = useRef(true);
  type Read = { controller: AbortController; loadingToken?: symbol };
  type Admission = { identity: string | null; actorId: string | null; actorRole: string | null;
    active: boolean; reads: Map<string, Read>; pending: Set<symbol> };
  const [admission, setAdmission] = useState<Admission>(() => ({ identity, actorId, actorRole,
    active: false, reads: new Map(), pending: new Set() }));
  const admissionRef = useRef(admission);

  const setCurrentSession = useCallback((next: WorkoutSession | null) => {
    currentSessionRef.current = next;
    publishCurrentSession(next);
  }, []);
  const setSessions = useCallback((next: WorkoutSession[] | ((previous: WorkoutSession[]) => WorkoutSession[])) => {
    const value = typeof next === 'function' ? next(sessionsRef.current) : next;
    sessionsRef.current = value;
    publishSessions(value);
  }, []);
  const setSessionTimer = useCallback((next: number | ((previous: number) => number)) => {
    const value = typeof next === 'function' ? next(sessionTimerRef.current) : next;
    sessionTimerRef.current = value;
    publishSessionTimer(value);
  }, []);
  const clearTimerInterval = useCallback(() => {
    if (timerIntervalRef.current !== null) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = null;
  }, []);
  const clearAutoSaveInterval = useCallback(() => {
    if (autoSaveIntervalRef.current !== null) clearInterval(autoSaveIntervalRef.current);
    autoSaveIntervalRef.current = null;
  }, []);

  // Each committed admission is distinct, even A -> B -> A or StrictMode replay.
  // Do not key this app-wide provider and remount the router beneath it.
  useLayoutEffect(() => {
    const next: Admission = { identity, actorId, actorRole, active: true, reads: new Map(), pending: new Set() };
    admissionRef.current = next;
    setAdmission(next);
    setCurrentSession(null);
    setSessions([]);
    setSessionAnalytics(null);
    setAnalyticsFromHistory(false);
    setLoading(false);
    setError(null);
    setSessionTimer(0);
    isActiveTabRef.current = true;
    return () => {
      next.active = false;
      next.reads.forEach(read => read.controller.abort());
      next.reads.clear();
      next.pending.clear();
      clearTimerInterval();
      clearAutoSaveInterval();
      notificationTimersRef.current.forEach(timer => clearTimeout(timer));
      notificationTimersRef.current.clear();
      notificationsRef.current.forEach(notification => notification.remove());
      notificationsRef.current.clear();
    };
  }, [identity, actorId, actorRole, setCurrentSession, setSessions, setSessionTimer, clearTimerInterval, clearAutoSaveInterval]);

  const isCurrent = useCallback(() => admission.active && admissionRef.current === admission, [admission]);
  const isAdmitted = useCallback(() => isCurrent() && admission.actorId !== null, [admission, isCurrent]);
  const ownsSession = useCallback((value: unknown): value is WorkoutSession => {
    if (!value || typeof value !== 'object' || !admission.actorId) return false;
    const record = value as Partial<WorkoutSession>;
    return String(record.userId ?? '').trim() === admission.actorId
      && typeof record.id === 'string' && record.id.length > 0
      && ['planned', 'active', 'paused', 'completed', 'cancelled'].includes(record.status ?? '')
      && typeof record.startTime === 'string' && Number.isFinite(Date.parse(record.startTime))
      && Array.isArray(record.exercises);
  }, [admission]);
  const readLocalHistory = useCallback((): WorkoutSession[] => {
    if (!isAdmitted()) return [];
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(`sessions_${admission.actorId}`) || '[]');
      return Array.isArray(stored) ? stored.filter(ownsSession) : [];
    } catch {
      logger.warn('[SessionContext] Unable to read local session history');
      return [];
    }
  }, [admission, isAdmitted, ownsSession]);
  const beginLoading = useCallback(() => {
    const token = Symbol('session operation');
    if (isCurrent()) { admission.pending.add(token); setLoading(true); }
    return token;
  }, [admission, isCurrent]);
  const finishLoading = useCallback((token?: symbol) => {
    if (!isCurrent() || !token) return;
    admission.pending.delete(token);
    setLoading(admission.pending.size > 0);
  }, [admission, isCurrent]);
  const beginRead = useCallback((key: string, showLoading = false): Read => {
    const previous = admission.reads.get(key);
    previous?.controller.abort();
    if (previous?.loadingToken) admission.pending.delete(previous.loadingToken);
    const read: Read = { controller: new AbortController(), loadingToken: showLoading ? beginLoading() : undefined };
    admission.reads.set(key, read);
    return read;
  }, [admission, beginLoading]);
  const isLatestRead = useCallback((key: string, read: Read) => isCurrent()
    && admission.reads.get(key) === read && !read.controller.signal.aborted, [admission, isCurrent]);
  const finishRead = useCallback((key: string, read: Read) => {
    if (admission.reads.get(key) === read) admission.reads.delete(key);
    finishLoading(read.loadingToken);
  }, [admission, finishLoading]);
  const isClientGeneratedSessionId = useCallback((sessionId: string): boolean =>
    sessionId.startsWith('session_') || sessionId.startsWith('exercise_') || sessionId.startsWith('set_'), []);

  // Stable callback: ticks/edits change its inputs, never its interval identity.
  const saveSessionData = useCallback(async (): Promise<void> => {
    const snapshot = currentSessionRef.current;
    if (!isAdmitted() || !ownsSession(snapshot)) return;
    const saveSequence = ++saveSequenceRef.current;
    const stillCurrent = () => isAdmitted() && currentSessionRef.current === snapshot
      && saveSequenceRef.current === saveSequence;
    const payload = { ...snapshot, duration: sessionTimerRef.current, updatedAt: new Date().toISOString() };
    if (isClientGeneratedSessionId(snapshot.id)) {
      if (isActiveTabRef.current) localStorage.setItem(`activeSession_${admission.actorId}`, JSON.stringify(payload));
      return; // Standalone sessions remain local; no backend creation or migration.
    }
    try {
      await apiService.put(`/api/sessions/${snapshot.id}`, payload);
    } catch {
      // An issued write may already have executed. Retirement only ends local
      // interest; it cannot restore a cancelled/replaced/edited session snapshot.
      if (stillCurrent() && isActiveTabRef.current) {
        logger.warn('Failed to auto-save session to backend, using localStorage fallback');
        localStorage.setItem(`activeSession_${admission.actorId}`, JSON.stringify(payload));
      }
    }
  }, [admission, isAdmitted, ownsSession, isClientGeneratedSessionId]);

  useEffect(() => {
    if (isAdmitted() && currentSession?.status === 'active') {
      autoSaveIntervalRef.current = setInterval(() => {
        void saveSessionData().catch(() => {
          if (isAdmitted()) logger.warn('[SessionContext] Auto-save failed');
        });
      }, 30000);
    }
    return clearAutoSaveInterval;
  }, [currentSession?.id, currentSession?.status, isAdmitted, saveSessionData, clearAutoSaveInterval]);

  useEffect(() => {
    if (!currentSession || currentSession.status !== 'active') clearTimerInterval();
  }, [clearTimerInterval, currentSession]);

  // Preserve existing tab ownership and storage keys; retire every listener.
  useEffect(() => {
    if (!isAdmitted()) return;
    localStorage.setItem('activeSessionTab', tabId);
    const handleVisibilityChange = () => {
      if (!isAdmitted()) return;
      const nowActive = !document.hidden;
      isActiveTabRef.current = nowActive;
      if (nowActive) {
        const currentActiveTab = localStorage.getItem('activeSessionTab');
        if (!currentActiveTab || currentActiveTab === tabId) localStorage.setItem('activeSessionTab', tabId);
      }
    };
    const handleStorageChange = (event: StorageEvent) => {
      if (!isAdmitted()) return;
      if (event.key === `activeSession_${admission.actorId}` && event.newValue) {
        try {
          const session: unknown = JSON.parse(event.newValue);
          if (ownsSession(session) && localStorage.getItem('activeSessionTab') !== tabId) {
            setCurrentSession(session);
            if (session.status === 'active') setSessionTimer(Math.max(0, Math.floor((Date.now() - Date.parse(session.startTime)) / 1000)));
          }
        } catch {
          logger.warn('[SessionContext] Unable to sync session from another tab');
        }
      }
      if (event.key === 'activeSessionTab' && event.newValue !== tabId) {
        isActiveTabRef.current = false;
        clearTimerInterval();
      }
    };
    const releaseTab = () => {
      if (localStorage.getItem('activeSessionTab') === tabId) localStorage.removeItem('activeSessionTab');
    };
    const handleBeforeUnload = () => { if (isAdmitted()) releaseTab(); };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      releaseTab();
    };
  }, [admission, isAdmitted, ownsSession, tabId, setCurrentSession, setSessionTimer, clearTimerInterval]);

  const fetchSessions = useCallback(async (limit = 10): Promise<void> => {
    if (!isAdmitted()) return;
    const key = '/api/sessions';
    const read = beginRead(key, true);
    try {
      const response = await apiService.get(key, { signal: read.controller.signal });
      if (!isLatestRead(key, read)) return;
      const data = response.data?.sessions ?? response.data;
      if (data) setSessions(Array.isArray(data) ? data.slice(0, limit) : []);
    } catch {
      if (!isLatestRead(key, read)) return;
      logger.warn('Failed to fetch sessions from backend, using local storage');
      setSessions(readLocalHistory().slice(0, limit));
    } finally {
      finishRead(key, read);
    }
  }, [isAdmitted, beginRead, isLatestRead, finishRead, setSessions, readLocalHistory]);

  const fetchSessionAnalytics = useCallback(async (): Promise<void> => {
    if (!isAdmitted()) return;
    const key = '/api/sessions/analytics';
    const read = beginRead(key);
    try {
      const response = await apiService.get(key, { signal: read.controller.signal });
      if (isLatestRead(key, read) && response.data) {
        setSessionAnalytics(response.data);
        setAnalyticsFromHistory(false);
      }
    } catch {
      if (!isLatestRead(key, read)) return;
      logger.warn('Failed to fetch analytics from backend');
      // Keep the fallback derived from current history, including history that
      // resolves after this request. Updating it must never issue another read.
      setAnalyticsFromHistory(true);
    } finally {
      finishRead(key, read);
    }
  }, [isAdmitted, beginRead, isLatestRead, finishRead]);

  const showSessionNotification = useCallback((message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    if (!isAdmitted()) return;
    const colors = {
      success: { bg: 'linear-gradient(135deg, #60C0F0, #0080ff)', color: '#000' }, // swan-guard-allow-hex Existing notification palette retained for lifecycle-only repair.
      info: { bg: 'linear-gradient(135deg, #4facfe, #00f2fe)', color: '#000' }, // swan-guard-allow-hex Existing notification palette retained for lifecycle-only repair.
      warning: { bg: 'linear-gradient(135deg, #ffa726, #ff9800)', color: '#000' }, // swan-guard-allow-hex Existing notification palette retained for lifecycle-only repair.
      error: { bg: 'linear-gradient(135deg, #ff6b9d, #ff4d6d)', color: '#fff' } // swan-guard-allow-hex Existing notification palette retained for lifecycle-only repair.
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
    notificationsRef.current.add(notification);
    const schedule = (callback: () => void, delay: number) => {
      const timer = setTimeout(() => {
        notificationTimersRef.current.delete(timer);
        if (isAdmitted()) callback();
      }, delay);
      notificationTimersRef.current.add(timer);
    };
    schedule(() => { notification.style.transform = 'translateX(0)'; }, 100);
    schedule(() => {
      notification.style.transform = 'translateX(100%)';
      schedule(() => { notification.remove(); notificationsRef.current.delete(notification); }, 300);
    }, 4000);
  }, [isAdmitted]);

  const startTimer = useCallback(() => {
    if (!isAdmitted() || currentSessionRef.current?.status !== 'active') return;
    clearTimerInterval();
    timerIntervalRef.current = setInterval(() => {
      if (isAdmitted()) setSessionTimer(previous => previous + 1);
    }, 1000);
  }, [isAdmitted, clearTimerInterval, setSessionTimer]);
  const pauseTimer = useCallback(() => { if (isAdmitted()) clearTimerInterval(); }, [isAdmitted, clearTimerInterval]);
  const resetTimer = useCallback(() => {
    if (!isAdmitted()) return;
    clearTimerInterval();
    setSessionTimer(0);
  }, [isAdmitted, clearTimerInterval, setSessionTimer]);

  // Only a new committed actor admission boots; arrays and profile refreshes do not.
  useEffect(() => {
    if (!isAdmitted()) return;
    void fetchSessions(10);
    void fetchSessionAnalytics();
    const savedSession = localStorage.getItem(`activeSession_${admission.actorId}`);
    if (savedSession) {
      try {
        const parsed: unknown = JSON.parse(savedSession);
        if (!ownsSession(parsed)) return;
        setCurrentSession(parsed);
        if (parsed.status === 'active') {
          setSessionTimer(Math.max(0, Math.floor((Date.now() - Date.parse(parsed.startTime)) / 1000)));
          startTimer();
        }
      } catch {
        logger.warn('[SessionContext] Unable to restore local session');
        localStorage.removeItem(`activeSession_${admission.actorId}`);
      }
    }
  }, [admission, isAdmitted, ownsSession, fetchSessions, fetchSessionAnalytics, setCurrentSession, setSessionTimer, startTimer]);

  const startSession = useCallback(async (workoutPlanId?: string, title?: string): Promise<WorkoutSession> => {
    if (!isAdmitted()) throw new Error('User must be logged in with a current session admission');
    if (currentSessionRef.current?.status === 'active') throw new Error('A session is already active. Please complete or cancel the current session first.');
    const operation = beginLoading();
    setError(null);
    try {
      const newSession: WorkoutSession = {
        id: `session_${Date.now()}`, userId: admission.actorId!, workoutPlanId,
        title: title || `Workout Session ${new Date().toLocaleDateString()}`,
        duration: 0, status: 'active', startTime: new Date().toISOString(), exercises: [],
        difficulty: 3, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      };
      setCurrentSession(newSession);
      if (isActiveTabRef.current) localStorage.setItem(`activeSession_${admission.actorId}`, JSON.stringify(newSession));
      resetTimer();
      startTimer();
      showSessionNotification('Workout session started! Let\'s get moving! 💪', 'success');
      return newSession;
    } catch (failure: any) {
      const message = failure.message || 'Failed to start session';
      if (isAdmitted()) { setError(message); showSessionNotification(message, 'error'); }
      throw failure;
    } finally {
      finishLoading(operation);
    }
  }, [admission, isAdmitted, beginLoading, finishLoading, setCurrentSession, resetTimer, startTimer, showSessionNotification]);

  const pauseSession = useCallback(async (): Promise<void> => {
    if (!isAdmitted()) return;
    const snapshot = currentSessionRef.current;
    if (!ownsSession(snapshot) || snapshot.status !== 'active') throw new Error('No active session to pause');
    const operation = beginLoading();
    try {
      const updatedSession = { ...snapshot, status: 'paused' as const, duration: sessionTimerRef.current, updatedAt: new Date().toISOString() };
      setCurrentSession(updatedSession);
      if (isActiveTabRef.current) localStorage.setItem(`activeSession_${admission.actorId}`, JSON.stringify(updatedSession));
      pauseTimer();
      showSessionNotification('Session paused. Take a break! ⏸️', 'info');
      if (!isClientGeneratedSessionId(snapshot.id)) {
        try { await apiService.put(`/api/sessions/${snapshot.id}`, updatedSession); }
        catch { if (isAdmitted()) logger.warn('Failed to update session on backend'); }
      }
    } catch (failure: any) {
      if (isAdmitted()) { const message = failure.message || 'Failed to pause session'; setError(message); showSessionNotification(message, 'error'); }
    } finally { finishLoading(operation); }
  }, [admission, isAdmitted, ownsSession, beginLoading, finishLoading, setCurrentSession, pauseTimer, showSessionNotification, isClientGeneratedSessionId]);

  const resumeSession = useCallback(async (): Promise<void> => {
    if (!isAdmitted()) return;
    const snapshot = currentSessionRef.current;
    if (!ownsSession(snapshot) || snapshot.status !== 'paused') throw new Error('No paused session to resume');
    const operation = beginLoading();
    try {
      const updatedSession = { ...snapshot, status: 'active' as const, updatedAt: new Date().toISOString() };
      setCurrentSession(updatedSession);
      if (isActiveTabRef.current) localStorage.setItem(`activeSession_${admission.actorId}`, JSON.stringify(updatedSession));
      startTimer();
      showSessionNotification('Session resumed! Keep going! 🔥', 'success');
      if (!isClientGeneratedSessionId(snapshot.id)) {
        try { await apiService.put(`/api/sessions/${snapshot.id}`, updatedSession); }
        catch { if (isAdmitted()) logger.warn('Failed to update session on backend'); }
      }
    } catch (failure: any) {
      if (isAdmitted()) { const message = failure.message || 'Failed to resume session'; setError(message); showSessionNotification(message, 'error'); }
    } finally { finishLoading(operation); }
  }, [admission, isAdmitted, ownsSession, beginLoading, finishLoading, setCurrentSession, startTimer, showSessionNotification, isClientGeneratedSessionId]);

  const completeSession = useCallback(async (notes?: string): Promise<void> => {
    if (!isAdmitted()) return;
    const snapshot = currentSessionRef.current;
    if (!ownsSession(snapshot)) throw new Error('No session to complete');
    const operation = beginLoading();
    const elapsed = sessionTimerRef.current;
    try {
      const completedSession = { ...snapshot, status: 'completed' as const, endTime: new Date().toISOString(),
        duration: elapsed, notes, updatedAt: new Date().toISOString() };
      setSessions(previous => [completedSession, ...previous]);
      setCurrentSession(null);
      if (isActiveTabRef.current) localStorage.removeItem(`activeSession_${admission.actorId}`);
      pauseTimer();
      resetTimer();
      showSessionNotification(`Great job! Session completed in ${Math.floor(elapsed / 60)} minutes! 🎉`, 'success');
      const saveHistory = () => {
        if (!isAdmitted()) return;
        const localSessions = readLocalHistory();
        localSessions.unshift(completedSession);
        localStorage.setItem(`sessions_${admission.actorId}`, JSON.stringify(localSessions.slice(0, 50)));
      };
      if (!isClientGeneratedSessionId(snapshot.id)) {
        try { await apiService.put(`/api/sessions/${snapshot.id}`, completedSession); }
        catch { if (isAdmitted()) { logger.warn('Failed to save completed session to backend'); saveHistory(); } }
      } else saveHistory();
      if (isAdmitted()) void fetchSessionAnalytics();
    } catch (failure: any) {
      if (isAdmitted()) { const message = failure.message || 'Failed to complete session'; setError(message); showSessionNotification(message, 'error'); }
    } finally { finishLoading(operation); }
  }, [admission, isAdmitted, ownsSession, beginLoading, finishLoading, setSessions, setCurrentSession, pauseTimer, resetTimer,
    showSessionNotification, readLocalHistory, isClientGeneratedSessionId, fetchSessionAnalytics]);

  const cancelSession = useCallback(async (): Promise<void> => {
    if (!isAdmitted() || !ownsSession(currentSessionRef.current)) return;
    setCurrentSession(null);
    if (isActiveTabRef.current) localStorage.removeItem(`activeSession_${admission.actorId}`);
    pauseTimer();
    resetTimer();
    showSessionNotification('Session cancelled', 'warning');
  }, [admission, isAdmitted, ownsSession, setCurrentSession, pauseTimer, resetTimer, showSessionNotification]);

  const addExercise = useCallback(async (exercise: Omit<SessionExercise, 'id' | 'completed'>): Promise<void> => {
    if (!isAdmitted()) return;
    const snapshot = currentSessionRef.current;
    if (!ownsSession(snapshot)) throw new Error('No active session');
    const newExercise: SessionExercise = { ...exercise, id: `exercise_${Date.now()}`, completed: false };
    const updatedSession = { ...snapshot, exercises: [...snapshot.exercises, newExercise], updatedAt: new Date().toISOString() };
    setCurrentSession(updatedSession);
    if (isActiveTabRef.current) localStorage.setItem(`activeSession_${admission.actorId}`, JSON.stringify(updatedSession));
    showSessionNotification(`${exercise.exerciseName} added to session`, 'success');
  }, [admission, isAdmitted, ownsSession, setCurrentSession, showSessionNotification]);

  const updateExercise = useCallback(async (exerciseId: string, updates: Partial<SessionExercise>): Promise<void> => {
    if (!isAdmitted()) return;
    const snapshot = currentSessionRef.current;
    if (!ownsSession(snapshot)) throw new Error('No active session');
    const updatedSession = { ...snapshot, exercises: snapshot.exercises.map(ex => ex.id === exerciseId ? { ...ex, ...updates } : ex),
      updatedAt: new Date().toISOString() };
    setCurrentSession(updatedSession);
    if (isActiveTabRef.current) localStorage.setItem(`activeSession_${admission.actorId}`, JSON.stringify(updatedSession));
  }, [admission, isAdmitted, ownsSession, setCurrentSession]);
  const completeExercise = useCallback(async (exerciseId: string): Promise<void> => {
    if (!isAdmitted()) return;
    await updateExercise(exerciseId, { completed: true });
    showSessionNotification('Exercise completed! 💪', 'success');
  }, [isAdmitted, updateExercise, showSessionNotification]);

  const addSet = useCallback(async (exerciseId: string, set: Omit<ExerciseSet, 'id' | 'completed'>): Promise<void> => {
    if (!isAdmitted()) return;
    const snapshot = currentSessionRef.current;
    if (!ownsSession(snapshot)) throw new Error('No active session');
    const newSet: ExerciseSet = { ...set, id: `set_${Date.now()}`, completed: false };
    const updatedSession = { ...snapshot, exercises: snapshot.exercises.map(ex => ex.id === exerciseId ? { ...ex, sets: [...ex.sets, newSet] } : ex),
      updatedAt: new Date().toISOString() };
    setCurrentSession(updatedSession);
    if (isActiveTabRef.current) localStorage.setItem(`activeSession_${admission.actorId}`, JSON.stringify(updatedSession));
  }, [admission, isAdmitted, ownsSession, setCurrentSession]);
  const updateSet = useCallback(async (exerciseId: string, setId: string, updates: Partial<ExerciseSet>): Promise<void> => {
    if (!isAdmitted()) return;
    const snapshot = currentSessionRef.current;
    if (!ownsSession(snapshot)) throw new Error('No active session');
    const updatedSession = { ...snapshot, exercises: snapshot.exercises.map(ex => ex.id === exerciseId
      ? { ...ex, sets: ex.sets.map(set => set.id === setId ? { ...set, ...updates } : set) } : ex), updatedAt: new Date().toISOString() };
    setCurrentSession(updatedSession);
    if (isActiveTabRef.current) localStorage.setItem(`activeSession_${admission.actorId}`, JSON.stringify(updatedSession));
  }, [admission, isAdmitted, ownsSession, setCurrentSession]);
  const completeSet = useCallback(async (exerciseId: string, setId: string): Promise<void> => {
    if (!isAdmitted()) return;
    await updateSet(exerciseId, setId, { completed: true });
    showSessionNotification('Set completed! Keep it up! 🔥', 'success');
  }, [isAdmitted, updateSet, showSessionNotification]);

  // Returned private data is fenced too; guarding setState alone misses callers.
  const readData = useCallback(async <T,>(url: string, empty: T): Promise<T> => {
    if (!isCurrent()) return empty;
    const read = beginRead(url);
    try {
      const response = await apiService.get<T>(url, { signal: read.controller.signal });
      return isLatestRead(url, read) ? response.data || empty : empty;
    } catch {
      if (isLatestRead(url, read)) logger.warn('[SessionContext] Session data request failed');
      return empty;
    } finally { finishRead(url, read); }
  }, [isCurrent, beginRead, isLatestRead, finishRead]);
  const fetchAvailableSessions = useCallback(async (): Promise<WorkoutSession[]> =>
    readData('/api/sessions/available', []), [readData]);
  const bookAvailableSession = useCallback(async (sessionId: string): Promise<void> => {
    if (!isAdmitted()) throw new Error('User must be logged in to book a session');
    const operation = beginLoading();
    try {
      await apiService.post(`/api/sessions/book/${admission.actorId}`, { sessionId });
      if (!isAdmitted()) return;
      showSessionNotification('Session booked successfully! 📅', 'success');
      await fetchSessions();
    } catch (failure: any) {
      if (!isAdmitted()) return;
      const message = failure.response?.data?.message || failure.message || 'Failed to book session';
      setError(message);
      showSessionNotification(message, 'error');
      throw failure;
    } finally { finishLoading(operation); }
  }, [admission, isAdmitted, beginLoading, finishLoading, showSessionNotification, fetchSessions]);
  const fetchClientSessions = useCallback(async (clientId?: string): Promise<WorkoutSession[]> => {
    if (!isAdmitted()) return [];
    const targetId = clientId || (admission.actorRole === 'client' ? admission.actorId : null);
    return targetId ? readData(`/api/sessions/client/${targetId}`, []) : [];
  }, [admission, isAdmitted, readData]);
  const fetchAllUserSessions = useCallback(async (): Promise<WorkoutSession[]> =>
    isAdmitted() && admission.actorRole === 'admin' ? readData('/api/admin/all-sessions', []) : [], [admission, isAdmitted, readData]);
  const fetchTrainerStats = useCallback(async (): Promise<any> =>
    isAdmitted() && ['trainer', 'admin'].includes(admission.actorRole ?? '') ? readData('/api/trainer/stats', {}) : {}, [admission, isAdmitted, readData]);
  const fetchAdminStats = useCallback(async (): Promise<any> =>
    isAdmitted() && admission.actorRole === 'admin' ? readData('/api/admin/session-stats', {}) : {}, [admission, isAdmitted, readData]);

  // Mask in the actor-changing render, before any layout/passive cleanup runs.
  const visible = admission.identity === identity && admission.active && admissionRef.current === admission;
  let resolvedAnalytics = sessionAnalytics;
  if (analyticsFromHistory) {
    const totalSessions = sessions.length;
    const totalDuration = sessions.reduce((sum, session) => sum + session.duration, 0);
    resolvedAnalytics = { totalSessions, totalDuration, averageDuration: totalSessions > 0 ? totalDuration / totalSessions : 0,
      caloriesBurned: sessions.reduce((sum, session) => sum + (session.caloriesBurned || 0), 0),
      favoriteExercises: [], weeklyProgress: [], currentStreak: 0, longestStreak: 0 };
  }
  const value: SessionContextType = {
    currentSession: visible ? currentSession : null,
    sessions: visible ? sessions : [],
    sessionAnalytics: visible ? resolvedAnalytics : null,
    loading: visible ? loading : false,
    error: visible ? error : null,
    sessionTimer: visible ? sessionTimer : 0,
    startSession, pauseSession, resumeSession, completeSession, cancelSession,
    addExercise, updateExercise, completeExercise, addSet, updateSet, completeSet,
    fetchSessions, fetchSessionAnalytics, saveSessionData, fetchAvailableSessions, bookAvailableSession,
    fetchClientSessions, fetchAllUserSessions, fetchTrainerStats, fetchAdminStats, startTimer, pauseTimer, resetTimer
  };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

// Custom hook


export default SessionContext;
