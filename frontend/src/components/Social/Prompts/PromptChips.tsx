/**
 * COMPONENT: PromptChips
 * PURPOSE: S4 composer nudge — one tap fills the composer with today's prompt
 *          (MEGA-BLUEPRINT §6 S4).
 *
 * WHAT IT DOES: reads GET /api/social/prompt-of-the-day (which never 404s — the server
 * falls back to a curated prompt) and renders a single chip. Tapping it prefills the
 * composer text so the member edits a thought instead of facing a blank box.
 *
 * REUSES MoodChip from the existing composer vocabulary — no new visual class (rule 27
 * companion posture). If the lookup fails entirely the chip simply does not render: a
 * nudge is ambient and must never block posting.
 */
import React, { useEffect, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { MoodChip } from '../../UserDashboard/components/ClientDashboardHome.feedStyles';

interface PromptChipsProps {
  /** Prefills the composer. Never auto-submits — the member always edits first. */
  onPick: (promptText: string) => void;
}

interface PromptOfTheDay {
  chipLabel: string;
  promptText: string;
  source: 'scheduled' | 'fallback';
}

const PromptChips: React.FC<PromptChipsProps> = ({ onPick }) => {
  const { authAxios } = useAuth();
  const [prompt, setPrompt] = useState<PromptOfTheDay | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authAxios.get('/api/social/prompt-of-the-day');
        if (!cancelled) setPrompt(res.data?.prompt ?? null);
      } catch {
        if (!cancelled) setPrompt(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authAxios]);

  if (!prompt?.promptText) return null;

  return (
    <MoodChip
      type="button"
      title={prompt.promptText}
      aria-label={`Use today's prompt: ${prompt.promptText}`}
      onClick={() => onPick(prompt.promptText)}
    >
      <Lightbulb size={13} aria-hidden="true" /> {prompt.chipLabel}
    </MoodChip>
  );
};

export default PromptChips;
