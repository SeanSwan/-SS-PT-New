import React, { useState, useEffect, useRef, useCallback } from 'react';
import { workoutMcpApi, gamificationMcpApi } from '../../../../services/mcpApis';
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from './components/animation-variants';
import { useAuth } from '../../../../context/AuthContext';
import useClientDashboardMcp from '../../../../hooks/useClientDashboardMcp';
import GamificationDisplay from '../../../../components/Gamification/GamificationDisplay';
import FoodIntakeForm from '../../../../components/FoodTracker/FoodIntakeForm';
import McpStatusIndicator from '../../../../components/ui/McpStatusIndicator';
import styled, { keyframes } from 'styled-components';
import './client-dashboard.css';

// material-ui
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Avatar,
  Badge,
  LinearProgress,
  IconButton,
  Divider,
  Paper,
  Tooltip
} from '@mui/material';
import Grid from '@mui/material/Grid2';

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

// Keyframe animations
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

// Styled components
const DashboardContainer = styled(motion.div)`
  width: 100%;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  background: linear-gradient(135deg, #0a0a1a, #1e1e3f);
  color: white;
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

const GlowButton = styled(Button)`
  background: linear-gradient(90deg, #00ffff 0%, #7851a9 100%);
  color: #fff;
  font-weight: 500;
  border: none;
  text-transform: none;
  padding: 0.5rem 1.5rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  
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

const StyledLinearProgress = styled(LinearProgress)`
  height: 8px;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.1);
  
  & .MuiLinearProgress-bar {
    border-radius: 4px;
  }
`;

// Chat components
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

const MessageBubble = styled(motion.div)<{isUser?: boolean}>`
  max-width: 75%;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: 12px;
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  background: ${props => props.isUser ? 
    'linear-gradient(90deg, rgba(0, 255, 255, 0.2), rgba(120, 81, 169, 0.3))' : 
    'rgba(30, 30, 60, 0.6)'};
  border: 1px solid ${props => props.isUser ? 
    'rgba(0, 255, 255, 0.3)' : 
    'rgba(255, 255, 255, 0.1)'};
  margin-left: ${props => props.isUser ? 'auto' : '0'};
  margin-right: ${props => props.isUser ? '0' : 'auto'};
  position: relative;
  
  &:after {
    content: '';
    position: absolute;
    bottom: 0;
    ${props => props.isUser ? 'right: -8px;' : 'left: -8px;'}
    width: 16px;
    height: 16px;
    background: ${props => props.isUser ? 
      'linear-gradient(90deg, rgba(0, 255, 255, 0.2), rgba(120, 81, 169, 0.3))' : 
      'rgba(30, 30, 60, 0.6)'};
    transform: rotate(45deg);
    border-${props => props.isUser ? 'right' : 'left'}: 1px solid ${props => props.isUser ? 
      'rgba(0, 255, 255, 0.3)' : 
      'rgba(255, 255, 255, 0.1)'};
    border-${props => props.isUser ? 'bottom' : 'bottom'}: 1px solid ${props => props.isUser ? 
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

const ChatInput = styled(TextField)`
  flex: 1;
  
  & .MuiInputBase-root {
    background: transparent;
    border: none;
    color: white;
    font-size: 0.9rem;
    padding: 0.5rem;
  }
  
  & .MuiOutlinedInput-notchedOutline {
    border: none;
  }
  
  & .MuiInputBase-input {
    padding: 0.5rem;
  }
  
  &:hover .MuiOutlinedInput-notchedOutline,
  & .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline {
    border: none;
  }
`;

const SendButton = styled(IconButton)`
  background: linear-gradient(90deg, rgba(0, 255, 255, 0.8), rgba(120, 81, 169, 0.8));
  color: white;
  width: 36px;
  height: 36px;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
  }
`;

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

// Achievement related components
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
    box-shadow: ${props => !props.$isLocked ? 
      '0 10px 25px rgba(0, 255, 255, 0.2)' : 
      '0 10px 25px rgba(0, 0, 0, 0.3)'
    };
  }
  
  ${props => props.$isLocked && `
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
  background: ${props => props.$achievementType === 'gold' ? 
    'linear-gradient(135deg, #FFD700, #FFA500)' : 
    props.$achievementType === 'silver' ? 
    'linear-gradient(135deg, #E0E0E0, #C0C0C0)' : 
    'linear-gradient(135deg, #CD7F32, #A0522D)'
  };
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 0 10px ${props => props.$achievementType === 'gold' ? 
    'rgba(255, 215, 0, 0.5)' : 
    props.$achievementType === 'silver' ? 
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
          <Typography 
            variant="h4" 
            component="h1"
            id="dashboard-main-heading"
            sx={{ 
              fontWeight: 300, 
              mb: 1,
              display: 'flex',
              alignItems: 'center'
            }}
            aria-label={`Welcome dashboard for ${user?.firstName || 'Client'}`}
          >
            Welcome, {user?.firstName || 'Client'}!
          </Typography>
          <Typography 
            variant="body1"
            sx={{ 
              opacity: 0.8, 
              mb: 0
            }}
          >
            Track your progress, upcoming sessions, and message your trainer
          </Typography>
        </motion.div>
      </DashboardSection>
      
      {/* Main Content Grid */}
      <Grid container spacing={2}>
        {/* Left Column - Progress & Stats */}
        <Grid xs={12} md={7} lg={8}>
          {/* Stats Overview */}
          <DashboardSection variants={itemVariants} style={{marginBottom: '1.5rem'}}>
            <motion.div variants={itemVariants} style={{marginBottom: '1rem'}}>
              <Typography variant="h5" component="h2" sx={{fontWeight: 400}}>
                Your Stats
              </Typography>
            </motion.div>
            
            <Grid container spacing={2}>
              <Grid xs={12} sm={6} md={3}>
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
              </Grid>
              
              <Grid xs={12} sm={6} md={3}>
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
              </Grid>
              
              <Grid xs={12} sm={6} md={3}>
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
              </Grid>
              
              <Grid xs={12} sm={6} md={3}>
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
              </Grid>
            </Grid>
          </DashboardSection>
          
          {/* Progress Tracking */}
          <DashboardSection variants={itemVariants} style={{marginBottom: '1.5rem'}}>
            <motion.div variants={itemVariants} style={{marginBottom: '1rem'}}>
              <Typography variant="h5" component="h2" sx={{fontWeight: 400}}>
                Your Progress
              </Typography>
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
                <StyledLinearProgress 
                  variant="determinate" 
                  value={progressData.strength.progress} 
                  color="primary"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progressData.strength.progress}
                  aria-label={`Strength progress: ${progressData.strength.progress}%`}
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
                <StyledLinearProgress 
                  variant="determinate" 
                  value={progressData.cardio.progress} 
                  color="secondary"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progressData.cardio.progress}
                  aria-label={`Cardio progress: ${progressData.cardio.progress}%`}
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
                <StyledLinearProgress 
                  variant="determinate" 
                  value={progressData.flexibility.progress} 
                  color="success"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progressData.flexibility.progress}
                  aria-label={`Flexibility progress: ${progressData.flexibility.progress}%`}
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
                <StyledLinearProgress 
                  variant="determinate" 
                  value={progressData.balance.progress} 
                  color="warning"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progressData.balance.progress}
                  aria-label={`Balance & Coordination progress: ${progressData.balance.progress}%`}
                />
              </ProgressContainer>
              
              <Box display="flex" justifyContent="flex-end" mt={2}>
                <GlowButton
                  startIcon={<BarChart2 size={18} aria-hidden="true" />}
                  size="small"
                  aria-label="View detailed fitness progress reports"
                >
                  View Detailed Progress
                </GlowButton>
              </Box>
            </motion.div>
          </DashboardSection>
          
          {/* Achievements Section */}
          <DashboardSection variants={itemVariants} style={{marginBottom: '1.5rem'}}>
            <motion.div variants={itemVariants} style={{marginBottom: '1rem'}}>
              <Typography variant="h5" component="h2" sx={{fontWeight: 400}}>
                Achievements
              </Typography>
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
                        <StyledLinearProgress 
                          variant="determinate" 
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
              
              <Box display="flex" justifyContent="flex-end" mt={2}>
              <GlowButton
              startIcon={<Trophy size={18} aria-hidden="true" />}
                size="small"
              aria-label="View all achievements"
              >
                  View All Achievements
                </GlowButton>
              </Box>
            </motion.div>
          </DashboardSection>
          
          {/* Recommended Workouts */}
          <DashboardSection variants={itemVariants}>
            <motion.div variants={itemVariants} style={{marginBottom: '1rem'}}>
              <Typography variant="h5" component="h2" sx={{fontWeight: 400}}>
                Recommended Workouts
              </Typography>
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
                  <IconButton 
                    size="small" 
                    sx={{ color: 'rgba(0, 255, 255, 0.7)' }}
                    aria-label={`View details for ${workout.name}`}
                  >
                    <ChevronRight size={20} aria-hidden="true" />
                  </IconButton>
                </WorkoutItem>
                ))}
                </div>
                
                <Box display="flex" justifyContent="flex-end" mt={2}>
                <GlowButton
                startIcon={<Dumbbell size={18} aria-hidden="true" />}
                  size="small"
                aria-label="Browse all available workouts"
                >
                  Browse All Workouts
                </GlowButton>
              </Box>
            </motion.div>
          </DashboardSection>
        </Grid>
        
        {/* Right Column - Chat & Upcoming Sessions */}
        <Grid xs={12} md={5} lg={4}>
          {/* Trainer Chat */}
          <ChatSection variants={itemVariants}>
            <ChatHeader>
              <Badge
                variant="dot"
                color={trainerOnline ? "success" : "warning"}
                overlap="circular"
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                sx={{ 
                  '& .MuiBadge-badge': { 
                    boxShadow: '0 0 0 2px #1E1E3F',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%'
                  } 
                }}
              >
                <Avatar
                  alt="Trainer"
                  src="/trainer-avatar.jpg"
                  sx={{ width: 40, height: 40 }}
                />
              </Badge>
              <Box>
                <Typography variant="subtitle1" fontWeight="500">
                  Alex Johnson
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {trainerOnline ? 'Online' : 'Away'}
                </Typography>
              </Box>
              <Box sx={{ ml: 'auto' }}>
                <Tooltip title="Video call">
                  <IconButton 
                    size="small" 
                    sx={{ color: 'rgba(0, 255, 255, 0.7)' }}
                    aria-label="Start video call with trainer"
                  >
                    <Video size={18} aria-hidden="true" />
                  </IconButton>
                </Tooltip>
              </Box>
            </ChatHeader>
            
            <ChatMessages>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  isUser={message.isUser}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  role="log"
                  aria-label={`Message ${message.isUser ? 'sent' : 'received'} at ${formatMessageTime(message.timestamp)}`}
                >
                  <Typography variant="body2">
                    {message.text}
                  </Typography>
                  <MessageTime>
                    {formatMessageTime(message.timestamp)}
                  </MessageTime>
                </MessageBubble>
              ))}
              <div ref={messagesEndRef} />
            </ChatMessages>
            
            <ChatInputContainer>
              <IconButton 
                size="small" 
                sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                aria-label="Attach file"
              >
                <Paperclip size={18} />
              </IconButton>
              
              <ChatInput
                placeholder="Type a message..."
                fullWidth
                variant="outlined"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                inputProps={{
                  'aria-label': 'Type a message to your trainer',
                  'aria-multiline': 'false',
                }}
              />
              
              <IconButton 
                size="small" 
                sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                aria-label="Insert emoji"
              >
                <Smile size={18} />
              </IconButton>
              
              <SendButton 
                onClick={handleSendMessage}
                aria-label="Send message"
              >
                <Send size={18} />
              </SendButton>
            </ChatInputContainer>
          </ChatSection>
          
          {/* Upcoming Sessions */}
          <DashboardSection variants={itemVariants}>
            <motion.div variants={itemVariants} style={{marginBottom: '1rem'}}>
              <Typography variant="h5" component="h2" sx={{fontWeight: 400, marginBottom: '1rem'}}>
                Upcoming Sessions
              </Typography>
              
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
                    
                    <Typography variant="subtitle1" fontWeight="500" sx={{ mb: 0.5 }}>
                      {session.title}
                    </Typography>
                    
                    <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" sx={{ mb: 1 }}>
                      with {session.trainer}
                    </Typography>
                    
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                        <Calendar size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} aria-hidden="true" />
                        <span>{formatSessionDate(session.dateTime)}</span>
                      </Typography>
                      
                      <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                        <Clock size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} aria-hidden="true" />
                        <span>{formatSessionTime(session.dateTime)}</span>
                      </Typography>
                    </Box>
                  </SessionCard>
                ))}
                </div>
              ) : (
                <Box textAlign="center" py={3}>
                  <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                    No upcoming sessions scheduled
                  </Typography>
                </Box>
              )}
              
              <Box display="flex" justifyContent="center" mt={2}>
                <GlowButton
                  startIcon={<Calendar size={18} aria-hidden="true" />}
                  fullWidth
                  aria-label="Schedule a new training session"
                >
                  Schedule New Session
                </GlowButton>
              </Box>
            </motion.div>
          </DashboardSection>
        </Grid>
      </Grid>
      
      {/* Compact Footer */}
      <Box 
        sx={{ 
          mt: 'auto', 
          pt: 2, 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '0.75rem',
          color: 'rgba(255, 255, 255, 0.6)'
        }}
      >
        <div>&copy; 2025 Swan Studios. All rights reserved.</div>
        <div>
          <a href="/terms" style={{color: 'rgba(255, 255, 255, 0.6)', marginRight: '1rem', textDecoration: 'none'}}>Terms</a>
          <a href="/privacy" style={{color: 'rgba(255, 255, 255, 0.6)', textDecoration: 'none'}}>Privacy</a>
        </div>
      </Box>
    </DashboardContainer>
  );
};

export default NewClientDashboard;