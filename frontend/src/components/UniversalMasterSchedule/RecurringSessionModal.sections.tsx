import React from 'react';
import {
  CheckboxWrapper,
  CustomSelect,
  ErrorText,
  FormField,
  HelperText,
  Label,
  OutlinedButton,
  StyledInput,
  TimeWheelPicker,
} from './ui';
import type { RecurringTimeRow, TrainerOption } from './RecurringSessionModal.logic';
import { StyledBox } from '@/components/ui/StyledBox';

const daysOfWeekOptions = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const durationPresets = [
  { value: '4weeks', label: '4 Weeks' },
  { value: '8weeks', label: '8 Weeks' },
  { value: '12weeks', label: '12 Weeks' },
  { value: '6months', label: '6 Months' },
  { value: '1year', label: '1 Year' },
  { value: 'ongoing', label: 'Ongoing (12 months max)' },
  { value: 'custom', label: 'Custom Date Range' },
];

type FieldErrors = Record<string, string>;

interface RecurringScheduleFieldsProps {
  durationPreset: string;
  startDate: string;
  endDate: string;
  fieldErrors: FieldErrors;
  onPresetChange: (value: string | number) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}

export const RecurringScheduleFields: React.FC<RecurringScheduleFieldsProps> = ({
  durationPreset,
  startDate,
  endDate,
  fieldErrors,
  onPresetChange,
  onStartDateChange,
  onEndDateChange,
}) => (
  <>
    <FormField>
      <Label required>Schedule Duration</Label>
      <CustomSelect
        value={durationPreset}
        onChange={onPresetChange}
        options={durationPresets}
        placeholder="Select duration"
        aria-label="Schedule duration preset"
      />
      <HelperText>
        {durationPreset === 'custom'
          ? 'Choose your own start and end dates below.'
          : durationPreset === 'ongoing'
            ? 'Creates sessions for 12 months (max allowed).'
            : 'Sessions will repeat for the selected period.'}
      </HelperText>
    </FormField>

    <FormField>
      <Label htmlFor="recurring-start-date" required>
        Start Date
      </Label>
      <StyledInput
        id="recurring-start-date"
        type="date"
        value={startDate}
        onChange={(event) => onStartDateChange(event.target.value)}
        hasError={Boolean(fieldErrors.startDate)}
      />
      {fieldErrors.startDate && <ErrorText>{fieldErrors.startDate}</ErrorText>}
    </FormField>

    <FormField>
      <Label htmlFor="recurring-end-date" required>
        End Date {durationPreset !== 'custom' && endDate && '(auto-calculated)'}
      </Label>
      <StyledInput
        id="recurring-end-date"
        type="date"
        value={endDate}
        onChange={(event) => onEndDateChange(event.target.value)}
        hasError={Boolean(fieldErrors.endDate)}
        disabled={durationPreset !== 'custom'}
      />
      {fieldErrors.endDate && <ErrorText>{fieldErrors.endDate}</ErrorText>}
    </FormField>
  </>
);

interface RecurringDayFieldsProps {
  daysOfWeek: number[];
  fieldErrors: FieldErrors;
  onToggleDay: (day: number) => void;
}

export const RecurringDayFields: React.FC<RecurringDayFieldsProps> = ({
  daysOfWeek,
  fieldErrors,
  onToggleDay,
}) => (
  <FormField>
    <Label required>Days of Week</Label>
    <StyledBox as="div" $style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
      {daysOfWeekOptions.map((day) => (
        <CheckboxWrapper key={day.value}>
          <input
            type="checkbox"
            checked={daysOfWeek.includes(day.value)}
            onChange={() => onToggleDay(day.value)}
          />
          <span>{day.label}</span>
        </CheckboxWrapper>
      ))}
    </StyledBox>
    {fieldErrors.daysOfWeek && <ErrorText>{fieldErrors.daysOfWeek}</ErrorText>}
  </FormField>
);

interface RecurringTimeFieldsProps {
  timeRows: RecurringTimeRow[];
  fieldErrors: FieldErrors;
  onAddTime: () => void;
  onRemoveTime: (rowId: string) => void;
  onUpdateTime: (rowId: string, value: string) => void;
}

export const RecurringTimeFields: React.FC<RecurringTimeFieldsProps> = ({
  timeRows,
  fieldErrors,
  onAddTime,
  onRemoveTime,
  onUpdateTime,
}) => (
  <FormField>
    <Label required>Times</Label>
    <StyledBox as="div" $style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {timeRows.map((timeRow, index) => (
        <StyledBox as="div" key={timeRow.id} $style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <StyledBox as="div" $style={{ flex: 1 }}>
            <TimeWheelPicker
              value={timeRow.value}
              onChange={(value) => onUpdateTime(timeRow.id, value)}
              step={15}
              label={`Session time ${index + 1}`}
              data-testid={`recurring-time-${index}`}
            />
          </StyledBox>
          <OutlinedButton
            onClick={() => onRemoveTime(timeRow.id)}
            disabled={timeRows.length === 1}
            type="button"
          >
            Remove
          </OutlinedButton>
        </StyledBox>
      ))}
    </StyledBox>
    <StyledBox as="div" $style={{ marginTop: '0.75rem' }}>
      <OutlinedButton onClick={onAddTime} type="button">
        Add Time
      </OutlinedButton>
    </StyledBox>
    {fieldErrors.times && <ErrorText>{fieldErrors.times}</ErrorText>}
    <HelperText>At least one time is required.</HelperText>
  </FormField>
);

interface RecurringSessionDetailsFieldsProps {
  duration: number;
  trainerId: string;
  trainerOptions: TrainerOption[];
  location: string;
  notifyClient: boolean;
  onDurationChange: (value: number) => void;
  onTrainerChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onNotifyClientChange: (value: boolean) => void;
}

export const RecurringSessionDetailsFields: React.FC<RecurringSessionDetailsFieldsProps> = ({
  duration,
  trainerId,
  trainerOptions,
  location,
  notifyClient,
  onDurationChange,
  onTrainerChange,
  onLocationChange,
  onNotifyClientChange,
}) => (
  <>
    <FormField>
      <Label htmlFor="recurring-duration" required>
        Duration (minutes)
      </Label>
      <StyledInput
        id="recurring-duration"
        type="number"
        min={15}
        step={15}
        value={duration}
        onChange={(event) => onDurationChange(Number(event.target.value) || 0)}
      />
    </FormField>

    <FormField>
      <Label htmlFor="recurring-trainer">
        Trainer (optional)
      </Label>
      <CustomSelect
        value={trainerId}
        onChange={(value) => onTrainerChange(String(value))}
        options={trainerOptions}
        placeholder="Select trainer"
        searchable
        aria-label="Select trainer"
      />
    </FormField>

    <FormField>
      <Label htmlFor="recurring-location" required>
        Location
      </Label>
      <StyledInput
        id="recurring-location"
        type="text"
        value={location}
        onChange={(event) => onLocationChange(event.target.value)}
      />
    </FormField>

    <FormField>
      <CheckboxWrapper>
        <input
          type="checkbox"
          checked={notifyClient}
          onChange={(event) => onNotifyClientChange(event.target.checked)}
        />
        <span>Notify client about these sessions</span>
      </CheckboxWrapper>
    </FormField>
  </>
);
