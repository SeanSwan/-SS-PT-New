#!/usr/bin/env node
/**
 * consult-seats-check.mjs — does every configured panel seat actually exist?
 * ==========================================================================
 * A config entry is not a capability. `consult-panel.mjs` declares five seats;
 * `consult-qwen.mjs` has never existed in this repo (verified against HEAD and
 * origin/main). Nothing crashed — the panel is deliberately built so a dead
 * seat cannot kill the run — so the gap sat there silently, and any panel
 * invocation naming `qwen` quietly returned one fewer perspective than it
 * looked like it had.
 *
 * That is the failure mode this guards: not a crash, but a REVIEW THAT READS AS
 * COMPLETE WHILE A VOICE IS MISSING. The same class as a meter that measures an
 * attempt instead of an outcome.
 *
 * Deterministic, read-only, no network, no spend, no model call. Parses the
 * seat table out of consult-panel.mjs rather than duplicating it — a second
 * hand-maintained copy of the seat list would be its own drift source.
 *
 *   node scripts/consult-seats-check.mjs            # report
 *   node scripts/consult-seats-check.mjs --check    # exit 2 on drift (CI/hook)
 *
 * Exit 0 = every declared seat has a transport on disk. Exit 2 = drift.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PANEL = join(HERE, 'consult-panel.mjs');

/**
 * Read the declared seats out of the panel's own SEATS table. Regex rather than
 * import because importing consult-panel.mjs would RUN it (it is a CLI with
 * top-level await and a spend path) — reading is the whole job here.
 */
export function declaredSeats(panelPath = PANEL) {
  if (!existsSync(panelPath)) return { seats: [], error: `panel not found: ${panelPath}` };
  const src = readFileSync(panelPath, 'utf8');

  // Anchor on each `script:` declaration and walk BACKWARDS to the nearest
  // enclosing `name: {`. The first version anchored on the seat name and
  // required `script:` before `paid:` at a two-space indent — so a reordered or
  // reindented entry parsed as nothing, the seat vanished from the audit, and
  // the checker reported CLEAN while that seat's transport was missing. A
  // checker with a blind spot is worse than no checker.
  const seats = [];
  const scriptRe = /script:\s*['"`]([^'"`]+)['"`]/g;
  for (const m of src.matchAll(scriptRe)) {
    const before = src.slice(0, m.index);
    const owner = [...before.matchAll(/(\w+)\s*:\s*\{/g)].pop();
    if (!owner) continue;
    // `paid:` may sit either side of `script:` within the same entry.
    const window = src.slice(owner.index, m.index + 400);
    const paid = /paid:\s*(true|false)/.exec(window);
    seats.push({ name: owner[1], script: m[1], paid: paid ? paid[1] === 'true' : null });
  }

  // Independent cross-check: every `script:` in the file must have produced a
  // seat. If the two counts disagree, the parse is partial — and a partial
  // parse is exactly how a missing seat goes unseen. Refuse rather than guess.
  const declaredCount = (src.match(scriptRe) ?? []).length;
  if (seats.length !== declaredCount) {
    return { seats: [], error: `partial parse (${seats.length}/${declaredCount} script declarations resolved) — this checker is now blind` };
  }
  return { seats, error: seats.length ? null : 'no seats parsed — the SEATS table shape changed; this checker is now blind' };
}

export function auditSeats({ panelPath = PANEL, scriptsDir = HERE } = {}) {
  const { seats, error } = declaredSeats(panelPath);
  if (error) return { ok: false, blind: true, error, present: [], missing: [] };
  const present = [];
  const missing = [];
  for (const s of seats) {
    (existsSync(join(scriptsDir, s.script)) ? present : missing).push(s);
  }
  return { ok: missing.length === 0, blind: false, error: null, seats, present, missing };
}

if (import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1] ?? '').href) {
  const strict = process.argv.includes('--check');
  const r = auditSeats();

  if (r.blind) {
    // A checker that cannot see is worse than no checker, because it reports
    // clean. Fail loudly rather than certify from an empty parse.
    console.error(`[seats] BLIND — ${r.error}`);
    process.exit(2);
  }

  console.log(`[seats] ${r.seats.length} declared in consult-panel.mjs`);
  for (const s of r.present) console.log(`  ok      ${s.name.padEnd(6)} ${s.script}${s.paid ? ' (paid)' : ' (free)'}`);
  for (const s of r.missing) console.log(`  MISSING ${s.name.padEnd(6)} ${s.script}${s.paid ? ' (paid)' : ' (free)'}`);

  if (r.missing.length) {
    console.log('');
    console.log(`[seats] ${r.missing.length} declared seat(s) have no transport on disk.`);
    console.log('[seats] The panel will NOT crash — a dead seat settles ok:false and the run continues.');
    console.log('[seats] The risk is quieter: a panel that reads as complete while a voice is missing.');
    console.log(`[seats] Restore the script, or drop the seat from --seats. Backup record:`);
    console.log('[seats]   docs/ai-workflow/AI-HANDOFF/CONSULT-SEAT-MANIFEST-2026-08-21.md');
    if (strict) process.exit(2);
  } else {
    console.log('[seats] CLEAN — every declared seat has a transport.');
  }
}
