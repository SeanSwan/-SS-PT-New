/**
 * stages/content.mjs — CONTENT stage (S1): real copy and real data BEFORE structure.
 * ==================================================================================
 * Panel consensus (GLM F4, Kimi F6.1, Grok 3.3, Fable F3): generic copy fires the
 * human slop detector before visuals do, and lorem-grade content is what lets
 * template layouts "fit". So content is a GATED stage ahead of structure: the
 * content model is built from the brief's real facts, and the contract gate
 * rejects banned marketing register and unquantified copy (contracts.mjs).
 *
 * S1 is crude by design: content comes from the brief's `facts` payload (real
 * production facts supplied by the brief author), not from an LLM. S4 deepens
 * this stage; the GATE is what ships here.
 */

export function contentStage(ctx) {
  const b = ctx.brief;
  if (!b.facts || !Array.isArray(b.facts.sections) || !b.facts.sections.length) {
    throw new Error('brief carries no facts.sections[] — the loop refuses to design around absent content');
  }
  return {
    content_model_id: `content-${b.brief_id}`,
    brief_id: b.brief_id,
    primary_claim: b.facts.primary_claim,
    cta_label: b.facts.cta_label,
    sections: b.facts.sections.map((s) => ({
      slot: s.slot,
      heading: s.heading,
      facts: s.facts,
    })),
  };
}
