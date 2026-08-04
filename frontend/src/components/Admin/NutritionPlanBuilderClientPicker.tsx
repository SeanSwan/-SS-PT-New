/**
 * ┌─── SUB-COMPONENT: NutritionPlanBuilderClientPicker ────────────┐
 * │ PARENT: NutritionPlanBuilder (Admin + Trainer nutrition route) │
 * │ PURPOSE: Replace the raw numeric client-ID text input with the │
 * │          house Client Hub picker (ClientSelectorDropdown fed   │
 * │          from GlobalClientContext).                            │
 * │ Props: { selectedClientId, onSelectClient }                    │
 * └────────────────────────────────────────────────────────────────┘
 *
 * WHAT THIS FILE DOES: Thin adapter — maps GlobalClientContext's
 * ActiveClient roster onto the ClientOption shape the Client Hub
 * dropdown expects, so the Plan Builder reuses the exact searchable
 * picker (recent clients, avatars, source badges) trainers already know.
 *
 * FALLBACK: When rendered outside GlobalClientProvider (isolated test
 * harness / legacy mount), it degrades to a labelled numeric-ID input
 * instead of crashing, preserving the deep-link `/nutrition/:clientId`
 * behavior in all cases.
 */

import React, { useMemo, useState } from 'react';
import ClientSelectorDropdown, {
  type ClientOption,
} from '../DashBoard/workspaces/clients-team/ClientSelectorDropdown';
import {
  useOptionalGlobalClient,
  type ActiveClient,
} from '../../context/GlobalClientContext';
import { StyledInput } from '../UniversalMasterSchedule/ui';

/** Map the GlobalClientContext roster shape onto the Client Hub dropdown shape. */
export const mapActiveClientToOption = (client: ActiveClient): ClientOption => ({
  id: client.id,
  firstName: client.firstName ?? '',
  lastName: client.lastName ?? '',
  email: client.email ?? '',
  clientSource: client.clientSource,
  availableSessions: client.availableSessions,
  workoutCount: client.totalWorkouts,
  lastSessionDate: client.lastWorkoutDate ?? null,
  nextSessionDate: client.nextSessionDate ?? null,
  photo: client.photo,
});

interface NutritionPlanBuilderClientPickerProps {
  selectedClientId?: number;
  onSelectClient: (clientId: number) => void;
}

const NutritionPlanBuilderClientPicker: React.FC<NutritionPlanBuilderClientPickerProps> = ({
  selectedClientId,
  onSelectClient,
}) => {
  const globalClient = useOptionalGlobalClient();
  const [fallbackInput, setFallbackInput] = useState(
    selectedClientId ? String(selectedClientId) : '',
  );

  const options = useMemo(
    () => (globalClient ? globalClient.clientList.map(mapActiveClientToOption) : []),
    [globalClient],
  );

  if (!globalClient) {
    // Outside the dashboard shell there is no roster to search — keep the
    // numeric fallback so the surface still works instead of crashing.
    return (
      <StyledInput
        id="nutrition-client-picker"
        type="number"
        inputMode="numeric"
        min={1}
        value={fallbackInput}
        onChange={(event) => {
          setFallbackInput(event.target.value);
          const parsed = Number(event.target.value);
          if (Number.isInteger(parsed) && parsed > 0) onSelectClient(parsed);
        }}
        placeholder="Enter client user ID"
        aria-label="Client user ID"
      />
    );
  }

  return (
    <ClientSelectorDropdown
      clients={options}
      selectedId={selectedClientId ?? null}
      onSelect={(client) => onSelectClient(client.id)}
      loading={globalClient.loadingClients}
    />
  );
};

export default NutritionPlanBuilderClientPicker;
