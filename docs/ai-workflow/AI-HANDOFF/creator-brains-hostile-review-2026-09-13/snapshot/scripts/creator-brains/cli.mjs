#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/cli.mjs
 * PURPOSE: The command surface — add, list, enable, discover, fetch, build,
 *          query, daily, status, sync, canary.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint 1.0, S8)
 * ADDED: 2026-09-12
 * ============================================================================
 *
 *   node scripts/creator-brains/cli.mjs <command> [args]
 *
 * Every command prints a RESULT, never a bare success. "0 fetched" and "0 to
 * fetch" are different sentences and the reader must be able to tell them
 * apart — that distinction is the difference between a pipeline you can trust
 * and one that rots quietly.
 *
 * EXIT CODES: 0 = the command did what was asked. 1 = it refused or failed, and
 * the reason is on stderr/stdout. A blocked command (e.g. `sync` with no OAuth
 * credential) exits 1 — a script that greps for success must not read a refusal
 * as a pass.
 *
 * @module creator-brains/cli
 */

import { runDaily, DEFAULT_CANARY_VIDEO } from './lib/run.mjs';
import { addCreator, listCreators, setEnabled, getCreator } from './lib/registry.mjs';
import { discoverChannel } from './lib/discover.mjs';
import { buildBrain } from './lib/extract.mjs';
import { renderBrain } from './lib/render.mjs';
import { queryBrains, formatResults } from './lib/query.mjs';
import { exportBrains, publishInstructions } from './lib/export.mjs';
import { syncSubscriptions, defaultCredentialPath } from './lib/subs.mjs';
import { loadRegistry, loadState, enabledCreators, ensureStore, listRuns } from './lib/store.mjs';
import { summarize } from './lib/fsm.mjs';
import { selfCheck, probeSubs, fetchJson3, ytDlpVersion } from './lib/ytdlp.mjs';
import { parseJson3 } from '../swan-scout/yt-scout-transcript.mjs';
import { paths, root } from './lib/paths.mjs';

const out = (s) => process.stdout.write(`${s}\n`);

/** Resolve a CLI creator argument to a registry row, or explain the miss.
 *
 *  A FLAG IS NOT A CREATOR REFERENCE. Passing `args[0]` straight in meant
 *  `fetch --per-hour=2` looked for a creator whose channel id was literally
 *  `--per-hour=2`, found none, and reported "no matching enabled creator" while
 *  two enabled creators sat in the registry. Caught by a live smoke run; the
 *  fix is to only ever consider a bare argument. */
function resolveTarget(r, arg) {
  const all = listCreators(r);
  const ref = typeof arg === 'string' && !arg.startsWith('--') ? arg : null;
  if (!ref) return all.filter((c) => c.enabled);
  const hit = all.find((c) => c.channelId === ref)
    || all.find((c) => c.handle && c.handle.toLowerCase() === ref.toLowerCase());
  return hit ? [hit] : [];
}

/** Split a command's argv into flags and positional terms.
 *
 *  `args.indexOf('--creator')` returns -1 when the flag is absent, and
 *  `-1 + 1 === 0` then filtered out the FIRST positional term — so
 *  `query "mask"` silently became an empty query and was refused. Only apply
 *  the skip when the flag is actually present. */
function splitArgs(args, flag) {
  const at = args.indexOf(flag);
  const value = at > -1 ? args[at + 1] : null;
  const terms = args.filter((a, i) => !a.startsWith('--') && !(at > -1 && i === at + 1));
  return { value, terms };
}

// ─────────────────────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────────────────────

export const COMMANDS = {
  async add({ args, r }) {
    const ref = args[0];
    if (!ref) { out('usage: cli.mjs add <@handle|channel-url|UC…id> [--name "Title"]'); return 1; }
    const nameIdx = args.indexOf('--name');
    const name = nameIdx > -1 ? args[nameIdx + 1] : null;
    const res = await addCreator({ ref, r, name });
    if (!res.ok) { out(`refused: ${res.reason}`); return 1; }
    out(`added ${res.creator.title} (${res.creator.channelId}) — DISABLED`);
    out(`enable it with:  node scripts/creator-brains/cli.mjs enable ${res.creator.channelId}`);
    return 0;
  },

  async list({ r }) {
    const creators = listCreators(r);
    if (!creators.length) { out('no creators yet — add one with:  cli.mjs add @handle'); return 0; }
    out('enabled  channel_id                    title');
    for (const c of creators) {
      out(`${c.enabled ? '  yes  ' : '  no   '}  ${c.channelId}  ${c.title}`);
    }
    out('');
    out(`${creators.length} creator(s), ${creators.filter((c) => c.enabled).length} enabled`);
    return 0;
  },

  async enable({ args, r }) {
    const [id, flag] = args;
    if (!id) { out('usage: cli.mjs enable <channel_id> [--off]'); return 1; }
    try {
      const c = setEnabled(r, id, flag !== '--off');
      out(`${c.title} is now ${c.enabled ? 'ENABLED' : 'disabled'}`);
      return 0;
    } catch (e) { out(`refused: ${e.message}`); return 1; }
  },

  async discover({ args, r, deps }) {
    const targets = resolveTarget(r, args[0]);
    if (!targets.length) { out('no matching enabled creator — add and enable one first'); return 1; }
    const limit = Number((args.find((a) => a.startsWith('--limit=')) || '').split('=')[1]) || 0;
    for (const creator of targets) {
      const res = await discoverChannel(creator, { r, deps, limit });
      out(`${creator.title}: ${res.newIds.length} new, ${res.known.length} known`
        + `${res.truncated ? ' (TRUNCATED — increase --limit for full history)' : ''}`
        + `${res.deleted.length ? `, ${res.deleted.length} deleted upstream` : ''}`);
    }
    return 0;
  },

  async fetch({ args, r, deps, clock }) {
    const targets = resolveTarget(r, args[0]);
    if (!targets.length) { out('no matching enabled creator'); return 1; }
    const perHour = Number((args.find((a) => a.startsWith('--per-hour=')) || '').split('=')[1]) || undefined;
    // FETCH ONLY. Running the whole pipeline here would make `fetch` fail on a
    // canary the caller never asked for, and would report the result of a
    // different job than the one on the command line.
    const record = await runDaily({
      r, deps, clock, budget: perHour ? { perHour } : {}, only: ['fetch'],
    });
    const f = record.phases.find((p) => p.name === 'fetch');
    out(`fetched ${record.counts.fetched}, deferred ${record.counts.deferred}`
      + `${record.counts.deferredReason ? ` (${record.counts.deferredReason})` : ''}`
      + `, no-track ${record.counts.noTrack}, failed ${record.counts.failed}`);
    if (f && f.reason) out(`note: ${f.reason}`);
    if (!f) { out('the fetch phase did not run — this is a bug, not an empty result'); return 1; }
    return 0;
  },

  async build({ args, r }) {
    const targets = resolveTarget(r, args[0]);
    if (!targets.length) { out('no matching enabled creator'); return 1; }
    let built = 0;
    for (const creator of targets) {
      const brain = buildBrain(r, creator);
      if (!brain.docCount) { out(`${creator.title}: no transcripts yet — run fetch first`); continue; }
      const res = renderBrain(brain, { r, now: Date.now() });
      built += 1;
      out(`${creator.title}: ${brain.timeline.length} videos, ${brain.claims.length} claims, `
        + `${brain.doctrine.length} doctrines, ${brain.dropped} dropped -> ${res.dir}`);
    }
    if (!built) return 1;
    const exp = exportBrains({ r });
    out(`staged ${exp.written.length} file(s) into ${exp.dir}`);
    out(publishInstructions());
    return 0;
  },

  async query({ args, r }) {
    const { value: creator, terms } = splitArgs(args, '--creator');
    try {
      const res = queryBrains(terms.join(' '), { r, creator });
      out(formatResults(res));
      return res.hits.length ? 0 : 1;
    } catch (e) { out(`refused: ${e.message}`); return 1; }
  },

  async daily({ args, r, deps, clock }) {
    const perHour = Number((args.find((a) => a.startsWith('--per-hour=')) || '').split('=')[1]) || undefined;
    const record = await runDaily({
      r,
      deps,
      clock,
      budget: perHour ? { perHour } : {},
      canary: { videoId: args.find((a) => a.startsWith('--canary='))?.split('=')[1] || DEFAULT_CANARY_VIDEO },
      onPhase: (p) => out(`  ${p.ok ? 'ok  ' : 'FAIL'} ${p.name}${p.reason ? ` — ${p.reason}` : ''}`),
    });
    out('');
    out(`run ${record.runId}: ${record.ok ? 'COMPLETED' : 'FINISHED WITH FAILURES'}`);
    out(`  discovered ${record.counts.discovered} · fetched ${record.counts.fetched} · `
      + `deferred ${record.counts.deferred} · no-track ${record.counts.noTrack} · failed ${record.counts.failed}`);
    out(`  digest: ${record.digestPath}`);
    return record.ok ? 0 : 1;
  },

  async status({ r }) {
    const store = ensureStore(r);
    const state = loadState(r);
    const s = summarize(state.videos);
    const creators = listCreators(r);
    const runs = listRuns(r, { limit: 5 });
    out(`store:   ${store.base}`);
    out(`yt-dlp:  ${JSON.stringify(selfCheck())}`);
    out(`creators: ${creators.length} (${creators.filter((c) => c.enabled).length} enabled)`);
    out('');
    out(`videos tracked: ${s.total} · fetched: ${s.fetched} (${Math.round(s.coverage * 100)}%)`);
    for (const [k, v] of Object.entries(s.counts)) if (v) out(`  ${k}: ${v}`);
    out('');
    if (runs.length) {
      out('recent runs:');
      for (const run of runs) out(`  ${run.runId} ${run.ok ? 'ok' : 'FAIL'} fetched=${run.counts.fetched}`);
    } else out('recent runs: none — the daily job has not run yet');
    return 0;
  },

  async sync({ r }) {
    const res = await syncSubscriptions({ r });
    if (res.blocked) {
      out(`BLOCKED: ${res.reason}`);
      out(res.message);
      out('');
      for (const s of res.steps) out(`  ${s}`);
      return 1;
    }
    out(`synced ${res.upserted} subscription(s); new creators are DISABLED`);
    return 0;
  },

  async canary({ args, r, deps }) {
    const videoId = args[0] || DEFAULT_CANARY_VIDEO;
    const check = selfCheck();
    out(`yt-dlp: ${check.ok ? `ok (${check.version}) via ${check.reason}` : `MISSING — ${check.reason}`}`);
    if (!check.ok) return 1;
    const probe = (deps && deps.probeSubs) || probeSubs;
    const fetcher = (deps && deps.fetchJson3) || fetchJson3;
    const p = probe(videoId);
    if (!p.ok) { out(`probe FAILED for ${videoId}: ${p.error}`); return 1; }
    out(`probe ok — ${p.languages.length} language(s): ${p.languages.slice(0, 8).join(', ')}`);
    const lang = p.languages.includes('en') ? 'en' : p.languages[0];
    const { cues } = parseJson3(fetcher(videoId, lang));
    out(`fetch ok — ${cues.length} cues in ${lang}`);
    return cues.length ? 0 : 1;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

export async function main(argv = process.argv.slice(2)) {
  const [cmd, ...args] = argv;
  if (!cmd || cmd === 'help' || cmd === '--help') {
    out('creator-brains — one brain per creator, built from their own videos');
    out('');
    out('  add <@handle|url|UC…id> [--name T]   add a creator (born disabled)');
    out('  list                                 show the catalog');
    out('  enable <channel_id> [--off]          flip the fetch switch');
    out('  discover [channel_id] [--limit=N]    enumerate uploads');
    out('  fetch [channel_id] [--per-hour=N]    fetch pending transcripts');
    out('  build [channel_id]                   render brains + stage export');
    out('  query <terms> [--creator <id>]       ask the brains');
    out('  daily [--per-hour=N] [--canary=ID]   the full daily job');
    out('  status                               store + coverage summary');
    out('  sync                                 OAuth subscription sync');
    out('  canary [video_id]                    prove yt-dlp still works');
    out('');
    out(`store root: ${root()}  (override with CREATOR_BRAINS_ROOT)`);
    return 0;
  }
  const fn = COMMANDS[cmd];
  if (!fn) { out(`unknown command '${cmd}' — run with no arguments for help`); return 1; }
  return fn({ args, r: root(), deps: {}, clock: null });
}

const invokedDirectly = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('creator-brains/cli.mjs');
if (invokedDirectly) {
  main().then((code) => { process.exitCode = code; }).catch((e) => {
    out(`error: ${e && e.stack ? e.stack : e}`);
    process.exitCode = 1;
  });
}
