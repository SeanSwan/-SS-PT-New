/**
 * SwanStudios About Section Component
 * ==================================
 * 
 * Professional about section with personal info, goals, and achievements
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { 
  User,
  MapPin,
  Calendar,
  Target,
  Trophy,
  Heart,
  Star,
  Award,
  Edit3,
  Save,
  X,
  Plus,
  Zap,
  Mountain,
  Flame
} from 'lucide-react';

// Professional styled components
const AboutContainer = styled(motion.div)`
  background: ${({ theme }) => theme.gradients?.card || 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))'};
  backdrop-filter: blur(24px);
  border: 1px solid ${({ theme }) => theme.borders?.elegant || 'rgba(255,255,255,0.12)'};
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.15),
    0 8px 16px rgba(0, 0, 0, 0.1);
  
  @media (max-width: 768px) {
    padding: 1.5rem;
    border-radius: 16px;
  }
`;

const SectionGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const InfoCard = styled(motion.div)`
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.05)'};
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(255,255,255,0.1)'};
  border-radius: 16px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    border-color: ${({ theme }) => theme.colors?.primary + '40' || 'rgba(59, 130, 246, 0.4)'};
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const CardTitle = styled.h3`
  color: ${({ theme }) => theme.text?.primary || 'white'};
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const EditButton = styled(motion.button)`
  width: 32px;
  height: 32px;
  background: ${({ theme }) => theme.background?.primary || 'rgba(0,0,0,0.3)'};
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(255,255,255,0.1)'};
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors?.primary || '#3B82F6'};
    color: white;
    transform: scale(1.1);
  }
`;

const InfoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: ${({ theme }) => theme.background?.primary || 'rgba(0,0,0,0.2)'};
  border-radius: 12px;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.05)'};
  }
`;

const InfoIcon = styled.div<{ $color?: string }>`
  width: 40px;
  height: 40px;
  background: ${({ $color }) => $color || 'linear-gradient(135deg, #3B82F6, #8B5CF6)'};
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
`;

const InfoContent = styled.div`
  flex: 1;
`;

const InfoLabel = styled.p`
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};
  font-size: 0.875rem;
  margin: 0 0 0.25rem;
  font-weight: 500;
`;

const InfoValue = styled.p`
  color: ${({ theme }) => theme.text?.primary || 'white'};
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
`;

const GoalsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const GoalItem = styled(motion.div)`
  background: ${({ theme }) => theme.background?.primary || 'rgba(0,0,0,0.2)'};
  border-radius: 12px;
  padding: 1rem;
  border-left: 4px solid ${({ theme }) => theme.colors?.primary || '#3B82F6'};
  transition: all 0.3s ease;
  
  &:hover {
    background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.05)'};
    transform: translateX(4px);
  }
`;

const GoalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const GoalTitle = styled.h4`
  color: ${({ theme }) => theme.text?.primary || 'white'};
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
`;

const GoalStatus = styled.span<{ $completed?: boolean }>`
  padding: 0.25rem 0.75rem;
  background: ${({ $completed, theme }) => 
    $completed 
      ? 'linear-gradient(135deg, #10B981, #059669)'
      : theme.colors?.primary || '#3B82F6'
  };
  color: white;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
`;

const GoalDescription = styled.p`
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};
  font-size: 0.9rem;
  margin: 0 0 0.75rem;
  line-height: 1.4;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.1)'};
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
`;

const ProgressFill = styled(motion.div)<{ $progress: number }>`
  height: 100%;
  background: linear-gradient(90deg, #3B82F6, #8B5CF6);
  border-radius: 4px;
  width: ${props => props.$progress}%;
`;

const ProgressText = styled.p`
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};
  font-size: 0.8rem;
  margin: 0;
  text-align: right;
`;

const AchievementsList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const AchievementItem = styled(motion.div)`
  background: ${({ theme }) => theme.background?.primary || 'rgba(0,0,0,0.2)'};
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
  transition: all 0.3s ease;
  border: 1px solid transparent;
  
  &:hover {
    background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.05)'};
    border-color: ${({ theme }) => theme.colors?.primary + '40' || 'rgba(59, 130, 246, 0.4)'};
    transform: translateY(-2px);
  }
`;

const AchievementIcon = styled.div<{ $color?: string }>`
  width: 60px;
  height: 60px;
  background: ${({ $color }) => $color || 'linear-gradient(135deg, #F59E0B, #D97706)'};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 0.75rem;
  color: white;
  font-size: 24px;
`;

const AchievementTitle = styled.h4`
  color: ${({ theme }) => theme.text?.primary || 'white'};
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
`;

const AchievementDescription = styled.p`
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};
  font-size: 0.875rem;
  margin: 0 0 0.5rem;
  line-height: 1.3;
`;

const AchievementDate = styled.p`
  color: ${({ theme }) => theme.colors?.primary || '#3B82F6'};
  font-size: 0.75rem;
  font-weight: 500;
  margin: 0;
`;

const AddButton = styled(motion.button)`
  width: 100%;
  padding: 1rem;
  background: ${({ theme }) => theme.background?.primary || 'rgba(0,0,0,0.2)'};
  border: 2px dashed ${({ theme }) => theme.borders?.elegant || 'rgba(255,255,255,0.2)'};
  border-radius: 12px;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 500;
  
  &:hover {
    background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.05)'};
    border-color: ${({ theme }) => theme.colors?.primary || '#3B82F6'};
    color: ${({ theme }) => theme.colors?.primary || '#3B82F6'};
  }
`;

// Mock data
const personalInfo = [
  {
    icon: MapPin,
    label: 'Location',
    value: 'Los Angeles, CA',
    color: 'linear-gradient(135deg, #10B981, #059669)'
  },
  {
    icon: Calendar,
    label: 'Joined',
    value: 'March 2024',
    color: 'linear-gradient(135deg, #3B82F6, #1D4ED8)'
  },
  {
    icon: Target,
    label: 'Primary Goal',
    value: 'Build Muscle & Strength',
    color: 'linear-gradient(135deg, #F59E0B, #D97706)'
  },
  {
    icon: Zap,
    label: 'Fitness Level',
    value: 'Intermediate',
    color: 'linear-gradient(135deg, #8B5CF6, #7C3AED)'
  }
];

const fitnessGoals = [
  {
    id: 1,
    title: 'Complete 100 Workouts',
    description: 'Consistency is key to achieving lasting results',
    progress: 75,
    completed: false,
    target: 100,
    current: 75
  },
  {
    id: 2,
    title: 'Deadlift Bodyweight',
    description: 'Build functional strength and power',
    progress: 90,
    completed: false,
    target: 185,
    current: 165
  },
  {
    id: 3,
    title: 'Morning Yoga Routine',
    description: 'Start each day with mindful movement',
    progress: 100,
    completed: true,
    target: 30,
    current: 30
  }
];

const achievements = [
  {
    id: 1,
    title: 'First Month Strong',
    description: 'Completed your first month of consistent training',
    icon: '🎯',
    color: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
    date: '2 weeks ago'
  },
  {
    id: 2,
    title: 'Community Helper',
    description: 'Helped 10 community members with their fitness journey',
    icon: '❤️',
    color: 'linear-gradient(135deg, #EF4444, #DC2626)',
    date: '1 month ago'
  },
  {
    id: 3,
    title: 'Flexibility Master',
    description: 'Achieved full range of motion in all major movements',
    icon: '🧘',
    color: 'linear-gradient(135deg, #10B981, #059669)',
    date: '1 month ago'
  },
  {
    id: 4,
    title: 'SwanStudios Rookie',
    description: 'Welcome to the SwanStudios family!',
    icon: '⭐',
    color: 'linear-gradient(135deg, #F59E0B, #D97706)',
    date: '3 months ago'
  }
];

const AboutSection: React.FC = () => {
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingGoals, setEditingGoals] = useState(false);

  const handleEditPersonal = () => {
    setEditingPersonal(!editingPersonal);
  };

  const handleEditGoals = () => {
    setEditingGoals(!editingGoals);
  };

  const handleAddGoal = () => {
    console.log('Add new goal');
    // TODO: Implement add goal functionality
  };

  const handleAddAchievement = () => {
    console.log('Add new achievement');
    // TODO: Implement add achievement functionality
  };

  return (
    <AboutContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <SectionGrid>
        {/* Personal Information */}
        <InfoCard
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <CardHeader>
            <CardTitle>
              <User size={20} />
              Personal Info
            </CardTitle>
            <EditButton
              onClick={handleEditPersonal}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {editingPersonal ? <Save size={16} /> : <Edit3 size={16} />}
            </EditButton>
          </CardHeader>
          
          <InfoList>
            {personalInfo.map((info, index) => {
              const Icon = info.icon;
              return (
                <InfoItem key={index}>
                  <InfoIcon $color={info.color}>
                    <Icon size={20} />
                  </InfoIcon>
                  <InfoContent>
                    <InfoLabel>{info.label}</InfoLabel>
                    <InfoValue>{info.value}</InfoValue>
                  </InfoContent>
                </InfoItem>
              );
            })}
          </InfoList>
        </InfoCard>

        {/* Fitness Goals */}
        <InfoCard
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <CardHeader>
            <CardTitle>
              <Target size={20} />
              Fitness Goals
            </CardTitle>
            <EditButton
              onClick={handleEditGoals}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {editingGoals ? <Save size={16} /> : <Edit3 size={16} />}
            </EditButton>
          </CardHeader>
          
          <GoalsList>
            {fitnessGoals.map((goal) => (
              <GoalItem
                key={goal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <GoalHeader>
                  <GoalTitle>{goal.title}</GoalTitle>
                  <GoalStatus $completed={goal.completed}>
                    {goal.completed ? 'Completed' : 'In Progress'}
                  </GoalStatus>
                </GoalHeader>
                <GoalDescription>{goal.description}</GoalDescription>
                <ProgressBar>
                  <ProgressFill
                    $progress={goal.progress}
                    initial={{ width: 0 }}
                    animate={{ width: `${goal.progress}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </ProgressBar>
                <ProgressText>
                  {goal.current} / {goal.target} ({goal.progress}%)
                </ProgressText>
              </GoalItem>
            ))}
            
            <AddButton
              onClick={handleAddGoal}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus size={20} />
              Add New Goal
            </AddButton>
          </GoalsList>
        </InfoCard>
      </SectionGrid>

      {/* Achievements Section */}
      <InfoCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        style={{ marginTop: '2rem' }}
      >
        <CardHeader>
          <CardTitle>
            <Trophy size={20} />
            Achievements & Milestones
          </CardTitle>
        </CardHeader>
        
        <AchievementsList>
          {achievements.map((achievement, index) => (
            <AchievementItem
              key={achievement.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
            >
              <AchievementIcon $color={achievement.color}>
                {achievement.icon}
              </AchievementIcon>
              <AchievementTitle>{achievement.title}</AchievementTitle>
              <AchievementDescription>{achievement.description}</AchievementDescription>
              <AchievementDate>{achievement.date}</AchievementDate>
            </AchievementItem>
          ))}
          
          <AchievementItem
            whileHover={{ scale: 1.05 }}
            onClick={handleAddAchievement}
            style={{ cursor: 'pointer' }}
          >
            <AchievementIcon $color="linear-gradient(135deg, #6B7280, #4B5563)">
              <Plus size={24} />
            </AchievementIcon>
            <AchievementTitle>Add Achievement</AchievementTitle>
            <AchievementDescription>Record a new milestone</AchievementDescription>
          </AchievementItem>
        </AchievementsList>
      </InfoCard>
    </AboutContainer>
  );
};

export default AboutSection;