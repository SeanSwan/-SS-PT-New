/**
 * WorkoutLoggerVoiceImport.tsx
 * ==============================
 * Phase 3c.3 (launch charter P1-6): the voice/file import section, extracted
 * from the WorkoutLogger shell and UN-GATED for client self-mode.
 *
 * Previously trainers/admins only (`!isClientSelfMode`). Clients can now
 * dictate their own workouts — the backend enforces SELF-ONLY scope
 * (workoutLogUploadRoutes resolveVoiceUploadScope: client/user roles 403 on
 * any other clientId), and the parser is Rule-8 clean (name never sent to the
 * parse LLM; transcript PII-redacted before parsing). HONESTY BOUNDARY
 * (Rule 75, 2026-07-31): raw AUDIO necessarily reaches the transcription
 * provider before any redaction can exist — the disclosure copy states the
 * transcript-level redaction and must never claim more. Self-mode shows that
 * privacy disclosure inline — uploading is the consent act for the user's
 * OWN data.
 */
import React from 'react';
import VoiceMemoUpload, { type ParsedWorkout } from './VoiceMemoUpload';
import { VoiceImportHeader, VoiceImportPanel } from './WorkoutLogger.styles';

export interface WorkoutLoggerVoiceImportProps {
  clientId: number;
  isSelfMode: boolean;
  /** Display-only; omitted in self mode (the uploader labels it "your workout"). */
  clientName?: string;
  onParsed: (parsed: ParsedWorkout) => void;
}

const WorkoutLoggerVoiceImport: React.FC<WorkoutLoggerVoiceImportProps> = ({
  clientId,
  isSelfMode,
  clientName,
  onParsed,
}) => (
  <VoiceImportPanel aria-label="Voice and file workout import">
    <VoiceImportHeader>
      <h2>{isSelfMode ? 'Speak your workout' : 'Voice or file import'}</h2>
      <p>
        {isSelfMode
          ? 'Upload a voice memo or file of your workout. Audio is transcribed securely, names and personal details are removed from the transcript before analysis, and you review every parsed exercise before it is applied.'
          : 'Upload audio, text, CSV, or PDF. Review parsed exercises before applying.'}
      </p>
    </VoiceImportHeader>
    <VoiceMemoUpload
      clientId={clientId}
      clientName={isSelfMode ? undefined : clientName}
      onParsed={onParsed}
    />
  </VoiceImportPanel>
);

export default WorkoutLoggerVoiceImport;
