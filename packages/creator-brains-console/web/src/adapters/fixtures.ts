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
  ytdlp: { ok: true, version: '2025.09.17', reason: '' },
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
      watchUrl: 'https://youtu.be/dQw4w9WgXcQ?t=754',
    },
  ],
  skipped: [{ videoId: 'aaaa1111222', reason: 'no published generation' }],
};

export const brainDoc: BrainDoc = {
  slug: 'systems-weekly',
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
