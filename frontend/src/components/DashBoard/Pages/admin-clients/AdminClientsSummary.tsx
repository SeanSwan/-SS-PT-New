/**
 * Admin Clients Summary View
 * Provides an index/entry point for admin client management
 */

import React from 'react';
import styled from 'styled-components';
import {
  Users,
  UserPlus,
  BarChart3,
  Settings,
  Activity,
  CheckCircle2,
  TrendingUp,
  UserCog,
  LayoutDashboard,
  ClipboardList,
  type LucideIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/* ─── Styled Components ─── */

const PageWrapper = styled.div`
  padding: 24px;
  background-color: rgba(15, 23, 42, 0.95);
  min-height: 100vh;
  color: #e2e8f0;
`;

const HeaderSection = styled.div`
  margin-bottom: 32px;
  text-align: center;
`;

const PageTitle = styled.h3`
  color: #00ffff;
  margin-bottom: 16px;
  font-weight: 700;
  font-size: 2rem;
`;

const PageSubtitle = styled.h6`
  color: #94a3b8;
  margin-bottom: 32px;
  font-weight: 400;
  font-size: 1.15rem;
`;

const GlassCard = styled.div`
  background-color: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  border: 1px solid rgba(14, 165, 233, 0.2);
  color: #e2e8f0;
  transition: all 0.3s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 255, 255, 0.1);
  }
`;

const CardBody = styled.div`
  padding: 24px;
`;

const HeroButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(135deg, #00ffff, #00c8ff);
  color: #0a0a1a;
  padding: 12px 32px;
  border-radius: 12px;
  border: none;
  font-weight: 600;
  font-size: 1.1rem;
  cursor: pointer;
  min-height: 44px;
  min-width: 44px;
  transition: all 0.3s ease;

  &:hover {
    background: linear-gradient(135deg, #00e6ff, #00b3ff);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 255, 255, 0.4);
  }
`;

const OutlineButton = styled.button<{ $hoverBg?: string; $hoverBorder?: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 16px;
  color: #e2e8f0;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  min-height: 44px;
  min-width: 44px;
  transition: all 0.3s ease;

  &:hover {
    background-color: ${({ $hoverBg }) => $hoverBg || 'rgba(0, 255, 255, 0.1)'};
    border-color: ${({ $hoverBorder }) => $hoverBorder || '#00ffff'};
  }
`;

const SmallOutlineButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  color: #00ffff;
  background: transparent;
  border: 1px solid #00ffff;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  min-height: 44px;
  min-width: 44px;
  transition: all 0.3s ease;

  &:hover {
    background-color: rgba(0, 255, 255, 0.1);
    border-color: #00ffff;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  margin-bottom: 32px;

  @media (min-width: 375px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const TwoColumnGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const FullWidthSection = styled.div`
  margin-top: 32px;
`;

const QuickActionsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 375px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const StatCardContent = styled.div`
  text-align: center;
`;

const IconCircle = styled.div<{ $bgColor: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border-radius: 50%;
  background-color: ${({ $bgColor }) => `${$bgColor}20`};
  margin-bottom: 16px;
`;

const StatValue = styled.h4<{ $color: string }>`
  color: ${({ $color }) => $color};
  font-weight: 700;
  font-size: 1.8rem;
  margin: 0 0 4px 0;
`;

const StatLabel = styled.p`
  color: #94a3b8;
  font-size: 1rem;
  margin: 0;
`;

const SectionTitle = styled.h5`
  color: #00ffff;
  margin-bottom: 24px;
  font-weight: 600;
  font-size: 1.3rem;
`;

const FeatureListWrapper = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const FeatureListItem = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  color: #e2e8f0;
  font-size: 0.95rem;
`;

const FeatureIconSlot = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  color: #00ffff;
`;

const StyledDivider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin: 0;
`;

const StatusSurface = styled.div`
  padding: 16px;
  background-color: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 8px;
  backdrop-filter: blur(12px);
  margin-bottom: 24px;
`;

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StatusTitle = styled.h6`
  color: #4caf50;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
`;

const StatusDescription = styled.p`
  color: #94a3b8;
  font-size: 0.875rem;
  margin: 8px 0 0 0;
`;

const StatusCheckRow = styled.p`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px 0;
  color: #e2e8f0;
  font-size: 1rem;
`;

const StatusChecksWrapper = styled.div`
  margin-bottom: 16px;
`;

/* ─── Component ─── */

const AdminClientsSummary: React.FC = () => {
  const navigate = useNavigate();

  const handleNavigateToClients = () => {
    navigate('/dashboard/clients');
  };

  const features: { Icon: LucideIcon; text: string }[] = [
    { Icon: Users, text: 'Comprehensive client database with search & filtering' },
    { Icon: UserPlus, text: 'Add new clients with detailed onboarding' },
    { Icon: ClipboardList, text: 'Manage client sessions and training packages' },
    { Icon: BarChart3, text: 'Real-time MCP server statistics' },
    { Icon: UserCog, text: 'Reset passwords and assign trainers' },
    { Icon: Activity, text: 'Track client progress and achievements' },
  ];

  const quickStats: { value: string; label: string; Icon: LucideIcon; color: string }[] = [
    {
      value: '500+',
      label: 'Total Clients',
      Icon: Users,
      color: '#00ffff'
    },
    {
      value: '24',
      label: 'New This Month',
      Icon: UserPlus,
      color: '#10b981'
    },
    {
      value: '98%',
      label: 'Retention Rate',
      Icon: TrendingUp,
      color: '#7851a9'
    },
    {
      value: '4.8/5',
      label: 'Average Rating',
      Icon: CheckCircle2,
      color: '#f59e0b'
    },
  ];

  return (
    <PageWrapper>
      {/* Header */}
      <HeaderSection>
        <PageTitle>Client Management System</PageTitle>
        <PageSubtitle>
          Comprehensive tools for managing your SwanStudios clients
        </PageSubtitle>

        <HeroButton onClick={handleNavigateToClients}>
          <LayoutDashboard size={20} />
          Open Client Management
        </HeroButton>
      </HeaderSection>

      {/* Quick Stats */}
      <StatsGrid>
        {quickStats.map((stat, index) => (
          <GlassCard key={index}>
            <CardBody>
              <StatCardContent>
                <IconCircle $bgColor={stat.color}>
                  <stat.Icon size={32} color={stat.color} />
                </IconCircle>
                <StatValue $color={stat.color}>
                  {stat.value}
                </StatValue>
                <StatLabel>
                  {stat.label}
                </StatLabel>
              </StatCardContent>
            </CardBody>
          </GlassCard>
        ))}
      </StatsGrid>

      <TwoColumnGrid>
        {/* Features Overview */}
        <GlassCard>
          <CardBody>
            <SectionTitle>Key Features</SectionTitle>
            <FeatureListWrapper>
              {features.map((feature, index) => (
                <React.Fragment key={index}>
                  <FeatureListItem>
                    <FeatureIconSlot>
                      <feature.Icon size={20} />
                    </FeatureIconSlot>
                    <span>{feature.text}</span>
                  </FeatureListItem>
                  {index < features.length - 1 && <StyledDivider />}
                </React.Fragment>
              ))}
            </FeatureListWrapper>
          </CardBody>
        </GlassCard>

        {/* System Status */}
        <GlassCard>
          <CardBody>
            <SectionTitle>System Status</SectionTitle>

            <StatusSurface>
              <StatusRow>
                <CheckCircle2 size={24} color="#4caf50" />
                <StatusTitle>All Systems Operational</StatusTitle>
              </StatusRow>
              <StatusDescription>
                Client management services are running smoothly
              </StatusDescription>
            </StatusSurface>

            <StatusChecksWrapper>
              <StatusCheckRow>
                <CheckCircle2 size={20} color="#4caf50" />
                Backend API: Healthy
              </StatusCheckRow>
              <StatusCheckRow>
                <CheckCircle2 size={20} color="#4caf50" />
                Database: Connected
              </StatusCheckRow>
              <StatusCheckRow>
                <CheckCircle2 size={20} color="#4caf50" />
                MCP Services: 6/6 Online
              </StatusCheckRow>
            </StatusChecksWrapper>

            <SmallOutlineButton onClick={handleNavigateToClients}>
              View Detailed Status
            </SmallOutlineButton>
          </CardBody>
        </GlassCard>
      </TwoColumnGrid>

      {/* Quick Actions */}
      <FullWidthSection>
        <GlassCard>
          <CardBody>
            <SectionTitle>Quick Actions</SectionTitle>

            <QuickActionsGrid>
              <OutlineButton
                onClick={handleNavigateToClients}
                $hoverBg="rgba(0, 255, 255, 0.1)"
                $hoverBorder="#00ffff"
              >
                <UserPlus size={20} />
                Add New Client
              </OutlineButton>

              <OutlineButton
                onClick={() => navigate('/dashboard/client-progress')}
                $hoverBg="rgba(120, 81, 169, 0.1)"
                $hoverBorder="#7851a9"
              >
                <BarChart3 size={20} />
                View Progress Reports
              </OutlineButton>

              <OutlineButton
                onClick={() => navigate('/dashboard/admin-sessions')}
                $hoverBg="rgba(16, 185, 129, 0.1)"
                $hoverBorder="#10b981"
              >
                <UserPlus size={20} />
                Manage Sessions
              </OutlineButton>

              <OutlineButton
                onClick={handleNavigateToClients}
                $hoverBg="rgba(245, 158, 11, 0.1)"
                $hoverBorder="#f59e0b"
              >
                <Settings size={20} />
                System Settings
              </OutlineButton>
            </QuickActionsGrid>
          </CardBody>
        </GlassCard>
      </FullWidthSection>
    </PageWrapper>
  );
};

export default AdminClientsSummary;
