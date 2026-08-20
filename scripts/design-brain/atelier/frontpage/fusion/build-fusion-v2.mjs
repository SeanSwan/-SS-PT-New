#!/usr/bin/env node
/**
 * build-fusion-v2.mjs — the three fusions refactored against three reference sites.
 *
 * Sean 2026-08-20 gave three Mobbin references and asked which ideas we are NOT
 * using. Verified visually via the Mobbin MCP: Shopify Editions and Busy Bee Honey.
 * "Shader" could not be located on Mobbin — the closest verified shader-family
 * artefact was Framer's Liquid Gradient panel (seed/speed/scale/amplitude/
 * frequency/definition/bands/noise), used as the substitute and labelled as such
 * in-artboard. Nothing here is invented from a slug.
 *
 * Borrowed, one cluster per board so the three stay genuinely different:
 *
 *   F1 THE HARBOR EDITION  <- Shopify Editions
 *      persistent Roman-numeral chapter index (I-VI) · edition masthead ·
 *      glass title panel floating over full-bleed art · numbered callouts on
 *      the proof object
 *
 *   F2 THE FLIGHT PATH     <- Busy Bee Honey
 *      one continuous dashed path threading every section with the swan
 *      travelling it (this is the fix for F2's named weakness: no rail = no
 *      map) · trace-your-session provenance · labelled waypoint cards ·
 *      giant footer wordmark · loader-as-content
 *
 *   F3 THE LIQUID MILE     <- shader family (Framer Liquid Gradient)
 *      the harbour->mile transform expressed as ONE parametrised field with
 *      its controls made visible · chrome display type
 *
 * Everything the kill pass fixed is still asserted by gate-fusion-v2.mjs:
 * Sean's header byte-identical, real Swans.mp4 frame hero, >=2 MiniMax H3 movie
 * areas, depth between chapters, copy verbatim, real plates + crystalline mark.
 */

import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const parent = path.join(here, '..');

const copy = JSON.parse(fs.readFileSync(path.join(parent, 'copy-pack.json'), 'utf8'));
const V = copy.verbatim, C = copy.creative;

const B1 = fs.readFileSync(path.join(here, '_src_B1.html'), 'utf8');
const HEADER = B1.slice(B1.indexOf('<header'), B1.indexOf('</header>') + '</header>'.length);
if (!/swan-logo\.png/.test(HEADER)) throw new Error('header lost the crystalline mark');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const NEW = ' <span style="font-size:10px;letter-spacing:0.06em;color:#C6A84B;">[new copy - needs Sean approval]</span>';

const T = {
  ink: '#06090F', deep: '#0A1430', sapphire: '#002060', ice: '#60C0F0',
  purple: '#8B5CF6', gold: '#C6A84B', frost: '#E0ECF4', dim: '#B9CBDC', rule: '#5A93D822',
};
const P = {
  harbor: 'social-hero-bg.jpg', water: 'hero-swan-bg.jpg', crystal: 'features-swan-bg.jpg',
  night: 'beyond-the-gym-bg.jpg', proof: 'video-library-bg.jpg', mile: 'store-hero-bg.jpg',
  about: 'about-hero-bg.jpg', testim: 'testimonials-swan-bg.jpg', golf: 'golf-section-bg.jpg',
};
const SWANS = 'swans-hero-frame.jpg', SWANS_B = 'swans-frame-b.jpg';
const CHAPTERS = ['THE WORLD', 'MANIFESTO', 'MAKE', 'THE PROOF', 'THE FORK', 'FOOTER'];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

const stage = (layers, h, bg) => `
    <div style="position:relative;height:${h}px;overflow:hidden;background:${bg};
      perspective:1000px;perspective-origin:50% 50%;transform-style:preserve-3d;">
      ${layers.join('\n      ')}
    </div>`;
const layer = (z, inner, extra = '') => `<div style="position:absolute;inset:0;
        transform:translateZ(${z}px) scale(${(1 - z / 1000).toFixed(3)});${extra}">${inner}</div>`;
const plate = (z, f, o, extra = '') =>
  layer(z, `<img src="${f}" alt="" style="width:100%;height:100%;object-fit:cover;opacity:${o};display:block;">`, extra);

const movieSlot = (n, title, brief, secs, art) => `
  <section style="padding:0 56px 14px;">
    <div style="position:relative;border:1px solid ${T.rule};border-radius:14px;overflow:hidden;
      background:linear-gradient(180deg,#0A1430,#06090F);min-height:300px;display:flex;
      flex-direction:column;justify-content:flex-end;padding:26px;">
      <img src="${art}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.30;">
      <div style="position:relative;display:flex;flex-direction:column;gap:8px;">
        <div style="font-size:10px;letter-spacing:0.24em;color:${T.gold};">MOVIE AREA ${n} &middot; MINIMAX H3</div>
        <div style="font-size:26px;font-weight:700;">${esc(title)}</div>
        <div style="font-size:14px;line-height:1.6;color:${T.dim};max-width:62ch;">${esc(brief)}</div>
        <div style="font-size:11px;letter-spacing:0.14em;color:#8FA8C8;">TARGET ${secs}s &middot; SWAPPABLE SLOT</div>
      </div>
    </div>
  </section>`;

const heroBadge = `<div style="position:absolute;left:18px;bottom:14px;font-size:10px;letter-spacing:0.2em;
        color:${T.gold};background:rgba(6,9,15,0.66);padding:6px 10px;border-radius:6px;">
        SWANS.MP4 &middot; REAL FRAME &middot; SWAPPABLE SLOT</div>`;

const ctas = (glow = 'rgba(139,92,246,0.40)') => `
        <div style="display:flex;gap:14px;flex-wrap:wrap;">
          <a href="#join" style="display:inline-flex;align-items:center;min-height:48px;padding:0 30px;border-radius:10px;
            background:${T.sapphire};color:${T.frost};text-decoration:none;font-weight:700;box-shadow:0 0 26px ${glow};">${esc(V.cta_primary)}</a>
          <a href="#trainers" style="display:inline-flex;align-items:center;min-height:48px;padding:0 26px;border-radius:10px;
            border:1px solid #60C0F066;color:${T.frost};text-decoration:none;font-weight:600;">${esc(V.cta_secondary)}</a>
        </div>`;

const manifesto = (a, num = 'II') => `
  <section style="padding:78px 56px;background:${T.ink};">
    <div style="display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:28px;">
      <div style="grid-column:span 2;font-size:12px;letter-spacing:0.22em;color:${a};">${num}<br>MANIFESTO</div>
      <div style="grid-column:span 10;display:flex;flex-direction:column;gap:20px;">
        <p style="margin:0;font-size:25px;line-height:1.5;font-weight:500;">${esc(V.mission_1)}</p>
        <p style="margin:0;font-size:18px;line-height:1.65;color:${T.dim};max-width:62ch;">${esc(V.mission_2)}</p>
        <p style="margin:0;font-size:18px;line-height:1.65;color:${T.dim};max-width:62ch;">${esc(V.mission_3)}</p>
        <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:29px;
          line-height:1.35;color:${T.gold};">${esc(V.mission_closing)}</p>
      </div>
    </div>
  </section>`;

const creative = (a, num = 'III') => {
  const items = [[C.dance_title, C.dance_desc], [C.art_title, C.art_desc],
                 [C.vocal_title, C.vocal_desc], [C.community_title, C.community_desc]];
  return `
  <section style="padding:70px 56px;background:${T.deep};">
    <div style="font-size:12px;letter-spacing:0.22em;color:${a};margin-bottom:14px;">${num} &middot; MAKE</div>
    <h2 style="font-size:34px;font-weight:700;margin-bottom:26px;">Everything a person makes${NEW}</h2>
    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;">
      ${items.map(([t, d]) => `<div style="border:1px solid ${T.rule};border-radius:12px;padding:18px;
        background:linear-gradient(180deg,rgba(0,32,96,0.35),rgba(6,9,15,0.5));display:flex;flex-direction:column;gap:8px;">
        <div style="font-size:15px;font-weight:700;">${esc(t)}</div>
        <div style="font-size:13px;line-height:1.55;color:${T.dim};">${esc(d)}</div></div>`).join('\n      ')}
    </div>
  </section>`;
};

/* ── BORROWED · Busy Bee: split dark-editorial / light-product fork ─────────── */
const fork = (a, glow) => `
  <section id="join" style="padding:0;background:${T.ink};display:grid;grid-template-columns:1fr 1fr;min-height:520px;">
    <div style="padding:74px 48px;display:flex;flex-direction:column;justify-content:center;gap:16px;">
      <div style="font-size:11px;letter-spacing:0.24em;color:${a};">V &middot; IF YOU TRAIN</div>
      <h2 style="font-size:38px;font-weight:800;">${esc(V.cta_title)}</h2>
      <p style="font-size:16px;line-height:1.7;color:${T.dim};max-width:46ch;margin:0;">${esc(V.cta_body)}</p>
      ${ctas(glow)}
    </div>
    <div id="trainers" style="position:relative;padding:74px 48px;display:flex;flex-direction:column;
      justify-content:center;gap:14px;background:linear-gradient(180deg,#0E1A38,#0A1430);border-left:1px solid ${T.rule};">
      <img src="${P.golf}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.16;">
      <div style="position:relative;font-size:11px;letter-spacing:0.24em;color:${a};">IF YOU ARE A TRAINER OR A CREATOR</div>
      <h2 style="position:relative;font-size:30px;font-weight:800;">Keep your clients. Keep your rate.${NEW}</h2>
      <p style="position:relative;font-size:15px;line-height:1.65;color:${T.dim};max-width:44ch;margin:0;">A capped platform fee, never a cut of who you are. Your record travels with you.${NEW}</p>
      <a href="#" style="position:relative;display:inline-flex;align-items:center;align-self:flex-start;min-height:48px;
        padding:0 26px;border-radius:10px;background:${T.purple};color:#0A0A0F;text-decoration:none;font-weight:700;
        box-shadow:0 0 26px rgba(96,192,240,0.42);">${esc(V.cta_secondary)}</a>
    </div>
  </section>`;

/* ── BORROWED · Busy Bee: the giant footer wordmark ─────────────────────────── */
const giantWordmark = (bg, fg) => `
  <section style="background:${bg};padding:30px 40px 26px;">
    <div style="display:flex;gap:26px;flex-wrap:wrap;font-size:10px;letter-spacing:0.16em;color:${fg}AA;margin-bottom:10px;">
      ${['HOME', 'STORE', 'VIDEO LIBRARY', 'WAIVER', 'CONTACT', 'PHOTOGRAPHY', 'ABOUT'].map((l) => `<span>${l}</span>`).join('')}
    </div>
    <div style="font-size:96px;line-height:0.9;font-weight:800;letter-spacing:-0.03em;color:${fg};white-space:nowrap;">SWANSTUDIOS</div>
  </section>`;

const shell = (accent, body) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>
    body { margin:0; font-family:'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif; background:${T.ink}; }
    a { color:${T.ice}; } a:hover { color:${T.frost}; }
    h1,h2 { text-wrap:balance; margin:0; }
    @media (prefers-reduced-motion: reduce) { * { animation:none !important; transition:none !important; } }
  </style>
</helmet>
<div style="width:1280px;background:${T.ink};color:${T.frost};">
${HEADER}
${body}
</div>
</x-dc>
<script data-dc-script data-props='{"accent":{"editor":"color","default":"${accent}","options":["#60C0F0","#C6A84B","#8B5CF6","#E0ECF4"]}}'>
class Component extends DCLogic {
  renderVals() { return { accent: this.props.accent ?? '${accent}' }; }
}
</script>
</body>
</html>
`;

/* ══════════════ F1 · THE HARBOR EDITION  (Shopify Editions DNA) ══════════════ */
function harborEdition() {
  const a = T.ice;
  // BORROWED: the persistent Roman-numeral index, fixed to the viewport corner.
  const index = `
    <div style="position:sticky;top:520px;float:left;margin-left:40px;z-index:20;
      display:flex;flex-direction:column;gap:3px;padding:14px 0;">
      ${CHAPTERS.map((c, i) => `<div style="display:flex;align-items:baseline;gap:12px;">
        <span style="font-size:13px;font-weight:${i === 0 ? 800 : 500};color:${i === 0 ? T.frost : '#8FA8C8'};
          letter-spacing:0.02em;">${c}</span>
        <span style="font-family:'Cormorant Garamond',Georgia,serif;font-size:11px;color:${i === 0 ? T.gold : '#5A93D8'};">${ROMAN[i]}</span>
      </div>`).join('\n      ')}
    </div>`;

  // BORROWED: full-bleed artwork + a translucent glass panel holding the masthead.
  const hero = `
  <section style="position:relative;">
    ${stage([
      plate(-280, P.water, '0.66'),
      plate(-170, P.harbor, '0.34', 'mix-blend-mode:screen;'),
      layer(-80, `<div style="position:absolute;inset:0;background:radial-gradient(110% 70% at 50% 100%,
        rgba(198,168,75,0.16),rgba(0,32,96,0) 62%);"></div>`),
      layer(-20, `<img src="${SWANS}" alt="the swans, from Sean's own film" style="width:100%;height:100%;object-fit:cover;opacity:0.80;">${heroBadge}`),
      layer(0, `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,9,15,0.06),rgba(6,9,15,0.80));"></div>`),
    ], 780, T.deep)}
    <div style="position:absolute;inset:0;display:flex;align-items:center;padding:0 56px;">
      <div style="width:470px;border:1px solid rgba(224,236,244,0.22);background:rgba(10,20,48,0.42);
        backdrop-filter:blur(14px) saturate(1.5);-webkit-backdrop-filter:blur(14px) saturate(1.5);
        padding:30px;display:flex;flex-direction:column;gap:16px;">
        <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:31px;line-height:1.05;">The Harbor<br>Edition</div>
        <div style="height:1px;background:${T.rule};"></div>
        <h1 style="font-size:36px;line-height:1.06;font-weight:800;letter-spacing:-0.02em;">${esc(V.headline)}</h1>
        <p style="font-size:16px;line-height:1.55;color:#D6E4F0;margin:0;">${esc(V.sub)}</p>
        <div style="display:flex;flex-direction:column;gap:2px;padding-top:4px;">
          ${CHAPTERS.map((c, i) => `<div style="display:flex;justify-content:space-between;font-size:12px;color:#A9BDD4;">
            <span>${c}</span><span style="font-family:'Cormorant Garamond',Georgia,serif;color:#5A93D8;">${ROMAN[i]}</span></div>`).join('')}
        </div>
        ${ctas()}
      </div>
    </div>
  </section>`;

  // BORROWED: the product as an object in space with numbered callouts.
  const proof = `
  <section style="padding:60px 56px 10px;background:${T.ink};">
    <div style="font-size:12px;letter-spacing:0.22em;color:${a};">IV &middot; THE PROOF</div>
    <h2 style="font-size:32px;font-weight:700;margin:10px 0 20px;">Swan Coach builds it with your trainer${NEW}</h2>
    ${stage([
      plate(-220, P.proof, '0.30'),
      layer(-120, `<div style="position:absolute;inset:0;background:linear-gradient(120deg,rgba(0,32,96,0.55),rgba(6,9,15,0.15));"></div>`),
      layer(-40, `<div style="position:absolute;left:60px;top:44px;width:430px;border:1px solid ${T.rule};border-radius:12px;
        background:rgba(6,9,15,0.86);padding:18px;transform:rotate(-1.6deg);">
        <div style="font-size:11px;letter-spacing:0.18em;color:${T.ice};">PLAN VS ACTUAL</div>
        <div style="display:flex;align-items:flex-end;gap:5px;height:96px;margin-top:12px;">
          ${[38, 52, 46, 64, 58, 74, 69, 86, 79, 94].map((h) => `<div style="flex:1;height:${h}%;border-radius:2px;
            background:linear-gradient(180deg,${T.ice},rgba(96,192,240,0.18));"></div>`).join('')}
        </div></div>`),
      layer(-10, `<div style="position:absolute;right:70px;top:96px;width:300px;border:1px solid ${T.rule};border-radius:12px;
        background:rgba(10,20,48,0.92);padding:16px;transform:rotate(1.2deg);">
        <div style="font-size:11px;letter-spacing:0.18em;color:${T.gold};">TRAINER ECONOMICS</div>
        <div style="font-size:14px;line-height:1.55;color:${T.dim};margin-top:8px;">A capped platform fee. Your rate stays your rate.${NEW}</div></div>`),
      layer(0, `${[[40, 60, '1'], [500, 40, '2'], [740, 150, '3']].map(([l, t, n]) => `
        <div style="position:absolute;left:${l}px;top:${t}px;width:26px;height:26px;border-radius:50%;
          border:1px solid ${T.gold};color:${T.gold};display:flex;align-items:center;justify-content:center;
          font-size:12px;font-weight:700;background:rgba(6,9,15,0.72);">${n}</div>`).join('')}`),
    ], 300, T.deep)}
    <div style="display:flex;gap:26px;margin-top:12px;font-size:12px;color:#8FA8C8;">
      <span><b style="color:${T.gold};">1</b> the plan your trainer set</span>
      <span><b style="color:${T.gold};">2</b> what you actually logged</span>
      <span><b style="color:${T.gold};">3</b> what it pays your trainer</span>
    </div>
  </section>`;

  // Depth BETWEEN chapters (Sean's instruction 2). From the index you keep
  // glimpsing the water through the buildings — each glimpse its own stage.
  const glimpse = (label, art, tint) => `
  <section style="position:relative;">
    ${stage([
      plate(-230, art, '0.36'),
      plate(-130, P.water, '0.24', 'mix-blend-mode:screen;'),
      layer(-60, `<div style="position:absolute;inset:0;background:${tint};"></div>`),
      layer(0, `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,9,15,0.30),rgba(6,9,15,0.86));"></div>`),
    ], 240, T.deep)}
    <div style="position:absolute;left:56px;bottom:18px;font-size:10px;letter-spacing:0.24em;color:${T.gold};">${label}</div>
  </section>`;

  return shell(a, [
    hero, index,
    glimpse('BETWEEN &middot; THE WATER IS STILL THERE', P.harbor, 'linear-gradient(180deg,rgba(0,32,96,0.34),rgba(6,9,15,0))'),
    manifesto(a),
    glimpse('BETWEEN &middot; LIGHTS ACROSS THE BASIN', P.testim, 'linear-gradient(180deg,rgba(96,192,240,0.14),rgba(6,9,15,0))'),
    creative(a),
    movieSlot(1, 'The Harbor at Night', 'Slow push across still water toward a shoreline of lit windows; each window is somebody finishing a set. Ends on one window going bright.', 12, SWANS_B),
    proof,
    movieSlot(2, 'One Session End to End', 'A single session compressed: arrival, the work, the logged record forming as a faceted crystal. No dialogue.', 20, P.night),
    fork(a, 'rgba(139,92,246,0.40)'),
    giantWordmark(T.deep, T.frost),
  ].join('\n'));
}

/* ══════════════ F2 · THE FLIGHT PATH  (Busy Bee Honey DNA) ═══════════════════ */
function flightPath() {
  const a = T.gold;
  // BORROWED (the big one): ONE continuous dashed path threading the page, with
  // the swan travelling it. This IS the map — the answer to F2's "no rail" flaw.
  const thread = (h, d, markAt) => `
    <svg viewBox="0 0 1280 ${h}" width="1280" height="${h}" style="position:absolute;inset:0;pointer-events:none;" aria-hidden="true">
      <path d="${d}" fill="none" stroke="${T.gold}" stroke-width="1.4" stroke-dasharray="7 9" opacity="0.75"/>
      ${markAt ? `<circle cx="${markAt[0]}" cy="${markAt[1]}" r="5" fill="${T.gold}"/>` : ''}
    </svg>`;

  const waypoint = (n, label) => `
    <div style="display:flex;align-items:center;gap:9px;">
      <span style="width:20px;height:20px;border-radius:50%;border:1px dashed ${T.gold};color:${T.gold};
        font-size:10px;display:flex;align-items:center;justify-content:center;">${n}</span>
      <span style="font-size:10px;letter-spacing:0.2em;color:#8FA8C8;">${label}</span>
    </div>`;

  // BORROWED: the loader as content — a stated waypoint, not a spinner.
  const loader = `
  <section style="position:relative;background:${T.deep};padding:26px 56px;border-bottom:1px solid ${T.rule};overflow:hidden;">
    ${thread(90, 'M 0 62 C 220 20, 430 96, 660 52 S 1080 18, 1280 64', [660, 52])}
    <div style="position:relative;display:flex;align-items:center;justify-content:space-between;">
      <div style="font-size:10px;letter-spacing:0.26em;color:${T.gold};">FOLLOWING THE FLIGHT&hellip;${NEW}</div>
      <div style="display:flex;gap:22px;">${CHAPTERS.slice(0, 5).map((c, i) => waypoint(i + 1, c)).join('')}</div>
      <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:20px;color:${T.frost};">0%</div>
    </div>
  </section>`;

  const hero = `
  <section style="position:relative;">
    ${stage([
      plate(-280, P.water, '0.60'),
      plate(-160, P.testim, '0.26', 'mix-blend-mode:screen;'),
      layer(-60, `<img src="${SWANS}" alt="the swans, from Sean's own film" style="width:100%;height:100%;object-fit:cover;opacity:0.78;">${heroBadge}`),
      layer(0, `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,9,15,0.08),rgba(6,9,15,0.84));"></div>`),
    ], 700, T.deep)}
    ${thread(700, 'M -20 250 C 260 120, 520 380, 780 250 S 1180 120, 1300 300', [780, 250])}
    <div style="position:absolute;inset:0;display:grid;grid-template-columns:7fr 5fr;">
      <div style="display:flex;flex-direction:column;justify-content:center;gap:16px;padding:0 56px;">
        <div style="font-size:11px;letter-spacing:0.30em;color:${a};">SWANSTUDIOS &middot; THE FLIGHT PATH</div>
        <h1 style="font-size:58px;line-height:1.02;font-weight:800;letter-spacing:-0.02em;">${esc(V.headline)}</h1>
        <p style="font-size:20px;line-height:1.5;color:#D6E4F0;max-width:42ch;font-weight:500;">${esc(V.sub)}</p>
        ${ctas('rgba(198,168,75,0.34)')}
      </div>
      <div style="display:flex;flex-direction:column;justify-content:center;gap:10px;padding:0 46px 0 0;">
        ${CHAPTERS.map((c, i) => waypoint(i + 1, c)).join('')}
      </div>
    </div>
  </section>`;

  // BORROWED: "trace your honey" -> TRACE YOUR SESSION. Provenance as product.
  const trace = `
  <section style="position:relative;padding:64px 56px 12px;background:${T.ink};">
    ${thread(240, 'M 60 20 C 320 140, 620 -20, 900 120 S 1220 200, 1260 150', [900, 120])}
    <div style="position:relative;">
      <div style="font-size:12px;letter-spacing:0.22em;color:${a};">IV &middot; THE PROOF</div>
      <h2 style="font-size:33px;font-weight:700;margin:10px 0 6px;">Trace your session${NEW}</h2>
      <p style="font-size:15px;line-height:1.65;color:${T.dim};max-width:64ch;margin:0 0 20px;">Peel any logged workout back and the whole record is there: who coached it, what changed, what it paid. Nothing about your training is a black box.${NEW}</p>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;">
        ${[['THE SESSION', P.crystal, 'What was planned, and what you actually did.'],
           ['THE COACH', P.about, 'Who set it, what they changed, and why.'],
           ['THE RECORD', P.proof, 'Where it went, and what it paid your trainer.']]
          .map(([t, img, d]) => `<div style="border:1px solid ${T.rule};border-radius:12px;overflow:hidden;background:rgba(10,20,48,0.55);">
            <img src="${img}" alt="" style="width:100%;height:104px;object-fit:cover;opacity:0.62;display:block;">
            <div style="padding:14px;"><div style="font-size:10px;letter-spacing:0.2em;color:${a};">${t}</div>
              <div style="font-size:13px;line-height:1.55;color:${T.dim};margin-top:6px;">${esc(d)}${NEW}</div></div></div>`).join('\n        ')}
      </div>
    </div>
  </section>`;

  // Depth BETWEEN chapters — the path crosses open ground between waypoints,
  // and the ground has layers the swan flies over.
  const crossing = (n, label, art, d) => `
  <section style="position:relative;">
    ${stage([
      plate(-240, art, String(0.32 + n * 0.08)),
      plate(-140, P.water, '0.20', 'mix-blend-mode:screen;'),
      layer(-70, `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(198,168,75,0.12),rgba(6,9,15,0));"></div>`),
      layer(0, `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,9,15,0.28),rgba(6,9,15,0.88));"></div>`),
    ], 250, T.ink)}
    ${thread(250, d, null)}
    <div style="position:absolute;left:56px;bottom:18px;font-size:10px;letter-spacing:0.24em;color:${T.gold};">${label}</div>
  </section>`;

  return shell(a, [
    loader, hero,
    crossing(0, 'CROSSING &middot; OPEN WATER', P.harbor, 'M -20 190 C 300 60, 620 240, 940 110 S 1240 40, 1300 130'),
    manifesto(a),
    crossing(1, 'CROSSING &middot; INTO THE LIGHT', P.crystal, 'M -20 90 C 280 220, 600 40, 900 180 S 1220 240, 1300 110'),
    movieSlot(1, 'The Harbor at Night', 'The camera follows one flight path in from open water, the shoreline lighting up window by window beneath it.', 14, SWANS_B),
    creative(a), trace,
    movieSlot(2, 'One Session End to End', 'Arrival, the work, the record forming — the same dashed path threading every cut so the film and the page move as one.', 20, P.night),
    fork(a, 'rgba(198,168,75,0.34)'),
    giantWordmark(T.gold, '#0A0A0F'),
  ].join('\n'));
}

/* ══════════════ F3 · THE SIGNAL  (Shader, Norrköping — verified on Mobbin) ═══
 * Shader's real page: near-black VOLUMETRIC FOG; warm-cream serif display type
 * that GLOWS rather than sits on the dark; a hero OBJECT rendered in 3D inside
 * the haze; instructional microcopy with pointing-hand dingbats ("Scroll to
 * Inspect Our Closed Deals ☞☞"); and ironic institutional chrome — laurel
 * seals, certification emblems, a dashed-border card for the CEO.
 *
 * Swan translation: the swans frame IS the object in the fog. Sean's real
 * credentials become the seals — "26+ years", "NASM-protocol", NEVER
 * "NASM-certified" (a standing brand rule, and a legal one).
 */
function shaderSignal() {
  const a = T.gold;
  const cream = '#F2E8D5';

  const glow = (size, text) => `<h1 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:${size}px;
        line-height:1.04;font-weight:600;color:${cream};margin:0;max-width:16ch;
        text-shadow:0 0 22px rgba(242,232,213,0.42), 0 0 60px rgba(198,168,75,0.30), 0 0 120px rgba(96,192,240,0.16);">${text}</h1>`;

  const fog = (h, art, density) => stage([
    plate(-260, art, String(0.32 + density * 0.12)),
    layer(-150, `<div style="position:absolute;inset:0;background:radial-gradient(70% 60% at 50% 62%,
      rgba(242,232,213,${0.10 + density * 0.05}) 0%, rgba(6,9,15,0) 68%);filter:blur(26px);"></div>`),
    layer(-70, `<div style="position:absolute;inset:0;background:radial-gradient(120% 80% at 20% 90%,
      rgba(139,92,246,0.16), rgba(6,9,15,0) 60%);filter:blur(18px);"></div>`),
    layer(0, `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,9,15,0.40),rgba(6,9,15,0.92));"></div>`),
  ], h, '#07080C');

  // BORROWED: the chrome institutional seal. Sean's REAL credentials, verbatim.
  const seal = (top, bottom) => `
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="font-size:19px;color:${a};opacity:0.85;">&#127807;</span>
      <div style="text-align:center;">
        <div style="font-size:10px;letter-spacing:0.18em;color:${cream};">${top}</div>
        <div style="font-size:9px;letter-spacing:0.14em;color:#9AA9BD;">${bottom}</div>
      </div>
      <span style="font-size:19px;color:${a};opacity:0.85;display:inline-block;transform:scaleX(-1);">&#127807;</span>
    </div>`;

  const hero = `
  <section style="position:relative;">
    ${fog(780, P.water, 1)}
    <div style="position:absolute;inset:0;display:grid;grid-template-columns:6fr 6fr;align-items:center;gap:30px;padding:0 56px;">
      <div style="display:flex;flex-direction:column;gap:19px;">
        <div style="font-size:11px;letter-spacing:0.30em;color:${a};">SWANSTUDIOS &middot; THE SIGNAL</div>
        ${glow(52, esc(V.headline))}
        <p style="font-size:19px;line-height:1.55;color:#D9CDB6;max-width:44ch;margin:0;">${esc(V.sub)}</p>
        ${ctas('rgba(198,168,75,0.34)')}
        <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:15px;color:${cream};opacity:0.9;">
          Scroll to trace one real session &#9758;&#9758;${NEW}</div>
      </div>
      <div style="position:relative;height:100%;display:flex;align-items:center;justify-content:center;">
        <div style="position:relative;width:470px;border:1px solid rgba(242,232,213,0.22);border-radius:10px;
          overflow:hidden;box-shadow:0 0 80px rgba(198,168,75,0.22), 0 40px 90px rgba(0,0,0,0.6);">
          <img src="${SWANS}" alt="the swans, from Sean's own film" style="width:100%;display:block;opacity:0.92;">
          ${heroBadge}
        </div>
      </div>
    </div>
  </section>`;

  const credentials = `
  <section style="position:relative;">
    ${fog(210, P.about, 0)}
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;">
      <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:23px;color:${cream};">Coached by a working trainer, not a brand${NEW}</div>
      <div style="display:flex;gap:44px;flex-wrap:wrap;justify-content:center;">
        ${seal('26+ YEARS', 'IN PRACTICE')}
        ${seal('NASM-PROTOCOL', 'PROGRAMMING')}
        ${seal('FIRST-PARTY', 'TRAINING RECORD')}
      </div>
    </div>
  </section>`;

  // BORROWED: the dashed-border new-business card -> "talk to the trainer".
  const trainerCard = `
  <section style="padding:44px 56px 12px;background:${T.ink};">
    <div style="border:1px dashed rgba(242,232,213,0.40);border-radius:6px;padding:18px;display:grid;
      grid-template-columns:132px 1fr;gap:20px;align-items:center;max-width:720px;">
      <img src="${P.testim}" alt="" style="width:132px;height:104px;object-fit:cover;border-radius:4px;opacity:0.8;">
      <div>
        <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:21px;color:${cream};">Talk to the trainer</div>
        <div style="font-size:14px;line-height:1.6;color:${T.dim};margin-top:5px;">Not a sales team. The person who would actually write your program.${NEW}</div>
      </div>
    </div>
  </section>`;

  const proof = `
  <section style="position:relative;">
    ${fog(330, P.proof, 1)}
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:0 56px;gap:14px;">
      <div style="font-size:11px;letter-spacing:0.26em;color:${a};">IV &middot; THE PROOF</div>
      ${glow(33, 'Swan Coach builds it with your trainer')}
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;max-width:920px;">
        <div style="border:1px solid rgba(242,232,213,0.18);border-radius:10px;padding:16px;background:rgba(6,9,15,0.62);">
          <div style="font-size:10px;letter-spacing:0.2em;color:${T.ice};">HUMAN EVIDENCE</div>
          <div style="font-size:14px;line-height:1.6;color:${T.dim};margin-top:7px;">Every record here was logged by a person who trained today.${NEW}</div>
        </div>
        <div style="border:1px solid rgba(242,232,213,0.18);border-radius:10px;padding:16px;background:rgba(6,9,15,0.62);">
          <div style="font-size:10px;letter-spacing:0.2em;color:${a};">TRAINER ECONOMICS</div>
          <div style="font-size:14px;line-height:1.6;color:${T.dim};margin-top:7px;">A capped platform fee, so a good month is never punished.${NEW}</div>
        </div>
      </div>
    </div>
  </section>`;

  return shell(a, [
    hero, credentials, manifesto(T.ice, 'II'), creative(T.purple, 'III'),
    movieSlot(1, 'The Signal', 'The swans arriving out of fog, lit from behind, the frame held long enough that the light does the work. No cuts.', 16, SWANS_B),
    proof, trainerCard,
    movieSlot(2, 'One Session End to End', 'Arrival, the work, the record forming as a faceted crystal in the same haze the page lives in.', 20, P.night),
    fork(a, 'rgba(198,168,75,0.34)'),
    giantWordmark(T.deep, cream),
  ].join('\n'));
}

const boards = [
  ['Main.dc.html', harborEdition(), 'F1v2 · The Harbor Edition'],
  ['FlightPath.dc.html', flightPath(), 'F2v2 · The Flight Path'],
  ['TheSignal.dc.html', shaderSignal(), 'F3v2 · The Signal'],
];

const W = 1280, H = 4600, GAP = 220;
const artboards = [], annotations = [];
const notes = [
  'F1v2 · THE HARBOR EDITION — borrowed from SHOPIFY EDITIONS.\nThe rail becomes a persistent Roman-numeral index (I–VI). The masthead sits in a glass panel floating over full-bleed art, and it carries the whole table of contents. THE PROOF is now an object in space with numbered callouts — 1 the plan, 2 what you logged, 3 what it pays your trainer.\n\nTRADEOFF: the most editorial and the most "magazine" — it asks a visitor to read a contents page before it sells them anything.',
  'F2v2 · THE FLIGHT PATH — borrowed from BUSY BEE HONEY.\nONE continuous dashed path threads every section with the swan travelling it. That path IS the map, which is the direct fix for F2\'s old flaw (no rail = no map). "Trace your honey" becomes TRACE YOUR SESSION: peel a workout back to the coach, the change, the payout. The loader is content, not a spinner. Giant footer wordmark.\n\nTRADEOFF: the path only pays off if it is genuinely continuous across every breakpoint — a broken thread reads as a bug, not a motif.',
  `F3v2 · THE SIGNAL — borrowed from SHADER (Norrköping). My first search missed it and I substituted Framer's Liquid Gradient; Sean pushed me back to the MCP and the real site turned up.\nShader's actual page is warm-cream serif that GLOWS out of volumetric fog, a hero object rendered inside the haze, instructional microcopy with pointing hands (“Scroll to Inspect Our Closed Deals”), and ironic institutional chrome — laurel seals and a dashed-border card. Here the swans frame IS the object in the fog, and the seals carry Sean's real credentials: 26+ years, NASM-protocol (never “certified”).\n\nTRADEOFF: the warmest and least “tech” of the three — it sells the trainer before the platform, which is right for a stranger and possibly too soft for a trainer evaluating economics.`,
];

boards.forEach(([file, html, title], i) => {
  fs.writeFileSync(path.join(here, file), html, 'utf8');
  const x = i * (W + GAP);
  artboards.push({ file, title, x, y: 0, w: W, h: H });
  annotations.push({ id: `note-v2-f${i + 1}`, x, y: -340, w: 440, text: notes[i] });
});

annotations.push({
  id: 'v2-manifest', x: -520, y: 0, w: 450,
  text: `THREE FUSIONS, REFACTORED AGAINST SEAN'S THREE REFERENCES — 2026-08-20\n\nSean asked which ideas from Shopify Editions, Shader and Busy Bee Honey we were NOT using. Verified visually on Mobbin: Shopify Editions and Busy Bee Honey. Shader could NOT be found — the closest verified shader-family artefact (Framer's Liquid Gradient) was substituted and is labelled as such on F3. Nothing here was invented from a URL slug.\n\nONE reference per board, so the three stay different:\n• F1 <- Shopify Editions (Roman-numeral index, glass masthead, numbered callouts)\n• F2 <- Busy Bee Honey (the continuous flight path, trace-your-session, loader-as-content, giant wordmark)\n• F3 <- shader family (one parametrised field, controls visible, chrome type)\n\nSTILL SHARED, UNCHANGED:\n• Sean's header, lifted BYTE-IDENTICALLY from the approved B1 source\n• hero = a real frame from his own Swans.mp4, badged swappable\n• 2 MiniMax H3 movie areas per board\n• parallax depth between chapters, not only in the hero\n• copy verbatim; gold tags mark lines needing approval\n• real harvested plates + the real crystalline mark`,
});

fs.writeFileSync(path.join(here, 'canvas-v2.json'),
  JSON.stringify({ artboards, annotations, launch: { view: 'canvas' } }, null, 2) + '\n', 'utf8');

console.log(`wrote ${artboards.length} v2 artboards + canvas-v2.json`);
console.log(`header reused verbatim: ${HEADER.length} bytes`);
