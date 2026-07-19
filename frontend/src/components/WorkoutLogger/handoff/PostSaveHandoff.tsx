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
 * ║  A11Y   : real modal — initial focus, focus trap, Esc-to-close, focus restore, ║
 * ║           aria-labelledby the headline. Motion transform/opacity + reduced-mo. ║
 * ║  SAFETY : trainer-indispensability in NextBestActionCard; share owner-only.    ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
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

function subline(
  headline: string,
  p: { prDeltaLbs: number; sessionsThisWeek: number; streakWeeks: number; exerciseName: string },
): string {
  switch (headline) {
    case 'pr':
      // "a new best" (NOT "personal best"): pr is computed over the recent loaded window, not all-time
      // (the eyebrow states "LAST N SESSIONS"). See the data-truth note in workoutProofSeriesService.
      return `A new best — +${p.prDeltaLbs} lbs over your previous mark.`;
    case 'streak': {
      const weeks = Math.max(p.streakWeeks, 1);
      return `${p.sessionsThisWeek} sessions this week — your strongest run in ${weeks} ${weeks === 1 ? 'week' : 'weeks'}.`;
    }
    case 'first':
      // isFirstEver is per-EXERCISE (first proof-eligible log of THIS lift in the window), not the first
      // workout ever — so scope the copy to the exercise; never claim "first flight on record".
      return `First ${p.exerciseName} on record — every chart starts with one point.`;
    default:
      return `Session ${p.sessionsThisWeek} this week — logged and proven.`;
  }
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const PostSaveHandoff: React.FC<PostSaveHandoffProps> = ({
  data, viewerRole, pendingSync, enabled, onDismiss, onNavigate, onEvent,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  // Keep the latest onDismiss/onEvent without re-running the focus-trap effect (an inline callback would
  // otherwise thrash focus every parent render and defeat focus-restore).
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const shownRef = useRef(false); // fire handoff_shown exactly once per mount
  const headlineId = useId();
  const isOn = enabled ?? isPostSaveHandoffEnabled();
  const active = isOn && !!data?.proof;

  // Real modal machinery: capture focus, trap Tab, Esc to close, restore focus on unmount.
  useEffect(() => {
    if (!active) return undefined;
    // Analytics: fire exactly once when the handoff first becomes visible. Zero-PII — enums/booleans
    // only, never the free-text exercise name.
    if (!shownRef.current) {
      shownRef.current = true;
      onEventRef.current?.('handoff_shown', {
        headline: data.headline,
        viewerRole,
        pr: !!data.proof?.pr,
        isFirstEver: !!data.proof?.isFirstEver,
      });
    }
    const previouslyFocused = (typeof document !== 'undefined' ? document.activeElement : null) as HTMLElement | null;
    const node = overlayRef.current;
    const focusables = () =>
      node ? Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.hasAttribute('disabled')) : [];
    (focusables()[0] || node)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onDismissRef.current?.(); return; }
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [active]);

  if (!active) return null;
  if (typeof document === 'undefined') return null; // portal target unavailable (SSR)

  const { proof, nba, share, headline } = data;
  // `active` (line above) already gated on data.proof, but a stored boolean doesn't flow TS narrowing
  // back to `proof` (now ProofSeries | null). Re-assert so the proof zone is null-safe for tsc + runtime.
  if (!proof) return null;
  // pendingSync is a CLIENT concern injected by the shell; fall back to data.pendingSync for back-compat.
  const showPendingSync = pendingSync ?? data.pendingSync ?? false;
  const chips = [
    proof.totalVolumeLbs ? `VOL ${fmt(proof.totalVolumeLbs)} LB` : null,
    proof.exerciseCount ? `${proof.exerciseCount} ${proof.exerciseCount === 1 ? 'EXERCISE' : 'EXERCISES'}` : null,
    proof.durationMin ? `${proof.durationMin} MIN` : null,
  ].filter(Boolean) as string[];

  const chartLabel = `${proof.exerciseName} estimated one-rep max`
    + (proof.todayE1rm != null ? `, ${proof.todayE1rm} pounds today` : '')
    + `, across ${proof.points.length} logged ${proof.points.length === 1 ? 'session' : 'sessions'}`
    + (proof.pr ? ' — a new best.' : '.');

  // Portal to <body> so the modal layers cleanly OVER SaveSuccessPanel regardless of any ancestor
  // transform/stacking context in the logger tree (translateZ traps fixed overlays — CLAUDE.md gotcha).
  return createPortal(
    <Overlay ref={overlayRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={headlineId}>
      <Card>
        {/* ── Zone 1 — declaration ── */}
        <ZoneDecl>
          <Headline id={headlineId}>Flight logged.</Headline>
          <Subline>{subline(headline, proof)}</Subline>
        </ZoneDecl>

        {/* ── Zone 2 — proof ── */}
        <ZoneProof>
          <Eyebrow $tone="data">
            {`EST. 1-REP MAX · ${proof.exerciseName.toUpperCase()} · LAST ${proof.points.length} SESSION${proof.points.length === 1 ? '' : 'S'}`}
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
            {showPendingSync && <PendingChip>PENDING SYNC</PendingChip>}
            <ProofChart points={proof.points} pr={proof.pr} ariaLabel={chartLabel} />
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
    </Overlay>,
    document.body,
  );
};

export default PostSaveHandoff;
