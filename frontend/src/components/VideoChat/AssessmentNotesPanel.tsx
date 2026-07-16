/**
 * ┌─── COMPONENT: AssessmentNotesPanel ────────────────────────┐
 * │ PURPOSE: Slide-over panel during video call showing client  │
 * │ assessment history, trainer notes input, and saved          │
 * │ annotations from freeze frame captures.                    │
 * │ CEO RULING: Quick access to client history within call.    │
 * └────────────────────────────────────────────────────────────┘
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { FileText, X, Save, Clock } from 'lucide-react';
import { StyledBox } from '@/components/ui/StyledBox';

const Panel = styled.div<{ $open: boolean }>`
  position: fixed;
  top: 0;
  right: 0;
  width: 360px;
  max-width: 90vw;
  height: 100vh;
  z-index: 1050;
  background: var(--bg-base, #0A0A0F);
  border-left: 1px solid rgba(96, 192, 240, 0.15);
  transform: translateX(${({ $open }) => $open ? '0' : '100%'});
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid rgba(96, 192, 240, 0.12);
`;

const PanelTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CloseBtn = styled.button`
  min-width: 44px;
  min-height: 44px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover { background: rgba(96, 192, 240, 0.08); }
`;

const PanelBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
`;

const NotesArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(96, 192, 240, 0.12);
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  margin-bottom: 12px;

  &:focus { border-color: var(--accent-secondary, #8B5CF6); }
  &::placeholder { color: rgba(224, 236, 244, 0.5); }
`;

const SaveBtn = styled.button`
  width: 100%;
  min-height: 44px;
  padding: 10px 16px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6));
  color: #fff;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 20px;

  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.5; }
`;

const SectionLabel = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  margin-bottom: 8px;
  margin-top: 16px;
`;

const AnnotationThumb = styled.div`
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-elevated, #141419);
  border: 1px solid rgba(96, 192, 240, 0.12);
  margin-bottom: 8px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const EmptyHistory = styled.div`
  padding: 24px;
  text-align: center;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  font-family: 'Sora', sans-serif;
  font-size: 13px;
`;

const HistoryItem = styled.div`
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--bg-elevated, #141419);
  border: 1px solid rgba(96, 192, 240, 0.06);
  margin-bottom: 6px;
`;

const HistoryMeta = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
`;

const HistoryNote = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-primary, #E0ECF4);
`;

interface AssessmentNotesPanelProps {
  open: boolean;
  onClose: () => void;
  videoSessionId: number;
  notes: string;
  onNotesChange: (notes: string) => void;
  onSaveNotes: () => void;
  annotations: string[]; // Array of data URLs from freeze frames
  previousSessions?: Array<{
    id: number;
    date: string;
    type: string;
    notes: string;
  }>;
}

const AssessmentNotesPanel: React.FC<AssessmentNotesPanelProps> = ({
  open, onClose, videoSessionId: _videoSessionId, notes, onNotesChange, onSaveNotes,
  annotations, previousSessions = [],
}) => {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSaveNotes();
    setSaving(false);
  };

  return (
    <Panel $open={open}>
      <PanelHeader>
        <PanelTitle><FileText size={18} /> Session Notes</PanelTitle>
        <CloseBtn onClick={onClose}><X size={18} /></CloseBtn>
      </PanelHeader>

      <PanelBody>
        <SectionLabel>Current Session Notes</SectionLabel>
        <NotesArea
          value={notes}
          onChange={e => onNotesChange(e.target.value)}
          placeholder="Movement observations, form corrections, recommendations..."
        />
        <SaveBtn onClick={handleSave} disabled={saving}>
          <Save size={14} /> {saving ? 'Saving...' : 'Save Notes'}
        </SaveBtn>

        {annotations.length > 0 && (
          <>
            <SectionLabel>Annotations ({annotations.length})</SectionLabel>
            {annotations.map((url, i) => (
              <AnnotationThumb key={i}>
                <img src={url} alt={`Annotation ${i + 1}`} />
              </AnnotationThumb>
            ))}
          </>
        )}

        <SectionLabel>Previous Sessions</SectionLabel>
        {previousSessions.length === 0 ? (
          <EmptyHistory>
            <StyledBox as={Clock} size={24} $style={{ opacity: 0.4, marginBottom: 8 }} />
            <div>No previous assessment sessions</div>
          </EmptyHistory>
        ) : (
          previousSessions.map(session => (
            <HistoryItem key={session.id}>
              <HistoryMeta>
                <Clock size={12} />
                {new Date(session.date).toLocaleDateString()} — {session.type}
              </HistoryMeta>
              <HistoryNote>{session.notes || 'No notes recorded'}</HistoryNote>
            </HistoryItem>
          ))
        )}
      </PanelBody>
    </Panel>
  );
};

export default AssessmentNotesPanel;
