/**
 * Blueprint: EnhancedWorkoutLogger
 * Purpose: role-aware full-page logger for trainer and scheduled-session flows.
 * Flow: parse route state, load canonical /info, mount WorkoutLogger.
 * Guards: strict numeric IDs, dashboard-local returnTo, retry-only failures.
 * Client Hub: admin clients-team deep links redirect to the embedded logger.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useGlobalClient } from '../../../context/GlobalClientContext';
import { useToast } from '../../../hooks/use-toast';
import { logger } from '@/utils/logger';
import {
  buildLoggerCompletionResult,
  buildLoggerRouteContext,
  type LoggerClient,
  normalizeDashboardReturnTo,
  parseLoggerClientId,
  parseLoggerSessionCreditHint,
  parseLoggerSessionDate,
  parseLoggerSessionId,
  toLoggerClientFromInfoResponse,
} from './EnhancedWorkoutLogger.logic';
import EnhancedWorkoutLoggerView from './EnhancedWorkoutLogger.view';

const EnhancedWorkoutLogger: React.FC = () => {
  const { user, authAxios } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // State
  const [client, setClient] = useState<LoggerClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [useOriginalLogger, setUseOriginalLogger] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get client ID from GlobalClientContext first, then fall back to URL param
  const { activeClient } = useGlobalClient();
  const urlClientId = searchParams.get('clientId');
  const scheduledSessionId = parseLoggerSessionId(searchParams.get('sessionId'));
  const scheduledSessionCreditHint = parseLoggerSessionCreditHint(searchParams.get('sessionCredits'));
  const scheduledSessionDate = parseLoggerSessionDate(searchParams.get('sessionDate'));
  const routeClientId = parseLoggerClientId(urlClientId);
  const activeClientId = parseLoggerClientId(activeClient?.id);
  const clientId = routeClientId ?? activeClientId;

  const requestedReturnTo = normalizeDashboardReturnTo(searchParams.get('returnTo'));
  const {
    backToClientsLabel,
    clientHubRedirectPath,
    isClientHubOrigin,
    noClientSelectedMessage,
    workflowReturnPath,
  } = buildLoggerRouteContext({
    requestedReturnTo,
    routeClientId,
    scheduledSessionCreditHint,
    scheduledSessionDate,
    scheduledSessionId,
    source: searchParams.get('source'),
    userRole: user?.role,
  });

  // Load client data
  const loadClientData = useCallback(async () => {
    if (clientHubRedirectPath) return;

    if (!clientId) {
      setError(`No client selected. ${noClientSelectedMessage}`);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Phase 17 (2026-04-20): switched from /api/client-trainer-assignments/
      // client/:id (adminOnly, which 403'd for trainers and silently dropped
      // the logger into demo mode) to the canonical Codex-approved Option 2:
      // GET /api/workout-forms/client/:clientId/info — trainer + admin, same
      // middleware the WorkoutLogger client-self-route already uses.
      const response = await authAxios.get(`/api/workout-forms/client/${clientId}/info`);

      setClient(toLoggerClientFromInfoResponse(response.data, clientId));
      setUseOriginalLogger(true);

    } catch (loadError) {
      logger.warn('Workout logger client info unavailable', loadError);
      setClient(null);
      setUseOriginalLogger(false);
      setError('Client workout data could not be loaded. Retry or return to clients.');

      toast({
        title: 'Workout logger unavailable',
        description: 'Client workout data could not be loaded.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [clientHubRedirectPath, clientId, authAxios, toast, noClientSelectedMessage]);

  // Initialize component
  useEffect(() => {
    if (clientHubRedirectPath) {
      navigate(clientHubRedirectPath, { replace: true });
      return;
    }

    loadClientData();
  }, [clientHubRedirectPath, loadClientData, navigate]);

  // Navigation handlers (Phase 17: role-aware back-target, see backToClientsPath above)
  const handleBackToClients = useCallback(() => {
    navigate(workflowReturnPath);
  }, [navigate, workflowReturnPath]);

  const handleWorkoutComplete = useCallback((_formData: unknown) => {
    const completion = buildLoggerCompletionResult({
      client,
      isClientHubOrigin,
      workflowReturnPath,
    });

    toast(completion.toast);

    navigate(completion.returnPath, {
      state: completion.navigationState,
    });
  }, [client, isClientHubOrigin, navigate, toast, workflowReturnPath]);

  const handleWorkoutCancel = useCallback(() => {
    navigate(workflowReturnPath);
  }, [navigate, workflowReturnPath]);

  return (
    <EnhancedWorkoutLoggerView
      backToClientsLabel={backToClientsLabel}
      client={client}
      error={error}
      loading={loading}
      scheduledSessionCreditHint={scheduledSessionCreditHint}
      scheduledSessionDate={scheduledSessionDate}
      scheduledSessionId={scheduledSessionId}
      useOriginalLogger={useOriginalLogger}
      onBackToClients={handleBackToClients}
      onRetry={loadClientData}
      onWorkoutCancel={handleWorkoutCancel}
      onWorkoutComplete={handleWorkoutComplete}
    />
  );
};

export default EnhancedWorkoutLogger;
