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
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, statSync, unlinkSync } from 'node:fs';
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
  // ROW FIRST, THEN RELEASE. The reverse order left a window in which the call
  // counted NOWHERE — the hold was gone and the row was not yet written, so a
  // concurrent gate saw budget that was already committed (GLM 5.3 round-4 F4).
  // This order can briefly double-count instead, which is the direction a spend
  // guard is allowed to be wrong in.
  appendFileSync(LEDGER, `${JSON.stringify({
    ts: new Date().toISOString(), model, topic,
    usd: priced ? Number(usd) : null,
    note: priced ? note : `${note ? note + ' | ' : ''}UNPRICED — counted as worst-case $${CAPS.perCall}`,
  })}\n`, 'utf-8');
  try { releaseReservation({ model, topic }); } catch { /* non-fatal */ }
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

// --- RESERVATIONS: the caps must count calls that are in flight ---------------
//
// GLM 5.3-flash round-3 F1, reproduced: twenty concurrent sol calls (~$0.31 each)
// against a $5.00 day cap were ALL allowed — $6.20 approved. Each one read
// spentToday = $0 and compared only its own worst case. The atomic claim fixed
// token REDEMPTION; this is the common case, and Claude Code issuing parallel tool
// calls is ordinary rather than exotic.
//
// APPEND-ONLY, because the obvious fix has the bug it is fixing. A shared counter
// read-modify-written by N processes is exactly the race being closed, one level up.
// So a reservation is an appended row and a release is another appended row; the
// outstanding total is a fold over the file. `appendFileSync` of a short line is
// atomic on both POSIX (O_APPEND) and Windows, so concurrent writers interleave
// whole lines rather than corrupting each other.
//
// TTL, because a crashed caller must not hold budget forever. A reservation older
// than the window is ignored — the same reasoning as the orphaned claim: a guard
// that can permanently withhold budget on a crash is broken in the safer direction.
const RESERVATIONS = join(SPEND_DIR, 'reservations.jsonl');
const RESERVATION_TTL_MS = 10 * 60_000;

/**
 * ONE model key for one seat, on BOTH sides of a reservation.
 *
 * THE DEFECT THIS CLOSES, proven by probe before it was fixed (2026-08-27):
 *
 *     reserve  claude-fable-5            (gate, from SCRIPT_MODEL)
 *     record   anthropic/claude-fable-5  (writer, from providers.mjs)
 *     -> day = $1.48   ($1.06 hold STILL HELD + $0.42 real row)
 *
 * The two sides never used the same string, so **no release has ever settled any
 * hold**. Every completed consult double-counted itself for the full 10-minute TTL.
 * That is the cry-wolf direction — refusing spend that is not real — and it made
 * every round-4 finding about releases settling the WRONG hold moot, because
 * releases settled nothing at all.
 *
 * GLM 5.3 named it in MISSED: "You never verified the consult scripts' recordSpend
 * model strings against SCRIPT_MODEL keys." He was right, and the reason I had not
 * is that both sides READ correct in isolation. Only running them against each
 * other shows it — the same lesson as validating an instrument before believing a
 * negative.
 *
 * Normalising rather than editing the writers: the vendor prefix is real metadata
 * (`anthropic/` vs `openai/`), and a seat may be reached through more than one
 * route. The reservation only needs the two sides to AGREE, not to be verbose.
 */
export const normalizeModelKey = (m) => String(m || '')
  .trim().toLowerCase().replace(/^[^/]+\//, '');

/**
 * Live holds, folded in APPEND ORDER.
 *
 * The previous fold counted every release first, then walked the reserves — so a
 * release could settle a reserve appended AFTER it. GLM 5.3 finding 2 and flash
 * finding 4 both landed on the consequence: any release without a live hold became
 * a coupon that silently cancelled the NEXT same-key hold within the TTL window.
 * Sean running a consult by hand (no hook, so no reserve, but the shim still
 * records) minted one every time.
 *
 * Append order removes the class: a release can only settle something already
 * outstanding, and an orphan release is discarded rather than banked. A nonce, when
 * the releaser knows it, settles that exact hold; otherwise the oldest live hold for
 * the model+topic is settled, which is correct for the ordinary one-call-one-release
 * shape and errs toward holding budget rather than freeing it.
 */
function readReservations() {
  if (!existsSync(RESERVATIONS)) return [];
  const cutoff = Date.now() - RESERVATION_TTL_MS;
  const rows = readFileSync(RESERVATIONS, 'utf-8').split(/\r?\n/).filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter((r) => r && Date.parse(r.ts) >= cutoff);

  const live = [];
  for (const r of rows) {
    if (r.kind === 'reserve') { live.push(r); continue; }
    if (r.kind !== 'release') continue;
    // Settle by nonce when the releaser knows it, else the oldest matching hold.
    let i = r.nonce ? live.findIndex((h) => h.nonce === r.nonce) : -1;
    if (i < 0 && !r.nonce) {
      i = live.findIndex((h) => h.model === r.model && h.topic === r.topic);
    }
    if (i >= 0) live.splice(i, 1); // orphan releases fall through and are DISCARDED
  }
  return live;
}

/**
 * Hold budget for a call the gate is about to allow. Returns the hold's nonce so
 * the caller can release exactly this one — a refusal must not settle somebody
 * else's in-flight call.
 */
export function reserveSpend({ model, topic, usd }) {
  ensureDir();
  const nonce = crypto.randomBytes(6).toString('hex');
  appendFileSync(RESERVATIONS, `${JSON.stringify({
    ts: new Date().toISOString(), kind: 'reserve', nonce,
    model: normalizeModelKey(model), topic, usd: isPriced(usd) ? Number(usd) : null,
  })}\n`, 'utf-8');
  return nonce;
}

/**
 * Settle a reservation: by nonce when the caller holds one, else the oldest hold
 * for this model+topic (the shims complete in a different process from the gate
 * that reserved, so they only ever know model+topic).
 */
export function releaseReservation({ model, topic, nonce = null }) {
  if (!existsSync(RESERVATIONS)) return;
  appendFileSync(RESERVATIONS, `${JSON.stringify({
    ts: new Date().toISOString(), kind: 'release', nonce,
    model: normalizeModelKey(model), topic,
  })}\n`, 'utf-8');
}

/**
 * The dollar value a ledger row contributes to a cap. Unpriced rows (usd null)
 * count as the per-call cap: the one direction an unknown cost is allowed to err.
 */
const rowUsd = (e) => (e.usd === null || e.usd === undefined ? CAPS.perCall : (Number(e.usd) || 0));

const today = () => new Date().toISOString().slice(0, 10);

export function spentToday(entries = readLedger()) {
  const d = today();
  const settled = entries.filter((e) => (e.ts || '').startsWith(d)).reduce((s, e) => s + rowUsd(e), 0);
  // Calls in flight count too, or twenty concurrent ones each see $0 (flash F1).
  const inFlight = readReservations()
    .filter((r) => (r.ts || '').startsWith(d)).reduce((s, r) => s + rowUsd(r), 0);
  return settled + inFlight;
}

export function spentOnTopic(topic, entries = readLedger()) {
  if (!topic) return 0;
  const settled = entries.filter((e) => e.topic === topic).reduce((s, e) => s + rowUsd(e), 0);
  const inFlight = readReservations().filter((r) => r.topic === topic).reduce((s, r) => s + rowUsd(r), 0);
  return settled + inFlight;
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
 * `flag: 'wx'` opens with O_CREAT|O_EXCL, which is atomic ON LOCAL DISK — if the path
 * exists the call fails with EEXIST and cannot be interleaved.
 *
 * SCOPE OF THAT GUARANTEE (GLM 5.3-flash round-3 F3, and the correction is his): it
 * holds on local ext4/NTFS/APFS and is honoured by SMB2's exclusive-create
 * disposition, but O_EXCL is NOT guaranteed on NFSv3 — a known limitation of that
 * protocol, not of this code. An earlier version of this comment said "the operating
 * system guarantees", full stop, which is the same overclaiming this workstream keeps
 * having to walk back. **SPEND_DIR must live on local disk.** It defaults to
 * `.ai-workflow/spend/` inside the repo; if SWAN_SPEND_DIR is ever pointed at a
 * network mount, this guarantee weakens and the double-spend it prevents comes back.
 * That is the whole mechanism: no lock to acquire, nothing to release, and no
 * window between "check" and "set" for a second process to slip through.
 *
 * FAILS CLOSED on any unexpected error. A cost check that bricks the toolchain is
 * bad, but this is not that check — this is the last step before money is spent, and
 * "the filesystem misbehaved" is not a reason to spend twice.
 */
const CLAIM_ORPHAN_MS = 60_000;

/**
 * "This token has been spent" as a PER-KEY FILE, not a field in a shared object.
 *
 * GLM 5.3-flash round-4 finding 10. Redemption required `!tokens[key].used`, and
 * that flag was set by rewriting the WHOLE tokens.json with `writeFileSync` — an
 * unlocked read-modify-write of a shared object, on the money path. Two concurrent
 * redemptions of DIFFERENT keys can lose one `used: true` in the merge. A lost flag
 * plus a claim older than the orphan window means the same token redeems twice.
 *
 * That is the exact bug class this workstream has closed three times elsewhere (the
 * claim file, the append-only reservations, the ledger). Leaving one in place while
 * fixing its siblings is not a risk judgement, it is an inconsistency — the whole
 * argument for the append-only design was that a shared counter reproduces the race
 * it is meant to fix.
 *
 * A per-key marker cannot be lost by a write to another key, because there is no
 * shared object to merge. tokens.json keeps `used` for the audit trail; it no longer
 * decides anything.
 *
 * WHY THE MARKER AND THE CLAIM ARE BOTH NEEDED. The claim alone cannot tell a
 * CRASHED holder (create the claim, die before spending) from a SUCCESSFUL one —
 * both leave an aged claim file. Without that distinction the orphan reclaim either
 * bricks a legitimate approval forever, or re-redeems a token that was already
 * spent. The marker is what separates them: aged claim + no marker means crashed;
 * marker present means spent, at any age.
 */
const usedMarkerPath = (key) => join(SPEND_DIR, `used-${key}.json`);
const isSpent = (key) => existsSync(usedMarkerPath(key));

function markSpent(key, token) {
  try {
    writeFileSync(usedMarkerPath(key), JSON.stringify({ key, token, at: new Date().toISOString() }), 'utf-8');
  } catch { /* non-fatal: the claim still stands for the orphan window */ }
}

function claimToken(key, token) {
  ensureDir();
  const claimPath = join(SPEND_DIR, `claim-${key}.json`);
  try {
    writeFileSync(claimPath, JSON.stringify({ key, token, at: new Date().toISOString() }), { flag: 'wx' });
    return true;
  } catch (err) {
    if (err?.code !== 'EEXIST') return false;
    // Already spent, at ANY age — never reclaim a token that actually bought something.
    if (isSpent(key)) return false;

    // ORPHAN RECLAIM. Found by attacking this function directly, and independently
    // by GLM 5.3-flash (2026-08-27 blocker 1a): a process that dies between creating
    // the claim and writing `used: true` leaves a claim file with no matching record
    // of the spend. Without this branch every later redemption hits EEXIST forever —
    // the approval Sean is holding becomes permanently unredeemable, with no TTL, no
    // override, and an error message blaming a concurrency that never happened.
    // A guard that can brick a legitimate approval on a crash is not fail-closed, it
    // is just broken in the safer direction.
    //
    // The caller only reaches here when tokens.json still says `used: false`, so a
    // claim older than the reclaim window can only be a crashed holder: a live winner
    // marks `used` within milliseconds of creating the claim.
    //
    // Reclaiming does NOT reopen the race. Two processes may both unlink, but only
    // one `wx` create can succeed, so redemption stays single-winner throughout.
    try {
      const age = Date.now() - statSync(claimPath).mtimeMs;
      if (age < CLAIM_ORPHAN_MS) return false; // a real concurrent winner is in flight
      unlinkSync(claimPath);
      writeFileSync(claimPath, JSON.stringify({ key, token, at: new Date().toISOString(), reclaimedOrphan: true }), { flag: 'wx' });
      return true;
    } catch {
      return false; // lost the reclaim race, or the filesystem misbehaved — refuse
    }
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
export function checkSpend({ model, topic, worstCaseUsd, approvalToken = '', selfHeld = false }) {
  const entries = readLedger();
  const totals = {
    call: Number(worstCaseUsd) || 0,
    topic: spentOnTopic(topic, entries),
    day: spentToday(entries),
    caps: CAPS,
  };

  // RESERVE-THEN-CHECK (GLM 5.3 round-4 B4 / flash 3, and his ONE THING).
  //
  // The caller now appends its hold BEFORE asking, so the totals it reads already
  // contain its own worst case. Adding `call` again on top would refuse the caller
  // for its own money, twice counted.
  //
  // Why the order was wrong before: read -> decide -> reserve leaves the decision
  // unserialized against the hold, so N concurrent gates all decide on the same
  // snapshot. That narrowed the parallel-overshoot window from call-duration to
  // gate-duration; it did not close it, and the suite's own 12/20-under-a-barrier
  // number was the measurement of what remained. Appending first makes the hold
  // visible to every later reader before this one commits to anything, which turns a
  // probabilistic control into a deterministic one using the line-atomicity the
  // append-only design already depends on.
  const pending = selfHeld ? 0 : totals.call;

  const breaches = [];
  if (totals.call > CAPS.perCall) {
    breaches.push(`single call $${totals.call.toFixed(2)} > cap $${CAPS.perCall.toFixed(2)}`);
  }
  if (totals.topic + pending > CAPS.perTopic) {
    breaches.push(`topic "${topic}" would reach $${(totals.topic + pending).toFixed(2)} > cap $${CAPS.perTopic.toFixed(2)} (already spent $${(totals.topic + pending - totals.call).toFixed(2)})`);
  }
  if (totals.day + pending > CAPS.perDay) {
    breaches.push(`today would reach $${(totals.day + pending).toFixed(2)} > cap $${CAPS.perDay.toFixed(2)} (already spent $${(totals.day + pending - totals.call).toFixed(2)})`);
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
  // `isSpent` (a per-key file) rather than `tokens[key].used` (a field in a shared
  // object that an unlocked whole-file rewrite can lose). See markSpent above.
  if (approvalToken && tokens[key] && tokens[key].token === approvalToken && !isSpent(key)) {
    if (!claimToken(key, approvalToken)) {
      return { allow: false, reason: `token is being redeemed by a concurrent call (if this persists past ${CLAIM_ORPHAN_MS / 1000}s, delete .ai-workflow/spend/claim-${key}.json — a crashed holder left it behind)`, breach: breaches.join('; '), token: null, totals };
    }
    // MARK BEFORE RETURNING. This is the write that makes the claim mean "spent"
    // rather than "in progress", so it must land before the caller is told to go.
    markSpent(key, approvalToken);
    tokens[key].used = true;          // audit trail only — no longer load-bearing
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
  // Same authority as redemption: a token is unused when no MARKER exists for it.
  // Reading `existing.used` here would have re-minted over a token whose flag was
  // lost — destroying the approval Sean is holding, the exact DoS this branch was
  // added to prevent, arriving through the lost-write door instead of the re-mint one.
  const existing = tokens[key];
  if (existing && !isSpent(key)) {
    return { allow: false, reason: 'budget breach — an unused approval token already exists for this exact call', breach: breaches.join('; '), token: existing.token, totals };
  }

  // REPLAY OF A SPENT TOKEN — say which it is.
  //
  // Caught by spend-token-race.test.mjs the moment the spent-marker landed, and the
  // catch was correct: making the marker authoritative moved this case out of the
  // redemption branch, so a replay fell through to the generic "first ask refused"
  // and the operator was told nothing about why their token stopped working.
  //
  // The old message called it a CONCURRENT call and pointed at the claim file to
  // delete. That was already wrong for this case — there is no concurrency, the token
  // was simply spent, and telling someone to delete a claim file is telling them to
  // re-open a redeemed approval. The two situations were conflated because one flag
  // had to serve both; with a separate marker they can finally be told apart:
  //   marker present            -> SPENT. Re-ask. (here)
  //   claim present, no marker  -> a redemption is genuinely in flight, or crashed.
  const replayedSpent = Boolean(approvalToken && tokens[key]
    && tokens[key].token === approvalToken && isSpent(key));

  // FIRST ask: refuse, and mint the token this exact call would need.
  const token = crypto.randomBytes(6).toString('hex');
  tokens[key] = { token, model, topic, worstCaseUsd, used: false, issuedAt: new Date().toISOString() };
  writeTokens(tokens);

  return {
    allow: false,
    reason: replayedSpent
      ? 'that approval token was already spent — this is a NEW ask, and it needs a new token'
      : 'budget breach — first ask refused',
    breach: breaches.join('; '),
    token,
    totals,
  };
}

export const LEDGER_PATH = LEDGER;
