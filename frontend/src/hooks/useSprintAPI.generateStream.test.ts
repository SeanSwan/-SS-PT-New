/**
 * ============================================================================
 * FILE: useSprintAPI.generateStream.test.ts — R-H04 (slice D).
 *
 * WHY THIS EXISTS AT HOOK LEVEL
 *   `SprintPlannerPage.terminalNotice.test.tsx` mocks `useSprintAPI`, so it proves
 *   the PAGE renders a notice once it is handed a terminal event. It proves
 *   NOTHING about whether the real consumer can ever be handed one. These tests
 *   drive the REAL `generateSprint` against a mocked `fetch`, which is the only
 *   level where "does the durable reconnect endpoint actually get called?" can be
 *   answered.
 *
 * THE DEFECT (planned RED)
 *   `POST /:id/generate` answers 409 `{success:false, error:'Generation already in
 *   progress'}` when a run is already live (sprintRoutes.mjs:191-197). `fetch`
 *   does NOT throw on 409, so the POST path feeds that JSON body to `readStream`,
 *   which looks for `data: ` frames, finds none, and calls back NEVER. The caller
 *   sets `generating = true` before calling (SprintPlannerPage.tsx:79) and only
 *   clears it on a terminal event (:84-85) — so the trainer gets a spinner that
 *   never stops and no message: exactly the defect class slice D exists to kill.
 *   The durable GET stream (:id/generate/stream) that WOULD replay the live job is
 *   never reached, because `reconnect()` is only called from the catch branch.
 *
 * NOTE: `frontend/tsconfig.json` EXCLUDES `**\/*.test.ts(x)`, so `tsc --noEmit`
 * does not type-check this file — the run is the only evidence.
 * ============================================================================
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getToken: vi.fn(() => 'test-token') }));

vi.mock('../services/api.service', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  ProductionTokenManager: { getToken: mocks.getToken },
}));

import { useSprintAPI } from './useSprintAPI';

// ── SSE plumbing (no ReadableStream dependency: jsdom does not provide one) ──

const toBytes = (text: string) => Uint8Array.from([...text].map((c) => c.charCodeAt(0)));

/** A response whose body yields `text` once, then signals done. */
const sseResponse = (text: string, status = 200) => {
  let sent = false;
  return {
    ok: status >= 200 && status < 300,
    status,
    // Refusals are read via `.json()` to recover the server's message; on an SSE
    // body this throws and is swallowed, which is the behaviour under test too.
    json: async () => JSON.parse(text),
    body: {
      getReader: () => ({
        read: async () => {
          if (sent) return { done: true, value: undefined };
          sent = true;
          return { done: false, value: toBytes(text) };
        },
      }),
    },
  };
};

/** A JSON error response (what the 409 duplicate-guard actually returns). */
const jsonResponse = (status: number, payload: unknown) =>
  sseResponse(JSON.stringify(payload), status);

const frame = (id: number, event: Record<string, unknown>) =>
  `id: ${id}\ndata: ${JSON.stringify(event)}\n\n`;

const INTERRUPTED = { type: 'error', code: 'SPRINT_GENERATION_ERROR', interrupted: true };

/** Answers POST and GET separately; records every (method, url) pair. */
const installFetch = (post: unknown, get: unknown) => {
  const calls: Array<{ method: string; url: string }> = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = (init?.method || 'GET').toUpperCase();
    calls.push({ method, url: String(url) });
    return method === 'POST' ? post : get;
  });
  vi.stubGlobal('fetch', fetchMock);
  return calls;
};

/** Let the hook's async chain (fetch -> readStream -> read) fully settle. */
const flush = async (ticks = 8) => {
  for (let i = 0; i < ticks; i++) {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  }
};

const start = async (onProgress: (evt: unknown) => void) => {
  const { result } = renderHook(() => useSprintAPI());
  await act(async () => { result.current.generateSprint(7, onProgress); });
  await flush();
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('generateSprint stream recovery (slice D)', () => {
  it('falls back to the durable GET stream when the POST is refused with 409', async () => {
    const calls = installFetch(
      jsonResponse(409, { success: false, error: 'Generation already in progress for this sprint' }),
      sseResponse(frame(1, INTERRUPTED)),
    );
    const onProgress = vi.fn();

    await start(onProgress);

    // The GET endpoint is the ONLY thing that can replay the live job or explain
    // the run from persisted status. Reaching it is the whole point.
    expect(calls.some((c) => c.method === 'GET' && c.url.includes('/generate/stream'))).toBe(true);
    expect(onProgress).toHaveBeenCalledWith(INTERRUPTED);
  });

  it('replays a live job in order through the GET stream after a 409', async () => {
    installFetch(
      jsonResponse(409, { success: false, error: 'Generation already in progress for this sprint' }),
      sseResponse(frame(1, { type: 'started', sprintId: 7 }) + frame(2, { type: 'complete', status: 'active' })),
    );
    const onProgress = vi.fn();

    await start(onProgress);

    expect(onProgress.mock.calls.map((c) => c[0])).toEqual([
      { type: 'started', sprintId: 7 },
      { type: 'complete', status: 'active' },
    ]);
  });

  it('still consumes a 200 POST stream directly, without a second request', async () => {
    // Guard against the fix over-reaching: the normal path must NOT re-request.
    const calls = installFetch(
      sseResponse(frame(1, { type: 'started', sprintId: 7 }) + frame(2, { type: 'complete' })),
      sseResponse(frame(1, INTERRUPTED)),
    );
    const onProgress = vi.fn();

    await start(onProgress);

    expect(onProgress.mock.calls.map((c) => c[0])).toEqual([
      { type: 'started', sprintId: 7 },
      { type: 'complete' },
    ]);
    expect(calls.filter((c) => c.method === 'GET')).toHaveLength(0);
  });

  it("surfaces the server's own message when the POST is refused and no run is live", async () => {
    // 429 is at least as ordinary as 409 here: `genLimiter` (sprintRoutes.mjs:115-121)
    // allows 3 generation-ish calls per 5 minutes. The refusal body is the ONLY
    // place the rate limit is named, so it must be READ — diverting to the GET
    // stream would answer from persisted status and discard the explanation.
    const calls = installFetch(
      jsonResponse(429, {
        success: false,
        error: 'Sprint generation rate limit reached. Try again in a few minutes.',
      }),
      sseResponse(frame(1, { type: 'complete', replayUnavailable: true, persistedStatus: 'draft' })),
    );
    const onProgress = vi.fn();

    await start(onProgress);

    // Two events, in this order: the guaranteed status-coded terminal event, then
    // the server's own words. Asserting the ORDER is what proves the terminal
    // event does not depend on the body being readable.
    expect(onProgress.mock.calls.map((c) => c[0])).toEqual([
      { type: 'error', error: 'Could not start generation (429)' },
      { type: 'error', error: 'Sprint generation rate limit reached. Try again in a few minutes.' },
    ]);
    expect(calls.filter((c) => c.method === 'GET')).toHaveLength(0);
  });

  it('still ends the run when the refusal body is not JSON', async () => {
    // A proxy or a crash can answer HTML; the run must end with a message anyway.
    installFetch(sseResponse('<html>502 Bad Gateway</html>', 502), sseResponse('nope', 500));
    const onProgress = vi.fn();

    await start(onProgress);

    expect(onProgress.mock.calls.map((c) => c[0])).toEqual([
      { type: 'error', error: 'Could not start generation (502)' },
    ]);
  });

  it('prefers the human `message` over the machine `error` code (real 500 envelope)', async () => {
    // This is the shape `sendSprintRouteError` actually sends
    // (sprintRoutes.mjs:62-67): `error` is the CODE, `message` is the copy.
    // Reading `error` first printed the literal string "internal_error".
    installFetch(
      jsonResponse(500, {
        success: false,
        error: 'internal_error',
        message: 'Could not load sprint details.',
      }),
      sseResponse('nope', 500),
    );
    const onProgress = vi.fn();

    await start(onProgress);

    expect(onProgress.mock.calls.map((c) => c[0])).toEqual([
      { type: 'error', error: 'Could not start generation (500)' },
      { type: 'error', error: 'Could not load sprint details.' },
    ]);
  });

  it('never surfaces a bare machine code when no human text exists', async () => {
    // Some routes answer `{ error: 'internal_error' }` with no `message` at all.
    // A code is not copy: the status-coded fallback is the honest thing to show.
    installFetch(
      jsonResponse(500, { success: false, error: 'internal_error' }),
      sseResponse('nope', 500),
    );
    const onProgress = vi.fn();

    await start(onProgress);

    expect(onProgress.mock.calls.map((c) => c[0])).toEqual([
      { type: 'error', error: 'Could not start generation (500)' },
    ]);
  });

  it('reports a terminal error when a 409 fallback GET also fails', async () => {
    // The 409 path must still END the run: otherwise the spinner never stops.
    installFetch(
      jsonResponse(409, { success: false, error: 'Generation already in progress for this sprint' }),
      sseResponse('nope', 500),
    );
    const onProgress = vi.fn();

    await start(onProgress);

    expect(onProgress).toHaveBeenCalledWith({ type: 'error', error: 'Reconnect failed (500)' });
  });

  it('aborts the in-flight request when the returned cancel function is called', async () => {
    // The transport was moved out of the hook in this slice, and the cleanup
    // wiring is exactly the part a mechanical move can silently drop — a leaked
    // stream keeps mutating a page the trainer has already navigated away from.
    let postSignal: AbortSignal | undefined;
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      postSignal = init?.signal as AbortSignal;
      return sseResponse(frame(1, { type: 'started', sprintId: 7 }));
    }));

    const onProgress = vi.fn();
    const { result } = renderHook(() => useSprintAPI());
    let cancel: (() => void) | undefined;
    await act(async () => { cancel = result.current.generateSprint(7, onProgress); });
    await flush();

    expect(postSignal?.aborted).toBe(false);
    act(() => { cancel?.(); });
    expect(postSignal?.aborted).toBe(true);
  });
});
