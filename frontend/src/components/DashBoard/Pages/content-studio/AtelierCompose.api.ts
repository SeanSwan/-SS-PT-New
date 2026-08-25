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
import type {
  Lane, PromptSource, LawProfile, LocalLaneView, HostedLaneView, LimitsView, CostView, StillView,
  StillFailure, PersistenceView, ComposeResult, ComposeRequest, ComposeRefusal, MotionStart, MotionJobView,
  BatchAccepted, BatchSnapshot, AssetReference, ApprovalStatus, PublishDeclaration, LaneTone,
} from './AtelierCompose.types';
export * from './AtelierCompose.types';
import { motionBindable, describeBlocker } from './AtelierCompose.words';
export * from './AtelierCompose.words';

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

/* ── Motion ────────────────────────────────────────────────────────────────── */

/* ── Publish ───────────────────────────────────────────────────────────────── */

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

  const [batch, setBatch] = useState<BatchSnapshot | null>(null);

  const compose = useCallback(async (req: ComposeRequest, idempotencyKey: string) => {
    if (!api) throw new Error('Not authenticated.');
    setBusy(true);
    setRefusal(null);
    setBatch(null);
    try {
      const { data } = await api.post(`${BASE}/stills`, req, { headers: { 'Idempotency-Key': idempotencyKey } });
      const d = data?.data as ComposeResult | BatchAccepted;
      if ((d as BatchAccepted).accepted) {
        // Local lane: nothing has rendered yet. Show an honest empty batch and poll.
        const a = d as BatchAccepted;
        setBatch({ batchId: a.batchId, lane: 'local', status: 'queued', count: a.count, promptSource: a.promptSource, model: a.cost.model,
          stills: [], failures: [], persistence: null, rendered: 0, error: null, startedAt: Date.now(), finishedAt: null, terminal: false });
        setResult(null);
        return null;
      }
      const r = d as ComposeResult;
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

  /** Poll a local batch; when it turns terminal, promote the snapshot into `result` so the grid renders it. */
  const pollBatch = useCallback(async () => {
    if (!api || !batch || batch.terminal) return;
    try {
      const { data } = await api.get(`${BASE}/stills/${batch.batchId}`);
      const snap = data?.data as BatchSnapshot;
      setBatch(snap);
      if (snap.terminal) {
        setResult({ lane: 'local', promptSource: snap.promptSource, stills: snap.stills, failures: snap.failures,
          partial: snap.status === 'partial', replayed: false, cost: { count: snap.count, model: snap.model, unitUsd: 0, totalUsd: 0, chargedUsd: 0 },
          model: snap.model, idempotencyKey: snap.batchId, admission: null, persistence: snap.persistence ?? undefined });
      }
    } catch (err) {
      const rf = readRefusal(err, 'Could not read the batch.');
      if (rf.code === 'E_BATCH_NOT_FOUND') { setBatch((b) => (b ? { ...b, status: 'failed', terminal: true, error: { code: rf.code, message: rf.message } } : b)); setRefusal(rf); }
    }
  }, [api, batch]);

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

  return { limits, estimate, result, refusal, busy, loadLimits, runEstimate, compose, setResult, motion, motionJob, startMotion, pollMotion, reference, loadReference, setStatus, setReference, batch, pollBatch };
}

export default useAtelierCompose;
