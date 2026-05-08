/**
 * ============================================================================
 * FILE: SwanCoachActionLauncher.tsx
 * PURPOSE: Local voice/text action draft surface for Swan Coach on Home.
 * AUTHOR: Codex GPT-5 | CREATED: 2026-05-08
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Lets elite/admin/trainer users capture an action intent
 * by voice or text, review it locally, and then open Swan Coach or Progress.
 *
 * HOW IT FITS IN THE APP: Rendered by HomeTab after SwanCoachDock. It is a UI
 * bridge only: no API call, no workout save, and no public sharing happens here.
 *
 * KEY DECISIONS:
 * - Voice capture uses browser SpeechRecognition only when available.
 * - Text entry remains the fallback for unsupported browsers or weak devices.
 * - Receipts explicitly say nothing was saved or sent.
 * - No PII leaves the browser in this slice.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ArrowRight, BarChart2, CheckCircle2, Mic, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ActionForm,
  ButtonRow,
  CoachMark,
  Description,
  DraftInput,
  Eyebrow,
  InputRow,
  LauncherIntro,
  LauncherShell,
  MicButton,
  PrimaryButton,
  Receipt,
  ReceiptCopy,
  ReceiptTitle,
  SecondaryButton,
  StatusLine,
  Title,
} from './SwanCoachActionLauncher.styles';
import { getSwanCoachDashboardPath } from './swanCoachDashboardRoute';

interface SwanCoachActionLauncherProps {
  userName: string;
  userRole?: string | null;
  streakDays: number;
  level: number;
  onTabChange: (tab: string) => void;
}

interface ReceiptState {
  text: string;
  time: string;
}

function getRecognitionCtor() {
  if (typeof window === 'undefined') return null;
  const candidate = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return typeof candidate === 'function' ? candidate : null;
}

function summarizeContext(streakDays: number, level: number) {
  if (streakDays > 0) return `${streakDays}-day rhythm, Level ${level}`;
  return `Level ${level}, ready for first logged action`;
}

const SwanCoachActionLauncher: React.FC<SwanCoachActionLauncherProps> = ({
  userName,
  userRole,
  streakDays,
  level,
  onTabChange,
}) => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const recognitionRef = useRef<any>(null);
  const [draft, setDraft] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('Speak or type a workout note, goal, or coach question.');
  const [receipt, setReceipt] = useState<ReceiptState | null>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort?.();
      recognitionRef.current = null;
    };
  }, []);

  const handleMic = () => {
    if (isListening) {
      recognitionRef.current?.stop?.();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = getRecognitionCtor();
    if (!SpeechRecognition) {
      setStatus('Voice capture is not available in this browser. Type the action instead.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = navigator.language || 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results || [])
        .map((result: any) => result?.[0]?.transcript || '')
        .join(' ')
        .trim();
      if (transcript) setDraft(transcript);
      setStatus('Transcript captured. Review it before anything changes.');
    };

    recognition.onerror = () => {
      setStatus('Voice capture stopped. Type the action instead.');
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);
    try {
      recognition.start();
      setIsListening(true);
      setStatus('Listening. Say one clear action for Swan Coach to review.');
    } catch {
      recognition.abort?.();
      recognitionRef.current = null;
      setIsListening(false);
      setStatus('Voice capture could not start. Type the action instead.');
    }
  };

  const handlePrepare = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanDraft = draft.trim();
    if (!cleanDraft) {
      setStatus('Add a short action first. Nothing was saved.');
      return;
    }

    setReceipt({
      text: cleanDraft,
      time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    });
    setStatus('Review receipt created locally. Nothing was saved or sent.');
  };

  return (
    <LauncherShell
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.12 }}
      aria-label="Swan Coach action launcher"
    >
      <LauncherIntro>
        <CoachMark $listening={isListening} aria-hidden="true">
          <Sparkles size={20} />
        </CoachMark>
        <div>
          <Eyebrow>Swan Coach Action</Eyebrow>
          <Title>{userName}, capture the next move.</Title>
          <Description>
            Dictate or type one action. Swan keeps it in review mode first, so no workout,
            post, or private note changes until you choose the next step.
          </Description>
          <Description>{summarizeContext(streakDays, level)}</Description>
        </div>
      </LauncherIntro>

      <ActionForm onSubmit={handlePrepare}>
        <InputRow>
          <DraftInput
            aria-label="Swan Coach action draft"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Example: Log a 30-minute strength session, then ask what changed in my progress."
          />
          <MicButton
            type="button"
            $listening={isListening}
            onClick={handleMic}
            aria-pressed={isListening}
            aria-label={isListening ? 'Stop voice capture' : 'Start voice capture'}
          >
            <Mic size={19} />
          </MicButton>
        </InputRow>

        <ButtonRow>
          <PrimaryButton type="submit">
            <CheckCircle2 size={16} />
            Review Action
          </PrimaryButton>
          <SecondaryButton type="button" onClick={() => navigate(getSwanCoachDashboardPath(userRole))}>
            Open Swan Coach
            <ArrowRight size={15} />
          </SecondaryButton>
          <SecondaryButton type="button" onClick={() => onTabChange('progress')}>
            <BarChart2 size={15} />
            Progress
          </SecondaryButton>
        </ButtonRow>

        <StatusLine aria-live="polite">{status}</StatusLine>

        {receipt && (
          <Receipt aria-label="Local action receipt">
            <ReceiptTitle>Local review receipt - {receipt.time}</ReceiptTitle>
            <ReceiptCopy>{receipt.text}</ReceiptCopy>
            <ReceiptCopy>No data was saved, posted, or sent to an AI provider from this card.</ReceiptCopy>
          </Receipt>
        )}
      </ActionForm>
    </LauncherShell>
  );
};

export default SwanCoachActionLauncher;
