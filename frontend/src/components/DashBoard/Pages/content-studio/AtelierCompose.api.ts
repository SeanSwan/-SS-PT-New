/**
 * Atelier Compose API client — mirrors `backend/routes/atelierComposeRoutes.mjs` exactly.
 *
 * THE HONESTY CONTRACT THIS CLIENT CARRIES: the backend reports each lane's real state
 * — `claimed` (built, never rendered a still, refuses until probed), `ready`, or
 * `switched off` with the variable that lifts it — and this client never flattens any
 * of that into a boolean. Every place a lane's `problems[]` is dropped, the UI starts
 * promising a capability the server will refuse.
 */

import { useCallback, useState } from 'react';
import type { AxiosInstance } from 'axios';

export type Lane = 'auto' | 'local' | 'hosted';
export type PromptSource = 'brief' | 'taste';
export type LawProfile = 'full' | 'universal';

export interface LocalLaneView {
  provider: string;
  status: 'claimed' | 'probed';
  ready: boolean;
  /** FALSE means the UI must not promise this lane. The server decides, not the pixels. */
  advertisable: boolean;
  problems: string[];
  probeEnvKey: string;
  unitUsd: number;
}

export interface HostedLaneView {
  enabled: boolean;
  spendEnvKey: string;
  limits: { maxRunsDaily: number; maxSpendUsdDaily: number };
}

export interface LimitsView {
  maxStills: number;
  lanes: { local: LocalLaneView; hosted: HostedLaneView };
  usage: { runs: number; spendUsd: number };
  ledger: string;
  enabled: boolean;
  note: string;
}

export interface CostView {
  count: number; model: string; unitUsd: number; totalUsd: number; chargedUsd?: number; lane?: Lane;
}

export interface StillView {
  index: number;
  lane: 'local' | 'hosted';
  image: { kind: 'b64'; data: string } | { kind: 'path'; path: string; mime: string };
  seed: number;
  promptHash: string;
  promptText: string;
  provider: string;
  sha256?: string;
  bytes?: number;
  /** Set when the still became a MediaAsset — the id the Motion rung will bind to. */
  assetId?: string | null;
  persist?: { ok: true; created: boolean } | { ok: false; code: string; message: string };
}

export interface StillFailure { index: number; code: string; message: string }

export interface PersistenceView { ok: boolean; persisted: number; total?: number; code?: string; message?: string }

export interface ComposeResult {
  lane: 'local' | 'hosted';
  promptSource: PromptSource;
  stills: StillView[];
  failures: StillFailure[];
  partial: boolean;
  replayed: boolean;
  cost: CostView;
  model: string;
  idempotencyKey: string;
  admission: { host: string; freeMb: number; neededMb: number } | null;
  persistence?: PersistenceView;
  tasteSeed?: number | null;
  lawRejected?: number;
  lawProfile?: LawProfile;
  clampedFrom?: number;
}

export interface ComposeRequest {
  brief: { text: string; intent?: string; aspect?: string };
  promptSource: PromptSource;
  lane: Lane;
  count: number;
  aspect?: string;
  lawProfile: LawProfile;
  cinematic?: boolean;
  seed?: number;
}

/** A refusal, with everything the server attached so the UI can say the real reason. */
export interface ComposeRefusal {
  code: string;
  message: string;
  status: number | null;
  retryAfterSec?: number;
  freeMb?: number;
  neededMb?: number;
}

const BASE = '/api/atelier/compose';

export function readRefusal(err: unknown, fallback: string): ComposeRefusal {
  const res = (err as { response?: { status?: number; data?: Record<string, unknown> } })?.response;
  const d = res?.data || {};
  return {
    code: typeof d.code === 'string' ? d.code : 'E_UNKNOWN',
    message: typeof d.error === 'string' ? d.error : fallback,
    status: res?.status ?? null,
    ...(typeof d.retryAfterSec === 'number' ? { retryAfterSec: d.retryAfterSec } : {}),
    ...(typeof d.freeMb === 'number' ? { freeMb: d.freeMb, neededMb: d.neededMb as number } : {}),
  };
}

/* ── Pure helpers (tested) — the words the UI is allowed to use ──────────── */

export type LaneTone = 'ready' | 'unproven' | 'off';

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

/* ── Motion ────────────────────────────────────────────────────────────────── */

export interface MotionStart {
  jobId: string; status: string; replayed: boolean; provider: string; attribution: string | null;
  bound: { assetId: string; sha256: string };
  startable: boolean; workerState: string | null; message: string; statusUrl: string;
}

/** Mirrors GET /api/content-studio/render-job/:id — the same shape the Render Queue polls. */
export interface MotionJobView {
  jobId: string; status: string; progress: number | null; errorCode: string | null; errorMessage: string | null;
  r2Key: string | null; attribution?: string | null; startable: boolean; workerState: string | null;
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

/* ── Hook ─────────────────────────────────────────────────────────────────── */

export function useAtelierCompose(api: AxiosInstance | null) {
  const [limits, setLimits] = useState<LimitsView | null>(null);
  const [estimate, setEstimate] = useState<{ cost: CostView; lane: Lane } | null>(null);
  const [result, setResult] = useState<ComposeResult | null>(null);
  const [refusal, setRefusal] = useState<ComposeRefusal | null>(null);
  const [busy, setBusy] = useState(false);

  const loadLimits = useCallback(async () => {
    if (!api) return;
    try {
      const { data } = await api.get(`${BASE}/limits`);
      setLimits(data?.data ?? null);
    } catch (err) {
      // Unreadable limits must not present as "both lanes off" — that is a different fact.
      setLimits(null);
      setRefusal(readRefusal(err, 'Could not read the lane state.'));
    }
  }, [api]);

  const runEstimate = useCallback(async (req: ComposeRequest) => {
    if (!api) return;
    try {
      const { data } = await api.post(`${BASE}/estimate`, req);
      setEstimate({ cost: data?.data?.cost, lane: data?.data?.lane });
      setRefusal(null);
    } catch (err) {
      setEstimate(null);
      setRefusal(readRefusal(err, 'Could not price this brief.'));
    }
  }, [api]);

  const compose = useCallback(async (req: ComposeRequest, idempotencyKey: string) => {
    if (!api) throw new Error('Not authenticated.');
    setBusy(true);
    setRefusal(null);
    try {
      const { data } = await api.post(`${BASE}/stills`, req, { headers: { 'Idempotency-Key': idempotencyKey } });
      const r = data?.data as ComposeResult;
      setResult(r);
      return r;
    } catch (err) {
      const rf = readRefusal(err, 'Compose failed.');
      setRefusal(rf);
      return null;
    } finally {
      setBusy(false);
    }
  }, [api]);

  const [motion, setMotion] = useState<MotionStart | null>(null);
  const [motionJob, setMotionJob] = useState<MotionJobView | null>(null);

  const startMotion = useCallback(async (still: StillView, opts: { prompt?: string; duration?: number } = {}) => {
    if (!api) throw new Error('Not authenticated.');
    const b = motionBindable(still);
    if (!b.ok) { setRefusal({ code: 'E_BIND_NO_ASSET', message: b.why, status: null }); return null; }
    setRefusal(null);
    try {
      const { data } = await api.post(`${BASE}/motion`, { assetId: still.assetId, sha256: still.sha256, ...opts },
        { headers: { 'Idempotency-Key': `motion-${still.assetId}-${still.sha256}` } });
      const m = data?.data as MotionStart;
      setMotion(m);
      setMotionJob({ jobId: m.jobId, status: m.status, progress: null, errorCode: null, errorMessage: null, r2Key: null, startable: m.startable, workerState: m.workerState });
      return m;
    } catch (err) {
      setRefusal(readRefusal(err, 'Motion could not be queued.'));
      return null;
    }
  }, [api]);

  const pollMotion = useCallback(async () => {
    if (!api || !motion?.statusUrl) return;
    try {
      const { data } = await api.get(motion.statusUrl);
      if (data?.data) setMotionJob(data.data as MotionJobView);
    } catch { /* one unreadable poll must not blank the job */ }
  }, [api, motion]);

  return { limits, estimate, result, refusal, busy, loadLimits, runEstimate, compose, setResult, motion, motionJob, startMotion, pollMotion };
}

export default useAtelierCompose;
