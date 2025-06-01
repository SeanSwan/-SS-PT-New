/**
 * TrainerStellarSections.tsx
 * ==========================
 * 
 * Stellar Training Center Sections for Trainer Dashboard
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Features:
 * - Cosmic training command center sections
 * - Enhanced stellar aesthetics with trainer-specific content
 * - Performance-optimized components with smooth animations
 * - Mobile-first responsive design
 * - WCAG AA accessibility compliance
 * 
 * Master Prompt v28 Alignment:
 * - Award-winning aesthetics with cosmic training grandeur
 * - Mobile-first ultra-responsive components
 * - Accessibility as art with inclusive design
 */

import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { 
  Users, Calendar, TrendingUp, Target, Video, MessageSquare,
  Plus, MoreVertical, User, Clock, Upload, Camera, Star,
  Award, Zap, Bell, Settings, BarChart3, FileText, Search
} from 'lucide-react';
import { useUniversalTheme } from '../../../context/ThemeContext';
import GlowButton from '../../Button/glowButton';

// === KEYFRAME ANIMATIONS ===
const stellarFloat = keyframes`
  0%, 100% { transform: translateY(0); opacity: 0.8; }
  50% { transform: translateY(-8px); opacity: 1; }
`;

const cosmicPulse = keyframes`
  0%, 100% { 
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
    border-color: rgba(0, 255, 255, 0.4);
  }
  50% { 
    box-shadow: 0 0 30px rgba(0, 255, 255, 0.6), 0 0 50px rgba(255, 215, 0, 0.3);
    border-color: rgba(0, 255, 255, 0.8);
  }
`;

// === STYLED COMPONENTS ===
const StellarSection = styled(motion.div)`
  background: ${props => props.theme.gradients?.card || 'rgba(30, 30, 60, 0.4)'};
  backdrop-filter: blur(15px);
  border-radius: 20px;
  border: 1px solid ${props => props.theme.borders?.elegant || 'rgba(0, 255, 255, 0.2)'};
  padding: 2rem;
  margin-bottom: 2rem;
  position: relative;
  overflow: hidden;
  
  /* Stellar particles background */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(2px 2px at 20% 30%, rgba(0, 255, 255, 0.4), transparent),
      radial-gradient(1px 1px at 40% 70%, rgba(255, 215, 0, 0.3), transparent),
      radial-gradient(1px 1px at 80% 10%, rgba(255, 255, 255, 0.2), transparent);
    background-size: 100px 80px;
    animation: ${stellarFloat} 15s ease-in-out infinite;
    opacity: 0.3;
    pointer-events: none;
  }
  
  @media (max-width: 768px) {
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    border-radius: 15px;
  }
`;

const StellarSectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  position: relative;
  z-index: 2;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
`;

const StellarSectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  background: ${props => props.theme.gradients?.stellar || 'linear-gradient(45deg, #00FFFF 0%, #FFD700 100%)'};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  letter-spacing: 0.5px;
  text-shadow: ${props => props.theme.shadows?.glow || '0 0 15px currentColor'};
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
  position: relative;
  z-index: 2;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }
`;

const StatCard = styled(motion.div)<{ glowColor?: string }>`
  background: ${props => props.theme.background?.surface || 'rgba(30, 30, 60, 0.6)'};
  border: 1px solid ${props => props.theme.borders?.subtle || 'rgba(255, 255, 255, 0.05)'};
  border-radius: 15px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => props.glowColor || props.theme.gradients?.primary || 'linear-gradient(135deg, #00FFFF, #00A0E3)'};
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    background: ${props => props.theme.background?.elevated || 'rgba(50, 50, 80, 0.4)'};
    transform: translateY(-4px);
    box-shadow: ${props => props.theme.shadows?.cosmic || '0 8px 32px rgba(0, 0, 0, 0.4)'};
    animation: ${cosmicPulse} 2s ease-in-out infinite;
    
    &::before {
      opacity: 1;
    }
  }
  
  @media (max-width: 768px) {
    padding: 1.25rem;
    flex-direction: column;
    text-align: center;
  }
`;

const StatIcon = styled.div<{ color?: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 15px;
  background: ${props => `${props.color || '#00FFFF'}15`};
  border: 1px solid ${props => `${props.color || '#00FFFF'}30`};
  color: ${props => props.color || '#00FFFF'};
  
  @media (max-width: 768px) {
    width: 50px;
    height: 50px;
  }
`;

const StatContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.theme.text?.primary || '#ffffff'};
  line-height: 1.2;
  
  @media (max-width: 768px) {
    font-size: 1.75rem;
  }
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: ${props => props.theme.text?.secondary || '#E8F0FF'};
  font-weight: 500;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  position: relative;
  z-index: 2;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const ClientCard = styled(motion.div)`
  background: ${props => props.theme.background?.surface || 'rgba(30, 30, 60, 0.6)'};
  border: 1px solid ${props => props.theme.borders?.elegant || 'rgba(0, 255, 255, 0.2)'};
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    width: 3px;
    height: 100%;
    background: ${props => props.theme.gradients?.stellar || 'linear-gradient(45deg, #00FFFF 0%, #FFD700 100%)'};
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    background: ${props => props.theme.background?.elevated || 'rgba(50, 50, 80, 0.4)'};
    transform: translateX(8px);
    box-shadow: ${props => props.theme.shadows?.primary || '0 0 20px rgba(0, 255, 255, 0.3)'};
    
    &::before {
      opacity: 1;
    }
  }
  
  &:last-child {
    margin-bottom: 0;
  }
  
  @media (max-width: 768px) {
    padding: 1rem;
    flex-direction: column;
    text-align: center;
  }
`;

const ClientAvatar = styled.div`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: ${props => props.theme.gradients?.stellar || 'linear-gradient(45deg, #00FFFF 0%, #FFD700 100%)'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000000;
  font-weight: 700;
  font-size: 1.1rem;
  box-shadow: ${props => props.theme.shadows?.primary || '0 0 20px rgba(0, 255, 255, 0.3)'};
  
  @media (max-width: 768px) {
    width: 45px;
    height: 45px;
    font-size: 1rem;
  }
`;

const ClientInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const ClientName = styled.div`
  font-weight: 600;
  color: ${props => props.theme.text?.primary || '#ffffff'};
  font-size: 1rem;
  
  @media (max-width: 768px) {
    font-size: 0.95rem;
  }
`;

const ClientDetails = styled.div`
  font-size: 0.85rem;
  color: ${props => props.theme.text?.secondary || '#E8F0FF'};
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
  }
`;

const ClientStatus = styled.div<{ status: string }>`
  padding: 0.35rem 0.85rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${({ status }) => {
    switch (status) {
      case 'active': return 'linear-gradient(135deg, #10b981, #34d399)';
      case 'inactive': return 'linear-gradient(135deg, #ef4444, #f87171)';
      case 'pending': return 'linear-gradient(135deg, #f59e0b, #fbbf24)';
      default: return 'linear-gradient(135deg, #6b7280, #9ca3af)';
    }
  }};
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
  
  @media (max-width: 768px) {
    padding: 0.25rem 0.65rem;
    font-size: 0.7rem;
  }
`;

// === MOCK DATA ===
const mockClients = [
  { id: 1, name: 'Sarah Johnson', email: 'sarah.j@email.com', status: 'active', lastSession: '2 days ago', totalSessions: 24 },
  { id: 2, name: 'Mike Chen', email: 'mike.chen@email.com', status: 'active', lastSession: '1 day ago', totalSessions: 18 },
  { id: 3, name: 'Emma Williams', email: 'emma.w@email.com', status: 'inactive', lastSession: '1 week ago', totalSessions: 35 },
  { id: 4, name: 'John Davis', email: 'john.d@email.com', status: 'pending', lastSession: 'Never', totalSessions: 0 },
];

// === SECTION COMPONENTS ===

// Training Overview Section
export const TrainingOverview: React.FC = () => {
  const { theme } = useUniversalTheme();
  
  return (
    <StellarSection
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <StellarSectionHeader>
        <StellarSectionTitle>
          <BarChart3 size={28} />
          Training Command Center
        </StellarSectionTitle>
      </StellarSectionHeader>
      
      <StatsGrid>
        <StatCard glowColor="#00FFFF" whileHover={{ scale: 1.02 }}>
          <StatIcon color="#00FFFF">
            <Users size={24} />
          </StatIcon>
          <StatContent>
            <StatValue>24</StatValue>
            <StatLabel>Active Clients</StatLabel>
          </StatContent>
        </StatCard>
        
        <StatCard glowColor="#FFD700" whileHover={{ scale: 1.02 }}>
          <StatIcon color="#FFD700">
            <Calendar size={24} />
          </StatIcon>
          <StatContent>
            <StatValue>8</StatValue>
            <StatLabel>Today's Sessions</StatLabel>
          </StatContent>
        </StatCard>
        
        <StatCard glowColor="#7851A9" whileHover={{ scale: 1.02 }}>
          <StatIcon color="#7851A9">
            <TrendingUp size={24} />
          </StatIcon>
          <StatContent>
            <StatValue>92%</StatValue>
            <StatLabel>Client Retention</StatLabel>
          </StatContent>
        </StatCard>
        
        <StatCard glowColor="#10b981" whileHover={{ scale: 1.02 }}>
          <StatIcon color="#10b981">
            <Target size={24} />
          </StatIcon>
          <StatContent>
            <StatValue>156</StatValue>
            <StatLabel>Goals Achieved</StatLabel>
          </StatContent>
        </StatCard>
      </StatsGrid>
    </StellarSection>
  );
};

// Client Management Section
export const ClientManagement: React.FC = () => {
  const { theme } = useUniversalTheme();
  const [searchTerm, setSearchTerm] = useState('');
  
  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };
  
  const filteredClients = mockClients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <StellarSection
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
    >
      <StellarSectionHeader>
        <StellarSectionTitle>
          <Users size={28} />
          Client Universe
        </StellarSectionTitle>
        <GlowButton
          text="Add Client"
          theme="primary"
          size="medium"
          leftIcon={<Plus size={18} />}
        />
      </StellarSectionHeader>
      
      <div style={{ marginBottom: '1.5rem', position: 'relative', zIndex: 2 }}>
        <div style={{ 
          position: 'relative',
          background: theme.background?.surface || 'rgba(30, 30, 60, 0.6)',
          border: `1px solid ${theme.borders?.elegant || 'rgba(0, 255, 255, 0.2)'}`,
          borderRadius: '12px',
          padding: '0.75rem 1rem 0.75rem 3rem',
          transition: 'all 0.3s ease'
        }}>
          <Search 
            size={18} 
            style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: theme.text?.muted || 'rgba(255, 255, 255, 0.7)'
            }}
          />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: theme.text?.primary || '#ffffff',
              fontSize: '1rem'
            }}
          />
        </div>
      </div>
      
      <ContentGrid style={{ gridTemplateColumns: '1fr' }}>
        <div>
          {filteredClients.map(client => (
            <ClientCard
              key={client.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <ClientAvatar>
                {getInitials(client.name)}
              </ClientAvatar>
              <ClientInfo>
                <ClientName>{client.name}</ClientName>
                <ClientDetails>{client.email}</ClientDetails>
                <ClientDetails>Last session: {client.lastSession} • {client.totalSessions} total sessions</ClientDetails>
              </ClientInfo>
              <ClientStatus status={client.status}>
                {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
              </ClientStatus>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.text?.secondary || '#E8F0FF',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  transition: 'all 0.3s ease'
                }}
              >
                <MoreVertical size={16} />
              </button>
            </ClientCard>
          ))}
        </div>
      </ContentGrid>
    </StellarSection>
  );
};

// Content Studio Section
export const ContentStudio: React.FC = () => {
  const { theme } = useUniversalTheme();
  
  return (
    <StellarSection
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <StellarSectionHeader>
        <StellarSectionTitle>
          <Video size={28} />
          Content Galaxy
        </StellarSectionTitle>
        <GlowButton
          text="Upload Video"
          theme="cosmic"
          size="medium"
          leftIcon={<Upload size={18} />}
        />
      </StellarSectionHeader>
      
      <StatsGrid>
        <StatCard glowColor="#ff416c" whileHover={{ scale: 1.02 }}>
          <StatIcon color="#ff416c">
            <Clock size={24} />
          </StatIcon>
          <StatContent>
            <StatValue>5</StatValue>
            <StatLabel>Pending Form Checks</StatLabel>
          </StatContent>
        </StatCard>
        
        <StatCard glowColor="#7851A9" whileHover={{ scale: 1.02 }}>
          <StatIcon color="#7851A9">
            <Upload size={24} />
          </StatIcon>
          <StatContent>
            <StatValue>23</StatValue>
            <StatLabel>Training Videos</StatLabel>
          </StatContent>
        </StatCard>
        
        <StatCard glowColor="#00FFFF" whileHover={{ scale: 1.02 }}>
          <StatIcon color="#00FFFF">
            <Camera size={24} />
          </StatIcon>
          <StatContent>
            <StatValue>12</StatValue>
            <StatLabel>Form Analysis Done</StatLabel>
          </StatContent>
        </StatCard>
      </StatsGrid>
      
      <div style={{ 
        background: `${theme.colors?.accent || '#FFD700'}15`,
        border: `1px solid ${theme.colors?.accent || '#FFD700'}30`,
        borderRadius: '12px',
        padding: '1.5rem',
        position: 'relative',
        zIndex: 2
      }}>
        <h4 style={{ 
          color: theme.colors?.accent || '#FFD700',
          margin: '0 0 1rem 0',
          fontSize: '1.1rem',
          fontWeight: 600
        }}>
          ✨ AI-Powered Form Analysis
        </h4>
        <p style={{
          color: theme.text?.secondary || '#E8F0FF',
          margin: 0,
          lineHeight: 1.6
        }}>
          Advanced YOLO-based pose detection helps you provide better feedback to your clients. 
          Upload client videos and get instant form analysis with detailed movement breakdowns.
        </p>
      </div>
    </StellarSection>
  );
};

// Default export for backwards compatibility
export const TrainerOverviewGalaxy = TrainingOverview;