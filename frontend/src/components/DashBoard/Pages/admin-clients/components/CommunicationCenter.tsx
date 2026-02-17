/**
 * Communication Center Component
 * 7-Star AAA Personal Training & Social Media App
 *
 * Advanced communication hub featuring:
 * - Multi-channel messaging (SMS, email, app notifications)
 * - Video calling and screen sharing
 * - Voice notes and media sharing
 * - Automated follow-ups and reminders
 * - Group messaging and broadcasts
 * - AI-powered response suggestions
 * - Communication analytics and insights
 *
 * Architecture: styled-components + lucide-react (zero MUI)
 * Theme: Galaxy-Swan (cosmic dark, cyan accents, glass panels)
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  Send,
  Phone,
  Video,
  Mail,
  MessageSquare,
  Paperclip,
  Mic,
  Search,
  Users,
  Megaphone,
  Star,
  MoreVertical,
  X,
  UserPlus,
  Check,
  CheckCheck,
  BarChart3,
  MessageCircle,
  Plus
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface MessageData {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  receiverId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'system';
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  channel: 'app' | 'sms' | 'email';
  attachments?: Attachment[];
  isStarred?: boolean;
  replyTo?: string;
  edited?: boolean;
  editedAt?: string;
  metadata?: Record<string, any>;
}

interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnail?: string;
}

interface Conversation {
  id: string;
  participantIds: string[];
  participants: Participant[];
  lastMessage: MessageData;
  unreadCount: number;
  isGroup: boolean;
  groupName?: string;
  groupAvatar?: string;
  type: 'direct' | 'group' | 'broadcast';
  status: 'active' | 'archived' | 'muted';
  createdAt: string;
  updatedAt: string;
  isOnline?: boolean;
  lastSeen?: string;
  isPinned?: boolean;
  preferences?: {
    notifications: boolean;
    emailNotifications: boolean;
    smsNotifications: boolean;
  };
}

interface Participant {
  id: string;
  name: string;
  avatar: string;
  email: string;
  phone?: string;
  role: 'client' | 'trainer' | 'admin' | 'staff';
  isOnline: boolean;
  lastSeen: string;
  preferredChannel: 'app' | 'email' | 'sms';
  timezone: string;
}

interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: 'appointment' | 'reminder' | 'follow-up' | 'marketing' | 'welcome';
  channels: ('app' | 'email' | 'sms')[];
  triggers: string[];
  isActive: boolean;
  personalization: boolean;
  schedule?: {
    time: string;
    frequency: 'once' | 'recurring';
    interval?: string;
  };
}

interface CommunicationAnalytics {
  totalMessages: number;
  responseRate: number;
  avgResponseTime: number;
  channelBreakdown: Record<string, number>;
  sentimentAnalysis: {
    positive: number;
    neutral: number;
    negative: number;
  };
  engagementMetrics: {
    openRate: number;
    clickRate: number;
    replyRate: number;
  };
}

// ─── Theme Tokens ────────────────────────────────────────────────────────────

const theme = {
  bg: 'rgba(15,23,42,0.95)',
  bgDeep: '#0f172a',
  bgCard: '#1d1f2b',
  bgPanel: '#16213e',
  bgChat: '#1a1a2e',
  border: 'rgba(14,165,233,0.2)',
  borderSubtle: 'rgba(255,255,255,0.1)',
  text: '#e2e8f0',
  textSecondary: '#94a3b8',
  accent: '#0ea5e9',
  accentGradient: 'linear-gradient(135deg, #00c9ff, #0066cc)',
  accentGradientHover: 'linear-gradient(135deg, #0099cc, #0055bb)',
  green: '#4caf50',
  orange: '#ff9800',
  gold: '#ffd700',
  glass: 'rgba(255,255,255,0.05)',
  radius: '16px',
  radiusSm: '8px',
  radiusMd: '12px',
};

// ─── Animations ──────────────────────────────────────────────────────────────

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Styled Components ───────────────────────────────────────────────────────

const PageWrapper = styled.div`
  padding: 24px;
`;

const GlassPanel = styled.div`
  background: ${theme.bg};
  backdrop-filter: blur(12px);
  border: 1px solid ${theme.border};
  border-radius: ${theme.radius};
`;

const SectionHeading = styled.h4`
  color: ${theme.accent};
  font-weight: 700;
  font-size: 1.75rem;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const SubHeading = styled.h6`
  color: ${theme.text};
  font-weight: 600;
  font-size: 1.15rem;
  margin: 0;
`;

const BodyText = styled.p`
  color: ${theme.textSecondary};
  font-size: 1rem;
  margin: 0;
`;

const CaptionText = styled.span`
  color: ${theme.textSecondary};
  font-size: 0.75rem;
`;

const SmallText = styled.span`
  color: ${theme.textSecondary};
  font-size: 0.875rem;
`;

const ChatContainer = styled.div`
  height: 600px;
  display: flex;
  flex-direction: row;
  border: 1px solid ${theme.borderSubtle};
  border-radius: ${theme.radius};
  overflow: hidden;
  background-color: ${theme.bgChat};
`;

const ConversationListPanel = styled.div`
  width: 300px;
  border-right: 1px solid ${theme.borderSubtle};
  background-color: ${theme.bgPanel};
  overflow: auto;
  flex-shrink: 0;
`;

const ChatArea = styled.div`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  background-color: ${theme.bgChat};
  min-width: 0;
`;

const MessageBubble = styled.div<{ $isOwn: boolean }>`
  max-width: 70%;
  padding: 8px 16px;
  border-radius: ${({ $isOwn }) => ($isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px')};
  background-color: ${({ $isOwn }) => ($isOwn ? '#00c9ff' : theme.glass)};
  color: ${({ $isOwn }) => ($isOwn ? '#000' : '#e0e0e0')};
  margin-left: ${({ $isOwn }) => ($isOwn ? 'auto' : '0')};
  margin-right: ${({ $isOwn }) => ($isOwn ? '0' : 'auto')};
  word-wrap: break-word;
  font-size: 0.875rem;
  line-height: 1.5;
`;

const ActionButton = styled.button<{ $variant?: 'contained' | 'outlined'; $disabled?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 20px;
  border-radius: ${theme.radiusMd};
  font-weight: 600;
  font-size: 0.875rem;
  text-transform: none;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;

  ${({ $variant }) =>
    $variant === 'contained'
      ? css`
          background: ${theme.accentGradient};
          color: white;
          &:hover { background: ${theme.accentGradientHover}; }
        `
      : $variant === 'outlined'
      ? css`
          background: transparent;
          border: 1px solid rgba(0,201,255,0.5);
          color: ${theme.accent};
          &:hover {
            border-color: ${theme.accent};
            background: rgba(0,201,255,0.1);
          }
        `
      : css`
          background: transparent;
          color: ${theme.text};
          &:hover { background: rgba(255,255,255,0.05); }
        `}

  ${({ $disabled }) =>
    $disabled &&
    css`
      opacity: 0.4;
      pointer-events: none;
    `}
`;

const RoundButton = styled.button<{ $size?: number }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => $size || 44}px;
  height: ${({ $size }) => $size || 44}px;
  min-width: ${({ $size }) => $size || 44}px;
  min-height: ${({ $size }) => $size || 44}px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: ${theme.textSecondary};
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;

  &:hover {
    background: rgba(255,255,255,0.08);
    color: ${theme.text};
  }
`;

const Avatar = styled.div<{ $size?: number; $src?: string }>`
  width: ${({ $size }) => $size || 40}px;
  height: ${({ $size }) => $size || 40}px;
  border-radius: 50%;
  background: ${({ $src }) => ($src ? `url(${$src}) center/cover no-repeat` : 'linear-gradient(135deg, #0ea5e9, #7851a9)')};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: white;
  font-size: 0.875rem;
`;

const OnlineIndicator = styled.span<{ $isOnline: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${({ $isOnline }) => ($isOnline ? theme.green : '#666')};
  border: 2px solid ${theme.bgChat};
  position: absolute;
  bottom: 0;
  right: 0;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 12px 10px 40px;
  border-radius: ${theme.radiusSm};
  border: 1px solid ${theme.borderSubtle};
  background-color: ${theme.glass};
  color: ${theme.text};
  font-size: 0.875rem;
  outline: none;
  min-height: 44px;

  &::placeholder { color: ${theme.textSecondary}; }
  &:focus { border-color: ${theme.accent}; }
`;

const MessageInput = styled.textarea`
  width: 100%;
  padding: 12px;
  border-radius: ${theme.radiusSm};
  border: 1px solid ${theme.borderSubtle};
  background-color: ${theme.glass};
  color: ${theme.text};
  font-size: 0.875rem;
  outline: none;
  resize: none;
  min-height: 44px;
  max-height: 120px;
  font-family: inherit;
  line-height: 1.5;

  &::placeholder { color: ${theme.textSecondary}; }
  &:focus { border-color: ${theme.accent}; }
`;

const ConversationItem = styled.button<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: calc(100% - 16px);
  margin: 0 8px 4px;
  padding: 10px 12px;
  border-radius: ${theme.radiusSm};
  border: none;
  background: ${({ $selected }) => ($selected ? 'rgba(0,201,255,0.1)' : 'transparent')};
  cursor: pointer;
  text-align: left;
  min-height: 44px;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(0,201,255,0.08);
  }
`;

const UnreadBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background-color: ${theme.accent};
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
`;

const ChannelChip = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 12px;
  min-height: 28px;
  border-radius: 14px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;

  ${({ $active }) =>
    $active
      ? css`
          background: ${theme.accent};
          color: white;
          border: 1px solid ${theme.accent};
        `
      : css`
          background: transparent;
          color: ${theme.textSecondary};
          border: 1px solid ${theme.borderSubtle};
          &:hover {
            border-color: ${theme.accent};
            color: ${theme.text};
          }
        `}
`;

const TagChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(14,165,233,0.15);
  color: ${theme.accent};
  font-size: 0.75rem;
  font-weight: 500;
`;

const AttachmentChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(255,255,255,0.08);
  color: ${theme.text};
  font-size: 0.8rem;
`;

const RemoveChipButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.15);
  color: ${theme.text};
  cursor: pointer;
  padding: 0;
  font-size: 12px;

  &:hover { background: rgba(255,255,255,0.25); }
`;

const CardPanel = styled.div`
  background: ${theme.bgCard};
  border: 1px solid ${theme.border};
  border-radius: ${theme.radiusMd};
  padding: 20px;
  backdrop-filter: blur(12px);
`;

const GridContainer = styled.div`
  display: grid;
  gap: 24px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const GridTwoCol = styled.div`
  display: grid;
  gap: 16px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const ProgressBar = styled.div<{ $value: number; $color?: string }>`
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(255,255,255,0.08);
  margin-top: 12px;
  overflow: hidden;

  &::after {
    content: '';
    display: block;
    width: ${({ $value }) => $value}%;
    height: 100%;
    border-radius: 3px;
    background: ${({ $color }) => $color || theme.accent};
    transition: width 0.5s ease;
  }
`;

const Spinner = styled.span`
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid ${theme.borderSubtle};
  border-top-color: ${theme.accent};
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`;

const TabBar = styled.div`
  display: flex;
  gap: 4px;
  border-bottom: 2px solid ${theme.borderSubtle};
  margin-bottom: 24px;
`;

const TabButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  min-height: 44px;
  border: none;
  border-bottom: 3px solid ${({ $active }) => ($active ? theme.accent : 'transparent')};
  background: transparent;
  color: ${({ $active }) => ($active ? theme.accent : '#a0a0a0')};
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: -2px;

  &:hover {
    color: ${theme.accent};
  }
`;

const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  span {
    position: absolute;
    cursor: pointer;
    inset: 0;
    background: rgba(255,255,255,0.15);
    border-radius: 12px;
    transition: 0.3s;

    &::before {
      content: '';
      position: absolute;
      width: 18px;
      height: 18px;
      left: 3px;
      bottom: 3px;
      background: white;
      border-radius: 50%;
      transition: 0.3s;
    }
  }

  input:checked + span {
    background: ${theme.accent};
  }

  input:checked + span::before {
    transform: translateX(20px);
  }
`;

const SpeedDialContainer = styled.div`
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 12px;
  z-index: 1000;
`;

const SpeedDialFab = styled.button`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: ${theme.accentGradient};
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0,201,255,0.3);
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.accentGradientHover};
    transform: scale(1.05);
  }
`;

const SpeedDialActions = styled.div<{ $open: boolean }>`
  display: flex;
  flex-direction: column-reverse;
  gap: 10px;
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
  transform: ${({ $open }) => ($open ? 'translateY(0)' : 'translateY(10px)')};
  transition: all 0.2s ease;
`;

const SpeedDialActionBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-radius: 24px;
  border: none;
  background: ${theme.bgCard};
  color: ${theme.text};
  font-size: 0.8rem;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  min-height: 44px;
  transition: background 0.15s;

  &:hover {
    background: rgba(14,165,233,0.15);
  }
`;

const RelativeWrapper = styled.div`
  position: relative;
  display: inline-flex;
`;

const SearchInputWrapper = styled.div`
  position: relative;
  width: 100%;

  svg {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: ${theme.textSecondary};
    pointer-events: none;
  }
`;

const EmptyState = styled.div`
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 16px;
  color: #666;
`;

const FlexRow = styled.div`
  display: flex;
  align-items: center;
`;

const FlexCol = styled.div`
  display: flex;
  flex-direction: column;
`;

// ─── Component ───────────────────────────────────────────────────────────────

interface CommunicationCenterProps {
  clientId?: string;
  onMessageSend?: (message: any) => void;
  onCallStart?: (type: 'voice' | 'video', participantId: string) => void;
  onTemplateCreate?: (template: NotificationTemplate) => void;
}

const CommunicationCenter: React.FC<CommunicationCenterProps> = ({
  clientId,
  onMessageSend,
  onCallStart,
  onTemplateCreate
}) => {
  // State management
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<'app' | 'sms' | 'email'>('app');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock data
  const mockParticipants: Participant[] = [
    {
      id: '1',
      name: 'John Doe',
      avatar: '/api/placeholder/40/40',
      email: 'john.doe@example.com',
      phone: '+1 555-123-4567',
      role: 'client',
      isOnline: true,
      lastSeen: new Date().toISOString(),
      preferredChannel: 'app',
      timezone: 'America/New_York'
    },
    {
      id: '2',
      name: 'Jane Smith',
      avatar: '/api/placeholder/40/40',
      email: 'jane.smith@example.com',
      phone: '+1 555-234-5678',
      role: 'client',
      isOnline: false,
      lastSeen: new Date(Date.now() - 3600000).toISOString(),
      preferredChannel: 'email',
      timezone: 'America/Los_Angeles'
    },
    {
      id: '3',
      name: 'Fitness Group',
      avatar: '/api/placeholder/40/40',
      email: 'group@example.com',
      role: 'client',
      isOnline: true,
      lastSeen: new Date().toISOString(),
      preferredChannel: 'app',
      timezone: 'America/Chicago'
    }
  ];

  const mockConversations: Conversation[] = [
    {
      id: 'conv1',
      participantIds: ['1'],
      participants: [mockParticipants[0]],
      lastMessage: {
        id: 'msg1',
        senderId: '1',
        senderName: 'John Doe',
        senderAvatar: '/api/placeholder/40/40',
        receiverId: 'admin',
        content: 'Thanks for the workout plan! Looking forward to tomorrow\'s session.',
        type: 'text',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        status: 'read',
        channel: 'app'
      },
      unreadCount: 0,
      isGroup: false,
      type: 'direct',
      status: 'active',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 300000).toISOString(),
      isOnline: true,
      isPinned: true,
      preferences: {
        notifications: true,
        emailNotifications: true,
        smsNotifications: false
      }
    },
    {
      id: 'conv2',
      participantIds: ['2'],
      participants: [mockParticipants[1]],
      lastMessage: {
        id: 'msg2',
        senderId: 'admin',
        senderName: 'Trainer',
        senderAvatar: '/api/placeholder/40/40',
        receiverId: '2',
        content: 'Don\'t forget about your nutrition consultation tomorrow at 3 PM',
        type: 'text',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        status: 'delivered',
        channel: 'app'
      },
      unreadCount: 2,
      isGroup: false,
      type: 'direct',
      status: 'active',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
      isOnline: false,
      lastSeen: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'conv3',
      participantIds: ['1', '2', '3'],
      participants: mockParticipants,
      lastMessage: {
        id: 'msg3',
        senderId: '3',
        senderName: 'Fitness Group',
        senderAvatar: '/api/placeholder/40/40',
        receiverId: 'group',
        content: 'Who\'s joining the 7 AM group workout tomorrow?',
        type: 'text',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        status: 'read',
        channel: 'app'
      },
      unreadCount: 5,
      isGroup: true,
      groupName: 'Morning Workout Group',
      groupAvatar: '/api/placeholder/40/40',
      type: 'group',
      status: 'active',
      createdAt: new Date(Date.now() - 604800000).toISOString(),
      updatedAt: new Date(Date.now() - 7200000).toISOString(),
      isOnline: true
    }
  ];

  const mockNotificationTemplates: NotificationTemplate[] = [
    {
      id: 'tpl1',
      name: 'Appointment Reminder',
      subject: 'Your training session is tomorrow',
      content: 'Hi {{name}}, this is a reminder that you have a training session scheduled for {{date}} at {{time}}. See you there!',
      type: 'appointment',
      channels: ['app', 'email', 'sms'],
      triggers: ['24h_before_appointment'],
      isActive: true,
      personalization: true,
      schedule: {
        time: '24h_before',
        frequency: 'once'
      }
    },
    {
      id: 'tpl2',
      name: 'Workout Follow-up',
      subject: 'How was your workout?',
      content: 'Hi {{name}}, hope you enjoyed your workout today! Don\'t forget to log your results and hydrate well. Any feedback?',
      type: 'follow-up',
      channels: ['app'],
      triggers: ['1h_after_workout'],
      isActive: true,
      personalization: true,
      schedule: {
        time: '1h_after',
        frequency: 'once'
      }
    }
  ];

  const mockAnalytics: CommunicationAnalytics = {
    totalMessages: 1247,
    responseRate: 94.5,
    avgResponseTime: 8.5,
    channelBreakdown: {
      app: 65,
      email: 25,
      sms: 10
    },
    sentimentAnalysis: {
      positive: 78,
      neutral: 18,
      negative: 4
    },
    engagementMetrics: {
      openRate: 96.8,
      clickRate: 45.2,
      replyRate: 67.3
    }
  };

  // Initialize data
  useEffect(() => {
    setConversations(mockConversations);
    if (mockConversations.length > 0) {
      setSelectedConversation(mockConversations[0]);
    }
  }, []);

  // Load messages for selected conversation
  useEffect(() => {
    if (selectedConversation) {
      const conversationMessages: MessageData[] = [
        {
          id: 'msg1',
          senderId: selectedConversation.participants[0].id,
          senderName: selectedConversation.participants[0].name,
          senderAvatar: selectedConversation.participants[0].avatar,
          receiverId: 'admin',
          content: 'Hey! I just finished my workout. Feeling great!',
          type: 'text',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          status: 'read',
          channel: 'app'
        },
        {
          id: 'msg2',
          senderId: 'admin',
          senderName: 'Trainer',
          senderAvatar: '/api/placeholder/40/40',
          receiverId: selectedConversation.participants[0].id,
          content: 'That\'s awesome! How did the new routine feel? Any muscle soreness?',
          type: 'text',
          timestamp: new Date(Date.now() - 3500000).toISOString(),
          status: 'read',
          channel: 'app'
        },
        {
          id: 'msg3',
          senderId: selectedConversation.participants[0].id,
          senderName: selectedConversation.participants[0].name,
          senderAvatar: selectedConversation.participants[0].avatar,
          receiverId: 'admin',
          content: 'It was challenging but in a good way. My legs are definitely feeling it!',
          type: 'text',
          timestamp: new Date(Date.now() - 3400000).toISOString(),
          status: 'read',
          channel: 'app'
        },
        selectedConversation.lastMessage
      ];
      setMessages(conversationMessages);
    }
  }, [selectedConversation]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;
    return conversations.filter(conv =>
      conv.participants.some(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) ||
      conv.lastMessage.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  // Handle sending message
  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const message: MessageData = {
      id: `msg_${Date.now()}`,
      senderId: 'admin',
      senderName: 'Trainer',
      senderAvatar: '/api/placeholder/40/40',
      receiverId: selectedConversation.participants[0].id,
      content: newMessage,
      type: 'text',
      timestamp: new Date().toISOString(),
      status: 'sent',
      channel: selectedChannel
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    onMessageSend?.(message);

    // Simulate message status updates
    setTimeout(() => {
      setMessages(prev => prev.map(msg =>
        msg.id === message.id ? { ...msg, status: 'delivered' } : msg
      ));
    }, 1000);

    setTimeout(() => {
      setMessages(prev => prev.map(msg =>
        msg.id === message.id ? { ...msg, status: 'read' } : msg
      ));
    }, 3000);
  };

  // Handle file attachment
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  // Render status icon
  const renderStatusIcon = (status: string, size: number = 14) => {
    if (status === 'read') return <CheckCheck size={size} color={theme.green} />;
    if (status === 'delivered') return <CheckCheck size={size} color="#999" />;
    if (status === 'sent') return <Check size={size} color="#999" />;
    return null;
  };

  // Render conversation list item
  const renderConversationItem = (conversation: Conversation) => (
    <ConversationItem
      key={conversation.id}
      $selected={selectedConversation?.id === conversation.id}
      onClick={() => setSelectedConversation(conversation)}
    >
      <RelativeWrapper>
        {conversation.isGroup ? (
          <Avatar $src={conversation.groupAvatar}>
            <Users size={18} />
          </Avatar>
        ) : (
          <Avatar $src={conversation.participants[0].avatar} />
        )}
        {!conversation.isGroup && (
          <OnlineIndicator $isOnline={conversation.participants[0].isOnline} />
        )}
        {conversation.isPinned && (
          <Star
            size={14}
            fill={theme.gold}
            color={theme.gold}
            style={{ position: 'absolute', top: -5, right: -5 }}
          />
        )}
      </RelativeWrapper>

      <FlexCol style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <FlexRow style={{ justifyContent: 'space-between', gap: 8 }}>
          <span style={{ color: theme.text, fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {conversation.isGroup ? conversation.groupName : conversation.participants[0].name}
          </span>
          <CaptionText style={{ flexShrink: 0 }}>
            {formatDistanceToNow(new Date(conversation.lastMessage.timestamp), { addSuffix: true })}
          </CaptionText>
        </FlexRow>
        <FlexRow style={{ justifyContent: 'space-between', gap: 8 }}>
          <SmallText style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
            {conversation.lastMessage.content}
          </SmallText>
          <FlexRow style={{ gap: 6, flexShrink: 0 }}>
            {renderStatusIcon(conversation.lastMessage.status, 16)}
            {conversation.unreadCount > 0 && (
              <UnreadBadge>{conversation.unreadCount}</UnreadBadge>
            )}
          </FlexRow>
        </FlexRow>
      </FlexCol>
    </ConversationItem>
  );

  // Render message bubble
  const renderMessage = (message: MessageData) => {
    const isOwn = message.senderId === 'admin';
    return (
      <div
        key={message.id}
        style={{
          marginBottom: 16,
          display: 'flex',
          flexDirection: isOwn ? 'row-reverse' : 'row',
          gap: 8
        }}
      >
        {!isOwn && <Avatar $size={32} $src={message.senderAvatar} />}
        <div style={{ maxWidth: '70%' }}>
          <MessageBubble $isOwn={isOwn}>
            {message.content}
          </MessageBubble>
          <div
            style={{
              marginTop: 4,
              display: 'flex',
              justifyContent: isOwn ? 'flex-end' : 'flex-start',
              gap: 6,
              alignItems: 'center'
            }}
          >
            <CaptionText>
              {format(new Date(message.timestamp), 'HH:mm')}
            </CaptionText>
            {isOwn && renderStatusIcon(message.status)}
          </div>
        </div>
      </div>
    );
  };

  // Render analytics dashboard
  const renderAnalytics = () => (
    <div style={{ padding: 24 }}>
      <h6 style={{ color: theme.accent, marginBottom: 24, fontSize: '1.15rem', fontWeight: 600, margin: '0 0 24px' }}>
        Communication Analytics
      </h6>
      <GridContainer>
        <CardPanel>
          <h4 style={{ color: theme.accent, fontWeight: 700, fontSize: '1.75rem', margin: 0 }}>
            {mockAnalytics.totalMessages}
          </h4>
          <SmallText>Total Messages</SmallText>
          <ProgressBar $value={85} $color={theme.accent} />
        </CardPanel>
        <CardPanel>
          <h4 style={{ color: theme.green, fontWeight: 700, fontSize: '1.75rem', margin: 0 }}>
            {mockAnalytics.responseRate}%
          </h4>
          <SmallText>Response Rate</SmallText>
          <ProgressBar $value={mockAnalytics.responseRate} $color={theme.green} />
        </CardPanel>
        <CardPanel>
          <h4 style={{ color: theme.orange, fontWeight: 700, fontSize: '1.75rem', margin: 0 }}>
            {mockAnalytics.avgResponseTime}min
          </h4>
          <SmallText>Avg Response Time</SmallText>
          <ProgressBar $value={75} $color={theme.orange} />
        </CardPanel>
      </GridContainer>
    </div>
  );

  // Render templates management
  const renderTemplates = () => (
    <div style={{ padding: 24 }}>
      <FlexRow style={{ justifyContent: 'space-between', marginBottom: 24 }}>
        <h6 style={{ color: theme.accent, fontSize: '1.15rem', fontWeight: 600, margin: 0 }}>
          Notification Templates
        </h6>
        <ActionButton $variant="contained">
          <Plus size={18} />
          Create Template
        </ActionButton>
      </FlexRow>
      <GridTwoCol>
        {mockNotificationTemplates.map((template) => (
          <CardPanel key={template.id}>
            <FlexRow style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <SubHeading>{template.name}</SubHeading>
              <ToggleSwitch>
                <input type="checkbox" defaultChecked={template.isActive} />
                <span />
              </ToggleSwitch>
            </FlexRow>
            <SmallText style={{ display: 'block', marginBottom: 12 }}>
              {template.content.substring(0, 100)}...
            </SmallText>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {template.channels.map((channel) => (
                <TagChip key={channel}>{channel}</TagChip>
              ))}
            </div>
            <CaptionText>
              Trigger: {template.triggers[0]}
            </CaptionText>
          </CardPanel>
        ))}
      </GridTwoCol>
    </div>
  );

  return (
    <PageWrapper>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <SectionHeading>
          <MessageSquare size={40} />
          Communication Center
        </SectionHeading>
        <BodyText style={{ marginTop: 8 }}>
          Connect with clients across multiple channels and manage all communications
        </BodyText>
      </div>

      {/* Tab Navigation */}
      <TabBar>
        <TabButton $active={activeTab === 0} onClick={() => setActiveTab(0)}>
          <MessageCircle size={18} />
          Messages
        </TabButton>
        <TabButton $active={activeTab === 1} onClick={() => setActiveTab(1)}>
          <Megaphone size={18} />
          Templates
        </TabButton>
        <TabButton $active={activeTab === 2} onClick={() => setActiveTab(2)}>
          <BarChart3 size={18} />
          Analytics
        </TabButton>
      </TabBar>

      {/* Messages Tab */}
      {activeTab === 0 && (
        <ChatContainer>
          {/* Conversation List */}
          <ConversationListPanel>
            <div style={{ padding: 12, borderBottom: `1px solid ${theme.borderSubtle}` }}>
              <SearchInputWrapper>
                <Search size={16} />
                <SearchInput
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </SearchInputWrapper>
            </div>
            <div style={{ padding: 0 }}>
              {filteredConversations.map(renderConversationItem)}
            </div>
          </ConversationListPanel>

          {/* Chat Area */}
          <ChatArea>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <FlexRow
                  style={{
                    padding: 16,
                    borderBottom: `1px solid ${theme.borderSubtle}`,
                    justifyContent: 'space-between'
                  }}
                >
                  <FlexRow style={{ gap: 12 }}>
                    <Avatar
                      $src={
                        selectedConversation.isGroup
                          ? selectedConversation.groupAvatar
                          : selectedConversation.participants[0].avatar
                      }
                    />
                    <FlexCol>
                      <SubHeading>
                        {selectedConversation.isGroup
                          ? selectedConversation.groupName
                          : selectedConversation.participants[0].name}
                      </SubHeading>
                      <CaptionText>
                        {selectedConversation.isGroup
                          ? `${selectedConversation.participants.length} members`
                          : selectedConversation.participants[0].isOnline
                            ? 'Online now'
                            : `Last seen ${formatDistanceToNow(new Date(selectedConversation.participants[0].lastSeen))} ago`
                        }
                      </CaptionText>
                    </FlexCol>
                  </FlexRow>
                  <FlexRow style={{ gap: 4 }}>
                    <RoundButton
                      title="Voice Call"
                      onClick={() => onCallStart?.('voice', selectedConversation.participants[0].id)}
                    >
                      <Phone size={20} />
                    </RoundButton>
                    <RoundButton
                      title="Video Call"
                      onClick={() => onCallStart?.('video', selectedConversation.participants[0].id)}
                    >
                      <Video size={20} />
                    </RoundButton>
                    <RoundButton title="More Options">
                      <MoreVertical size={20} />
                    </RoundButton>
                  </FlexRow>
                </FlexRow>

                {/* Messages */}
                <div style={{ flexGrow: 1, padding: 16, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                  {messages.map(renderMessage)}
                  {isTyping && (
                    <FlexRow style={{ gap: 8, marginTop: 16 }}>
                      <Avatar $size={24} $src={selectedConversation.participants[0].avatar} />
                      <CaptionText>
                        {selectedConversation.participants[0].name} is typing...
                      </CaptionText>
                      <Spinner />
                    </FlexRow>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div style={{ padding: 16, borderTop: `1px solid ${theme.borderSubtle}` }}>
                  {attachments.length > 0 && (
                    <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {attachments.map((file, index) => (
                        <AttachmentChip key={index}>
                          {file.name}
                          <RemoveChipButton onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}>
                            <X size={10} />
                          </RemoveChipButton>
                        </AttachmentChip>
                      ))}
                    </div>
                  )}
                  <FlexRow style={{ gap: 8 }}>
                    <MessageInput
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      rows={1}
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                    <RoundButton title="Attach File" onClick={() => fileInputRef.current?.click()}>
                      <Paperclip size={20} />
                    </RoundButton>
                    <RoundButton title="Voice Message">
                      <Mic size={20} />
                    </RoundButton>
                    <ActionButton
                      $variant="contained"
                      $disabled={!newMessage.trim()}
                      onClick={handleSendMessage}
                    >
                      <Send size={18} />
                    </ActionButton>
                  </FlexRow>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <ChannelChip
                      $active={selectedChannel === 'app'}
                      onClick={() => setSelectedChannel('app')}
                    >
                      App
                    </ChannelChip>
                    <ChannelChip
                      $active={selectedChannel === 'sms'}
                      onClick={() => setSelectedChannel('sms')}
                    >
                      SMS
                    </ChannelChip>
                    <ChannelChip
                      $active={selectedChannel === 'email'}
                      onClick={() => setSelectedChannel('email')}
                    >
                      Email
                    </ChannelChip>
                  </div>
                </div>
              </>
            ) : (
              <EmptyState>
                <MessageSquare size={64} />
                <SubHeading style={{ color: theme.textSecondary }}>
                  Select a conversation to start messaging
                </SubHeading>
              </EmptyState>
            )}
          </ChatArea>
        </ChatContainer>
      )}

      {/* Templates Tab */}
      {activeTab === 1 && renderTemplates()}

      {/* Analytics Tab */}
      {activeTab === 2 && renderAnalytics()}

      {/* Speed Dial / Floating Action Button */}
      <SpeedDialContainer>
        <SpeedDialFab
          onClick={() => setSpeedDialOpen(prev => !prev)}
          aria-label="Communication Actions"
        >
          {speedDialOpen ? <X size={24} /> : <Plus size={24} />}
        </SpeedDialFab>
        <SpeedDialActions $open={speedDialOpen}>
          <SpeedDialActionBtn onClick={() => { setShowComposer(true); setSpeedDialOpen(false); }}>
            <UserPlus size={18} />
            New Conversation
          </SpeedDialActionBtn>
          <SpeedDialActionBtn onClick={() => { setShowComposer(true); setSpeedDialOpen(false); }}>
            <Megaphone size={18} />
            Broadcast Message
          </SpeedDialActionBtn>
          <SpeedDialActionBtn onClick={() => { setShowTemplates(true); setSpeedDialOpen(false); }}>
            <Mail size={18} />
            Create Template
          </SpeedDialActionBtn>
        </SpeedDialActions>
      </SpeedDialContainer>
    </PageWrapper>
  );
};

export default CommunicationCenter;
