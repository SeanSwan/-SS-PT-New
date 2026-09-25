/**
 * app-registries — what a registry row must look like, and nothing else.
 * @module scripts/swan-brain-console/app/app-registries
 *
 * WHY THIS MODULE EXISTS (round 9, 2026-09-20)
 * These three validators and their two constants lived in `app-shell.js` until a round-9 fix
 * pushed that module to 329 lines against Rule 4's 300-line budget. The split is by SUBJECT,
 * not by line count: this file answers "is this registry row well-formed?" and holds no DOM,
 * no I/O and no state. `app-shell.js` keeps the half that touches the document.
 *
 * `app-shell.js` re-exports every name here, so `app-shell.test.mjs` and `app.js` are
 * unchanged — the seam moved, the surface did not.
 *
 * THE HOUSE RULE THESE ENCODE: a validator never throws. A malformed registry becomes a
 * visible, named report (`{ ok: false, errors, rows }`) with the valid rows preserved, so a
 * single bad row degrades one panel instead of blanking the console. `rows` carrying only the
 * surviving rows is load-bearing — a caller that renders `rows` cannot render a row that
 * failed validation.
 */

/** Tab ids must be safe to interpolate into an element id and an ARIA reference. */
const ID_RE = /^[a-z][a-z0-9-]*$/;

/**
 * Seat gates. Anything unrecognised is reported, never silently treated as runnable.
 *
 * Exported because `app-shell.js`'s `seatAction` reads the same vocabulary: a planner that
 * decides whether a seat is runnable must use the exact set the validator accepts, or a seat
 * can validate and then be planned as something else.
 */
export const SEAT_GATES = Object.freeze(['relay', 'manual', 'direct']);

function isPlainObject(v) {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}

/** Validate the tabs registry: unique, id-shaped, labelled rows. */
export function validateTabs(value) {
  if (!Array.isArray(value)) return { ok: false, errors: ['tabs registry must be a JSON array'], rows: [] };
  const errors = [];
  const seen = new Set();
  const rows = [];
  value.forEach((row, i) => {
    if (!isPlainObject(row)) { errors.push(`row ${i}: not an object`); return; }
    if (typeof row.id !== 'string' || !ID_RE.test(row.id)) {
      errors.push(`row ${i}: "id" must match ${ID_RE} (got ${JSON.stringify(row.id)})`);
      return;
    }
    if (seen.has(row.id)) { errors.push(`row ${i}: duplicate id "${row.id}"`); return; }
    if (typeof row.label !== 'string' || !row.label.trim()) {
      errors.push(`row ${i} ("${row.id}"): missing "label"`);
      return;
    }
    seen.add(row.id);
    rows.push({ id: row.id, label: row.label, module: row.module ?? null, api: row.api ?? null });
  });
  return { ok: errors.length === 0, errors, rows };
}

/** Validate the sources registry: every entry names a path this repo can be asked about. */
export function validateSources(value) {
  if (!Array.isArray(value)) return { ok: false, errors: ['sources registry must be a JSON array'], rows: [] };
  const errors = [];
  const rows = [];
  value.forEach((row, i) => {
    if (!isPlainObject(row)) { errors.push(`row ${i}: not an object`); return; }
    if (typeof row.id !== 'string' || !ID_RE.test(row.id)) { errors.push(`row ${i}: bad "id"`); return; }
    if (typeof row.path !== 'string' || !row.path) { errors.push(`row ${i} ("${row.id}"): missing "path"`); return; }
    rows.push({ id: row.id, kind: row.kind ?? 'unknown', path: row.path, note: row.note ?? '' });
  });
  return { ok: errors.length === 0, errors, rows };
}

/** Validate the seats registry. `billing` may honestly be "unknown". */
export function validateSeats(value) {
  if (!Array.isArray(value)) return { ok: false, errors: ['seats registry must be a JSON array'], rows: [] };
  const errors = [];
  const rows = [];
  value.forEach((row, i) => {
    if (!isPlainObject(row)) { errors.push(`row ${i}: not an object`); return; }
    if (typeof row.seat !== 'string' || !ID_RE.test(row.seat)) { errors.push(`row ${i}: bad "seat"`); return; }
    if (typeof row.script !== 'string' || !row.script) { errors.push(`row ${i} ("${row.seat}"): missing "script"`); return; }
    if (!SEAT_GATES.includes(row.gate)) {
      errors.push(`row ${i} ("${row.seat}"): "gate" must be one of ${SEAT_GATES.join(', ')}`);
      return;
    }
    rows.push({
      seat: row.seat,
      script: row.script,
      billing: row.billing ?? 'unknown',
      gate: row.gate,
    });
  });
  return { ok: errors.length === 0, errors, rows };
}
