/**
 * ┌─── SUB-COMPONENT: CommunicationCenter ─────────────────────┐
 * │ PARENT: EnhancedAdminClientManagementView (Comms tab)       │
 * │ PURPOSE: Multi-channel messaging hub for client comms       │
 * │ OWNER: Claude Opus 4.6 | LAST VALIDATED: 2026-03-21        │
 * └─────────────────────────────────────────────────────────────┘
 *
 * WIREFRAME:
 * ┌──────────────────────────────────────────────────────┐
 * │ [SMS|Email|Video|Voice|Group|Broadcast]               │ ChannelTabs
 * ├──────────────────────────────────────────────────────┤
 * │ ┌─ Message Thread ────────────────────────────────┐ │
 * │ │ Trainer: Hey Jackie, how's the knee?            │ │
 * │ │ Client: Much better! Ready for Phase 2          │ │
 * │ │ [AI Suggestion: "Great progress! Let's..."]     │ │
 * │ └────────────────────────────────────────────────┘ │
 * │ [Type a message...                          ] [➤]  │
 * └──────────────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  { clientId, clientName }
 * State:     { activeChannel, messages[], draft }
 * API Calls: GET/POST /api/messaging/conversations
 *
 * Theme: Crystalline Swan (NOT Crystalline Swan — RETIRED)
 * NOTE: 1,445 lines — CRITICAL monolith. TODO: extract channel components
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { sanitizeImageUrl, cssUrlValue } from '../../../../../utils/imageUrl';
import { useAuth } from '../../../../../context/AuthContext';
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
  ShieldAlert,
  Plus
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useCommunicationVoiceDraft } from './useCommunicationVoiceDraft';
import AdminNotificationDeliveryHealth from './AdminNotificationDeliveryHealth';
import AdminBroadcastComposer from './AdminBroadcastComposer';
import AdminMessageReportQueue from './AdminMessageReportQueue';

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
  metadata?: Record<string, unknown>;
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

// ─── Styled Components ───────────────────────────────────────────────────────

const PageWrapper = styled.div`
  padding: 24px;
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

const BodyText = styled.p<{ $top?: boolean }>`
  color: ${theme.textSecondary};
  font-size: 1rem;
  margin: ${({ $top }) => ($top ? '8px 0 0' : 0)};
`;

const CaptionText = styled.span<{ $shrink?: boolean }>`
  color: ${theme.textSecondary};
  font-size: 0.75rem;
  flex-shrink: ${({ $shrink }) => ($shrink ? 0 : 'initial')};
`;

const SmallText = styled.span<{ $truncate?: boolean; $block?: boolean; $bottom?: boolean }>`
  display: ${({ $block }) => ($block ? 'block' : 'inline')};
  color: ${theme.textSecondary};
  font-size: 0.875rem;
  margin-bottom: ${({ $bottom }) => ($bottom ? '12px' : 0)};
  ${({ $truncate }) =>
    $truncate &&
    css`
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 180px;
    `}
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

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`;

const Avatar = styled.div<{ $size?: number; $src?: string }>`
  width: ${({ $size }) => $size || 40}px;
  height: ${({ $size }) => $size || 40}px;
  border-radius: 50%;
  background: ${({ $src }) => {
    const safe = $src ? sanitizeImageUrl($src) : null;
    return safe
      ? `url(${cssUrlValue(safe)}) center/cover no-repeat`
      : 'linear-gradient(135deg, #0ea5e9, #8B5CF6)';
  }};
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

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
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

const InlineStatus = styled.div`
  padding: 16px;
  color: ${theme.textSecondary};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ErrorBanner = styled.div`
  margin: 0 0 16px;
  padding: 12px 14px;
  border: 1px solid rgba(255,152,0,0.35);
  border-radius: ${theme.radiusSm};
  background: rgba(255,152,0,0.1);
  color: ${theme.text};
`;

const FlexRow = styled.div<{
  $gap?: number;
  $between?: boolean;
  $alignStart?: boolean;
  $bottom?: boolean;
  $wrap?: boolean;
  $shrink?: boolean;
}>`
  display: flex;
  align-items: ${({ $alignStart }) => ($alignStart ? 'flex-start' : 'center')};
  justify-content: ${({ $between }) => ($between ? 'space-between' : 'flex-start')};
  gap: ${({ $gap }) => $gap ?? 0}px;
  margin-bottom: ${({ $bottom }) => ($bottom ? '24px' : 0)};
  flex-wrap: ${({ $wrap }) => ($wrap ? 'wrap' : 'nowrap')};
  flex-shrink: ${({ $shrink }) => ($shrink ? 0 : 'initial')};
`;

const FlexCol = styled.div<{ $fill?: boolean; $gap?: number }>`
  display: flex;
  flex-direction: column;
  flex: ${({ $fill }) => ($fill ? 1 : 'initial')};
  min-width: ${({ $fill }) => ($fill ? 0 : 'auto')};
  gap: ${({ $gap }) => $gap ?? 0}px;
`;

const AbsolutePinnedStar = styled(Star)`
  position: absolute;
  top: -5px;
  right: -5px;
`;

const ConversationName = styled.span`
  color: ${theme.text};
  font-weight: 600;
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const MessageRow = styled.div<{ $own?: boolean }>`
  margin-bottom: 16px;
  display: flex;
  flex-direction: ${({ $own }) => ($own ? 'row-reverse' : 'row')};
  gap: 8px;
`;

const MessageContentWrap = styled.div`
  max-width: 70%;
`;

const MessageMetaRow = styled.div<{ $own?: boolean }>`
  margin-top: 4px;
  display: flex;
  justify-content: ${({ $own }) => ($own ? 'flex-end' : 'flex-start')};
  gap: 6px;
  align-items: center;
`;

const SectionBlock = styled.div`
  padding: 24px;
`;

const HeaderBlock = styled.div`
  margin-bottom: 32px;
`;

const SectionSubTitle = styled.h6`
  color: ${theme.accent};
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0 0 24px;
`;

const MetricValue = styled.h4<{ $tone: 'accent' | 'green' | 'orange' }>`
  color: ${({ $tone }) =>
    $tone === 'green' ? theme.green : $tone === 'orange' ? theme.orange : theme.accent};
  font-weight: 700;
  font-size: 1.75rem;
  margin: 0;
`;

const TemplateTagRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
`;

const ConversationListHeader = styled.div`
  padding: 12px;
  border-bottom: 1px solid ${theme.borderSubtle};
`;

const ConversationListBody = styled.div`
  padding: 0;
`;

const ChatHeader = styled(FlexRow)`
  padding: 16px;
  border-bottom: 1px solid ${theme.borderSubtle};
`;

const MessagesPane = styled.div`
  flex-grow: 1;
  padding: 16px;
  overflow: auto;
  display: flex;
  flex-direction: column;
`;

const ComposerPanel = styled.div`
  padding: 16px;
  border-top: 1px solid ${theme.borderSubtle};
`;

const AttachmentRow = styled.div`
  margin-bottom: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const ChannelRow = styled.div`
  margin-top: 8px;
  display: flex;
  gap: 8px;
`;

const EmptyStateHeading = styled(SubHeading)`
  color: ${theme.textSecondary};
`;

// ─── Component ───────────────────────────────────────────────────────────────

interface CommunicationCenterProps {
  clientId?: string;
  onMessageSend?: (message: MessageData) => void;
  onCallStart?: (type: 'voice' | 'video', participantId: string) => void;
  onTemplateCreate?: (template: NotificationTemplate) => void;
}

type ApiRecord = Record<string, unknown>;

const asRecord = (value: unknown): ApiRecord => (
  value && typeof value === 'object' ? value as ApiRecord : {}
);

const asArray = (value: unknown): unknown[] => (
  Array.isArray(value) ? value : []
);

const asString = (value: unknown, fallback = ''): string => (
  typeof value === 'string' && value.length > 0 ? value : fallback
);

const asNumber = (value: unknown, fallback = 0): number => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const participantToPayloadId = (clientId?: string): string | number | null => {
  if (!clientId) return null;
  const numericId = Number(clientId);
  return Number.isFinite(numericId) ? numericId : clientId;
};

const normalizeParticipant = (participant: unknown): Participant => {
  const raw = asRecord(participant);
  const id = String(raw.id ?? '');
  const firstName = asString(raw.firstName);
  const lastName = asString(raw.lastName);
  const displayName = asString(
    raw.name,
    [firstName, lastName].filter(Boolean).join(' ') || 'Client',
  );
  const role = asString(raw.role, 'client');

  return {
    id,
    name: displayName,
    avatar: asString(raw.avatar, asString(raw.photo)),
    email: asString(raw.email),
    phone: asString(raw.phone),
    role: role === 'user' ? 'client' : role as Participant['role'],
    isOnline: Boolean(raw.isOnline),
    lastSeen: asString(raw.lastSeen, new Date().toISOString()),
    preferredChannel: 'app',
    timezone: asString(raw.timezone, Intl.DateTimeFormat().resolvedOptions().timeZone),
  };
};

const mapConversation = (conversation: unknown): Conversation | null => {
  const raw = asRecord(conversation);
  if (raw.id == null) return null;

  const id = String(raw.id);
  const participants = asArray(raw.participants).map(normalizeParticipant);
  const visibleParticipants = participants.length > 0
    ? participants
    : [normalizeParticipant({ id: 'unknown', name: asString(raw.name, 'Conversation') })];
  const lastMessage = asRecord(raw.lastMessage);
  const timestamp = asString(
    lastMessage.timestamp,
    asString(raw.updatedAt, asString(raw.updated_at, new Date(0).toISOString())),
  );
  const type = asString(raw.type, 'direct') as Conversation['type'];

  return {
    id,
    participantIds: visibleParticipants.map(participant => participant.id),
    participants: visibleParticipants,
    lastMessage: {
      id: `last-${id}`,
      senderId: asString(lastMessage.senderId),
      senderName: asString(lastMessage.senderName),
      senderAvatar: asString(lastMessage.senderAvatar),
      receiverId: '',
      content: asString(lastMessage.content, 'No messages yet'),
      type: 'text',
      timestamp,
      status: 'read',
      channel: 'app',
    },
    unreadCount: asNumber(raw.unreadCount),
    isGroup: type === 'group',
    groupName: asString(raw.name),
    groupAvatar: '',
    type,
    status: 'active',
    createdAt: asString(raw.createdAt, asString(raw.created_at, timestamp)),
    updatedAt: asString(raw.updatedAt, asString(raw.updated_at, timestamp)),
  };
};

const mapMessage = (message: unknown, currentUserId?: string): MessageData | null => {
  const raw = asRecord(message);
  if (raw.id == null || raw.content == null) return null;

  const sender = asRecord(raw.sender);
  const senderId = String(raw.sender_id ?? sender.id ?? '');
  const sentAt = asString(raw.created_at, asString(raw.timestamp, new Date().toISOString()));

  return {
    id: String(raw.id),
    senderId,
    senderName: asString(sender.name, senderId === currentUserId ? 'You' : 'Client'),
    senderAvatar: asString(sender.photo, asString(sender.avatar)),
    receiverId: '',
    content: asString(raw.content),
    type: 'text',
    timestamp: sentAt,
    status: 'read',
    channel: 'app',
  };
};

const CommunicationCenter: React.FC<CommunicationCenterProps> = ({
  clientId: _clientId,
  onMessageSend,
  onCallStart,
  onTemplateCreate: _onTemplateCreate
}) => {
  // State management
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<'app' | 'sms' | 'email'>('app');
  const [activeTab, setActiveTab] = useState(0);
  const [deliveryHealthVersion, setDeliveryHealthVersion] = useState(0);
  const [isTyping] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [communicationError, setCommunicationError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const { authAxios, user } = useAuth();
  const clientId = _clientId ? String(_clientId) : undefined;
  const currentUserId = user?.id != null ? String(user.id) : undefined;
  const handleVoiceTranscript = useCallback((transcript: string) => {
    setSendError(null);
    setNewMessage((current) => {
      const currentDraft = current.trim();
      return currentDraft ? `${currentDraft} ${transcript}` : transcript;
    });
  }, []);
  const voiceDraft = useCommunicationVoiceDraft({
    onStatus: setVoiceStatus,
    onTranscript: handleVoiceTranscript,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const notificationTemplates = useMemo<NotificationTemplate[]>(() => [], []);

  const communicationAnalytics = useMemo<CommunicationAnalytics>(() => {
    const clearedThreadCount = conversations.filter(conversation => conversation.unreadCount === 0).length;
    const unreadThreadCount = conversations.length - clearedThreadCount;
    const clearedThreadRate = conversations.length > 0
      ? Math.round((clearedThreadCount / conversations.length) * 100)
      : 0;

    return {
      totalMessages: messages.length,
      responseRate: clearedThreadRate,
      avgResponseTime: unreadThreadCount,
      channelBreakdown: {
        app: messages.length,
        email: 0,
        sms: 0,
      },
      sentimentAnalysis: {
        positive: 0,
        neutral: messages.length,
        negative: 0,
      },
      engagementMetrics: {
        openRate: clearedThreadRate,
        clickRate: 0,
        replyRate: clearedThreadRate,
      },
    };
  }, [conversations, messages.length]);

  const loadConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    setCommunicationError(null);

    try {
      const response = await authAxios.get('/api/messaging/conversations');
      const rawConversations = Array.isArray(response.data)
        ? response.data
        : asArray(asRecord(response.data).conversations);
      const mappedConversations = rawConversations
        .map(mapConversation)
        .filter((conversation): conversation is Conversation => Boolean(conversation));
      const scopedConversations = clientId
        ? mappedConversations.filter(conversation => conversation.participantIds.includes(clientId))
        : mappedConversations;

      setConversations(scopedConversations);
      setSelectedConversation(previous => {
        if (!scopedConversations.length) return null;
        if (!previous) return scopedConversations[0];
        return scopedConversations.find(conversation => conversation.id === previous.id) ?? scopedConversations[0];
      });
    } catch {
      setConversations([]);
      setSelectedConversation(null);
      setMessages([]);
      setCommunicationError('Messaging could not be loaded.');
    } finally {
      setIsLoadingConversations(false);
    }
  }, [authAxios, clientId]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    const loadMessages = async () => {
      setIsLoadingMessages(true);
      setCommunicationError(null);

      try {
        const messagePath = `/api/messaging/conversations/${selectedConversation.id}/messages`;
        const response = await authAxios.get(messagePath, { params: { limit: 50 } });
        const rawMessages = Array.isArray(response.data)
          ? response.data
          : asArray(asRecord(response.data).messages);
        const mappedMessages = rawMessages
          .map(message => mapMessage(message, currentUserId))
          .filter((message): message is MessageData => Boolean(message));

        if (!cancelled) {
          setMessages(mappedMessages);
        }
      } catch {
        if (!cancelled) {
          setMessages([]);
          setCommunicationError('Message history could not be loaded.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMessages(false);
        }
      }
    };

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [authAxios, currentUserId, selectedConversation]);

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

  const refreshBroadcastDeliveryHealth = useCallback(() => {
    setDeliveryHealthVersion(prev => prev + 1);
  }, []);

  const handleStartConversation = async () => {
    const participantId = participantToPayloadId(clientId);
    if (!participantId || isLoadingConversations) return;

    setIsLoadingConversations(true);
    setCommunicationError(null);

    try {
      await authAxios.post('/api/messaging/conversations', {
        type: 'direct',
        participantIds: [participantId],
      });
      await loadConversations();
    } catch {
      setCommunicationError('Conversation could not be started.');
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    const content = newMessage.trim();
    const messagePath = `/api/messaging/conversations/${selectedConversation.id}/messages`;
    setIsSending(true);
    setSendError(null);

    try {
      const response = await authAxios.post(messagePath, { content });
      const sentMessage = mapMessage(response.data, currentUserId);
      if (!sentMessage) {
        throw new Error('Invalid message response');
      }

      setMessages(prev => [...prev, sentMessage]);
      setConversations(prev => prev.map(conversation => (
        conversation.id === selectedConversation.id
          ? { ...conversation, lastMessage: sentMessage, updatedAt: sentMessage.timestamp }
          : conversation
      )));
      setNewMessage('');
      onMessageSend?.(sentMessage);
    } catch {
      setSendError('Message could not be sent.');
    } finally {
      setIsSending(false);
    }
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
          <AbsolutePinnedStar
            size={14}
            fill={theme.gold}
            color={theme.gold}
          />
        )}
      </RelativeWrapper>

      <FlexCol $fill $gap={2}>
        <FlexRow $between $gap={8}>
          <ConversationName>
            {conversation.isGroup ? conversation.groupName : conversation.participants[0].name}
          </ConversationName>
          <CaptionText $shrink>
            {formatDistanceToNow(new Date(conversation.lastMessage.timestamp), { addSuffix: true })}
          </CaptionText>
        </FlexRow>
        <FlexRow $between $gap={8}>
          <SmallText $truncate>
            {conversation.lastMessage.content}
          </SmallText>
          <FlexRow as="span" $gap={6} $shrink>
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
    const isOwn = currentUserId ? message.senderId === currentUserId : message.senderId === 'admin';
    return (
      <MessageRow
        key={message.id}
        $own={isOwn}
      >
        {!isOwn && <Avatar $size={32} $src={message.senderAvatar} />}
        <MessageContentWrap>
          <MessageBubble $isOwn={isOwn}>
            {message.content}
          </MessageBubble>
          <MessageMetaRow $own={isOwn}>
            <CaptionText>
              {format(new Date(message.timestamp), 'HH:mm')}
            </CaptionText>
            {isOwn && renderStatusIcon(message.status)}
          </MessageMetaRow>
        </MessageContentWrap>
      </MessageRow>
    );
  };

  // Render analytics dashboard
  const renderAnalytics = () => (
    <>
      <AdminNotificationDeliveryHealth key={deliveryHealthVersion} />
      <SectionBlock>
        <SectionSubTitle>
          Communication Analytics
        </SectionSubTitle>
        <GridContainer>
        <CardPanel>
          <MetricValue $tone="accent">
            {communicationAnalytics.totalMessages}
          </MetricValue>
          <SmallText>Loaded Messages</SmallText>
          <ProgressBar $value={Math.min(communicationAnalytics.totalMessages * 10, 100)} $color={theme.accent} />
        </CardPanel>
        <CardPanel>
          <MetricValue $tone="green">
            {communicationAnalytics.responseRate}%
          </MetricValue>
          <SmallText>Cleared Threads</SmallText>
          <ProgressBar $value={communicationAnalytics.responseRate} $color={theme.green} />
        </CardPanel>
        <CardPanel>
          <MetricValue $tone="orange">
            {communicationAnalytics.avgResponseTime}
          </MetricValue>
          <SmallText>Unread Threads</SmallText>
          <ProgressBar $value={Math.min(communicationAnalytics.avgResponseTime * 20, 100)} $color={theme.orange} />
        </CardPanel>
        </GridContainer>
      </SectionBlock>
    </>
  );

  // Render templates management
  const renderTemplates = () => (
    <SectionBlock>
      <FlexRow $between $bottom>
        <SectionSubTitle>
          Notification Templates
        </SectionSubTitle>
        <ActionButton
          $variant="contained"
          $disabled
          disabled
          title="Template backend not connected"
        >
          <Plus size={18} />
          Create Template
        </ActionButton>
      </FlexRow>
      <GridTwoCol>
        {notificationTemplates.length > 0 ? (
          notificationTemplates.map((template) => (
            <CardPanel key={template.id}>
              <FlexRow $between $alignStart $gap={12}>
                <SubHeading>{template.name}</SubHeading>
                <ToggleSwitch aria-label={`Toggle ${template.name}`}>
                  <input type="checkbox" defaultChecked={template.isActive} aria-label={`Toggle ${template.name}`} />
                  <span />
                </ToggleSwitch>
              </FlexRow>
              <SmallText $block $bottom>
                {template.content.substring(0, 100)}...
              </SmallText>
              <TemplateTagRow>
                {template.channels.map((channel) => (
                  <TagChip key={channel}>{channel}</TagChip>
                ))}
              </TemplateTagRow>
              <CaptionText>
                Trigger: {template.triggers[0]}
              </CaptionText>
            </CardPanel>
          ))
        ) : (
          <CardPanel>
            <SubHeading>No templates connected</SubHeading>
            <SmallText $block $bottom>
              Notification templates will appear here after a backend template source is connected.
            </SmallText>
          </CardPanel>
        )}
      </GridTwoCol>
    </SectionBlock>
  );

  const renderBroadcasts = () => (
    <SectionBlock>
      <AdminBroadcastComposer onBroadcastComplete={() => void refreshBroadcastDeliveryHealth()} />
    </SectionBlock>
  );

  const renderModeration = () => (
    <SectionBlock>
      <AdminMessageReportQueue />
    </SectionBlock>
  );

  return (
    <PageWrapper>
      {/* Header */}
      <HeaderBlock>
        <SectionHeading>
          <MessageSquare size={40} />
          Communication Center
        </SectionHeading>
        <BodyText $top>
          Connect with clients across multiple channels and manage all communications
        </BodyText>
      </HeaderBlock>

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
        <TabButton $active={activeTab === 3} onClick={() => setActiveTab(3)}>
          <Megaphone size={18} />
          Broadcasts
        </TabButton>
        <TabButton $active={activeTab === 4} onClick={() => setActiveTab(4)}>
          <ShieldAlert size={18} />
          Moderation
        </TabButton>
      </TabBar>

      {communicationError && (
        <ErrorBanner role="alert">
          {communicationError}
        </ErrorBanner>
      )}

      {/* Messages Tab */}
      {activeTab === 0 && (
        <ChatContainer>
          {/* Conversation List */}
          <ConversationListPanel>
            <ConversationListHeader>
              <SearchInputWrapper>
                <Search size={16} />
                <SearchInput
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </SearchInputWrapper>
            </ConversationListHeader>
            <ConversationListBody>
              {isLoadingConversations ? (
                <InlineStatus>
                  <Spinner />
                  Loading conversations
                </InlineStatus>
              ) : filteredConversations.length > 0 ? (
                filteredConversations.map(renderConversationItem)
              ) : (
                <InlineStatus>
                  No conversations found
                </InlineStatus>
              )}
            </ConversationListBody>
          </ConversationListPanel>

          {/* Chat Area */}
          <ChatArea>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <ChatHeader $between>
                  <FlexRow $gap={12}>
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
                  <FlexRow $gap={4}>
                    <RoundButton
                      type="button"
                      title={onCallStart ? 'Voice Call' : 'Voice call backend not connected'}
                      aria-label={onCallStart ? 'Start voice call' : 'Voice call unavailable'}
                      disabled={!onCallStart}
                      onClick={() => onCallStart?.('voice', selectedConversation.participants[0].id)}
                    >
                      <Phone size={20} />
                    </RoundButton>
                    <RoundButton
                      type="button"
                      title={onCallStart ? 'Video Call' : 'Video call backend not connected'}
                      aria-label={onCallStart ? 'Start video call' : 'Video call unavailable'}
                      disabled={!onCallStart}
                      onClick={() => onCallStart?.('video', selectedConversation.participants[0].id)}
                    >
                      <Video size={20} />
                    </RoundButton>
                    <RoundButton
                      type="button"
                      title="Thread options backend not connected"
                      aria-label="Thread options unavailable"
                      disabled
                    >
                      <MoreVertical size={20} />
                    </RoundButton>
                  </FlexRow>
                </ChatHeader>

                {/* Messages */}
                <MessagesPane>
                  {isLoadingMessages ? (
                    <InlineStatus>
                      <Spinner />
                      Loading messages
                    </InlineStatus>
                  ) : messages.length > 0 ? (
                    messages.map(renderMessage)
                  ) : (
                    <InlineStatus>
                      No messages yet
                    </InlineStatus>
                  )}
                  {isTyping && (
                    <FlexRow $gap={8}>
                      <Avatar $size={24} $src={selectedConversation.participants[0].avatar} />
                      <CaptionText>
                        {selectedConversation.participants[0].name} is typing...
                      </CaptionText>
                      <Spinner />
                    </FlexRow>
                  )}
                  <div ref={messagesEndRef} />
                </MessagesPane>

                {/* Message Input */}
                <ComposerPanel>
                  {sendError && (
                    <ErrorBanner role="alert">
                      {sendError}
                    </ErrorBanner>
                  )}
                  {attachments.length > 0 && (
                    <AttachmentRow>
                      {attachments.map((file, index) => (
                        <AttachmentChip key={index}>
                          {file.name}
                          <RemoveChipButton onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}>
                            <X size={10} />
                          </RemoveChipButton>
                        </AttachmentChip>
                      ))}
                    </AttachmentRow>
                  )}
                  {voiceStatus && !sendError && (
                    <CaptionText role="status">
                      {voiceStatus}
                    </CaptionText>
                  )}
                  <FlexRow $gap={8}>
                    <MessageInput
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void handleSendMessage();
                        }
                      }}
                      rows={1}
                    />
                    <HiddenFileInput
                      type="file"
                      ref={fileInputRef}
                      multiple
                      onChange={handleFileUpload}
                    />
                    <RoundButton title="Attach File" onClick={() => fileInputRef.current?.click()}>
                      <Paperclip size={20} />
                    </RoundButton>
                    <RoundButton
                      type="button"
                      title={voiceDraft.title}
                      aria-label={voiceDraft.label}
                      aria-pressed={voiceDraft.listening}
                      disabled={!voiceDraft.supported}
                      onClick={voiceDraft.toggle}
                    >
                      <Mic size={20} />
                    </RoundButton>
                    <ActionButton
                      $variant="contained"
                      $disabled={!newMessage.trim() || isSending}
                      disabled={!newMessage.trim() || isSending}
                      onClick={handleSendMessage}
                    >
                      <Send size={18} />
                    </ActionButton>
                  </FlexRow>
                  <ChannelRow>
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
                  </ChannelRow>
                </ComposerPanel>
              </>
            ) : (
              <EmptyState>
                <MessageSquare size={64} />
                <EmptyStateHeading>
                  No conversation selected
                </EmptyStateHeading>
                {clientId && (
                  <ActionButton
                    $variant="contained"
                    $disabled={isLoadingConversations}
                    disabled={isLoadingConversations}
                    onClick={handleStartConversation}
                  >
                    <MessageCircle size={18} />
                    Start Conversation
                  </ActionButton>
                )}
              </EmptyState>
            )}
          </ChatArea>
        </ChatContainer>
      )}

      {/* Templates Tab */}
      {activeTab === 1 && renderTemplates()}

      {/* Analytics Tab */}
      {activeTab === 2 && renderAnalytics()}

      {/* Broadcasts Tab */}
      {activeTab === 3 && renderBroadcasts()}

      {/* Moderation Tab */}
      {activeTab === 4 && renderModeration()}

      {/* Speed Dial / Floating Action Button */}
      <SpeedDialContainer>
        <SpeedDialFab
          onClick={() => setSpeedDialOpen(prev => !prev)}
          aria-label="Communication Actions"
        >
          {speedDialOpen ? <X size={24} /> : <Plus size={24} />}
        </SpeedDialFab>
        <SpeedDialActions $open={speedDialOpen}>
          <SpeedDialActionBtn disabled title="Composer is available from a selected conversation">
            <UserPlus size={18} />
            New Conversation
          </SpeedDialActionBtn>
          <SpeedDialActionBtn
            onClick={() => {
              setActiveTab(3);
              setSpeedDialOpen(false);
            }}
          >
            <Megaphone size={18} />
            Broadcast Message
          </SpeedDialActionBtn>
          <SpeedDialActionBtn disabled title="Template backend not connected">
            <Mail size={18} />
            Create Template
          </SpeedDialActionBtn>
        </SpeedDialActions>
      </SpeedDialContainer>
    </PageWrapper>
  );
};

export default CommunicationCenter;
