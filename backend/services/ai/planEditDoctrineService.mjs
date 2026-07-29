/**
 * planEditDoctrineService
 * =======================
 * The deterministic referee for Swan Coach plan-edit proposals.
 *
 * Sean 2026-07-12/28: "the brain must be completely smart... a scientific
 * approach... I need to trust it." Trust does NOT come from the LLM's confidence
 * — it comes from this file: every proposed acute-variable change (sets, reps,
 * tempo, rest, intensity) is checked against the frozen NASM OPT doctrine in
 * training-cortex BEFORE a trainer sees it. The Coach proposes; this referees;
 * the trainer decides per item.
 *
 * TRUST HOLE CLOSED (2026-07-28): the phase the referee checks against is now
 * resolved from the SAVED PLAN (per-week `optPhase`, else `plan.nasmPhase`),
 * NEVER from the model-authored payload. Previously the LLM supplied the phase,
 * so a proposal could declare "Phase 1" while loading Phase-4 weights and every
 * item stamped in_doctrine. A referee that trusts the accused's own claim is not
 * a referee. Verdicts are recomputed server-side on every detail read.
 *
 * Two axes on every verdict:
 *   verdict  — in_doctrine | out_of_doctrine | unchecked | plan_unavailable
 *   severity — ok      : inside doctrine, no concern
 *              info    : a deviation that is the trainer's informed call
 *                        (tempo cadence differs from the phase default; a field
 *                        with no numeric doctrine)
 *              caution : outside the phase's acute-variable range, an invalid
 *                        tempo, OR an in-range change whose single-edit MAGNITUDE
 *                        exceeds a sane progression step (a master caps the rate
 *                        of change, not just the endpoint)
 *              (contraindicated is RESERVED for the CES/pain slice — a swap that
 *               loads a client's painful/compensated pattern; not yet wired)
 */
import {
  DEFAULT_OPT_PHASE,
  resolveOptPhase,
} from '../training-cortex/policy/nasmOptPolicy.mjs';

// Same NASM tempo grammar the plan generator enforces (workoutGenerationSchemas):
// "4-2-1" / "2-0-2" style, or the doctrine words for phase 4/5.
const TEMPO_PATTERN = /^(\d{1,2}-\d{1,2}-\d{1,2}(-\d{1,2})?|explosive(\/controlled)?|controlled)$/i;

export const PLAN_EDIT_FIELDS = Object.freeze([
  'sets', 'reps', 'tempo', 'restSeconds', 'targetIntensity', 'exerciseSwap', 'notes',
]);

// Single-edit progression caps — a change can be INSIDE the phase range yet still
// be an aggressive one-edit jump a master trainer would question. Deterministic.
// Escalate to caution when the single-edit delta EXCEEDS the cap.
const MAGNITUDE_CAPS = Object.freeze({
  sets: 1,             // a jump of 2+ sets in one edit is a large volume spike
  targetIntensity: 10, // a jump of >10 percentage-points of 1RM in one edit far
                       // exceeds NASM's 2-for-2 (~2-10% load) progression guidance
});

const inRange = (value, [min, max]) => Number.isFinite(value) && value >= min && value <= max;
const rangeText = ([min, max], unit = '') => `${min}-${max}${unit}`;

const verdict = (v, severity, doctrine) => ({ verdict: v, severity, doctrine });

/** Escalate an in-range numeric change to `caution` when its single-edit delta is large. */
function magnitudeGuard(field, fromValue, toValue, doctrineName, inRangeVerdict) {
  const cap = MAGNITUDE_CAPS[field];
  const from = Number(fromValue);
  const to = Number(toValue);
  if (cap == null || !Number.isFinite(from) || !Number.isFinite(to)) return inRangeVerdict;
  const delta = Math.abs(to - from);
  if (delta <= cap) return inRangeVerdict;
  const unit = field === 'targetIntensity' ? '%1RM' : ' sets';
  return verdict(
    'in_doctrine',
    'caution',
    `${doctrineName}: ${to} is in range, but a ${delta}${unit} change from ${from} in one edit is an aggressive single-step progression — confirm it's intended`,
  );
}

/**
 * Check ONE proposed change against a GROUND-TRUTH OPT phase.
 * @param {object} item { field, fromValue, toValue }
 * @param {number} phase NASM OPT phase 1-5 (resolved from the plan, not the model)
 * @returns {{ verdict: string, severity: string, doctrine: string }}
 */
export function checkPlanEditItem(item, phase) {
  const spec = resolveOptPhase(phase);
  const doctrineName = `Phase ${phase} (${spec.name})`;
  const field = String(item?.field ?? '');
  const toValue = item?.toValue;
  const fromValue = item?.fromValue;

  switch (field) {
    case 'sets': {
      const value = Number(toValue);
      if (!inRange(value, spec.sets)) {
        return verdict('out_of_doctrine', 'caution', `${doctrineName}: sets ${rangeText(spec.sets)} — proposed ${toValue} is OUTSIDE the phase range`);
      }
      return magnitudeGuard('sets', fromValue, toValue, doctrineName,
        verdict('in_doctrine', 'ok', `${doctrineName}: sets ${rangeText(spec.sets)} — proposed ${value} is in range`));
    }
    case 'reps': {
      // Reps may arrive as "8-12" or a number; check the whole span.
      const text = String(toValue ?? '');
      const parts = text.split('-').map((part) => Number(part.trim())).filter(Number.isFinite);
      const ok = parts.length > 0 && parts.every((rep) => inRange(rep, spec.reps));
      return ok
        ? verdict('in_doctrine', 'ok', `${doctrineName}: reps ${rangeText(spec.reps)} — proposed ${text} is in range`)
        : verdict('out_of_doctrine', 'caution', `${doctrineName}: reps ${rangeText(spec.reps)} — proposed ${text} is OUTSIDE the phase range`);
    }
    case 'tempo': {
      const text = String(toValue ?? '').trim();
      if (!TEMPO_PATTERN.test(text)) {
        return verdict('out_of_doctrine', 'caution', `${doctrineName}: tempo must be NASM cadence (e.g. ${spec.tempo}) — "${text}" is not a valid tempo`);
      }
      const matchesPhase = text.toLowerCase() === String(spec.tempo).toLowerCase();
      return matchesPhase
        ? verdict('in_doctrine', 'ok', `${doctrineName}: tempo ${spec.tempo} — proposed matches phase doctrine`)
        // A valid cadence that differs from the phase default is a deliberate
        // coaching choice, not a range violation — the trainer's informed call.
        : verdict('out_of_doctrine', 'info', `${doctrineName}: doctrine tempo is ${spec.tempo} — proposed "${text}" deviates (may be intentional; trainer's call)`);
    }
    case 'restSeconds': {
      const value = Number(toValue);
      return inRange(value, spec.restSeconds)
        ? verdict('in_doctrine', 'ok', `${doctrineName}: rest ${rangeText(spec.restSeconds, 's')} — proposed ${value}s is in range`)
        : verdict('out_of_doctrine', 'caution', `${doctrineName}: rest ${rangeText(spec.restSeconds, 's')} — proposed ${toValue}s is OUTSIDE the phase range`);
    }
    case 'targetIntensity': {
      // Percent of 1RM. The LLM proposes intensity; the backend computes weight —
      // the Coach NEVER writes a raw weight (same contract as plan generation).
      const value = Number(toValue);
      const [minPct, maxPct] = spec.intensityPct;
      if (!inRange(value, [minPct * 100, maxPct * 100])) {
        return verdict('out_of_doctrine', 'caution', `${doctrineName}: intensity ${spec.intensityLabel} — proposed ${toValue}% is OUTSIDE the phase range`);
      }
      return magnitudeGuard('targetIntensity', fromValue, toValue, doctrineName,
        verdict('in_doctrine', 'ok', `${doctrineName}: intensity ${spec.intensityLabel} — proposed ${value}% is in range`));
    }
    case 'exerciseSwap':
      // NOTE: a swap has no NUMERIC doctrine, but it DOES have a safety dimension
      // (loading a painful/compensated pattern). That contraindication check is
      // the next slice; until it lands a swap stays trainer-judgment (info), and
      // is explicitly flagged as not-yet-safety-screened so nobody reads the
      // absence of a caution as a clean bill of health.
      return verdict('unchecked', 'info', `${doctrineName}: exercise swaps are not yet safety-screened against the client's pain/compensation profile — trainer judgment required`);
    case 'notes':
      return verdict('unchecked', 'info', `${doctrineName}: no numeric doctrine for ${field} — trainer judgment required`);
    default:
      return verdict('unchecked', 'info', `Unknown field "${field}" — trainer judgment required`);
  }
}

/**
 * Resolve the GROUND-TRUTH OPT phase for one item from the saved plan.
 * Preference: the item's week's own OPT phase → the plan's top-level nasmPhase →
 * the doctrine default. The model payload's `phase` is deliberately ignored.
 * @returns {{ phase: number, source: string }}
 */
export function resolveItemPhase(plan, item) {
  const planData = plan?.planData || plan?.plan_data || {};
  const weeks = Array.isArray(planData.weeks) ? planData.weeks : [];
  const targetWeekNo = Number(item?.weekNumber);
  const week = weeks.find((candidate, index) =>
    Number(candidate?.weekNumber ?? candidate?.week ?? index + 1) === targetWeekNo);

  const weekPhase = Number(
    week?.optPhase?.phase ?? week?.nasmPhase ?? week?.phaseNumber ?? week?.phase,
  );
  if (Number.isFinite(weekPhase) && weekPhase >= 1 && weekPhase <= 5) {
    return { phase: weekPhase, source: 'plan_week' };
  }
  const planPhase = Number(plan?.nasmPhase ?? plan?.nasm_phase);
  if (Number.isFinite(planPhase) && planPhase >= 1 && planPhase <= 5) {
    return { phase: planPhase, source: 'plan' };
  }
  return { phase: DEFAULT_OPT_PHASE, source: 'default_fallback' };
}

/**
 * LEGACY: stamp every item against a SINGLE caller-supplied phase.
 * Retained for callers/tests that already pass an authoritative phase. New code
 * must prefer stampDoctrineVerdictsFromPlan so the phase is plan-derived.
 */
export function stampDoctrineVerdicts(items, phase) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({ ...item, doctrineCheck: checkPlanEditItem(item, phase) }));
}

/**
 * Stamp every item against the phase resolved FROM THE SAVED PLAN (the trust
 * fix). Each item also carries `phaseUsed` + `phaseSource` so the trainer sees
 * exactly which phase the verdict was judged against and that it came from the
 * plan, not the proposal.
 *
 * If the plan is unavailable (archived/deleted between proposal and review), the
 * referee CANNOT verify anything — every item is stamped `plan_unavailable`
 * (caution) so the trainer never approves against an unverifiable baseline.
 */
export function stampDoctrineVerdictsFromPlan(items, plan) {
  if (!Array.isArray(items)) return [];
  if (!plan) {
    return items.map((item) => ({
      ...item,
      phaseUsed: null,
      phaseSource: 'plan_unavailable',
      doctrineCheck: verdict(
        'plan_unavailable',
        'caution',
        'The saved plan could not be loaded, so this change cannot be verified against NASM doctrine — do not approve without reviewing the plan directly',
      ),
    }));
  }
  return items.map((item) => {
    const { phase, source } = resolveItemPhase(plan, item);
    return {
      ...item,
      phaseUsed: phase,
      phaseSource: source,
      doctrineCheck: checkPlanEditItem(item, phase),
    };
  });
}