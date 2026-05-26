/**
 * COMPONENT: ClientsWorkspaceTabs
 * PURPOSE: Lazy tab renderers for the canonical admin Client Hub.
 */

import React, { lazy, Suspense, useCallback } from 'react';
import { LoadingPulse } from './ClientsWorkspace.styles';
import type { ClientOption } from './clients-team/ClientSelectorDropdown';

const TrainingTabContent = lazy(() => import('./clients-team/tabs/TrainingTabContent'));
const ProgressTabContent = lazy(() => import('./clients-team/tabs/ProgressTabContent'));
const BiometricsTabContent = lazy(() => import('./clients-team/tabs/BiometricsTabContent'));
const OverviewTabContent = lazy(() => import('./clients-team/tabs/OverviewTabContent'));
const SettingsTabContent = lazy(() => import('./clients-team/tabs/SettingsTabContent'));

const clientName = (client: ClientOption | null) =>
  `${client?.firstName ?? ''} ${client?.lastName ?? ''}`.trim();

export const useClientsWorkspaceTabRenderers = (selectedClient: ClientOption | null) => {
  const renderTraining = useCallback((clientId: number | string) => (
    <Suspense fallback={<LoadingPulse>Loading training...</LoadingPulse>}>
      <TrainingTabContent clientId={clientId} clientName={clientName(selectedClient)} />
    </Suspense>
  ), [selectedClient]);

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
      <OverviewTabContent clientId={clientId} />
    </Suspense>
  ), []);

  const renderSettings = useCallback((clientId: number | string) => (
    <Suspense fallback={<LoadingPulse>Loading settings...</LoadingPulse>}>
      <SettingsTabContent clientId={clientId} clientName={clientName(selectedClient)} />
    </Suspense>
  ), [selectedClient]);

  return { renderTraining, renderProgress, renderBiometrics, renderOverview, renderSettings };
};
