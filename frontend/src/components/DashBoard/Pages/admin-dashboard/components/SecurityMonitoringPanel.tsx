/**
 * Security Monitoring Dashboard Component
 * MUI-FREE VERSION - Galaxy-Swan Theme
 * Real-time security monitoring, threat detection, and incident management
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import DemoDataBanner from './DemoDataBanner';
import { useAuth } from '../../../../../context/AuthContext';

// ============================================
// TYPES & INTERFACES
// ============================================

interface SecurityMetrics {
  activeThreats: number;
  blockedAttempts: number;
  suspiciousActivities: number;
  securityScore: number;
}

interface SecurityEvent {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  description: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================
// STYLED COMPONENTS
// ============================================

const Container = styled.div`
  padding: 24px;
  background: linear-gradient(135deg, #0a0e1a, #1e1e3f);
  min-height: 100vh;
  color: #FFFFFF;
`;

const Header = styled.div`
  margin-bottom: 32px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: #FFFFFF;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, #00CED1, #9D4EDD);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: #B8B8B8;
  margin: 0;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
`;

const MetricCard = styled.div<{ $variant?: 'primary' | 'success' | 'warning' | 'danger' }>`
  background: ${props => {
    switch (props.$variant) {
      case 'success': return 'rgba(46, 213, 115, 0.1)';
      case 'warning': return 'rgba(255, 159, 67, 0.1)';
      case 'danger': return 'rgba(255, 71, 87, 0.1)';
      default: return 'rgba(0, 206, 209, 0.1)';
    }
  }};
  border: 1px solid ${props => {
    switch (props.$variant) {
      case 'success': return 'rgba(46, 213, 115, 0.3)';
      case 'warning': return 'rgba(255, 159, 67, 0.3)';
      case 'danger': return 'rgba(255, 71, 87, 0.3)';
      default: return 'rgba(0, 206, 209, 0.3)';
    }
  }};
  border-radius: 16px;
  padding: 24px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 32px ${props => {
      switch (props.$variant) {
        case 'success': return 'rgba(46, 213, 115, 0.2)';
        case 'warning': return 'rgba(255, 159, 67, 0.2)';
        case 'danger': return 'rgba(255, 71, 87, 0.2)';
        default: return 'rgba(0, 206, 209, 0.2)';
      }
    }};
  }
`;

const MetricLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #B8B8B8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
`;

const MetricValue = styled.div`
  font-size: 36px;
  font-weight: 700;
  color: #FFFFFF;
  margin-bottom: 4px;
`;

const MetricChange = styled.div<{ $positive?: boolean }>`
  font-size: 12px;
  color: ${props => props.$positive ? '#2ED573' : '#FF4757'};
  font-weight: 600;
`;

const Section = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(0, 206, 209, 0.2);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  backdrop-filter: blur(10px);
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const SectionTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: #FFFFFF;
  margin: 0;
`;

const TabContainer = styled.div`
  display: flex;
  gap: 8px;
  border-bottom: 1px solid rgba(0, 206, 209, 0.2);
  margin-bottom: 20px;
`;

const Tab = styled.button<{ $active?: boolean }>`
  background: ${props => props.$active ? 'rgba(0, 206, 209, 0.2)' : 'transparent'};
  border: none;
  border-bottom: 2px solid ${props => props.$active ? '#00CED1' : 'transparent'};
  color: ${props => props.$active ? '#00CED1' : '#B8B8B8'};
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    color: #00CED1;
    background: rgba(0, 206, 209, 0.1);
  }
`;

const EventsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const EventCard = styled.div<{ $severity?: 'low' | 'medium' | 'high' | 'critical' }>`
  background: rgba(255, 255, 255, 0.03);
  border-left: 4px solid ${props => {
    switch (props.$severity) {
      case 'critical': return '#FF4757';
      case 'high': return '#FF9F43';
      case 'medium': return '#FFA502';
      case 'low': return '#2ED573';
      default: return '#00CED1';
    }
  }};
  border-radius: 8px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    transform: translateX(4px);
  }
`;

const EventContent = styled.div`
  flex: 1;
`;

const EventTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #FFFFFF;
  margin-bottom: 4px;
`;

const EventDescription = styled.div`
  font-size: 13px;
  color: #B8B8B8;
  margin-bottom: 8px;
`;

const EventTimestamp = styled.div`
  font-size: 11px;
  color: #808080;
`;

const Badge = styled.span<{ $variant?: 'success' | 'warning' | 'danger' | 'info' }>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  background: ${props => {
    switch (props.$variant) {
      case 'success': return 'rgba(46, 213, 115, 0.2)';
      case 'warning': return 'rgba(255, 159, 67, 0.2)';
      case 'danger': return 'rgba(255, 71, 87, 0.2)';
      default: return 'rgba(0, 206, 209, 0.2)';
    }
  }};
  color: ${props => {
    switch (props.$variant) {
      case 'success': return '#2ED573';
      case 'warning': return '#FF9F43';
      case 'danger': return '#FF4757';
      default: return '#00CED1';
    }
  }};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #B8B8B8;
`;

const EmptyStateIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
`;

const EmptyStateText = styled.div`
  font-size: 16px;
  font-weight: 500;
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 206, 209, 0.2);
  border-left-color: #00CED1;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px 20px;
`;

// ============================================
// MAIN COMPONENT
// ============================================

const SecurityMonitoringPanel: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'threats'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    activeThreats: 0,
    blockedAttempts: 0,
    suspiciousActivities: 0,
    securityScore: 98
  });
  const [events, setEvents] = useState<SecurityEvent[]>([]);

  useEffect(() => {
    // Simulate loading security data
    const loadSecurityData = async () => {
      setIsLoading(true);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock data
      setMetrics({
        activeThreats: 2,
        blockedAttempts: 147,
        suspiciousActivities: 8,
        securityScore: 98
      });

      setEvents([
        {
          id: '1',
          type: 'warning',
          title: 'Multiple Failed Login Attempts',
          description: 'IP 192.168.1.45 attempted 5 failed logins',
          timestamp: '2 minutes ago',
          severity: 'medium'
        },
        {
          id: '2',
          type: 'success',
          title: 'Threat Blocked Successfully',
          description: 'SQL injection attempt blocked from IP 10.0.0.23',
          timestamp: '15 minutes ago',
          severity: 'high'
        },
        {
          id: '3',
          type: 'info',
          title: 'Security Scan Completed',
          description: 'Automated security scan completed with no issues',
          timestamp: '1 hour ago',
          severity: 'low'
        }
      ]);

      setIsLoading(false);
    };

    loadSecurityData();
  }, []);

  if (isLoading) {
    return (
      <Container>
        <LoadingContainer>
          <LoadingSpinner />
        </LoadingContainer>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Security Monitoring</Title>
        <Subtitle>Real-time security monitoring and threat detection</Subtitle>
      </Header>

      <DemoDataBanner noApi />

      {/* Metrics Overview */}
      <MetricsGrid>
        <MetricCard $variant="danger">
          <MetricLabel>Active Threats</MetricLabel>
          <MetricValue>{metrics.activeThreats}</MetricValue>
          <MetricChange $positive={false}>+2 from last hour</MetricChange>
        </MetricCard>

        <MetricCard $variant="success">
          <MetricLabel>Blocked Attempts</MetricLabel>
          <MetricValue>{metrics.blockedAttempts}</MetricValue>
          <MetricChange $positive={true}>+12 from last hour</MetricChange>
        </MetricCard>

        <MetricCard $variant="warning">
          <MetricLabel>Suspicious Activities</MetricLabel>
          <MetricValue>{metrics.suspiciousActivities}</MetricValue>
          <MetricChange $positive={false}>+3 from last hour</MetricChange>
        </MetricCard>

        <MetricCard $variant="primary">
          <MetricLabel>Security Score</MetricLabel>
          <MetricValue>{metrics.securityScore}%</MetricValue>
          <MetricChange $positive={true}>Excellent</MetricChange>
        </MetricCard>
      </MetricsGrid>

      {/* Security Events */}
      <Section>
        <SectionHeader>
          <SectionTitle>Security Events</SectionTitle>
        </SectionHeader>

        <TabContainer>
          <Tab
            $active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </Tab>
          <Tab
            $active={activeTab === 'events'}
            onClick={() => setActiveTab('events')}
          >
            Recent Events
          </Tab>
          <Tab
            $active={activeTab === 'threats'}
            onClick={() => setActiveTab('threats')}
          >
            Active Threats
          </Tab>
        </TabContainer>

        {activeTab === 'overview' && (
          <EventsList>
            {events.length > 0 ? (
              events.map(event => (
                <EventCard key={event.id} $severity={event.severity}>
                  <EventContent>
                    <EventTitle>{event.title}</EventTitle>
                    <EventDescription>{event.description}</EventDescription>
                    <EventTimestamp>{event.timestamp}</EventTimestamp>
                  </EventContent>
                  <Badge $variant={
                    event.severity === 'critical' ? 'danger' :
                    event.severity === 'high' ? 'warning' :
                    event.severity === 'medium' ? 'warning' :
                    'success'
                  }>
                    {event.severity}
                  </Badge>
                </EventCard>
              ))
            ) : (
              <EmptyState>
                <EmptyStateIcon>🛡️</EmptyStateIcon>
                <EmptyStateText>No security events to display</EmptyStateText>
              </EmptyState>
            )}
          </EventsList>
        )}

        {activeTab === 'events' && (
          <EmptyState>
            <EmptyStateIcon>📊</EmptyStateIcon>
            <EmptyStateText>Event history coming soon</EmptyStateText>
          </EmptyState>
        )}

        {activeTab === 'threats' && (
          <EmptyState>
            <EmptyStateIcon>⚠️</EmptyStateIcon>
            <EmptyStateText>
              {metrics.activeThreats > 0
                ? `${metrics.activeThreats} active threats detected`
                : 'No active threats detected'}
            </EmptyStateText>
          </EmptyState>
        )}
      </Section>
    </Container>
  );
};

export default SecurityMonitoringPanel;
