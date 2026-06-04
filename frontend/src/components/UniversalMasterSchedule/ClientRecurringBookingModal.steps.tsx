import React from 'react';
import { AlertCircle, Calendar, Check, Clock, MapPin, User } from 'lucide-react';
import {
  BodyText,
  CustomSelect,
  FormField,
  HelperText,
  Label,
  SmallText,
} from './ui';
import {
  daysOfWeekOptions,
  weeksAheadOptions,
} from './ClientRecurringBookingModal.logic';
import {
  ConfirmListLabel,
  CreditsBadge,
  ResultCount,
  ResultPreview,
  SelectedCountText,
  SelectionActions,
  SmallButton,
  StepContainer,
  StepDescription,
  StepDot,
  StepHeader,
  StepIndicator,
  StepLine,
  StepTitle,
  StrongBodyText,
} from './ClientRecurringBookingModal.styles';
import {
  ConfirmSessionItem,
  ConfirmSessionList,
  ConfirmSummary,
  EmptyState,
  SessionCard,
  SessionCheckbox,
  SessionDate,
  SessionInfo,
  SessionList,
  SessionLocation,
  SessionMeta,
  SessionTime,
  SessionTrainer,
  SummaryDivider,
  SummaryRow,
  SummaryValue,
} from './ClientRecurringBookingModal.sessionStyles';
import type {
  ClientRecurringSession,
  ClientRecurringStep,
  RecurringSelectOption,
} from './ClientRecurringBookingModal.types';

const formatSessionDay = (sessionDate: Date) =>
  sessionDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

const formatSessionTime = (sessionDate: Date) =>
  sessionDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

export const RecurringStepIndicator: React.FC<{ step: ClientRecurringStep }> = ({ step }) => (
  <StepIndicator>
    <StepDot $active={step === 'filter'} $completed={step !== 'filter'}>1</StepDot>
    <StepLine $completed={step !== 'filter'} />
    <StepDot $active={step === 'select'} $completed={step === 'confirm'}>2</StepDot>
    <StepLine $completed={step === 'confirm'} />
    <StepDot $active={step === 'confirm'}>3</StepDot>
  </StepIndicator>
);

export const RecurringFilterStep: React.FC<{
  selectedDay: number | '';
  selectedTimeSlot: string;
  weeksAhead: number;
  timeSlotOptions: RecurringSelectOption[];
  filteredCount: number;
  onSelectedDayChange: (day: number | '') => void;
  onSelectedTimeSlotChange: (timeSlot: string) => void;
  onWeeksAheadChange: (weeks: number) => void;
}> = ({
  selectedDay,
  selectedTimeSlot,
  weeksAhead,
  timeSlotOptions,
  filteredCount,
  onSelectedDayChange,
  onSelectedTimeSlotChange,
  onWeeksAheadChange,
}) => (
  <StepContainer>
    <StepTitle>
      <Calendar size={20} />
      Set Your Recurring Schedule
    </StepTitle>
    <StepDescription>
      Choose your preferred day and time to find matching available sessions.
    </StepDescription>

    <FormField>
      <Label>Preferred Day</Label>
      <CustomSelect
        value={selectedDay}
        onChange={(val) => onSelectedDayChange(val === '' ? '' : Number(val))}
        options={[{ value: '', label: 'Any day' }, ...daysOfWeekOptions]}
        placeholder="Select a day"
      />
    </FormField>

    <FormField>
      <Label>Preferred Time</Label>
      <CustomSelect
        value={selectedTimeSlot}
        onChange={(val) => onSelectedTimeSlotChange(String(val))}
        options={[{ value: '', label: 'Any time' }, ...timeSlotOptions]}
        placeholder="Select a time"
      />
    </FormField>

    <FormField>
      <Label>How far ahead?</Label>
      <CustomSelect
        value={weeksAhead}
        onChange={(val) => onWeeksAheadChange(Number(val))}
        options={weeksAheadOptions}
      />
      <HelperText>We'll find available sessions for the next {weeksAhead} weeks</HelperText>
    </FormField>

    <ResultPreview>
      <SmallText secondary>Sessions matching your criteria:</SmallText>
      <ResultCount $hasResults={filteredCount > 0}>{filteredCount} available</ResultCount>
    </ResultPreview>
  </StepContainer>
);

export const RecurringSelectStep: React.FC<{
  filteredSessions: ClientRecurringSession[];
  selectedSessionIds: Set<number>;
  userCredits: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onToggleSession: (sessionId: number) => void;
}> = ({
  filteredSessions,
  selectedSessionIds,
  userCredits,
  onSelectAll,
  onClearSelection,
  onToggleSession,
}) => (
  <StepContainer>
    <StepHeader>
      <StepTitle>
        <Check size={20} />
        Select Sessions to Book
      </StepTitle>
      <SelectionActions>
        <SmallButton type="button" onClick={onSelectAll}>Select All</SmallButton>
        <SmallButton type="button" onClick={onClearSelection}>Clear</SmallButton>
      </SelectionActions>
    </StepHeader>

    <CreditsBadge>
      <SmallText secondary>Your Credits:</SmallText>
      <StrongBodyText>{userCredits}</StrongBodyText>
      <SmallText secondary>|</SmallText>
      <SmallText secondary>Selected:</SmallText>
      <SelectedCountText $active={selectedSessionIds.size > 0}>
        {selectedSessionIds.size}
      </SelectedCountText>
    </CreditsBadge>

    <SessionList>
      {filteredSessions.length === 0 ? (
        <EmptyState>
          <AlertCircle size={24} />
          <BodyText>No available sessions match your criteria</BodyText>
          <SmallText secondary>Try adjusting your filters</SmallText>
        </EmptyState>
      ) : (
        filteredSessions.map((session) => {
          const sessionDate = new Date(session.sessionDate);
          const isSelected = selectedSessionIds.has(session.id);

          return (
            <SessionCard
              key={session.id}
              type="button"
              $selected={isSelected}
              onClick={() => onToggleSession(session.id)}
            >
              <SessionCheckbox $checked={isSelected}>
                {isSelected && <Check size={14} />}
              </SessionCheckbox>
              <SessionInfo>
                <SessionDate>
                  <Calendar size={14} />
                  {formatSessionDay(sessionDate)}
                </SessionDate>
                <SessionTime>
                  <Clock size={14} />
                  {formatSessionTime(sessionDate)}
                  <span>({session.duration} min)</span>
                </SessionTime>
              </SessionInfo>
              <SessionMeta>
                {session.trainer && (
                  <SessionTrainer>
                    <User size={14} />
                    {session.trainer.firstName}
                  </SessionTrainer>
                )}
                <SessionLocation>
                  <MapPin size={14} />
                  {session.location || 'Main Studio'}
                </SessionLocation>
              </SessionMeta>
            </SessionCard>
          );
        })
      )}
    </SessionList>
  </StepContainer>
);

export const RecurringConfirmStep: React.FC<{
  selectedSessions: ClientRecurringSession[];
  selectedCount: number;
  creditsAfter: number;
}> = ({ selectedSessions, selectedCount, creditsAfter }) => (
  <StepContainer>
    <StepTitle>
      <Check size={20} />
      Confirm Recurring Booking
    </StepTitle>

    <ConfirmSummary>
      <SummaryRow>
        <SmallText secondary>Sessions to Book</SmallText>
        <SummaryValue $tone="default">{selectedCount}</SummaryValue>
      </SummaryRow>
      <SummaryRow>
        <SmallText secondary>Credits Used</SmallText>
        <SummaryValue $tone="danger">-{selectedCount}</SummaryValue>
      </SummaryRow>
      <SummaryDivider />
      <SummaryRow>
        <SmallText secondary>Credits Remaining</SmallText>
        <SummaryValue $tone={creditsAfter > 0 ? 'success' : 'danger'}>
          {creditsAfter}
        </SummaryValue>
      </SummaryRow>
    </ConfirmSummary>

    <ConfirmSessionList>
      <ConfirmListLabel secondary>Sessions you're booking:</ConfirmListLabel>
      {selectedSessions.map((session) => {
        const sessionDate = new Date(session.sessionDate);

        return (
          <ConfirmSessionItem key={session.id}>
            <span>{formatSessionDay(sessionDate)}</span>
            <span>{formatSessionTime(sessionDate)}</span>
          </ConfirmSessionItem>
        );
      })}
    </ConfirmSessionList>
  </StepContainer>
);
