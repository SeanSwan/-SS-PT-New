/**
 * FILE: CoachVoiceRecapCard.tsx
 * PURPOSE: "This week, in plain words" — a deterministic coach-voice recap of
 *          the client's real logged week, on the client home.
 *
 * WHY: launch panel 2026-08-03 (Kimi Q2 #1 / Q1 #3): non-technical premium
 * clients feel value in sentences, not axes. This is a PURE FUNCTION of
 * HomeTrainingProof (real logged sessions) — zero AI, zero fabrication.
 *
 * GUARDRAILS (doctrine: real-data-only):
 * - Every sentence is dropped when its data point is absent — never renders
 *   "undefined", "—", or a fabricated value mid-sentence.
 * - Renders NOTHING for a zero-workout week with no history (the zero-history
 *   orientation strip owns that state) and NOTHING while sessions load.
 * - Large type (18px), WCAG-conscious contrast, no motion.
 */
import React from 'react';
import styled from 'styled-components';
import { Quote } from 'lucide-react';
import type { HomeTrainingProof } from './HomeTabProofViewModel';

const Card = styled.section`
  padding: 18px 22px;
  margin: 0;
  border-radius: 16px;
  background: linear-gradient(
    135deg,
    var(--surface-elevated, #003080) 0%,
    var(--bg-primary, #002060) 100%
  );
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 30%, transparent);
`;

const Kicker = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent-gold, #C6A84B);
  margin-bottom: 8px;
`;

const RecapText = styled.p`
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.125rem;
  line-height: 1.55;
  color: var(--text-primary, #E0ECF4);
`;

/**
 * Deterministic sentence builder. Exported for direct unit testing.
 * Returns null when there is nothing truthful to say.
 */
export function buildCoachVoiceRecap(proof: HomeTrainingProof): string | null {
  const sentences: string[] = [];
  const count = proof.thisWeekCount;

  if (count > 0) {
    const minutesPart = proof.minutesThisWeek > 0
      ? ` for ${proof.minutesThisWeek} focused minutes`
      : '';
    sentences.push(`You trained ${count} time${count === 1 ? '' : 's'} this week${minutesPart}.`);

    if (proof.weekDelta != null && proof.weekDelta > 0) {
      sentences.push(`That's ${proof.weekDelta} more than last week — momentum is building.`);
    } else if (proof.weekDelta === 0) {
      sentences.push('Same rhythm as last week — consistency is the win.');
    }
  } else if (proof.lastSession) {
    // No workout yet this week, but real history exists — anchor to the truth
    // without shaming.
    sentences.push(`Your last logged session was ${proof.lastSession.title} (${proof.lastSession.when}).`);
    sentences.push('This week is still open — one session restarts the rhythm.');
  } else {
    // Zero history — the orientation strip owns this state.
    return null;
  }

  return sentences.join(' ');
}

interface Props {
  proof: HomeTrainingProof;
  /** gate on the session fetch being settled — never recap a loading week */
  settled: boolean;
}

const CoachVoiceRecapCard: React.FC<Props> = ({ proof, settled }) => {
  if (!settled) return null;
  const recap = buildCoachVoiceRecap(proof);
  if (!recap) return null;

  return (
    <Card data-testid="coach-voice-recap-card">
      <Kicker><Quote size={13} aria-hidden="true" /> This week, in plain words</Kicker>
      <RecapText>{recap}</RecapText>
    </Card>
  );
};

export default CoachVoiceRecapCard;
