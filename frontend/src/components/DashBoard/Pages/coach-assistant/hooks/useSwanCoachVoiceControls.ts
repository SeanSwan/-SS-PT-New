import { useCallback, useEffect, useRef, useState } from 'react';

import { usePremiumTTS } from './usePremiumTTS';

type CoachVoiceMessage = {
  content: string;
  id: string;
  role: string;
};

type VoiceCoachApi = {
  messages: CoachVoiceMessage[];
  sendMessage: (text: string) => Promise<unknown>;
};

export function useSwanCoachVoiceControls({ coach }: { coach: VoiceCoachApi }) {
  const tts = usePremiumTTS();
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  const [pendingVoiceEdit, setPendingVoiceEdit] = useState<{ text: string; seq: number } | null>(null);
  const lastMsgRef = useRef<string>('');

  const injectInputText = useCallback((text: string) => {
    setPendingVoiceEdit(prev => ({ text, seq: (prev?.seq ?? 0) + 1 }));
  }, []);

  const handleReadAloud = useCallback((text: string) => {
    tts.speak(text);
  }, [tts]);

  useEffect(() => {
    if (!tts.enabled || !coach.messages.length || voiceOverlayOpen) return;
    const lastMsg = coach.messages[coach.messages.length - 1];
    if (lastMsg.role === 'assistant' && lastMsg.id !== lastMsgRef.current && lastMsg.id !== 'welcome') {
      lastMsgRef.current = lastMsg.id;
      tts.speak(lastMsg.content);
    }
  }, [coach.messages, tts, voiceOverlayOpen]);

  const handleOpenVoiceOverlay = useCallback(() => setVoiceOverlayOpen(true), []);
  const handleCloseVoiceOverlay = useCallback(() => setVoiceOverlayOpen(false), []);

  const handleVoiceTranscribed = useCallback(async (text: string) => {
    const result = await coach.sendMessage(text);
    if (result && typeof result === 'object' && 'failed' in result && result.failed) {
      const original = 'originalMessage' in result && typeof result.originalMessage === 'string'
        ? result.originalMessage
        : text;
      injectInputText(original);
    }
    setVoiceOverlayOpen(false);
  }, [coach, injectInputText]);

  const handleVoiceEditTranscript = useCallback((text: string) => {
    injectInputText(text);
    setVoiceOverlayOpen(false);
  }, [injectInputText]);

  useEffect(() => () => tts.stop(), [tts]);

  return {
    handleCloseVoiceOverlay,
    handleOpenVoiceOverlay,
    handleReadAloud,
    handleVoiceEditTranscript,
    handleVoiceTranscribed,
    injectInputText,
    pendingVoiceEdit,
    tts,
    voiceOverlayOpen,
  };
}

export default useSwanCoachVoiceControls;
