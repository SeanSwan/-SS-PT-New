import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../../../context/AuthContext';
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
  Video
} from 'lucide-react';

// Custom components
import DashboardStatsCard from '../../components/dashboard-stats-card';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { 
      when: "beforeChildren",
      staggerChildren: 0.1,
      duration: 0.3
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { 
      type: "spring", 
      stiffness: 100, 
      damping: 10 
    }
  }
};

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

const DashboardSection = styled(motion.div)`
  margin-bottom: 1.5rem;
  padding: 1.5rem;
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
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
  const { user } = useAuth();
  const [isLoading, setLoading] = useState<boolean>(true);
  
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
  
  // Load mock data
  useEffect(() => {
    // Simulate loading time
    setTimeout(() => {
      // Mock chat messages
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
        },
        {
          id: '4',
          text: "Also, I've reviewed your latest progress and added some new exercises to your plan. Check them out when you get a chance!",
          isUser: false,
          timestamp: new Date(Date.now() - 33000000)
        }
      ]);
      
      // Mock upcoming sessions
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
        },
        {
          id: '3',
          title: 'Progress Assessment',
          trainer: 'Alex Johnson',
          dateTime: new Date(Date.now() + 604800000), // 7 days from now
          isUpcoming: true,
          isScheduled: true
        }
      ]);
      
      // Mock recommended workouts
      setRecommendedWorkouts([
        {
          id: '1',
          name: 'Lower Body Strength',
          type: 'Strength',
          duration: 45,
          exercises: 8,
          level: 3
        },
        {
          id: '2',
          name: 'Core Stability',
          type: 'Core',
          duration: 30,
          exercises: 6,
          level: 2
        },
        {
          id: '3',
          name: 'Upper Body Power',
          type: 'Strength',
          duration: 40,
          exercises: 7,
          level: 3
        },
        {
          id: '4',
          name: 'HIIT Cardio',
          type: 'Cardio',
          duration: 25,
          exercises: 5,
          level: 4
        }
      ]);
      
      // Mock client stats
      setClientStats({
        sessionsCompleted: 12,
        sessionsRemaining: 8,
        daysActive: 24,
        weeklyProgress: 85
      });
      
      // Mock progress data
      setProgressData({
        overall: { level: 22, progress: 65 },
        strength: { level: 24, progress: 70 },
        cardio: { level: 18, progress: 45 },
        flexibility: { level: 20, progress: 60 },
        balance: { level: 19, progress: 50 }
      });
      
      setLoading(false);
    }, 1500);
  }, []);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  return (
    <DashboardContainer
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
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
            sx={{ 
              fontWeight: 300, 
              mb: 1,
              display: 'flex',
              alignItems: 'center'
            }}
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
                    <Dumbbell size={16} />
                    Strength Training
                  </ProgressName>
                  <ProgressValue>Level {progressData.strength.level}</ProgressValue>
                </ProgressLabel>
                <StyledLinearProgress 
                  variant="determinate" 
                  value={progressData.strength.progress} 
                  color="primary"
                />
              </ProgressContainer>
              
              <ProgressContainer>
                <ProgressLabel>
                  <ProgressName>
                    <Activity size={16} />
                    Cardiovascular Fitness
                  </ProgressName>
                  <ProgressValue>Level {progressData.cardio.level}</ProgressValue>
                </ProgressLabel>
                <StyledLinearProgress 
                  variant="determinate" 
                  value={progressData.cardio.progress} 
                  color="secondary"
                />
              </ProgressContainer>
              
              <ProgressContainer>
                <ProgressLabel>
                  <ProgressName>
                    <Zap size={16} />
                    Flexibility
                  </ProgressName>
                  <ProgressValue>Level {progressData.flexibility.level}</ProgressValue>
                </ProgressLabel>
                <StyledLinearProgress 
                  variant="determinate" 
                  value={progressData.flexibility.progress} 
                  color="success"
                />
              </ProgressContainer>
              
              <ProgressContainer>
                <ProgressLabel>
                  <ProgressName>
                    <Target size={16} />
                    Balance & Coordination
                  </ProgressName>
                  <ProgressValue>Level {progressData.balance.level}</ProgressValue>
                </ProgressLabel>
                <StyledLinearProgress 
                  variant="determinate" 
                  value={progressData.balance.progress} 
                  color="warning"
                />
              </ProgressContainer>
              
              <Box display="flex" justifyContent="flex-end" mt={2}>
                <GlowButton
                  startIcon={<BarChart2 size={18} />}
                  size="small"
                >
                  View Detailed Progress
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
              {recommendedWorkouts.map((workout) => (
                <WorkoutItem key={workout.id} whileHover={{ x: 5 }}>
                  <WorkoutIcon>
                    {workout.type === 'Strength' && <Dumbbell size={20} />}
                    {workout.type === 'Cardio' && <Activity size={20} />}
                    {workout.type === 'Core' && <Target size={20} />}
                  </WorkoutIcon>
                  <WorkoutInfo>
                    <WorkoutName>{workout.name}</WorkoutName>
                    <WorkoutDetails>
                      <span><Clock size={14} /> {workout.duration} min</span>
                      <span><Dumbbell size={14} /> {workout.exercises} exercises</span>
                      <span><Target size={14} /> Level {workout.level}</span>
                    </WorkoutDetails>
                  </WorkoutInfo>
                  <IconButton size="small" sx={{ color: 'rgba(0, 255, 255, 0.7)' }}>
                    <ChevronRight size={20} />
                  </IconButton>
                </WorkoutItem>
              ))}
              
              <Box display="flex" justifyContent="flex-end" mt={2}>
                <GlowButton
                  startIcon={<Dumbbell size={18} />}
                  size="small"
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
                  <IconButton size="small" sx={{ color: 'rgba(0, 255, 255, 0.7)' }}>
                    <Video size={18} />
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
              <IconButton size="small" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                <Paperclip size={18} />
              </IconButton>
              
              <ChatInput
                placeholder="Type a message..."
                fullWidth
                variant="outlined"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              
              <IconButton size="small" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                <Smile size={18} />
              </IconButton>
              
              <SendButton onClick={handleSendMessage}>
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
                upcomingSessions.map((session) => (
                  <SessionCard key={session.id} whileHover={{ y: -3 }}>
                    {session.dateTime.getTime() - Date.now() < 86400000 && (
                      <UpcomingLabel>
                        <Clock size={12} style={{ marginRight: '4px' }} />
                        Next Session
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
                        <Calendar size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        {formatSessionDate(session.dateTime)}
                      </Typography>
                      
                      <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                        <Clock size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        {formatSessionTime(session.dateTime)}
                      </Typography>
                    </Box>
                  </SessionCard>
                ))
              ) : (
                <Box textAlign="center" py={3}>
                  <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                    No upcoming sessions scheduled
                  </Typography>
                </Box>
              )}
              
              <Box display="flex" justifyContent="center" mt={2}>
                <GlowButton
                  startIcon={<Calendar size={18} />}
                  fullWidth
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