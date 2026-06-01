/**
 * COMPONENT: TrainerWorkoutForgeClientSelect
 * PURPOSE: Shared client selector for the trainer Workout Forge route.
 * WHY: Keeps the mounted page orchestrator under the project line cap while
 * preserving one accessible selector contract for admin and trainer modes.
 */
import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { TrainerClient } from './TrainerWorkoutForgePage.data';
import { Label, Select } from './TrainerWorkoutForgePage.styles';

type TrainerWorkoutForgeClientSelectProps = {
  label: string;
  clientId: string;
  clients: TrainerClient[];
  onChange: (clientId: string) => void;
};

const TrainerWorkoutForgeClientSelect: React.FC<TrainerWorkoutForgeClientSelectProps> = ({
  label,
  clientId,
  clients,
  onChange,
}) => (
  <>
    <Label htmlFor="trainer-forge-client">{label}</Label>
    <Select>
      <select
        id="trainer-forge-client"
        value={clientId}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Choose client...</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.name}
          </option>
        ))}
      </select>
      <ChevronDown size={18} />
    </Select>
  </>
);

export default TrainerWorkoutForgeClientSelect;
