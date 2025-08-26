/**
 * 🎯 CHALLENGE CENTER - CHALLENGE MANAGEMENT INTERFACE
 * ===================================================== 
 * Comprehensive challenge system with creation, participation,
 * progress tracking, and community features
 */

import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { GamificationCard } from '../shared/GamificationCard';
import { AnimatedButton } from '../shared/AnimatedButton';
import { TabNavigation } from '../shared/TabNavigation';
import { ChallengeTypeSelector } from '../shared/FormComponents/ChallengeTypeSelector';
import { DifficultySlider } from '../shared/FormComponents/DifficultySlider';

// ================================================================
// ANIMATION KEYFRAMES
// ================================================================

const challengeCountdown = keyframes`
  0%, 100% { 
    color: #00FFFF;
    text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
  }
  50% { 
    color: #FF6B6B;
    text-shadow: 0 0 15px rgba(255, 107, 107, 0.7);
  }
`;

const urgentPulse = keyframes`
  0%, 100% { 
    border-color: rgba(255, 107, 107, 0.5);
    box-shadow: 0 0 20px rgba(255, 107, 107, 0.2);
  }
  50% { 
    border-color: rgba(255, 107, 107, 0.8);
    box-shadow: 0 0 30px rgba(255, 107, 107, 0.4);
  }
`;

const completionCelebration = keyframes`
  0% { transform: scale(1) rotate(0deg); }
  25% { transform: scale(1.1) rotate(5deg); }
  50% { transform: scale(1.2) rotate(-5deg); }
  75% { transform: scale(1.1) rotate(3deg); }
  100% { transform: scale(1) rotate(0deg); }
`;

// ================================================================
// TYPES AND INTERFACES
// ================================================================

export interface Challenge {
  id: string;
  title: string;
  description: string;
  challengeType: 'daily' | 'weekly' | 'monthly' | 'community' | 'custom';
  difficulty: 1 | 2 | 3 | 4 | 5;
  category: 'fitness' | 'nutrition' | 'mindfulness' | 'social' | 'streak';
  xpReward: number;
  participants: number;
  maxParticipants?: number;
  progress: number;
  maxProgress: number;
  startDate: string;
  endDate: string;
  createdBy: string;
  tags: string[];
  requirements: string[];
  isParticipating: boolean;
  isCompleted: boolean;
  completionRate: number;
  leaderboard?: { userId: string; username: string; progress: number; }[];
}

export interface ChallengeCenterProps {
  onCreateChallenge?: (challenge: Partial<Challenge>) => void;
  onJoinChallenge?: (challengeId: string) => void;
  onLeaveChallenge?: (challengeId: string) => void;
  className?: string;
}

export type ChallengeFilter = 'all' | 'active' | 'available' | 'completed' | 'my-challenges';
export type CategoryFilter = 'all' | 'fitness' | 'nutrition' | 'mindfulness' | 'social' | 'streak';

// ================================================================
// STYLED COMPONENTS
// ================================================================

const CenterContainer = styled(motion.div)`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const CenterHeader = styled(motion.div)`
  text-align: center;
  margin-bottom: 2rem;
`;

const Title = styled(motion.h2)`
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, 
    #FF6B6B 0%, 
    #00FFFF 50%, 
    #7851A9 100%
  );
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const CreateChallengeSection = styled(motion.div)`
  margin-bottom: 2rem;
`;

const QuickStats = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const StatCard = styled(motion.div)`
  background: linear-gradient(135deg, 
    rgba(0, 255, 255, 0.1),
    rgba(120, 81, 169, 0.1)
  );
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
  backdrop-filter: blur(10px);
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #00FFFF;
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const FilterSection = styled(motion.div)`
  margin-bottom: 2rem;
`;

const FilterGroup = styled.div`
  margin-bottom: 1rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const FilterLabel = styled.h4`
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ChallengesGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const ChallengeCard = styled(motion.div)<{ 
  challengeType: Challenge['challengeType'];
  isUrgent?: boolean;
  isCompleted?: boolean;
}>`
  position: relative;
  background: ${props => {
    if (props.isCompleted) return 'linear-gradient(135deg, rgba(46, 160, 67, 0.1), rgba(34, 139, 34, 0.05))';
    
    switch (props.challengeType) {
      case 'community':
        return 'linear-gradient(135deg, rgba(255, 107, 107, 0.1), rgba(255, 64, 129, 0.05))';
      case 'weekly':
        return 'linear-gradient(135deg, rgba(138, 43, 226, 0.1), rgba(75, 0, 130, 0.05))';
      case 'monthly':
        return 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 140, 0, 0.05))';
      default:
        return 'linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(120, 81, 169, 0.05))';
    }
  }};
  
  border: 1px solid ${props => {
    if (props.isCompleted) return 'rgba(46, 160, 67, 0.4)';
    if (props.isUrgent) return 'rgba(255, 107, 107, 0.5)';
    
    switch (props.challengeType) {
      case 'community': return 'rgba(255, 107, 107, 0.3)';
      case 'weekly': return 'rgba(138, 43, 226, 0.3)';
      case 'monthly': return 'rgba(255, 215, 0, 0.3)';
      default: return 'rgba(0, 255, 255, 0.2)';
    }
  }};

  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
  cursor: pointer;
  transition: all 0.3s ease;

  ${props => props.isUrgent && `
    animation: ${urgentPulse} 2s ease-in-out infinite;
  `}

  ${props => props.isCompleted && `
    animation: ${completionCelebration} 0.6s ease-out;
  `}

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0, 255, 255, 0.2);
  }
`;

const ChallengeHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const ChallengeTitle = styled.h3`
  font-size: 1.2rem;
  font-weight: 700;
  color: #FFFFFF;
  margin-bottom: 0.5rem;
  flex: 1;
`;

const ChallengeType = styled.div<{ challengeType: Challenge['challengeType'] }>`
  background: ${props => {
    switch (props.challengeType) {
      case 'community': return 'linear-gradient(135deg, #FF6B6B, #FF4081)';
      case 'weekly': return 'linear-gradient(135deg, #8A2BE2, #4B0082)';
      case 'monthly': return 'linear-gradient(135deg, #FFD700, #FF8C00)';
      default: return 'linear-gradient(135deg, #00FFFF, #7851A9)';
    }
  }};
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-left: 0.5rem;
`;

const ChallengeDescription = styled.p`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 1rem;
  line-height: 1.4;
`;

const ProgressSection = styled.div`
  margin-bottom: 1rem;
`;

const ProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const ProgressLabel = styled.div`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
`;

const ProgressValue = styled.div`
  font-size: 0.8rem;
  font-weight: 600;
  color: #00FFFF;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressFill = styled(motion.div)<{ progress: number; challengeType: Challenge['challengeType'] }>`
  height: 100%;
  border-radius: 4px;
  background: ${props => {
    switch (props.challengeType) {
      case 'community': return 'linear-gradient(90deg, #FF6B6B, #FF4081)';
      case 'weekly': return 'linear-gradient(90deg, #8A2BE2, #4B0082)';
      case 'monthly': return 'linear-gradient(90deg, #FFD700, #FF8C00)';
      default: return 'linear-gradient(90deg, #00FFFF, #7851A9)';
    }
  }};
  width: ${props => props.progress}%;
  transition: width 1s ease;
`;

const ChallengeDetails = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const DetailItem = styled.div`
  text-align: center;
`;

const DetailValue = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: #FFFFFF;
  margin-bottom: 0.25rem;
`;

const DetailLabel = styled.div`
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TimeRemaining = styled.div<{ isUrgent: boolean }>`
  text-align: center;
  margin-bottom: 1rem;
  font-weight: 600;
  
  ${props => props.isUrgent && `
    animation: ${challengeCountdown} 2s ease-in-out infinite;
  `}
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const ParticipantCount = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.8rem;
  margin-left: auto;
`;

const CreateForm = styled(motion.div)`
  background: linear-gradient(135deg, 
    rgba(0, 255, 255, 0.05),
    rgba(120, 81, 169, 0.05)
  );
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormField = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: rgba(0, 255, 255, 0.5);
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;
  min-height: 80px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: rgba(0, 255, 255, 0.5);
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
`;

// ================================================================
// MAIN COMPONENT
// ================================================================

export const ChallengeCenter: React.FC<ChallengeCenterProps> = ({
  onCreateChallenge,
  onJoinChallenge,
  onLeaveChallenge,
  className
}) => {
  // ================================================================
  // STATE MANAGEMENT
  // ================================================================

  const [activeFilter, setActiveFilter] = useState<ChallengeFilter>('active');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  // Create form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    challengeType: 'daily' as Challenge['challengeType'],
    difficulty: 3 as Challenge['difficulty'],
    category: 'fitness' as Challenge['category'],
    duration: 7, // days
    maxParticipants: 50
  });

  // ================================================================
  // COMPUTED VALUES
  // ================================================================

  const activeChallenges = challenges.filter(c => c.isParticipating && !c.isCompleted);
  const availableChallenges = challenges.filter(c => !c.isParticipating);
  const completedChallenges = challenges.filter(c => c.isCompleted);
  const myChallenges = challenges.filter(c => c.createdBy === 'currentUser'); // TODO: Use actual user ID

  const filteredChallenges = challenges.filter(challenge => {
    let statusMatch = true;
    
    switch (activeFilter) {
      case 'active':
        statusMatch = challenge.isParticipating && !challenge.isCompleted;
        break;
      case 'available':
        statusMatch = !challenge.isParticipating;
        break;
      case 'completed':
        statusMatch = challenge.isCompleted;
        break;
      case 'my-challenges':
        statusMatch = challenge.createdBy === 'currentUser';
        break;
    }

    const categoryMatch = categoryFilter === 'all' || challenge.category === categoryFilter;
    return statusMatch && categoryMatch;
  });

  // ================================================================
  // TAB OPTIONS
  // ================================================================

  const filterOptions = [
    { id: 'active', label: 'Active', icon: '🔥' },
    { id: 'available', label: 'Available', icon: '🎯' },
    { id: 'completed', label: 'Completed', icon: '✅' },
    { id: 'my-challenges', label: 'My Challenges', icon: '👤' },
    { id: 'all', label: 'All', icon: '📋' }
  ];

  const categoryOptions = [
    { id: 'all', label: 'All', icon: '🎨' },
    { id: 'fitness', label: 'Fitness', icon: '💪' },
    { id: 'nutrition', label: 'Nutrition', icon: '🥗' },
    { id: 'mindfulness', label: 'Mindfulness', icon: '🧘' },
    { id: 'social', label: 'Social', icon: '👥' },
    { id: 'streak', label: 'Streaks', icon: '🔥' }
  ];

  // ================================================================
  // EVENT HANDLERS
  // ================================================================

  const handleCreateChallenge = () => {
    if (onCreateChallenge) {
      onCreateChallenge({
        ...formData,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + formData.duration * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    setShowCreateForm(false);
    setFormData({
      title: '',
      description: '',
      challengeType: 'daily',
      difficulty: 3,
      category: 'fitness',
      duration: 7,
      maxParticipants: 50
    });
  };

  const handleJoinChallenge = (challengeId: string) => {
    onJoinChallenge?.(challengeId);
  };

  const handleLeaveChallenge = (challengeId: string) => {
    onLeaveChallenge?.(challengeId);
  };

  const getTimeRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return 'Ending soon!';
    }
  };

  const isUrgent = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    const hours = diff / (1000 * 60 * 60);
    return hours <= 24 && hours > 0;
  };

  // ================================================================
  // ANIMATION VARIANTS
  // ================================================================

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  // ================================================================
  // MOCK DATA (TODO: Replace with API)
  // ================================================================

  useEffect(() => {
    // Mock challenges data
    setChallenges([
      {
        id: '1',
        title: '7-Day Consistency Streak',
        description: 'Log workouts for 7 consecutive days to build a lasting habit.',
        challengeType: 'weekly',
        difficulty: 3,
        category: 'fitness',
        xpReward: 500,
        participants: 156,
        maxParticipants: 200,
        progress: 4,
        maxProgress: 7,
        startDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: 'swanstudios',
        tags: ['consistency', 'habit-building'],
        requirements: ['Log workout', 'Complete session'],
        isParticipating: true,
        isCompleted: false,
        completionRate: 67
      },
      {
        id: '2',
        title: 'Hydration Hero',
        description: 'Drink 8 glasses of water daily for a week.',
        challengeType: 'daily',
        difficulty: 2,
        category: 'nutrition',
        xpReward: 300,
        participants: 89,
        progress: 0,
        maxProgress: 56, // 8 glasses x 7 days
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: 'swanstudios',
        tags: ['hydration', 'health'],
        requirements: ['Log water intake', 'Meet daily goal'],
        isParticipating: false,
        isCompleted: false,
        completionRate: 0
      }
    ]);
  }, []);

  // ================================================================
  // MAIN RENDER
  // ================================================================

  return (
    <CenterContainer className={className}>
      <CenterHeader>
        <Title>🎯 Challenge Center</Title>
      </CenterHeader>

      <QuickStats>
        <StatCard>
          <StatValue>{activeChallenges.length}</StatValue>
          <StatLabel>Active</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{availableChallenges.length}</StatValue>
          <StatLabel>Available</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{completedChallenges.length}</StatValue>
          <StatLabel>Completed</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{myChallenges.length}</StatValue>
          <StatLabel>Created</StatLabel>
        </StatCard>
      </QuickStats>

      <CreateChallengeSection>
        <AnimatedButton
          variant="primary"
          size="large"
          onClick={() => setShowCreateForm(!showCreateForm)}
          fullWidth
        >
          {showCreateForm ? 'Cancel' : 'Create New Challenge'}
        </AnimatedButton>

        <AnimatePresence>
          {showCreateForm && (
            <CreateForm
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <FormRow>
                <FormField>
                  <Label htmlFor="title">Challenge Title</Label>
                  <Input
                    id="title"
                    type="text"
                    placeholder="Enter challenge title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </FormField>
                <FormField>
                  <Label htmlFor="duration">Duration (days)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    max="30"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  />
                </FormField>
              </FormRow>

              <FormField>
                <Label htmlFor="description">Description</Label>
                <TextArea
                  id="description"
                  placeholder="Describe your challenge..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </FormField>

              <FormRow>
                <FormField>
                  <Label>Challenge Type</Label>
                  <ChallengeTypeSelector
                    selectedType={formData.challengeType}
                    onTypeSelect={(type) => setFormData({ ...formData, challengeType: type as Challenge['challengeType'] })}
                  />
                </FormField>
                <FormField>
                  <Label>Difficulty</Label>
                  <DifficultySlider
                    difficulty={formData.difficulty}
                    onDifficultyChange={(difficulty) => setFormData({ ...formData, difficulty: difficulty as Challenge['difficulty'] })}
                  />
                </FormField>
              </FormRow>

              <AnimatedButton
                variant="primary"
                size="medium"
                onClick={handleCreateChallenge}
                disabled={!formData.title || !formData.description}
              >
                Create Challenge
              </AnimatedButton>
            </CreateForm>
          )}
        </AnimatePresence>
      </CreateChallengeSection>

      <FilterSection>
        <FilterGroup>
          <FilterLabel>Status</FilterLabel>
          <TabNavigation
            options={filterOptions}
            activeTab={activeFilter}
            onTabChange={(tab) => setActiveFilter(tab as ChallengeFilter)}
            variant="cosmic"
            orientation="horizontal"
          />
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>Category</FilterLabel>
          <TabNavigation
            options={categoryOptions}
            activeTab={categoryFilter}
            onTabChange={(tab) => setCategoryFilter(tab as CategoryFilter)}
            variant="minimal"
            orientation="horizontal"
          />
        </FilterGroup>
      </FilterSection>

      <ChallengesGrid
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence>
          {filteredChallenges.map((challenge) => {
            const progressPercentage = Math.min((challenge.progress / challenge.maxProgress) * 100, 100);
            const timeLeft = getTimeRemaining(challenge.endDate);
            const urgent = isUrgent(challenge.endDate);

            return (
              <ChallengeCard
                key={challenge.id}
                variants={cardVariants}
                layout
                challengeType={challenge.challengeType}
                isUrgent={urgent}
                isCompleted={challenge.isCompleted}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <ChallengeHeader>
                  <div>
                    <ChallengeTitle>{challenge.title}</ChallengeTitle>
                  </div>
                  <ChallengeType challengeType={challenge.challengeType}>
                    {challenge.challengeType}
                  </ChallengeType>
                </ChallengeHeader>

                <ChallengeDescription>
                  {challenge.description}
                </ChallengeDescription>

                <ProgressSection>
                  <ProgressHeader>
                    <ProgressLabel>Progress</ProgressLabel>
                    <ProgressValue>{challenge.progress} / {challenge.maxProgress}</ProgressValue>
                  </ProgressHeader>
                  <ProgressBar>
                    <ProgressFill
                      progress={progressPercentage}
                      challengeType={challenge.challengeType}
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                    />
                  </ProgressBar>
                </ProgressSection>

                <ChallengeDetails>
                  <DetailItem>
                    <DetailValue>{challenge.xpReward}</DetailValue>
                    <DetailLabel>XP Reward</DetailLabel>
                  </DetailItem>
                  <DetailItem>
                    <DetailValue>★{challenge.difficulty}</DetailValue>
                    <DetailLabel>Difficulty</DetailLabel>
                  </DetailItem>
                </ChallengeDetails>

                <TimeRemaining isUrgent={urgent}>
                  ⏰ {timeLeft}
                </TimeRemaining>

                <ActionButtons>
                  {challenge.isParticipating ? (
                    challenge.isCompleted ? (
                      <AnimatedButton variant="success" size="small" disabled>
                        Completed! 🎉
                      </AnimatedButton>
                    ) : (
                      <AnimatedButton 
                        variant="outline" 
                        size="small"
                        onClick={() => handleLeaveChallenge(challenge.id)}
                      >
                        Leave Challenge
                      </AnimatedButton>
                    )
                  ) : (
                    <AnimatedButton 
                      variant="primary" 
                      size="small"
                      onClick={() => handleJoinChallenge(challenge.id)}
                    >
                      Join Challenge
                    </AnimatedButton>
                  )}

                  <ParticipantCount>
                    👥 {challenge.participants}
                    {challenge.maxParticipants && ` / ${challenge.maxParticipants}`}
                  </ParticipantCount>
                </ActionButtons>
              </ChallengeCard>
            );
          })}
        </AnimatePresence>
      </ChallengesGrid>
    </CenterContainer>
  );
};

export default ChallengeCenter;
