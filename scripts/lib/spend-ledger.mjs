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
export const SPEND_DIR = join(HERE, '..', '..', '.ai-workflow', 'spend');
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
export function recordSpend({ model, topic, usd, note = '' }) {
  ensureDir();
  appendFileSync(LEDGER, `${JSON.stringify({
    ts: new Date().toISOString(), model, topic, usd: Number(usd) || 0, note,
  })}\n`, 'utf-8');
}

const today = () => new Date().toISOString().slice(0, 10);

export function spentToday(entries = readLedger()) {
  const d = today();
  return entries.filter((e) => (e.ts || '').startsWith(d)).reduce((s, e) => s + (e.usd || 0), 0);
}

export function spentOnTopic(topic, entries = readLedger()) {
  if (!topic) return 0;
  return entries.filter((e) => e.topic === topic).reduce((s, e) => s + (e.usd || 0), 0);
}

/** Single-use approval tokens, keyed by the exact breach they were issued for. */
function readTokens() {
  if (!existsSync(TOKENS)) return {};
  try { return JSON.parse(readFileSync(TOKENS, 'utf-8')); } catch { return {}; }
}
function writeTokens(t) { ensureDir(); writeFileSync(TOKENS, JSON.stringify(t, null, 2), 'utf-8'); }

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
  if (approvalToken && tokens[key] && tokens[key].token === approvalToken && !tokens[key].used) {
    tokens[key].used = true;
    tokens[key].usedAt = new Date().toISOString();
    writeTokens(tokens);
    return { allow: true, reason: 'second approval accepted', breach: breaches.join('; '), token: null, totals };
  }

  // FIRST ask: refuse, and mint the token this exact call would need.
  const token = crypto.randomBytes(6).toString('hex');
  tokens[key] = { token, model, topic, worstCaseUsd, used: false, issuedAt: new Date().toISOString() };
  writeTokens(tokens);

  return { allow: false, reason: 'budget breach — first ask refused', breach: breaches.join('; '), token, totals };
}

export const LEDGER_PATH = LEDGER;
