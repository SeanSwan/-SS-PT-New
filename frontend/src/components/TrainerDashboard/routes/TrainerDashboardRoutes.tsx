import React, { Suspense, lazy } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { CircularProgress } from '../../ui/primitives/components';

// Import trainer dashboard components
import ClientProgressView from '../ClientProgress/ClientProgressView';
import TrainerDashboard from '../TrainerDashboard';
import TrainerWorkoutManagement from '../WorkoutManagement/TrainerWorkoutManagement';
import ContentFormCheck from '../ContentFormCheck';
import TrainerScheduleTab from '../../DashBoard/Pages/trainer-dashboard/schedule';

const MessagingPage = lazy(() => import('../../../pages/MessagingPage'));

const PageContainer = styled.div`
  padding: 24px;
`;

const SectionCard = styled.div`
  padding: 24px;
  background: rgba(0, 255, 255, 0.05);
  border-radius: 8px;
  margin-top: 24px;
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
  margin: 0 0 16px;
  line-height: 1.5;
`;

const SectionTitle = styled.h6`
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
  margin: 0 0 8px;
`;

const SectionText = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  line-height: 1.6;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
  gap: 16px;
`;

const LoadingText = styled.span`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.7);
`;

/**
 * Trainer Dashboard Home Component
 */
const TrainerDashboardHome = () => <TrainerDashboard />;

/**
 * My Clients View Component
 */
const MyClientsView = () => (
  <PageContainer>
    <PageTitle>My Clients</PageTitle>
    <PageDescription>
      View and manage your assigned clients.
    </PageDescription>

    <SectionCard>
      <SectionTitle>Client Dashboard</SectionTitle>
      <SectionText>
        Access detailed profiles of your assigned clients. View their progress,
        workout history, and current training programs. Add notes and track their
        fitness journey. All client data is securely synchronized with the MCP server.
      </SectionText>
    </SectionCard>
  </PageContainer>
);

const ScheduleView = () => <TrainerScheduleTab />;
const WorkoutPlansView = () => <TrainerWorkoutManagement />;

const TrainingSessionsView = () => (
  <PageContainer>
    <PageTitle>Training Sessions</PageTitle>
    <PageDescription>
      Schedule and manage your training sessions with clients.
    </PageDescription>

    <SectionCard>
      <SectionTitle>Session Calendar</SectionTitle>
      <SectionText>
        View your training schedule in calendar format. Book new sessions with clients,
        reschedule existing appointments, and track session completion.
        Sessions are synchronized with the MCP server for client visibility.
      </SectionText>
    </SectionCard>
  </PageContainer>
);

const MessagesView = () => <MessagingPage />;

const ContentFormChecksView = () => <ContentFormCheck />;

const LoadingFallback = () => (
  <LoadingContainer>
    <CircularProgress />
    <LoadingText>Loading...</LoadingText>
  </LoadingContainer>
);

/**
 * TrainerDashboardRoutes Component
 *
 * Provides routing configuration for the trainer dashboard
 */
const TrainerDashboardRoutes: React.FC = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<TrainerDashboardHome />} />
        <Route path="/dashboard" element={<TrainerDashboardHome />} />
        <Route path="/schedule" element={<ScheduleView />} />
        <Route path="/clients" element={<MyClientsView />} />
        <Route path="/workouts" element={<WorkoutPlansView />} />
        <Route path="/sessions" element={<TrainingSessionsView />} />
        <Route path="/client-progress" element={<ClientProgressView />} />
        <Route path="/messages" element={<MessagesView />} />
        <Route path="/content" element={<ContentFormChecksView />} />
        <Route path="*" element={<Navigate to="/trainer-dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};

export default TrainerDashboardRoutes;
