/**
 * EnhancedOverviewGalaxy.tsx
 * ==========================
 * 
 * Revolutionary Overview section with real-time MCP integration
 * Demonstrates the full power of the Enhanced Client Dashboard Service
 * 
 * Features:
 * - Real-time gamification data
 * - Live XP and achievement updates
 * - MCP server integration
 * - Stellar animations and particle effects
 * - Performance optimized with caching
 * 
 * Seraphina's Digital Alchemy Applied:
 * - Award-winning gradient systems with real data
 * - Particle effects synchronized with achievements
 * - Responsive design with mobile-first approach
 * - WCAG AA accessibility compliance
 */

import React, { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, Trophy, Target, Rocket, Zap,
  TrendingUp, Activity, Award, Sparkles,
  Calendar, Package
} from 'lucide-react';
import { useEnhancedClientDashboard } from '../../hooks/useEnhancedClientDashboard';
import { useSessionCredits } from '../UniversalMasterSchedule/hooks/useSessionCredits';
import { useAuth } from '../../hooks/useAuth';
import OnboardingStatusCard from './OnboardingStatusCard';

// === KEYFRAMES ===
const stellarPulse = keyframes`
  0%, 100% { 
    opacity: 0.8;
    transform: scale(1);
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.4);
  }
  50% { 
    opacity: 1;
    transform: scale(1.05);
    box-shadow: 0 0 30px rgba(0, 255, 255, 0.6);
  }
`;

const xpFlow = keyframes`
  0% { width: 0%; }
  100% { width: var(--progress); }
`;

const achievementGlow = keyframes`
  0%, 100% { 
    box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
  }
  50% { 
    box-shadow: 0 0 25px rgba(255, 215, 0, 0.6);
  }
`;

const particleFloat = keyframes`
  0% { 
    transform: translateY(100px) translateX(0px) rotate(0deg);
    opacity: 0;
  }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { 
    transform: translateY(-20px) translateX(50px) rotate(180deg);
    opacity: 0;
  }
`;

// === STYLED COMPONENTS ===
const OverviewContainer = styled(motion.div)`
  position: relative;
  min-height: 600px;
  overflow: hidden;
`;

const SectionCard = styled(motion.div)`
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(15px);
  border-radius: 20px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(ellipse at 20% 20%, rgba(0, 255, 255, 0.1) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 80%, rgba(120, 81, 169, 0.1) 0%, transparent 50%);
    pointer-events: none;
    z-index: 1;
  }
  
  &:hover {
    border-color: rgba(0, 255, 255, 0.4);
    box-shadow: 0 20px 40px rgba(0, 255, 255, 0.1);
  }
`;

const SectionTitle = styled.h2`
  position: relative;
  z-index: 2;
  color: #00ffff;
  font-size: 1.8rem;
  font-weight: 300;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
  
  &::before {
    content: '✦';
    color: #ffd700;
    animation: ${stellarPulse} 3s ease-in-out infinite;
    font-size: 1.5rem;
  }
`;

const ProgressOrbContainer = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2rem;
`;

const ProgressOrb = styled.div<{ progress: number; $isAnimating?: boolean }>`
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    #00ffff 0deg,
    #00ffff ${props => props.progress * 3.6}deg,
    rgba(0, 255, 255, 0.2) ${props => props.progress * 3.6}deg,
    rgba(0, 255, 255, 0.2) 360deg
  );
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  position: relative;
  box-shadow: 0 0 30px rgba(0, 255, 255, 0.4);
  animation: ${props => props.$isAnimating ? stellarPulse : 'none'} 2s ease-in-out;
  
  &::before {
    content: '';
    width: 85%;
    height: 85%;
    background: radial-gradient(circle, #0a0a0f 0%, #1a1a2e 100%);
    border-radius: 50%;
    position: absolute;
    z-index: 1;
  }
  
  .progress-content {
    position: relative;
    z-index: 2;
    text-align: center;
    
    .level {
      color: #00ffff;
      font-weight: 700;
      font-size: 1.8rem;
      display: block;
      text-shadow: 0 0 10px rgba(0, 255, 255, 0.7);
    }
    
    .level-label {
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.9rem;
      margin-top: 0.25rem;
    }
  }
`;

const XpProgressBar = styled.div<{ progress: number; $isAnimating?: boolean }>`
  width: 300px;
  height: 8px;
  background: rgba(0, 255, 255, 0.2);
  border-radius: 20px;
  position: relative;
  overflow: hidden;
  margin-bottom: 0.5rem;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: linear-gradient(90deg, #00ffff, #7851a9, #ffd700);
    border-radius: 20px;
    width: ${props => props.progress}%;
    animation: ${props => props.$isAnimating ? xpFlow : 'none'} 1s ease-out;
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.6);
  }
`;

const XpText = styled.p`
  color: rgba(255, 255, 255, 0.9);
  font-size: 1rem;
  margin: 0;
  text-align: center;
  
  .xp-highlight {
    color: #00ffff;
    font-weight: 600;
  }
`;

const StatGrid = styled.div`
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1.5rem;
  margin: 2rem 0;
`;

const StatCard = styled(motion.div)`
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 15px;
  padding: 1.5rem;
  text-align: center;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(0, 255, 255, 0.2) 50%,
      transparent 100%
    );
    transition: left 0.6s ease;
  }
  
  &:hover::before {
    left: 100%;
  }
  
  .stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: linear-gradient(135deg, #00ffff, #7851a9);
    margin: 0 auto 1rem;
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
  }
  
  .stat-value {
    font-size: 2.2rem;
    font-weight: 700;
    color: #00ffff;
    display: block;
    margin-bottom: 0.5rem;
    text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
  }
  
  .stat-label {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.8);
    font-weight: 500;
  }
`;

const AchievementsSection = styled(motion.div)`
  position: relative;
  z-index: 2;
  background: rgba(20, 20, 40, 0.6);
  border-radius: 20px;
  padding: 2rem;
  border: 1px solid rgba(255, 215, 0, 0.3);
`;

const AchievementCard = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: rgba(255, 215, 0, 0.1);
  borderRadius: 15px;
  border: 1px solid rgba(255, 215, 0, 0.3);
  margin-bottom: 1rem;
  animation: ${achievementGlow} 4s ease-in-out infinite;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  .achievement-icon {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: linear-gradient(135deg, #ffd700, #ffed4e);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #000;
    font-size: 1.5rem;
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
  }
  
  .achievement-content {
    flex: 1;
    
    h4 {
      margin: 0 0 0.5rem 0;
      color: #ffd700;
      font-weight: 600;
      font-size: 1.1rem;
    }
    
    p {
      margin: 0;
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.9rem;
    }
  }
`;

const LoadingSpinner = styled(motion.div)`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #00ffff;
  
  &::after {
    content: '';
    width: 40px;
    height: 40px;
    border: 3px solid rgba(0, 255, 255, 0.3);
    border-top: 3px solid #00ffff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled(motion.div)`
  background: rgba(255, 65, 108, 0.1);
  border: 1px solid rgba(255, 65, 108, 0.3);
  border-radius: 15px;
  padding: 1.5rem;
  text-align: center;
  color: #ff416c;
  margin-bottom: 2rem;
  
  h3 {
    margin: 0 0 0.5rem 0;
    color: #ff416c;
  }
  
  p {
    margin: 0;
    color: rgba(255, 255, 255, 0.8);
  }
`;

const ParticleField = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
`;

const Particle = styled(motion.div)<{ delay: number }>`
  position: absolute;
  width: 4px;
  height: 4px;
  background: #00ffff;
  border-radius: 50%;
  animation: ${particleFloat} 8s linear infinite;
  animation-delay: ${props => props.delay}s;
  opacity: 0.6;
`;

// === COMPONENT ===
const EnhancedOverviewGalaxy: React.FC = () => {
  const {
    gamificationData,
    stats,
    sessions,
    isLoading,
    error,
    isConnected,
    connectionStatus,
  } = useEnhancedClientDashboard();

  const { user } = useAuth();
  const isClient = user?.role === 'client';
  const { data: credits } = useSessionCredits(isClient);
  const sessionsRemaining = credits?.sessionsRemaining ?? 0;
  const packageName = credits?.packageName ?? null;

  // Find next upcoming session
  const nextSession = sessions
    ?.filter((s: any) => new Date(s.startTime) > new Date() && (s.status === 'booked' || s.status === 'confirmed'))
    ?.sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())?.[0] ?? null;

  const [isLevelUpAnimating, setIsLevelUpAnimating] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; delay: number }>>([]);

  // Generate particles for background effect
  useEffect(() => {
    const particleCount = 15;
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      delay: Math.random() * 8,
    }));
    setParticles(newParticles);
  }, []);

  // Handle level up animation
  useEffect(() => {
    const handleLevelUp = () => {
      setIsLevelUpAnimating(true);
      setTimeout(() => setIsLevelUpAnimating(false), 2000);
    };

    window.addEventListener('gamification:level_up', handleLevelUp);
    return () => window.removeEventListener('gamification:level_up', handleLevelUp);
  }, []);

  // Calculate XP progress percentage
  const xpProgress = gamificationData 
    ? ((gamificationData.xp % 1000) / 1000) * 100 
    : 0;

  if (error) {
    return (
      <OverviewContainer>
        <ErrorMessage
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h3>Connection Error</h3>
          <p>{error}</p>
          <div style={{ 
            marginTop: '1rem', 
            padding: '1rem',
            background: 'rgba(255, 107, 107, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 107, 107, 0.3)'
          }}>
            <p style={{ fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>
              📡 Connection Status: <strong>{connectionStatus}</strong>
            </p>
            <p style={{ fontSize: '0.8rem', margin: 0, color: 'rgba(255, 255, 255, 0.7)' }}>
              The dashboard is running in {isConnected ? 'real-time' : 'polling'} mode.
              {!isConnected && ' Some features may have delayed updates.'}
            </p>
          </div>
        </ErrorMessage>
      </OverviewContainer>
    );
  }

  if (isLoading) {
    return (
      <OverviewContainer>
        <LoadingSpinner
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
      </OverviewContainer>
    );
  }

  return (
    <OverviewContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Background Particles */}
      <ParticleField>
        {particles.map((particle) => (
          <Particle
            key={particle.id}
            delay={particle.delay}
            style={{
              left: `${Math.random() * 100}%`,
              bottom: '0%',
            }}
          />
        ))}
      </ParticleField>

      <SectionCard>
        <SectionTitle>
          <Star size={32} />
          Fitness Constellation
          <motion.div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginLeft: 'auto',
              fontSize: '0.8rem',
              color: 'rgba(255, 255, 255, 0.7)',
            }}
          >
            <motion.div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isConnected ? '#00ff88' : connectionStatus === 'connecting' ? '#ffd700' : '#ff6b6b',
                boxShadow: isConnected ? '0 0 8px rgba(0, 255, 136, 0.5)' : 
                          connectionStatus === 'connecting' ? '0 0 8px rgba(255, 215, 0, 0.5)' : 
                          '0 0 8px rgba(255, 107, 107, 0.5)',
              }}
              animate={isConnected ? { scale: [1, 1.2, 1] } : connectionStatus === 'connecting' ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: isConnected ? 2 : 1, repeat: Infinity }}
            />
            <span>
              {isConnected ? 'Live' : connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
            </span>
          </motion.div>
        </SectionTitle>
        
        <ProgressOrbContainer>
          <ProgressOrb 
            progress={xpProgress} 
            $isAnimating={isLevelUpAnimating}
          >
            <div className="progress-content">
              <span className="level">Level {gamificationData?.level ?? 1}</span>
              <div className="level-label">Stellar Warrior</div>
            </div>
          </ProgressOrb>
          
          <XpProgressBar 
            progress={xpProgress} 
            $isAnimating={isLevelUpAnimating}
          />
          
          <XpText>
            <span className="xp-highlight">{gamificationData?.xp ?? 0}</span> / {' '}
            <span>{(gamificationData?.xp ?? 0) + (gamificationData?.xpToNextLevel ?? 1000)}</span> XP to next level
          </XpText>
        </ProgressOrbContainer>
        
        <StatGrid>
          <StatCard 
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <div className="stat-icon">
              <Activity size={24} color="#fff" />
            </div>
            <span className="stat-value">{stats?.monthlyWorkouts ?? 0}</span>
            <div className="stat-label">Workouts This Month</div>
          </StatCard>
          
          <StatCard 
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <div className="stat-icon">
              <Zap size={24} color="#fff" />
            </div>
            <span className="stat-value">{gamificationData?.streak ?? 0}</span>
            <div className="stat-label">Day Streak</div>
          </StatCard>
          
          <StatCard 
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <div className="stat-icon">
              <Trophy size={24} color="#fff" />
            </div>
            <span className="stat-value">{gamificationData?.badges?.filter(b => b.isUnlocked).length ?? 0}</span>
            <div className="stat-label">Achievements</div>
          </StatCard>
          
          <StatCard 
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <div className="stat-icon">
              <TrendingUp size={24} color="#fff" />
            </div>
            <span className="stat-value">{(gamificationData?.totalXp ?? 0).toLocaleString()}</span>
            <div className="stat-label">Total XP</div>
          </StatCard>
        </StatGrid>
      </SectionCard>

      {/* Phase 1.1 Onboarding Status Integration */}
      <OnboardingStatusCard />

      {/* Next Session + Session Credits */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Next Session Card */}
        <SectionCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          style={{ marginBottom: 0 }}
        >
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#00ffff', fontSize: '1.1rem', fontWeight: 600 }}>
              <Calendar size={20} />
              Next Session
            </div>
            {nextSession ? (
              <div>
                <div style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                  {new Date(nextSession.startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.95rem' }}>
                  {new Date(nextSession.startTime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                </div>
              </div>
            ) : (
              <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.95rem' }}>
                No upcoming sessions — book one from the Schedule tab!
              </div>
            )}
          </div>
        </SectionCard>

        {/* Session Credits Card */}
        <SectionCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ marginBottom: 0 }}
        >
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#ffd700', fontSize: '1.1rem', fontWeight: 600 }}>
              <Package size={20} />
              Session Credits
            </div>
            {packageName ? (
              <div>
                <div style={{ color: '#00ffff', fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                  {sessionsRemaining}
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
                  sessions remaining &middot; {packageName}
                </div>
              </div>
            ) : (
              <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.95rem' }}>
                No active package — visit the store to get started.
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      <AchievementsSection
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          marginBottom: '1.5rem',
          color: '#ffd700',
          fontSize: '1.3rem',
          fontWeight: '600'
        }}>
          <Sparkles size={24} />
          Recent Achievements
        </div>
        
        <AnimatePresence>
          {(gamificationData?.badges?.filter(badge => badge.isUnlocked) ?? []).length > 0 ? (
            gamificationData!.badges!.filter(badge => badge.isUnlocked).slice(0, 3).map((badge, index) => (
              <AchievementCard
                key={badge.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ scale: 1.02, x: 10 }}
              >
                <div className="achievement-icon">
                  {badge.icon || <Award size={24} />}
                </div>
                <div className="achievement-content">
                  <h4>{badge.name}</h4>
                  <p>{badge.description}</p>
                </div>
              </AchievementCard>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                textAlign: 'center',
                padding: '2rem',
                color: 'rgba(255, 255, 255, 0.6)',
                background: 'rgba(255, 215, 0, 0.05)',
                borderRadius: '12px',
                border: '1px dashed rgba(255, 215, 0, 0.2)'
              }}
            >
              <Award size={32} style={{ color: 'rgba(255, 215, 0, 0.4)', marginBottom: '0.5rem' }} />
              <p style={{ margin: 0 }}>Complete workouts to unlock achievements</p>
            </motion.div>
          )}
        </AnimatePresence>
      </AchievementsSection>
    </OverviewContainer>
  );
};

export default EnhancedOverviewGalaxy;