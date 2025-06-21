/**
 * SecuritySections.tsx - APEX AI SECURITY PLATFORM
 * =================================================
 * 
 * Security-focused section components for the Apex AI Security Operations Dashboard
 * Each section implements security operations with real-time monitoring capabilities
 * 
 * Based on Master Prompt v29.1-APEX: AI-Augmented Security Operations
 */

import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';

const pulse = keyframes`
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
`;

import { 
  Shield, Activity, TrendingUp, AlertTriangle, Calendar, 
  MessageCircle, User, Settings, Target, Zap,
  Award, ShieldCheck, Radio, Users, Play, Monitor,
  BarChart3, FileText, CreditCard, Package,
  Video, Camera, Eye, MapPin, Clock, Phone,
  AlertCircle, CheckCircle, UserCheck, Building,
  Headphones, Navigation, Wifi, Battery
} from 'lucide-react';

// === SHARED STYLED COMPONENTS ===
const SectionCard = styled(motion.div)`
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  
  &:hover {
    border-color: rgba(0, 255, 255, 0.4);
    box-shadow: 0 12px 35px rgba(0, 255, 255, 0.1);
  }
`;

const SectionTitle = styled.h2`
  color: #00ffff;
  font-size: 1.5rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &::before {
    content: '🛡️';
    font-size: 1.2rem;
    animation: pulse 2s infinite;
  }
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
`;

const StatCard = styled(motion.div)`
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 10px;
  padding: 1rem;
  text-align: center;
  
  .stat-value {
    font-size: 2rem;
    font-weight: bold;
    color: #00ffff;
    display: block;
  }
  
  .stat-label {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
    margin-top: 0.5rem;
  }
`;

const StatusIndicator = styled.div<{ status: 'active' | 'alert' | 'offline' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: bold;
  
  background: ${props => 
    props.status === 'active' ? 'rgba(0, 255, 136, 0.2)' :
    props.status === 'alert' ? 'rgba(255, 65, 108, 0.2)' :
    'rgba(136, 136, 136, 0.2)'};
  color: ${props => 
    props.status === 'active' ? '#00ff88' :
    props.status === 'alert' ? '#ff416c' :
    '#888'};
  border: 1px solid ${props => 
    props.status === 'active' ? '#00ff88' :
    props.status === 'alert' ? '#ff416c' :
    '#888'};
    
  &::before {
    content: '●';
    animation: ${pulse} 2s infinite;
  }
`;

// === SECURITY SECTION COMPONENTS ===

// Import the enhanced overview component (will be created separately)
import EnhancedSecurityOverview from './EnhancedSecurityOverview';

export const SecurityOverview: React.FC = () => (
  <EnhancedSecurityOverview />
);

// SECURITY OPERATIONS CENTER - Replaces WorkoutUniverse
export const SecurityOpsCenter: React.FC = () => {
  const [activeAlerts, setActiveAlerts] = useState(3);
  const [onDutyGuards, setOnDutyGuards] = useState(8);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <SectionCard>
        <SectionTitle>
          <Shield /> Active Security Operations
        </SectionTitle>
        
        {/* Current Priority Alert */}
        <div style={{
          background: 'linear