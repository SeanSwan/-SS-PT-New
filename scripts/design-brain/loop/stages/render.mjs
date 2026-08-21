/**
 * stages/render.mjs — RENDER stage (S1): compile the LayoutIR into a real HTML file.
 * ==================================================================================
 * Crude by design (S1 renders static HTML with Crystalline tokens, not production
 * React — S8 owns the production compiler), but REAL: the render is a file on
 * disk whose DOM stamps its structural provenance so VERIFY can prove the code
 * matches the IR (`data-skeleton`, `data-zone` — Grok 4.1's anti IR-A/code-B
 * round-trip check). Rule 6: every color is var(--token, #fallback).
 */
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/** Crystalline Swan tokens (fallbacks are the palette of record — CLAUDE.md Active Palette). */
export const TOKENS = {
  bg: ['--bg-base', '#0A0A0F'],
  surface: ['--surface-royal', '#003080'],
  text: ['--text-frost', '#E0ECF4'],
  accent: ['--accent-primary', '#60C0F0'],
  gold: ['--accent-gold', '#C6A84B'],
};

const v = (t) => `var(${TOKENS[t][0]}, ${TOKENS[t][1]})`;

/**
 * The hero's actual layout varies with the skeleton's hero_mechanics — the
 * selected structure must reach PIXELS, not just a data attribute (panel:
 * "brief ≠ pixels"). S1 keeps this coarse; S2's IR compiler owns real zones.
 */
export function heroLayoutCss(heroMechanics) {
  const m = heroMechanics.toLowerCase();
  if (m.includes('split') || m.includes('asymmetric')) return 'display:grid;grid-template-columns:7fr 5fr;gap:24px;align-items:start;';
  if (m.includes('kpi') || m.includes('no-hero')) return 'display:flex;flex-wrap:wrap;gap:16px;align-items:center;padding-top:20px;padding-bottom:20px;';
  if (m.includes('editorial') || m.includes('single-column')) return 'max-width:680px;margin:0 auto;';
  if (m.includes('centered')) return 'text-align:center;';
  return '';
}

/**
 * Per-section-type body compile (S2): the closed vocabulary reaches the DOM as
 * genuinely different markup, stamped `data-section-type` so INSPECT can prove
 * the type sequence round-trips from the file on disk.
 */
function sectionBody(type, s, textToken) {
  const c = (t) => `color:${v(t)};`;
  switch (type) {
    case 'price-ledger':
      return s.facts.map((f) => `<div data-row style="display:flex;justify-content:space-between;gap:24px;${c(textToken)}border-bottom:1px solid ${v('accent')};padding:10px 0;"><span>${f.text}</span></div>`).join('\n      ');
    case 'kpi-strip':
      return `<div style="display:flex;flex-wrap:wrap;gap:20px;">${s.facts.map((f) => `<div data-kpi style="${c(textToken)}font-family:'Fira Code',monospace;min-width:120px;">${f.text}</div>`).join('')}</div>`;
    case 'data-table':
      return `<table style="${c(textToken)}border-collapse:collapse;width:100%;">${s.facts.map((f) => `<tr><td style="padding:8px 4px;border-bottom:1px solid ${v('surface')};">${f.text}</td></tr>`).join('')}</table>`;
    case 'narrative-chapter':
    case 'editorial-flow':
      return s.facts.map((f) => `<p style="${c(textToken)}line-height:1.8;max-width:64ch;">${f.text}</p>`).join('\n      ');
    case 'card-grid':
      return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">${s.facts.map((f) => `<div data-card style="${c(textToken)}background:${v('surface')};padding:16px;border-radius:8px;">${f.text}</div>`).join('')}</div>`;
    default:
      return `<ul style="${c(textToken)}line-height:1.6;">${s.facts.map((f) => `<li>${f.text}</li>`).join('\n      ')}</ul>`;
  }
}

/**
 * S5: a resolved material plate reaches the DOM. `plates` is keyed by zone and
 * comes from the gated MATERIAL plan — this is the reader that makes the plan a
 * consumed artifact rather than a written-and-ignored one. The crop id and the
 * source ref are stamped so INSPECT/VERIFY can prove the page shipped the plate
 * that was actually chosen for THIS direction's geometry.
 */
function plateMarkup(plate) {
  if (!plate) return { attrs: '', html: '' };
  const attrs = ` data-plate-crop="${plate.crop}" data-plate-source="${plate.kind}:${plate.ref}"`;
  const html = plate.src
    ? `<img src="${plate.src}" alt="" data-plate style="width:100%;height:auto;display:block;border-radius:8px;">`
    : `<div data-plate data-plate-pending style="min-height:120px;background:${v('surface')};border-radius:8px;"></div>`;
  return { attrs, html };
}

/**
 * The material plan -> render `plates` map. Exported and shared because REVISE
 * re-renders too: when this lived inline in renderStage, the revision path
 * silently produced a page with NO plates while every meter still passed. Two
 * code paths where only one is exercised is the exact bug this repo has now
 * shipped four times. One path, both callers.
 */
export function platesFromPlan(materials, runDir) {
  return Object.fromEntries(
    (materials?.slots ?? [])
      .filter((s) => s.plate === true)
      .map((s) => [s.slot, {
        crop: s.crop_id,
        kind: s.source_kind,
        ref: s.source_ref,
        // Relative so the written page resolves the asset from its own run dir.
        src: s.asset_path ? relative(runDir, s.asset_path).split(sep).join('/') : null,
      }]),
  );
}

export function renderHtml(ir, content, opts = {}) {
  const textToken = opts.textToken ?? 'text';
  const plates = opts.plates ?? {};
  const heroZone = ir.zones.find((z) => z.zone === 'hero');
  const sections = ir.zones
    .filter((z) => z.zone !== 'hero')
    .map((z) => {
      const s = content.sections.find((c) => c.slot === z.content_slot);
      if (!s) throw new Error(`zone ${z.zone} binds content slot "${z.content_slot}" which the content model does not carry`);
      const p = plateMarkup(plates[z.zone]);
      return `
  <section data-zone="${z.zone}" data-section-type="${z.section_type}"${p.attrs} style="padding:32px 24px;background:${v('bg')};">
    <h2 style="color:${v(textToken)};font-size:1.5rem;">${s.heading}</h2>
    ${p.html}
    ${sectionBody(z.section_type, s, textToken)}
  </section>`;
    })
    .join('\n');

  const hero = content.sections.find((c) => c.slot === 'hero');
  const heroPlate = plateMarkup(plates.hero);
  return `<!-- generated by design-brain loop — skeleton ${ir.skeleton_id} -->
<style>html, body { margin: 0; padding: 0; } main { overflow-x: clip; }</style>
<main data-skeleton="${ir.skeleton_id}" data-nav-model="${ir.nav_model}" data-grid="${ir.grid}"
      style="background:${v('bg')};min-height:100vh;font-family:'Plus Jakarta Sans',sans-serif;">
  <section data-zone="hero" data-section-type="${heroZone?.section_type ?? 'hero'}" data-hero-mechanics="${ir.hero_mechanics}"${heroPlate.attrs}
           style="padding:56px 24px;background:${v('surface')};${heroLayoutCss(ir.hero_mechanics)}">
    ${heroPlate.html}
    <h1 style="color:${v(textToken)};font-size:2.25rem;max-width:22ch;">${content.primary_claim}</h1>
    <ul style="color:${v(textToken)};line-height:1.7;">
      ${(hero?.facts ?? []).map((f) => `<li>${f.text}</li>`).join('\n      ')}
    </ul>
    <a href="#book" data-cta style="display:inline-block;min-height:44px;min-width:44px;padding:12px 28px;
       background:${v('accent')};color:${v('bg')};border-radius:8px;font-weight:600;">${content.cta_label}</a>
  </section>
${sections}
</main>`;
}

export function renderStage(ctx) {
  const ir = ctx.artifacts.ir;
  const content = ctx.artifacts.content;
  const plates = platesFromPlan(ctx.artifacts.materials, ctx.runDir);
  const html = renderHtml(ir, content, { ...(ctx.renderOpts ?? {}), plates });
  const htmlPath = join(ctx.runDir, 'render.html');
  writeFileSync(htmlPath, html);
  return {
    render_id: `render-${ir.layout_ir_id}`,
    layout_ir_id: ir.layout_ir_id,
    content_model_id: content.content_model_id,
    html_path: htmlPath,
    html_hash: createHash('sha256').update(html).digest('hex').slice(0, 16),
  };
}
