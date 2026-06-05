/**
 * Blueprint: EnhancedWorkoutLoggerView
 * Purpose: presentational states for the full-page workout logger.
 * Flow: loading/error/ready/unavailable rendering only; no route or API logic.
 * Guards: keeps retry/back controls consistent across failure states.
 */

import React from 'react';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import GlowButton from '../../ui/buttons/GlowButton';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import WorkoutLogger from '../../WorkoutLogger/WorkoutLogger';
import type { LoggerClient } from './EnhancedWorkoutLogger.logic';
import {
  ActionRow,
  CenteredLoading,
  ErrorContainer,
  NavigationBar,
  WorkoutContainer,
} from './EnhancedWorkoutLogger.styles';

type VoidHandler = () => void;

interface LoggerRetryActionsProps {
  backToClientsLabel: string;
  onBackToClients: VoidHandler;
  onRetry: VoidHandler;
}

const LoggerRetryActions: React.FC<LoggerRetryActionsProps> = ({
  backToClientsLabel,
  onBackToClients,
  onRetry,
}) => (
  <ActionRow $center>
    <GlowButton
      text={backToClientsLabel}
      theme="purple"
      onClick={onBackToClients}
      leftIcon={<ArrowLeft size={18} />}
    />
    <GlowButton
      text="Try Again"
      theme="emerald"
      size="small"
      onClick={onRetry}
      leftIcon={<RefreshCw size={18} />}
    />
  </ActionRow>
);

const LoggerLoadingState: React.FC = () => (
  <WorkoutContainer>
    <CenteredLoading>
      <LoadingSpinner message="Loading client workout interface..." />
    </CenteredLoading>
  </WorkoutContainer>
);

interface LoggerProblemStateProps {
  backToClientsLabel: string;
  error: string | null;
  onBackToClients: VoidHandler;
  onRetry: VoidHandler;
}

const LoggerProblemState: React.FC<LoggerProblemStateProps> = ({
  backToClientsLabel,
  error,
  onBackToClients,
  onRetry,
}) => {
  const isError = Boolean(error);

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
        <h3>{isError ? 'Workout Logging Error' : 'Workout Logger Unavailable'}</h3>
        <p>{error || 'Client workout data is not ready. Retry or return to clients.'}</p>
        <LoggerRetryActions
          backToClientsLabel={backToClientsLabel}
          onBackToClients={onBackToClients}
          onRetry={onRetry}
        />
      </ErrorContainer>
    </WorkoutContainer>
  );
};

interface LoggerReadyStateProps {
  backToClientsLabel: string;
  client: LoggerClient;
  scheduledSessionDate: string | null;
  scheduledSessionId: string | null;
  onBackToClients: VoidHandler;
  onWorkoutCancel: VoidHandler;
  onWorkoutComplete: (formData: unknown) => void;
}

const LoggerReadyState: React.FC<LoggerReadyStateProps> = ({
  backToClientsLabel,
  client,
  scheduledSessionDate,
  scheduledSessionId,
  onBackToClients,
  onWorkoutCancel,
  onWorkoutComplete,
}) => (
  <WorkoutContainer>
    <NavigationBar>
      <GlowButton
        text={backToClientsLabel}
        theme="cosmic"
        size="small"
        onClick={onBackToClients}
        leftIcon={<ArrowLeft size={16} />}
      />
    </NavigationBar>

    <WorkoutLogger
      clientId={client.id}
      scheduledSessionId={scheduledSessionId}
      scheduledSessionDate={scheduledSessionDate}
      onComplete={onWorkoutComplete}
      onCancel={onWorkoutCancel}
    />
  </WorkoutContainer>
);

interface EnhancedWorkoutLoggerViewProps {
  backToClientsLabel: string;
  client: LoggerClient | null;
  error: string | null;
  loading: boolean;
  scheduledSessionDate: string | null;
  scheduledSessionId: string | null;
  useOriginalLogger: boolean;
  onBackToClients: VoidHandler;
  onRetry: VoidHandler;
  onWorkoutCancel: VoidHandler;
  onWorkoutComplete: (formData: unknown) => void;
}

const hasReadyLoggerClient = (
  error: string | null,
  useOriginalLogger: boolean,
  client: LoggerClient | null
): client is LoggerClient =>
  !error && useOriginalLogger && Boolean(client);

const EnhancedWorkoutLoggerView: React.FC<EnhancedWorkoutLoggerViewProps> = ({
  backToClientsLabel,
  client,
  error,
  loading,
  scheduledSessionDate,
  scheduledSessionId,
  useOriginalLogger,
  onBackToClients,
  onRetry,
  onWorkoutCancel,
  onWorkoutComplete,
}) => {
  if (loading) return <LoggerLoadingState />;

  if (hasReadyLoggerClient(error, useOriginalLogger, client)) {
    return (
      <LoggerReadyState
        backToClientsLabel={backToClientsLabel}
        client={client}
        scheduledSessionDate={scheduledSessionDate}
        scheduledSessionId={scheduledSessionId}
        onBackToClients={onBackToClients}
        onWorkoutCancel={onWorkoutCancel}
        onWorkoutComplete={onWorkoutComplete}
      />
    );
  }

  return (
    <LoggerProblemState
      backToClientsLabel={backToClientsLabel}
      error={error}
      onBackToClients={onBackToClients}
      onRetry={onRetry}
    />
  );
};

export default EnhancedWorkoutLoggerView;
