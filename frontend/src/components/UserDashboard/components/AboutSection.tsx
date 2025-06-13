import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { User, MapPin, Calendar, Heart, Target, Award } from 'lucide-react';

const AboutContainer = styled(motion.div)`
  background: ${({ theme }) => theme.gradients?.card || 'rgba(255,255,255,0.05)'};
  backdrop-filter: blur(20px);
  border: 1px solid ${({ theme }) => theme.borders?.elegant || 'rgba(255,255,255,0.1)'};
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
`;

const AboutTitle = styled.h3`
  color: ${({ theme }) => theme.text?.primary || 'white'};
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
`;

const InfoCard = styled.div`
  padding: 1.5rem;
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.05)'};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(255,255,255,0.1)'};
`;

const CardTitle = styled.h4`
  color: ${({ theme }) => theme.text?.primary || 'white'};
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const InfoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const InfoItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const InfoLabel = styled.span`
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};
  font-size: 0.9rem;
`;

const InfoValue = styled.span`
  color: ${({ theme }) => theme.text?.primary || 'white'};
  font-weight: 500;
`;

const BadgeContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const Badge = styled.span<{ variant?: 'primary' | 'secondary' | 'success' }>`
  padding: 0.25rem 0.75rem;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 500;
  background: ${({ variant, theme }) => {
    switch (variant) {
      case 'success': return '#4ade80';
      case 'secondary': return theme.colors?.secondary || '#7851a9';
      default: return theme.colors?.primary || '#00ffff';
    }
  }}20;
  color: ${({ variant, theme }) => {
    switch (variant) {
      case 'success': return '#4ade80';
      case 'secondary': return theme.colors?.secondary || '#7851a9';
      default: return theme.colors?.primary || '#00ffff';
    }
  }};
  border: 1px solid currentColor;
`;

const InterestsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const InterestTag = styled.span`
  padding: 0.25rem 0.75rem;
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.1)'};
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(255,255,255,0.2)'};
  border-radius: 16px;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: ${({ theme }) => theme.background?.primary || 'rgba(0,0,0,0.3)'};
  border-radius: 4px;
  overflow: hidden;
  margin: 0.5rem 0;
`;

const ProgressFill = styled.div<{ progress: number }>`
  height: 100%;
  width: ${props => props.progress}%;
  background: ${({ theme }) => theme.gradients?.primary || 'linear-gradient(135deg, #00ffff, #7851a9)'};
  border-radius: 4px;
  transition: width 0.3s ease;
`;

/**
 * Optimized About Section Component
 * Displays user's personal information, goals, and interests
 */
const AboutSection: React.FC = () => {
  const personalInfo = {
    joined: 'March 2024',
    location: 'Los Angeles, CA',
    memberType: 'Premium Member',
    birthday: 'May 15',
    timezone: 'PST (UTC-8)'
  };

  const fitnessGoals = {
    primaryGoal: 'Build Muscle',
    experience: 'Intermediate',
    favoriteActivity: 'Weight Training',
    workoutFrequency: '5 times per week',
    preferredTime: 'Morning'
  };

  const interests = [
    'Weight Training',
    'Yoga',
    'Running',
    'Nutrition',
    'Meditation',
    'Dancing',
    'Swimming',
    'Hiking'
  ];

  const achievements = [
    { name: 'Early Bird', type: 'success' },
    { name: 'Consistency King', type: 'primary' },
    { name: 'Goal Crusher', type: 'secondary' }
  ];

  const goals = [
    { name: 'Lose 10 lbs', progress: 70, target: '3 months' },
    { name: 'Run 5K', progress: 45, target: '2 months' },
    { name: 'Bench Press 200 lbs', progress: 85, target: '1 month' }
  ];

  return (
    <AboutContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <AboutTitle>
        <User size={24} />
        About Me
      </AboutTitle>

      <InfoGrid>
        <InfoCard>
          <CardTitle>
            <MapPin size={20} />
            Personal Info
          </CardTitle>
          <InfoList>
            {Object.entries(personalInfo).map(([key, value]) => (
              <InfoItem key={key}>
                <InfoLabel>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</InfoLabel>
                <InfoValue>{value}</InfoValue>
              </InfoItem>
            ))}
          </InfoList>
        </InfoCard>

        <InfoCard>
          <CardTitle>
            <Target size={20} />
            Fitness Goals
          </CardTitle>
          <InfoList>
            {Object.entries(fitnessGoals).map(([key, value]) => (
              <InfoItem key={key}>
                <InfoLabel>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</InfoLabel>
                <InfoValue>{value}</InfoValue>
              </InfoItem>
            ))}
          </InfoList>
        </InfoCard>

        <InfoCard>
          <CardTitle>
            <Heart size={20} />
            Interests & Activities
          </CardTitle>
          <InterestsList>
            {interests.map((interest, index) => (
              <InterestTag key={index}>
                {interest}
              </InterestTag>
            ))}
          </InterestsList>
        </InfoCard>

        <InfoCard>
          <CardTitle>
            <Award size={20} />
            Achievements & Goals
          </CardTitle>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <InfoLabel style={{ display: 'block', marginBottom: '0.5rem' }}>
              Recent Achievements:
            </InfoLabel>
            <BadgeContainer>
              {achievements.map((achievement, index) => (
                <Badge key={index} variant={achievement.type as any}>
                  {achievement.name}
                </Badge>
              ))}
            </BadgeContainer>
          </div>

          <div>
            <InfoLabel style={{ display: 'block', marginBottom: '1rem' }}>
              Current Goals:
            </InfoLabel>
            {goals.map((goal, index) => (
              <div key={index} style={{ marginBottom: '1rem' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '0.25rem'
                }}>
                  <span style={{ color: 'white', fontSize: '0.9rem' }}>
                    {goal.name}
                  </span>
                  <span style={{ 
                    color: 'rgba(255,255,255,0.7)', 
                    fontSize: '0.8rem' 
                  }}>
                    {goal.progress}% • {goal.target}
                  </span>
                </div>
                <ProgressBar>
                  <ProgressFill progress={goal.progress} />
                </ProgressBar>
              </div>
            ))}
          </div>
        </InfoCard>
      </InfoGrid>
    </AboutContainer>
  );
};

export default React.memo(AboutSection);
