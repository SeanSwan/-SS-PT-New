/**
 * EnhancedTimeWarp.tsx
 * ====================
 * 
 * Revolutionary Schedule Integration for Client Dashboard
 * Combines the full schedule component functionality with stellar theme
 * 
 * Features:
 * - Full schedule calendar integration
 * - Stellar cosmic theme overlay
 * - Client-specific role permissions
 * - Real-time session updates
 * - MCP server integration ready
 * 
 * Seraphina's Digital Alchemy Applied:
 * - Award-winning gradient systems
 * - Particle effect enhancements
 * - Mobile-first stellar design
 * - WCAG AA accessibility compliance
 */

import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Star, Sparkles, Users, MapPin, CheckCircle } from 'lucide-react';

// Import the full schedule component
import UnifiedCalendar from '../Schedule/schedule';

// === STELLAR THEME KEYFRAMES ===
const stellarPulse = keyframes`
  0%, 100% { 
    opacity: 0.7;
    transform: scale(1);
  }
  50% { 
    opacity: 1;
    transform: scale(1.05);
  }
`;

const cosmicOrbit = keyframes`
  0% { transform: rotate(0deg) translateX(10px) rotate(0deg); }
  100% { transform: rotate(360deg) translateX(10px) rotate(-360deg); }
`;

const nebulaDrift = keyframes`
  0%, 100% { transform: translateY(0px) translateX(0px); }
  33% { transform: translateY(-10px) translateX(5px); }
  66% { transform: translateY(5px) translateX(-3px); }
`;

// === STYLED COMPONENTS ===
const StellarTimeWarpContainer = styled(motion.div)`
  position: relative;
  background: rgba(10, 10, 15, 0.8);
  border-radius: 20px;
  overflow: hidden;
  border: 2px solid rgba(0, 255, 255, 0.3);
  box-shadow: 
    0 15px 35px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(ellipse at 20% 20%, rgba(0, 255, 255, 0.15) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 80%, rgba(120, 81, 169, 0.15) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 50%, rgba(255, 215, 0, 0.05) 0%, transparent 70%);
    pointer-events: none;
    z-index: 1;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: 
      radial-gradient(2px 2px at 20px 30px, rgba(0, 255, 255, 0.6), transparent),
      radial-gradient(2px 2px at 40px 70px, rgba(255, 215, 0, 0.6), transparent),
      radial-gradient(1px 1px at 90px 40px, rgba(255, 255, 255, 0.8), transparent),
      radial-gradient(1px 1px at 130px 80px, rgba(0, 255, 255, 0.6), transparent);
    background-repeat: repeat;
    background-size: 200px 100px;
    animation: ${nebulaDrift} 30s ease-in-out infinite;
    opacity: 0.4;
    pointer-events: none;
    z-index: 0;
  }
`;

const StellarHeader = styled(motion.div)`
  position: relative;
  z-index: 2;
  padding: 2rem 2rem 1rem;
  background: rgba(30, 30, 60, 0.4);
  backdrop-filter: blur(15px);
  border-bottom: 1px solid rgba(0, 255, 255, 0.2);
`;

const StellarTitle = styled.h2`
  margin: 0 0 1rem 0;
  font-size: 2rem;
  font-weight: 300;
  background: linear-gradient(135deg, #00ffff, #7851a9, #ffd700);
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  animation: ${stellarPulse} 4s ease-in-out infinite;
  display: flex;
  align-items: center;
  gap: 1rem;
  
  &::before {
    content: '✦';
    color: #ffd700;
    animation: ${cosmicOrbit} 8s linear infinite;
    font-size: 1.5rem;
  }
`;

const StellarSubtitle = styled.p`
  margin: 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 1.1rem;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
`;

const ScheduleWrapper = styled(motion.div)`
  position: relative;
  z-index: 2;
  padding: 0 1rem 1rem;
  
  /* Override schedule component styling to match stellar theme */
  .rbc-calendar {
    background: rgba(30, 30, 60, 0.2) !important;
    border: 1px solid rgba(0, 255, 255, 0.2) !important;
    border-radius: 15px !important;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3) !important;
  }
  
  .rbc-toolbar {
    background: rgba(20, 20, 40, 0.8) !important;
    border: 1px solid rgba(0, 255, 255, 0.3) !important;
    border-radius: 12px !important;
    margin-bottom: 1rem !important;
    backdrop-filter: blur(10px) !important;
  }
  
  .rbc-toolbar-label {
    color: #00ffff !important;
    text-shadow: 0 0 10px rgba(0, 255, 255, 0.5) !important;
    font-weight: 600 !important;
  }
  
  .rbc-btn-group button {
    background: rgba(0, 255, 255, 0.1) !important;
    border: 1px solid rgba(0, 255, 255, 0.3) !important;
    color: #00ffff !important;
    border-radius: 8px !important;
    margin: 0 2px !important;
    transition: all 0.3s ease !important;
    
    &:hover {
      background: rgba(0, 255, 255, 0.2) !important;
      box-shadow: 0 0 15px rgba(0, 255, 255, 0.4) !important;
    }
    
    &.rbc-active {
      background: linear-gradient(135deg, #00ffff, #7851a9) !important;
      color: #000 !important;
      font-weight: bold !important;
      box-shadow: 0 0 20px rgba(0, 255, 255, 0.6) !important;
    }
  }
  
  .rbc-header {
    background: rgba(0, 255, 255, 0.1) !important;
    color: #00ffff !important;
    border-bottom: 1px solid rgba(0, 255, 255, 0.3) !important;
    font-weight: 600 !important;
    text-shadow: 0 0 8px rgba(0, 255, 255, 0.5) !important;
  }
  
  .rbc-today {
    background: rgba(255, 215, 0, 0.2) !important;
    box-shadow: inset 0 0 15px rgba(255, 215, 0, 0.3) !important;
  }
  
  .rbc-event {
    background: linear-gradient(135deg, rgba(0, 255, 255, 0.8), rgba(120, 81, 169, 0.8)) !important;
    border: none !important;
    border-radius: 10px !important;
    box-shadow: 0 4px 15px rgba(0, 255, 255, 0.3) !important;
    transition: all 0.3s ease !important;
    
    &:hover {
      transform: translateY(-2px) !important;
      box-shadow: 0 6px 20px rgba(0, 255, 255, 0.5) !important;
    }
    
    &.available {
      background: linear-gradient(135deg, rgba(0, 255, 136, 0.9), rgba(16, 185, 129, 0.9)) !important;
      color: #000 !important;
    }
    
    &.booked {
      background: linear-gradient(135deg, rgba(120, 81, 169, 0.9), rgba(167, 125, 212, 0.9)) !important;
      color: #fff !important;
    }
    
    &.confirmed {
      background: linear-gradient(135deg, rgba(0, 200, 255, 0.9), rgba(59, 130, 246, 0.9)) !important;
      color: #fff !important;
    }
    
    &.completed {
      background: linear-gradient(135deg, rgba(255, 215, 0, 0.9), rgba(251, 191, 36, 0.9)) !important;
      color: #000 !important;
    }
  }
  
  .rbc-time-slot {
    border-color: rgba(0, 255, 255, 0.1) !important;
  }
  
  .rbc-timeslot-group {
    border-color: rgba(0, 255, 255, 0.1) !important;
  }
  
  .rbc-day-bg + .rbc-day-bg {
    border-left: 1px solid rgba(0, 255, 255, 0.1) !important;
  }
  
  .rbc-month-view {
    border-color: rgba(0, 255, 255, 0.1) !important;
  }
  
  .rbc-month-row + .rbc-month-row {
    border-top: 1px solid rgba(0, 255, 255, 0.1) !important;
  }
`;

const QuickStatsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 1.5rem 2rem;
  position: relative;
  z-index: 2;
`;

const StellarStatCard = styled(motion.div)`
  background: rgba(30, 30, 60, 0.6);
  backdrop-filter: blur(15px);
  border-radius: 15px;
  border: 1px solid rgba(0, 255, 255, 0.3);
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
  
  &:hover {
    border-color: rgba(0, 255, 255, 0.6);
    box-shadow: 0 8px 25px rgba(0, 255, 255, 0.2);
    transform: translateY(-5px);
  }
`;

const StatIcon = styled.div`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00ffff, #7851a9);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  animation: ${stellarPulse} 3s ease-in-out infinite;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.4);
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #00ffff, #ffd700);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  font-weight: 500;
`;

const UpcomingSessionsSection = styled(motion.div)`
  position: relative;
  z-index: 2;
  margin: 1.5rem 2rem 2rem;
  background: rgba(20, 20, 40, 0.8);
  backdrop-filter: blur(15px);
  border-radius: 15px;
  padding: 1.5rem;
  border: 1px solid rgba(0, 255, 255, 0.2);
`;

const SessionCard = styled(motion.div)`
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(120, 81, 169, 0.1));
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  border: 1px solid rgba(0, 255, 255, 0.2);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    width: 4px;
    height: 100%;
    background: linear-gradient(180deg, #00ffff, #7851a9);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover::before {
    opacity: 1;
  }
  
  &:hover {
    transform: translateX(8px);
    border-color: rgba(0, 255, 255, 0.4);
    box-shadow: 0 8px 25px rgba(0, 255, 255, 0.2);
  }
  
  &:last-child {
    margin-bottom: 0;
  }
`;

// === COMPONENT ===
interface EnhancedTimeWarpProps {
  className?: string;
}

const EnhancedTimeWarp: React.FC<EnhancedTimeWarpProps> = ({ className }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [upcomingSessions, setUpcomingSessions] = useState([
    {
      id: '1',
      title: 'Personal Training Session',
      trainer: 'Coach Sarah Johnson',
      date: 'Tomorrow',
      time: '10:00 AM - 11:00 AM',
      type: 'Strength Training',
      status: 'confirmed',
      location: 'Studio A'
    },
    {
      id: '2',
      title: 'Group HIIT Class',
      trainer: 'Coach Mike Rodriguez',
      date: 'Friday',
      time: '6:00 PM - 7:00 PM',
      type: 'Cardio',
      status: 'booked',
      location: 'Main Studio'
    },
    {
      id: '3',
      title: 'Yoga Flow Session',
      trainer: 'Emma Thompson',
      date: 'Saturday',
      time: '9:00 AM - 10:00 AM',
      type: 'Flexibility',
      status: 'available',
      location: 'Zen Room'
    }
  ]);

  const stats = [
    {
      icon: Calendar,
      value: '4',
      label: 'Sessions This Week',
      color: '#00ffff'
    },
    {
      icon: Clock,
      value: '2',
      label: 'Pending Bookings',
      color: '#ffd700'
    },
    {
      icon: CheckCircle,
      value: '12',
      label: 'Completed Sessions',
      color: '#00ff88'
    },
    {
      icon: Users,
      value: '3',
      label: 'Active Trainers',
      color: '#7851a9'
    }
  ];

  useEffect(() => {
    // Simulate loading time for smooth animation
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#00ff88';
      case 'booked': return '#7851a9';
      case 'available': return '#00ffff';
      default: return '#888';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle size={16} />;
      case 'booked': return <Clock size={16} />;
      case 'available': return <Calendar size={16} />;
      default: return <Star size={16} />;
    }
  };

  return (
    <StellarTimeWarpContainer
      className={className}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <StellarHeader
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <StellarTitle>
          <Calendar size={32} color="#00ffff" />
          Time Warp Chamber
        </StellarTitle>
        <StellarSubtitle>
          Navigate your training sessions through space and time
        </StellarSubtitle>
      </StellarHeader>

      <QuickStatsGrid
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        {stats.map((stat, index) => (
          <StellarStatCard
            key={index}
            whileHover={{ 
              scale: 1.05,
              rotate: 2,
              transition: { duration: 0.3 }
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
          >
            <StatIcon>
              <stat.icon size={24} color="#fff" />
            </StatIcon>
            <StatValue>{stat.value}</StatValue>
            <StatLabel>{stat.label}</StatLabel>
          </StellarStatCard>
        ))}
      </QuickStatsGrid>

      <UpcomingSessionsSection
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          marginBottom: '1.5rem',
          color: '#00ffff',
          fontSize: '1.2rem',
          fontWeight: '600'
        }}>
          <Sparkles size={20} />
          Upcoming Sessions
        </div>

        <AnimatePresence>
          {upcomingSessions.map((session, index) => (
            <SessionCard
              key={session.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '1rem'
              }}>
                <div>
                  <h4 style={{ 
                    margin: '0 0 0.5rem 0', 
                    color: '#00ffff',
                    fontSize: '1.1rem',
                    fontWeight: '600'
                  }}>
                    {session.title}
                  </h4>
                  <p style={{ 
                    margin: '0 0 0.5rem 0', 
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '0.9rem'
                  }}>
                    with {session.trainer}
                  </p>
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: `${getStatusColor(session.status)}20`,
                  color: getStatusColor(session.status),
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  border: `1px solid ${getStatusColor(session.status)}40`
                }}>
                  {getStatusIcon(session.status)}
                  {session.status.toUpperCase()}
                </div>
              </div>
              
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '1rem',
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.9rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={14} />
                  {session.date}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={14} />
                  {session.time}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={14} />
                  {session.location}
                </div>
                <div style={{
                  background: 'rgba(255, 215, 0, 0.2)',
                  color: '#ffd700',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '15px',
                  fontSize: '0.8rem',
                  textAlign: 'center',
                  fontWeight: '600'
                }}>
                  {session.type}
                </div>
              </div>
            </SessionCard>
          ))}
        </AnimatePresence>
      </UpcomingSessionsSection>

      <ScheduleWrapper
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.2 }}
      >
        {!isLoading && <UnifiedCalendar />}
      </ScheduleWrapper>
    </StellarTimeWarpContainer>
  );
};

export default EnhancedTimeWarp;