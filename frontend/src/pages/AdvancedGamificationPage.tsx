/**
 * 🎮 ADVANCED GAMIFICATION PAGE - BUILD SAFE VERSION  
 * =================================================
 * Simplified version that will build successfully on Render
 * Removing complex imports and dependencies temporarily
 */

import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import styled from 'styled-components';

// Safe Lucide React imports
import {
  Trophy,
  Target, 
  Zap,
  Users,
  Gift,
  Star
} from 'lucide-react';

interface AdvancedGamificationPageProps {
  className?: string;
}

const AdvancedGamificationPage: React.FC<AdvancedGamificationPageProps> = ({ className }) => {
  // Simple auth check (build-safe)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Simple token check
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      setUser({ id: 'user123' });
    }
  }, []);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Helmet>
        <title>Gamification Hub - SwanStudios</title>
        <meta 
          name="description" 
          content="Transform your fitness journey into an epic adventure with achievements, challenges, and social competitions." 
        />
      </Helmet>

      <GamificationContainer
        className={className}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <GamificationHeader>
          <HeaderContent>
            <Trophy size={40} color="#00ffff" />
            <HeaderText>
              <h1>Gamification Hub</h1>
              <p>Transform your fitness journey into an epic adventure</p>
            </HeaderText>
          </HeaderContent>
        </GamificationHeader>

        {/* Stats Cards */}
        <StatsGrid>
          <StatCard>
            <StatIcon>
              <Target size={24} color="#ff4757" />
            </StatIcon>
            <StatInfo>
              <StatValue>12</StatValue>
              <StatLabel>Achievements</StatLabel>
            </StatInfo>
          </StatCard>

          <StatCard>
            <StatIcon>
              <Zap size={24} color="#ffa502" />
            </StatIcon>
            <StatInfo>
              <StatValue>7</StatValue>
              <StatLabel>Day Streak</StatLabel>
            </StatInfo>
          </StatCard>

          <StatCard>
            <StatIcon>
              <Star size={24} color="#7d5fff" />
            </StatIcon>
            <StatInfo>
              <StatValue>2,450</StatValue>
              <StatLabel>Points</StatLabel>
            </StatInfo>
          </StatCard>

          <StatCard>
            <StatIcon>
              <Users size={24} color="#2ed573" />
            </StatIcon>
            <StatInfo>
              <StatValue>5th</StatValue>
              <StatLabel>Leaderboard</StatLabel>
            </StatInfo>
          </StatCard>
        </StatsGrid>

        {/* Feature Sections */}
        <FeatureGrid>
          <FeatureCard>
            <FeatureIcon>
              <Trophy size={32} color="#00ffff" />
            </FeatureIcon>
            <FeatureContent>
              <h3>Achievements</h3>
              <p>Unlock badges and trophies as you reach fitness milestones</p>
            </FeatureContent>
          </FeatureCard>

          <FeatureCard>
            <FeatureIcon>
              <Target size={32} color="#ff4757" />
            </FeatureIcon>
            <FeatureContent>
              <h3>Challenges</h3>
              <p>Participate in daily and weekly fitness challenges</p>
            </FeatureContent>
          </FeatureCard>

          <FeatureCard>
            <FeatureIcon>
              <Users size={32} color="#2ed573" />
            </FeatureIcon>
            <FeatureContent>
              <h3>Leaderboards</h3>
              <p>Compete with friends and climb the global rankings</p>
            </FeatureContent>
          </FeatureCard>

          <FeatureCard>
            <FeatureIcon>
              <Gift size={32} color="#ffa502" />
            </FeatureIcon>
            <FeatureContent>
              <h3>Rewards</h3>
              <p>Earn points and redeem exclusive fitness rewards</p>
            </FeatureContent>
          </FeatureCard>
        </FeatureGrid>

        {/* Coming Soon Notice */}
        <ComingSoonCard>
          <Zap size={48} color="#00ffff" />
          <h2>Advanced Features Coming Soon!</h2>
          <p>
            We're building an incredible gamification system with achievements, 
            challenges, and social competitions. Stay tuned for the full experience!
          </p>
        </ComingSoonCard>
      </GamificationContainer>
    </>
  );
};

export default AdvancedGamificationPage;

// Styled Components
const GamificationContainer = styled(motion.div)`
  min-height: 100vh;
  width: 100%;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
  color: white;
  padding: 2rem;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const GamificationHeader = styled.div`
  margin-bottom: 3rem;
  text-align: center;
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.5rem;
  }
`;

const HeaderText = styled.div`
  text-align: left;

  h1 {
    font-size: 2.5rem;
    font-weight: 300;
    margin: 0;
    background: linear-gradient(135deg, #00ffff, #7d5fff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  p {
    font-size: 1.1rem;
    color: rgba(255, 255, 255, 0.7);
    margin: 0.5rem 0 0 0;
  }

  @media (max-width: 768px) {
    text-align: center;

    h1 {
      font-size: 2rem;
    }
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
`;

const StatCard = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    border-color: rgba(0, 255, 255, 0.3);
  }
`;

const StatIcon = styled.div`
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
`;

const StatInfo = styled.div``;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
  color: #00ffff;
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
`;

const FeatureCard = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 2rem;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    border-color: rgba(0, 255, 255, 0.3);
  }
`;

const FeatureIcon = styled.div`
  padding: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  flex-shrink: 0;
`;

const FeatureContent = styled.div`
  h3 {
    font-size: 1.2rem;
    font-weight: 500;
    margin: 0 0 0.5rem 0;
    color: white;
  }

  p {
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.5;
    margin: 0;
  }
`;

const ComingSoonCard = styled.div`
  text-align: center;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 3rem 2rem;

  h2 {
    font-size: 1.5rem;
    font-weight: 500;
    margin: 1rem 0;
    color: white;
  }

  p {
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.6;
    max-width: 600px;
    margin: 0 auto;
  }
`;
