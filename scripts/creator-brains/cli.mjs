#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/cli.mjs
 * PURPOSE: The command surface — and the place where a run's verdict becomes
 *          an exit code and a sentence a human can act on.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR02/03/16)
 * ADDED: 2026-09-12 | REWRITTEN 2026-09-13
 * ============================================================================
 *
 *   node scripts/creator-brains/cli.mjs <command> [args]
 *
 * WHAT THE REVIEW FOUND:
 *
 *   HR02 — `fetch <channel_id>` fetched EVERYBODY. `targets` was computed and
 *     then discarded, because `runDaily` reloaded all enabled creators. The
 *     selection is now passed through and intersected with the enabled set;
 *     naming a disabled or unknown creator is a refusal, not a silent widening.
 *     A FLAG IS NEVER A CREATOR REFERENCE either — `--per-hour=2` used to be
 *     looked up as a channel id.
 *
 *   HR03 — `fetch` printed "failed 2" and returned 0. The exit code came from
 *     the phase-name list rather than the verdict. Every command now derives its
 *     exit code from the run record, and the meanings are documented:
 *       0 success · 1 work failed · 2 refused/blocked · 3 deferred (nothing wrong,
 *       nothing done).
 *
 * EXIT CODES ARE A CONTRACT. A scheduler reads them; a human reads the sentences.
 *   Both must say the same thing.
 *
 * @module creator-brains/cli
 */

import { runDaily, DEFAULT_CANARY_VIDEO } from './lib/run.mjs';
import {
  addCreator, listCreatorsSafe, setEnabled, getCreator,
} from './lib/registry.mjs';
import { buildBrain } from './lib/extract.mjs';
import { publishBrain, publishEmpty, readPointer, listPublished } from './lib/render.mjs';
import { queryBrains, formatResults } from './lib/query.mjs';
import { exportBrains, publishInstructions } from './lib/export.mjs';
import { syncSubscriptions, OAUTH_STATUS, defaultCredentialPath } from './lib/subs.mjs';
import {
  readState, stateOrDefault, readRegistry, registryOrDefault, isDamaged, describeRead,
  enabledCreators, ensureStore, listRuns, readRunJournal, readLastSuccess, listDocsChecked,
  listDocs,
} from './lib/store.mjs';
import { lockStatus } from './lib/lock.mjs';
import { summarize } from './lib/summary.mjs';
import { openBudget, budgetState, BudgetError } from './lib/ledger.mjs';
import { selfCheck, probeSubs, fetchJson3, safeVersion } from './lib/ytdlp.mjs';
import { parseJson3 } from '../swan-scout/yt-scout-transcript.mjs';
import { validateCues } from './lib/subtitles.mjs';
import { paths, root } from './lib/paths.mjs';

/** Exit codes, named so the callers cannot drift from the meaning. */
export const EXIT = Object.freeze({
  OK: 0, FAILED: 1, REFUSED: 2, DEFERRED: 3,
});

// The command implementations live in commands.mjs. IMPORT them — an
// `export … from` creates no local binding, so `main()` could not see
// `COMMANDS` and every CLI invocation died with a ReferenceError. The unit tests
// missed it because they call `COMMANDS.fetch(...)` directly instead of going
// through `main()`, which is why `T-21` now runs the entry point itself.
import { COMMANDS, verdictExit } from './commands.mjs';

// Re-exported so the CLI entry point stays the import surface for both.
export { COMMANDS, verdictExit };

const out = (s) => process.stdout.write(`${s}\n`);

/** Positional arguments only — a flag is never a creator reference (HR02). */
function positionals(args) {
  const out2 = [];
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a.startsWith('--')) {
      // Skip a flag's value when it is given as the next bare token.
      if (!a.includes('=') && args[i + 1] && !args[i + 1].startsWith('--')) i += 1;
      continue;
    }
    out2.push(a);
  }
  return out2;
}

function flagValue(args, name, fallback = null) {
  const withEq = args.find((a) => a.startsWith(`${name}=`));
  if (withEq) return withEq.slice(name.length + 1);
  const i = args.indexOf(name);
  if (i > -1 && args[i + 1] && !args[i + 1].startsWith('--')) return args[i + 1];
  return fallback;
}

/** Resolve explicit channel selections against the enabled registry (HR02). */
function resolveSelection(r, wanted) {
  const read = readRegistry(r);
  if (isDamaged(read)) return { ok: false, reason: `registry.json is ${describeRead(read)}` };
  const reg = registryOrDefault(read);
  const enabled = enabledCreators(reg);
  if (!wanted.length) return { ok: true, enabled, onlyCreators: null, reg };
  const byId = new Map(Object.values(reg.creators).map((c) => [c.channelId, c]));
  const only = [];
  for (const w of wanted) {
    const hit = byId.get(w)
      || Object.values(reg.creators).find((c) => c.handle && c.handle.toLowerCase() === w.toLowerCase());
    if (!hit) return { ok: false, reason: `'${w}' is not in the registry` };
    if (!hit.enabled) return { ok: false, reason: `'${hit.title || hit.channelId}' is disabled — enable it first` };
    only.push(hit.channelId);
  }
  return {
    ok: true, enabled: enabled.filter((c) => only.includes(c.channelId)), onlyCreators: only, reg,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

const HELP = `creator-brains — one brain per creator, built from their own videos

  add <@handle|url|UC…id> [--name T]   add a creator (born disabled)
  list                                 show the catalog
  enable <channel_id> [--off]          flip the fetch switch
  discover [channel_id…] [--full]       enumerate uploads (videos+shorts+streams)
  fetch [channel_id…] [--retry]        fetch due transcripts
  build [channel_id…]                  render + validate + publish generations
  repair                               reconcile state against documents, rebuild
  query <terms> [--creator <id>]       ask the brains
  daily [channel_id…] [--retry] [--full]  the full pass
  status                               store, budget, backlog, census, throttle, lock
  throttle [--clear]                   show / clear the shared 429 cooldown
  backup <dest-dir> [--with-derived]   back up the DURABLE set (transcripts first)
  verify-backup <backup-dir>           re-hash a backup against its manifest
  restore <backup-dir> <empty-target>  restore into an ISOLATED root
  rollback [channel_id] [--all]        unpublish DERIVED brains; archive untouched
  authorize [--credential P] [--token P]  OAuth consent (interactive, one time)
  sync                                 OAuth subscription sync into the catalog
  canary [video_id]                    prove yt-dlp still works

run limits (apply to daily/fetch/discover; defaults are finite):
  --per-hour=N        transport operations per rolling hour (default 60)
  --max-ops=N         transport operations for THIS run (default: one hour's cap)
  --max-minutes=N     wall-clock ceiling for THIS run (default 45)
  --no-track-hours=N  no-caption retry window (default 48)

discovery modes (daily/discover):
  default             INCREMENTAL — stop at the newest known video; answers "what is new?"
  --full              AUTHORITATIVE census — walk the whole corpus; the only walk
                      that can confirm a deleted video, resumable across runs

exit codes: 0 ok · 1 work failed · 2 refused/blocked · 3 deferred (nothing wrong, nothing done)
store root: ${root()}  (override with CREATOR_BRAINS_ROOT)`;

export async function main(argv = process.argv.slice(2)) {
  const [cmd, ...args] = argv;
  if (!cmd || cmd === 'help' || cmd === '--help') { out(HELP); return EXIT.OK; }
  const fn = COMMANDS[cmd];
  if (!fn) { out(`unknown command '${cmd}' — run with no arguments for help`); return EXIT.REFUSED; }
  return fn({
    args, r: root(), deps: {}, clock: null,
  });
}

const invokedDirectly = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('creator-brains/cli.mjs');
if (invokedDirectly) {
  main().then((code) => { process.exitCode = code; }).catch((e) => {
    out(`error: ${e && e.stack ? e.stack : e}`);
    process.exitCode = EXIT.FAILED;
  });
}

export { paths, OAUTH_STATUS, defaultCredentialPath, readPointer, listDocsChecked, exportBrains };
