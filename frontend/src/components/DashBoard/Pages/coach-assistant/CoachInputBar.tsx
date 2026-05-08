/**
 * SUB-COMPONENT: CoachInputBar
 * PARENT: SwanCoachAssistantPage
 * PURPOSE: Composer for text, voice, attachments, TTS toggle, and oversized
 *          draft recovery into the canonical Coach intake queue.
 */
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Send, Volume2, VolumeX } from 'lucide-react';
import { InputBar, ChatInput, SendBtn, VoiceOrbWrap, TtsToggle } from './SwanCoachStyles';
import { ORB_ICON_SIZE_MAP, ORB_SIZE_MAP } from './SwanCoachConstants';
import CoachInputCancelPill from './CoachInputCancelPill';
import type { OrbSize } from './SwanCoachTypes';
import { useCoachBrowserSpeechInput, CANCEL_WINDOW_MS } from './hooks/useCoachBrowserSpeechInput';
import {
  CharCount,
  InputBarWrap,
  InputError,
  InputErrorAction,
  InputWrap,
} from './CoachInputBar.styles';
import {
  AI_CHAT_MESSAGE_MAX_CHARS,
  buildChatMessageTooLongError,
} from '../../../../hooks/aiMessageLimits';

const MAX_CHARS = AI_CHAT_MESSAGE_MAX_CHARS;

interface CoachInputBarProps {
  onSend: (text: string) => void;
  sending?: boolean;
  ttsEnabled?: boolean;
  ttsSupported?: boolean;
  onTtsToggle?: () => void;
  onVoiceOverlay?: () => void;
  onCreateIntakeDraft?: (text: string) => Promise<{ ok: boolean; message: string }>;
  attachButton?: React.ReactNode;
  externalText?: { text: string; seq: number } | null;
  hasAttachment?: boolean;
}

const CoachInputBarComponent: React.FC<CoachInputBarProps> = ({
  onSend,
  sending = false,
  ttsEnabled = false,
  ttsSupported = false,
  onTtsToggle,
  onVoiceOverlay,
  onCreateIntakeDraft,
  attachButton,
  externalText,
  hasAttachment = false,
}) => {
  const [text, setText] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [intakeDraftSaving, setIntakeDraftSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastInjectedSeqRef = useRef(-1);

  const {
    listening,
    interim,
    cancelPillVisible,
    clearInterim,
    handleCancelSend,
    speechSupported,
    toggleListening,
  } = useCoachBrowserSpeechInput({
    maxChars: MAX_CHARS,
    onSend,
    setText,
    setInputError,
  });

  const orbSize: OrbSize = typeof window !== 'undefined' && window.innerWidth < 768
    ? 'primary'
    : 'standard';

  const resizeInput = useCallback(() => {
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
      inputRef.current.focus();
    });
  }, []);

  useEffect(() => {
    if (!externalText || externalText.seq === lastInjectedSeqRef.current) return;
    lastInjectedSeqRef.current = externalText.seq;
    setText(externalText.text);
    setInputError(
      externalText.text.length > MAX_CHARS
        ? buildChatMessageTooLongError(externalText.text.length)
        : null,
    );
    resizeInput();
  }, [externalText, resizeInput]);

  const clearComposer = useCallback(() => {
    setText('');
    clearInterim();
    setInputError(null);
    inputRef.current?.focus();
  }, [clearInterim]);

  const handleSend = useCallback(() => {
    const msg = text.trim();
    if (sending) return;
    if (!msg && !hasAttachment) return;
    if (text.length > MAX_CHARS) {
      setInputError(buildChatMessageTooLongError(text.length));
      inputRef.current?.focus();
      return;
    }
    onSend(msg);
    clearComposer();
  }, [clearComposer, hasAttachment, onSend, sending, text]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key !== 'Enter') return;
    if (event.shiftKey && !event.metaKey && !event.ctrlKey) return;
    event.preventDefault();
    handleSend();
  }, [handleSend]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value;
    setText(nextValue);
    setInputError(
      nextValue.length > MAX_CHARS
        ? buildChatMessageTooLongError(nextValue.length)
        : null,
    );
    event.target.style.height = 'auto';
    event.target.style.height = `${Math.min(event.target.scrollHeight, 200)}px`;
  }, []);

  const handleCreateIntakeDraft = useCallback(async () => {
    if (!onCreateIntakeDraft || intakeDraftSaving || text.trim().length < 5) return;
    setIntakeDraftSaving(true);
    try {
      const result = await onCreateIntakeDraft(text.trim());
      setInputError(result.message);
      if (result.ok) {
        setText('');
        clearInterim();
      }
    } catch {
      setInputError('Coach intake draft could not be saved. Your note is still here.');
    } finally {
      setIntakeDraftSaving(false);
    }
  }, [clearInterim, intakeDraftSaving, onCreateIntakeDraft, text]);

  const handleVoiceClick = useCallback(() => {
    if (onVoiceOverlay) onVoiceOverlay();
    else toggleListening();
  }, [onVoiceOverlay, toggleListening]);

  const displayText = text || interim;
  const hasVoice = speechSupported || !!onVoiceOverlay;
  const overLimit = text.length > MAX_CHARS;

  return (
    <InputBarWrap>
      {cancelPillVisible && (
        <CoachInputCancelPill
          duration={CANCEL_WINDOW_MS}
          onCancel={handleCancelSend}
        />
      )}

      <InputBar>
        {ttsSupported && onTtsToggle && (
          <TtsToggle
            type="button"
            $active={ttsEnabled}
            onClick={onTtsToggle}
            aria-label={ttsEnabled ? 'Disable voice readback' : 'Enable voice readback'}
            title={ttsEnabled ? 'Voice readback ON' : 'Voice readback OFF'}
          >
            {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </TtsToggle>
        )}

        {attachButton}

        <InputWrap>
          <ChatInput
            ref={inputRef}
            value={displayText}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={listening ? 'Listening...' : 'Type or tap mic...'}
            disabled={sending}
            aria-label="Message input"
            rows={1}
            aria-invalid={overLimit}
            aria-describedby={inputError ? 'coach-input-error' : undefined}
          />
          {text.length > 100 && (
            <CharCount $near={text.length > MAX_CHARS * 0.9}>
              {text.length}/{MAX_CHARS}
            </CharCount>
          )}
        </InputWrap>

        {hasVoice && (
          <VoiceOrbWrap
            type="button"
            $listening={listening}
            $size={ORB_SIZE_MAP[orbSize]}
            onClick={handleVoiceClick}
            aria-label={listening ? 'Stop listening' : 'Start voice input'}
            title={listening ? 'Tap to stop' : 'Tap to speak'}
          >
            {listening
              ? <MicOff size={ORB_ICON_SIZE_MAP[orbSize]} />
              : <Mic size={ORB_ICON_SIZE_MAP[orbSize]} />}
          </VoiceOrbWrap>
        )}

        <SendBtn
          type="button"
          onClick={handleSend}
          disabled={(!text.trim() && !hasAttachment) || sending || overLimit}
          aria-label="Send message"
        >
          <Send size={20} />
        </SendBtn>
      </InputBar>

      {inputError && (
        <InputError id="coach-input-error" role="alert">
          {inputError}
          {overLimit && onCreateIntakeDraft && (
            <InputErrorAction
              type="button"
              onClick={handleCreateIntakeDraft}
              disabled={intakeDraftSaving}
            >
              {intakeDraftSaving ? 'Saving intake draft...' : 'Save as Coach intake draft'}
            </InputErrorAction>
          )}
        </InputError>
      )}
    </InputBarWrap>
  );
};

export const CoachInputBar = memo(CoachInputBarComponent);
