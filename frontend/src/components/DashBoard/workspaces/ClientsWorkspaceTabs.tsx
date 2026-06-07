/**
 * COMPONENT: ClientsWorkspaceTabs
 * PURPOSE: Lazy tab renderers for the canonical admin Client Hub.
 */

import React, { lazy, Suspense, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LoadingPulse } from './ClientsWorkspace.styles';
import type {
  ClientScheduleWorkoutLoggerContext,
  ClientTrainingSection,
} from './ClientsWorkspace.logic';
import type { ClientOption } from './clients-team/ClientSelectorDropdown';
import { getClientDisplayName } from './clients-team/clientIdentity';

const TrainingTabContent = lazy(() => import('./clients-team/tabs/TrainingTabContent'));
const ProgressTabContent = lazy(() => import('./clients-team/tabs/ProgressTabContent'));
const BiometricsTabContent = lazy(() => import('./clients-team/tabs/BiometricsTabContent'));
const OverviewTabContent = lazy(() => import('./clients-team/tabs/OverviewTabContent'));
const SettingsTabContent = lazy(() => import('./clients-team/tabs/SettingsTabContent'));

const clientName = (client: ClientOption | null) =>
  client ? getClientDisplayName(client) : '';

export const useClientsWorkspaceTabRenderers = (
  selectedClient: ClientOption | null,
  initialTrainingSection: ClientTrainingSection | null = null,
  onOpenProgress?: () => void,
  scheduleLoggerContext: ClientScheduleWorkoutLoggerContext | null = null,
) => {
  const [, setSearchParams] = useSearchParams();

  const writeTrainingSectionRoute = useCallback((section: ClientTrainingSection) => {
    if (!selectedClient?.id) return;
    const nextParams: Record<string, string> = {
      clientId: String(selectedClient.id),
      tab: 'training',
      trainingSection: section,
      ...(section === 'logger' ? { loadPlan: 'today' } : {}),
    };

    if (section === 'logger' && scheduleLoggerContext) {
      nextParams.sessionId = scheduleLoggerContext.scheduledSessionId;
      if (scheduleLoggerContext.scheduledSessionDate) {
        nextParams.sessionDate = scheduleLoggerContext.scheduledSessionDate;
      }
      if (scheduleLoggerContext.scheduledSessionCreditHint !== null) {
        nextParams.sessionCredits = String(scheduleLoggerContext.scheduledSessionCreditHint);
      }
    }

    setSearchParams(nextParams);
  }, [scheduleLoggerContext, selectedClient?.id, setSearchParams]);

  const renderTraining = useCallback((clientId: number | string) => (
    <Suspense fallback={<LoadingPulse>Loading training...</LoadingPulse>}>
      <TrainingTabContent
        clientId={clientId}
        clientName={clientName(selectedClient)}
        initialSection={initialTrainingSection ?? undefined}
        onSectionChange={writeTrainingSectionRoute}
        onOpenProgress={onOpenProgress}
        scheduledSessionCreditHint={scheduleLoggerContext?.scheduledSessionCreditHint ?? null}
        scheduledSessionDate={scheduleLoggerContext?.scheduledSessionDate ?? null}
        scheduledSessionId={scheduleLoggerContext?.scheduledSessionId ?? null}
      />
    </Suspense>
  ), [initialTrainingSection, onOpenProgress, scheduleLoggerContext, selectedClient, writeTrainingSectionRoute]);

  const renderProgress = useCallback((clientId: number | string) => (
    <Suspense fallback={<LoadingPulse>Loading progress...</LoadingPulse>}>
      <ProgressTabContent clientId={clientId} clientName={clientName(selectedClient)} />
    </Suspense>
  ), [selectedClient]);

  const renderBiometrics = useCallback((clientId: number | string) => (
    <Suspense fallback={<LoadingPulse>Loading biometrics...</LoadingPulse>}>
      <BiometricsTabContent clientId={clientId} clientName={clientName(selectedClient)} />
    </Suspense>
  ), [selectedClient]);

  const renderOverview = useCallback((clientId: number | string) => (
    <Suspense fallback={<LoadingPulse>Loading overview...</LoadingPulse>}>
      <OverviewTabContent clientId={clientId} clientName={clientName(selectedClient)} />
    </Suspense>
  ), [selectedClient]);

  const renderSettings = useCallback((clientId: number | string) => (
    <Suspense fallback={<LoadingPulse>Loading settings...</LoadingPulse>}>
      <SettingsTabContent clientId={clientId} clientName={clientName(selectedClient)} />
    </Suspense>
  ), [selectedClient]);

  return { renderTraining, renderProgress, renderBiometrics, renderOverview, renderSettings };
};
