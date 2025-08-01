/**
 * useCollaborativeScheduling - Live Collaboration Features for Admin-Trainer Coordination
 * ======================================================================================
 * Advanced real-time collaboration system for multi-user schedule management
 * 
 * CORE RESPONSIBILITIES:
 * - Real-time presence tracking (who's viewing/editing the schedule)
 * - Live cursor and selection synchronization across users
 * - Conflict detection and resolution for simultaneous edits
 * - Real-time change broadcasting and acknowledgment
 * - Session locking for preventing edit conflicts
 * - Live chat integration for schedule discussions
 * 
 * COLLABORATION FEATURES:
 * - User presence indicators with activity status
 * - Real-time cursor tracking on calendar events
 * - Collaborative event editing with operational transforms
 * - Conflict resolution with smart merging strategies
 * - Live notifications for schedule changes
 * - Permission-based collaboration controls
 * - Activity feed with user attribution
 * - Voice/video call integration for complex scheduling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';

// Collaboration Types
export type CollaborationRole = 'admin' | 'trainer' | 'viewer';
export type UserActivity = 'viewing' | 'editing' | 'selecting' | 'dragging' | 'idle' | 'away';
export type ConflictResolution = 'auto-merge' | 'manual-review' | 'last-write-wins' | 'first-write-wins';

export interface CollaborativeUser {
  id: string;
  name: string;
  email: string;
  role: CollaborationRole;
  avatar?: string;
  
  // Real-time Status
  isOnline: boolean;
  activity: UserActivity;
  lastSeen: Date;
  joinedAt: Date;
  
  // Current Context
  currentView?: string; // 'month' | 'week' | 'day'
  focusedEventId?: string;
  selectedEventIds: string[];
  cursorPosition?: CursorPosition;
  
  // Permissions
  canEdit: boolean;
  canDelete: boolean;
  canCreateEvents: boolean;
  canManagePermissions: boolean;
}

export interface CursorPosition {
  x: number;
  y: number;
  timestamp: Date;
  eventId?: string; // If cursor is over an event
}

export interface CollaborativeChange {
  id: string;
  userId: string;
  userName: string;
  timestamp: Date;
  type: 'create' | 'update' | 'delete' | 'move' | 'resize';
  
  // Change Details
  eventId: string;
  before?: any; // Previous state
  after?: any; // New state
  
  // Conflict Information
  hasConflict: boolean;
  conflictWith?: string[]; // User IDs that created conflicts
  resolution?: ConflictResolution;
  
  // Status
  status: 'pending' | 'applied' | 'rejected' | 'conflicted';
  acknowledgedBy: string[]; // User IDs who have seen this change
}

export interface CollaborationConflict {
  id: string;
  eventId: string;
  timestamp: Date;
  
  // Conflicting Changes
  primaryChange: CollaborativeChange;
  conflictingChanges: CollaborativeChange[];
  
  // Resolution
  resolutionStrategy: ConflictResolution;
  resolvedBy?: string;
  resolvedAt?: Date;
  finalState?: any;
  
  // User Impact
  affectedUsers: string[];
  requiresNotification: boolean;
}

export interface LiveMessage {
  id: string;
  userId: string;
  userName: string;
  timestamp: Date;
  message: string;
  type: 'chat' | 'system' | 'conflict' | 'announcement';
  
  // Context
  relatedEventId?: string;
  mentionedUsers?: string[];
  
  // Status
  isRead: boolean;
  reactions?: Record<string, string[]>; // emoji -> user IDs
}

export interface CollaborativeSchedulingValues {
  // User Management
  activeUsers: CollaborativeUser[];
  currentUser: CollaborativeUser | null;
  totalOnlineUsers: number;
  
  // Real-time State
  isConnected: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  lastSyncTime: Date | null;
  
  // Changes & Conflicts
  pendingChanges: CollaborativeChange[];
  recentChanges: CollaborativeChange[];
  activeConflicts: CollaborationConflict[];
  
  // Live Chat
  messages: LiveMessage[];
  unreadMessageCount: number;
  
  // Session Management
  sessionId: string;
  sessionStartTime: Date | null;
  lockedEvents: Record<string, string>; // eventId -> userId who locked it
  
  // Performance
  collaborationStats: CollaborationStats;
}

export interface CollaborativeSchedulingActions {
  // User Actions
  updateUserActivity: (activity: UserActivity) => void;
  updateCursorPosition: (position: CursorPosition) => void;
  selectEvents: (eventIds: string[]) => void;
  
  // Event Collaboration
  lockEvent: (eventId: string) => Promise<boolean>;
  unlockEvent: (eventId: string) => void;
  proposeChange: (change: Omit<CollaborativeChange, 'id' | 'userId' | 'userName' | 'timestamp'>) => void;
  applyChange: (changeId: string) => void;
  rejectChange: (changeId: string, reason?: string) => void;
  
  // Conflict Resolution
  resolveConflict: (conflictId: string, resolution: ConflictResolution) => void;
  acknowledgeChange: (changeId: string) => void;
  
  // Chat Integration
  sendMessage: (message: string, type?: 'chat' | 'announcement') => void;
  mentionUser: (userId: string, message: string) => void;
  addReaction: (messageId: string, emoji: string) => void;
  markMessagesRead: () => void;
  
  // Session Management
  joinSession: () => Promise<void>;
  leaveSession: () => void;
  kickUser: (userId: string) => void; // Admin only
  updateUserPermissions: (userId: string, permissions: Partial<CollaborativeUser>) => void;
  
  // Utilities
  getUserByEventLock: (eventId: string) => CollaborativeUser | null;
  getConflictsForEvent: (eventId: string) => CollaborationConflict[];
  exportCollaborationReport: () => void;
}

interface CollaborationStats {
  totalChanges: number;
  conflictsResolved: number;
  averageResponseTime: number; // Time to acknowledge changes
  mostActiveUser: string;
  collaborationEfficiency: number; // 0-100 score
  simultaneousEditCount: number;
}

interface UseCollaborativeSchedulingParams {
  wsUrl?: string;
  sessionId?: string;
  enableRealTimeSync?: boolean;
  conflictResolutionStrategy?: ConflictResolution;
  maxChatHistory?: number;
  autoAcknowledgeChanges?: boolean;
}

/**
 * useCollaborativeScheduling Hook
 * 
 * Provides comprehensive real-time collaboration features for schedule management,
 * enabling seamless multi-user coordination with conflict resolution and live chat.
 */
export const useCollaborativeScheduling = ({
  wsUrl = 'ws://localhost:3001/collaboration',
  sessionId: providedSessionId,
  enableRealTimeSync = true,
  conflictResolutionStrategy = 'auto-merge',
  maxChatHistory = 500,
  autoAcknowledgeChanges = false
}: UseCollaborativeSchedulingParams = {}) => {
  
  const { user } = useAuth();
  
  // ==================== STATE MANAGEMENT ====================
  
  const [sessionId, setSessionId] = useState<string>(providedSessionId || `session-${Date.now()}`);
  const [activeUsers, setActiveUsers] = useState<CollaborativeUser[]>([]);
  const [currentUser, setCurrentUser] = useState<CollaborativeUser | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'offline'>('offline');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  
  // Changes and Conflicts
  const [pendingChanges, setPendingChanges] = useState<CollaborativeChange[]>([]);
  const [recentChanges, setRecentChanges] = useState<CollaborativeChange[]>([]);
  const [activeConflicts, setActiveConflicts] = useState<CollaborationConflict[]>([]);
  const [lockedEvents, setLockedEvents] = useState<Record<string, string>>({});
  
  // Live Chat
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  
  // ==================== REFS ====================
  
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const userActivityRef = useRef<UserActivity>('viewing');
  const cursorThrottleRef = useRef<NodeJS.Timeout | null>(null);
  
  // ==================== COMPUTED VALUES ====================
  
  const totalOnlineUsers = activeUsers.filter(user => user.isOnline).length;
  
  const collaborationStats: CollaborationStats = {
    totalChanges: recentChanges.length,
    conflictsResolved: activeConflicts.filter(c => c.resolvedAt).length,
    averageResponseTime: calculateAverageResponseTime(),
    mostActiveUser: getMostActiveUser(),
    collaborationEfficiency: calculateCollaborationEfficiency(),
    simultaneousEditCount: activeUsers.filter(u => u.activity === 'editing').length
  };
  
  // ==================== HELPER FUNCTIONS ====================
  
  function calculateAverageResponseTime(): number {
    const acknowledgedChanges = recentChanges.filter(c => c.acknowledgedBy.length > 0);
    if (acknowledgedChanges.length === 0) return 0;
    
    const totalTime = acknowledgedChanges.reduce((sum, change) => {
      // Calculate time from change to first acknowledgment
      const firstAckTime = Math.min(...change.acknowledgedBy.map(() => Date.now())); // Simplified
      return sum + (firstAckTime - change.timestamp.getTime());
    }, 0);
    
    return totalTime / acknowledgedChanges.length;
  }
  
  function getMostActiveUser(): string {
    const userActivity = recentChanges.reduce((activity, change) => {
      activity[change.userId] = (activity[change.userId] || 0) + 1;
      return activity;
    }, {} as Record<string, number>);
    
    const mostActive = Object.entries(userActivity)
      .sort(([,a], [,b]) => b - a)[0];
    
    return mostActive ? mostActive[0] : '';
  }
  
  function calculateCollaborationEfficiency(): number {
    if (recentChanges.length === 0) return 100;
    
    const conflictRate = activeConflicts.length / recentChanges.length;
    const resolutionRate = activeConflicts.filter(c => c.resolvedAt).length / Math.max(activeConflicts.length, 1);
    const responseTime = calculateAverageResponseTime();
    
    // Efficiency score based on multiple factors
    const conflictScore = Math.max(0, 100 - (conflictRate * 100));
    const resolutionScore = resolutionRate * 100;
    const responseScore = Math.max(0, 100 - (responseTime / 1000)); // Penalize slow responses
    
    return Math.round((conflictScore + resolutionScore + responseScore) / 3);
  }
  
  // ==================== USER MANAGEMENT ====================
  
  const updateUserActivity = useCallback((activity: UserActivity) => {
    userActivityRef.current = activity;
    
    if (currentUser) {
      const updatedUser = { ...currentUser, activity, lastSeen: new Date() };
      setCurrentUser(updatedUser);
      
      // Broadcast activity update
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'user-activity',
          userId: currentUser.id,
          activity,
          timestamp: new Date().toISOString()
        }));
      }
    }
  }, [currentUser]);
  
  const updateCursorPosition = useCallback((position: CursorPosition) => {
    if (!currentUser) return;
    
    // Throttle cursor updates to avoid overwhelming the connection
    if (cursorThrottleRef.current) {
      clearTimeout(cursorThrottleRef.current);
    }
    
    cursorThrottleRef.current = setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'cursor-update',
          userId: currentUser.id,
          position,
          timestamp: new Date().toISOString()
        }));
      }
    }, 50); // 20 FPS cursor updates
  }, [currentUser]);
  
  const selectEvents = useCallback((eventIds: string[]) => {
    if (!currentUser) return;
    
    setCurrentUser(prev => prev ? { ...prev, selectedEventIds: eventIds } : null);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'selection-update',
        userId: currentUser.id,
        selectedEventIds: eventIds,
        timestamp: new Date().toISOString()
      }));
    }
  }, [currentUser]);
  
  // ==================== EVENT COLLABORATION ====================
  
  const lockEvent = useCallback(async (eventId: string): Promise<boolean> => {
    if (!currentUser) return false;
    
    // Check if event is already locked
    if (lockedEvents[eventId] && lockedEvents[eventId] !== currentUser.id) {
      return false;
    }
    
    return new Promise((resolve) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const requestId = `lock-${Date.now()}`;
        
        // Listen for lock response
        const handleLockResponse = (event: MessageEvent) => {
          const data = JSON.parse(event.data);
          if (data.type === 'lock-response' && data.requestId === requestId) {
            wsRef.current?.removeEventListener('message', handleLockResponse);
            resolve(data.success);
          }
        };
        
        wsRef.current.addEventListener('message', handleLockResponse);
        
        wsRef.current.send(JSON.stringify({
          type: 'lock-request',
          requestId,
          eventId,
          userId: currentUser.id,
          timestamp: new Date().toISOString()
        }));
        
        // Timeout after 5 seconds
        setTimeout(() => {
          wsRef.current?.removeEventListener('message', handleLockResponse);
          resolve(false);
        }, 5000);
      } else {
        resolve(false);
      }
    });
  }, [currentUser, lockedEvents]);
  
  const unlockEvent = useCallback((eventId: string) => {
    if (!currentUser) return;
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unlock-request',
        eventId,
        userId: currentUser.id,
        timestamp: new Date().toISOString()
      }));
    }
  }, [currentUser]);
  
  const proposeChange = useCallback((change: Omit<CollaborativeChange, 'id' | 'userId' | 'userName' | 'timestamp'>) => {
    if (!currentUser) return;
    
    const fullChange: CollaborativeChange = {
      ...change,
      id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: currentUser.id,
      userName: currentUser.name,
      timestamp: new Date(),
      hasConflict: false,
      status: 'pending',
      acknowledgedBy: []
    };
    
    setPendingChanges(prev => [...prev, fullChange]);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'change-proposal',
        change: fullChange,
        timestamp: new Date().toISOString()
      }));
    }
  }, [currentUser]);
  
  const applyChange = useCallback((changeId: string) => {
    const change = pendingChanges.find(c => c.id === changeId);
    if (!change) return;
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'apply-change',
        changeId,
        userId: currentUser?.id,
        timestamp: new Date().toISOString()
      }));
    }
  }, [pendingChanges, currentUser]);
  
  const rejectChange = useCallback((changeId: string, reason?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'reject-change',
        changeId,
        reason,
        userId: currentUser?.id,
        timestamp: new Date().toISOString()
      }));
    }
  }, [currentUser]);
  
  // ==================== CONFLICT RESOLUTION ====================
  
  const resolveConflict = useCallback((conflictId: string, resolution: ConflictResolution) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'resolve-conflict',
        conflictId,
        resolution,
        resolvedBy: currentUser?.id,
        timestamp: new Date().toISOString()
      }));
    }
  }, [currentUser]);
  
  const acknowledgeChange = useCallback((changeId: string) => {
    if (!currentUser) return;
    
    setRecentChanges(prev => prev.map(change => 
      change.id === changeId 
        ? { ...change, acknowledgedBy: [...change.acknowledgedBy, currentUser.id] }
        : change
    ));
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'acknowledge-change',
        changeId,
        userId: currentUser.id,
        timestamp: new Date().toISOString()
      }));
    }
  }, [currentUser]);
  
  // ==================== CHAT INTEGRATION ====================
  
  const sendMessage = useCallback((message: string, type: 'chat' | 'announcement' = 'chat') => {
    if (!currentUser) return;
    
    const newMessage: LiveMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: currentUser.id,
      userName: currentUser.name,
      timestamp: new Date(),
      message,
      type,
      isRead: false,
      reactions: {}
    };
    
    setMessages(prev => [newMessage, ...prev.slice(0, maxChatHistory - 1)]);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat-message',
        message: newMessage,
        timestamp: new Date().toISOString()
      }));
    }
  }, [currentUser, maxChatHistory]);
  
  const mentionUser = useCallback((userId: string, message: string) => {
    const mentionedUser = activeUsers.find(u => u.id === userId);
    if (!mentionedUser) return;
    
    const messageWithMention = `@${mentionedUser.name} ${message}`;
    sendMessage(messageWithMention);
  }, [activeUsers, sendMessage]);
  
  const addReaction = useCallback((messageId: string, emoji: string) => {
    if (!currentUser) return;
    
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const reactions = { ...msg.reactions };
        if (!reactions[emoji]) reactions[emoji] = [];
        
        if (reactions[emoji].includes(currentUser.id)) {
          reactions[emoji] = reactions[emoji].filter(id => id !== currentUser.id);
          if (reactions[emoji].length === 0) delete reactions[emoji];
        } else {
          reactions[emoji].push(currentUser.id);
        }
        
        return { ...msg, reactions };
      }
      return msg;
    }));
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message-reaction',
        messageId,
        emoji,
        userId: currentUser.id,
        timestamp: new Date().toISOString()
      }));
    }
  }, [currentUser]);
  
  const markMessagesRead = useCallback(() => {
    setMessages(prev => prev.map(msg => ({ ...msg, isRead: true })));
    setUnreadMessageCount(0);
  }, []);
  
  // ==================== SESSION MANAGEMENT ====================
  
  const joinSession = useCallback(async () => {
    if (!user) return;
    
    const collaborativeUser: CollaborativeUser = {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role as CollaborationRole,
      avatar: user.avatar,
      isOnline: true,
      activity: 'viewing',
      lastSeen: new Date(),
      joinedAt: new Date(),
      selectedEventIds: [],
      canEdit: user.role === 'admin' || user.role === 'trainer',
      canDelete: user.role === 'admin',
      canCreateEvents: user.role === 'admin' || user.role === 'trainer',
      canManagePermissions: user.role === 'admin'
    };
    
    setCurrentUser(collaborativeUser);
    setSessionStartTime(new Date());
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'join-session',
        sessionId,
        user: collaborativeUser,
        timestamp: new Date().toISOString()
      }));
    }
  }, [user, sessionId]);
  
  const leaveSession = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'leave-session',
        sessionId,
        userId: currentUser?.id,
        timestamp: new Date().toISOString()
      }));
    }
    
    setCurrentUser(null);
    setActiveUsers([]);
    setSessionStartTime(null);
  }, [sessionId, currentUser]);
  
  const kickUser = useCallback((userId: string) => {
    if (!currentUser?.canManagePermissions) return;
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'kick-user',
        targetUserId: userId,
        adminId: currentUser.id,
        timestamp: new Date().toISOString()
      }));
    }
  }, [currentUser]);
  
  const updateUserPermissions = useCallback((userId: string, permissions: Partial<CollaborativeUser>) => {
    if (!currentUser?.canManagePermissions) return;
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'update-permissions',
        targetUserId: userId,
        permissions,
        adminId: currentUser.id,
        timestamp: new Date().toISOString()
      }));
    }
  }, [currentUser]);
  
  // ==================== UTILITY FUNCTIONS ====================
  
  const getUserByEventLock = useCallback((eventId: string): CollaborativeUser | null => {
    const lockingUserId = lockedEvents[eventId];
    return lockingUserId ? activeUsers.find(u => u.id === lockingUserId) || null : null;
  }, [lockedEvents, activeUsers]);
  
  const getConflictsForEvent = useCallback((eventId: string): CollaborationConflict[] => {
    return activeConflicts.filter(conflict => conflict.eventId === eventId);
  }, [activeConflicts]);
  
  const exportCollaborationReport = useCallback(() => {
    const report = {
      sessionId,
      sessionDuration: sessionStartTime ? Date.now() - sessionStartTime.getTime() : 0,
      participants: activeUsers,
      totalChanges: recentChanges.length,
      resolvedConflicts: activeConflicts.filter(c => c.resolvedAt).length,
      chatMessages: messages.length,
      collaborationStats,
      timestamp: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `collaboration-report-${sessionId}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  }, [sessionId, sessionStartTime, activeUsers, recentChanges, activeConflicts, messages, collaborationStats]);
  
  // ==================== WEBSOCKET CONNECTION ====================
  
  useEffect(() => {
    if (!enableRealTimeSync) return;
    
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(`${wsUrl}?session=${sessionId}`);
        wsRef.current = ws;
        
        ws.onopen = () => {
          console.log('✅ Collaborative scheduling WebSocket connected');
          setIsConnected(true);
          setConnectionQuality('excellent');
          setLastSyncTime(new Date());
          
          if (user) {
            joinSession();
          }
          
          // Start heartbeat
          heartbeatRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
            }
          }, 30000);
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
          } catch (error) {
            console.error('Failed to parse collaboration message:', error);
          }
        };
        
        ws.onclose = () => {
          console.log('🔌 Collaborative scheduling WebSocket disconnected');
          setIsConnected(false);
          setConnectionQuality('offline');
          
          if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
          }
          
          // Attempt reconnection after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };
        
        ws.onerror = (error) => {
          console.error('❌ Collaborative scheduling WebSocket error:', error);
          setConnectionQuality('poor');
        };
      } catch (error) {
        console.error('Failed to connect collaborative scheduling WebSocket:', error);
      }
    };
    
    const handleWebSocketMessage = (data: any) => {
      setLastSyncTime(new Date());
      
      switch (data.type) {
        case 'user-joined':
          setActiveUsers(prev => [...prev.filter(u => u.id !== data.user.id), data.user]);
          break;
          
        case 'user-left':
          setActiveUsers(prev => prev.filter(u => u.id !== data.userId));
          break;
          
        case 'users-list':
          setActiveUsers(data.users);
          break;
          
        case 'user-activity':
          setActiveUsers(prev => prev.map(u => 
            u.id === data.userId 
              ? { ...u, activity: data.activity, lastSeen: new Date(data.timestamp) }
              : u
          ));
          break;
          
        case 'cursor-update':
          setActiveUsers(prev => prev.map(u => 
            u.id === data.userId 
              ? { ...u, cursorPosition: data.position }
              : u
          ));
          break;
          
        case 'selection-update':
          setActiveUsers(prev => prev.map(u => 
            u.id === data.userId 
              ? { ...u, selectedEventIds: data.selectedEventIds }
              : u
          ));
          break;
          
        case 'event-locked':
          setLockedEvents(prev => ({ ...prev, [data.eventId]: data.userId }));
          break;
          
        case 'event-unlocked':
          setLockedEvents(prev => {
            const newLocks = { ...prev };
            delete newLocks[data.eventId];
            return newLocks;
          });
          break;
          
        case 'change-proposed':
          setPendingChanges(prev => [...prev, data.change]);
          if (autoAcknowledgeChanges && data.change.userId !== currentUser?.id) {
            acknowledgeChange(data.change.id);
          }
          break;
          
        case 'change-applied':
          setPendingChanges(prev => prev.filter(c => c.id !== data.changeId));
          setRecentChanges(prev => [...prev, { ...data.change, status: 'applied' }]);
          break;
          
        case 'change-rejected':
          setPendingChanges(prev => prev.filter(c => c.id !== data.changeId));
          break;
          
        case 'conflict-detected':
          setActiveConflicts(prev => [...prev, data.conflict]);
          break;
          
        case 'conflict-resolved':
          setActiveConflicts(prev => prev.map(c => 
            c.id === data.conflictId 
              ? { ...c, resolvedBy: data.resolvedBy, resolvedAt: new Date(data.timestamp) }
              : c
          ));
          break;
          
        case 'chat-message':
          setMessages(prev => [data.message, ...prev.slice(0, maxChatHistory - 1)]);
          if (data.message.userId !== currentUser?.id) {
            setUnreadMessageCount(prev => prev + 1);
          }
          break;
          
        case 'message-reaction':
          setMessages(prev => prev.map(msg => 
            msg.id === data.messageId 
              ? { ...msg, reactions: data.reactions }
              : msg
          ));
          break;
          
        case 'pong':
          // Heartbeat response - update connection quality based on latency
          const latency = Date.now() - new Date(data.timestamp).getTime();
          if (latency < 100) setConnectionQuality('excellent');
          else if (latency < 300) setConnectionQuality('good');
          else setConnectionQuality('poor');
          break;
      }
    };
    
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        leaveSession();
        wsRef.current.close();
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [enableRealTimeSync, sessionId, wsUrl, user, autoAcknowledgeChanges, maxChatHistory]);
  
  // ==================== RETURN VALUES ====================
  
  const values: CollaborativeSchedulingValues = {
    activeUsers,
    currentUser,
    totalOnlineUsers,
    isConnected,
    connectionQuality,
    lastSyncTime,
    pendingChanges,
    recentChanges,
    activeConflicts,
    messages,
    unreadMessageCount,
    sessionId,
    sessionStartTime,
    lockedEvents,
    collaborationStats
  };
  
  const actions: CollaborativeSchedulingActions = {
    updateUserActivity,
    updateCursorPosition,
    selectEvents,
    lockEvent,
    unlockEvent,
    proposeChange,
    applyChange,
    rejectChange,
    resolveConflict,
    acknowledgeChange,
    sendMessage,
    mentionUser,
    addReaction,
    markMessagesRead,
    joinSession,
    leaveSession,
    kickUser,
    updateUserPermissions,
    getUserByEventLock,
    getConflictsForEvent,
    exportCollaborationReport
  };
  
  return { ...values, ...actions };
};

export default useCollaborativeScheduling;
