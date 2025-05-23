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
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Button,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  TextField,
  InputAdornment,
  Divider,
  Badge,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  BottomNavigation,
  BottomNavigationAction,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  FormControl,
  InputLabel,
  Select,
  Autocomplete,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tab,
  Tabs,
  TabPanel,
  AlertTitle,
  Alert,
  CircularProgress,
  LinearProgress
} from '@mui/material';
import {
  Message,
  Send,
  Phone,
  VideoCall,
  Email,
  Sms,
  NotificationsActive,
  AttachFile,
  PhotoCamera,
  Mic,
  VoiceChat,
  ScreenShare,
  Group,
  Broadcast,
  Schedule,
  History,
  Search,
  Filter,
  Reply,
  Forward,
  Archive,
  Star,
  StarBorder,
  MoreVert,
  Close,
  Add,
  PersonAdd,
  EmojiEmotions,
  Gif,
  Check,
  DoneAll,
  PersonOff,
  Block,
  Report,
  Priority,
  Assessment,
  Analytics,
  Insights,
  AutorenewRounded,
  Psychology,
  SmartToy,
  Translate,
  RecordVoiceOver,
  Headset,
  CampaignOutlined,
  GroupAdd,
  MarkChatUnread,
  ChatBubbleOutline,
  VideoLibrary,
  Attachment,
  EmojiFlags,
  Language,
  Schedule as ScheduleIcon,
  AccessTime,
  CalendarToday,
  MessageRounded,
  VideocamOff,
  MicOff
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { formatDistanceToNow, format } from 'date-fns';

// Define interfaces
interface Message {
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
  lastMessage: Message;
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

// Styled components
const ChatContainer = styled(Box)(({ theme }) => ({
  height: '600px',
  display: 'flex',
  flexDirection: 'column',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: 16,
  overflow: 'hidden',
  backgroundColor: '#1a1a2e',
}));

const ConversationList = styled(Box)(({ theme }) => ({
  width: '300px',
  borderRight: '1px solid rgba(255, 255, 255, 0.1)',
  backgroundColor: '#16213e',
  overflow: 'auto',
}));

const ChatArea = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#1a1a2e',
}));

const MessageBubble = styled(Paper)<{ isOwn: boolean }>(({ theme, isOwn }) => ({
  maxWidth: '70%',
  padding: theme.spacing(1, 2),
  borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
  backgroundColor: isOwn ? '#00c9ff' : 'rgba(255, 255, 255, 0.05)',
  color: isOwn ? '#000' : '#e0e0e0',
  marginLeft: isOwn ? 'auto' : 0,
  marginRight: isOwn ? 0 : 'auto',
  wordWrap: 'break-word',
}));

const CommunicationButton = styled(Button)(({ theme, variant: buttonVariant }) => ({
  borderRadius: 12,
  textTransform: 'none',
  fontWeight: 600,
  ...(buttonVariant === 'contained' && {
    background: 'linear-gradient(135deg, #00c9ff, #0066cc)',
    color: 'white',
    '&:hover': {
      background: 'linear-gradient(135deg, #0099cc, #0055bb)',
    },
  }),
  ...(buttonVariant === 'outlined' && {
    borderColor: 'rgba(0, 201, 255, 0.5)',
    color: '#00c9ff',
    '&:hover': {
      borderColor: '#00c9ff',
      backgroundColor: 'rgba(0, 201, 255, 0.1)',
    },
  }),
}));

const OnlineIndicator = styled(Box)<{ isOnline: boolean }>(({ theme, isOnline }) => ({
  width: 12,
  height: 12,
  borderRadius: '50%',
  backgroundColor: isOnline ? '#4caf50' : '#666',
  border: '2px solid #1a1a2e',
  position: 'absolute',
  bottom: 0,
  right: 0,
}));

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
  const [messages, setMessages] = useState<Message[]>([]);
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
      // Mock messages for the conversation
      const conversationMessages: Message[] = [
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

    const message: Message = {
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

  // Render conversation list item
  const renderConversationItem = (conversation: Conversation) => (
    <ListItem
      key={conversation.id}
      button
      selected={selectedConversation?.id === conversation.id}
      onClick={() => setSelectedConversation(conversation)}
      sx={{
        borderRadius: 2,
        mx: 1,
        mb: 1,
        '&.Mui-selected': {
          backgroundColor: 'rgba(0, 201, 255, 0.1)',
        },
      }}
    >
      <ListItemIcon>
        <Box sx={{ position: 'relative' }}>
          {conversation.isGroup ? (
            <Avatar src={conversation.groupAvatar}>
              <Group />
            </Avatar>
          ) : (
            <Avatar src={conversation.participants[0].avatar} />
          )}
          {!conversation.isGroup && (
            <OnlineIndicator isOnline={conversation.participants[0].isOnline} />
          )}
          {conversation.isPinned && (
            <Star sx={{ position: 'absolute', top: -5, right: -5, fontSize: 16, color: '#ffd700' }} />
          )}
        </Box>
      </ListItemIcon>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
            <Typography variant="subtitle2" fontWeight={600}>
              {conversation.isGroup ? conversation.groupName : conversation.participants[0].name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDistanceToNow(new Date(conversation.lastMessage.timestamp), { addSuffix: true })}
            </Typography>
          </Box>
        }
        secondary={
          <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: '180px' }}>
              {conversation.lastMessage.content}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {conversation.lastMessage.status === 'read' && <DoneAll sx={{ fontSize: 16, color: '#4caf50' }} />}
              {conversation.lastMessage.status === 'delivered' && <DoneAll sx={{ fontSize: 16, color: '#999' }} />}
              {conversation.lastMessage.status === 'sent' && <Check sx={{ fontSize: 16, color: '#999' }} />}
              {conversation.unreadCount > 0 && (
                <Chip 
                  label={conversation.unreadCount} 
                  size="small" 
                  sx={{ 
                    height: 20, 
                    fontSize: '0.75rem',
                    bgcolor: '#00c9ff',
                    color: 'white'
                  }} 
                />
              )}
            </Box>
          </Box>
        }
      />
    </ListItem>
  );

  // Render message bubble
  const renderMessage = (message: Message) => {
    const isOwn = message.senderId === 'admin';
    return (
      <Box key={message.id} sx={{ mb: 2, display: 'flex', flexDirection: isOwn ? 'row-reverse' : 'row', gap: 1 }}>
        {!isOwn && (
          <Avatar src={message.senderAvatar} sx={{ width: 32, height: 32 }} />
        )}
        <Box sx={{ maxWidth: '70%' }}>
          <MessageBubble isOwn={isOwn}>
            <Typography variant="body2">{message.content}</Typography>
          </MessageBubble>
          <Box sx={{ mt: 0.5, display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {format(new Date(message.timestamp), 'HH:mm')}
            </Typography>
            {isOwn && (
              <>
                {message.status === 'read' && <DoneAll sx={{ fontSize: 14, color: '#4caf50' }} />}
                {message.status === 'delivered' && <DoneAll sx={{ fontSize: 14, color: '#999' }} />}
                {message.status === 'sent' && <Check sx={{ fontSize: 14, color: '#999' }} />}
              </>
            )}
          </Box>
        </Box>
      </Box>
    );
  };

  // Render analytics dashboard
  const renderAnalytics = () => (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ color: '#00c9ff', mb: 3 }}>
        Communication Analytics
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#1d1f2b', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h4" sx={{ color: '#00c9ff', fontWeight: 700 }}>
                {mockAnalytics.totalMessages}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Messages
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={85} 
                sx={{ mt: 2, height: 6, borderRadius: 3 }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#1d1f2b', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 700 }}>
                {mockAnalytics.responseRate}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Response Rate
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={mockAnalytics.responseRate} 
                sx={{ mt: 2, height: 6, borderRadius: 3 }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#1d1f2b', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 700 }}>
                {mockAnalytics.avgResponseTime}min
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg Response Time
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={75} 
                sx={{ mt: 2, height: 6, borderRadius: 3 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  // Render templates management
  const renderTemplates = () => (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ color: '#00c9ff' }}>
          Notification Templates
        </Typography>
        <CommunicationButton variant="contained" startIcon={<Add />}>
          Create Template
        </CommunicationButton>
      </Box>
      <Grid container spacing={2}>
        {mockNotificationTemplates.map((template) => (
          <Grid item xs={12} md={6} key={template.id}>
            <Card sx={{ bgcolor: '#1d1f2b', borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6">{template.name}</Typography>
                  <Switch checked={template.isActive} />
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {template.content.substring(0, 100)}...
                </Typography>
                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {template.channels.map((channel) => (
                    <Chip key={channel} label={channel} size="small" />
                  ))}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Trigger: {template.triggers[0]}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ color: '#00c9ff', mb: 1, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Message sx={{ fontSize: 40 }} />
          Communication Center
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Connect with clients across multiple channels and manage all communications
        </Typography>
      </Box>

      {/* Tab Navigation */}
      <Tabs 
        value={activeTab} 
        onChange={(e, newValue) => setActiveTab(newValue)}
        sx={{
          mb: 3,
          '& .MuiTab-root': { 
            color: '#a0a0a0',
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 500,
            '&.Mui-selected': { color: '#00c9ff' }
          },
          '& .MuiTabs-indicator': { 
            backgroundColor: '#00c9ff',
            height: 3,
            borderRadius: '3px 3px 0 0'
          }
        }}
      >
        <Tab icon={<ChatBubbleOutline />} iconPosition="start" label="Messages" />
        <Tab icon={<CampaignOutlined />} iconPosition="start" label="Templates" />
        <Tab icon={<Analytics />} iconPosition="start" label="Analytics" />
      </Tabs>

      {/* Messages Tab */}
      {activeTab === 0 && (
        <ChatContainer>
          {/* Conversation List */}
          <ConversationList>
            <Box sx={{ p: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: '#999' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiInputBase-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 2,
                  },
                }}
              />
            </Box>
            <List sx={{ p: 0 }}>
              {filteredConversations.map(renderConversationItem)}
            </List>
          </ConversationList>

          {/* Chat Area */}
          <ChatArea>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <Box sx={{ p: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar src={selectedConversation.isGroup ? selectedConversation.groupAvatar : selectedConversation.participants[0].avatar} />
                    <Box>
                      <Typography variant="h6">
                        {selectedConversation.isGroup ? selectedConversation.groupName : selectedConversation.participants[0].name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {selectedConversation.isGroup 
                          ? `${selectedConversation.participants.length} members`
                          : selectedConversation.participants[0].isOnline 
                            ? 'Online now' 
                            : `Last seen ${formatDistanceToNow(new Date(selectedConversation.participants[0].lastSeen))} ago`
                        }
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Voice Call">
                      <IconButton onClick={() => onCallStart?.('voice', selectedConversation.participants[0].id)}>
                        <Phone />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Video Call">
                      <IconButton onClick={() => onCallStart?.('video', selectedConversation.participants[0].id)}>
                        <VideoCall />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="More Options">
                      <IconButton>
                        <MoreVert />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Messages */}
                <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                  {messages.map(renderMessage)}
                  {isTyping && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                      <Avatar src={selectedConversation.participants[0].avatar} sx={{ width: 24, height: 24 }} />
                      <Typography variant="caption" color="text.secondary">
                        {selectedConversation.participants[0].name} is typing...
                      </Typography>
                      <CircularProgress size={16} />
                    </Box>
                  )}
                  <div ref={messagesEndRef} />
                </Box>

                {/* Message Input */}
                <Box sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  {attachments.length > 0 && (
                    <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {attachments.map((file, index) => (
                        <Chip 
                          key={index}
                          label={file.name}
                          onDelete={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                          size="small"
                        />
                      ))}
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField
                      fullWidth
                      multiline
                      maxRows={4}
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      sx={{
                        '& .MuiInputBase-root': {
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: 2,
                        },
                      }}
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                    <Tooltip title="Attach File">
                      <IconButton onClick={() => fileInputRef.current?.click()}>
                        <AttachFile />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Voice Message">
                      <IconButton>
                        <Mic />
                      </IconButton>
                    </Tooltip>
                    <CommunicationButton variant="contained" onClick={handleSendMessage} disabled={!newMessage.trim()}>
                      <Send />
                    </CommunicationButton>
                  </Box>
                  <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                    <Chip 
                      label="App" 
                      size="small" 
                      variant={selectedChannel === 'app' ? 'filled' : 'outlined'}
                      onClick={() => setSelectedChannel('app')}
                    />
                    <Chip 
                      label="SMS" 
                      size="small" 
                      variant={selectedChannel === 'sms' ? 'filled' : 'outlined'}
                      onClick={() => setSelectedChannel('sms')}
                    />
                    <Chip 
                      label="Email" 
                      size="small" 
                      variant={selectedChannel === 'email' ? 'filled' : 'outlined'}
                      onClick={() => setSelectedChannel('email')}
                    />
                  </Box>
                </Box>
              </>
            ) : (
              <Box sx={{ 
                flexGrow: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 2
              }}>
                <Message sx={{ fontSize: 64, color: '#666' }} />
                <Typography variant="h6" color="text.secondary">
                  Select a conversation to start messaging
                </Typography>
              </Box>
            )}
          </ChatArea>
        </ChatContainer>
      )}

      {/* Templates Tab */}
      {activeTab === 1 && renderTemplates()}

      {/* Analytics Tab */}
      {activeTab === 2 && renderAnalytics()}

      {/* Floating Action Button */}
      <SpeedDial
        ariaLabel="Communication Actions"
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        icon={<SpeedDialIcon />}
        FabProps={{
          sx: {
            background: 'linear-gradient(135deg, #00c9ff, #0066cc)',
            '&:hover': {
              background: 'linear-gradient(135deg, #0099cc, #0055bb)',
            },
          },
        }}
      >
        <SpeedDialAction
          icon={<PersonAdd />}
          tooltipTitle="New Conversation"
          onClick={() => setShowComposer(true)}
        />
        <SpeedDialAction
          icon={<Broadcast />}
          tooltipTitle="Broadcast Message"
          onClick={() => setShowComposer(true)}
        />
        <SpeedDialAction
          icon={<CampaignOutlined />}
          tooltipTitle="Create Template"
          onClick={() => setShowTemplates(true)}
        />
      </SpeedDial>
    </Box>
  );
};

export default CommunicationCenter;