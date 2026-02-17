import React, { useState, useEffect, useRef, useCallback } from 'react';
import { workoutMcpApi, gamificationMcpApi } from '../../../../services/mcpApis';
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from './components/animation-variants';
import { useAuth } from '../../../../context/AuthContext';
import useClientDashboardMcp from '../../../../hooks/useClientDashboardMcp';
import GamificationDisplay from '../../../../components/Gamification/GamificationDisplay';
import FoodIntakeForm from '../../../../components/FoodTracker/FoodIntakeForm';
import McpStatusIndicator from '../../../../components/ui/McpStatusIndicator';
import styled, { keyframes, css } from 'styled-components';
import './client-dashboard.css';

// Lucide icons
import {
  MessageSquare,
  Calendar,
  Trophy,
  Activity,
  User,
  Clock,
  Zap,
  Dumbbell,
  BarChart2,
  Heart,
  Flame,
  Send,
  Paperclip,
  Smile,
  Target,
  CheckCircle,
  ChevronRight,
  Video,
  Server,
  Award,
  Star,
  Medal
} from 'lucide-react';

// Custom components
import DashboardStatsCard from '../../../DashBoard/components/dashboard-stats-card';
import DashboardSection from './components/DashboardSection';

// ─── Theme Tokens ───────────────────────────────────────────────────
const theme = {
  bg: 'rgba(15,23,42,0.95)',
  border: 'rgba(14,165,233,0.2)',
  text: '#e2e8f0',
  accent: '#0ea5e9',
  galaxyCore: '#0a0a1a',
  swanCyan: '#00FFFF',
  cosmicPurple: '#7851A9',
} as const;

// ─── Keyframe Animations ────────────────────────────────────────────
const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 5px rgba(0, 255, 255, 0.5), 0 0 10px rgba(120, 81, 169, 0.4); }
  50% { box-shadow: 0 0 10px rgba(0, 255, 255, 0.8), 0 0 15px rgba(120, 81, 169, 0.6); }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// ─── Styled Components ──────────────────────────────────────────────
const DashboardContainer = styled(motion.div)`
  width: 100%;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  background: linear-gradient(135deg, ${theme.galaxyCore}, #1e1e3f);
  color: ${theme.text};
  padding: 2rem 1rem;
`;

const VideoBackground = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  overflow: hidden;

  &:after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(10,10,30,0.8), rgba(20,20,50,0.9));
    z-index: 1;
  }

  video {
    position: absolute;
    top: 50%;
    left: 50%;
    min-width: 100%;
    min-height: 100%;
    width: auto;
    height: auto;
    transform: translate(-50%, -50%);
    z-index: 0;
    object-fit: cover;
  }
`;

// ─── Glass Panel (replaces Paper) ───────────────────────────────────
const GlassPanel = styled.div`
  background: ${theme.bg};
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid ${theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  color: ${theme.text};
`;

// ─── Action Button (replaces Button) ────────────────────────────────
const ActionButton = styled.button<{ $fullWidth?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0.5rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  color: #fff;
  cursor: pointer;
  text-transform: none;
  background: linear-gradient(90deg, ${theme.swanCyan} 0%, ${theme.cosmicPurple} 100%);
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  ${({ $fullWidth }) => $fullWidth && 'width: 100%;'}

  &:hover {
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.5), 0 0 30px rgba(120, 81, 169, 0.3);
    transform: translateY(-2px);
  }

  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%);
    transition: all 0.4s ease;
  }

  &:hover:before {
    left: 100%;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

// ─── Round Button (replaces IconButton) ─────────────────────────────
const RoundButton = styled.button<{ $size?: 'small' | 'medium' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  width: ${({ $size }) => $size === 'small' ? '44px' : '44px'};
  height: ${({ $size }) => $size === 'small' ? '44px' : '44px'};
  border: none;
  border-radius: 50%;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 0;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

// ─── Progress Bar (replaces LinearProgress) ─────────────────────────
const ProgressBarTrack = styled.div`
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.1);
  overflow: hidden;
`;

const ProgressBarFill = styled.div<{ $value: number; $color?: string }>`
  height: 100%;
  border-radius: 4px;
  width: ${({ $value }) => Math.min(100, Math.max(0, $value))}%;
  background: ${({ $color }) => {
    switch ($color) {
      case 'secondary': return 'linear-gradient(90deg, #ce93d8, #ab47bc)';
      case 'success': return 'linear-gradient(90deg, #66bb6a, #43a047)';
      case 'warning': return 'linear-gradient(90deg, #ffa726, #fb8c00)';
      default: return `linear-gradient(90deg, ${theme.swanCyan}, ${theme.accent})`;
    }
  }};
  transition: width 0.6s ease;
`;

// ─── Avatar ─────────────────────────────────────────────────────────
const AvatarCircle = styled.div<{ $size?: number }>`
  width: ${({ $size }) => $size || 40}px;
  height: ${({ $size }) => $size || 40}px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.3), rgba(120, 81, 169, 0.3));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

// ─── Online Badge ───────────────────────────────────────────────────
const BadgeWrapper = styled.div`
  position: relative;
  display: inline-flex;
`;

const OnlineDot = styled.span<{ $online?: boolean }>`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $online }) => $online ? '#66bb6a' : '#ffa726'};
  box-shadow: 0 0 0 2px #1E1E3F;
  z-index: 1;
`;

// ─── Grid Layout ────────────────────────────────────────────────────
const GridContainer = styled.div<{ $spacing?: number }>`
  display: grid;
  gap: ${({ $spacing }) => ($spacing || 2) * 8}px;
`;

const MainGrid = styled(GridContainer)`
  grid-template-columns: 1fr;

  @media (min-width: 768px) {
    grid-template-columns: 7fr 5fr;
  }

  @media (min-width: 1024px) {
    grid-template-columns: 8fr 4fr;
  }
`;

const StatsGrid = styled(GridContainer)`
  grid-template-columns: 1fr;

  @media (min-width: 375px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

// ─── Typography replacements ────────────────────────────────────────
const Heading1 = styled.h1`
  font-weight: 300;
  font-size: 2rem;
  margin: 0 0 0.5rem 0;
  color: ${theme.text};
  display: flex;
  align-items: center;
`;

const Heading2 = styled.h2`
  font-weight: 400;
  font-size: 1.5rem;
  margin: 0;
  color: ${theme.text};
`;

const BodyText = styled.p`
  font-size: 1rem;
  margin: 0;
  color: ${theme.text};
`;

const SubtitleText = styled.span`
  font-size: 1rem;
  font-weight: 500;
  color: ${theme.text};
`;

const CaptionText = styled.span`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
`;

const SmallText = styled.span`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
`;

const MessageBodyText = styled.span`
  font-size: 0.875rem;
  color: ${theme.text};
`;

// ─── Section-specific styled components ─────────────────────────────
const ProgressContainer = styled.div`
  margin-bottom: 1rem;
`;

const ProgressLabel = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const ProgressName = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
`;

const ProgressValue = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
`;

// ─── Chat Components ────────────────────────────────────────────────
const ChatSection = styled(DashboardSection)`
  display: flex;
  flex-direction: column;
  height: 500px;
`;

const ChatHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const ChatMessages = styled.div`
  flex: 1;
  overflow-y: auto;
  margin-bottom: 1rem;
  padding-right: 0.5rem;

  &::-webkit-scrollbar {
    width: 5px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(120, 81, 169, 0.5);
    border-radius: 3px;
  }
`;

const MessageBubble = styled(motion.div)<{ $isUser?: boolean }>`
  max-width: 75%;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: 12px;
  align-self: ${({ $isUser }) => $isUser ? 'flex-end' : 'flex-start'};
  background: ${({ $isUser }) => $isUser ?
    'linear-gradient(90deg, rgba(0, 255, 255, 0.2), rgba(120, 81, 169, 0.3))' :
    'rgba(30, 30, 60, 0.6)'};
  border: 1px solid ${({ $isUser }) => $isUser ?
    'rgba(0, 255, 255, 0.3)' :
    'rgba(255, 255, 255, 0.1)'};
  margin-left: ${({ $isUser }) => $isUser ? 'auto' : '0'};
  margin-right: ${({ $isUser }) => $isUser ? '0' : 'auto'};
  position: relative;

  &:after {
    content: '';
    position: absolute;
    bottom: 0;
    ${({ $isUser }) => $isUser ? 'right: -8px;' : 'left: -8px;'}
    width: 16px;
    height: 16px;
    background: ${({ $isUser }) => $isUser ?
      'linear-gradient(90deg, rgba(0, 255, 255, 0.2), rgba(120, 81, 169, 0.3))' :
      'rgba(30, 30, 60, 0.6)'};
    transform: rotate(45deg);
    border-${({ $isUser }) => $isUser ? 'right' : 'left'}: 1px solid ${({ $isUser }) => $isUser ?
      'rgba(0, 255, 255, 0.3)' :
      'rgba(255, 255, 255, 0.1)'};
    border-bottom: 1px solid ${({ $isUser }) => $isUser ?
      'rgba(0, 255, 255, 0.3)' :
      'rgba(255, 255, 255, 0.1)'};
  }
`;

const MessageTime = styled.span`
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 0.25rem;
  display: block;
  text-align: right;
`;

const ChatInputContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(30, 30, 60, 0.5);
  border-radius: 12px;
  padding: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const NativeInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: white;
  font-size: 0.9rem;
  padding: 0.5rem;
  font-family: inherit;
  min-height: 44px;

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
`;

const SendButtonStyled = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(90deg, rgba(0, 255, 255, 0.8), rgba(120, 81, 169, 0.8));
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 0;
  flex-shrink: 0;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
  }
`;

// ─── Session / Workout Components ───────────────────────────────────
const SessionCard = styled(motion.div)`
  background: rgba(30, 30, 60, 0.4);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1rem;
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-3px);
    border-color: rgba(0, 255, 255, 0.3);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    background: rgba(40, 40, 80, 0.4);
  }
`;

const UpcomingLabel = styled.div`
  background: linear-gradient(90deg, rgba(0, 255, 255, 0.3), rgba(120, 81, 169, 0.3));
  color: white;
  font-size: 0.7rem;
  font-weight: 500;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const WorkoutItem = styled(motion.div)`
  display: flex;
  align-items: center;
  padding: 0.75rem;
  background: rgba(30, 30, 60, 0.4);
  border-radius: 10px;
  margin-bottom: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(40, 40, 80, 0.5);
    transform: translateX(5px);
    border-color: rgba(0, 255, 255, 0.2);
  }
`;

const WorkoutIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.75rem;
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.15), rgba(120, 81, 169, 0.15));
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const WorkoutInfo = styled.div`
  flex: 1;
`;

const WorkoutName = styled.div`
  font-weight: 500;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
`;

const WorkoutDetails = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  gap: 0.75rem;
`;

// ─── Achievement Components ─────────────────────────────────────────
const AchievementCard = styled(motion.div)<{ $isLocked?: boolean }>`
  display: flex;
  align-items: center;
  padding: 0.75rem;
  background: rgba(30, 30, 60, 0.4);
  border-radius: 10px;
  margin-bottom: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 5px;
    height: 100%;
    background: linear-gradient(to bottom, #00ffff, #7851a9);
  }

  &:hover {
    transform: translateY(-3px);
    border-color: rgba(0, 255, 255, 0.3);
    box-shadow: ${({ $isLocked }) => !$isLocked ?
      '0 10px 25px rgba(0, 255, 255, 0.2)' :
      '0 10px 25px rgba(0, 0, 0, 0.3)'
    };
  }

  ${({ $isLocked }) => $isLocked && css`
    filter: grayscale(100%);
    opacity: 0.7;

    &:before {
      background: linear-gradient(to bottom, #666, #999);
    }
  `}
`;

const AchievementIcon = styled.div<{ $achievementType: 'gold' | 'silver' | 'bronze' }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.75rem;
  background: ${({ $achievementType }) => $achievementType === 'gold' ?
    'linear-gradient(135deg, #FFD700, #FFA500)' :
    $achievementType === 'silver' ?
    'linear-gradient(135deg, #E0E0E0, #C0C0C0)' :
    'linear-gradient(135deg, #CD7F32, #A0522D)'
  };
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 0 10px ${({ $achievementType }) => $achievementType === 'gold' ?
    'rgba(255, 215, 0, 0.5)' :
    $achievementType === 'silver' ?
    'rgba(224, 224, 224, 0.5)' :
    'rgba(205, 127, 50, 0.5)'
  };
`;

const AchievementInfo = styled.div`
  flex: 1;
`;

const AchievementName = styled.div`
  font-weight: 500;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
`;

const AchievementDescription = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
`;

const AchievementProgress = styled.div`
  width: 100%;
  margin-top: 0.5rem;
`;

// ─── Layout helpers ─────────────────────────────────────────────────
const FlexRow = styled.div<{ $justify?: string; $align?: string; $gap?: string }>`
  display: flex;
  justify-content: ${({ $justify }) => $justify || 'flex-start'};
  align-items: ${({ $align }) => $align || 'center'};
  gap: ${({ $gap }) => $gap || '0'};
`;

const FlexEnd = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
`;

const CenterBox = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 1rem;
`;

const FooterBar = styled.div`
  margin-top: auto;
  padding-top: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
`;

const FooterLink = styled.a`
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  margin-right: 1rem;

  &:last-child {
    margin-right: 0;
  }

  &:hover {
    color: ${theme.accent};
  }
`;

const EmptyStateBox = styled.div`
  text-align: center;
  padding: 1.5rem 0;
`;

// ─── Custom ProgressBar component ───────────────────────────────────
const ProgressBar: React.FC<{
  value: number;
  color?: string;
  ariaLabel?: string;
}> = ({ value, color = 'primary', ariaLabel }) => (
  <ProgressBarTrack
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={value}
    aria-label={ariaLabel}
  >
    <ProgressBarFill $value={value} $color={color} />
  </ProgressBarTrack>
);

// ─── Type Definitions ───────────────────────────────────────────────
// Define Chat Message Type
interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

// Upcoming Session Type
interface UpcomingSession {
  id: string;
  title: string;
  trainer: string;
  dateTime: Date;
  isUpcoming: boolean;
  isScheduled: boolean;
}

// Workout Type
interface Workout {
  id: string;
  name: string;
  type: string;
  duration: number;
  exercises: number;
  level: number;
}

// Stats Type
interface ClientStats {
  sessionsCompleted: number;
  sessionsRemaining: number;
  daysActive: number;
  weeklyProgress: number;
}

/**
 * New Client Dashboard View
 * Designed to match admin dashboard style
 * Includes a real-time chat feature and client-specific stats
 */
const NewClientDashboard: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  // Log the auth state for debugging
  useEffect(() => {
    console.log('Dashboard auth state:', { user, isAuthenticated });
  }, [user, isAuthenticated]);

  const [isLoading, setLoading] = useState<boolean>(true);
  const [mcpStatus, setMcpStatus] = useState<{workout: boolean; gamification: boolean}>({workout: false, gamification: false});
  const [workoutData, setWorkoutData] = useState<any>(null);
  const [gamificationData, setGamificationData] = useState<any>(null);

  // Use the custom MCP hook for dashboard
  const {
    loading: mcpLoading,
    mcpStatus: mcpServerStatus,
    workoutData: mcpWorkoutData,
    gamificationData: mcpGamificationData,
    refreshData,
    logWorkoutCompletion,
    logFoodIntake,
    updateGameProgress
  } = useClientDashboardMcp();

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [trainerOnline, setTrainerOnline] = useState(true);

  // Client data
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
  const [recommendedWorkouts, setRecommendedWorkouts] = useState<Workout[]>([]);
  const [clientStats, setClientStats] = useState<ClientStats>({
    sessionsCompleted: 0,
    sessionsRemaining: 0,
    daysActive: 0,
    weeklyProgress: 0
  });

  // Mock achievements data (will be replaced by gamification MCP data)
  const [achievements, setAchievements] = useState<any[]>([
    {
      id: '1',
      name: 'Strength Master',
      description: 'Complete 10 strength workouts',
      progress: 8,
      total: 10,
      type: 'silver',
      unlocked: false,
      icon: 'dumbbell'
    },
    {
      id: '2',
      name: 'Consistency Champion',
      description: 'Work out 5 days in a row',
      progress: 5,
      total: 5,
      type: 'gold',
      unlocked: true,
      icon: 'award'
    },
    {
      id: '3',
      name: 'Flexibility Guru',
      description: 'Reach level 10 in flexibility',
      progress: 6,
      total: 10,
      type: 'bronze',
      unlocked: false,
      icon: 'activity'
    }
  ]);

  // Progress data
  const [progressData, setProgressData] = useState({
    overall: { level: 0, progress: 0 },
    strength: { level: 0, progress: 0 },
    cardio: { level: 0, progress: 0 },
    flexibility: { level: 0, progress: 0 },
    balance: { level: 0, progress: 0 }
  });

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // MCP Server Status Component
  const renderMcpServerStatus = () => (
    <McpStatusIndicator status={mcpServerStatus} variant="compact" position="floating" />
  );

  // Handle sending a message
  const handleSendMessage = () => {
    if (messageText.trim() === '') return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setMessageText('');

    // Simulate trainer response
    setTimeout(() => {
      const responses = [
        "Great progress on your workout plan! How are you feeling after yesterday's session?",
        "I've added some new exercises to your program. Let me know if you want to discuss them.",
        "Your form is improving! Let's schedule a video call to go over some technique details.",
        "Have you been keeping up with your nutrition plan?",
        "Your consistency is impressive! Keep up the great work!"
      ];

      const trainerMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: responses[Math.floor(Math.random() * responses.length)],
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, trainerMessage]);
    }, 1000);
  };

  // Format time for chat messages
  const formatMessageTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date for upcoming sessions
  const formatSessionDate = (date: Date) => {
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatSessionTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Load data (MCP or mock)
  useEffect(() => {
    // Update state with data from MCP integration hook
    if (!mcpLoading) {
      // Update MCP status
      setMcpStatus(mcpServerStatus);

      // Update data if available from MCP
      if (mcpWorkoutData && Object.keys(mcpWorkoutData).length > 0) {
        setWorkoutData(mcpWorkoutData);

        // Update UI with the fetched data - check data structure
        if (mcpWorkoutData.recommendations?.workouts && Array.isArray(mcpWorkoutData.recommendations.workouts)) {
          setRecommendedWorkouts(mcpWorkoutData.recommendations.workouts.map((workout: any) => ({
            id: workout.id,
            name: workout.name,
            type: workout.type || 'Strength',
            duration: workout.duration || 30,
            exercises: workout.exercises?.length || 5,
            level: workout.level || 3
          })));
        }
      }

      // Update gamification data if available
      if (mcpGamificationData && Object.keys(mcpGamificationData).length > 0) {
        setGamificationData(mcpGamificationData);

        // Update progress data based on gamification profile
        if (mcpGamificationData.profile) {
          setProgressData({
            overall: {
              level: mcpGamificationData.profile.level || 22,
              progress: mcpGamificationData.profile.progress || 65
            },
            strength: {
              level: mcpGamificationData.profile.attributes?.strength?.level || 24,
              progress: mcpGamificationData.profile.attributes?.strength?.progress || 70
            },
            cardio: {
              level: mcpGamificationData.profile.attributes?.cardio?.level || 18,
              progress: mcpGamificationData.profile.attributes?.cardio?.progress || 45
            },
            flexibility: {
              level: mcpGamificationData.profile.attributes?.flexibility?.level || 20,
              progress: mcpGamificationData.profile.attributes?.flexibility?.progress || 60
            },
            balance: {
              level: mcpGamificationData.profile.attributes?.balance?.level || 19,
              progress: mcpGamificationData.profile.attributes?.balance?.progress || 50
            }
          });
        }

        setLoading(false);
      } else {
        // If we don't have MCP gamification data, just update loading state
        setLoading(false);
      }
    }
  }, [mcpLoading, mcpServerStatus, mcpWorkoutData, mcpGamificationData]);

  // Update achievements when gamification data changes
  useEffect(() => {
    if (mcpGamificationData?.achievements) {
      // Map the MCP data to our achievement format
      const mappedAchievements = mcpGamificationData.achievements.map((achievement: any) => ({
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        progress: achievement.progress,
        total: achievement.totalRequired,
        type: achievement.tier || 'bronze',
        unlocked: achievement.completed,
        icon: achievement.icon || 'award'
      }));

      setAchievements(mappedAchievements);

      // Update client stats based on gamification profile
      if (mcpGamificationData.profile) {
        setClientStats(prevStats => ({
          ...prevStats,
          sessionsCompleted: mcpGamificationData.profile.attributes?.strength?.level || prevStats.sessionsCompleted,
          daysActive: mcpGamificationData.profile.streak || prevStats.daysActive,
          weeklyProgress: mcpGamificationData.profile.attributes?.cardio?.progress || prevStats.weeklyProgress
        }));
      }
    }

    // Update workout data
    if (mcpWorkoutData) {
      // Update recommended workouts if available - check data structure
      if (mcpWorkoutData.recommendations?.workouts && Array.isArray(mcpWorkoutData.recommendations.workouts)) {
        setRecommendedWorkouts(mcpWorkoutData.recommendations.workouts.map((workout: any) => ({
          id: workout.id,
          name: workout.name,
          type: workout.type || 'Strength',
          duration: workout.duration || 30,
          exercises: workout.exercises?.length || 5,
          level: workout.level || 3
        })));
      } else if (mcpWorkoutData.recommendations && Array.isArray(mcpWorkoutData.recommendations)) {
        // Handle case where recommendations is directly an array
        setRecommendedWorkouts(mcpWorkoutData.recommendations.map((workout: any) => ({
          id: workout.id || `workout-${Math.random().toString(36).substr(2, 9)}`,
          name: workout.name || 'Workout',
          type: workout.type || 'Strength',
          duration: workout.duration || 30,
          exercises: workout.exercises?.length || 5,
          level: workout.level || 3
        })));
      }
    }
  }, [mcpGamificationData, mcpWorkoutData]);

  // Initialize
  useEffect(() => {
    // Use the custom MCP hook instead, which handles all of this logic
    refreshData(true);
  }, [refreshData]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Effect to set default values when user data is loaded
  useEffect(() => {
    if (user) {
      // Set client stats based on user data if available
      if (user.stats) {
        setClientStats(prev => ({
          ...prev,
          sessionsCompleted: user.stats.sessionsCompleted || prev.sessionsCompleted,
          sessionsRemaining: user.stats.sessionsRemaining || prev.sessionsRemaining,
          daysActive: user.stats.daysActive || prev.daysActive,
          weeklyProgress: user.stats.weeklyProgress || prev.weeklyProgress
        }));
      }
    }
  }, [user]);

  // Initialize state with mock data for chat and upcoming sessions
  useEffect(() => {
    // Set initial mock chat messages
    setMessages([
      {
        id: '1',
        text: "Hi there! How can I help you with your fitness goals today?",
        isUser: false,
        timestamp: new Date(Date.now() - 36000000)
      },
      {
        id: '2',
        text: "I've been having some trouble with my squat form. Could you check it at our next session?",
        isUser: true,
        timestamp: new Date(Date.now() - 35000000)
      },
      {
        id: '3',
        text: "Absolutely! I'll make that a priority. In the meantime, try focusing on keeping your weight in your heels and chest up.",
        isUser: false,
        timestamp: new Date(Date.now() - 34000000)
      }
    ]);

    // Set initial mock upcoming sessions
    setUpcomingSessions([
      {
        id: '1',
        title: 'Strength Training Session',
        trainer: 'Alex Johnson',
        dateTime: new Date(Date.now() + 86400000), // Tomorrow
        isUpcoming: true,
        isScheduled: true
      },
      {
        id: '2',
        title: 'Flexibility & Mobility',
        trainer: 'Alex Johnson',
        dateTime: new Date(Date.now() + 259200000), // 3 days from now
        isUpcoming: true,
        isScheduled: true
      }
    ]);
  }, []);

  // Dashboard data initialization effect - runs once when component mounts
  useEffect(() => {
    // Trigger initial data load from MCP hook
    const initDashboard = () => {
      refreshData(true);
    };

    initDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to run only once

  return (
    <DashboardContainer
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* MCP Status Indicator */}
      {renderMcpServerStatus()}

      {/* Video Background */}
      <VideoBackground>
        <video autoPlay loop muted playsInline>
          <source src="/Waves.mp4" type="video/mp4" />
        </video>
      </VideoBackground>

      {/* Welcome Section */}
      <DashboardSection variants={itemVariants} style={{marginBottom: '1.5rem'}}>
        <motion.div variants={itemVariants}>
          <Heading1
            id="dashboard-main-heading"
            aria-label={`Welcome dashboard for ${user?.firstName || 'Client'}`}
          >
            Welcome, {user?.firstName || 'Client'}!
          </Heading1>
          <BodyText style={{ opacity: 0.8 }}>
            Track your progress, upcoming sessions, and message your trainer
          </BodyText>
        </motion.div>
      </DashboardSection>

      {/* Main Content Grid */}
      <MainGrid $spacing={2}>
        {/* Left Column - Progress & Stats */}
        <div>
          {/* Stats Overview */}
          <DashboardSection variants={itemVariants} style={{marginBottom: '1.5rem'}}>
            <motion.div variants={itemVariants} style={{marginBottom: '1rem'}}>
              <Heading2>Your Stats</Heading2>
            </motion.div>

            <StatsGrid $spacing={2}>
              <motion.div variants={itemVariants}>
                <DashboardStatsCard
                  title="Completed Sessions"
                  value={clientStats.sessionsCompleted.toString()}
                  icon="book"
                  trend={`${clientStats.sessionsRemaining} remaining`}
                  isPositive={true}
                  isLoading={isLoading}
                  colorScheme="primary"
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <DashboardStatsCard
                  title="Active Days"
                  value={clientStats.daysActive.toString()}
                  icon="calendar"
                  trend="This month"
                  isPositive={true}
                  isLoading={isLoading}
                  colorScheme="success"
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <DashboardStatsCard
                  title="Weekly Progress"
                  value={`${clientStats.weeklyProgress}%`}
                  icon="chart"
                  trend="Goal completion"
                  isPositive={true}
                  isLoading={isLoading}
                  colorScheme="warning"
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <DashboardStatsCard
                  title="Fitness Level"
                  value={progressData.overall.level.toString()}
                  icon="dumbbell"
                  trend={`${progressData.overall.progress}% to next level`}
                  isPositive={true}
                  isLoading={isLoading}
                  colorScheme="purple"
                />
              </motion.div>
            </StatsGrid>
          </DashboardSection>

          {/* Progress Tracking */}
          <DashboardSection variants={itemVariants} style={{marginBottom: '1.5rem'}}>
            <motion.div variants={itemVariants} style={{marginBottom: '1rem'}}>
              <Heading2>Your Progress</Heading2>
            </motion.div>

            <motion.div variants={itemVariants}>
              <ProgressContainer>
                <ProgressLabel>
                  <ProgressName>
                    <Dumbbell size={16} aria-hidden="true" />
                    <span>Strength Training</span>
                  </ProgressName>
                  <ProgressValue>Level {progressData.strength.level}</ProgressValue>
                </ProgressLabel>
                <ProgressBar
                  value={progressData.strength.progress}
                  color="primary"
                  ariaLabel={`Strength progress: ${progressData.strength.progress}%`}
                />
              </ProgressContainer>

              <ProgressContainer>
                <ProgressLabel>
                  <ProgressName>
                    <Activity size={16} aria-hidden="true" />
                    <span>Cardiovascular Fitness</span>
                  </ProgressName>
                  <ProgressValue>Level {progressData.cardio.level}</ProgressValue>
                </ProgressLabel>
                <ProgressBar
                  value={progressData.cardio.progress}
                  color="secondary"
                  ariaLabel={`Cardio progress: ${progressData.cardio.progress}%`}
                />
              </ProgressContainer>

              <ProgressContainer>
                <ProgressLabel>
                  <ProgressName>
                    <Zap size={16} aria-hidden="true" />
                    <span>Flexibility</span>
                  </ProgressName>
                  <ProgressValue>Level {progressData.flexibility.level}</ProgressValue>
                </ProgressLabel>
                <ProgressBar
                  value={progressData.flexibility.progress}
                  color="success"
                  ariaLabel={`Flexibility progress: ${progressData.flexibility.progress}%`}
                />
              </ProgressContainer>

              <ProgressContainer>
                <ProgressLabel>
                  <ProgressName>
                    <Target size={16} aria-hidden="true" />
                    <span>Balance & Coordination</span>
                  </ProgressName>
                  <ProgressValue>Level {progressData.balance.level}</ProgressValue>
                </ProgressLabel>
                <ProgressBar
                  value={progressData.balance.progress}
                  color="warning"
                  ariaLabel={`Balance & Coordination progress: ${progressData.balance.progress}%`}
                />
              </ProgressContainer>

              <FlexEnd>
                <ActionButton
                  aria-label="View detailed fitness progress reports"
                >
                  <BarChart2 size={18} aria-hidden="true" />
                  View Detailed Progress
                </ActionButton>
              </FlexEnd>
            </motion.div>
          </DashboardSection>

          {/* Achievements Section */}
          <DashboardSection variants={itemVariants} style={{marginBottom: '1.5rem'}}>
            <motion.div variants={itemVariants} style={{marginBottom: '1rem'}}>
              <Heading2>Achievements</Heading2>
            </motion.div>

            <motion.div variants={itemVariants}>
              <div role="list" aria-label="Achievement list">
                {achievements.map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  $isLocked={!achievement.unlocked}
                  whileHover={{ y: -3 }}
                  role="listitem"
                  aria-label={`${achievement.name} achievement: ${achievement.description}`}
                >
                  <AchievementIcon $achievementType={achievement.type as 'gold' | 'silver' | 'bronze'}>
                    {achievement.icon === 'dumbbell' && <Dumbbell size={20} aria-hidden="true" />}
                    {achievement.icon === 'award' && <Award size={20} aria-hidden="true" />}
                    {achievement.icon === 'activity' && <Activity size={20} aria-hidden="true" />}
                    {achievement.icon === 'star' && <Star size={20} aria-hidden="true" />}
                    {achievement.icon === 'medal' && <Medal size={20} aria-hidden="true" />}
                  </AchievementIcon>

                  <AchievementInfo>
                    <AchievementName>
                      {achievement.name}
                    </AchievementName>
                    <AchievementDescription>
                      {achievement.description}
                    </AchievementDescription>

                    {!achievement.unlocked && (
                      <AchievementProgress>
                        <ProgressLabel>
                          <ProgressValue>
                            {achievement.progress} / {achievement.total}
                          </ProgressValue>
                        </ProgressLabel>
                        <ProgressBar
                          value={(achievement.progress / achievement.total) * 100}
                          color="primary"
                        />
                      </AchievementProgress>
                    )}
                  </AchievementInfo>

                  {achievement.unlocked && (
                    <CheckCircle size={20} color="#00c853" style={{ marginLeft: '10px' }} />
                  )}
                </AchievementCard>
              ))}
              </div>

              <FlexEnd>
                <ActionButton
                  aria-label="View all achievements"
                >
                  <Trophy size={18} aria-hidden="true" />
                  View All Achievements
                </ActionButton>
              </FlexEnd>
            </motion.div>
          </DashboardSection>

          {/* Recommended Workouts */}
          <DashboardSection variants={itemVariants}>
            <motion.div variants={itemVariants} style={{marginBottom: '1rem'}}>
              <Heading2>Recommended Workouts</Heading2>
            </motion.div>

            <motion.div variants={itemVariants}>
              <div role="list" aria-label="Recommended workouts">
                {recommendedWorkouts.map((workout) => (
                  <WorkoutItem
                    key={workout.id}
                    whileHover={{ x: 5 }}
                    role="listitem"
                    aria-label={`${workout.name}: ${workout.type} workout, ${workout.duration} minutes, ${workout.exercises} exercises, level ${workout.level}`}
                    tabIndex={0}
                  >
                  <WorkoutIcon>
                    {workout.type === 'Strength' && <Dumbbell size={20} aria-hidden="true" />}
                    {workout.type === 'Cardio' && <Activity size={20} aria-hidden="true" />}
                    {workout.type === 'Core' && <Target size={20} aria-hidden="true" />}
                  </WorkoutIcon>
                  <WorkoutInfo>
                    <WorkoutName>{workout.name}</WorkoutName>
                    <WorkoutDetails>
                      <span><Clock size={14} aria-hidden="true" /> <span>{workout.duration} min</span></span>
                      <span><Dumbbell size={14} aria-hidden="true" /> <span>{workout.exercises} exercises</span></span>
                      <span><Target size={14} aria-hidden="true" /> <span>Level {workout.level}</span></span>
                    </WorkoutDetails>
                  </WorkoutInfo>
                  <RoundButton
                    $size="small"
                    style={{ color: 'rgba(0, 255, 255, 0.7)' }}
                    aria-label={`View details for ${workout.name}`}
                  >
                    <ChevronRight size={20} aria-hidden="true" />
                  </RoundButton>
                </WorkoutItem>
                ))}
                </div>

                <FlexEnd>
                  <ActionButton
                    aria-label="Browse all available workouts"
                  >
                    <Dumbbell size={18} aria-hidden="true" />
                    Browse All Workouts
                  </ActionButton>
                </FlexEnd>
            </motion.div>
          </DashboardSection>
        </div>

        {/* Right Column - Chat & Upcoming Sessions */}
        <div>
          {/* Trainer Chat */}
          <ChatSection variants={itemVariants}>
            <ChatHeader>
              <BadgeWrapper>
                <AvatarCircle $size={40}>
                  <img
                    alt="Trainer"
                    src="/trainer-avatar.jpg"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <User size={20} style={{ position: 'absolute', color: 'rgba(255,255,255,0.5)' }} aria-hidden="true" />
                </AvatarCircle>
                <OnlineDot $online={trainerOnline} />
              </BadgeWrapper>
              <div>
                <SubtitleText>Alex Johnson</SubtitleText>
                <br />
                <CaptionText>
                  {trainerOnline ? 'Online' : 'Away'}
                </CaptionText>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <RoundButton
                  $size="small"
                  style={{ color: 'rgba(0, 255, 255, 0.7)' }}
                  title="Video call"
                  aria-label="Start video call with trainer"
                >
                  <Video size={18} aria-hidden="true" />
                </RoundButton>
              </div>
            </ChatHeader>

            <ChatMessages>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  $isUser={message.isUser}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  role="log"
                  aria-label={`Message ${message.isUser ? 'sent' : 'received'} at ${formatMessageTime(message.timestamp)}`}
                >
                  <MessageBodyText>
                    {message.text}
                  </MessageBodyText>
                  <MessageTime>
                    {formatMessageTime(message.timestamp)}
                  </MessageTime>
                </MessageBubble>
              ))}
              <div ref={messagesEndRef} />
            </ChatMessages>

            <ChatInputContainer>
              <RoundButton
                $size="small"
                style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                aria-label="Attach file"
              >
                <Paperclip size={18} />
              </RoundButton>

              <NativeInput
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                aria-label="Type a message to your trainer"
              />

              <RoundButton
                $size="small"
                style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                aria-label="Insert emoji"
              >
                <Smile size={18} />
              </RoundButton>

              <SendButtonStyled
                onClick={handleSendMessage}
                aria-label="Send message"
              >
                <Send size={18} />
              </SendButtonStyled>
            </ChatInputContainer>
          </ChatSection>

          {/* Upcoming Sessions */}
          <DashboardSection variants={itemVariants}>
            <motion.div variants={itemVariants} style={{marginBottom: '1rem'}}>
              <Heading2 style={{ marginBottom: '1rem' }}>
                Upcoming Sessions
              </Heading2>

              {upcomingSessions.length > 0 ? (
                <div role="list" aria-label="Upcoming training sessions">
                  {upcomingSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    whileHover={{ y: -3 }}
                    role="listitem"
                    aria-label={`${session.title} with ${session.trainer} on ${formatSessionDate(session.dateTime)} at ${formatSessionTime(session.dateTime)}`}
                    tabIndex={0}
                  >
                    {session.dateTime.getTime() - Date.now() < 86400000 && (
                      <UpcomingLabel>
                        <Clock size={12} style={{ marginRight: '4px' }} aria-hidden="true" />
                        <span>Next Session</span>
                      </UpcomingLabel>
                    )}

                    <SubtitleText style={{ display: 'block', marginBottom: '0.25rem' }}>
                      {session.title}
                    </SubtitleText>

                    <SmallText style={{ display: 'block', marginBottom: '0.5rem' }}>
                      with {session.trainer}
                    </SmallText>

                    <FlexRow $justify="space-between" $align="center">
                      <SmallText>
                        <Calendar size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} aria-hidden="true" />
                        <span>{formatSessionDate(session.dateTime)}</span>
                      </SmallText>

                      <SmallText>
                        <Clock size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} aria-hidden="true" />
                        <span>{formatSessionTime(session.dateTime)}</span>
                      </SmallText>
                    </FlexRow>
                  </SessionCard>
                ))}
                </div>
              ) : (
                <EmptyStateBox>
                  <SmallText>
                    No upcoming sessions scheduled
                  </SmallText>
                </EmptyStateBox>
              )}

              <CenterBox>
                <ActionButton
                  $fullWidth
                  aria-label="Schedule a new training session"
                >
                  <Calendar size={18} aria-hidden="true" />
                  Schedule New Session
                </ActionButton>
              </CenterBox>
            </motion.div>
          </DashboardSection>
        </div>
      </MainGrid>

      {/* Compact Footer */}
      <FooterBar>
        <div>&copy; 2025 Swan Studios. All rights reserved.</div>
        <div>
          <FooterLink href="/terms">Terms</FooterLink>
          <FooterLink href="/privacy">Privacy</FooterLink>
        </div>
      </FooterBar>
    </DashboardContainer>
  );
};

export default NewClientDashboard;
