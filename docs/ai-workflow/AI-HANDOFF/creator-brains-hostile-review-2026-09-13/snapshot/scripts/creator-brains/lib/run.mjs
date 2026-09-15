#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/run.mjs
 * PURPOSE: The daily job — sequence the phases, own the run record, and make
 *          sure a report is written no matter where it stops.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint 1.0, S8)
 * ADDED: 2026-09-12
 * ============================================================================
 *
 * ORDERING IS LOAD-BEARING:
 *   preflight -> canary -> discover -> fetch -> build -> export -> digest
 *   The canary runs FIRST because it is the only phase that answers "is yt-dlp
 *   working at all today?" — and if it is not, every later failure is a symptom
 *   rather than a cause. Reporting "17 fetches failed" when the real message is
 *   "yt-dlp is broken" sends the reader to the wrong place.
 *
 * THE RUN NEVER THROWS ITS WAY OUT OF A REPORT:
 *   Each phase is wrapped, its result recorded, and the digest written even when
 *   several phases failed. A pipeline whose failure mode is "no output" is a
 *   pipeline nobody can debug — which is the upstream review's "silent rot"
 *   death, and the reason the digest fires on success too.
 *
 * `record.ok` IS THE RUN'S VERDICT, NOT THE CANARY'S.
 *   It used to be the canary's: a run where the canary passed and every catalog
 *   fetch failed reported `ok: true`, printed `**COMPLETED**`, and exited 0.
 *   Every phase now reports its own failure (see pipeline.mjs), and `ok` is the
 *   conjunction of them.
 *
 * THE PHASES THEMSELVES LIVE IN pipeline.mjs. This file sequences them.
 *
 * @module creator-brains/run
 */

import { newVideoState } from './fsm.mjs';
import { exportBrains } from './export.mjs';
import { writeDigest, scrub } from './digest.mjs';
import {
  makeBudget, newRunRecord, addPhase, runIdFor, DEFAULT_PER_HOUR,
} from './ledger.mjs';
import {
  loadRegistry, loadState, saveState, saveRun, enabledCreators, checkStateReadable,
} from './store.mjs';
import { runCanary, DEFAULT_CANARY_VIDEO } from './canary.mjs';
import { discoverPhase, fetchPhase, buildPhase } from './pipeline.mjs';
import { probeSubs as realProbeSubs, fetchJson3 as realFetchJson3, safeVersion } from './ytdlp.mjs';
import { nowIso, paths, readJsonStrict } from './paths.mjs';

/**
 * Run one full daily pass.
 *
 * @param {object} o
 * @param {string} o.r            store root
 * @param {object} o.deps         injected yt-dlp surface (tests)
 * @param {Function} o.clock      ms clock (tests advance it)
 * @param {object} o.canary       {videoId}
 * @param {object} o.budget       {perHour}
 * @param {object} o.secrets      values that must never reach an artifact
 * @param {string[]} o.only       run a subset of phases (e.g. ['fetch'])
 */
export async function runDaily({
  r, deps = {}, clock = null, now = null, canary = {}, budget = {},
  secrets = {}, onPhase = null, only = null,
} = {}) {
  const tick = clock || (() => Date.now());
  const runId = runIdFor(tick);
  const record = newRunRecord({ runId, clock: tick });
  const secretValues = Object.values(secrets || {}).filter((v) => typeof v === 'string');
  const notes = [];

  // Phase selection exists so `cli.mjs fetch` can fetch WITHOUT running (and
  // failing on) a canary it did not ask for. Without it, every narrow command
  // ran the whole pipeline and reported the result of a different job.
  const wants = (name) => !only || only.includes(name);

  record.ytDlp = deps.version || safeVersion();

  const phase = async (name, fn) => {
    const t0 = tick();
    let ok = true; let reason = null; let counts = {};
    try {
      const out = await fn();
      ok = out ? out.ok !== false : true;
      reason = out ? (out.reason ?? null) : null;
      counts = (out && out.counts) || {};
    } catch (e) {
      ok = false;
      reason = `threw: ${scrub({ m: String(e.message || e) }, secretValues).m.slice(0, 300)}`;
    }
    addPhase(record, name, { ok, reason, counts, ms: tick() - t0 });
    if (onPhase) onPhase(record.phases[record.phases.length - 1]);
    return ok;
  };

  // ── 0. PREFLIGHT ──────────────────────────────────────────────────────────
  // A corrupt state map STOPS the run — see store.checkStateReadable: an empty
  // map silently replaces years of attempt counts AND makes the brain's
  // coverage-gap table report no gaps, which is a brain reporting silence as
  // agreement. A corrupt REGISTRY is milder: the catalog can be re-derived, so
  // it is a note rather than a refusal.
  const stateCheck = checkStateReadable(r);
  if (!stateCheck.ok) {
    addPhase(record, 'preflight', { ok: false, reason: stateCheck.reason, counts: {} });
    record.notes = [stateCheck.reason];
    record.endedAt = nowIso(tick);
    record.ok = false;
    const digest = writeDigest(scrub(record, secretValues), { r, secrets: secretValues });
    record.digestPath = digest.path;
    saveRun(r, record);
    return record;
  }
  const registryCheck = readJsonStrict(paths(r).registry);
  if (registryCheck.present && !registryCheck.ok) {
    notes.push(`registry.json is unreadable (${registryCheck.error}) — the creator catalog was treated as empty`);
  }

  // The catalog and state map are loaded BEFORE any phase so that a partial run
  // (`only: ['fetch']`) still has the state it needs — fetching without
  // discovering is a legitimate thing to ask for, and it must not silently
  // degrade into "no videos found".
  const reg = loadRegistry(r);
  const enabled = enabledCreators(reg);
  const state = loadState(r);

  const probeSubs = deps.probeSubs || realProbeSubs;
  const fetchJson3 = deps.fetchJson3 || realFetchJson3;

  // ── 1. CANARY ─────────────────────────────────────────────────────────────
  if (wants('canary')) {
    await phase('canary', () => runCanary({
      r,
      videoId: canary.videoId || DEFAULT_CANARY_VIDEO,
      probeSubs,
      fetchJson3,
      tick,
      notes,
    }));
  }

  // ── 2. DISCOVER ───────────────────────────────────────────────────────────
  if (wants('discover')) {
    await phase('discover', async () => {
      const res = await discoverPhase({
        r, deps, enabled, state, tick, notes, secrets: secretValues,
      });
      record.counts.discovered = res.counts.discovered;
      record.counts.deleted = res.counts.deleted;
      return res;
    });
  }

  // ── 3. FETCH ──────────────────────────────────────────────────────────────
  // One video costs TWO yt-dlp requests (a subtitle probe and the subtitle
  // fetch). The budget counts VIDEOS, so the real request rate is up to 2x the
  // cap. Stated here so the number is not misread later.
  if (wants('fetch')) {
    const b = makeBudget({ perHour: budget.perHour || DEFAULT_PER_HOUR, deps: { now: tick } });
    await phase('fetch', () => fetchPhase({
      r,
      reg,
      enabled,
      state,
      deps: { probeSubs, fetchJson3 },
      budget: b,
      tick,
      runId,
      record,
      secrets: secretValues,
    }));
    // The phase owns its accounting; persisting the state map is this file's
    // job, so a partial run still converges on the next one.
    saveState(state, r);
  }

  // ── 4. BUILD ──────────────────────────────────────────────────────────────
  const built = [];
  if (wants('build')) {
    await phase('build', () => {
      const res = buildPhase({ r, enabled, tick, notes, secrets: secretValues });
      built.push(...res.built);
      record.counts.built = res.counts.built;
      return res;
    });
  }

  // ── 5. EXPORT ─────────────────────────────────────────────────────────────
  let exportResult = null;
  if (wants('export')) {
    await phase('export', () => {
      if (!built.length) return { ok: true, reason: 'nothing built', counts: { staged: 0 } };
      exportResult = exportBrains({ r, now: tick() });
      return {
        ok: true,
        reason: null,
        counts: { staged: exportResult.written.length, reaped: exportResult.reaped.length },
      };
    });
  }

  // ── 6. DIGEST ─────────────────────────────────────────────────────────────
  record.creators = enabled.map((c) => {
    const vs = Object.values(state.videos).filter((v) => v.channelId === c.channelId);
    return {
      channelId: c.channelId,
      title: c.title,
      total: vs.length,
      fetched: vs.filter((v) => v.state === 'fetched').length,
    };
  });
  record.notes = notes;
  record.endedAt = nowIso(tick);
  record.ok = (record.phases || []).every((p) => p.ok);

  const scrubbed = scrub(record, secretValues);
  const digest = writeDigest(scrubbed, { r, secrets: secretValues });
  addPhase(scrubbed, 'digest', { ok: true, reason: null, counts: { bytes: digest.text.length } });
  saveRun(r, scrubbed);

  return { ...scrubbed, digestPath: digest.path, exportResult };
}

// Re-exported so the CLI and the scheduled entry keep importing the canary
// video id from the module that owns the run, not from the split-out one.
export { newVideoState, DEFAULT_CANARY_VIDEO };
