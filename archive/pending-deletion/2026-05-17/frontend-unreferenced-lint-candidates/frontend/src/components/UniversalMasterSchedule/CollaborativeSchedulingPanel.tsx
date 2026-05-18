/**
 * CollaborativeSchedulingPanel - Live Multi-user Scheduling Interface
 * ===================================================================
 * Advanced real-time collaboration interface for admin-trainer coordination
 * 
 * FEATURES:
 * - Live user presence indicators with activity status
 * - Real-time cursor tracking and event selection
 * - Conflict detection and resolution interface
 * - Live chat integration for scheduling discussions
 * - Session locking and permission management
 * - Collaborative change feed with acknowledgments
 * - Voice/video call integration for complex scheduling
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import {
  Users,
  MessageCircle,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  Eye,
  Edit,
  MousePointer,
  Clock,
  Phone,
  Video,
  Send,
  Smile,
  Settings,
  Activity,
  Wifi,
  WifiOff
} from 'lucide-react';

// Import collaboration hooks
import {
  useCollaborativeScheduling,
  CollaborativeUser,
  CollaborationConflict,
  LiveMessage
} from './hooks/useCollaborativeScheduling';

// Styled Components
const CollaborationContainer = styled(motion.div)`
  background: linear-gradient(135deg, #1e3a8a 0%, #0ea5e9 50%, #0891b2 100%);
  border-radius: 16px;
  padding: 1.5rem;
  margin: 1rem 0;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
`;

const CollaborationHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  color: white;
`;

const CollaborationTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ConnectionStatus = styled.div<{ quality: 'excellent' | 'good' | 'poor' | 'offline' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: ${props => 
    props.quality === 'excellent' ? '#10b981' :
    props.quality === 'good' ? '#f59e0b' :
    props.quality === 'poor' ? '#ef4444' :
    '#6b7280'};
`;

const LiveIndicator = styled.div<{ active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.active ? '#10b981' : '#6b7280'};
  animation: ${props => props.active ? 'pulse 2s infinite' : 'none'};
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const CollaborationGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 1.5rem;
  height: 600px;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    height: auto;
  }
`;

const MainPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SidePanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

// User Presence Components
const UserPresenceSection = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1rem;
`;

const UserPresenceHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: between;
  margin-bottom: 1rem;
  color: white;
  font-weight: 600;
`;

const UsersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const UserCard = styled.div<{ isCurrentUser?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: ${props => props.isCurrentUser ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
  border-radius: 8px;
  border: 1px solid ${props => props.isCurrentUser ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
`;

const UserAvatar = styled.div<{ color: string }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => props.color};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
  position: relative;
`;

const UserStatus = styled.div<{ status: string }>`
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => 
    props.status === 'editing' ? '#ef4444' :
    props.status === 'viewing' ? '#10b981' :
    props.status === 'selecting' ? '#f59e0b' :
    '#6b7280'};
  border: 2px solid white;
`;

const UserInfo = styled.div`
  flex: 1;
  color: white;
`;

const UserName = styled.div`
  font-weight: 500;
  font-size: 0.875rem;
`;

const UserActivity = styled.div`
  font-size: 0.75rem;
  opacity: 0.8;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const UserActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const IconButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: white;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }
`;

// Conflicts Section
const ConflictsSection = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  padding: 1rem;
`;

const ConflictCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  border-left: 4px solid #ef4444;
`;

const ConflictHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
`;

const ConflictDescription = styled.div`
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.75rem;
  margin-bottom: 0.75rem;
  line-height: 1.4;
`;

const ConflictActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ConflictButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  background: ${props => props.variant === 'primary' ? 'rgba(59, 130, 246, 0.8)' : 'rgba(255, 255, 255, 0.2)'};
  border: none;
  border-radius: 6px;
  color: white;
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
`;

// Live Chat Section
const LiveChatSection = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  height: 300px;
`;

const ChatHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  color: white;
  font-weight: 600;
`;

const ChatMessages = styled.div`
  flex: 1;
  overflow-y: auto;
  margin-bottom: 1rem;
  
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 2px;
  }
`;

const ChatMessage = styled.div<{ isOwn?: boolean }>`
  display: flex;
  flex-direction: ${props => props.isOwn ? 'row-reverse' : 'row'};
  margin-bottom: 0.75rem;
  gap: 0.5rem;
`;

const MessageBubble = styled.div<{ isOwn?: boolean }>`
  background: ${props => props.isOwn ? 'rgba(59, 130, 246, 0.8)' : 'rgba(255, 255, 255, 0.15)'};
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 12px;
  border-bottom-${props => props.isOwn ? 'right' : 'left'}-radius: 4px;
  max-width: 70%;
  font-size: 0.875rem;
  line-height: 1.4;
`;

const MessageMeta = styled.div`
  font-size: 0.625rem;
  opacity: 0.7;
  margin-top: 0.25rem;
`;

const ChatInput = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const MessageInput = styled.input`
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  padding: 0.5rem;
  font-size: 0.875rem;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }
  
  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.15);
  }
`;

const SendButton = styled.button`
  background: rgba(59, 130, 246, 0.8);
  border: none;
  border-radius: 8px;
  color: white;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(59, 130, 246, 1);
    transform: translateY(-1px);
  }
`;

// Activity Feed
const ActivityFeed = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1rem;
  flex: 1;
`;

const ActivityHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  color: white;
  font-weight: 600;
`;

const ActivityList = styled.div`
  max-height: 200px;
  overflow-y: auto;
`;

const ActivityItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  color: white;
  font-size: 0.875rem;
`;

interface CollaborativeSchedulingPanelProps {
  className?: string;
  sessionId?: string;
  onEventLock?: (eventId: string, userId: string) => void;
  onEventUnlock?: (eventId: string) => void;
}

/**
 * CollaborativeSchedulingPanel Component
 * 
 * Live collaboration interface for multi-user schedule management
 */
const CollaborativeSchedulingPanel: React.FC<CollaborativeSchedulingPanelProps> = ({
  className,
  sessionId,
  onEventLock,
  onEventUnlock
}) => {
  
  // ==================== HOOKS ====================
  
  const {
    // User Management
    activeUsers,
    currentUser,
    totalOnlineUsers,
    
    // Real-time State
    isConnected,
    connectionQuality,
    lastSyncTime,
    
    // Conflicts & Changes
    activeConflicts,
    pendingChanges,
    recentChanges,
    
    // Chat
    messages,
    unreadMessageCount,
    
    // Session
    lockedEvents,
    collaborationStats,
    
    // Actions
    updateUserActivity,
    lockEvent,
    unlockEvent,
    resolveConflict,
    sendMessage,
    markMessagesRead,
    joinSession,
    leaveSession,
    getUserByEventLock
  } = useCollaborativeScheduling({
    sessionId,
    enableRealTimeSync: true
  });
  
  // ==================== LOCAL STATE ====================
  
  const [chatMessage, setChatMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  
  // ==================== HANDLERS ====================
  
  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      sendMessage(chatMessage);
      setChatMessage('');
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleResolveConflict = (conflictId: string, resolution: 'auto-merge' | 'manual-review' | 'last-write-wins' | 'first-write-wins') => {
    resolveConflict(conflictId, resolution);
  };
  
  const handleLockEvent = async (eventId: string) => {
    const success = await lockEvent(eventId);
    if (success && onEventLock) {
      onEventLock(eventId, currentUser?.id || '');
    }
  };
  
  const handleUnlockEvent = (eventId: string) => {
    unlockEvent(eventId);
    if (onEventUnlock) {
      onEventUnlock(eventId);
    }
  };
  
  // ==================== EFFECTS ====================
  
  useEffect(() => {
    // Auto-scroll chat to bottom when new messages arrive
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages]);
  
  useEffect(() => {
    // Auto-join session when component mounts
    if (currentUser === null && sessionId) {
      joinSession();
    }
    
    return () => {
      // Auto-leave session when component unmounts
      leaveSession();
    };
  }, [sessionId, currentUser, joinSession, leaveSession]);
  
  // ==================== COMPUTED VALUES ====================
  
  const getUserColor = (userId: string): string => {
    const colors = [
      '#ef4444', '#f59e0b', '#10b981', '#3b82f6', 
      '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
    ];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };
  
  const getActivityIcon = (activity: string) => {
    switch (activity) {
      case 'editing': return <Edit size={14} />;
      case 'viewing': return <Eye size={14} />;
      case 'selecting': return <MousePointer size={14} />;
      default: return <Activity size={14} />;
    }
  };
  
  // ==================== RENDER ====================
  
  return (
    <CollaborationContainer
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <CollaborationHeader>
        <CollaborationTitle>
          <Users size={20} />
          Live Collaboration
          <LiveIndicator active={isConnected} />
          <span style={{ fontSize: '0.875rem', opacity: 0.8 }}>
            ({totalOnlineUsers} online)
          </span>
        </CollaborationTitle>
        
        <ConnectionStatus quality={connectionQuality}>
          {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
          {connectionQuality}
          {lastSyncTime && (
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
              • synced {lastSyncTime.toLocaleTimeString()}
            </span>
          )}
        </ConnectionStatus>
      </CollaborationHeader>
      
      <CollaborationGrid>
        {/* Main Panel */}
        <MainPanel>
          {/* Activity Feed */}
          <ActivityFeed>
            <ActivityHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={16} />
                Recent Activity
              </div>
              <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                {recentChanges.length} changes today
              </span>
            </ActivityHeader>
            
            <ActivityList>
              {recentChanges.slice(0, 10).map((change) => (
                <ActivityItem key={change.id}>
                  <UserAvatar color={getUserColor(change.userId)} style={{ width: '24px', height: '24px', fontSize: '0.75rem' }}>
                    {change.userName.charAt(0)}
                  </UserAvatar>
                  <div style={{ flex: 1 }}>
                    <strong>{change.userName}</strong> {change.type}d an event
                    <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                      {change.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  {change.hasConflict && <AlertTriangle size={14} color="#f59e0b" />}
                </ActivityItem>
              ))}
              
              {recentChanges.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  No recent activity
                </div>
              )}
            </ActivityList>
          </ActivityFeed>
          
          {/* Conflicts Section */}
          {activeConflicts.length > 0 && (
            <ConflictsSection>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'white', fontWeight: 600 }}>
                <AlertTriangle size={16} />
                Active Conflicts ({activeConflicts.length})
              </div>
              
              {activeConflicts.map((conflict) => (
                <ConflictCard key={conflict.id}>
                  <ConflictHeader>
                    <div>Event Conflict #{conflict.id.slice(-6)}</div>
                    <Clock size={14} />
                  </ConflictHeader>
                  
                  <ConflictDescription>
                    Multiple users are editing the same event. Choose a resolution strategy:
                  </ConflictDescription>
                  
                  <ConflictActions>
                    <ConflictButton 
                      variant="primary"
                      onClick={() => handleResolveConflict(conflict.id, 'auto-merge')}
                    >
                      Auto Merge
                    </ConflictButton>
                    <ConflictButton 
                      onClick={() => handleResolveConflict(conflict.id, 'last-write-wins')}
                    >
                      Last Edit Wins
                    </ConflictButton>
                    <ConflictButton 
                      onClick={() => handleResolveConflict(conflict.id, 'manual-review')}
                    >
                      Manual Review
                    </ConflictButton>
                  </ConflictActions>
                </ConflictCard>
              ))}
            </ConflictsSection>
          )}
        </MainPanel>
        
        {/* Side Panel */}
        <SidePanel>
          {/* User Presence */}
          <UserPresenceSection>
            <UserPresenceHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={16} />
                Active Users ({activeUsers.length})
              </div>
            </UserPresenceHeader>
            
            <UsersList>
              {activeUsers.map((user) => (
                <UserCard key={user.id} isCurrentUser={user.id === currentUser?.id}>
                  <UserAvatar color={getUserColor(user.id)}>
                    {user.name.charAt(0)}
                    <UserStatus status={user.activity} />
                  </UserAvatar>
                  
                  <UserInfo>
                    <UserName>
                      {user.name}
                      {user.id === currentUser?.id && ' (You)'}
                    </UserName>
                    <UserActivity>
                      {getActivityIcon(user.activity)}
                      {user.activity} • {user.role}
                    </UserActivity>
                  </UserInfo>
                  
                  <UserActions>
                    {user.id !== currentUser?.id && (
                      <>
                        <IconButton title="Start video call">
                          <Video size={14} />
                        </IconButton>
                        <IconButton title="Send message">
                          <MessageCircle size={14} />
                        </IconButton>
                      </>
                    )}
                  </UserActions>
                </UserCard>
              ))}
            </UsersList>
          </UserPresenceSection>
          
          {/* Live Chat */}
          <LiveChatSection>
            <ChatHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageCircle size={16} />
                Live Chat
                {unreadMessageCount > 0 && (
                  <span style={{ 
                    background: '#ef4444', 
                    color: 'white', 
                    borderRadius: '50%', 
                    width: '20px', 
                    height: '20px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '0.75rem' 
                  }}>
                    {unreadMessageCount}
                  </span>
                )}
              </div>
              <IconButton onClick={() => setShowSettings(!showSettings)}>
                <Settings size={14} />
              </IconButton>
            </ChatHeader>
            
            <ChatMessages ref={chatMessagesRef}>
              {messages.map((message) => (
                <ChatMessage key={message.id} isOwn={message.userId === currentUser?.id}>
                  <MessageBubble isOwn={message.userId === currentUser?.id}>
                    {message.userId !== currentUser?.id && (
                      <div style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                        {message.userName}
                      </div>
                    )}
                    {message.message}
                    <MessageMeta>
                      {message.timestamp.toLocaleTimeString()}
                    </MessageMeta>
                  </MessageBubble>
                </ChatMessage>
              ))}
              
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Start a conversation...
                </div>
              )}
            </ChatMessages>
            
            <ChatInput>
              <MessageInput
                type="text"
                placeholder="Type a message..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <IconButton>
                <Smile size={14} />
              </IconButton>
              <SendButton onClick={handleSendMessage}>
                <Send size={14} />
              </SendButton>
            </ChatInput>
          </LiveChatSection>
        </SidePanel>
      </CollaborationGrid>
    </CollaborationContainer>
  );
};

export default CollaborativeSchedulingPanel;
