/**
 * invocation-plan.mjs — ONE description of "what this command line runs", consumed by
 * both the spend gate and the Fable purpose gate.
 * ============================================================================
 * WHY THIS EXISTS. Codex hostile review 2026-08-31 found three defects that are all
 * the same defect, and none of them is a matcher bug:
 *
 *   1. `--seats "fable,sol"` read as `"fable` — a flag parsed out of RAW TEXT.
 *   2. `<panel --seats sol> && <panel --seats fable>` cleared, because the FIRST
 *      `--seats` on the line won and a different command's flag answered for this one.
 *   3. Two confirmed Fable panels priced as ONE — because `isPanel` is a line-level
 *      boolean, so N panels collapse to 1.
 *
 * Each was patched separately in the past and each came back. The common root is that
 * both gates reduced a command line to SCALARS — one scriptName, one isPanel, one
 * seats string — and a line is a LIST. Multiplicity and ownership are the information
 * being destroyed, so no amount of regex care recovers them.
 *
 * So the answer is not another pattern. It is to stop flattening: parse once into a
 * list of invocations, each carrying its own argv, and let both gates ask ordinary
 * questions of that list. Repeated panels are two entries; a flag belongs to the entry
 * it sits in; a quoted value was already unquoted by the parser, because quoting is
 * structure the parser consumed rather than text a regex has to survive.
 *
 * This is the same move that replaced the invocation regex with a parser in round 4,
 * applied one level up — and for the same reason: whole classes stop existing instead
 * of being enumerated.
 *
 * DELIBERATELY NOT A POLICY LAYER. It reports what runs. Which seats cost money, what
 * they cost, and whether Fable may be spent at all are decisions the two gates own,
 * because they answer different questions of the same facts.
 */
import { invokedScripts, flagFrom, hasFlag } from './shell-parse.mjs';

/** Seat scripts whose price is a fan-out over `--seats`, not a single model. */
export const PANEL_SCRIPT_NAMES = new Set(['consult-openrouter-panel.mjs', 'consult-panel.mjs']);

/** One key per seat: the gateway engine keeps its PATH, everything else its basename. */
export function seatKey(path) {
  const p = String(path).split('\\').join('/');
  if (p.includes('context-gateway/src/consult.mjs')) return 'context-gateway/src/consult.mjs';
  if (p.includes('context-gateway/src/transport.mjs')) return 'context-gateway/src/transport.mjs';
  if (p.includes('lib/preflight.mjs')) return 'lib/preflight.mjs';
  return p.replace(/^.*\//, '');
}

/**
 * Every invocation on this command line, in order, each with its OWN argv.
 *
 * @returns {Array<{name:string, path:string, args:string[], isPanel:boolean,
 *                  seats:string[]|null, unknown:boolean}>}
 *
 * `seats` is `null` when the invocation is not a panel, an empty array when it is a
 * panel that named no seats, and the parsed list otherwise. That distinction matters:
 * the spend gate learned in round 5 that an EMPTY seat list is not "no seats", it is
 * the default roster — and collapsing the two priced a confirmed fan-out at $0.
 */
export function planFrom(cmd) {
  return invokedScripts(cmd)
    .filter((s) => !s.nonExecuting)
    .map((s) => {
      if (s.unknown) {
        return { name: s.path, path: s.path, args: [], isPanel: false, seats: null, unknown: true };
      }
      const name = seatKey(s.path);
      const isPanel = PANEL_SCRIPT_NAMES.has(name);
      // Read from THIS invocation's argv. The quoting was consumed during parsing, so
      // `--seats "fable,sol"` arrives as the value `fable,sol` with no quote to strip —
      // which is why the raw-text reader's `"fable` bug cannot recur here.
      const raw = isPanel ? flagFrom(s.args, 'seats') : undefined;
      const seats = isPanel
        ? String(raw ?? '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean)
        : null;
      return { name, path: s.path, args: s.args, isPanel, seats, unknown: false };
    });
}

/** True when any invocation on the line names `seat` in its own `--seats`. */
export function panelNamesSeat(cmd, seat) {
  return planFrom(cmd).some((inv) => inv.isPanel && (inv.seats || []).includes(seat));
}

/** Invocations the parser could see but not attribute. */
export const unmodelled = (cmd) => planFrom(cmd).filter((inv) => inv.unknown).map((inv) => inv.name);

/** Read a flag from the invocation that owns it, first invocation that carries it. */
export function flagOnAnyInvocation(cmd, flag) {
  for (const inv of planFrom(cmd)) {
    const v = flagFrom(inv.args, flag);
    if (v !== undefined) return v;
  }
  return undefined;
}

export { flagFrom, hasFlag };
