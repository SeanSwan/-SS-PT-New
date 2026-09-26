/**
 * tuningStage.mjs — the write path for `config/tuning.json`. Slice A4.
 *
 * WHY THIS FILE DOES A TEXT EDIT INSTEAD OF A JSON ROUND-TRIP.
 * The obvious implementation is `JSON.parse` → mutate → `JSON.stringify`. It is also
 * wrong here, and `T-M-07` is the reason: the requirement is *byte-for-byte preservation
 * of the untouched regions*. A round-trip would:
 *   - reformat the whole file (the config is hand-formatted, with short nested objects
 *     on one line),
 *   - destroy the `$comment` paragraph that explains WHY the thresholds have the values
 *     they have — the single most valuable thing in the file,
 *   - and normalise line endings.
 * So the commit replaces exactly ONE value's byte span and leaves every other byte alone.
 * Line endings are therefore preserved for free rather than being reconstructed.
 *
 * AND IT REFUSES TO GUESS. A leaf key is located by `"<key>": <value>`. If that pattern
 * matches ZERO or MORE THAN ONE place, this module raises `E_TUNING_AMBIGUOUS` and writes
 * nothing. "Probably the right one" is how a tuning write lands in the wrong knob.
 *
 * THE WRITE IS ATOMIC (AC4.3): temp file in the SAME directory, then `renameSync`, which
 * replaces atomically. A reader sees the old bytes or the new bytes and never a prefix of
 * either. `T-M-06` interrupts a commit between those two steps and asserts the old bytes
 * are still whole.
 *
 * EVERY COMMIT KEEPS THE PRIOR FILE VERBATIM (AC4.4). Not the prior *values* — the prior
 * BYTES. Revert restores those bytes, so it is byte-exact by construction rather than by
 * re-serialising and hoping. `T-I-04` compares hashes.
 */

import { readFileSync, writeFileSync, renameSync, existsSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';

import { readTuning, flattenTuning, blastRadius } from './tuning.mjs';
import { TUNING_PATH } from './paths.mjs';

/** Where the prior-value records live. Sibling of the config, never inside it. */
export const PRIOR_PATH = `${TUNING_PATH}.prior.jsonl`;

const sha = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

const fail = (code, message) => {
  const e = new Error(`${code}: ${message}`);
  e.code = code;
  return e;
};

/** The line ending the file actually uses. Reported, never normalised. */
export function detectEol(text) {
  const crlf = (text.match(/\r\n/g) ?? []).length;
  const lf = (text.match(/(?<!\r)\n/g) ?? []).length;
  if (crlf > 0 && lf > 0) return 'mixed';
  if (crlf > 0) return 'crlf';
  return 'lf';
}

/** Render a value the way JSON would, so the replacement is valid in place. */
const renderValue = (v) => JSON.stringify(v);

/**
 * Replace the value of ONE leaf key, preserving every other byte.
 *
 * Returns `{ text, before, after, index }`. Throws `E_TUNING_AMBIGUOUS` when the key is
 * not uniquely locatable, and `E_TUNING_KEY_UNKNOWN` when it is not in the config at all.
 */
export function surgicalPatch(text, dottedKey, newValue) {
  const leaf = dottedKey.split('.').pop();
  const re = new RegExp(`"${leaf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*:\\s*(-?\\d+(?:\\.\\d+)?|true|false|null|"[^"]*")`, 'g');
  const hits = [...text.matchAll(re)];
  if (hits.length === 0) throw fail('E_TUNING_KEY_UNKNOWN', `no leaf key "${leaf}" in the config`);
  if (hits.length > 1) {
    throw fail('E_TUNING_AMBIGUOUS', `leaf key "${leaf}" matches ${hits.length} places — `
      + 'refusing to guess which one the operator meant');
  }
  const m = hits[0];
  const whole = m[0];
  const valueStart = m.index + whole.length - m[1].length;
  const before = JSON.parse(m[1]);
  const rendered = renderValue(newValue);
  return {
    text: text.slice(0, valueStart) + rendered + text.slice(valueStart + m[1].length),
    before,
    after: newValue,
    index: valueStart,
  };
}

/**
 * Apply a staged patch to the config text. Returns the new text plus a per-key record of
 * what moved. Every key is validated BEFORE any key is applied, so a patch with one bad
 * key writes nothing at all.
 */
export function applyPatch(text, staged) {
  const keys = Object.keys(staged);
  if (keys.length === 0) throw fail('E_TUNING_NO_CHANGES', 'the patch is empty — nothing to stage');

  let out = text;
  const changes = [];
  // Validate every key against the ORIGINAL text first: a partial application would be a
  // half-applied config, which is the thing atomicity exists to prevent.
  for (const key of keys) {
    const probe = surgicalPatch(text, key, staged[key]);
    changes.push({ key, before: probe.before, after: staged[key] });
  }
  // A patch whose every value already equals the current value is refused HERE, where the
  // patch is understood, rather than only at commit time where it would surface as a bare
  // hash collision. `commitStaged` keeps its own hash check as the backstop for any
  // byte-identical outcome this comparison cannot see.
  if (changes.every((c) => Object.is(c.before, c.after))) {
    throw fail('E_TUNING_NO_CHANGES',
      `every staged value already equals the live value (${keys.join(', ')}) — nothing to change`);
  }
  for (const c of changes) out = surgicalPatch(out, c.key, c.after).text;
  return { text: out, changes };
}

/**
 * Write atomically: temp file in the same directory, then rename over the target.
 *
 * `crashAfterTemp` exists ONLY so `T-M-06` can interrupt the commit between the two steps
 * and prove the old file survives. It is not a production path, and it defaults to false.
 */
export function atomicWrite(path, text, { crashAfterTemp = false } = {}) {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, text, 'utf8');
  if (crashAfterTemp) {
    const e = fail('E_COMMIT_INTERRUPTED', `simulated interruption after writing ${tmp}`);
    e.tmpPath = tmp;
    throw e;
  }
  renameSync(tmp, path);
  return { tmp, bytes: Buffer.byteLength(text, 'utf8') };
}

/** Read the prior-value records. A missing file is an empty history, not an error. */
export function readPrior(path = PRIOR_PATH) {
  if (!existsSync(path)) return [];
  const text = readFileSync(path, 'utf8');
  return text.split(/\r?\n/).filter(Boolean).map((line) => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
}

/**
 * Commit a staged patch. Writes the config, then appends a prior record that holds the
 * PREVIOUS FILE VERBATIM so a revert is byte-exact.
 */
export function commitStaged({
  staged, note, path = TUNING_PATH, priorPath = PRIOR_PATH, now = () => new Date().toISOString(),
  crashAfterTemp = false,
} = {}) {
  // A commit with an empty note is refused: `T-I-05` requires a commit to say WHY, and a
  // record whose reason is blank is a record that cannot be reviewed later.
  if (!note || String(note).trim().length < 8) {
    throw fail('E_NOTE_REQUIRED', 'a commit needs a note of at least 8 characters saying why');
  }
  const textBefore = readFileSync(path, 'utf8');
  // Parse first: a corrupt config must not be patched over (T-M-01).
  readTuning(path);
  const { text: textAfter, changes } = applyPatch(textBefore, staged);
  const hashBefore = sha(textBefore);
  const hashAfter = sha(textAfter);
  if (hashBefore === hashAfter) {
    throw fail('E_TUNING_NO_CHANGES', 'the patch would not change a single byte');
  }

  atomicWrite(path, textAfter, { crashAfterTemp });

  const record = {
    utc: now(),
    note: String(note),
    changedKeys: changes.map((c) => c.key),
    changes,
    hashBefore,
    hashAfter,
    eol: detectEol(textBefore),
    blastRadius: blastRadius(changes.map((c) => c.key)).map((b) => b.family),
    priorText: textBefore,
  };
  writeFileSync(priorPath, `${JSON.stringify(record)}\n`, { encoding: 'utf8', flag: 'a' });
  return { ok: true, wrote: true, hashBefore, hashAfter, changedKeys: record.changedKeys, record };
}

/**
 * Restore the previous file VERBATIM from the last prior record.
 *
 * Byte-exact because it restores the stored bytes rather than re-deriving them. The
 * revert itself is also recorded, so the history shows the round trip.
 */
export function revertLast({
  path = TUNING_PATH, priorPath = PRIOR_PATH, now = () => new Date().toISOString(),
} = {}) {
  const records = readPrior(priorPath);
  const last = records[records.length - 1];
  if (!last) throw fail('E_NOTHING_TO_REVERT', 'no prior-value record exists for this config');
  // A second revert in a row is refused rather than silently re-applying the previous
  // commit. `last` would be the REVERT record, whose `priorText` is the committed state —
  // so without this guard a double revert would TOGGLE the config back to the value the
  // operator just rejected, and report success.
  if (last.kind === 'revert') {
    throw fail('E_ALREADY_REVERTED',
      `the most recent record is itself a revert (${last.utc}) — there is nothing further to undo`);
  }

  const currentText = readFileSync(path, 'utf8');
  const currentHash = sha(currentText);
  if (currentHash === last.hashBefore) {
    throw fail('E_ALREADY_REVERTED', 'the config already matches the last prior value');
  }
  atomicWrite(path, last.priorText);
  const restoredHash = sha(readFileSync(path, 'utf8'));
  if (restoredHash !== last.hashBefore) {
    throw fail('E_REVERT_MISMATCH', `revert produced ${restoredHash}, expected ${last.hashBefore}`);
  }

  writeFileSync(priorPath, `${JSON.stringify({
    utc: now(),
    note: `revert of the commit at ${last.utc}`,
    kind: 'revert',
    changedKeys: last.changedKeys,
    hashBefore: currentHash,
    hashAfter: restoredHash,
    eol: detectEol(currentText),
    blastRadius: [],
    priorText: currentText,
  })}\n`, { encoding: 'utf8', flag: 'a' });

  return { ok: true, restoredFrom: last.utc, hash: restoredHash, changedKeys: last.changedKeys };
}

/** The live config plus its flattened form, read fresh every call (AC4.1 — never cached). */
export function liveTuning(path = TUNING_PATH) {
  const parsed = readTuning(path);
  return { parsed, flat: flattenTuning(parsed), raw: readFileSync(path, 'utf8') };
}

export { sha, unlinkSync };
