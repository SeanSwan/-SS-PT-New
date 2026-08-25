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
import { motionBindable, describeBlocker } from './AtelierCompose.words';
export * from './AtelierCompose.words';

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

/* ── Types shared with the words file ────────────────────────────────────── */

export type LaneTone = 'ready' | 'unproven' | 'off';

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

/* ── Publish ───────────────────────────────────────────────────────────────── */

export type ApprovalStatus = 'draft' | 'approved' | 'published';

export interface AssetReference {
  id: string; status: ApprovalStatus; r2Key: string; mime: string; width: number | null; height: number | null;
  sha256: string | null; attribution: string | null; attributionRequired: boolean; licence: string | null;
  blockers: string[]; readUrl: string | null; permalink?: string | null; snippet: string | null; withheld: string | null;
}

export interface PublishDeclaration { consentConfirmed: boolean; intendedUse: 'commercial' | 'personal'; note?: string }

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

  const [reference, setReference] = useState<AssetReference | null>(null);

  const loadReference = useCallback(async (assetId: string) => {
    if (!api) return null;
    try {
      const { data } = await api.get(`${BASE}/asset/${assetId}/reference`);
      const r = data?.data as AssetReference;
      setReference(r);
      return r;
    } catch (err) { setRefusal(readRefusal(err, 'Could not read the asset.')); return null; }
  }, [api]);

  const setStatus = useCallback(async (assetId: string, to: ApprovalStatus, declaration?: PublishDeclaration) => {
    if (!api) return null;
    setRefusal(null);
    try {
      await api.post(`${BASE}/asset/${assetId}/status`, { to, ...(declaration ? { declaration } : {}) });
      return loadReference(assetId);
    } catch (err) {
      const rf = readRefusal(err, 'Status change refused.');
      const blockers = (err as { response?: { data?: { blockers?: string[] } } })?.response?.data?.blockers;
      setRefusal(blockers?.length ? { ...rf, message: blockers.map(describeBlocker).join(' · ') } : rf);
      await loadReference(assetId);
      return null;
    }
  }, [api, loadReference]);

  return { limits, estimate, result, refusal, busy, loadLimits, runEstimate, compose, setResult, motion, motionJob, startMotion, pollMotion, reference, loadReference, setStatus, setReference };
}

export default useAtelierCompose;
