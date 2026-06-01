/**
 * RecurringSeriesModalFields.tsx
 *
 * Form body for recurring-series bulk edits. Extracted so the mounted
 * recurring-series modal stays focused on API flow and confirmation logic.
 */

import React from 'react';
import {
  CheckboxWrapper,
  CustomSelect,
  FormField,
  HelperText,
  Label,
  StyledInput,
} from './ui';

export interface RecurringTrainerOption {
  value: string;
  label: string;
}

interface RecurringSeriesModalFieldsProps {
  time: string;
  setTime: (value: string) => void;
  duration: number | '';
  setDuration: (value: number | '') => void;
  trainerId: string;
  setTrainerId: (value: string) => void;
  trainerOptions: RecurringTrainerOption[];
  location: string;
  setLocation: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  deleteAll: boolean;
  setDeleteAll: (value: boolean) => void;
}

const RecurringSeriesModalFields: React.FC<RecurringSeriesModalFieldsProps> = ({
  time,
  setTime,
  duration,
  setDuration,
  trainerId,
  setTrainerId,
  trainerOptions,
  location,
  setLocation,
  notes,
  setNotes,
  deleteAll,
  setDeleteAll,
}) => (
  <>
    <FormField>
      <Label htmlFor="series-time">New Time (optional)</Label>
      <StyledInput
        id="series-time"
        type="time"
        value={time}
        onChange={(event) => setTime(event.target.value)}
      />
      <HelperText>Updates the time for all future sessions.</HelperText>
    </FormField>

    <FormField>
      <Label htmlFor="series-duration">Duration (minutes)</Label>
      <StyledInput
        id="series-duration"
        type="number"
        min={15}
        step={15}
        value={duration}
        onChange={(event) => setDuration(event.target.value ? Number(event.target.value) : '')}
      />
    </FormField>

    <FormField>
      <Label htmlFor="series-trainer">Trainer</Label>
      <CustomSelect
        value={trainerId}
        onChange={(value) => setTrainerId(String(value))}
        options={trainerOptions}
        placeholder="Select trainer"
        searchable
        aria-label="Select trainer"
      />
    </FormField>

    <FormField>
      <Label htmlFor="series-location">Location</Label>
      <StyledInput
        id="series-location"
        type="text"
        value={location}
        onChange={(event) => setLocation(event.target.value)}
      />
    </FormField>

    <FormField>
      <Label htmlFor="series-notes">Notes</Label>
      <StyledInput
        id="series-notes"
        type="text"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />
    </FormField>

    <FormField>
      <CheckboxWrapper>
        <input
          type="checkbox"
          checked={deleteAll}
          onChange={(event) => setDeleteAll(event.target.checked)}
        />
        <span>Delete past sessions too</span>
      </CheckboxWrapper>
    </FormField>
  </>
);

export default RecurringSeriesModalFields;
