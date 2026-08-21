/**
 * stages/content.mjs — CONTENT stage (S4): provenance-carrying facts, the
 * specificity linter as a hard gate, and content-shape classification that
 * drives the IA downstream.
 * ==============================================================================
 * S1 passed brief facts through; S4 makes content the load-bearing stage the
 * panel demanded (GLM F4): facts normalize to {text, source} objects (the
 * no-fabrication rule — an unsourced fact is REPORTED, never hidden), the
 * deterministic linter halts the state on slop register/lorem/vagueness, and
 * every section is classified data/narrative/mixed so STRUCTURE can reject
 * skeletons whose section plan fights the actual content (diverge.mjs).
 * The copy GENERATOR stays human/copy-tournament; this stage is the gate.
 */
import { lintContent, classifyShape } from '../content-lint.mjs';

/** Normalize a brief fact (string or {text, source}) to a provenance object. */
const normalizeFact = (f) =>
  typeof f === 'string' ? { text: f, source: 'unsourced' } : { text: f.text, source: f.source ?? 'unsourced' };

export function contentStage(ctx) {
  const b = ctx.brief;
  if (!b.facts || !Array.isArray(b.facts.sections) || !b.facts.sections.length) {
    throw new Error('brief carries no facts.sections[] — the loop refuses to design around absent content');
  }

  const model = {
    content_model_id: `content-${b.brief_id}`,
    brief_id: b.brief_id,
    primary_claim: b.facts.primary_claim,
    cta_label: b.facts.cta_label,
    sections: b.facts.sections.map((s) => ({
      slot: s.slot,
      heading: s.heading,
      quantified_exempt: s.quantified_exempt === true,
      facts: (s.facts ?? []).map(normalizeFact),
      shape: classifyShape((s.facts ?? []).map(normalizeFact)),
    })),
  };

  const report = lintContent(model);
  if (report.violations.length) {
    throw new Error(
      `content linter: ${report.violations.length} hard violation(s) — ` +
      report.violations.map((v) => `[${v.section}] ${v.rule}: ${v.detail}`).join('; '),
    );
  }
  model.linter_report = report; // violations empty; unproven facts ride visibly
  return model;
}
