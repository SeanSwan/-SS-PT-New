/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  PostSaveHandoff.tsx — the Post-Save Handoff signature (Slice 1, UI only)      ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  PURPOSE: the terminal state of a workout save — proof + next action + share,  ║
 * ║           one screen, zero extra taps (Fable's Build #1; Kimi 4.2 §d spec).    ║
 * ║  DATA   : renders a server-assembled HandoffData (proof from REAL logs, NBA    ║
 * ║           server-resolved). Pure/presentational — no fetch, no save-gate touch.║
 * ║  GATE   : feature-flagged (postSaveHandoffFlag). Ships DARK until Slice 2      ║
 * ║           wires it into each role's verified save path.                        ║
 * ║  SAFETY : trainer-indispensability enforced in NextBestActionCard; share is    ║
 * ║           owner-only. Motion transform/opacity only + reduced-motion static.   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
import React from 'react';
import {
  Overlay, Card, ZoneDecl, ZoneProof, ZoneNba,
  Headline, Subline, Eyebrow, BigNumeral, GoldPulse,
  ChipRow, Chip, ChartWrap, PendingChip, DoneButton,
} from './PostSaveHandoff.styles';
import ProofChart from './ProofChart';
import NextBestActionCard from './NextBestActionCard';
import ShareProofButton from './ShareProofButton';
import { isPostSaveHandoffEnabled } from './postSaveHandoffFlag';
import type { PostSaveHandoffProps } from './workoutHandoff.types';

const fmt = (n: number) => n.toLocaleString('en-US');

function subline(headline: string, p: { prDeltaLbs: number; sessionsThisWeek: number; streakWeeks: number }): string {
  switch (headline) {
    case 'pr':
      return `A new personal best — +${p.prDeltaLbs} lbs over your previous mark.`;
    case 'streak':
      return `${p.sessionsThisWeek} sessions this week — your strongest run in ${Math.max(p.streakWeeks, 1)} weeks.`;
    case 'first':
      return 'First flight on record — every chart starts with one point.';
    default:
      return `Session ${p.sessionsThisWeek} this week — logged and proven.`;
  }
}

const PostSaveHandoff: React.FC<PostSaveHandoffProps> = ({
  data, viewerRole, enabled, onDismiss, onNavigate, onEvent,
}) => {
  const isOn = enabled ?? isPostSaveHandoffEnabled();
  if (!isOn || !data?.proof) return null;

  const { proof, nba, share, headline, pendingSync } = data;
  const chips = [
    proof.totalVolumeLbs ? `VOL ${fmt(proof.totalVolumeLbs)} LB` : null,
    proof.exerciseCount ? `${proof.exerciseCount} EXERCISES` : null,
    proof.durationMin ? `${proof.durationMin} MIN` : null,
  ].filter(Boolean) as string[];

  return (
    <Overlay role="dialog" aria-modal="true" aria-label="Workout logged">
      <Card>
        {/* ── Zone 1 — declaration ── */}
        <ZoneDecl>
          <Headline>Flight logged.</Headline>
          <Subline>{subline(headline, proof)}</Subline>
        </ZoneDecl>

        {/* ── Zone 2 — proof ── */}
        <ZoneProof>
          <Eyebrow $tone="data">
            {`EST. 1-REP MAX · ${proof.exerciseName.toUpperCase()} · LAST ${proof.points.length} SESSIONS`}
          </Eyebrow>
          {proof.todayE1rm != null && (
            <BigNumeral $pr={proof.pr}>
              {proof.pr && <GoldPulse aria-hidden="true" />}
              {fmt(proof.todayE1rm)}
            </BigNumeral>
          )}
          {chips.length > 0 && (
            <ChipRow>{chips.map((c) => <Chip key={c}>{c}</Chip>)}</ChipRow>
          )}
          <ChartWrap>
            {pendingSync && <PendingChip>PENDING SYNC</PendingChip>}
            <ProofChart points={proof.points} pr={proof.pr} />
          </ChartWrap>
        </ZoneProof>

        {/* ── Zone 3 — next best action + share ── */}
        <ZoneNba>
          <NextBestActionCard nba={nba} viewerRole={viewerRole} onNavigate={onNavigate} onEvent={onEvent} />
          <ShareProofButton
            share={share}
            exerciseName={proof.exerciseName}
            todayE1rm={proof.todayE1rm}
            pr={proof.pr}
            onEvent={onEvent}
          />
          <DoneButton type="button" onClick={onDismiss}>Done</DoneButton>
        </ZoneNba>
      </Card>
    </Overlay>
  );
};

export default PostSaveHandoff;
