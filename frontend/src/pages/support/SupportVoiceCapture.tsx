/**
 * BLUEPRINT: SwanStudios Voice-First Support Capture
 * PURPOSE: Let a member dictate into one editable report field at a time.
 * DATA FLOW: Browser speech recognition -> local transcript -> controlled draft.
 * SAFETY: Never auto-submits and never uploads audio from this component.
 */
import { Mic, Square } from 'lucide-react';
import React, { useEffect } from 'react';

import type { GuidedField } from './supportReportDraft';
import {
  MicButton,
  TargetLabel,
  TargetSelect,
  Transcript,
  VoiceAlert,
  VoiceCopy,
  VoiceEyebrow,
  VoicePanel,
  VoiceTitle,
} from './SupportVoiceCapture.styles';
import { useSupportDictation } from './useSupportDictation';

interface Props {
  target: GuidedField;
  onTargetChange: (target: GuidedField) => void;
  onAppend: (target: GuidedField, text: string) => void;
  disabled?: boolean;
}

const targetLabels: Record<GuidedField, string> = {
  description: 'What happened',
  expectedBehavior: 'What you expected',
  impact: 'How it affected you',
  steps: 'Steps to repeat it',
};

const SupportVoiceCapture: React.FC<Props> = ({
  target,
  onTargetChange,
  onAppend,
  disabled = false,
}) => {
  const dictation = useSupportDictation((text) => onAppend(target, text));
  const { cancel } = dictation;

  useEffect(() => {
    if (disabled) cancel();
  }, [cancel, disabled]);

  return (
    <VoicePanel aria-labelledby="support-voice-title">
      <VoiceEyebrow>Primary reporting option</VoiceEyebrow>
      <VoiceTitle id="support-voice-title">Talk it through with Swan Coach</VoiceTitle>
      <VoiceCopy>When available, your browser keeps speech recognition on this device. SwanStudios does not save the audio, and nothing is sent until you review and choose Send report.</VoiceCopy>
      {!dictation.supported ? (
        <VoiceAlert role="status">Private on-device dictation is not available in this browser. Use the editable form or your device keyboard dictation.</VoiceAlert>
      ) : (
        <>
          <TargetLabel htmlFor="support-voice-target">
            Where should Swan Coach write next?
            <TargetSelect
              id="support-voice-target"
              value={target}
              onChange={(event) => onTargetChange(event.target.value as GuidedField)}
              disabled={disabled || dictation.listening}
            >
              {Object.entries(targetLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </TargetSelect>
          </TargetLabel>
          <MicButton
            type="button"
            onClick={dictation.toggle}
            disabled={disabled}
            $listening={dictation.listening}
            aria-pressed={dictation.listening}
            aria-describedby="support-voice-status"
            aria-label={dictation.listening ? 'Stop listening' : 'Start talking'}
          >
            {dictation.listening ? <Square size={20} aria-hidden="true" /> : <Mic size={22} aria-hidden="true" />}
            {dictation.listening ? 'Stop listening' : 'Start talking'}
          </MicButton>
          <Transcript id="support-voice-status" role="status" aria-live="polite">
            {dictation.interim || (dictation.listening ? 'Listening… speak naturally.' : `Ready for: ${targetLabels[target]}`)}
          </Transcript>
          {dictation.error && <VoiceAlert role="alert">{dictation.error}</VoiceAlert>}
        </>
      )}
    </VoicePanel>
  );
};

export default SupportVoiceCapture;
