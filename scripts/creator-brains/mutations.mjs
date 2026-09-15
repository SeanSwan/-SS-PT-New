#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/mutations.mjs
 * PURPOSE: The mutation definitions — each one a precise, reproducible edit that
 *          must be KILLED by a named test.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR26)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * WHY THIS FILE EXISTS (review HR26):
 *   The first receipt claimed "11/11 mutations killed". The document listed six
 *   mutations and a re-run, so the claim was **not reproducible from the
 *   document** — the reviewer said so and was right. A mutation result that cannot
 *   be re-run is a story, not evidence.
 *
 * THE CONTRACT EVERY DEFINITION MUST SATISFY:
 *   1. `find` occurs EXACTLY ONCE in `file` at the revision being tested. If the
 *      code moves, the harness FAILS ITSELF rather than silently mutating nothing
 *      (`--check` verifies this without touching anything).
 *   2. `replace` is the smallest edit that breaks exactly one invariant.
 *   3. `killedBy` names a real test file, and the harness requires that file to
 *      FAIL with the mutation applied. A mutation that survives is a **coverage
 *      hole in the suite**, and it is reported as one — never hidden by dropping
 *      the definition.
 *
 * `finding` ties each mutation to the review finding it threatens, so the mutation
 * table in the blueprint and the receipt cannot drift from the code.
 *
 * @module creator-brains/mutations
 */

export const MUTATIONS = [
  {
    id: 'M1',
    finding: 'F2 / CB-04',
    file: 'lib/fsm.mjs',
    what: 'a SECOND confirmed absence stops being terminal (the no-track retry loop returns)',
    find: '    if (video.state === STATES.NO_TRACK_RETRY) {',
    replace: '    if (false) {',
    killedBy: 'test/reliability.test.mjs',
    // The failing test must be THIS one: a killer file that breaks for an
    // unrelated reason is a SUSPECT KILL, not evidence (probe F2).
    expectFail: 'T-21b',
    why: 'a caption-less video would burn a probe window forever instead of going terminal',
  },
  {
    id: 'M2',
    finding: 'HR18',
    file: 'lib/fetch.mjs',
    what: 'the authority check stops comparing the video channel with the creator channel',
    find: '  if (video.channelId !== creator.channelId) {',
    replace: '  if (false) {',
    killedBy: 'test/mutation-gaps.test.mjs',
    // The failing test must be THIS one: a killer file that breaks for an
    // unrelated reason is a SUSPECT KILL, not evidence (probe F2).
    expectFail: 'MG1',
    why: 'another creator\u2019s video could be fetched and stored under this one',
  },
  {
    id: 'M3',
    finding: 'HR09 / CB-12',
    file: 'lib/fidelity.mjs',
    what: 'the Lane C verbatim cap is raised from 7 words to 12',
    find: 'export const MAX_SHARED_RUN = 7;',
    replace: 'export const MAX_SHARED_RUN = 12;',
    killedBy: 'test/mutation-gaps.test.mjs',
    // The failing test must be THIS one: a killer file that breaks for an
    // unrelated reason is a SUSPECT KILL, not evidence (probe F2).
    expectFail: 'MG2',
    why: 'derived artifacts could carry longer verbatim transcript runs into the exportable lane',
  },
  {
    id: 'M4',
    finding: 'HR01 / CB-07',
    file: 'lib/ledger.mjs',
    what: 'the rolling-hour budget stops refusing when it is exhausted',
    find: '  if (cost > remaining) {',
    replace: '  if (false) {',
    killedBy: 'test/review-repairs.test.mjs',
    // The failing test must be THIS one: a killer file that breaks for an
    // unrelated reason is a SUSPECT KILL, not evidence (probe F2).
    expectFail: 'HR01',
    why: 'the cap becomes decoration: a run could spend without limit and never report a deferral',
  },
  {
    id: 'M5',
    finding: 'HR23',
    file: 'lib/ledger.mjs',
    what: 'the shared throttle cooldown stops gating new transport operations',
    find: '  if (throttled.active) {',
    replace: '  if (false) {',
    killedBy: 'test/mutation-gaps.test.mjs',
    // The failing test must be THIS one: a killer file that breaks for an
    // unrelated reason is a SUSPECT KILL, not evidence (probe F2).
    expectFail: 'MG3',
    why: 'a run refused with 429 would keep spending its budget against a service that said stop',
  },
  {
    id: 'M6',
    finding: 'HR23',
    file: 'lib/passes.mjs',
    what: 'the admission wrapper stops consulting the per-run work bound',
    find: '    const bound = boundObj.stop();',
    replace: '    const bound = null;',
    killedBy: 'test/mutation-gaps.test.mjs',
    // The failing test must be THIS one: a killer file that breaks for an
    // unrelated reason is a SUSPECT KILL, not evidence (probe F2).
    expectFail: 'MG4',
    why: 'a bounded run would spend past its ceiling with no deferral reason',
  },
  {
    id: 'M7',
    finding: 'HR22',
    file: 'lib/sweep.mjs',
    what: 'a sweep certifies every tab it asked for, without checking that each one answered',
    find: '    trustWholeWalk: walk.complete === true && walkedTabs.length === (resumable.tabs || []).length,',
    replace: '    trustWholeWalk: true,',
    killedBy: 'test/resume.test.mjs',
    // The failing test must be THIS one: a killer file that breaks for an
    // unrelated reason is a SUSPECT KILL, not evidence (probe F2).
    expectFail: 'HR22a',
    why: 'a walk that lost a tab would be filed as a completed census and confirm deletions from partial data',
  },
  {
    id: 'M8',
    finding: 'HR22',
    file: 'lib/discover.mjs',
    what: 'a walk that covered PART of the corpus is allowed to certify the whole of it',
    find: '  const complete = res.complete === true && !partial;',
    replace: '  const complete = res.complete === true;',
    killedBy: 'test/census.test.mjs',
    // The failing test must be THIS one: a killer file that breaks for an
    // unrelated reason is a SUSPECT KILL, not evidence (probe F2).
    expectFail: 'HR22i',
    why: 'a resumed sweep walking one tab would judge absences against the other tabs\u2019 videos',
  },
  {
    id: 'M9',
    finding: 'HR25',
    file: 'lib/backup.mjs',
    what: 'verification stops comparing the stored hash with the file on disk',
    find: '    if (actual !== entry.sha256) {',
    replace: '    if (false) {',
    killedBy: 'test/backup.test.mjs',
    // The failing test must be THIS one: a killer file that breaks for an
    // unrelated reason is a SUSPECT KILL, not evidence (probe F2).
    expectFail: 'BK2b',
    why: 'a corrupted or tampered archive would verify clean and a restore would look safe',
  },
  {
    id: 'M10',
    finding: 'HR24',
    file: 'lib/extract.mjs',
    what: 'candidate rows are labelled `verified` instead of `candidate`',
    find: "export const CLAIM_VALIDATION = 'candidate';",
    replace: "export const CLAIM_VALIDATION = 'verified';",
    killedBy: 'test/mutation-gaps.test.mjs',
    // The failing test must be THIS one: a killer file that breaks for an
    // unrelated reason is a SUSPECT KILL, not evidence (probe F2).
    expectFail: 'MG5',
    why: 'deterministic fragments would be published as trusted rules, which is the overclaim HR24 names',
  },
];
