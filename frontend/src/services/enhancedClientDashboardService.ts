/**
 * Enhanced Client Dashboard Service
 * ================================
 * 
 * Compatibility service layer for real-time client dashboard data,
 * and cross-dashboard functionality for the SwanStudios platform.
 * 
 * Features:
 * - First-party gamification API integration
 * - Real-time WebSocket connections
 * - Schedule service integration  
 * - Cross-dashboard data sharing
 * - Error handling and retry logic
 * 
 * Master Prompt v28 Alignment:
 * - Backend architecture integration
 * - First-party API communication
 * - Real-time data flow
 * - Security and performance optimization
 */

import axios, { AxiosResponse } from 'axios';
import { io, Socket } from 'socket.io-client';
import { logger } from '@/utils/logger';
import {
  resolveRealtimeSocketTransportOptions,
  resolveRealtimeSocketUrl,
} from '@/utils/realtimeSocketUrl';

// === TYPE DEFINITIONS ===
interface SessionEvent {
  id: string;
  title: string;
  sessionDate?: string | Date;
  start: Date;
  end: Date;
  status: 'available' | 'booked' | 'confirmed' | 'completed' | 'cancelled' | 'blocked';
  userId?: string;
  trainerId?: string;
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
}

interface GamificationData {
  userId: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  totalXp: number;
  streak: number;
  badges: Badge[];
  achievements: Achievement[];
  leaderboardPosition: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  earnedDate?: Date;
  isUnlocked: boolean;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  completedDate?: Date;
  progress?: number;
  maxProgress?: number;
}

interface ClientDashboardData {
  sessions: SessionEvent[];
  gamification: GamificationData;
  notifications: Notification[];
  stats: DashboardStats;
}

interface DashboardStats {
  totalWorkouts: number;
  weeklyWorkouts: number;
  monthlyWorkouts: number;
  currentStreak: number;
  longestStreak: number;
  averageWorkoutDuration: number;
  caloriesBurned: number;
  goalsCompleted: number;
}

// === CONFIGURATION ===
// Robust configuration that works in all environments
const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production' || window.location.hostname !== 'localhost';
const PRODUCTION_URL = 'https://sswanstudios.com';
const DEVELOPMENT_URL = 'http://localhost:10000';

// Primary API configuration with environment-specific API roots.
const API_BASE_URL = isProduction 
  ? PRODUCTION_URL
  : (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || DEVELOPMENT_URL);

const WEBSOCKET_URL = resolveRealtimeSocketUrl({
  socketUrl: import.meta.env.VITE_WEBSOCKET_URL || import.meta.env.VITE_SOCKET_URL,
  backendUrl: import.meta.env.VITE_BACKEND_URL,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  isDev: !isProduction,
  windowOrigin: typeof window !== 'undefined' ? window.location.origin : '',
});
const WEBSOCKET_TRANSPORT_OPTIONS = resolveRealtimeSocketTransportOptions(WEBSOCKET_URL);

// Debug logging for configuration verification
logger.log('🔧 EnhancedClientDashboardService Configuration:', {
  isProduction,
  API_BASE_URL,
  WEBSOCKET_URL,
  hostname: window.location.hostname,
  environment: import.meta.env.MODE
});

// Create axios instances with interceptors
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// === REQUEST INTERCEPTORS ===
apiClient.interceptors.request.use(
  (config) => {
    // Fix: Use correct token key that matches AuthContext
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// === RESPONSE INTERCEPTORS ===
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// === WEBSOCKET MANAGER ===
class WebSocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;

  connect(userId: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      try {
        // Create socket with more lenient timeout settings
        this.socket = io(WEBSOCKET_URL, {
          auth: {
            token: localStorage.getItem('token') || localStorage.getItem('auth_token'),
            userId: userId,
          },
          ...WEBSOCKET_TRANSPORT_OPTIONS,
          timeout: 5000, // 5 second timeout
          forceNew: true,
          reconnection: true,
          reconnectionAttempts: 3,
          reconnectionDelay: 1000,
        });

        // Set up a timeout to resolve with null if connection fails
        const connectionTimeout = setTimeout(() => {
          logger.log('⚠️ WebSocket connection timeout - continuing without real-time features');
          this.socket?.disconnect();
          this.socket = null;
          resolve(null as any); // Resolve with null to continue without WebSocket
        }, 3000); // 3 second timeout

        this.socket.on('connect', () => {
          logger.log('✅ WebSocket connected successfully');
          clearTimeout(connectionTimeout);
          this.reconnectAttempts = 0;
          this.setupEventListeners();
          resolve(this.socket!);
        });

        this.socket.on('disconnect', (reason) => {
          logger.log('⚠️ WebSocket disconnected:', reason);
          this.handleReconnection();
        });

        this.socket.on('connect_error', (error) => {
          logger.log('⚠️ WebSocket connection error (will continue without real-time):', error.message);
          clearTimeout(connectionTimeout);
          this.socket = null;
          resolve(null as any); // Resolve with null instead of rejecting
        });

      } catch (error) {
        logger.log('⚠️ Failed to initialize WebSocket (will continue without real-time):', error);
        resolve(null as any); // Resolve with null instead of rejecting
      }
    });
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Gamification events
    this.socket.on('xp_updated', (data) => {
      logger.log('🎯 XP Updated:', data);
      // Trigger gamification update in UI
      window.dispatchEvent(new CustomEvent('gamification:xp_updated', { detail: data }));
    });

    this.socket.on('badge_earned', (data) => {
      logger.log('🏆 Badge Earned:', data);
      window.dispatchEvent(new CustomEvent('gamification:badge_earned', { detail: data }));
    });

    this.socket.on('level_up', (data) => {
      logger.log('⬆️ Level Up:', data);
      window.dispatchEvent(new CustomEvent('gamification:level_up', { detail: data }));
    });

    // Session events
    this.socket.on('session_booked', (data) => {
      logger.log('📅 Session Booked:', data);
      window.dispatchEvent(new CustomEvent('schedule:session_booked', { detail: data }));
    });

    this.socket.on('session_cancelled', (data) => {
      logger.log('❌ Session Cancelled:', data);
      window.dispatchEvent(new CustomEvent('schedule:session_cancelled', { detail: data }));
    });

    this.socket.on('session_confirmed', (data) => {
      logger.log('✅ Session Confirmed:', data);
      window.dispatchEvent(new CustomEvent('schedule:session_confirmed', { detail: data }));
    });

    // Notification events
    this.socket.on('new_notification', (data) => {
      logger.log('🔔 New Notification:', data);
      window.dispatchEvent(new CustomEvent('notifications:new', { detail: data }));
    });
  }

  private handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    logger.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      if (this.socket) {
        this.socket.connect();
      }
    }, this.reconnectInterval * this.reconnectAttempts);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

// === SERVICE CLASS ===
class EnhancedClientDashboardService {
  private _wsManager = new WebSocketManager();
  private userId: string | null = null;
  
  // Expose wsManager for connection status checking
  get wsManager(): WebSocketManager {
    return this._wsManager;
  }

  // === INITIALIZATION ===
  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    
    try {
      // Attempt WebSocket connection (optional)
      const socket = await this._wsManager.connect(userId);
      
      if (socket) {
        logger.log('🚀 Enhanced Client Dashboard Service initialized with real-time features');
      } else {
        logger.log('🚀 Enhanced Client Dashboard Service initialized (polling mode - no real-time features)');
      }
    } catch (error) {
      // Don't throw error if WebSocket fails - continue without real-time features
      logger.log('⚠️ WebSocket unavailable, continuing in polling mode:', error);
    }
  }

  // === SCHEDULE SERVICES ===
  async getSessions(filters: Record<string, any> = {}): Promise<SessionEvent[]> {
    try {
      // Add userId to filters if not present
      if (!filters.userId && this.userId) {
        filters.userId = this.userId;
      }
      
      const response: AxiosResponse<{ success: boolean; sessions: SessionEvent[]; message?: string }> = await apiClient.get('/api/schedule', {
        params: filters,
      });
      
      // Handle both old and new response formats
      let sessions: SessionEvent[] = [];
      
      if (response.data?.success && response.data?.sessions) {
        // New format with success flag
        sessions = response.data.sessions;
      } else if (Array.isArray(response.data)) {
        // Old format - direct array
        sessions = response.data;
      } else if (response.data?.sessions) {
        // Older response shape - sessions property exists.
        sessions = response.data.sessions;
      }
      
      return sessions.map(session => ({
        ...session,
        start: new Date(session.start || session.sessionDate),
        end: new Date(session.end || new Date(new Date(session.start || session.sessionDate).getTime() + (session.duration || 60) * 60000)),
      }));
    } catch (error) {
      logger.warn('Sessions unavailable; returning an empty session state');
      return [];
    }
  }

  async bookSession(sessionId: string): Promise<SessionEvent> {
    try {
      const response: AxiosResponse<{ session: SessionEvent }> = await apiClient.post(`/api/sessions/${sessionId}/book`, {});
      
      return {
        ...response.data.session,
        start: new Date(response.data.session.start),
        end: new Date(response.data.session.end),
      };
    } catch (error) {
      console.error('❌ Error booking session:', error);
      throw error;
    }
  }

  async cancelSession(sessionId: string): Promise<void> {
    try {
      await apiClient.patch(`/api/sessions/${sessionId}/cancel`, {
        reason: 'Cancelled from client dashboard'
      });
    } catch (error) {
      console.error('❌ Error cancelling session:', error);
      throw error;
    }
  }

  // === GAMIFICATION SERVICES ===
  async getGamificationData(userId?: string): Promise<GamificationData> {
    try {
      const targetUserId = userId || this.userId;
      if (!targetUserId) return this.getEmptyGamificationData();

      const [profileResponse, achievementsResponse] = await Promise.all([
        apiClient.get('/api/v1/gamification/profile'),
        apiClient.get('/api/v1/gamification/achievements')
      ]);
      const profile = profileResponse.data?.profile || {};
      const achievements = achievementsResponse.data?.achievements || [];

      return {
        userId: String(targetUserId),
        level: profile.level || 0,
        xp: profile.points || 0,
        xpToNextLevel: profile.nextLevelPoints || 100,
        totalXp: profile.points || 0,
        streak: profile.streakDays || 0,
        badges: this.transformBadges(profile.badges || []),
        achievements: this.transformAchievements(achievements),
        leaderboardPosition: profile.leaderboardPosition || 0,
      };
    } catch (error) {
      console.error('Error fetching gamification data from SwanStudios APIs:', error);
      return this.getEmptyGamificationData();
    }
  }

  async recordWorkoutCompletion(workoutData: {
    workoutId: string;
    duration: number;
    exercisesCompleted: number;
    caloriesBurned?: number;
  }): Promise<GamificationData> {
    try {
      // Gamification rewards are recorded by the backend API.
      const response: AxiosResponse<any> = await apiClient.post(
        `/api/gamification/record-workout`,
        {
          userId: this.userId,
          ...workoutData,
        }
      );

      // After recording, get updated gamification data
      return await this.getGamificationData();
    } catch (error) {
      console.error('❌ Error recording workout completion:', error);
      // Still return current data even if recording failed
      return await this.getGamificationData();
    }
  }

  async getLeaderboard(timeframe: 'week' | 'month' | 'all' = 'week'): Promise<any[]> {
    try {
      // Use backend API for leaderboard data
      const response: AxiosResponse<{ leaderboard: any[] }> = await apiClient.get(
        `/api/v1/gamification/leaderboard`,
        {
          params: { timeframe },
        }
      );

      return response.data.leaderboard || [];
    } catch (error) {
      console.error('❌ Error fetching leaderboard:', error);
      return [];
    }
  }

  // === DASHBOARD STATS ===
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const response: AxiosResponse<{ stats: DashboardStats }> = await apiClient.get(
        `/api/dashboard/stats`
      );
      
      if (response.data?.stats) {
        return response.data.stats;
      }
      
      return this.getEmptyStats();
    } catch (error) {
      return this.getEmptyStats();
    }
  }

  // === NOTIFICATIONS ===
  async getNotifications(): Promise<Notification[]> {
    try {
      const response: AxiosResponse<{ notifications: Notification[] }> = await apiClient.get(
        `/api/notifications`
      );
      
      if (response.data?.notifications) {
        return response.data.notifications;
      }
      
      return [];
    } catch (error) {
      return [];
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      await apiClient.patch(`/api/notifications/${notificationId}/read`);
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      throw error;
    }
  }

  // === COMPREHENSIVE DASHBOARD DATA ===
  async getCompleteDashboardData(): Promise<ClientDashboardData> {
    try {
      const [sessions, gamification, notifications, stats] = await Promise.allSettled([
        this.getSessions(),
        this.getGamificationData(),
        this.getNotifications(),
        this.getDashboardStats(),
      ]);

      return {
        sessions: sessions.status === 'fulfilled' ? sessions.value : [],
        gamification: gamification.status === 'fulfilled' ? gamification.value : this.getEmptyGamificationData(),
        notifications: notifications.status === 'fulfilled' ? notifications.value : [],
        stats: stats.status === 'fulfilled' ? stats.value : this.getEmptyStats(),
      };
    } catch (error) {
      console.error('❌ Error fetching complete dashboard data:', error);
      throw error;
    }
  }

  // === HELPER METHODS ===
  private transformBadges(badges: any[]): Badge[] {
    return badges.map(badge => ({
      id: badge.id || badge.name || 'unknown',
      name: badge.name || 'Achievement',
      description: badge.description || 'Well done!',
      icon: badge.icon || '🏆',
      category: badge.category || 'general',
      earnedDate: badge.earnedDate ? new Date(badge.earnedDate) : new Date(),
      isUnlocked: badge.isUnlocked !== false,
    }));
  }

  private transformAchievements(achievements: any[]): Achievement[] {
    return achievements.map(achievement => ({
      id: achievement.id || achievement.title || 'unknown',
      title: achievement.title || 'Achievement',
      description: achievement.description || 'Well done!',
      xpReward: achievement.xpReward || 100,
      completedDate: achievement.completedDate ? new Date(achievement.completedDate) : new Date(),
      progress: achievement.progress || 100,
      maxProgress: achievement.maxProgress || 100,
    }));
  }

  // === EMPTY STATES ===
  private getEmptyGamificationData(): GamificationData {
    return {
      userId: this.userId || '',
      level: 0,
      xp: 0,
      xpToNextLevel: 100,
      totalXp: 0,
      streak: 0,
      badges: [],
      achievements: [],
      leaderboardPosition: 0,
    };
  }

  private getEmptyStats(): DashboardStats {
    return {
      totalWorkouts: 0,
      weeklyWorkouts: 0,
      monthlyWorkouts: 0,
      currentStreak: 0,
      longestStreak: 0,
      averageWorkoutDuration: 0,
      caloriesBurned: 0,
      goalsCompleted: 0,
    };
  }


  // === CLEANUP ===
  cleanup(): void {
    this._wsManager.disconnect();
    this.userId = null;
  }
}

// === SINGLETON INSTANCE ===
export const clientDashboardService = new EnhancedClientDashboardService();

// === EXPORTS ===
export default clientDashboardService;
export type {
  SessionEvent,
  GamificationData,
  Badge,
  Achievement,
  ClientDashboardData,
  DashboardStats,
};
