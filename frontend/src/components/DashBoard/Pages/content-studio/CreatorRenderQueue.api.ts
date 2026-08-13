/**
 * Render queue API client.
 *
 * Mirrors the backend's honesty contract exactly. The server deliberately reports WHY a
 * job cannot start (no worker enrolled / none online / none capable) instead of returning
 * a bare "queued", because the endpoint this replaced used to answer `success: true,
 * status: 'waiting'` while rendering nothing. This client must not flatten that back into
 * a boolean — every place `startable` is dropped, the lie comes back.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AxiosInstance } from 'axios';

/** Mirrors `describePresence` in backend/services/renderWorkerPresence.mjs. */
export type WorkerState =
  | 'NO_WORKER_ENROLLED'
  | 'NO_WORKER_ONLINE'
  | 'NO_WORKER_WITH_CAPABILITY'
  | 'WORKER_ONLINE';

export type JobStatus = 'queued' | 'leased' | 'rendering' | 'ready' | 'failed' | 'cancelled';

export interface RenderJobView {
  jobId: string;
  status: JobStatus;
  progress: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  r2Key: string | null;
  /** FALSE means nothing can pick this up right now. Never render motion when false. */
  startable: boolean;
  workerState: WorkerState | null;
}

export interface EnrolledAgent {
  id: string;
  label: string;
  capabilities: string[];
}

/**
 * The token is returned by the server EXACTLY ONCE and is unrecoverable afterwards.
 * It is deliberately never persisted to localStorage/sessionStorage here: a credential
 * that can lease jobs and report completions does not belong in web storage, where any
 * XSS on the admin dashboard would read it back out.
 */
export interface EnrolResult {
  agent: EnrolledAgent;
  token: string;
}

const BASE = '/api/content-studio';
const AGENTS = '/api/render-agents';

function readError(err: unknown, fallback: string): string {
  const res = (err as { response?: { data?: { error?: string } } })?.response;
  return res?.data?.error || fallback;
}

export function useRenderQueue(api: AxiosInstance | null) {
  const [jobs, setJobs] = useState<RenderJobView[]>([]);
  const [workerState, setWorkerState] = useState<WorkerState | null>(null);
  const [liveWorkers, setLiveWorkers] = useState<number | null>(null);
  const [enrolledWorkers, setEnrolledWorkers] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Job ids are held here rather than fetched as a list because the backend exposes
  // per-job polling only. Surfacing that limit honestly beats inventing a list endpoint
  // in the client and pretending the queue is fully enumerable.
  const trackedIds = useRef<string[]>([]);

  const refresh = useCallback(async () => {
    if (!api || trackedIds.current.length === 0) return;
    setLoading(true);
    try {
      const results = await Promise.all(
        trackedIds.current.map(async (id) => {
          try {
            const { data } = await api.get(`${BASE}/render-job/${id}`);
            return data?.data as RenderJobView;
          } catch {
            return null;    // a single unreadable job must not blank the whole queue
          }
        }),
      );
      const next = results.filter(Boolean) as RenderJobView[];
      setJobs(next);
      // Presence rides along on every job read, so the strip stays current without a
      // second endpoint. Only queued jobs carry a meaningful workerState.
      const withState = next.find((j) => j.workerState);
      if (withState?.workerState) setWorkerState(withState.workerState);
      setError(null);
    } catch (err) {
      setError(readError(err, 'Could not refresh the queue.'));
    } finally {
      setLoading(false);
    }
  }, [api]);

  const track = useCallback((jobId: string) => {
    if (!trackedIds.current.includes(jobId)) trackedIds.current = [jobId, ...trackedIds.current];
  }, []);

  const queueSync = useCallback(async (referencePath: string, targetPath: string) => {
    if (!api) throw new Error('Not authenticated.');
    setError(null);
    try {
      const { data } = await api.post(`${BASE}/sync-job`, { referencePath, targetPath });
      const d = data?.data;
      if (d?.jobId) {
        track(d.jobId);
        if (d.workerState) setWorkerState(d.workerState);
        setJobs((prev) => [{
          jobId: d.jobId,
          status: d.status ?? 'queued',
          progress: null,
          errorCode: null,
          errorMessage: null,
          r2Key: null,
          startable: Boolean(d.startable),
          workerState: d.workerState ?? null,
        }, ...prev.filter((j) => j.jobId !== d.jobId)]);
      }
      return { message: data?.message as string, startable: Boolean(d?.startable) };
    } catch (err) {
      const msg = readError(err, 'Could not queue the sync job.');
      setError(msg);
      throw new Error(msg);
    }
  }, [api, track]);

  const enrol = useCallback(async (
    id: string, label: string, capabilities: string[],
  ): Promise<EnrolResult> => {
    if (!api) throw new Error('Not authenticated.');
    setError(null);
    try {
      const { data } = await api.post(`${AGENTS}/enrol`, { id, label, capabilities });
      const d = data?.data;
      if (!d?.token) throw new Error('The server did not return a token.');
      setEnrolledWorkers((n) => (n ?? 0) + 1);
      // Enrolled is not online. The worker still has to check in, and claiming otherwise
      // here would be the same false-progress bug at the client layer.
      setWorkerState('NO_WORKER_ONLINE');
      return d as EnrolResult;
    } catch (err) {
      const msg = readError(err, 'Enrolment failed.');
      setError(msg);
      throw new Error(msg);
    }
  }, [api]);

  // Poll only while something is genuinely in flight. Polling a queue that cannot move
  // burns requests to re-learn a fact the strip is already stating.
  useEffect(() => {
    const inFlight = jobs.some((j) => j.status === 'leased' || j.status === 'rendering'
      || (j.status === 'queued' && j.startable));
    if (!inFlight) return undefined;
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [jobs, refresh]);

  return {
    jobs, workerState, liveWorkers, enrolledWorkers, loading, error,
    refresh, queueSync, enrol, setLiveWorkers, setEnrolledWorkers,
  };
}

export default useRenderQueue;
