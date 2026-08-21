/**
 * stages/critique.mjs — CRITIQUE stage: deterministic lanes + the caged LLM tier.
 * ===============================================================================
 * S1 shipped the mechanical half: INSPECT's meters sorted into Keep / Fix-now
 * with the auto-apply whitelist marked. S6 adds the LLM tier BEHIND THE SAME
 * CONTRACT — and behind a cage (see critic.mjs): pairwise-only, citation-
 * validated, self-consistency-filtered, advisory until calibrated.
 *
 * Four fail-closed conditions, each RECORDED rather than silently skipped
 * (blueprint §1.6 — a silent scope-cut is receipts theatre):
 *   - no seat resolves (the transport script is absent, or every candidate
 *     shares the generator's model family)  -> llm_lane.available = false
 *   - no second artifact exists to compare against (the loop currently renders
 *     one direction; fleet rendering is S9)  -> llm_lane.available = false
 *   - the pair carries no rendered html, so citation validation cannot run —
 *     which would silently drop EVERY finding and read as an honest empty
 *     critique                                -> llm_lane.available = false
 *   - the seat has not been calibrated in this run -> verdict.advisory = true
 *
 * A fifth is recorded but not fail-closed: if the generator was never
 * identified, `same_family_guard.enforced` is false, because a comparison that
 * cannot fail must not appear in a receipt as though it passed.
 *
 * The deterministic lanes are never gated on any of this. An unavailable critic
 * costs the run nothing except an honest line in the receipt.
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { pairwiseCritique, resolveSeat, allowedCitations, familyOfModel, SEAT_ORDER } from '../critic.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPTS = join(HERE, '..', '..', '..');

/** Meters whose failures a machine may fix without a human (decision-rights: Objective). */
export const AUTO_APPLY_WHITELIST = new Set(['contrast']);

/**
 * Which seats actually have a transport on disk. An entry in a config table is
 * not a usable seat — `consult-qwen.mjs` is referenced by the panel config and
 * does not exist in this repo, which would have produced "opinions" from a seat
 * that never ran.
 */
export function availableSeats(scriptsDir = SCRIPTS) {
  return SEAT_ORDER.filter((s) => existsSync(join(scriptsDir, `consult-${s}.mjs`)));
}

export async function critiqueStage(ctx) {
  const inspect = ctx.artifacts.inspect;
  const keep = inspect.meters.filter((m) => m.pass).map((m) => ({ meter: m.meter, value: m.value }));
  const fix_now = inspect.meters
    .filter((m) => !m.pass)
    .map((m) => ({
      meter: m.meter,
      value: m.value,
      safe_auto_apply: AUTO_APPLY_WHITELIST.has(m.meter.split(':')[0]),
    }));

  const llm_lane = await runLlmLane(ctx, inspect);

  return {
    render_id: inspect.render_id,
    keep,
    fix_now,
    llm_lane,
    // Populated only by a CALIBRATED critic; an advisory verdict never fills these.
    elevate: llm_lane.verdict && !llm_lane.verdict.advisory ? llm_lane.verdict.findings : [],
    wildcard: null,
    lanes_pending: llm_lane.available ? [] : ['elevate:S6-seat', 'wildcard:S9-fleet'],
  };
}

/** The caged critic, or an honest recorded reason why it did not run. */
async function runLlmLane(ctx, inspect) {
  const generatorModel = ctx.generatorModel ?? 'unknown';
  const seats = ctx.criticSeats ?? availableSeats();
  // The generator != critic rule compares model families. If the generator was
  // never identified, that comparison silently cannot fail — an inert guard
  // that still LOOKS enforced in the receipt. Say so, every time.
  const guard = generatorModel === 'unknown'
    ? { enforced: false, reason: 'generator model not identified — the same-family check cannot fire' }
    : { enforced: true, generator_family: familyOfModel(generatorModel) };
  const picked = resolveSeat({ available: seats, generatorModel, allowPaid: ctx.allowPaidCritic === true });

  if (!picked) {
    return {
      available: false,
      reason: seats.length
        ? `no usable seat: candidates [${seats.join(', ')}] are paid (not authorised) or share the generator family "${generatorModel}"`
        : 'no critic transport resolves on disk — refusing to record opinions nobody generated',
      seats_on_disk: seats,
      generator_model: generatorModel,
      same_family_guard: guard,
      verdict: null,
    };
  }

  const pair = ctx.criticPair;
  if (!pair?.a || !pair?.b) {
    return {
      available: false,
      reason: 'pairwise-only: no second artifact to compare against (the loop renders one direction; fleet rendering is S9)',
      seats_on_disk: seats,
      seat: picked.seat,
      generator_model: generatorModel,
      same_family_guard: guard,
      verdict: null,
    };
  }

  const allowed = allowedCitations(pair.html ?? '', (inspect.screenshots ?? []).map((s) => s.viewport));
  if (!allowed.size) {
    return {
      available: false,
      reason: 'the compared pair carried no rendered html, so citation validation cannot run — refusing to report findings the cage never checked',
      seats_on_disk: seats,
      seat: picked.seat,
      generator_model: generatorModel,
      same_family_guard: guard,
      verdict: null,
    };
  }

  const verdict = await pairwiseCritique({
    a: pair.a,
    b: pair.b,
    transport: ctx.criticTransport,
    seat: picked.seat,
    generatorModel,
    meters: inspect.meters,
    allowed,
    calibration: ctx.criticCalibration ?? null,
  });

  return { available: true, seat: picked.seat, generator_model: generatorModel, same_family_guard: guard, seats_on_disk: seats, verdict };
}
