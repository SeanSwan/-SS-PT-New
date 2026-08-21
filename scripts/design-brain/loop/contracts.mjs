/**
 * contracts.mjs — typed artifact contracts for the Design Brain loop (S1).
 * =========================================================================
 * BLUEPRINT: DESIGN-BRAIN-UPGRADE-BLUEPRINT-2026-08-21.md §S1 (SWA-185).
 * Every state transition in the loop requires a validated artifact from the
 * previous state. These validators are the transition gates: a stage that
 * emits an invalid artifact HALTS the run at that state, loudly. No prose
 * artifact passes any gate — that is the whole point of S1.
 *
 * Style follows log-atelier-session.mjs: pure `validateX(obj) -> defects[]`
 * functions, empty array = valid. No throw inside validators; the state
 * machine throws with the state name attached.
 */

const isStr = (v) => typeof v === 'string' && v.length > 0;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Words whose presence marks marketing-register slop copy (panel F: content-truth). */
export const BANNED_REGISTER = [
  'empower', 'unleash', 'unlock your potential', 'transform your journey',
  'elevate your fitness', 'take your fitness to the next level', 'revolutionize',
  'lorem ipsum', 'game-changer', 'next level results',
];

export function validateBrief(b) {
  const bad = [];
  if (!b || typeof b !== 'object') return ['brief is not an object'];
  if (!isStr(b.brief_id)) bad.push('brief_id required');
  if (!isStr(b.surface)) bad.push('surface required (route or page name)');
  if (b.domain !== 'swan_product') bad.push('domain must be "swan_product" (only launch pack in S1)');
  if (!isStr(b.primary_task)) bad.push('primary_task required (what must a visitor be able to DO)');
  if (!isStr(b.archetype)) bad.push('archetype required');
  if (!Array.isArray(b.viewports) || !b.viewports.length) bad.push('viewports[] required');
  return bad;
}

export function validateContentModel(c) {
  const bad = [];
  if (!c || typeof c !== 'object') return ['content model is not an object'];
  if (!isStr(c.content_model_id)) bad.push('content_model_id required');
  if (!isStr(c.brief_id)) bad.push('brief_id backlink required');
  if (!isStr(c.primary_claim)) bad.push('primary_claim required (the real headline, not lorem)');
  if (!Array.isArray(c.sections) || c.sections.length < 2) bad.push('sections[] requires >=2 entries');
  for (const s of c.sections || []) {
    if (!isStr(s.slot)) bad.push('section missing slot id');
    if (!isStr(s.heading)) bad.push(`section ${s.slot}: heading required`);
    if (!Array.isArray(s.facts) || !s.facts.length) bad.push(`section ${s.slot}: facts[] required (real data shapes)`);
  }
  // Content-truth gate: no banned register, and at least one quantified claim.
  const text = JSON.stringify(c).toLowerCase();
  for (const phrase of BANNED_REGISTER) {
    if (text.includes(phrase)) bad.push(`banned register phrase present: "${phrase}"`);
  }
  if (!/\d/.test(c.primary_claim + JSON.stringify(c.sections ?? ''))) {
    bad.push('no quantified claim anywhere — real content carries at least one number');
  }
  if (!isStr(c.cta_label)) bad.push('cta_label required');
  return bad;
}

export function validateLayoutIR(ir) {
  const bad = [];
  if (!ir || typeof ir !== 'object') return ['layout IR is not an object'];
  if (!isStr(ir.layout_ir_id)) bad.push('layout_ir_id required');
  if (!isStr(ir.content_model_id)) bad.push('content_model_id backlink required (no structure without content)');
  if (!isStr(ir.skeleton_id)) bad.push('skeleton_id required (structural provenance)');
  if (!isStr(ir.nav_model)) bad.push('nav_model required (fingerprint field)');
  if (!isStr(ir.hero_mechanics)) bad.push('hero_mechanics required (fingerprint field)');
  if (!isStr(ir.grid)) bad.push('grid required (fingerprint field)');
  if (!Array.isArray(ir.zones) || ir.zones.length < 2) bad.push('zones[] requires >=2 entries');
  const slots = new Set();
  for (const z of ir.zones || []) {
    if (!isStr(z.zone)) bad.push('zone missing id');
    if (!isStr(z.content_slot)) bad.push(`zone ${z.zone}: content_slot required (every zone carries real content)`);
    if (slots.has(z.zone)) bad.push(`duplicate zone id: ${z.zone}`);
    slots.add(z.zone);
  }
  if (!Number.isInteger(ir.card_budget) || ir.card_budget < 0) bad.push('card_budget integer required (anti card-sprawl meter input)');
  if (!Array.isArray(ir.anti_specs)) bad.push('anti_specs[] required (what this direction REFUSES to do)');
  return bad;
}

export function validateMaterialPlan(m) {
  const bad = [];
  if (!m || typeof m !== 'object') return ['material plan is not an object'];
  if (!isStr(m.material_plan_id)) bad.push('material_plan_id required');
  if (!isStr(m.layout_ir_id)) bad.push('layout_ir_id backlink required');
  if (!['awe_photo', 'type_data', 'print_none'].includes(m.strategy)) {
    bad.push('strategy must be awe_photo | type_data | print_none (surface-typed material policy)');
  }
  if (!Array.isArray(m.slots)) bad.push('slots[] required');
  for (const s of m.slots || []) {
    if (!isStr(s.slot)) bad.push('material slot missing id');
    if (!isStr(s.resolution)) bad.push(`slot ${s.slot}: resolution required (asset ref or explicit "pending:S5")`);
  }
  return bad;
}

export function validateRenderArtifact(r) {
  const bad = [];
  if (!r || typeof r !== 'object') return ['render artifact is not an object'];
  if (!isStr(r.render_id)) bad.push('render_id required');
  if (!isStr(r.layout_ir_id)) bad.push('layout_ir_id backlink required');
  if (!isStr(r.content_model_id)) bad.push('content_model_id backlink required');
  if (!isStr(r.html_path)) bad.push('html_path required (a render that produced no file is prose)');
  if (!isStr(r.html_hash)) bad.push('html_hash required (hash-pinned artifact)');
  return bad;
}

export function validateInspectReport(i) {
  const bad = [];
  if (!i || typeof i !== 'object') return ['inspect report is not an object'];
  if (!isStr(i.render_id)) bad.push('render_id backlink required');
  if (!Array.isArray(i.meters) || !i.meters.length) bad.push('meters[] required (a report with no measurements is prose)');
  for (const m of i.meters || []) {
    if (!isStr(m.meter)) bad.push('meter missing name');
    if (typeof m.pass !== 'boolean') bad.push(`meter ${m.meter}: pass boolean required`);
    if (m.value === undefined) bad.push(`meter ${m.meter}: value required (measured, not vibes)`);
  }
  return bad;
}

export function validateCritiqueReport(c) {
  const bad = [];
  if (!c || typeof c !== 'object') return ['critique report is not an object'];
  if (!isStr(c.render_id)) bad.push('render_id backlink required');
  if (!Array.isArray(c.keep)) bad.push('keep[] lane required');
  if (!Array.isArray(c.fix_now)) bad.push('fix_now[] lane required');
  for (const f of c.fix_now || []) {
    if (!isStr(f.meter)) bad.push('fix_now finding missing meter reference (every finding cites its evidence)');
    if (typeof f.safe_auto_apply !== 'boolean') bad.push(`fix ${f.meter}: safe_auto_apply boolean required`);
  }
  return bad;
}

export function validateVerifyReport(v) {
  const bad = [];
  if (!v || typeof v !== 'object') return ['verify report is not an object'];
  if (typeof v.all_meters_pass !== 'boolean') bad.push('all_meters_pass boolean required');
  if (typeof v.skeleton_roundtrip_ok !== 'boolean') bad.push('skeleton_roundtrip_ok boolean required (IR-A/code-B forgery check)');
  if (!Array.isArray(v.regressions)) bad.push('regressions[] required');
  return bad;
}

export function validateReceipt(r) {
  const bad = [];
  if (!r || typeof r !== 'object') return ['receipt is not an object'];
  if (!isStr(r.run_id)) bad.push('run_id required');
  if (!isStr(r.brief_id)) bad.push('brief_id required');
  if (!Array.isArray(r.state_log) || !r.state_log.length) bad.push('state_log[] required');
  for (const s of r.state_log || []) {
    if (!isStr(s.state)) bad.push('state_log entry missing state name');
    if (!isStr(s.artifact_hash)) bad.push(`state ${s.state}: artifact_hash required`);
  }
  if (!isNum(r.spend_usd)) bad.push('spend_usd must be a NUMBER — never an adjective');
  if (!isStr(r.taste_profile_hash)) bad.push('taste_profile_hash required (proves which profile drove selection)');
  return bad;
}
