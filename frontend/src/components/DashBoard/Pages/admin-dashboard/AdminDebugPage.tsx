import React from 'react';
import styled from 'styled-components';
import { Link as RouterLink } from 'react-router-dom';
import { Bug, Home, ChevronRight } from 'lucide-react';

// Import our CrossDashboardDebugger
import CrossDashboardDebugger from '../../../DevTools/CrossDashboardDebugger';

const PageWrapper = styled.div`
  padding: 24px;
`;

const BreadcrumbNav = styled.nav`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 24px;
  font-size: 0.875rem;
`;

const BreadcrumbLink = styled(RouterLink)`
  display: flex;
  align-items: center;
  gap: 4px;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover {
    color: #00ffff;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const BreadcrumbSeparator = styled.span`
  color: rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;

  svg {
    width: 16px;
    height: 16px;
  }
`;

const BreadcrumbCurrent = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  color: white;

  svg {
    width: 16px;
    height: 16px;
  }
`;

const PageTitle = styled.h4`
  font-size: 2rem;
  font-weight: 600;
  color: white;
  margin: 0 0 8px;
`;

const PageDescription = styled.p`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 24px;
  line-height: 1.6;
`;

/**
 * AdminDebugPage
 *
 * A dedicated page for the admin dashboard that provides access to the
 * cross-dashboard debugging tools.
 */
const AdminDebugPage: React.FC = () => {
  return (
    <PageWrapper>
      {/* Breadcrumb Navigation */}
      <BreadcrumbNav aria-label="breadcrumb">
        <BreadcrumbLink to="/dashboard">
          <Home />
          Dashboard
        </BreadcrumbLink>
        <BreadcrumbSeparator><ChevronRight /></BreadcrumbSeparator>
        <BreadcrumbLink to="/dashboard/admin">
          Admin
        </BreadcrumbLink>
        <BreadcrumbSeparator><ChevronRight /></BreadcrumbSeparator>
        <BreadcrumbCurrent>
          <Bug />
          System Diagnostics
        </BreadcrumbCurrent>
      </BreadcrumbNav>

      {/* Page Title */}
      <PageTitle>System Diagnostics Dashboard</PageTitle>

      <PageDescription>
        This tool helps diagnose and fix issues with data sharing between client, admin, and trainer dashboards.
        Use it to ensure sessions, notifications, and gamification data are properly synchronized.
      </PageDescription>

      {/* Cross-Dashboard Debugger Component */}
      <CrossDashboardDebugger />
    </PageWrapper>
  );
};

export default AdminDebugPage;
