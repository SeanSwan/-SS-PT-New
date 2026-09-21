/**
 * redact-egress.mjs — the last gate before a document leaves this machine.
 * =======================================================================
 * WHY THIS EXISTS (2026-08-22 incident, handoff v5 §4):
 * A review packet dispatched to six external vendors carried the operator's
 * Windows username inside filesystem paths. A secret scan had been run before
 * dispatch and returned "No matches found" — on a file that demonstrably
 * contained the string. **The instrument produced a false negative and it was
 * believed.** Scope, once measured: 59 documents, 140 occurrences, months old.
 *
 * REVISED 2026-08-26 (Fable review, EGRESS-REDACTOR-REVIEW-PACKET-2026-08-23):
 * the first version gated the *file read*; callers then assembled diffs,
 * prompts, seeds and even the redactor's own ENOENT messages around it and
 * sent those raw. The gate now sits at the TRANSPORT: `fetchForEgress()`
 * redacts the final request body immediately before the socket. Per-read
 * helpers remain for early, labelled reporting — they are defense in depth,
 * not the control.
 *
 * THE CANARY IS A POSITIVE CONTROL ON THE INSTRUMENT, NOT A COVERAGE PROOF.
 * Before redacting anything real, every call plants one sample of EVERY shape
 * it knows (identity, hostname, each secret family) and verifies each was
 * caught. That proves the instrument is live and every pattern fires in this
 * process. Coverage — whether a class nobody thought of leaks — lives in the
 * test corpus and the threat model (accidental leakage by cooperative authors;
 * regex is the right tool for that and the wrong tool for adversarial exfil).
 *
 * Identity is derived at runtime (os.userInfo / homedir / hostname), never
 * hardcoded — hardcoding the operator's name here would make THIS FILE the leak.
 */
import { readFileSync } from 'node:fs';
import { homedir, hostname, userInfo } from 'node:os';
import { basename } from 'node:path';
// The training-tier gate moved to its own module when this file outgrew the
// 300-line cap (SWA-236), but it stays part of THIS file's public surface:
// every caller imports the egress control from here, and fetchForEgress below
// is what actually enforces it.
import { armTrainingTierEgress, assertTrainingTierArmed, isTrainingTierModel, trainingTierAllowlist }
  from './training-tier-gate.mjs';
// Astra is NOT blocked on OpenRouter (the subscription does not serve
// `gpt-6-astra-pro`), but it is double-gated: two independent confirmations,
// surfaced as two sequential stops. Sean 2026-09-19. See the module header.
// The names are imported (not only re-exported) because the default export
// object below references them as local bindings — `export … from` alone
// creates no binding in this module.
import { assertAstraResellerDoubleArmed, astraResellerGateState, isAstraSubscriptionModel }
  from './astra-reseller-gate.mjs';

export { armTrainingTierEgress, assertTrainingTierArmed, isTrainingTierModel, trainingTierAllowlist }
  from './training-tier-gate.mjs';
export { assertAstraResellerDoubleArmed, astraResellerGateState, isAstraSubscriptionModel }
  from './astra-reseller-gate.mjs';

// The secret-shape table lives in its own module as of round 9b: this file crossed
// the 300-line cap (Rule 4) when the `sk-` row gained the boundary it needed. The
// table is pure data; callers still import the egress control from HERE, so the
// public surface is unchanged. See `secret-shapes.mjs` for the `sk-` boundary record.
import { SECRET_SHAPES } from './secret-shapes.mjs';
/** Names that are also ordinary words: redact with boundaries instead of corrupting prose. */
const COMMON_WORD_NAMES = new Set([
  'admin', 'administrator', 'user', 'users', 'root', 'dev', 'developer', 'test', 'guest',
  'owner', 'default', 'public', 'home', 'desktop', 'server', 'local', 'localhost', 'ubuntu',
  'runner', 'node', 'docker', 'system', 'pi', 'me', 'main',
]);

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/** Identity-bearing names, derived from the RUNTIME environment. */
export function identityNames() {
  const user = (userInfo().username || '').trim();
  const winUser = basename(homedir() || '') || '';
  let host = '';
  try { host = (hostname() || '').trim(); } catch { host = ''; }
  return [...new Set([user, winUser, host].filter((n) => n && n.length >= 3 && n.toLowerCase() !== 'localhost'))];
}

/** Identity-bearing patterns, built from the RUNTIME environment. */
function identityPatterns() {
  // Paths must be redacted before their identity-bearing segments. If names run
  // first, `C:\\Users\\operator` becomes `C:\\Users\\<OPERATOR>` and the path
  // rule can no longer prove or replace the absolute prefix. Match one or two
  // backslashes so the same rule covers raw text and JSON-stringified bodies.
  const out = [
    [/\/mnt\/[a-z]\/Users\/[^/\s"'<>:,;)\]]+/g, '<PATH>'],
    [/[A-Za-z]:(?:\\{1,2}|\/)Users(?:\\{1,2}|\/)[^\\/\s"'<>]+/g, '<PATH>'],
    [/\/(?:home|Users)\/[^/\s"'<>:,;)\]]+/g, '<PATH>'],
  ];
  for (const name of identityNames()) {
    const esc = escapeRe(name);
    const re = COMMON_WORD_NAMES.has(name.toLowerCase())
      ? new RegExp(`(?<![A-Za-z0-9])${esc}(?![A-Za-z0-9])`, 'gi')
      : new RegExp(esc, 'gi');
    out.push([re, '<OPERATOR>']);
  }
  return out;
}

// APPLYING THE ROWS MOVED OUT, AND THE MOVE IS THE FIX (round 9d, Astra A2).
// This file previously owned `applyAll()`, which replaced each row's matches IN TABLE ORDER —
// so row N+1 matched against a string row N had already edited. A row could not see that its
// match sat inside another row's, because the enclosing match's text was already gone.
// Measured cost: a 40-character bot token containing `sk-` was reported as redacted while 30
// of its characters stayed in the clear. No pattern change repairs that; the ORDER was the bug.
// `redact-apply.mjs` now computes every span against UNCHANGED input and resolves overlaps by
// original position (enclosing match wins). The seam is the call boundary, not the table.
import { applyAll } from './redact-apply.mjs';

/**
 * Prove the instrument is live AND COMPLETE: plant one sample of every known shape plus
 * the runtime identity, and verify each was caught WHOLE. Throws rather than returning a
 * reassuring boolean — a caller can ignore a boolean; it cannot ignore a throw. This
 * certifies the instrument, NOT coverage.
 *
 * WHY "WHOLE" IS THE LOAD-BEARING WORD (round 9d, Astra A5/A6). This function used to probe
 * each sample with `sample.slice(0, 12)` and require that 12-character prefix to be gone. That
 * probe has two blind spots, both measured:
 *
 *   1. IT CANNOT SEE A DELETION. Deleting a row deletes the sample it plants, so an
 *      unfired row contributes nothing to the canary and the canary still returns true.
 *      Reproduced: `SECRET_SHAPES.splice(13,1); selfTest()` -> `true`.
 *   2. IT CANNOT SEE A PARTIAL REDACTION, WHICH IS THE FAILURE MODE THIS FILE EXISTS FOR.
 *      The probe IS a prefix of the plaintext, so the moment a row redacts its first 12
 *      characters — and leaves the other 40 in the clear — the probe vanishes and the canary
 *      reports success. Reproduced: `'<REDACTED-KEY>' + sample.slice(12)` passes.
 *
 * The repair for (2) is to probe with something that is NOT a prefix of the plaintext: the
 * TAIL of each sample, which only disappears if the match covered the whole value. For (1),
 * the repair is not here at all — the canary cannot audit the table's own inventory, because
 * the table IS the inventory. That belongs to `secret-families.mjs` and its coverage test,
 * which is a second, independent statement of what must be recognised. The two are complementary
 * and both are required: this proves each EXISTING row fires completely; that proves the rows
 * that should exist still do.
 */
export function selfTest() {
  const names = identityNames();
  const user = basename(homedir() || '') || userInfo().username || '';
  if (!user || user.length < 3 || !names.length) {
    throw new Error(
      '[redact-egress] CANARY IMPOSSIBLE: cannot derive an operator identity from the ' +
      'runtime environment, so the redactor cannot be proven. Refusing to certify this ' +
      'document as safe to send.',
    );
  }
  const identityCanary = names.map((n) => `/home/${n}/x C:\\Users\\${n}\\y host=${n}`).join(' ');
  const canary = `canary ${identityCanary} ${SECRET_SHAPES.map((s) => s[2]).join(' ')}`;
  const { out } = applyAll(canary, [...identityPatterns(), ...SECRET_SHAPES]);
  const leaked = [];
  for (const n of names) if (out.toLowerCase().includes(n.toLowerCase())) leaked.push(`identity:${n.length}ch`);
  for (const [, repl, sample] of SECRET_SHAPES) {
    // TAIL, not prefix: a 12-char prefix of the sample IS a 12-char prefix of the plaintext,
    // so a row that redacts only its head makes the probe disappear — see (2) above. The tail
    // is chosen to outrun the penultimate 12 characters of the value, which is the part a
    // partially-redacting row leaves behind.
    const tail = sample.split('\n')[0].slice(-12);
    // A sample shorter than the probe window cannot supply an independent probe. Every current
    // row is longer than this; the guard turns a future violation into a named failure rather
    // than a silently vacuous check.
    if (tail.length < 12) leaked.push(`shape:${repl}(sample too short to probe)`);
    else if (out.includes(tail)) leaked.push(`shape:${repl}`);
  }
  if (leaked.length) {
    throw new Error(
      `[redact-egress] CANARY FAILED — the instrument did not catch: ${leaked.join(', ')}. ` +
      'Its silence about this document means NOTHING. Refusing to send.',
    );
  }
  return true;
}

/**
 * Redact `text` for egress. Runs the canary first, every time.
 * @returns {{text: string, hits: Array<{replacement: string, count: number}>}}
 */
export function redactForEgress(text) {
  selfTest();
  const { out, hits } = applyAll(String(text ?? ''), [...identityPatterns(), ...SECRET_SHAPES]);
  return { text: out, hits };
}

function report(label, hits) {
  if (hits.length) {
    const total = hits.reduce((n, h) => n + h.count, 0);
    console.error(`[redact-egress] ${label}: ${total} redaction(s) before send — ` +
      hits.map((h) => `${h.replacement}×${h.count}`).join(', '));
  } else {
    console.error(`[redact-egress] ${label}: no matches (instrument live; coverage per test corpus)`);
  }
}

/** Redact and report in one call; returns the redacted string. */
export function redactOutbound(text, { label = 'outbound', quiet = false } = {}) {
  const { text: out, hits } = redactForEgress(text);
  if (!quiet) report(label, hits);
  return out;
}

/**
 * Drop-in replacement for `readFileSync(path, 'utf-8')` on any document that is
 * about to be sent to an external model. Reports what it removed on stderr —
 * silent redaction is how you stop noticing that documents keep needing it.
 * A read failure is rethrown with a REDACTED message: Node's ENOENT text
 * carries the absolute path, which is the incident class this module exists for.
 */
export function readForEgress(path, opts = {}) {
  const { label = 'document', quiet = false } = typeof opts === 'object' && opts ? opts : {};
  let raw;
  try {
    raw = readFileSync(path, 'utf-8');
  } catch (err) {
    const e = new Error(`[redact-egress] read failed (${err.code || 'ERR'}): ${redactForEgress(err.message).text}`);
    e.code = err.code;
    throw e;
  }
  return redactOutbound(raw, { label, quiet });
}

/**
 * THE CONTROL. Drop-in for `fetch(url, init)` on any request that leaves this
 * machine: the string `init.body` is redacted immediately before the socket,
 * so diffs, prompts, seeds and error strings assembled around a document get
 * the same treatment the document did. Headers are untouched (the API key
 * lives there and belongs there). Canary failure throws → nothing is sent.
 */
/**
 * Seats that must never be reached through a paid reseller.
 *
 * Sean holds a Z.ai subscription that already includes BOTH glm-5.3 and glm-5.3-flash,
 * so routing either one through OpenRouter pays per-token for something already bought.
 * This lives at the egress chokepoint rather than in a doc because every consult script
 * funnels through here: a prose rule has to be remembered by each new script and each
 * new agent, and this project's own corpus records prose rules being violated four times
 * in one session after being written up. A refusal cannot be forgotten.
 */
const SUBSCRIPTION_ONLY_MODEL_PREFIXES = [
  { prefix: 'z-ai/', seat: 'GLM (glm-5.3, glm-5.3-flash)', use: 'node scripts/consult-glm.mjs --model glm-5.3[-flash]' }
];

export function assertNotResoldSubscriptionSeat(url, body) {
  let host = '';
  try { host = new URL(url).host.toLowerCase(); } catch { return; }
  if (!host.includes('openrouter')) return;

  let model = '';
  try { model = String(JSON.parse(body)?.model ?? ''); } catch { return; }
  if (!model) return;

  const hit = SUBSCRIPTION_ONLY_MODEL_PREFIXES.find((entry) => model.toLowerCase().startsWith(entry.prefix));
  if (!hit) return;

  throw new Error(
    `[redact-egress] REFUSED: "${model}" via OpenRouter. The ${hit.seat} seat is covered by the ` +
    `Z.ai subscription and must go direct, not through a paid reseller. Use: ${hit.use}`
  );
}

export async function fetchForEgress(url, init = {}, { label = 'request', quiet = false, fetchImpl = globalThis.fetch } = {}) {
  if (typeof init.body !== 'string') {
    throw new Error('[redact-egress] fetchForEgress requires a string body (JSON.stringify it first); refusing to send an unredactable body.');
  }
  assertNotResoldSubscriptionSeat(url, init.body);
  assertAstraResellerDoubleArmed(url, init.body);
  assertTrainingTierArmed(url, init.body);
  const body = redactOutbound(init.body, { label, quiet });
  return fetchImpl(url, { ...init, body });
}


export default {
  readForEgress, redactForEgress, redactOutbound, fetchForEgress,
  assertNotResoldSubscriptionSeat, selfTest, identityNames,
  armTrainingTierEgress, assertTrainingTierArmed, isTrainingTierModel, trainingTierAllowlist,
  assertAstraResellerDoubleArmed, astraResellerGateState, isAstraSubscriptionModel,
};
