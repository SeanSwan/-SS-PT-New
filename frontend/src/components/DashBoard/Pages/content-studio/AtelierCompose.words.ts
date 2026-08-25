/**
 * AtelierCompose.words.ts — the words the Compose UI is allowed to use.
 *
 * Pure, tested helpers that turn server truth into on-screen text. Split from the
 * API client when it crossed the 300-line cap; the client re-exports everything here
 * so existing imports keep working. Nothing in this file talks to a network.
 */

import type {
  LocalLaneView, HostedLaneView, LimitsView, CostView, StillView, ComposeRefusal, Lane,
  MotionJobView, ApprovalStatus, LaneTone,
} from './AtelierCompose.api';

/* ── Pure helpers (tested) — the words the UI is allowed to use ──────────── */

/**
 * The local lane's honest label. `claimed` is NOT a fault — it is a lane that has
 * never been proven, and the fix is a probe, not a repair. Gold, never red.
 */
export function describeLocalLane(l: LocalLaneView | null): { tone: LaneTone; text: string; fix: string | null } {
  if (!l) return { tone: 'off', text: 'Local lane · unknown', fix: null };
  if (l.ready) return { tone: 'ready', text: `Local lane · ready · $0 · ${l.provider}`, fix: null };
  if (l.status !== 'probed') {
    return {
      tone: 'unproven',
      text: 'Local lane · unproven — no still has been rendered on this machine yet',
      fix: `Run the probe (SWA-207), then set ${l.probeEnvKey}=probed`,
    };
  }
  return { tone: 'off', text: 'Local lane · not configured', fix: l.problems[0] || null };
}

export function describeHostedLane(h: HostedLaneView | null): { tone: LaneTone; text: string; fix: string | null } {
  if (!h) return { tone: 'off', text: 'Hosted lane · unknown', fix: null };
  if (h.enabled) return { tone: 'ready', text: `Hosted lane · on · cap $${h.limits.maxSpendUsdDaily.toFixed(2)}/day`, fix: null };
  return { tone: 'off', text: 'Hosted lane · switched off', fix: `Set ${h.spendEnvKey} to a real number to enable it` };
}

/** A lane the server will refuse must not be offered as if it will run. */
export function laneOfferable(lane: Lane, limits: LimitsView | null): boolean {
  if (!limits) return false;
  if (lane === 'local') return limits.lanes.local.ready;
  if (lane === 'hosted') return limits.lanes.hosted.enabled;
  return limits.lanes.local.ready || limits.lanes.hosted.enabled;
}

export function formatCost(c: CostView | null): string {
  if (!c) return '—';
  if (c.totalUsd === 0) return '$0.00 · local';
  return `$${c.totalUsd.toFixed(4)} · ${c.count} × $${c.unitUsd.toFixed(4)}`;
}

/** The asset chip on a still card: saved (with the id to bind to) or the reason it was not. */
export function describePersist(s: StillView): { saved: boolean; text: string } {
  if (s.assetId) return { saved: true, text: `asset ${s.assetId.slice(0, 8)}` };
  if (s.persist && s.persist.ok === false) return { saved: false, text: `not saved · ${s.persist.code}` };
  return { saved: false, text: 'not saved' };
}

/** What a still card can show. A local path is not loadable by a browser — say so, never fake an <img>. */
export function stillSrc(s: StillView): { src: string | null; note: string | null } {
  if (s.image.kind === 'b64') {
    const d = s.image.data;
    return { src: /^https?:\/\//i.test(d) ? d : `data:image/png;base64,${d}`, note: null };
  }
  return { src: null, note: `Saved on the render machine: ${s.image.path}` };
}

/** A still can be sent to Motion only when it is a persisted asset with a hash to bind. */
export function motionBindable(s: StillView | null): { ok: boolean; why: string } {
  if (!s) return { ok: false, why: 'Select a frame first.' };
  if (!s.assetId || !s.sha256) return { ok: false, why: 'This frame was not saved as an asset, so there is nothing to bind to.' };
  return { ok: true, why: '' };
}

/** Honest words for a Motion job. "queued" alone is never shown when nothing can pick it up. */
export function describeMotionJob(j: MotionJobView | null): { tone: 'working' | 'blocked' | 'ready' | 'failed' | 'idle'; text: string } {
  if (!j) return { tone: 'idle', text: '' };
  if (j.status === 'ready') return { tone: 'ready', text: 'Motion rendered' };
  if (j.status === 'failed' || j.status === 'cancelled') {
    return { tone: 'failed', text: `Motion ${j.status}${j.errorCode ? ` · ${j.errorCode}` : ''}${j.errorMessage ? ` — ${j.errorMessage}` : ''}` };
  }
  if (j.status === 'queued' && !j.startable) {
    const reason = j.workerState === 'NO_WORKER_ENROLLED' ? 'no render machine connected'
      : j.workerState === 'NO_WORKER_ONLINE' ? 'the render machine is offline'
        : j.workerState === 'NO_WORKER_WITH_CAPABILITY' ? 'no capable worker' : 'nothing can pick this up yet';
    return { tone: 'blocked', text: `Queued · ${reason}` };
  }
  return { tone: 'working', text: `${j.status}${typeof j.progress === 'number' ? ` · ${j.progress}%` : ''}` };
}

/** The one next step for an asset, and the words for it. A draft cannot be published; approve first. */
export function nextPublishStep(status: ApprovalStatus | null): { to: ApprovalStatus; label: string } | null {
  if (status === 'draft') return { to: 'approved', label: 'Approve' };
  if (status === 'approved') return { to: 'published', label: 'Publish' };
  return null;
}

/** Blockers are shown as their own lines — a publish refused for consent must say consent, not "error". */
export function describeBlocker(b: string): string {
  const [code, ...rest] = b.split(':');
  const detail = rest.join(':').trim();
  const head = code === 'E_CONSENT_UNCONFIRMED' ? 'Consent not confirmed'
    : code === 'E_ATTRIBUTION_MISSING' ? 'Attribution required but missing'
      : code === 'E_LICENCE_GRANT_REQUIRED' ? 'Licence grant required for commercial use'
        : code === 'E_NO_PROVENANCE' ? 'No provenance record' : code;
  return detail ? `${head} — ${detail}` : head;
}
