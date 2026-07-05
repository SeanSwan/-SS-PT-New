/**
 * HOOK: useClientHubAdminNav
 * PURPOSE: Admin-only Client Hub navigation commands (new-client onboarding,
 *          onboarding workbench, view-as, trainer assignments). Grouped here
 *          so the role boundary is explicit: the trainer audience never
 *          renders the buttons that call these.
 */

import { useCallback } from 'react';
import { buildClientOnboardingWorkbenchRoute } from './ClientsWorkspace.logic';
import { buildClientCoachOnboardingRoute } from './clients-team/clientDailyTrainingRoutes';
import type { ClientOption } from './clients-team/ClientSelectorDropdown';

export const useClientHubAdminNav = (
  navigate: (route: string) => void,
  selectedClient: ClientOption | null,
) => {
  const handleNewClient = useCallback(() => {
    navigate(buildClientCoachOnboardingRoute());
  }, [navigate]);

  const handleOpenOnboardingWorkbench = useCallback(() => {
    navigate(buildClientOnboardingWorkbenchRoute(selectedClient));
  }, [navigate, selectedClient]);

  const handleViewAsClient = useCallback(() => {
    if (selectedClient) {
      navigate(`/dashboard/admin/client-management/view-as/${selectedClient.id}`);
    }
  }, [navigate, selectedClient]);

  const handleManageAssignments = useCallback(
    () => navigate('/dashboard/admin/client-trainer-assignments'),
    [navigate],
  );

  return {
    handleNewClient,
    handleOpenOnboardingWorkbench,
    handleViewAsClient,
    handleManageAssignments,
  };
};
