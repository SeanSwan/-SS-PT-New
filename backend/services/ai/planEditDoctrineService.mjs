/**
 * planEditDoctrineService
 * =======================
 * The deterministic referee for Swan Coach plan-edit proposals.
 *
 * Sean 2026-07-12: "the brain must be completely smart... a scientific approach...
 * I need to trust it." Trust here does NOT come from the LLM's confidence — it
 * comes from this file: every proposed acute-variable change (sets, reps, tempo,
 * rest, intensity) is checked against the frozen NASM OPT doctrine in
 * training-cortex BEFORE a trainer sees it. The Coach proposes; this referees;
 * the trainer decides per item. Verdicts are computed server-side at proposal
 * creation AND recomputed at detail-read — never trusted from model output.
 *
 * Verdicts:
 *   in_doctrine     — value sits inside the client's OPT-phase range
 *   out_of_doctrine — value violates the phase range (shown with the range;
 *                     the trainer may still approve — they outrank the table)
 *   unchecked       — no doctrine exists for this field (e.g. exercise swap
 *                     wording); flagged so nothing silently skips review
 */
import { resolveOptPhase } from '../training-cortex/policy/nasmOptPolicy.mjs';

// Same NASM tempo grammar the plan generator enforces (workoutGenerationSchemas):
// "4-2-1" / "2-0-2" style, or the doctrine words for phase 4/5.
const TEMPO_PATTERN = /^(\d{1,2}-\d{1,2}-\d{1,2}(-\d{1,2})?|explosive(\/controlled)?|controlled)$/i;

export const PLAN_EDIT_FIELDS = Object.freeze([
  'sets', 'reps', 'tempo', 'restSeconds', 'targetIntensity', 'exerciseSwap', 'notes',
]);

const inRange = (value, [min, max]) => Number.isFinite(value) && value >= min && value <= max;

const rangeText = ([min, max], unit = '') => `${min}-${max}${unit}`;

/**
 * Check ONE proposed change against the client's OPT phase doctrine.
 * @param {object} item { field, toValue }
 * @param {number} phase NASM OPT phase 1-5
 * @returns {{ verdict: string, doctrine: string }}
 */
export function checkPlanEditItem(item, phase) {
  const spec = resolveOptPhase(phase);
  const doctrineName = `Phase ${phase} (${spec.name})`;
  const field = String(item?.field ?? '');
  const toValue = item?.toValue;

  switch (field) {
    case 'sets': {
      const value = Number(toValue);
      return inRange(value, spec.sets)
        ? { verdict: 'in_doctrine', doctrine: `${doctrineName}: sets ${rangeText(spec.sets)} — proposed ${value} is in range` }
        : { verdict: 'out_of_doctrine', doctrine: `${doctrineName}: sets ${rangeText(spec.sets)} — proposed ${toValue} is OUTSIDE the phase range` };
    }
    case 'reps': {
      // Reps may arrive as "8-12" or a number; check the whole span.
      const text = String(toValue ?? '');
      const parts = text.split('-').map((part) => Number(part.trim())).filter(Number.isFinite);
      const ok = parts.length > 0 && parts.every((rep) => inRange(rep, spec.reps));
      return ok
        ? { verdict: 'in_doctrine', doctrine: `${doctrineName}: reps ${rangeText(spec.reps)} — proposed ${text} is in range` }
        : { verdict: 'out_of_doctrine', doctrine: `${doctrineName}: reps ${rangeText(spec.reps)} — proposed ${text} is OUTSIDE the phase range` };
    }
    case 'tempo': {
      const text = String(toValue ?? '').trim();
      if (!TEMPO_PATTERN.test(text)) {
        return { verdict: 'out_of_doctrine', doctrine: `${doctrineName}: tempo must be NASM cadence (e.g. ${spec.tempo}) — "${text}" is not a valid tempo` };
      }
      const matchesPhase = text.toLowerCase() === String(spec.tempo).toLowerCase();
      return matchesPhase
        ? { verdict: 'in_doctrine', doctrine: `${doctrineName}: tempo ${spec.tempo} — proposed matches phase doctrine` }
        : { verdict: 'out_of_doctrine', doctrine: `${doctrineName}: doctrine tempo is ${spec.tempo} — proposed "${text}" deviates (may be intentional; trainer's call)` };
    }
    case 'restSeconds': {
      const value = Number(toValue);
      return inRange(value, spec.restSeconds)
        ? { verdict: 'in_doctrine', doctrine: `${doctrineName}: rest ${rangeText(spec.restSeconds, 's')} — proposed ${value}s is in range` }
        : { verdict: 'out_of_doctrine', doctrine: `${doctrineName}: rest ${rangeText(spec.restSeconds, 's')} — proposed ${toValue}s is OUTSIDE the phase range` };
    }
    case 'targetIntensity': {
      // Percent of 1RM. The LLM proposes intensity; the backend computes weight —
      // the Coach NEVER writes a raw weight (same contract as plan generation).
      const value = Number(toValue);
      const [minPct, maxPct] = spec.intensityPct;
      return inRange(value, [minPct * 100, maxPct * 100])
        ? { verdict: 'in_doctrine', doctrine: `${doctrineName}: intensity ${spec.intensityLabel} — proposed ${value}% is in range` }
        : { verdict: 'out_of_doctrine', doctrine: `${doctrineName}: intensity ${spec.intensityLabel} — proposed ${toValue}% is OUTSIDE the phase range` };
    }
    case 'exerciseSwap':
    case 'notes':
      return { verdict: 'unchecked', doctrine: `${doctrineName}: no numeric doctrine for ${field} — trainer judgment required` };
    default:
      return { verdict: 'unchecked', doctrine: `Unknown field "${field}" — trainer judgment required` };
  }
}

/**
 * Stamp every item with a server-computed verdict. Idempotent: recomputing at
 * detail-read overwrites whatever was stored (so a tampered/stale verdict can
 * never reach the trainer).
 */
export function stampDoctrineVerdicts(items, phase) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    ...item,
    doctrineCheck: checkPlanEditItem(item, phase),
  }));
}
