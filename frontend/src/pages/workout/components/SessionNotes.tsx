import React from 'react';
import styled from 'styled-components';

interface SessionNotesProps {
  notes: string;
  onChange: (notes: string) => void;
}

const SessionNotes: React.FC<SessionNotesProps> = ({
  notes,
  onChange
}) => {
  return (
    <NotesContainer>
      <NotesHeader>
        <h3>Trainer Notes</h3>
      </NotesHeader>
      
      <NotesTextarea
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add notes about this workout session, specific instructions, or observations about the client's progress..."
        rows={6}
      />
      
      <NotesTips>
        <TipsHeader>Recommended information to include:</TipsHeader>
        <TipsList>
          <TipItem>Client's current fitness level and goals</TipItem>
          <TipItem>Any modifications needed for specific exercises</TipItem>
          <TipItem>Areas to focus on form and technique</TipItem>
          <TipItem>Progression plan for future sessions</TipItem>
        </TipsList>
      </NotesTips>
    </NotesContainer>
  );
};

// Styled components
const NotesContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
`;

const NotesHeader = styled.div`
  h3 {
    margin: 0;
    font-size: 16px;
  }
`;

const NotesTextarea = styled.textarea`
  width: 100%;
  padding: 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: #80bdff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }
`;

const NotesTips = styled.div`
  background-color: rgba(255, 243, 205, 0.5);
  border: 1px solid #ffeeba;
  border-radius: 4px;
  padding: 12px;
`;

const TipsHeader = styled.div`
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
  color: #856404;
`;

const TipsList = styled.ul`
  margin: 0;
  padding-left: 20px;
`;

const TipItem = styled.li`
  font-size: 13px;
  color: #856404;
  margin-bottom: 4px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

export default SessionNotes;