import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { User, FileText, Activity, Heart, Dumbbell, Apple } from 'lucide-react';

// Import existing page components
import MovementScreenManager from './MovementScreenManager';
import BaselineMeasurementsEntry from './BaselineMeasurementsEntry';

const ProfileContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const ClientName = styled.h1`
  font-size: 2rem;
  font-weight: 600;
  color: white;
`;

const TabBar = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  overflow-x: auto;

  @media (max-width: 768px) {
    gap: 0.25rem;
  }
`;

const Tab = styled(motion.button)<{ $active: boolean }>`
  padding: 1rem 1.5rem;
  background: ${props => props.$active ? 'rgba(59, 130, 246, 0.2)' : 'transparent'};
  color: ${props => props.$active ? 'rgba(59, 130, 246, 1)' : 'rgba(255, 255, 255, 0.7)'};
  border: none;
  border-bottom: 2px solid ${props => props.$active ? 'rgba(59, 130, 246, 1)' : 'transparent'};
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: ${props => props.$active ? '600' : '400'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: rgba(59, 130, 246, 0.1);
    color: rgba(59, 130, 246, 1);
  }

  @media (max-width: 768px) {
    padding: 0.75rem 1rem;
    font-size: 0.8rem;
  }
`;

const TabContent = styled(motion.div)`
  min-height: 400px;
`;

type TabType = 'overview' | 'onboarding' | 'movement' | 'vitals' | 'workouts' | 'nutrition';

const ClientProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'onboarding', label: 'Onboarding', icon: FileText },
    { id: 'movement', label: 'Movement Screen', icon: Activity },
    { id: 'vitals', label: 'Baseline Vitals', icon: Heart },
    { id: 'workouts', label: 'Workouts', icon: Dumbbell },
    { id: 'nutrition', label: 'Nutrition', icon: Apple },
  ];

  return (
    <ProfileContainer>
      <ProfileHeader>
        <User size={32} />
        <ClientName>Client Profile</ClientName>
      </ProfileHeader>

      <TabBar>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <Tab
              key={tab.id}
              $active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon size={18} />
              {tab.label}
            </Tab>
          );
        })}
      </TabBar>

      <TabContent
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'overview' && <div>Overview content (Phase 1.4)</div>}
        {activeTab === 'onboarding' && <div>Onboarding questionnaire view (Phase 1.4)</div>}
        {activeTab === 'movement' && <MovementScreenManager preSelectedUserId={userId} />}
        {activeTab === 'vitals' && <BaselineMeasurementsEntry preSelectedUserId={userId} />}
        {activeTab === 'workouts' && <div>Workouts content (Phase 2)</div>}
        {activeTab === 'nutrition' && <div>Nutrition content (Phase 2)</div>}
      </TabContent>
    </ProfileContainer>
  );
};

export default ClientProfile;