/**
 * Options: WorkoutPlannerCommandPanel
 * Purpose: Keep select-option rendering and small command-label decisions out
 * of the section components.
 */

import React from 'react';
import type {
  PlanDuration,
  PlannerClient,
  PlannerEquipmentProfile,
} from './WorkoutPlannerTypes';

export type ClientSelfGenerationStatus = 'enabled' | 'disabled' | 'unknown';

export const SESSION_OPTIONS = [1, 2, 3, 4, 5, 6];

export const clientOptions = (
  clients: PlannerClient[],
  clientsLoading: boolean,
): React.ReactNode => {
  if (clientsLoading) return <option>Loading clients...</option>;
  if (clients.length === 0) return <option>No clients found</option>;

  return clients.map(client => (
    <option key={client.id} value={client.id}>
      {client.firstName} {client.lastName}
    </option>
  ));
};

export const equipmentPlaceholder = (
  equipmentProfiles: PlannerEquipmentProfile[],
  equipmentProfilesLoading: boolean,
): string => {
  if (equipmentProfilesLoading) return 'Loading equipment...';
  return equipmentProfiles.length === 0 ? 'No equipment profiles' : 'Any trainer equipment';
};

export const generationTitle = (clientGenBlocked: boolean): string | undefined => (
  clientGenBlocked
    ? 'Self-service workout plan generation is not enabled for your account. Ask your admin to turn it on.'
    : undefined
);

export const generationLabel = (isGenerating: boolean, planDuration: PlanDuration): string => {
  if (isGenerating) return 'Planning...';
  return planDuration === 'single' ? 'Swan Coach Generate' : 'Swan Coach Plan';
};

export const generationHandler = (
  planDuration: PlanDuration,
  onGenerateSingle: () => void,
  onGeneratePlan: () => void,
) => (planDuration === 'single' ? onGenerateSingle : onGeneratePlan);

export const selfGenerationLabel = (
  clientGenBlocked: boolean,
  clientSelfGenStatus: ClientSelfGenerationStatus,
): string => {
  if (clientGenBlocked) return 'Disabled for your account';
  return clientSelfGenStatus === 'enabled' ? 'Enabled' : 'Disabled';
};

export const formatEquipmentLocation = (locationType: string): string => (
  locationType.replace(/_/g, ' ')
);
