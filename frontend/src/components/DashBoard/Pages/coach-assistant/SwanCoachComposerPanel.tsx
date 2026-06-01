/**
 * COMPONENT: SwanCoachComposerPanel
 * PURPOSE: Owns response style, voice settings, attachments, Neural Link, and
 * the Swan Coach composer controls.
 * DATA: Receives page-owned state and callbacks; performs no API calls.
 */

import React from 'react';
import AttachmentPreview from './AttachmentPreview';
import { CoachInputBar } from './CoachInputBar';
import FileAttachmentButton from './FileAttachmentButton';
import { ResponseStyleSelector } from './ResponseStyleSelector';
import VoiceSettingsBar from './VoiceSettingsBar';
import { hasTranscriptClassFile, type UseFileAttachmentReturn } from './hooks/useFileAttachment';
import type { UsePremiumTTSReturn } from './hooks/usePremiumTTS';
import type { ResponseStyle } from './SwanCoachTypes';
import { NeuralLinkPill } from './SwanCoachAssistantPage.styles';
import type { TranscriptProcessingState } from './hooks/useSwanCoachTranscriptReview';

type SendMessage = (text: string) => Promise<unknown> | unknown;
type CreateIntakeDraft = (text: string) => Promise<{ ok: boolean; message: string }>;

interface SwanCoachComposerPanelProps {
  attachments: UseFileAttachmentReturn;
  macroLinkActive: boolean;
  onCreateIntakeDraft: CreateIntakeDraft;
  onNeuralLink: () => Promise<void>;
  onOpenVoiceOverlay: () => void;
  onSend: SendMessage;
  pendingVoiceEdit: { text: string; seq: number } | null;
  responseStyle: ResponseStyle;
  sending: boolean;
  setResponseStyle: (style: ResponseStyle) => void;
  transcriptProcessing: TranscriptProcessingState;
  tts: UsePremiumTTSReturn;
}

const SwanCoachComposerPanel: React.FC<SwanCoachComposerPanelProps> = ({
  attachments,
  macroLinkActive,
  onCreateIntakeDraft,
  onNeuralLink,
  onOpenVoiceOverlay,
  onSend,
  pendingVoiceEdit,
  responseStyle,
  sending,
  setResponseStyle,
  transcriptProcessing,
  tts,
}) => {
  const inputLocked = sending || transcriptProcessing !== null;

  return (
    <>
      <ResponseStyleSelector
        activeStyle={responseStyle}
        onStyleChange={setResponseStyle}
      />

      <VoiceSettingsBar
        enabled={tts.enabled}
        speaking={tts.speaking}
        voice={tts.voice}
        voiceOptions={tts.voiceOptions}
        onToggle={tts.toggleEnabled}
        onVoiceChange={tts.setVoice}
      />

      <AttachmentPreview files={attachments.files} onRemove={attachments.removeFile} />

      <NeuralLinkPill
        type="button"
        $active={macroLinkActive}
        onClick={() => {
          void onNeuralLink();
        }}
        title="Pre-load macro nutrition context for AI responses"
      >
        Neural Link: Macro Context
      </NeuralLinkPill>

      <CoachInputBar
        onSend={(text) => {
          void onSend(text);
        }}
        sending={inputLocked}
        ttsEnabled={tts.enabled}
        ttsSupported={tts.supported}
        onTtsToggle={tts.toggleEnabled}
        onVoiceOverlay={onOpenVoiceOverlay}
        onCreateIntakeDraft={onCreateIntakeDraft}
        externalText={pendingVoiceEdit}
        hasAttachment={
          attachments.files.length > 0 && hasTranscriptClassFile(attachments.files)
        }
        attachButton={
          <FileAttachmentButton
            onFilesSelected={attachments.addFiles}
            inputRef={attachments.inputRef}
            disabled={inputLocked}
          />
        }
      />
    </>
  );
};

export default SwanCoachComposerPanel;
