/**
 * FILE: ClientWorkoutPlanVaultPanel.tsx
 * PURPOSE: Reuse the client plan vault on the canonical My Workouts route.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../../../../context/AuthContext';
import ProtectedPlanPdfDialog from '../../shared/plan-pdf/ProtectedPlanPdfDialog';
import ClientTrainingPlanVaultCard from './observatory/ClientTrainingPlanVaultCard';
import { useClientPlanPdfViewer } from './observatory/useClientPlanPdfViewer';
import { useCurrentClientWorkout } from './observatory/useCurrentClientWorkout';

const VaultShell = styled.section`
  margin-bottom: 1.5rem;
`;

const VaultAlert = styled.div`
  margin-top: 0.75rem;
  padding: 0.85rem 1rem;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.18));
  border-radius: 10px;
  background: var(--bg-elevated, #141419);
  color: var(--text-secondary, #94a3b8);
  font-size: 0.9rem;
`;

const ClientWorkoutPlanVaultPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentWorkout = useCurrentClientWorkout(user?.id);
  const planPdfViewer = useClientPlanPdfViewer();

  return (
    <VaultShell aria-label="Workout plan vault">
      <ClientTrainingPlanVaultCard
        planVault={currentWorkout.planVault}
        loading={currentWorkout.loading}
        error={currentWorkout.error}
        canLogToday={currentWorkout.workout?.isLoggable === true}
        onNavigate={navigate}
        onViewPdf={planPdfViewer.openPlanPdf}
        showOpenButton={false}
      />
      {planPdfViewer.error && (
        <VaultAlert role="alert">{planPdfViewer.error}</VaultAlert>
      )}
      <ProtectedPlanPdfDialog
        viewer={planPdfViewer.viewer}
        onClose={planPdfViewer.closePlanPdf}
        onOpenExternal={planPdfViewer.openPlanPdfExternal}
      />
    </VaultShell>
  );
};

export default ClientWorkoutPlanVaultPanel;
