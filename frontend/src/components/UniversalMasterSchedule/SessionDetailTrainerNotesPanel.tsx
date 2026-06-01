/**
 * SessionDetailTrainerNotesPanel
 * ==============================
 * Editable trainer notes, rating, and client-facing feedback fields.
 */

import React from 'react';
import { FlexBox, FormField, Label, StyledInput, StyledTextarea } from './ui';
import { FlexibleFormField } from './SessionDetailModal.baseStyles';

export interface SessionDetailTrainerNotesPanelProps {
  notes: string;
  trainerRating: string;
  clientFeedback: string;
  canManage: boolean;
  onNotesChange: (value: string) => void;
  onTrainerRatingChange: (value: string) => void;
  onClientFeedbackChange: (value: string) => void;
}

const SessionDetailTrainerNotesPanel: React.FC<SessionDetailTrainerNotesPanelProps> = ({
  notes,
  trainerRating,
  clientFeedback,
  canManage,
  onNotesChange,
  onTrainerRatingChange,
  onClientFeedbackChange,
}) => (
  <>
    <FormField>
      <Label htmlFor="session-notes">Trainer Notes</Label>
      <StyledTextarea
        id="session-notes"
        value={notes}
        onChange={(event) => onNotesChange(event.target.value)}
        rows={3}
        disabled={!canManage}
        placeholder="Add notes from the session..."
      />
    </FormField>

    <FlexBox gap="1rem" wrap>
      <FlexibleFormField $flex={1} $minWidth="160px">
        <Label htmlFor="trainer-rating">Trainer Rating (1-5)</Label>
        <StyledInput
          id="trainer-rating"
          type="number"
          min={1}
          max={5}
          step={1}
          value={trainerRating}
          onChange={(event) => onTrainerRatingChange(event.target.value)}
          disabled={!canManage}
          placeholder="Optional"
        />
      </FlexibleFormField>

      <FlexibleFormField $flex={2} $minWidth="220px">
        <Label htmlFor="client-feedback">Client Feedback</Label>
        <StyledTextarea
          id="client-feedback"
          value={clientFeedback}
          onChange={(event) => onClientFeedbackChange(event.target.value)}
          rows={2}
          disabled={!canManage}
          placeholder="Share feedback for the client..."
        />
      </FlexibleFormField>
    </FlexBox>
  </>
);

export default SessionDetailTrainerNotesPanel;
