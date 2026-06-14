/**
 * SHARED HOOK: AITerminalPanel initial-prompt handoff.
 * PURPOSE: Allows trusted parent surfaces to turn an initial prompt into a
 * one-click send while keeping the default initial prompt reviewable.
 */

import { useEffect, useRef } from 'react';

interface UseInitialPromptAutoSendOptions {
  initialPrompt?: string;
  initialPromptSendImmediately?: boolean;
  sending: boolean;
  openPanel: () => void;
  sendTextToCoach: (rawText: string) => Promise<void>;
}

export const useInitialPromptAutoSend = ({
  initialPrompt,
  initialPromptSendImmediately,
  sending,
  openPanel,
  sendTextToCoach,
}: UseInitialPromptAutoSendOptions) => {
  const sentPromptRef = useRef('');

  useEffect(() => {
    const prompt = initialPrompt?.trim();
    if (!initialPromptSendImmediately || !prompt || sending || sentPromptRef.current === prompt) {
      return;
    }

    sentPromptRef.current = prompt;
    openPanel();
    void sendTextToCoach(prompt);
  }, [initialPrompt, initialPromptSendImmediately, openPanel, sendTextToCoach, sending]);
};
