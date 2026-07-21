/**
 * WorkoutLoggerHandoffMount.tsx — Post-Save Handoff mount seam (Slice-2, Chunk C).
 * ------------------------------------------------------------------------------
 * Encapsulates the handoff lifecycle so WorkoutLogger stays lean (Rule 4): owns the dismiss state
 * (reset per NEW save via `saveKey`), the fail-safe role map, and the zero-PII analytics dispatch.
 * Renders <PostSaveHandoff> — which self-gates on the feature flag and portals to <body> — OVER the
 * existing SaveSuccessPanel; dismissing it reveals the panel beneath (the trainer summary action is
 * preserved). Renders nothing until the server actually returned a handoff payload.
 */
import React, { useCallback, useEffect, useState } from 'react';
import PostSaveHandoff from './PostSaveHandoff';
import { usePostSaveHandoffFlag } from './usePostSaveHandoffFlag';
import type { HandoffData, LoggerRole } from './workoutHandoff.types';

/**
 * Frontend mirror of the backend `safeAssemble` fail-closed contract: a handoff RENDER error must never
 * crash the logger AFTER a committed save. On any error it degrades to null (SaveSuccessPanel shows) —
 * the save is already safe; the terminal proof is best-effort, exactly like the server side.
 */
class HandoffErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { /* swallow — best-effort; the save UX must not break on a handoff render error */ }
  render() { return this.state.failed ? null : this.props.children; }
}

interface WorkoutLoggerHandoffMountProps {
  /** The server-assembled handoff for the just-saved session (null/undefined → nothing renders). */
  handoff: HandoffData | null | undefined;
  /** Changes per save (the saved form id) → resets the dismiss state so a fresh handoff shows. */
  saveKey: string | number | null | undefined;
  /** Raw auth role; mapped fail-closed to a LoggerRole (unknown → 'client', never a trainerOnly leak). */
  userRole: string | undefined;
  /** Offline-queue online flag; drives the PENDING SYNC chip when false. */
  isOnline: boolean;
  onNavigate: (href: string) => void;
  /** Viewer personalization (owner-scoped downstream; rendered client-side only — zero-PII posture). */
  viewerFirstName?: string | null;
  viewerHandle?: string | null;
}

const mapRole = (role: string | undefined): LoggerRole =>
  role === 'trainer' ? 'trainer' : role === 'admin' ? 'admin' : 'client';

const WorkoutLoggerHandoffMount: React.FC<WorkoutLoggerHandoffMountProps> = ({
  handoff, saveKey, userRole, isOnline, onNavigate, viewerFirstName, viewerHandle,
}) => {
  const [dismissed, setDismissed] = useState(false);
  // Runtime Launch Control flag (admin board) → QA override → VITE build fallback. Passing it as
  // `enabled` means the admin switch works with NO rebuild; the server gates the payload regardless.
  const flagOn = usePostSaveHandoffFlag();
  // Reset on each new save (keyed on the form id, not object identity) so the next handoff shows.
  useEffect(() => { setDismissed(false); }, [saveKey]);

  const onEvent = useCallback((event: string, payload?: Record<string, unknown>) => {
    // Zero-PII analytics seam: window CustomEvent (mirrors dispatchWorkoutLogged) — enums/booleans only,
    // never the free-text exercise name. A future listener consumes 'swan:handoff-analytics'.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('swan:handoff-analytics', { detail: { event, ...(payload || {}) } }));
    }
  }, []);

  if (!handoff || dismissed) return null;

  return (
    // Key on saveKey: a NEW successful save (even one landing while a prior handoff is still open, e.g.
    // via the AI_SUBMIT_WORKOUT bridge) forces a full remount → fresh handoff_shown + mount animation,
    // and resets the boundary if a prior render had failed.
    <HandoffErrorBoundary key={saveKey ?? 'handoff'}>
      <PostSaveHandoff
        data={handoff}
        enabled={flagOn}
        viewerRole={mapRole(userRole)}
        pendingSync={!isOnline}
        onDismiss={() => setDismissed(true)}
        onNavigate={onNavigate}
        onEvent={onEvent}
        viewerFirstName={viewerFirstName}
        viewerHandle={viewerHandle}
      />
    </HandoffErrorBoundary>
  );
};

export default WorkoutLoggerHandoffMount;
