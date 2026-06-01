import React from 'react';
import { NotesContainer, NotesHeader, NotesTextarea } from './SessionNotes.styles';

interface SessionNotesProps {
  notes: string;
  onChange: (notes: string) => void;
}

const SessionNotes: React.FC<SessionNotesProps> = ({ notes, onChange }) => (
  <NotesContainer>
    <NotesHeader>
      <h3>Trainer Notes</h3>
    </NotesHeader>
    <NotesTextarea
      value={notes}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Instructions, modifications, form cues, progression notes..."
      rows={6}
    />
  </NotesContainer>
);

export default SessionNotes;
