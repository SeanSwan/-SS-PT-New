#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/launch.mjs
 * PURPOSE: Interactive operator menu — pick creators by number, run the daily
 *          pass, ask the brains, without memorizing CLI flags.
 * PART OF: Creator Brains — SS-PT acquisition engine (R2 review follow-up)
 * ADDED: 2026-09-15
 * ============================================================================
 *
 * WHY THIS EXISTS (Sean, 2026-09-15): "I want to be able to use it and choose
 * which creators I want to build brains off." The engine is a CLI; every action
 * here is THIN GLUE over the same `COMMANDS` table `cli.mjs` uses, so the menu
 * can never drift from the tested surface. Nothing in this file touches the
 * store directly except reading the catalog/state to RENDER the pick lists and
 * calling `setEnabled` — the one registry mutation the menu owns (it goes
 * through the same `setEnabled` the CLI's `enable`/`disable` uses).
 *
 * DESIGN:
 *   - All I/O is injected (`io.ask` / `io.print`), so tests drive the menu with
 *     a scripted queue and a silent sink (same pattern as consent.mjs).
 *   - Every action is wrapped: an error prints and the menu continues. A menu
 *     that exits on a refused command is a menu that teaches people to avoid it.
 *     Damaged store files refuse their ACTION and name the file; they never
 *     render an empty catalog as if it were the truth (HR05, applied to UX).
 *   - The menu itself always exits 0 — it is not a job; nothing here pages a
 *     scheduler.
 *
 * LAUNCHED FROM: `Creator Brains.cmd` on the Desktop, or
 *   node scripts/creator-brains/launch.mjs
 *
 * @module creator-brains/launch
 */

import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { join } from 'node:path';
import { COMMANDS } from './commands.mjs';
import { listCreatorsSafe, setEnabled } from './lib/registry.mjs';
import {
  readState, stateOrDefault, isDamaged, describeRead, ensureStore,
} from './lib/store.mjs';
import { root } from './lib/paths.mjs';
import { throttleState, formatThrottle } from './lib/throttle.mjs';

const EXIT_OK = 0;

/** The menu, in the order an operator thinks: look, choose, run, ask, care. */
export const MENU = [
  { key: '1', label: 'Status', hint: 'store health, budget, backlog, staleness' },
  { key: '2', label: 'List creators', hint: 'who is in the catalog, ON or off' },
  { key: '3', label: 'Add a creator', hint: '@handle, channel URL, or UC… id' },
  { key: '4', label: 'Enable a creator', hint: 'start building this brain (pick by number)' },
  { key: '5', label: 'Disable a creator', hint: 'stop fetching this one (pick by number)' },
  { key: '6', label: 'Run the daily pass', hint: 'discover new videos + fetch transcripts + rebuild' },
  { key: '7', label: 'Ask the brains', hint: 'search published claims, with citations' },
  { key: '8', label: 'Canary check', hint: 'is yt-dlp working at all today?' },
  { key: '9', label: 'Repair missing documents', hint: 're-queue videos whose transcripts vanished' },
  { key: 'b', label: 'Backup', hint: 'copy the durable store to a dated folder' },
  { key: 'q', label: 'Quit', hint: '' },
];

function defaultIo() {
  const rl = createInterface({ input, output });
  return {
    ask: (q) => rl.question(q),
    print: (s = '') => output.write(`${s}\n`),
    close: () => rl.close(),
  };
}

/** Render the catalog as a numbered pick list. Returns the rows, or null. */
export function renderCreators(creators, stateMap) {
  if (!creators.length) return [];
  return creators.map((c, i) => {
    const videos = Object.values(stateMap.videos || {}).filter((v) => v.channelId === c.channelId);
    const fetched = videos.filter((v) => v.state === 'fetched').length;
    return {
      n: i + 1,
      channelId: c.channelId,
      title: c.title || c.channelId,
      on: c.enabled === true,
      videos: videos.length,
      fetched,
    };
  });
}

function printCreators(io, rows, flag) {
  const shown = flag === undefined ? rows : rows.filter((r) => r.on === flag);
  if (!shown.length) {
    io.print(flag === true
      ? 'No enabled creators yet — pick "Enable a creator" first.'
      : 'No creators in the catalog yet — pick "Add a creator" first.');
    return;
  }
  io.print('    #  ON?   videos (fetched)  title — channel id');
  for (const r of shown) {
    io.print(`   ${String(r.n).padStart(2)}  ${r.on ? 'ON ' : 'off'}   ${String(r.videos).padStart(5)} (${String(r.fetched).padStart(5)})  ${r.title} — ${r.channelId}`);
  }
}

/** Number-pick one row from `rows` (the SAME numbering renderCreators printed). */
async function pickRow(io, rows, verb) {
  const answer = (await io.ask(`number to ${verb} (Enter cancels): `)).trim();
  if (!answer) return null;
  const n = Number(answer);
  const hit = rows.find((r) => r.n === n);
  if (!hit) { io.print(`no row ${answer} in that list — cancelled.`); return null; }
  return hit;
}

async function catalogRows(r, io) {
  const stateRead = readState(r);
  if (isDamaged(stateRead)) {
    io.print(`state.json is ${describeRead(stateRead)} — refusing to render the catalog.`);
    return null;
  }
  const state = stateOrDefault(stateRead);
  const catalog = listCreatorsSafe(r);
  if (!catalog.ok) { io.print(`registry.json is ${describeRead(catalog.read)} — refusing.`); return null; }
  return renderCreators(catalog.creators, state);
}

/** One menu action. Returns true to continue, false to quit. */
export async function performAction(key, { r, io }) {
  switch (key) {
    case '1': await COMMANDS.status({ r }); return true;
    case '2': {
      const rows = await catalogRows(r, io);
      if (rows) printCreators(io, rows, undefined);
      return true;
    }
    case '3': {
      const ref = (await io.ask('creator (@handle, channel URL, or UC… id): ')).trim();
      if (ref) await COMMANDS.add({ args: [ref], r });
      return true;
    }
    case '4':
    case '5': {
      const enabling = key === '4';
      const rows = await catalogRows(r, io);
      if (!rows) return true;
      printCreators(io, rows, enabling ? false : true);
      const hit = await pickRow(io, enabling ? rows.filter((x) => !x.on) : rows.filter((x) => x.on), enabling ? 'ENABLE' : 'disable');
      if (hit) {
        try {
          const c = setEnabled(r, hit.channelId, enabling);
          io.print(`${c.title} is now ${c.enabled ? 'ON — the daily pass will build this brain' : 'off'}.`);
        } catch (e) { io.print(`refused: ${e.message}`); }
      }
      return true;
    }
    case '6': {
      const raw = (await io.ask('transport ops per hour [20]: ')).trim();
      const n = raw === '' ? 20 : Number(raw);
      if (!Number.isInteger(n) || n < 1) { io.print(`'${raw}' is not a positive whole number — nothing run.`); return true; }
      await COMMANDS.daily({ args: [`--per-hour=${n}`], r });
      return true;
    }
    case '7': {
      const text = (await io.ask('ask the brains (e.g. "shadow lift"): ')).trim();
      if (text) await COMMANDS.query({ args: [text], r });
      return true;
    }
    case '8': await COMMANDS.canary({}); return true;
    case '9': await COMMANDS.repair({ r }); return true;
    case 'b': {
      const dest = (await io.ask(`backup destination [${join(root(r), '..', 'backups', `creator-brains-${new Date().toISOString().slice(0, 10)}`)}]: `)).trim();
      await COMMANDS.backup({ r, args: [dest || undefined] });
      return true;
    }
    case 'q': return false;
    default:
      io.print(`'${key}' is not on the menu.`);
      return true;
  }
}

/**
 * Run the menu until Quit.
 * @param io  injected `{ ask, print, close }` — tests pass a scripted queue.
 */
export async function runLauncher({ r = root(), io = defaultIo() } = {}) {
  ensureStore(r);
  try {
    io.print('Creator Brains — one brain per creator, built from their own videos.');
    io.print(`store: ${root(r)}`);
    // eslint-disable-next-line no-constant-condition
    while (true) {
      io.print('');
      io.print(`throttle: ${formatThrottle(throttleState(r))}`);
      for (const m of MENU) io.print(`  ${m.key.padStart(2)}  ${m.label}${m.hint ? `  — ${m.hint}` : ''}`);
      let key = (await io.ask('choose: ')).trim().toLowerCase();
      if (key === '') continue;
      if (key === 'q') break;
      const known = MENU.some((m) => m.key === key);
      if (!known) { io.print(`'${key}' is not on the menu.`); continue; }
      try {
        const goOn = await performAction(key, { r, io });
        if (!goOn) break;
      } catch (e) {
        io.print(`that action failed: ${e.message}`);
        io.print('(the menu continues — nothing was run half-way)');
      }
      await io.ask('press Enter for the menu…');
    }
    io.print('bye.');
    return EXIT_OK;
  } finally {
    if (io.close) io.close();
  }
}

/* ONLY RUN WHEN INVOKED, NOT WHEN IMPORTED (same guard as run-daily.mjs — an
 * import that launches an interactive loop is untestable and unsafe). */
const invokedDirectly = process.argv[1]
  && process.argv[1].replace(/\\/g, '/').endsWith('creator-brains/launch.mjs');
if (invokedDirectly) {
  runLauncher()
    .then((code) => { process.exitCode = code; })
    .catch((e) => {
      process.stderr.write(`fatal: ${e && e.stack ? e.stack : e}\n`);
      process.exitCode = 1;
    });
}
