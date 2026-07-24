import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useGlobalClient } from '../../../context/GlobalClientContext';
import { getClientHubAudienceConfig } from '../../DashBoard/workspaces/clients-team/clientHubAudience';
import { resolveAudienceFromPath } from '../../DashBoard/workspaces/clients-team/resolveAudienceFromPath';

import {
  type ClientData,
  type WorkoutHistoryEntry,
  type GoalUpdate
} from './Analytics';
import { logger } from '@/utils/logger';
import { parseClientProgressId } from './ClientProgressView.logic';
import {
  LoadingClientProgressState,
  MissingClientProgressState,
} from './EnhancedClientProgressViewStatePanels';
import {
  toNonNegativeNumber,
  toProgressMetrics,
  toRiskLevel,
  toStringList,
} from './EnhancedClientProgressView.logic';
import EnhancedClientProgressViewShell from './EnhancedClientProgressViewShell';
import { PageWrapper } from './EnhancedClientProgressView.styles';

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

/**
 * EnhancedClientProgressView Component
 *
 * Advanced trainer progress dashboard with comprehensive analytics including:
 * - Original fitness progress, gamification, and recommendations
 * - Advanced comparison analytics vs other clients/averages/goals
 * - NASM-based injury risk assessment and corrective protocols
 * - SMART goal tracking with milestone management
 * - Predictive analytics and AI-powered insights
 *
 * This component extends the existing ClientProgressView with professional-grade
 * analytics tools for comprehensive client management and progression tracking.
 */
const EnhancedClientProgressView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Route locality: return to the Client Hub of the dashboard the actor is
  // already in. Hardcoding the trainer path here would demote an admin —
  // activeRole is URL-derived (UniversalDashboardLayout.tsx:77).
  const clientHubBase = getClientHubAudienceConfig(
    resolveAudienceFromPath(location.pathname),
  ).clientManagementBase;
  const [searchParams] = useSearchParams();
  const [tabValue, setTabValue] = useState(0);
  const [advancedMode, setAdvancedMode] = useState(false);
  const { authAxios } = useAuth();
  const { activeClient } = useGlobalClient();
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistoryEntry[]>([]);
  const [isLoadingClient, setIsLoadingClient] = useState(true);

  const rawClientId = searchParams.get('clientId') ?? activeClient?.id?.toString() ?? '';
  const parsedClientId = parseClientProgressId(rawClientId);
  const clientId = parsedClientId ? String(parsedClientId) : '';

  // Fetch real client data from API
  const loadClientData = useCallback(async () => {
    if (!authAxios || !clientId) {
      setClientData(null);
      setWorkoutHistory([]);
      setIsLoadingClient(false);
      return;
    }
    setIsLoadingClient(true);
    try {
      const [clientRes, progressRes] = await Promise.allSettled([
        authAxios.get(`/api/workout-forms/client/${clientId}/info`),
        authAxios.get(`/api/workout-forms/client/${clientId}/progress`),
      ]);

      const clientInfo = clientRes.status === 'fulfilled' ? clientRes.value.data?.client : null;
      const progressInfo = progressRes.status === 'fulfilled' ? progressRes.value.data : null;
      const metrics = progressInfo?.metrics;

      setClientData({
        id: clientId,
        firstName: clientInfo?.firstName || 'Client',
        lastName: clientInfo?.lastName || `#${clientId}`,
        username: clientInfo?.email?.split('@')[0] || `client${clientId}`,
        startDate: clientInfo?.createdAt || '',
        totalSessions: progressInfo?.totalSessions || 0,
        completedSessions: progressInfo?.completedSessions || 0,
        riskLevel: toRiskLevel(progressInfo?.riskLevel ?? progressInfo?.risk?.level ?? clientInfo?.riskLevel),
        primaryGoals: toStringList(clientInfo?.goals),
        lastAssessment: progressInfo?.lastAssessmentDate || '',
        progressMetrics: toProgressMetrics(metrics)
      });

      const progressWorkoutHistory = Array.isArray(progressInfo?.progressData?.workoutHistory)
        ? progressInfo.progressData.workoutHistory
        : [];

      setWorkoutHistory(progressWorkoutHistory.map((w: any) => ({
        date: w.date || w.createdAt || '',
        type: w.workoutType || w.type || 'Workout',
        duration: toNonNegativeNumber(w.duration),
        intensity: toNonNegativeNumber(w.intensity),
        exerciseCount: toNonNegativeNumber(w.exerciseCount),
        totalVolume: toNonNegativeNumber(w.totalVolume),
        pointsEarned: toNonNegativeNumber(w.pointsEarned),
        exercises: toStringList(w.exercises ?? w.exerciseNames),
        notes: typeof w.notes === 'string' ? w.notes : undefined,
      })));
    } catch (error) {
      logger.error('Failed to load client progress data:', error);
      // Fallback with client ID visible (no fake names)
      setClientData({
        id: clientId,
        firstName: 'Client',
        lastName: `#${clientId}`,
        username: `client${clientId}`,
        startDate: '',
        totalSessions: 0,
        completedSessions: 0,
        riskLevel: 'unknown',
        primaryGoals: [],
        lastAssessment: '',
        progressMetrics: toProgressMetrics(null)
      });
    } finally {
      setIsLoadingClient(false);
    }
  }, [authAxios, clientId]);

  useEffect(() => {
    loadClientData();
  }, [loadClientData]);

  // Use real data, fallback to safe defaults
  const enhancedClientData = clientData || {
    id: clientId, firstName: 'Client', lastName: clientId ? `#${clientId}` : 'not selected', username: '',
    startDate: '', totalSessions: 0, completedSessions: 0, riskLevel: 'unknown' as const,
    primaryGoals: [], lastAssessment: '', progressMetrics: { strength: 0, cardio: 0, flexibility: 0, balance: 0, stability: 0 }
  };

  const handleGoalUpdate = (goalId: string, update: GoalUpdate): void => {
    // Handle goal updates - in real implementation, this would call API
    logger.log('Goal update:', goalId, update);
  };

  const handleTabChange = (newValue: number) => {
    setTabValue(newValue);
  };

  useEffect(() => {
    if (!advancedMode && tabValue !== 0) {
      setTabValue(0);
    }
  }, [advancedMode, tabValue]);

  if (!clientId) {
    return (
      <MissingClientProgressState
        onBackToClients={() => navigate(clientHubBase)}
      />
    );
  }

  if (isLoadingClient) {
    return <LoadingClientProgressState />;
  }

  return (
    <PageWrapper>
      <EnhancedClientProgressViewShell
        advancedMode={advancedMode}
        clientData={enhancedClientData}
        clientId={clientId}
        onAdvancedModeChange={setAdvancedMode}
        onGoalUpdate={handleGoalUpdate}
        onTabChange={handleTabChange}
        tabValue={tabValue}
        workoutHistory={workoutHistory}
      />
    </PageWrapper>
  );
};

export default EnhancedClientProgressView;
