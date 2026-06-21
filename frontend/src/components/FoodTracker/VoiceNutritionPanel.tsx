/**
 * ============================================================================
 * FILE: VoiceNutritionPanel.tsx
 * PURPOSE: Slice 1.6 — "Speak a meal." Say (or type) what you ate, Swan Coach
 *          drafts the foods + macros, you review/edit, then it saves to your log.
 * ============================================================================
 *
 * FLOW: dictate/type -> POST /api/meal-plans/parse-voice (parser redacts the
 * transcript before any LLM — Rule 8, client never named to the model) -> draft
 * meals -> adapt to MealPlanApproveSavePanel (REUSED: editable, idempotent,
 * partial-failure-safe save to /api/macros, Decision #2 lighter self-serve).
 *
 * CARE-FIRST: every saved row is an AI estimate (verified:false) the client
 * reviewed. Low-confidence drafts surface the model's follow-up questions so the
 * user can correct before saving, never a silent wrong guess.
 *
 * HOW IT FITS: NutritionWorkspace -> "Speak a Meal" tab -> VoiceNutritionPanel
 */
import React, { useState } from 'react';
import styled from 'styled-components';
import { Mic, Square, Sparkles, Loader2, AlertTriangle, RotateCcw, HelpCircle } from 'lucide-react';
import apiService from '../../services/api.service';
import { useNutritionDictation } from './useNutritionDictation';
import { voiceDraftToMealPlan } from './mealPhotoLog';
import type { MealPlanInput } from './MealPlanApproveSavePanel.logic';
import MealPlanApproveSavePanel from './MealPlanApproveSavePanel';

interface VoiceNutritionPanelProps {
  onDataSent?: (success: boolean) => void;
}

const VoiceNutritionPanel: React.FC<VoiceNutritionPanelProps> = ({ onDataSent }) => {
  const [transcript, setTranscript] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [plan, setPlan] = useState<MealPlanInput | null>(null);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [lowConfidence, setLowConfidence] = useState(false);

  const { listening, toggle, supported } = useNutritionDictation(
    (text) => setTranscript((prev) => (prev ? `${prev} ${text}` : text)),
  );

  const handleDraft = async () => {
    const text = transcript.trim();
    if (text.length < 3) {
      setParseError('Say or type a bit more about what you ate.');
      return;
    }
    setParsing(true);
    setParseError('');
    try {
      const res = await apiService.post('/api/meal-plans/parse-voice', { transcript: text });
      const draft = res?.data?.draft || {};
      const mealPlan = voiceDraftToMealPlan(draft.meals);
      if (!mealPlan.meals || mealPlan.meals.length === 0) {
        setParseError('We could not pick out any foods from that. Try naming what you ate.');
        return;
      }
      setFollowUps(Array.isArray(draft.followUpQuestions) ? draft.followUpQuestions : []);
      setLowConfidence(Boolean(draft.lowConfidence));
      setPlan(mealPlan);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setParseError(status === 422
        ? 'We could not pick out any foods from that. Try naming what you ate.'
        : status === 503
          ? 'Voice meal logging is temporarily unavailable.'
          : status === 402
            ? 'Speak a Meal requires Swan Guardian. Upgrade to use voice meal logging.'
            : 'Could not understand that meal. Please try again.');
    } finally {
      setParsing(false);
    }
  };

  const handleReset = () => {
    setPlan(null);
    setTranscript('');
    setFollowUps([]);
    setLowConfidence(false);
    setParseError('');
  };

  return (
    <Panel>
      <Head>
        <Sparkles size={18} />
        <div>
          <Title>Speak a Meal</Title>
          <Copy>Say what you ate — Swan Coach drafts the foods and macros, you review, then it saves.</Copy>
        </div>
      </Head>

      {!plan && (
        <>
          <Box
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="e.g. I had a chicken burrito bowl with rice and beans, and a banana"
            aria-label="What did you eat?"
            rows={3}
            disabled={parsing}
          />
          <Row>
            {supported && (
              <MicBtn type="button" onClick={toggle} $on={listening} disabled={parsing} aria-pressed={listening}>
                {listening ? <><Square size={16} /> Stop</> : <><Mic size={16} /> Speak</>}
              </MicBtn>
            )}
            <DraftBtn type="button" onClick={handleDraft} disabled={parsing || transcript.trim().length < 3} aria-busy={parsing}>
              {parsing ? <><Loader2 size={16} className="spin" /> Drafting...</> : <><Sparkles size={16} /> Draft my meal</>}
            </DraftBtn>
          </Row>
          {!supported && <Hint>Voice input isn't available in this browser - type your meal above.</Hint>}
          {parseError && <Status $error role="alert" aria-live="assertive"><AlertTriangle size={14} /> {parseError}</Status>}
        </>
      )}

      {plan && (
        <>
          {lowConfidence && (
            <Status $warn role="status" aria-live="polite"><AlertTriangle size={14} /> Some of this is a rough estimate - please check the numbers before saving.</Status>
          )}
          {followUps.length > 0 && (
            <FollowUps>
              {followUps.map((q, i) => (
                <li key={i}><HelpCircle size={13} /> {q}</li>
              ))}
            </FollowUps>
          )}
          <MealPlanApproveSavePanel plan={plan} onSaved={onDataSent} />
          <ResetBtn type="button" onClick={handleReset}><RotateCcw size={14} /> Log another meal</ResetBtn>
        </>
      )}
    </Panel>
  );
};

export default VoiceNutritionPanel;

// ─────────────────────────────────────────────────────────────
// SECTION: Styles (Crystalline Swan tokens, dark-first, 44px targets)
// ─────────────────────────────────────────────────────────────
const Panel = styled.section`
  display: flex; flex-direction: column; gap: 0.75rem;
  padding: 14px; border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 82%, transparent);
`;
const Head = styled.div`display: flex; gap: 10px; color: var(--accent-primary, #60C0F0);`;
const Title = styled.h4`margin: 0; color: var(--text-primary, #E0ECF4); font-size: 0.95rem;`;
const Copy = styled.p`margin: 2px 0 0; color: var(--text-secondary, rgba(224,236,244,0.68)); font-size: 0.8rem;`;
const Box = styled.textarea`
  width: 100%; min-height: 76px; padding: 10px; border-radius: 10px; resize: vertical;
  background: var(--bg-base, #0A0A0F); color: var(--text-primary, #E0ECF4);
  border: 1px solid var(--border-soft, rgba(96,192,240,0.2)); font: inherit; font-size: 0.9rem;
`;
const Row = styled.div`display: flex; gap: 0.6rem; flex-wrap: wrap;`;
const MicBtn = styled.button<{ $on?: boolean }>`
  min-height: 44px; display: inline-flex; align-items: center; gap: 0.4rem; padding: 0 1rem;
  border-radius: 12px; cursor: pointer; font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  background: ${({ $on }) => ($on ? 'color-mix(in srgb, var(--accent-error, #C92A54) 24%, transparent)' : 'var(--card-dark, #141419)')};
  border: 1px solid ${({ $on }) => ($on ? 'var(--accent-error, #C92A54)' : 'var(--border-soft, rgba(96,192,240,0.25))')};
  &:disabled { opacity: 0.55; cursor: not-allowed; }
`;
const DraftBtn = styled.button`
  min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  padding: 0 1.1rem; border-radius: 12px; cursor: pointer; font-weight: 700; color: var(--text-inverse, #0F172A);
  background: linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0));
  border: 1px solid transparent;
  &:disabled { opacity: 0.55; cursor: not-allowed; }
  .spin { animation: vn-spin 1s linear infinite; }
  @keyframes vn-spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
`;
const Hint = styled.p`margin: 0; color: var(--text-secondary, rgba(224,236,244,0.6)); font-size: 0.78rem;`;
const FollowUps = styled.ul`
  margin: 0; padding: 0 0 0 2px; list-style: none; display: flex; flex-direction: column; gap: 4px;
  li { display: flex; align-items: center; gap: 6px; color: var(--accent-gold, #C6A84B); font-size: 0.82rem; }
`;
const ResetBtn = styled.button`
  align-self: flex-start; min-height: 44px; display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0 0.9rem; border-radius: 10px; cursor: pointer; background: transparent;
  color: var(--text-secondary, #A0B0C0); border: 1px solid var(--border-soft, rgba(96,192,240,0.2));
`;
const Status = styled.div<{ $error?: boolean; $warn?: boolean }>`
  display: flex; align-items: center; gap: 0.4rem; font-size: 0.82rem;
  color: ${({ $error, $warn }) => ($error ? 'var(--accent-error, #C92A54)' : $warn ? 'var(--accent-gold, #C6A84B)' : 'var(--accent-primary, #60C0F0)')};
`;
