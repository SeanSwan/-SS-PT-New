#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/run-daily.mjs
 * PURPOSE: The scheduled entry point. One command for Task Scheduler / cron —
 *          run the pass, print the digest, exit with a code that means
 *          something.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint 1.0, S8)
 * ADDED: 2026-09-12
 * ============================================================================
 *
 * WHY THIS IS A SEPARATE FILE FROM cli.mjs:
 *   A scheduler entry point has different requirements from an interactive CLI.
 *   It must be non-interactive, must never prompt, must always leave a written
 *   artifact behind, and its exit code must be trustworthy enough for the
 *   scheduler's own failure handling. Mixing those into the interactive command
 *   surface is how a "daily" job ends up waiting on a prompt at 6:30am.
 *
 * WINDOWS TASK SCHEDULER — the two settings that actually matter:
 *   1. "Run task as soon as possible after a scheduled start is missed"
 *      (StartWhenAvailable). A forced-update reboot at 06:00 otherwise means
 *      the 06:30 run is simply skipped, silently.
 *   2. "Run whether user is logged on or not" with "Do not store password"
 *      OFF for this account, or the task only fires while the desktop is
 *      unlocked — which for a desktop used for editing is most of the day but
 *      not the morning.
 *
 *   schtasks /create /tn "Creator Brains Daily" /sc daily /st 06:30 ^
 *     /tr "node \"C:\\path\\to\\SS-PT\\scripts\\creator-brains\\run-daily.mjs\"" ^
 *     /rl LIMITED /f
 *   then set StartWhenAvailable in Task Scheduler's UI (schtasks cannot).
 *
 * WHAT IT DOES NOT DO: it does not push to Telegram. Hermes owns that channel,
 *   and adding a second unverified sender would mean two things claiming to be
 *   the alert. The digest is a file; wiring Hermes to read it is the owner's
 *   step and is documented in README.md rather than guessed at here.
 *
 * @module creator-brains/run-daily
 */

import { readFileSync } from 'node:fs';
import { runDaily, DEFAULT_CANARY_VIDEO } from './lib/run.mjs';
import { root } from './lib/paths.mjs';
import { enabledCreators, loadRegistry } from './lib/store.mjs';
import { listCreators } from './lib/registry.mjs';
import { selfCheck } from './lib/ytdlp.mjs';

const out = (s) => process.stdout.write(`${s}\n`);

async function main() {
  const args = process.argv.slice(2);
  const perHourArg = args.find((a) => a.startsWith('--per-hour='));
  const canaryArg = args.find((a) => a.startsWith('--canary='));
  const r = root();

  out(`creator-brains daily · ${new Date().toISOString()}`);
  out(`store:  ${r}`);

  const check = selfCheck();
  out(`yt-dlp: ${check.ok ? `ok (${check.version}) via ${check.reason}` : `UNAVAILABLE — ${check.reason}`}`);
  if (!check.ok) {
    // Fail LOUD and EARLY. Every later phase would fail too, and reporting a
    // cascade of fetch errors buries the one sentence that matters.
    out('');
    out('Refusing to run: yt-dlp is not resolvable, so nothing can be fetched.');
    out('Install it with `uv tool install yt-dlp`, or set CREATOR_BRAINS_YTDLP to a binary path.');
    return 2;
  }

  const reg = loadRegistry(r);
  const all = listCreators(r);
  const enabled = enabledCreators(reg);
  out(`creators: ${all.length} known, ${enabled.length} enabled`);
  if (!enabled.length) {
    out('');
    out('No enabled creators — nothing to do. Enable one with:');
    out('  node scripts/creator-brains/cli.mjs enable <channel_id>');
    return 0;
  }

  const record = await runDaily({
    r,
    budget: perHourArg ? { perHour: Number(perHourArg.split('=')[1]) } : {},
    canary: { videoId: canaryArg ? canaryArg.split('=')[1] : DEFAULT_CANARY_VIDEO },
    onPhase: (p) => out(`  ${p.ok ? 'ok  ' : 'FAIL'} ${p.name}${p.reason ? ` — ${p.reason}` : ''}`),
  });

  out('');
  out(`run ${record.runId}: ${record.ok ? 'COMPLETED' : 'FINISHED WITH FAILURES'}`);
  out(`  discovered ${record.counts.discovered} · fetched ${record.counts.fetched} · `
    + `deferred ${record.counts.deferred} · no-track ${record.counts.noTrack} · failed ${record.counts.failed}`);
  out('');

  // Print the digest so the scheduler's captured output IS the report — a bare
  // exit code in a log file tells a future reader nothing.
  try {
    out(readFileSync(record.digestPath, 'utf-8'));
  } catch {
    out(`(digest at ${record.digestPath} could not be re-read)`);
  }

  return record.ok ? 0 : 1;
}

main()
  .then((code) => { process.exitCode = code; })
  .catch((e) => {
    out(`fatal: ${e && e.stack ? e.stack : e}`);
    process.exitCode = 1;
  });
