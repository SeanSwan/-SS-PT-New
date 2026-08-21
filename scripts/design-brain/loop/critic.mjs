/**
 * critic.mjs — the caged pairwise art-director critic (S6).
 * =========================================================
 * BLUEPRINT §S6 (SWA-185). This is the ONLY LLM tier in the loop, and every
 * panel seat agreed on the same thing: an uncalibrated LLM opinion is worse
 * than no opinion, because it launders taste-shaped noise into an artifact
 * that downstream stages treat as evidence. So the critic ships inside a cage:
 *
 *   1. PAIRWISE ONLY. The API takes exactly two artifacts. There is no field
 *      anywhere in the verdict schema for an absolute score, so "this page is
 *      7/10" is unrepresentable rather than merely discouraged.
 *   2. ORDER RANDOMISED, both orders run. Position bias is measured, not hoped
 *      away: a critic that always picks whatever is shown first is DETECTED
 *      (`position_bias`) instead of quietly driving the loop.
 *   3. EVERY FINDING CITES. A finding whose citation does not exist in the
 *      rendered page is DROPPED and counted — dangling citations are the
 *      signature of a model describing a page it did not look at.
 *   4. SELF-CONSISTENCY x3. Only findings that persist across independent
 *      rounds survive. One-shot findings are recorded as discarded, not kept.
 *   5. metricAgreement REPLACES confidence. A model's self-reported confidence
 *      is a number it made up; whether a deterministic meter corroborates the
 *      finding is a fact. Only the fact is stored.
 *   6. GENERATOR != CRITIC. Same model family judging its own output is a
 *      self-review; refused outright.
 *   7. ADVISORY UNTIL CALIBRATED. Until a calibration record in THIS RUN proves
 *      the seat clears the bar on planted defects, output carries
 *      `advisory: true` and cannot gate anything.
 *
 * The transport is injected, so the whole cage is exercised in tests at zero
 * cost and zero network. Seats are configuration, never code.
 */

/** Findings must clear this to survive self-consistency (3 rounds, 2 agreeing). */
export const SELF_CONSISTENCY_ROUNDS = 3;
const PERSISTENCE_MIN = 2;

/** Calibration bar from blueprint §S6: pick the clean page in >=90% of planted pairs. */
export const CALIBRATION_MIN = 0.9;

/** Seat preference: free/local first. Paid seats are config and Sean-gated. */
export const SEAT_ORDER = Object.freeze(['qwen', 'glm', 'kimi', 'grok']);
const FREE_SEATS = Object.freeze(['qwen', 'glm']);

/** Model family of a seat/model id — the unit the generator!=critic rule compares. */
export function familyOfModel(id) {
  const s = String(id ?? '').toLowerCase();
  for (const f of ['qwen', 'glm', 'kimi', 'grok', 'claude', 'opus', 'sonnet', 'fable', 'gemini', 'gpt', 'sol', 'codex']) {
    if (s.includes(f)) return f === 'opus' || f === 'sonnet' || f === 'fable' ? 'claude' : f;
  }
  return s || 'unknown';
}

/**
 * Pick a seat. `available` is the set of seat ids whose transport actually
 * resolves — an absent script is NOT a usable seat, and pretending otherwise is
 * how a critique lane reports opinions nobody generated.
 */
export function resolveSeat({ available = [], generatorModel, allowPaid = false } = {}) {
  const genFamily = familyOfModel(generatorModel);
  for (const seat of SEAT_ORDER) {
    if (!available.includes(seat)) continue;
    if (!allowPaid && !FREE_SEATS.includes(seat)) continue;
    if (familyOfModel(seat) === genFamily) continue; // rule 6
    return { seat, family: familyOfModel(seat) };
  }
  return null;
}

/**
 * Citation tokens a finding may legitimately reference: the structural handles
 * actually stamped into the rendered page, plus the captured viewport ids.
 */
export function allowedCitations(html, viewports = []) {
  const tokens = new Set();
  for (const re of [/data-zone="([^"]+)"/g, /data-section-type="([^"]+)"/g, /data-plate-crop="([^"]+)"/g]) {
    for (const m of html.matchAll(re)) tokens.add(m[1]);
  }
  if (/data-cta/.test(html)) tokens.add('data-cta');
  for (const v of viewports) tokens.add(`viewport:${v}`);
  return tokens;
}

/**
 * Validate one raw verdict. Returns {verdict, dropped[]} — never throws, because
 * a malformed model reply is expected input, not an exceptional condition.
 */
export function validateVerdict(raw, { allowed }) {
  const dropped = [];
  if (!raw || typeof raw !== 'object') return { verdict: null, dropped: ['reply was not an object'] };
  if (raw.winner !== 'A' && raw.winner !== 'B') {
    return { verdict: null, dropped: [`winner must be "A" or "B" (got ${JSON.stringify(raw.winner)}) — a forced choice has no third option`] };
  }
  // An absolute score is unrepresentable by contract; if a model volunteers one, drop it loudly.
  if (raw.score !== undefined || raw.rating !== undefined) {
    dropped.push('absolute score/rating present — pairwise-only cage forbids it; field discarded');
  }
  const reasons = [];
  for (const r of Array.isArray(raw.reasons) ? raw.reasons : []) {
    if (!r || typeof r.text !== 'string' || !r.text.trim()) { dropped.push('reason with no text'); continue; }
    const cites = Array.isArray(r.cites) ? r.cites.filter((c) => allowed.has(c)) : [];
    const dangling = (Array.isArray(r.cites) ? r.cites : []).filter((c) => !allowed.has(c));
    if (dangling.length) dropped.push(`dangling citation(s) on "${r.text.slice(0, 40)}": ${dangling.join(', ')}`);
    if (!cites.length) { dropped.push(`uncited finding dropped: "${r.text.slice(0, 60)}"`); continue; }
    reasons.push({ text: r.text.trim(), cites });
  }
  return { verdict: { winner: raw.winner, reasons }, dropped };
}

/** Stable key for "the same finding" across rounds — first 8 significant words. */
const findingKey = (r) => r.text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean).slice(0, 8).join(' ');

/**
 * Does a deterministic meter corroborate this finding? Replaces self-reported
 * confidence with a checkable fact.
 */
export function metricAgreement(reason, meters = []) {
  const hay = `${reason.text} ${reason.cites.join(' ')}`.toLowerCase();
  const hit = meters.find((m) => {
    const name = m.meter.toLowerCase();
    const head = name.split(/[:@]/)[0];
    return hay.includes(head) || reason.cites.some((c) => name.includes(String(c).toLowerCase()));
  });
  if (!hit) return { corroborated: null, meter: null };
  return { corroborated: hit.pass === false, meter: hit.meter };
}

/**
 * Run the caged pairwise critique.
 *
 * `transport({ prompt, seat, order })` returns a parsed verdict object. It is
 * injected: tests drive the entire cage without a network call, and the live
 * seat is wired at the call site.
 */
export async function pairwiseCritique({
  a, b, transport, seat, generatorModel, meters = [], allowed = new Set(),
  rounds = SELF_CONSISTENCY_ROUNDS, calibration = null,
}) {
  if (!a || !b) throw new Error('critic: pairwise requires exactly two artifacts — a single-artifact critique is an absolute score wearing a disguise');
  if (!seat) throw new Error('critic: no seat resolved — refusing to emit opinions nobody generated');
  if (familyOfModel(seat) === familyOfModel(generatorModel)) {
    throw new Error(`critic: seat "${seat}" and generator "${generatorModel}" share model family "${familyOfModel(seat)}" — a model may not review its own output`);
  }
  // An empty citation vocabulary means citation validation cannot run at all —
  // and the failure mode is silent: EVERY finding is dropped as "uncited" and
  // the result reads exactly like a critic that honestly found nothing. A cage
  // that is switched off must be an error, never a quiet pass.
  if (!(allowed instanceof Set) || allowed.size === 0) {
    throw new Error('critic: empty citation vocabulary — citation validation cannot run, and silently dropping every finding would read as "found nothing". Pass the rendered html.');
  }

  const roundResults = [];
  const dropped = [];
  for (let i = 0; i < rounds; i++) {
    // Alternate presentation order so position bias is measurable, not assumed away.
    const order = i % 2 === 0 ? ['A', 'B'] : ['B', 'A'];
    let raw;
    try {
      raw = await transport({ seat, order, a, b, round: i });
    } catch (err) {
      dropped.push(`round ${i}: transport failed (${err.message})`);
      continue;
    }
    const { verdict, dropped: d } = validateVerdict(raw, { allowed });
    dropped.push(...d.map((x) => `round ${i}: ${x}`));
    if (verdict) roundResults.push({ ...verdict, order });
  }

  if (roundResults.length < PERSISTENCE_MIN) {
    return {
      seat, advisory: true, winner: null, findings: [], dropped,
      rounds_completed: roundResults.length,
      reason: `only ${roundResults.length} valid round(s) — below the ${PERSISTENCE_MIN} needed to call anything persistent`,
    };
  }

  // Winner by majority across rounds; a tie is an honest null, not a coin flip.
  const votes = roundResults.reduce((acc, r) => { acc[r.winner] = (acc[r.winner] ?? 0) + 1; return acc; }, {});
  const winner = (votes.A ?? 0) === (votes.B ?? 0) ? null : ((votes.A ?? 0) > (votes.B ?? 0) ? 'A' : 'B');

  // Position bias: did the seat pick the FIRST-shown artifact every single round?
  const alwaysFirst = roundResults.every((r) => r.winner === r.order[0]);
  const positionBias = roundResults.length >= 2 && alwaysFirst;

  // Self-consistency: a finding survives only if it recurs across rounds.
  const seen = new Map();
  for (const r of roundResults) {
    for (const reason of r.reasons) {
      const k = findingKey(reason);
      const e = seen.get(k) ?? { reason, count: 0 };
      e.count += 1;
      seen.set(k, e);
    }
  }
  const findings = [];
  for (const [k, e] of seen) {
    if (e.count < PERSISTENCE_MIN) { dropped.push(`non-persistent finding dropped (${e.count}/${roundResults.length}): "${e.reason.text.slice(0, 60)}"`); continue; }
    findings.push({ ...e.reason, persistence: `${e.count}/${roundResults.length}`, key: k, metric_agreement: metricAgreement(e.reason, meters) });
  }

  const calibrated = Boolean(calibration && calibration.passed === true && calibration.seat === seat);
  return {
    seat,
    // Fail-closed: uncalibrated OR position-biased output can never gate.
    advisory: !calibrated || positionBias,
    calibration: calibration ? { passed: calibration.passed, rate: calibration.rate, seat: calibration.seat } : null,
    position_bias: positionBias,
    winner,
    votes,
    rounds_completed: roundResults.length,
    findings,
    dropped,
  };
}

/**
 * Calibration: run the seat over planted-defect pairs where the correct answer
 * is known by construction, in BOTH orders. Until this passes in the run, the
 * critic is advisory. A seat that cannot beat planted defects has no business
 * judging taste.
 */
export async function calibrate({ pairs, transport, seat, generatorModel, min = CALIBRATION_MIN }) {
  if (!pairs?.length) throw new Error('critic: calibration requires planted-defect pairs');
  let correct = 0;
  let total = 0;
  const misses = [];
  for (const p of pairs) {
    for (const swap of [false, true]) {
      total += 1;
      const a = swap ? p.defective : p.clean;
      const b = swap ? p.clean : p.defective;
      const expected = swap ? 'B' : 'A'; // the clean page, wherever it was placed
      let raw;
      try {
        raw = await transport({ seat, order: swap ? ['B', 'A'] : ['A', 'B'], a, b, calibration: true });
      } catch (err) {
        misses.push({ pair: p.id, swap, got: `transport error: ${err.message}` });
        continue;
      }
      if (raw?.winner === expected) correct += 1;
      else misses.push({ pair: p.id, swap, expected, got: raw?.winner ?? null });
    }
  }
  const rate = total ? correct / total : 0;
  return { seat, passed: rate >= min, rate: Math.round(rate * 1000) / 1000, correct, total, min, misses };
}
