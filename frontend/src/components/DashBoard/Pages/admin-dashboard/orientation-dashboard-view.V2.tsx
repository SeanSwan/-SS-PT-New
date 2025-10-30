/**
 * Orientation Dashboard View V2
 * ==============================
 * Clean rewrite using ui-kit components (MUI-free)
 * 
 * Strangler Fig Pattern - V2 Version
 * This file replaces orientation-dashboard-view.tsx
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { Users, FileText, ClipboardCheck } from 'lucide-react';

// Import UI Kit components
import { PageTitle, SectionTitle, BodyText } from '../../../ui-kit/Typography';
import { PrimaryButton, OutlinedButton } from '../../../ui-kit/Button';
import { Card, CardHeader, CardBody, GridContainer, FlexBox } from '../../../ui-kit/Card';

// Import existing orientation components (these should already be MUI-free)
import OrientationList from './components/OrientationList';
import NotificationTester from './components/NotificationTester';

// Styled components
const PageContainer = styled.div`
  padding: 2rem;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  min-height: 100vh;
`;

const StatsCard = styled(Card)<{ color: string }>`
  background: linear-gradient(135deg, ${props => props.color}15, ${props => props.color}05);
  border-color: ${props => props.color}40;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px ${props => props.color}30;
    border-color: ${props => props.color}60;
  }
  
  &:focus-within {
    outline: 2px solid ${props => props.color};
    outline-offset: 2px;
  }
`;

const StatIconContainer = styled.div<{ color: string }>`
  width: 64px;
  height: 64px;
  border-radius: 12px;
  background: ${props => props.color}20;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  
  svg {
    color: ${props => props.color};
  }
`;

const StatValue = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  color: #ffffff;
  line-height: 1;
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
`;

// Custom Tab System
const TabContainer = styled.div`
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 2rem;
`;

const TabList = styled.div`
  display: flex;
  gap: 0;
`;

const TabButton = styled.button<{ isActive: boolean }>`
  padding: 1rem 1.5rem;
  background: transparent;
  border: none;
  border-bottom: 3px solid ${props => props.isActive ? '#3b82f6' : 'transparent'};
  color: ${props => props.isActive ? '#ffffff' : '#94a3b8'};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  top: 2px;
  
  &:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.05);
  }
  
  &:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }
  
  svg {
    flex-shrink: 0;
  }
`;

const TabPanel = styled.div<{ isActive: boolean }>`
  display: ${props => props.isActive ? 'block' : 'none'};
`;

/**
 * Orientation Dashboard View Component V2
 * 
 * Features:
 * - Overview stats cards
 * - Orientation list management
 * - Notification testing
 * - Fully accessible tab system
 * - MUI-free implementation
 */
const OrientationDashboardView: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  
  // Mock stats - replace with actual data from API
  const stats = [
    {
      id: 'pending',
      label: 'Pending Orientations',
      value: 5,
      color: '#f59e0b',
      icon: ClipboardCheck
    },
    {
      id: 'completed',
      label: 'Completed This Month',
      value: 12,
      color: '#10b981',
      icon: Users
    },
    {
      id: 'scheduled',
      label: 'Scheduled',
      value: 8,
      color: '#3b82f6',
      icon: FileText
    }
  ];
  
  const tabs = [
    { id: 0, label: 'Orientation Management', icon: ClipboardCheck },
    { id: 1, label: 'Notification Testing', icon: FileText }
  ];
  
  return (
    <PageContainer>
      {/* Header */}
      <FlexBox justify="space-between" align="center" margin="0 0 2rem 0">
        <div>
          <PageTitle>Orientation Dashboard</PageTitle>
          <BodyText secondary style={{ marginTop: '0.5rem' }}>
            Manage client orientations and onboarding processes
          </BodyText>
        </div>
        <PrimaryButton>
          <Users size={18} />
          New Orientation
        </PrimaryButton>
      </FlexBox>
      
      {/* Stats Cards */}
      <GridContainer columns={3} gap="1.5rem" style={{ marginBottom: '2rem' }}>
        {stats.map((stat) => (
          <StatsCard
            key={stat.id}
            color={stat.color}
            role="button"
            tabIndex={0}
            aria-label={`${stat.label}: ${stat.value}`}
          >
            <CardBody>
              <StatIconContainer color={stat.color}>
                <stat.icon size={32} />
              </StatIconContainer>
              <StatValue>{stat.value}</StatValue>
              <StatLabel>{stat.label}</StatLabel>
            </CardBody>
          </StatsCard>
        ))}
      </GridContainer>
      
      {/* Tabs */}
      <TabContainer>
        <TabList role="tablist" aria-label="Orientation dashboard tabs">
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
            >
              <tab.icon size={18} />
              {tab.label}
            </TabButton>
          ))}
        </TabList>
      </TabContainer>
      
      {/* Tab Panels */}
      <TabPanel
        isActive={activeTab === 0}
        role="tabpanel"
        id="tabpanel-0"
        aria-labelledby="tab-0"
      >
        <Card>
          <CardHeader>
            <SectionTitle>Orientation List</SectionTitle>
          </CardHeader>
          <CardBody>
            <OrientationList />
          </CardBody>
        </Card>
      </TabPanel>
      
      <TabPanel
        isActive={activeTab === 1}
        role="tabpanel"
        id="tabpanel-1"
        aria-labelledby="tab-1"
      >
        <Card>
          <CardHeader>
            <SectionTitle>Notification Tester</SectionTitle>
          </CardHeader>
          <CardBody>
            <NotificationTester />
          </CardBody>
        </Card>
      </TabPanel>
    </PageContainer>
  );
};

export default OrientationDashboardView;
