/*
 * Fixtures for MockAdapter and the component tests.
 *
 * These mirror the shapes the bridge actually returns (05-contracts.md §1).
 * They deliberately contain NO transcript text — tier B is never representable
 * in anything the console can serve (05-contracts.md §4).
 */

import type {
  BrainDoc,
  CanaryReading,
  CreatorRow,
  QueryResult,
  RunState,
  StatusInstrument,
} from './types';

export const healthyStatus: StatusInstrument = {
  // A LIVE reading: the probe ran, it was fresh, and it succeeded (R2-01 — the
  // provenance is part of the payload, not decoration; the board branches on it).
  ytdlp: {
    ok: true,
    version: '2025.09.17',
    reason: '',
    checkedAt: '2026-09-18T11:40:00.000Z',
    ageMs: 420000,
    source: 'probe',
    stale: false,
    note: null,
  },
  creators: { total: 12, enabled: 9, damaged: null },
  state: {
    damaged: null,
    videos: {
      total: 418,
      fetched: 366,
      coverage: 0.8756,
      counts: { fetched: 366, pending: 52 },
    },
  },
  budget: { used: 7, perHour: 20, unit: 'fetches', byKind: { fetch: 7 } },
  backlog: { lines: ['52 videos pending across 3 creators', 'oldest pending: 2026-08-30'] },
  throttle: { active: false, text: 'no throttle active' },
  census: { inFlight: [], everSwept: 418, discarded: false },
  lock: { held: false },
  lastRun: { status: 'ok', runId: 'run-2026-09-18T04' },
  lastGood: { at: '2026-09-18T04:12:00.000Z', staleDays: 0 },
  documents: 418,
  publishedBrains: 12,
  publishedBrainsDamaged: null,
  recentRuns: [
    { runId: 'run-2026-09-18T04', ok: true, fetched: 7 },
    { runId: 'run-2026-09-17T04', ok: true, fetched: 11 },
    { runId: 'run-2026-09-16T04', ok: false, fetched: 0 },
  ],
};

/**
 * registry.json is unreadable → the roster must refuse, not render zeros.
 *
 * FIDELITY (S1-H5). Everything else stays REAL, because registry damage does not
 * affect it — measured against a live bridge on 2026-09-18: `documents` is still
 * counted (it reads the docs directory), and `state.videos` is still summarized.
 * A first draft zeroed `documents`/`publishedBrains`/`recentRuns` here, which
 * described a response the bridge never produces.
 *
 * The trap is in `creators`: `total`/`enabled` are still 0 alongside a non-null
 * `damaged`. Those zeros are not a measurement (05 §2a).
 */
export const damagedRegistryStatus: StatusInstrument = {
  ...healthyStatus,
  creators: {
    total: 0,
    enabled: 0,
    damaged: {
      file: 'registry.json',
      detail: "corrupt: invalid JSON: Expected property name or '}' in JSON at position 2 (line 1 column 3)",
    },
  },
};

/**
 * state.json is unreadable → coverage is unknown, so `videos` is null.
 *
 * FIDELITY (S1-H5). Measured against a live bridge: the roster is UNAFFECTED
 * (registry.json is intact), `backlog.lines` becomes `[]`, and `documents`
 * becomes 0 — the last of these is `status.mjs`'s own guard, not a measurement,
 * which is why StatusBoard withholds it rather than rendering "0 documents".
 *
 * Before S1-H1 was fixed this fixture described an impossible response: the
 * bridge 500'd instead, so nothing ever reached the client.
 */
export const damagedStateStatus: StatusInstrument = {
  ...healthyStatus,
  state: {
    damaged: { file: 'state.json', detail: 'corrupt: invalid JSON: Expected property name or \'}\' in JSON at position 2 (line 1 column 3)' },
    videos: null,
  },
  backlog: { lines: [] },
  documents: 0,
};

/**
 * A published namespace or pointer escapes the brains store → the count is
 * UNKNOWN, not zero (R3-02).
 *
 * FIDELITY. `countPublished` catches the containment refusal and reports it as a
 * FIELD, because status is a composite instrument: one damaged brain must not
 * cost the operator every unrelated reading. `documents` and the roster stay
 * real, because they read other files — that is the measured shape, not a
 * convenience. The count is `null`; rendering `0` would claim the store holds
 * nothing published.
 */
export const damagedBrainsStatus: StatusInstrument = {
  ...healthyStatus,
  publishedBrains: null,
  publishedBrainsDamaged: {
    file: 'current.json',
    detail: "'bad.name' is a published namespace the engine traverses but the console "
      + 'cannot name, so its generation cannot be proven to stay in the store',
  },
};

/** A census whose sweep errored — the counts are absent, not zero (S1-H2). */
export const censusErroredStatus: StatusInstrument = {
  ...healthyStatus,
  census: { inFlight: [], everSwept: 0, discarded: false, error: 'checkpoint sweep failed: EACCES' },
};

export const creators: CreatorRow[] = [
  { channelId: 'UCaaaaaaaaaaaaaaaaaaaaaa', title: 'Systems Weekly', enabled: true, videos: 62, fetched: 60 },
  { channelId: 'UCbbbbbbbbbbbbbbbbbbbbbb', title: 'Quiet Machines', enabled: true, videos: 41, fetched: 41 },
  { channelId: 'UCcccccccccccccccccccccc', title: 'Field Notes', enabled: false, videos: 28, fetched: 9 },
];

export const runState: RunState = {
  journal: { status: 'ok', runId: 'run-2026-09-18T04' },
  lock: healthyStatus.lock,
  throttle: healthyStatus.throttle,
  budget: healthyStatus.budget,
  recentRuns: healthyStatus.recentRuns,
};

export const queryResult: QueryResult = {
  hits: [
    {
      claimId: 'claim-0001',
      creatorId: 'UCaaaaaaaaaaaaaaaaaaaaaa',
      creatorTitle: 'Systems Weekly',
      videoId: 'dQw4w9WgXcQ',
      tStartMs: 754000,
      keyPhrase: 'backpressure is a queueing decision, not a network one',
      // Both routes serve these; `QueryHit` under-declared them until A1-03, and
      // this fixture was written to the narrow type — which is how a contract
      // gets fixed in the docs and left broken in the client.
      statement: 'Backpressure is a queueing decision, not a network one.',
      topic: 'systems design',
      watchUrl: 'https://youtu.be/dQw4w9WgXcQ?t=754',
    },
  ],
  skipped: [{ videoId: 'aaaa1111222', reason: 'no published generation' }],
};

export const brainDoc: BrainDoc = {
  // `slug` holds a CHANNEL ID, not a human label — see the note on `BrainDoc`.
  slug: 'systems-weekly',
  generation: 'gen-0007',
  title: 'Systems Weekly',
  index: '# Systems Weekly\n\n62 videos, 60 fetched.',
  topics: '## Topics\n\n- queueing\n- backpressure',
  timeline: '## Timeline\n\n- 2026-08-30 — queueing deep dive',
  claims: queryResult.hits,
  skipped: queryResult.skipped,
};

export const canary: CanaryReading = {
  ok: true,
  version: '2025.09.17',
  reason: '',
  checkedAt: '2026-09-18T11:40:00.000Z',
  ageMs: 420000,
  source: 'probe',
  stale: false,
  note: null,
};

/** Cached-probe fallback: the live probe failed and history is being shown. */
export const canaryFromHistory: CanaryReading = {
  ok: true,
  version: '2025.09.17',
  reason: '',
  checkedAt: '2026-09-17T04:12:00.000Z',
  ageMs: 113_280_000,
  source: 'history',
  stale: true,
  note: 'live probe did not resolve yt-dlp — showing the last recorded canary result instead',
};

/*
 * ── THE TWO HEALTH STATES THE OLD RENDERING COULD NOT EXPRESS (R2-01) ───────
 *
 * Both fixtures are REAL bridge shapes, taken from lib/health.mjs: a `history`
 * reading and the `unknown` source. They exist because the previous rendering
 * collapsed them into "ok" and "not resolved" respectively — so a test that
 * asserted the old strings would have passed while the board lied. A fixture
 * that cannot represent a state cannot test it.
 */

/**
 * A past SUCCESS replayed from the daily pass. `ok: true` and `stale: true`
 * together — which is the whole point: the value is good and the verdict is not
 * live, and both facts have to survive to the screen.
 */
export const staleHistoryStatus: StatusInstrument = {
  ...healthyStatus,
  ytdlp: {
    ok: true,
    version: '2025.09.17',
    reason: '',
    checkedAt: '2026-09-17T04:12:00.000Z',
    ageMs: 113_280_000,
    source: 'history',
    stale: true,
    note: 'live probe did not resolve yt-dlp — showing the last recorded reading',
  },
};

/**
 * NO VERDICT HAS BEEN TAKEN: the probe has not run and there is no history
 * entry. `ok` is false, and that false is NOT a failure — it is the absence of
 * a check, which is why the board must not render it as one.
 */
export const uncheckedStatus: StatusInstrument = {
  ...healthyStatus,
  ytdlp: {
    ok: false,
    version: null,
    reason: '',
    checkedAt: null,
    ageMs: null,
    source: 'unknown',
    stale: true,
    note: null,
  },
};

/** A live check that RAN AND FAILED — the only case where the reason belongs. */
export const failedProbeStatus: StatusInstrument = {
  ...healthyStatus,
  ytdlp: {
    ok: false,
    version: null,
    reason: 'yt-dlp exited 1: unable to extract player',
    checkedAt: '2026-09-18T11:40:00.000Z',
    ageMs: 420000,
    source: 'probe',
    stale: false,
    note: null,
  },
};
