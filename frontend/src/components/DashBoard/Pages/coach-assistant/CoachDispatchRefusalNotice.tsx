/**
 * SUB-COMPONENT: CoachDispatchRefusalNotice
 * PARENT: CoachMessage
 * PURPOSE: The "charming no" (Cortex directive §13.5.9) — renders dispatches
 * the server refused for safety/registry reasons (§5.4). A refusal stays a
 * refusal; this component only makes it warm: what was held, why in plain
 * words, and eligible swaps to reach for instead. Wing Purple accent per the
 * ratified design fold; tone stays calm and non-clinical.
 */
import React from 'react';
import styled from 'styled-components';
import { ShieldCheck } from 'lucide-react';
import type { CoachDispatchRefusal } from './SwanCoachTypes';

const NoticeCard = styled.div`
  margin-top: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--surface-elevated, #003080);
  border-left: 3px solid var(--accent-glow, #8B5CF6);
  background: var(--card-dark, #141419);
`;

const NoticeHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 14px;
  color: var(--accent-glow, #8B5CF6);
`;

const NoticeBody = styled.p`
  margin: 0 0 8px;
  font-family: 'Sora', sans-serif;
  font-size: 15px;
  line-height: 1.5;
  color: var(--text-primary, #E0ECF4);
`;

const AlternativeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const AlternativeChip = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 4px 12px;
  border-radius: 16px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--accent-primary, #60C0F0);
  border: 1px solid var(--accent-primary, #60C0F0);
  background: transparent;
`;

const REFUSAL_COPY: Record<string, (refusal: CoachDispatchRefusal) => string> = {
  PAIN_EXCLUDED: r =>
    `I held off on adding ${r.exerciseName ?? 'that exercise'} — it works an area flagged by an active pain report, and safety wins that argument every time.`,
  EXERCISE_NOT_IN_REGISTRY: r =>
    `I couldn't match ${r.exerciseName ?? 'that exercise'} to the approved exercise library, so it stayed out of the form rather than guessing.`,
  SAFETY_DATA_UNAVAILABLE: r =>
    `I held ${r.exerciseName ?? 'that addition'} because the safety data I check first couldn't be loaded — better a short wait than a wrong guess.`,
};

const refusalCopy = (refusal: CoachDispatchRefusal): string =>
  (REFUSAL_COPY[refusal.code] ?? (() => `I held ${refusal.exerciseName ?? 'that addition'}: ${refusal.reason}.`))(refusal);

interface CoachDispatchRefusalNoticeProps {
  refusals: CoachDispatchRefusal[];
}

const CoachDispatchRefusalNotice: React.FC<CoachDispatchRefusalNoticeProps> = ({ refusals }) => {
  if (!refusals || refusals.length === 0) return null;
  return (
    <>
      {refusals.map((refusal, index) => (
        <NoticeCard key={`${index}-${refusal.code}-${refusal.exerciseName ?? ''}`} role="note">
          <NoticeHeader>
            <ShieldCheck size={16} aria-hidden="true" />
            Held for safety
          </NoticeHeader>
          <NoticeBody>{refusalCopy(refusal)}</NoticeBody>
          {(refusal.alternatives ?? []).length > 0 && (
            <>
              <NoticeBody as="span" style={{ fontSize: 13, opacity: 0.8 }}>
                Good swaps instead:
              </NoticeBody>
              <AlternativeRow>
                {(refusal.alternatives ?? []).map((name, altIndex) => (
                  <AlternativeChip key={`${altIndex}-${name}`}>{name}</AlternativeChip>
                ))}
              </AlternativeRow>
            </>
          )}
        </NoticeCard>
      ))}
    </>
  );
};

export default CoachDispatchRefusalNotice;
