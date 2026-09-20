/**
 * ============================================================================
 * FILE: scripts/creator-brains/console/api.mjs
 * PURPOSE: The console's public data surface — one import point for every
 *          handler, validator and error code the bridge exposes.
 * PART OF: Creator Brains Console (blueprint 05-contracts.md §1–§3)
 * SLICE: S0
 * ============================================================================
 *
 * THIS FILE IS A BARREL, ON PURPOSE — and the reason is the repo's own
 * 300-line-per-file rule (CLAUDE.md rule 4). The first version of this module
 * carried the status instrument, the roster, the writes, the query pass-through
 * and the validators inline; it ran to 379 lines, and so did its neighbours.
 * Splitting it was not cosmetic: the file mixed the TRUST BOUNDARY (what may be
 * read and served) with the TRANSPORT CONTRACT (what is returned, and as what
 * type), and a reviewer could not see either completely on one screen.
 *
 * The split, and what each piece now owns:
 *
 *   api.mjs              this file — the public surface, and the route contract
 *   lib/errors.mjs       error codes, ApiError, and the input validators
 *   lib/health.mjs       the TTL cache over the engine's blocking yt-dlp probe
 *   lib/status.mjs       the status instrument, run state, canary, backlog
 *   lib/creators.mjs     the roster and the bounded writes
 *   lib/brains.mjs       asking the brains; the LANE B/C boundary
 *
 * WHAT THE PUBLIC SURFACE PROMISES (the contract the server and tests rely on):
 *
 *   READS (tier T0 — safe, no state change)
 *     statusInstrument(r, {probe, now})        GET  /api/status
 *     creatorRows(r)                           GET  /api/creators
 *     queryConsole(q, {r, creator})            GET  /api/query?q&creator
 *     brainDoc(slug, {r})                      GET  /api/brains/:slug
 *     runState(r)                              GET  /api/run
 *     canaryState(r, {probe, now})             GET  /api/canary
 *     backlogData(r)                           GET  /api/backlog
 *
 * The `probe`/`now` injections on the two health-bearing reads are TEST SEAMS
 * only — the routes call them with `(r)` alone. They exist so the suite can
 * assert the cache and the history fallback without spawning a Python process
 * per test (lib/health.mjs explains the 1.7-3.4 s measurement behind that).
 *
 *   WRITES (tier T2 — bounded, delegated to the engine's own functions)
 *     addCreatorRow(ref, {r})                  POST   /api/creators
 *     setCreatorEnabled(id, on, {r})           PATCH  /api/creators/:channelId
 *
 *   DELIBERATELY ABSENT (tier T3/T4 — human-CLI-gated, no route by doctrine)
 *     restore · rollback · authorize · verify-backup
 *
 * Every read delegates to the engine's tested lib functions. No handler in this
 * surface re-implements engine logic. Where something IS duplicated (three
 * formatting lines in status.mjs; the per-creator count filter in creators.mjs)
 * the duplication is named at its site with the reason and the alternative.
 *
 * @module creator-brains/console/api
 */

export {
  CODE, LIMITS, ApiError,
  validateRef, validateQuery, validatePerHour, validateChannelId,
} from './lib/errors.mjs';

export {
  PROBE_TTL_MS, resetHealthCache, healthReading,
} from './lib/health.mjs';

export {
  STALE_DAYS, statusInstrument, runState, canaryState, backlogData,
} from './lib/status.mjs';

export {
  creatorRows, addCreatorRow, setCreatorEnabled,
} from './lib/creators.mjs';

export {
  BRAIN_FILES, queryConsole, brainDoc,
} from './lib/brains.mjs';
