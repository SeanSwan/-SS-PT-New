/**
 * Enhanced Trainer Workout Logger - Integrated with My Clients View
 * =================================================================
 *
 * Seamless workout logging interface for trainers with enhanced client integration
 * Designed to work perfectly with the My Clients view and overall trainer workflow
 *
 * CORE FEATURES:
 * ✅ URL parameter client selection from My Clients view
 * ✅ Client pre-selection and information display
 * ✅ Streamlined NASM-compliant workout logging
 * ✅ Smart navigation flow (back to My Clients)
 * ✅ Honest retry state when APIs are unavailable
 * ✅ Mobile-optimized for gym tablet use
 * ✅ Real-time session deduction tracking
 * ✅ Professional stellar purple theme
 *
 * INTEGRATION POINTS:
 * - Seamless navigation from /dashboard/trainer/clients
 * - URL pattern: /dashboard/trainer/log-workout?clientId=123
 * - Automatic client data loading and validation
 * - Session count verification and warnings
 * - Return navigation to My Clients view
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useGlobalClient } from '../../../context/GlobalClientContext';
import { useToast } from '../../../hooks/use-toast';
import GlowButton from '../../ui/buttons/GlowButton';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import WorkoutLogger from '../../WorkoutLogger/WorkoutLogger';
import { logger } from '@/utils/logger';
import { normalizeDashboardReturnTo, parseLoggerClientId, parseLoggerSessionId } from './EnhancedWorkoutLogger.logic';
import {
  ActionRow,
  CenteredLoading,
  ErrorContainer,
  NavigationBar,
  WorkoutContainer,
} from './EnhancedWorkoutLogger.styles';

interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  availableSessions: number;
  totalSessionsCompleted: number;
  lastSessionDate?: string;
  membershipLevel: 'basic' | 'premium' | 'elite';
}

const EnhancedWorkoutLogger: React.FC = () => {
  const { user, authAxios } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // State
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [useOriginalLogger, setUseOriginalLogger] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get client ID from GlobalClientContext first, then fall back to URL param
  const { activeClient } = useGlobalClient();
  const urlClientId = searchParams.get('clientId');
  const scheduledSessionId = parseLoggerSessionId(searchParams.get('sessionId'));
  const scheduledSessionDate = searchParams.get('sessionDate');
  const routeClientId = parseLoggerClientId(urlClientId);
  const activeClientId = parseLoggerClientId(activeClient?.id);
  const clientId = routeClientId ?? activeClientId;

  // Phase 17 (2026-04-20): role-aware navigation + copy.
  // Admin lands on ClientsWorkspace (Client Hub); trainer lands on MyClientsView.
  // Client Progress deep-link goes to the Client Hub with the clientId pre-selected
  // (ClientsWorkspace reads `clientId` from useSearchParams and auto-selects).
  // `AdminClientProgressView` is intentionally NOT the admin target because it
  // owns `selectedClientId` as internal state and does not consume a URL param.
  const isAdmin = user?.role === 'admin';
  const backToClientsPath = isAdmin
    ? '/dashboard/admin/client-management'
    : '/dashboard/trainer/clients';
  const isMasterScheduleOrigin = searchParams.get('source') === 'master-schedule';
  const isClientHubOrigin = searchParams.get('source') === 'clients-team';
  const requestedReturnTo = normalizeDashboardReturnTo(searchParams.get('returnTo'));
  const workflowReturnPath = requestedReturnTo ?? backToClientsPath;
  const backToClientsLabel = requestedReturnTo && isMasterScheduleOrigin
    ? 'Back to Schedule'
    : requestedReturnTo && isClientHubOrigin
      ? 'Back to Client Hub'
      : isAdmin ? 'Back to Client Hub' : 'Back to My Clients';
  const noClientSelectedMessage = isAdmin
    ? 'Please select a client from Client Hub.'
    : 'Please select a client from My Clients view.';

  // Load client data
  const loadClientData = useCallback(async () => {
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

      if (response.data?.success && response.data.client) {
        const c = response.data.client;
        const responseClientId = parseLoggerClientId(c.id);
        if (!responseClientId || responseClientId !== clientId) {
          throw new Error('Client identity mismatch');
        }
        // /info returns pure camelCase. totalSessionsCompleted, lastSessionDate
        // and membershipLevel are not in the /info response — keep defaults so
        // the card renders without visual gaps.
        setClient({
          id: responseClientId,
          firstName: c.firstName || 'Client',
          lastName: c.lastName || '',
          email: c.email || '',
          phone: c.phone || undefined,
          availableSessions: c.availableSessions ?? 0,
          totalSessionsCompleted: 0,
          lastSessionDate: undefined,
          membershipLevel: 'basic',
        });
        // Phase 17.1 (2026-04-20): auto-mount the real WorkoutLogger on
        // real-client success. Pre-17.1 an admin/trainer had to click
        // through a stale placeholder before reaching the real logger.
        setUseOriginalLogger(true);
      } else {
        throw new Error('Client not found or not accessible');
      }

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
  }, [clientId, authAxios, toast, noClientSelectedMessage]);

  // Initialize component
  useEffect(() => {
    loadClientData();
  }, [loadClientData]);

  // Navigation handlers (Phase 17: role-aware back-target, see backToClientsPath above)
  const handleBackToClients = useCallback(() => {
    navigate(workflowReturnPath);
  }, [navigate, workflowReturnPath]);

  const handleWorkoutComplete = useCallback((_formData: unknown) => {
    toast({
      title: 'Workout Completed!',
      description: `Workout logged for ${client?.firstName}. Workout saved and progress updated.`,
      variant: 'default'
    });

    // Navigate back to the workflow origin with success state.
    navigate(workflowReturnPath, {
      state: { workoutCompleted: true, clientName: `${client?.firstName} ${client?.lastName}` }
    });
  }, [client, navigate, toast, workflowReturnPath]);

  const handleWorkoutCancel = useCallback(() => {
    navigate(workflowReturnPath);
  }, [navigate, workflowReturnPath]);

  // Render loading state
  if (loading) {
    return (
      <WorkoutContainer>
        <CenteredLoading>
          <LoadingSpinner message="Loading client workout interface..." />
        </CenteredLoading>
      </WorkoutContainer>
    );
  }

  // Render error state
  if (error) {
    return (
      <WorkoutContainer>
        <ErrorContainer
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <AlertTriangle size={64} className="error-icon" />
          <h3>Workout Logging Error</h3>
          <p>{error}</p>
          <ActionRow $center>
            <GlowButton
              text={backToClientsLabel}
              theme="purple"
              onClick={handleBackToClients}
              leftIcon={<ArrowLeft size={18} />}
            />
            <GlowButton
              text="Try Again"
              theme="emerald"
              size="small"
              onClick={loadClientData}
              leftIcon={<RefreshCw size={18} />}
            />
          </ActionRow>
        </ErrorContainer>
      </WorkoutContainer>
    );
  }

  // If using original logger, render it
  if (useOriginalLogger && client) {
    // Phase 17.1 (2026-04-20): real-client paths auto-enter this branch
    // via loadClientData success. Those users need role-aware
    // "Back to Client Hub" / "Back to My Clients" navigation.
    return (
      <WorkoutContainer>
        <NavigationBar>
          <GlowButton
            text={backToClientsLabel}
            theme="cosmic"
            size="small"
            onClick={handleBackToClients}
            leftIcon={<ArrowLeft size={16} />}
          />
        </NavigationBar>

        <WorkoutLogger
          clientId={client.id}
          scheduledSessionId={scheduledSessionId}
          scheduledSessionDate={scheduledSessionDate}
          onComplete={handleWorkoutComplete}
          onCancel={handleWorkoutCancel}
        />
      </WorkoutContainer>
    );
  }

  return (
    <WorkoutContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <ErrorContainer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <AlertTriangle size={64} className="error-icon" />
        <h3>Workout Logger Unavailable</h3>
        <p>Client workout data is not ready. Retry or return to clients.</p>
        <ActionRow $center>
          <GlowButton
            text={backToClientsLabel}
            theme="purple"
            onClick={handleBackToClients}
            leftIcon={<ArrowLeft size={18} />}
          />
          <GlowButton
            text="Try Again"
            theme="emerald"
            size="small"
            onClick={loadClientData}
            leftIcon={<RefreshCw size={18} />}
          />
        </ActionRow>
      </ErrorContainer>
    </WorkoutContainer>
  );
};

export default EnhancedWorkoutLogger;
