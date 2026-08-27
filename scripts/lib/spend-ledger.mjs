/**
 * spend-ledger.mjs — cumulative paid-AI spend tracking and the two-ask gate.
 * ==========================================================================
 * Sean's directive 2026-08-22, after a single trainer-dashboard workstream cost
 * ~$4.87: Fable 5 alone was $3.47 across FOUR calls, Sol Pro $0.92 across two.
 *
 * WHY THE EXISTING GATES DID NOT CATCH IT — this is the whole design rationale.
 * There were already two spend controls: `--confirm-spend` on the panel, and a
 * `premium: true` opt-in on the Fable and Sol seats. Neither fired, because
 * NEITHER IS CUMULATIVE. No single call was outrageous — the most expensive was
 * $0.97. Four reasonable calls in a row are what blew the budget. A per-call
 * ceiling alone would have approved every one of them.
 *
 * So the primary control here is a LEDGER with a per-topic budget. The per-call
 * ceiling is secondary, for the genuinely large single call.
 *
 * THE TWO-ASK RULE. Sean: "I would be asked twice before approving." One flag
 * an agent can type becomes a reflex — that is exactly how `--confirm-spend`
 * stopped working. So a breach is refused on the FIRST attempt and emits a
 * single-use token naming the real number. Only a SECOND, separate invocation
 * carrying that token proceeds. The agent cannot self-approve in one step, and
 * the number is put in front of Sean twice.
 *
 * Budgets are deliberately low. Sean: "shouldn't cost me no more than two or
 * three bucks for that whole thing max. Three dollars is a lot for one call."
 *
 * Privacy (Rule 8/44/59): the ledger stores model ids, costs and a topic slug.
 * Never prompt content, never keys.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * `SWAN_SPEND_DIR` redirects the ledger, for tests only. Added 2026-08-26 so
 * scripts/hooks/spend-guard-gate.test.mjs can exercise the BLOCKING path — which
 * mints a token and reads cumulative totals — without writing into Sean's real
 * spend state (SWA-218).
 *
 * WHY THIS IS NOT A BYPASS, since an env override on a money ledger deserves the
 * question: the gate runs as a Claude Code PreToolUse hook, so its environment is
 * the harness's, NOT the environment of the Bash command being judged. An agent
 * writing `SWAN_SPEND_DIR=/tmp/empty node scripts/consult-fable.mjs` puts that
 * text in the COMMAND STRING, which the hook merely reads as data — it never
 * reaches the hook process. That asymmetry is already load-bearing elsewhere in
 * this system: spend-guard-gate.mjs parses `SWAN_*MODEL=` out of the command text
 * for exactly the same reason. Setting this variable for real requires editing
 * the harness config or the shell profile, which is a different threat model than
 * the one these gates defend against.
 */
export const SPEND_DIR = process.env.SWAN_SPEND_DIR
  || join(HERE, '..', '..', '.ai-workflow', 'spend');
const LEDGER = join(SPEND_DIR, 'ledger.jsonl');
const TOKENS = join(SPEND_DIR, 'pending-approval.json');

/** Caps in USD. Env overrides exist for genuine exceptions, never for routine use. */
export const CAPS = {
  perCall: Number(process.env.SWAN_SPEND_CAP_CALL || 1.00),
  perTopic: Number(process.env.SWAN_SPEND_CAP_TOPIC || 3.00),
  perDay: Number(process.env.SWAN_SPEND_CAP_DAY || 5.00),
};

const ensureDir = () => { if (!existsSync(SPEND_DIR)) mkdirSync(SPEND_DIR, { recursive: true }); };

/** Read every ledger entry. A corrupt line is skipped, never fatal — this must not block work. */
export function readLedger() {
  if (!existsSync(LEDGER)) return [];
  return readFileSync(LEDGER, 'utf-8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean);
}

/**
 * Record real spend AFTER a call completes.
 * @param {{model:string, topic:string, usd:number, note?:string}} entry
 */
/**
 * "Priced" means a real finite number, or a non-blank numeric string. NOT `Number(usd)`
 * alone: `Number('')` is 0, `Number('  ')` is 0, `Number(true)` is 1 — so an empty cost
 * field or a boolean would have recorded a confident $0.00 / $1.00, the exact silent-zero
 * class recordSpend was rewritten to close. Caught by the author attacking the author's
 * own prompt list for the review panel (2026-08-25), before any seat did. Exported so
 * the test can pin it without writing to the real ledger.
 */
export function isPriced(usd) {
  // Non-negative only (round-1 GLM F5): a negative "cost" is not a refund in this
  // ledger, it is a bug upstream — treat it as unpriced so it counts as worst case.
  if (typeof usd === 'number') return Number.isFinite(usd) && usd >= 0;
  // Strings: plain non-negative DECIMAL only. `Number('0x10')` is 16 and `Number('1e3')`
  // is 1000 — a cost field carrying hex or exponent notation is not a price, it is a
  // bug upstream, and pricing it would book phantom spend (round-2 self-attack).
  if (typeof usd === 'string') return /^\s*\d+(?:\.\d+)?\s*$/.test(usd);
  return false;
}

export function recordSpend({ model, topic, usd, note = '' }) {
  ensureDir();
  // `usd: null` is a LEGAL, MEANINGFUL value: "this call cost money and nobody
  // could price it." Three review seats independently flagged the previous
  // `Number(usd) || 0`: an unpriced model recorded a confident $0.00, so the caps
  // could never fire for exactly the calls of unknown price — fail-open in the
  // expensive direction, dressed as safe. Readers below treat null as WORST CASE
  // (perCall cap), so an unpriced call pushes the caps toward refusal, never away.
  // "Priced" means a real number or a non-blank numeric string. NOT `Number(usd)`
  // alone: `Number('')` is 0 and `Number(true)` is 1, so an empty cost field or a
  // boolean would have recorded a confident $0.00 / $1.00 — the exact silent-zero
  // class this function was rewritten to close. Caught by the author attacking the
  // author's own prompt list for the review panel (2026-08-25), before any seat did.
  const priced = isPriced(usd);
  appendFileSync(LEDGER, `${JSON.stringify({
    ts: new Date().toISOString(), model, topic,
    usd: priced ? Number(usd) : null,
    note: priced ? note : `${note ? note + ' | ' : ''}UNPRICED — counted as worst-case $${CAPS.perCall}`,
  })}\n`, 'utf-8');
}

/**
 * ONE topic key for one document — the single source of truth for both sides of
 * the per-topic cap. The spend-guard hook normalized topics one way while a writer
 * stripped ANY extension and filtered nothing; `spentOnTopic` matches with STRICT
 * equality, so the same document could yield two keys and the topic cap would
 * silently never accumulate for it. Semantics are the GUARD's incumbent rules,
 * unchanged, so no in-flight approval token (keyed on model+topic+cost) is orphaned.
 * @param {string} p  document/out path or bare name
 */
export function topicFromPath(p) {
  return String(p || '')
    .replace(/^.*[\\/]/, '')
    .replace(/\.(md|txt|json)$/i, '')
    .replace(/[^A-Za-z0-9._-]/g, '')
    .slice(0, 60) || 'untitled';
}

/**
 * The dollar value a ledger row contributes to a cap. Unpriced rows (usd null)
 * count as the per-call cap: the one direction an unknown cost is allowed to err.
 */
const rowUsd = (e) => (e.usd === null || e.usd === undefined ? CAPS.perCall : (Number(e.usd) || 0));

const today = () => new Date().toISOString().slice(0, 10);

export function spentToday(entries = readLedger()) {
  const d = today();
  return entries.filter((e) => (e.ts || '').startsWith(d)).reduce((s, e) => s + rowUsd(e), 0);
}

export function spentOnTopic(topic, entries = readLedger()) {
  if (!topic) return 0;
  return entries.filter((e) => e.topic === topic).reduce((s, e) => s + rowUsd(e), 0);
}

/** Single-use approval tokens, keyed by the exact breach they were issued for. */
function readTokens() {
  if (!existsSync(TOKENS)) return {};
  try { return JSON.parse(readFileSync(TOKENS, 'utf-8')); } catch { return {}; }
}
function writeTokens(t) { ensureDir(); writeFileSync(TOKENS, JSON.stringify(t, null, 2), 'utf-8'); }

/**
 * Redeem a token by ATOMICALLY creating a claim file. Returns true for the one
 * caller that wins, false for every other.
 *
 * `flag: 'wx'` opens with O_CREAT|O_EXCL, which the operating system guarantees is
 * atomic — if the path exists the call fails with EEXIST and cannot be interleaved.
 * That is the whole mechanism: no lock to acquire, nothing to release, and no
 * window between "check" and "set" for a second process to slip through.
 *
 * FAILS CLOSED on any unexpected error. A cost check that bricks the toolchain is
 * bad, but this is not that check — this is the last step before money is spent, and
 * "the filesystem misbehaved" is not a reason to spend twice.
 */
function claimToken(key, token) {
  ensureDir();
  const claimPath = join(SPEND_DIR, `claim-${key}.json`);
  try {
    writeFileSync(claimPath, JSON.stringify({ key, token, at: new Date().toISOString() }), { flag: 'wx' });
    return true;
  } catch (err) {
    if (err?.code === 'EEXIST') return false; // someone else redeemed it first
    return false;
  }
}

/** A token is bound to model+topic+rounded-cost so it cannot be reused for a different call. */
const tokenKey = ({ model, topic, worstCaseUsd }) =>
  crypto.createHash('sha256')
    .update(`${model}|${topic}|${Number(worstCaseUsd).toFixed(2)}`)
    .digest('hex').slice(0, 12);

/**
 * The gate. Returns a decision; the caller decides how loudly to refuse.
 *
 * @param {{model:string, topic:string, worstCaseUsd:number, approvalToken?:string}} req
 * @returns {{allow:boolean, reason:string, breach:string|null, token:string|null, totals:object}}
 */
export function checkSpend({ model, topic, worstCaseUsd, approvalToken = '' }) {
  const entries = readLedger();
  const totals = {
    call: Number(worstCaseUsd) || 0,
    topic: spentOnTopic(topic, entries),
    day: spentToday(entries),
    caps: CAPS,
  };

  const breaches = [];
  if (totals.call > CAPS.perCall) {
    breaches.push(`single call $${totals.call.toFixed(2)} > cap $${CAPS.perCall.toFixed(2)}`);
  }
  if (totals.topic + totals.call > CAPS.perTopic) {
    breaches.push(`topic "${topic}" would reach $${(totals.topic + totals.call).toFixed(2)} > cap $${CAPS.perTopic.toFixed(2)} (already spent $${totals.topic.toFixed(2)})`);
  }
  if (totals.day + totals.call > CAPS.perDay) {
    breaches.push(`today would reach $${(totals.day + totals.call).toFixed(2)} > cap $${CAPS.perDay.toFixed(2)} (already spent $${totals.day.toFixed(2)})`);
  }

  if (!breaches.length) {
    return { allow: true, reason: 'within budget', breach: null, token: null, totals };
  }

  const key = tokenKey({ model, topic, worstCaseUsd });
  const tokens = readTokens();

  // SECOND ask: a valid, unused, matching token was presented.
  //
  // REDEMPTION IS AN ATOMIC CLAIM, not a read-modify-write (GLM 5.3 finding 2,
  // 2026-08-26). The previous version read tokens.json, checked `used === false`,
  // set it true, and wrote the file back. Two concurrent calls carrying the same
  // fresh token could both observe `used: false` and both proceed — a double-spend
  // on a single approval. Claude Code issues tool calls in parallel, so scheduling
  // that race is ordinary, not exotic.
  //
  // `claimToken` uses O_EXCL file creation, which the OS guarantees is atomic:
  // exactly one caller can create a given path. The JSON below is still updated for
  // the audit trail, but it is no longer what decides the outcome — the claim is.
  if (approvalToken && tokens[key] && tokens[key].token === approvalToken && !tokens[key].used) {
    if (!claimToken(key, approvalToken)) {
      return { allow: false, reason: 'token already redeemed by a concurrent call', breach: breaches.join('; '), token: null, totals };
    }
    tokens[key].used = true;
    tokens[key].usedAt = new Date().toISOString();
    writeTokens(tokens);
    return { allow: true, reason: 'second approval accepted', breach: breaches.join('; '), token: null, totals };
  }

  // A WRONG token must not destroy a RIGHT one (GLM 5.3 finding 6). Re-minting on
  // every refusal meant that presenting a bad token for a valid key silently replaced
  // the approval Sean was holding, so his correct token stopped working — a
  // DoS-flavoured footgun where the failure looks like the gate malfunctioning.
  //
  // Not a deadlock risk: the key is derived from model+topic+cost, so re-running the
  // same command yields the same key and the SAME still-valid token, which remains
  // readable in the store.
  const existing = tokens[key];
  if (existing && !existing.used) {
    return { allow: false, reason: 'budget breach — an unused approval token already exists for this exact call', breach: breaches.join('; '), token: existing.token, totals };
  }

  // FIRST ask: refuse, and mint the token this exact call would need.
  const token = crypto.randomBytes(6).toString('hex');
  tokens[key] = { token, model, topic, worstCaseUsd, used: false, issuedAt: new Date().toISOString() };
  writeTokens(tokens);

  return { allow: false, reason: 'budget breach — first ask refused', breach: breaches.join('; '), token, totals };
}

export const LEDGER_PATH = LEDGER;
