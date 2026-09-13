/**
 * ============================================================================
 * FILE: sprintGenerationStream.ts — R-H04 (slice D).
 *
 * PURPOSE
 *   The SSE transport for sprint generation: POST the run, parse its event
 *   stream, and fall back to the durable GET stream whenever the POST cannot
 *   produce frames.
 *
 * EXTRACTED FROM useSprintAPI.ts (rule 4). That file was 320 lines at baseline —
 * already 20 over the 300-line cap — and this transport is the largest
 * self-contained piece in it. The move brings the hook back under the cap rather
 * than deepening a pre-existing violation.
 *
 * WHY A REFUSED POST MUST BE HANDLED EXPLICITLY
 *   `fetch` does not throw on 4xx/5xx, so a refused POST reaches the frame reader
 *   as an ordinary response. Its body is JSON, not SSE, so a reader that only
 *   looks for `data: ` frames calls back NEVER — while the caller has already
 *   switched its spinner on (SprintPlannerPage.tsx:79) and only clears it on a
 *   terminal event (:84-85). The trainer was left with a spinner that never
 *   stopped and no message at all.
 *
 *   The two refusal classes are NOT the same and are handled differently:
 *     409 — the duplicate guard (sprintRoutes.mjs:191-197): a run IS live, so the
 *           durable `GET /:id/generate/stream` is the right answer; it replays the
 *           live job's buffered events, and when the buffer is gone it answers
 *           from persisted status with a terminal event (sprintStream.mjs:76-96).
 *     429/401/403/5xx — no run was started. Here the GET stream would answer "not
 *           live" from persisted status and DISCARD the server's explanation, so
 *           the refusal body is read and surfaced as a terminal error instead.
 *           This matters most for 429: `genLimiter` (sprintRoutes.mjs:115-121)
 *           allows 3 generation-ish calls per 5 minutes, and the refusal text is
 *           the only place that limit is named.
 * ============================================================================
 */

import type { GenerationProgress } from './useSprintAPI';

export interface SprintGenerationStreamOptions {
  sprintId: number;
  /** Bearer token, read by the caller so this module stays storage-agnostic. */
  token: string | null;
  onProgress: (evt: GenerationProgress) => void;
}

/** A bare snake_case token is a machine code, never trainer-facing copy. */
const isMachineCode = (value: string) => /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(value);

/**
 * Read the server's own explanation out of a refusal, or `null` if there is none.
 *
 * The envelope convention is NOT uniform, so the field order matters. The sprint
 * routes' error helper (sprintRoutes.mjs:62-67) answers `{ success, error, message }`
 * where `error` is a MACHINE CODE (`internal_error`, `invalid_sprint_request`) and
 * `message` is the trainer-facing text. The generation rate limiter (:115-121) is
 * the mirror image — human text in `error`, no `message` at all — and the auth
 * middleware sends `message` only. So prefer `message`, fall back to `error`, and
 * never surface a bare code: reading `error` first would literally print
 * "internal_error" in the trainer's alert.
 */
const refusalMessage = async (response: Response): Promise<string | null> => {
  try {
    const body = await response.json();
    const candidate = body?.message || body?.error;
    if (typeof candidate === 'string' && candidate.trim() && !isMachineCode(candidate.trim())) {
      return candidate;
    }
  } catch { /* non-JSON, empty, or already-consumed body */ }
  return null;
};

/**
 * Start a generation run and stream its progress.
 *
 * Returns the cancel function: calling it aborts the in-flight request and
 * suppresses every later callback.
 */
export function streamSprintGeneration({
  sprintId,
  token,
  onProgress,
}: SprintGenerationStreamOptions): () => void {
  const controller = new AbortController();
  let lastEventId = 0;
  let cancelled = false;

  // Parse SSE stream, tracking event IDs for reconnection (ARCH-2)
  const readStream = async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('id: ')) {
          const parsed = parseInt(line.slice(4), 10);
          if (!isNaN(parsed)) lastEventId = parsed;
        } else if (line.startsWith('data: ')) {
          try {
            onProgress(JSON.parse(line.slice(6)));
          } catch { /* skip malformed */ }
        }
      }
    }
  };

  // Reconnect via GET stream with Last-Event-ID
  const reconnect = async () => {
    if (cancelled) return;
    try {
      const res = await fetch(`/api/bootcamp/sprints/${sprintId}/generate/stream`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Last-Event-ID': String(lastEventId),
        },
        signal: controller.signal,
      });
      if (res.ok) {
        await readStream(res);
      } else {
        // Surface non-OK reconnect as error (Codex R18 fix — 404/401/etc)
        onProgress({ type: 'error', error: `Reconnect failed (${res.status})` });
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        onProgress({ type: 'error', error: err.message });
      }
    }
  };

  (async () => {
    try {
      const res = await fetch(`/api/bootcamp/sprints/${sprintId}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        // 409 is the duplicate guard (sprintRoutes.mjs:191-197): a run IS live, so
        // the GET stream is the right answer — it replays that job's events.
        if (res.status === 409) {
          await reconnect();
          return;
        }

        // Every OTHER refusal means no run was started. 429 is at least as
        // ordinary as 409 here: `genLimiter` (sprintRoutes.mjs:115-121) allows 3
        // generation-ish calls per 5 minutes and is shared with the regenerate
        // route. Diverting to the GET stream would answer "not live" from
        // persisted status and DISCARD the server's explanation, so the trainer
        // would learn nothing about the rate limit that actually blocked them.
        //
        // The status-coded event goes FIRST so a terminal event is guaranteed even
        // if the body is empty, non-JSON, or never ends — the whole point of this
        // module is that no refusal can leave the caller waiting forever. The
        // server's own words then replace it if they can be read; the page keeps
        // only the latest event (`setProgress(evt)`), so this refines the copy and
        // does not double-report.
        onProgress({ type: 'error', error: `Could not start generation (${res.status})` });
        const detail = await refusalMessage(res);
        if (detail) onProgress({ type: 'error', error: detail });
        return;
      }

      await readStream(res);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        // Connection lost mid-generation — try reconnecting to GET stream
        await reconnect();
      }
    }
  })();

  return () => { cancelled = true; controller.abort(); };
}
