/**
 * stages/inspect.mjs — INSPECT stage (S1): deterministic meters, zero LLM calls.
 * ==============================================================================
 * Panel consensus (all six seats): the reliable half of visual inspection is
 * COMPUTED, never eyeballed. S1 ships the deterministic tier on the rendered
 * HTML file — real WCAG contrast math on the token pairs actually used, zone
 * presence against the IR, card budget, CTA-in-hero, banned-pattern scan.
 * S3 deepens this with browser capture; S6 adds the calibrated LLM residual.
 * An LLM call inside this file is a build failure by doctrine.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { TOKENS } from './render.mjs';

/** WCAG relative luminance of a #rrggbb hex. */
export function luminance(hex) {
  const c = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const ch = parseInt(c.slice(i, i + 2), 16) / 255;
    return ch <= 0.03928 ? ch / 12.92 : ((ch + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colors. */
export function contrastRatio(hexA, hexB) {
  const [hi, lo] = [luminance(hexA), luminance(hexB)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Extract (text-color, background) token pairs SECTION-SCOPED: each <section>'s
 * declared background is paired with every text color used inside that section
 * (plus same-element pairs like the CTA). Fallback hexes are the measured values.
 */
function usedPairs(html) {
  const pairs = [];
  const seen = new Set();
  const push = (fgTok, fg, bgTok, bg) => {
    const key = `${fgTok}/${bgTok}`;
    if (!seen.has(key)) { seen.add(key); pairs.push({ fg, bg, fgToken: fgTok, bgToken: bgTok }); }
  };
  for (const chunk of html.split('<section').slice(1)) {
    const sectionBg = chunk.match(/background:var\((--[\w-]+),\s*(#[0-9a-fA-F]{6})\)/);
    for (const el of chunk.match(/style="[^"]*"/g) ?? []) {
      const c = el.match(/(?<![\w-])color:var\((--[\w-]+),\s*(#[0-9a-fA-F]{6})\)/);
      if (!c) continue;
      const ownBg = el.match(/background:var\((--[\w-]+),\s*(#[0-9a-fA-F]{6})\)/);
      // An element that declares its own background is judged against IT; only
      // background-less text inherits the section's ground. Pairing a button's
      // label against the section behind the button is a false meter.
      if (ownBg) push(c[1], c[2], ownBg[1], ownBg[2]);
      else if (sectionBg) push(c[1], c[2], sectionBg[1], sectionBg[2]);
    }
  }
  return pairs;
}

export function inspectHtml(html, ir) {
  const meters = [];

  // 1. Zone round-trip: every IR zone must exist in the DOM, and no phantom zones.
  const domZones = [...html.matchAll(/data-zone="([^"]+)"/g)].map((m) => m[1]);
  const irZones = ir.zones.map((z) => z.zone);
  const missing = irZones.filter((z) => !domZones.includes(z));
  const phantom = domZones.filter((z) => !irZones.includes(z));
  meters.push({ meter: 'zones_roundtrip', value: { missing, phantom }, pass: !missing.length && !phantom.length });

  // 2. Skeleton stamp present and matching.
  const stamp = html.match(/data-skeleton="([^"]+)"/)?.[1] ?? null;
  meters.push({ meter: 'skeleton_stamp', value: stamp, pass: stamp === ir.skeleton_id });

  // 2b. Section-TYPE sequence round-trips (S2): the closed-vocabulary types the
  // IR declared must appear in the DOM, in order — structure reached markup.
  const domTypes = [...html.matchAll(/data-section-type="([^"]+)"/g)].map((m) => m[1]);
  const irTypes = ir.zones.map((z) => z.section_type);
  meters.push({ meter: 'section_types_roundtrip', value: { dom: domTypes, ir: irTypes }, pass: JSON.stringify(domTypes) === JSON.stringify(irTypes) });

  // 3. WCAG contrast >= 4.5:1 on every used fg/bg token pair (Rule 7).
  for (const p of usedPairs(html)) {
    const ratio = Math.round(contrastRatio(p.fg, p.bg) * 100) / 100;
    meters.push({ meter: `contrast:${p.fgToken}/on/${p.bgToken}`, value: ratio, pass: ratio >= 4.5 });
  }

  // 4. Card budget: count card-like blocks against the IR's declared budget.
  const cardCount = (html.match(/data-card/g) ?? []).length;
  meters.push({ meter: 'card_budget', value: { cards: cardCount, budget: ir.card_budget }, pass: cardCount <= ir.card_budget });

  // 5. Primary action reachable in the hero (first-viewport usefulness — Sean's bar).
  const heroBlock = html.split(/data-zone="(?!hero)/)[0];
  meters.push({ meter: 'cta_in_hero', value: /data-cta/.test(heroBlock), pass: /data-cta/.test(heroBlock) });

  // 6. Anti-spec honor: each IR anti_spec names a banned marker that must be ABSENT.
  for (const anti of ir.anti_specs) {
    if (!anti.marker) continue; // prose anti-specs are checked at S2's fingerprint tier
    const hit = html.includes(anti.marker);
    meters.push({ meter: `anti_spec:${anti.marker}`, value: hit, pass: !hit });
  }

  // 7. Slop-fingerprint scan (S1 seed of the S2 denylist): three identical
  //    sibling cards in the hero is the canonical template tell.
  const tripleCard = /(<div[^>]*data-card[^>]*>[\s\S]{0,400}?){3,}/.test(heroBlock);
  meters.push({ meter: 'slop:hero_triple_card', value: tripleCard, pass: !tripleCard });

  return meters;
}

/**
 * Browser lane (S3): convert a capture manifest into deterministic meters.
 * Per-viewport: overflow, tap targets (375 is the one that bites), CTA within
 * the first viewport at 375, REAL computed-style contrast (resolves the full
 * CSS var/ancestor chain — supersedes the static token-fallback approximation),
 * and minimum computed font size.
 */
export function browserMeters(cap) {
  const meters = [];
  for (const r of cap.viewports) {
    const w = r.viewport.width;
    meters.push({ meter: `browser:overflow@${w}`, value: { scrollWidth: r.scrollWidth, innerWidth: r.innerWidth }, pass: !r.overflow });
    meters.push({ meter: `browser:computed_contrast@${w}`, value: r.contrastFails, pass: r.contrastFails.length === 0 });
    // S5: a material plate that never decoded fails the run. Only asserted when
    // the page declares plates at all, so type_data surfaces are unaffected.
    if (r.plateCount) {
      meters.push({ meter: `browser:plates_loaded@${w}`, value: { declared: r.plateCount, failed: r.plateFails }, pass: r.plateFails.length === 0 });
    }
    if (w <= 480) {
      meters.push({ meter: `browser:tap_targets@${w}`, value: r.tapFails, pass: r.tapFails.length === 0 });
      meters.push({ meter: `browser:cta_fold@${w}`, value: r.ctaTop, pass: r.ctaInFold });
      meters.push({ meter: `browser:min_font@${w}`, value: r.minFont, pass: r.minFont === null || r.minFont >= 12 });
    }
  }
  return meters;
}

/**
 * Full deterministic inspection: static meters + the browser lane.
 * Degradation policy (blueprint §1.6): explicit config skip is RECORDED and
 * allowed; an unavailable browser while required FAILS the meter — silent
 * scope-cut is receipts theater.
 */
export async function inspectAll(ctx, render) {
  const html = readFileSync(render.html_path, 'utf8');
  const meters = inspectHtml(html, ctx.artifacts.ir);

  // S5 fail-closed: every plate the gated MATERIAL plan declared must be present
  // in the file actually on disk. Measured against the PLAN, not against the
  // DOM's own claims — a page that dropped its plates would otherwise report
  // zero plates and zero plate failures, which reads as success.
  const declared = (ctx.artifacts.materials?.slots ?? []).filter((s) => s.plate === true).map((s) => s.crop_id);
  if (declared.length) {
    const inDom = new Set([...html.matchAll(/data-plate-crop="([^"]+)"/g)].map((m) => m[1]));
    const missing = declared.filter((c) => !inDom.has(c));
    meters.push({ meter: 'plates_declared_vs_rendered', value: { declared: declared.length, missing }, pass: missing.length === 0 });
  }
  let screenshots = null;

  if (ctx.browserInspect === false) {
    meters.push({ meter: 'browser_lane', value: 'skipped:config', pass: true });
  } else {
    const { captureAndMeasure } = await import('../capture.mjs');
    const capFn = ctx.captureFn ?? captureAndMeasure;
    const cap = await capFn(render.html_path, join(ctx.runDir, 'screenshots'));
    if (!cap.available) {
      meters.push({ meter: 'browser_lane', value: `unavailable: ${cap.reason}`, pass: false });
    } else {
      meters.push(...browserMeters(cap));
      screenshots = cap.viewports.map((r) => r.shots);
    }
  }
  return { meters, screenshots };
}

export async function inspectStage(ctx) {
  const render = ctx.artifacts.revise ?? ctx.artifacts.render;
  const { meters, screenshots } = await inspectAll(ctx, render);
  return { render_id: render.render_id, meters, screenshots };
}

export { TOKENS };
