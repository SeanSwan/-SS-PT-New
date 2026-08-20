#!/usr/bin/env node
/**
 * build-fusion.mjs — three fusions of B1 (Harbor Lights) + D2 (Vegas Mile).
 *
 * Sean 2026-08-20: "I wanted you to combine b one and d two into one, and that'll
 * be the final one. So go ahead and refactor and make three different versions."
 *
 * The three differ on ONE axis: which parent supplies the ARCHITECTURE and which
 * supplies the LIGHT.
 *
 *   F1 Harbor Mile   B1 architecture (section rail, 4 calm chapters) + D2 light
 *   F2 The Lit Mile  D2 architecture (linear mile, marquee blocks)   + B1 proof
 *   F3 Night Harbor  neither — the page TRANSFORMS from one into the other
 *
 * Non-negotiables carried from the kill pass (each asserted by gate-fusion.mjs):
 *   1. Sean's header is reused BYTE-IDENTICALLY from the approved B1 source.
 *      Not retyped. "they need to adapt to what I already have."
 *   2. Parallax depth stages between chapters, not only in the hero.
 *   3. >= 2 movie areas per board for films he will make with MiniMax H3.
 *   4. Hero is a real frame from his own Swans.mp4, badged as a swappable slot.
 *   5. Copy verbatim from copy-pack.json; new lines carry the approval tag.
 *   6. Real harvested plates + the real low-poly crystalline mark (asset-harvest).
 */

import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const parent = path.join(here, '..');

const copy = JSON.parse(fs.readFileSync(path.join(parent, 'copy-pack.json'), 'utf8'));
const V = copy.verbatim;
const C = copy.creative;

const B1 = fs.readFileSync(path.join(here, '_src_B1.html'), 'utf8');

// ---- Sean's header, lifted verbatim. Rule 1: never retype what shipped. -------
const h0 = B1.indexOf('<header');
const h1 = B1.indexOf('</header>') + '</header>'.length;
if (h0 < 0 || h1 < h0) throw new Error('header block not found in _src_B1.html');
const HEADER = B1.slice(h0, h1);
if (!/swan-logo\.png/.test(HEADER)) throw new Error('header lost the crystalline mark');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const NEW = ' <span style="font-size:10px;letter-spacing:0.06em;color:#C6A84B;">[new copy - needs Sean approval]</span>';

// Crystalline Swan. Gold (#C6A84B) is an ALLOWLIST, not a palette member (LAW 2).
const T = {
  ink: '#06090F', deep: '#0A1430', sapphire: '#002060',
  ice: '#60C0F0', purple: '#8B5CF6', gold: '#C6A84B',
  frost: '#E0ECF4', dim: '#B9CBDC', rule: '#5A93D822',
};

const PLATES = {
  harbor: 'social-hero-bg.jpg', water: 'hero-swan-bg.jpg', crystal: 'features-swan-bg.jpg',
  night: 'beyond-the-gym-bg.jpg', proof: 'video-library-bg.jpg', mile: 'store-hero-bg.jpg',
  about: 'about-hero-bg.jpg', testim: 'testimonials-swan-bg.jpg',
};
const SWANS = 'swans-hero-frame.jpg';
const SWANS_B = 'swans-frame-b.jpg';

/** A parallax stage: perspective ancestor + N translateZ layers that must move. */
const stage = (layers, h, bg) => `
    <div style="position:relative;height:${h}px;overflow:hidden;background:${bg};
      perspective:1000px;perspective-origin:50% 50%;transform-style:preserve-3d;">
      ${layers.join('\n      ')}
    </div>`;

const layer = (z, inner, extra = '') => `<div style="position:absolute;inset:0;
        transform:translateZ(${z}px) scale(${(1 - z / 1000).toFixed(3)});${extra}">${inner}</div>`;

const plateLayer = (z, file, opacity, extra = '') =>
  layer(z, `<img src="${file}" alt="" style="width:100%;height:100%;object-fit:cover;opacity:${opacity};display:block;">`, extra);

const movieSlot = (n, title, brief, secs) => `
  <section style="padding:0 56px 12px;">
    <div style="position:relative;border:1px solid ${T.rule};border-radius:14px;overflow:hidden;
      background:linear-gradient(180deg,#0A1430 0%,#06090F 100%);min-height:300px;
      display:flex;flex-direction:column;justify-content:flex-end;padding:26px;">
      <img src="${n === 1 ? SWANS_B : PLATES.night}" alt="" style="position:absolute;inset:0;
        width:100%;height:100%;object-fit:cover;opacity:0.30;">
      <div style="position:relative;display:flex;flex-direction:column;gap:8px;">
        <div style="font-size:10px;letter-spacing:0.24em;color:${T.gold};">MOVIE AREA ${n} &middot; MINIMAX H3</div>
        <div style="font-size:26px;font-weight:700;color:${T.frost};">${esc(title)}</div>
        <div style="font-size:14px;line-height:1.6;color:${T.dim};max-width:62ch;">${esc(brief)}</div>
        <div style="font-size:11px;letter-spacing:0.14em;color:#8FA8C8;">TARGET ${secs}s &middot; SWAPPABLE SLOT</div>
      </div>
    </div>
  </section>`;

const heroSlotBadge = `<div style="position:absolute;left:18px;bottom:14px;font-size:10px;
        letter-spacing:0.2em;color:${T.gold};background:rgba(6,9,15,0.66);padding:6px 10px;border-radius:6px;">
        SWANS.MP4 &middot; REAL FRAME &middot; SWAPPABLE SLOT</div>`;

const ctas = `
        <div style="display:flex;gap:14px;flex-wrap:wrap;">
          <a href="#join" style="display:inline-flex;align-items:center;min-height:48px;padding:0 30px;
            border-radius:10px;background:${T.sapphire};color:${T.frost};text-decoration:none;font-weight:700;
            box-shadow:0 0 26px rgba(139,92,246,0.40);">${esc(V.cta_primary)}</a>
          <a href="#trainers" style="display:inline-flex;align-items:center;min-height:48px;padding:0 26px;
            border-radius:10px;border:1px solid #60C0F066;color:${T.frost};text-decoration:none;font-weight:600;">${esc(V.cta_secondary)}</a>
        </div>`;

const manifesto = (accent) => `
  <section style="padding:78px 56px;background:${T.ink};">
    <div style="display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:28px;">
      <div style="grid-column:span 2;font-size:12px;letter-spacing:0.22em;color:${accent};">02<br>MANIFESTO</div>
      <div style="grid-column:span 10;display:flex;flex-direction:column;gap:20px;">
        <p style="margin:0;font-size:25px;line-height:1.5;color:${T.frost};font-weight:500;">${esc(V.mission_1)}</p>
        <p style="margin:0;font-size:18px;line-height:1.65;color:${T.dim};max-width:62ch;">${esc(V.mission_2)}</p>
        <p style="margin:0;font-size:18px;line-height:1.65;color:${T.dim};max-width:62ch;">${esc(V.mission_3)}</p>
        <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;
          font-size:29px;line-height:1.35;color:${T.gold};">${esc(V.mission_closing)}</p>
      </div>
    </div>
  </section>`;

const creative = (accent) => {
  const items = [
    [C.dance_title, C.dance_desc], [C.art_title, C.art_desc],
    [C.vocal_title, C.vocal_desc], [C.community_title, C.community_desc],
  ];
  return `
  <section style="padding:70px 56px;background:${T.deep};">
    <div style="font-size:12px;letter-spacing:0.22em;color:${accent};margin-bottom:14px;">03 &middot; MAKE</div>
    <h2 style="font-size:34px;font-weight:700;color:${T.frost};margin-bottom:26px;">Everything a person makes${NEW}</h2>
    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;">
      ${items.map(([t, d]) => `<div style="border:1px solid ${T.rule};border-radius:12px;padding:18px;
        background:linear-gradient(180deg,rgba(0,32,96,0.35),rgba(6,9,15,0.5));display:flex;flex-direction:column;gap:8px;">
        <div style="font-size:15px;font-weight:700;color:${T.frost};">${esc(t)}</div>
        <div style="font-size:13px;line-height:1.55;color:${T.dim};">${esc(d)}</div>
      </div>`).join('\n      ')}
    </div>
  </section>`;
};

const fork = (accent) => `
  <section id="join" style="padding:80px 56px 96px;background:${T.ink};">
    <h2 style="font-size:38px;font-weight:800;color:${T.frost};margin-bottom:14px;">${esc(V.cta_title)}</h2>
    <p style="font-size:17px;line-height:1.7;color:${T.dim};max-width:70ch;margin:0 0 26px;">${esc(V.cta_body)}</p>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;">
      <div style="border:1px solid ${T.rule};border-radius:14px;padding:24px;background:rgba(0,32,96,0.30);">
        <div style="font-size:11px;letter-spacing:0.2em;color:${accent};margin-bottom:10px;">IF YOU TRAIN</div>
        ${ctas}
      </div>
      <div id="trainers" style="border:1px solid ${T.rule};border-radius:14px;padding:24px;background:rgba(139,92,246,0.12);">
        <div style="font-size:11px;letter-spacing:0.2em;color:${accent};margin-bottom:10px;">IF YOU ARE A TRAINER OR A CREATOR</div>
        <p style="font-size:14px;line-height:1.6;color:${T.dim};margin:0 0 14px;">Keep your clients, your record and your rate. A capped platform fee, never a cut of who you are.${NEW}</p>
        <a href="#" style="display:inline-flex;align-items:center;min-height:48px;padding:0 26px;border-radius:10px;
          background:${T.purple};color:#0A0A0F;text-decoration:none;font-weight:700;box-shadow:0 0 26px rgba(96,192,240,0.42);">Find a Trainer</a>
      </div>
    </div>
  </section>`;

const shell = (title, accent, body) => `<!doctype html>
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

// ─────────────────────────────── F1 · HARBOR MILE ────────────────────────────
// B1's calm architecture (section rail, four chapters) wearing D2's light.
// The rail becomes a lit marquee strip: the wayfinding IS the neon.
function harborMile() {
  const a = T.ice;
  const rail = ['WORLD', 'MAKE', 'PROOF', 'JOIN'].map((s, i) => `
        <div style="display:flex;flex-direction:column;align-items:center;gap:7px;">
          <div style="width:11px;height:11px;border-radius:50%;background:${i === 0 ? T.gold : '#1B2A44'};
            box-shadow:${i === 0 ? `0 0 12px ${T.gold}` : 'none'};"></div>
          <div style="writing-mode:vertical-rl;font-size:10px;letter-spacing:0.26em;color:#8FA8C8;">${s}</div>
        </div>`).join('');

  const hero = `
  <section style="position:relative;">
    ${stage([
      plateLayer(-260, PLATES.water, '0.55'),
      plateLayer(-150, PLATES.harbor, '0.40', 'mix-blend-mode:screen;'),
      layer(-70, `<div style="position:absolute;inset:0;background:radial-gradient(120% 70% at 50% 100%,
        rgba(198,168,75,0.20) 0%, rgba(0,32,96,0) 62%);"></div>`),
      layer(-20, `<img src="${SWANS}" alt="the swans, from Sean's own film" style="width:100%;height:100%;
        object-fit:cover;opacity:0.82;">${heroSlotBadge}`),
      layer(0, `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,9,15,0.10) 0%,rgba(6,9,15,0.86) 100%);"></div>`),
    ], 720, T.deep)}
    <div style="position:absolute;inset:0;display:flex;">
      <nav style="width:92px;flex-shrink:0;border-right:1px solid ${T.rule};padding:26px 0;
        display:flex;flex-direction:column;align-items:center;gap:26px;background:rgba(6,9,15,0.35);">
        <div style="font-size:9px;letter-spacing:0.24em;color:${T.gold};writing-mode:vertical-rl;">SECTION RAIL</div>
        ${rail}
      </nav>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:18px;padding:0 56px;">
        <div style="font-size:11px;letter-spacing:0.30em;color:${a};">SWANSTUDIOS &middot; THE HARBOR MILE</div>
        <h1 style="font-size:57px;line-height:1.02;font-weight:800;letter-spacing:-0.02em;">${esc(V.headline)}</h1>
        <p style="font-size:21px;line-height:1.5;color:#D6E4F0;max-width:44ch;font-weight:500;">${esc(V.sub)}</p>
        ${ctas}
      </div>
    </div>
  </section>`;

  const proof = `
  <section style="padding:0 56px 8px;">
    <div style="font-size:12px;letter-spacing:0.22em;color:${a};margin:56px 0 14px;">04 &middot; PROOF</div>
    <h2 style="font-size:32px;font-weight:700;margin-bottom:8px;">Swan Coach builds it with your trainer${NEW}</h2>
    ${stage([
      plateLayer(-200, PLATES.proof, '0.34'),
      layer(-90, `<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,32,96,0.55),rgba(6,9,15,0.1));"></div>`),
      layer(0, `<div style="position:absolute;inset:0;display:grid;grid-template-columns:repeat(2,1fr);gap:18px;padding:26px;">
        <div style="border:1px solid ${T.rule};border-radius:12px;padding:18px;background:rgba(6,9,15,0.62);">
          <div style="font-size:11px;letter-spacing:0.18em;color:${a};">HUMAN EVIDENCE</div>
          <div style="font-size:15px;line-height:1.6;color:${T.dim};margin-top:8px;">Every lit window is one session logged tonight. The skyline brightens because people trained, not because a designer said so.${NEW}</div>
        </div>
        <div style="border:1px solid ${T.rule};border-radius:12px;padding:18px;background:rgba(6,9,15,0.62);">
          <div style="font-size:11px;letter-spacing:0.18em;color:${T.gold};">TRAINER ECONOMICS</div>
          <div style="font-size:15px;line-height:1.6;color:${T.dim};margin-top:8px;">A capped platform fee. Your rate stays your rate, and the cap stops it scaling against you.${NEW}</div>
        </div>
      </div>`),
    ], 340, T.deep)}
  </section>`;

  // Instruction 2: depth BETWEEN chapters. From the rail you keep glimpsing the
  // water through the buildings — each glimpse is its own parallax stage.
  const glimpse = (label, plate, tint) => `
  <section style="position:relative;">
    ${stage([
      plateLayer(-230, plate, '0.36'),
      plateLayer(-130, PLATES.water, '0.24', 'mix-blend-mode:screen;'),
      layer(-60, `<div style="position:absolute;inset:0;background:${tint};"></div>`),
      layer(0, `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,9,15,0.30),rgba(6,9,15,0.86));"></div>`),
    ], 240, T.deep)}
    <div style="position:absolute;left:92px;bottom:18px;font-size:10px;letter-spacing:0.24em;color:${T.gold};">${label}</div>
  </section>`;

  return shell('F1 Harbor Mile', a, [
    hero,
    glimpse('BETWEEN &middot; THE WATER IS STILL THERE', PLATES.harbor, 'linear-gradient(180deg,rgba(0,32,96,0.34),rgba(6,9,15,0))'),
    manifesto(a),
    glimpse('BETWEEN &middot; LIGHTS ACROSS THE BASIN', PLATES.testim, 'linear-gradient(180deg,rgba(96,192,240,0.14),rgba(6,9,15,0))'),
    creative(a),
    movieSlot(1, 'The Harbor at Night', 'Slow push across still water toward a shoreline of lit windows; each window is somebody finishing a set. Ends on one window going bright.', 12),
    proof,
    movieSlot(2, 'One Session End to End', 'A single training session compressed: arrival, the work, the logged record forming as a faceted crystal. No dialogue.', 20),
    fork(a),
  ].join('\n'));
}

// ─────────────────────────────── F2 · THE LIT MILE ───────────────────────────
// D2's linear mile and marquee signage; B1's window-wall grafted in as PROOF.
function litMile() {
  const a = T.purple;
  const bulbs = Array.from({ length: 26 }, (_, i) => `<span style="width:7px;height:7px;border-radius:50%;
      background:${i % 3 === 0 ? T.purple : T.ice};box-shadow:0 0 9px ${i % 3 === 0 ? T.purple : T.ice};"></span>`).join('');

  const hero = `
  <section style="position:relative;">
    ${stage([
      plateLayer(-280, PLATES.mile, '0.50'),
      plateLayer(-160, PLATES.night, '0.34', 'mix-blend-mode:screen;'),
      layer(-60, `<img src="${SWANS}" alt="the swans, from Sean's own film" style="width:100%;height:100%;
        object-fit:cover;opacity:0.70;">${heroSlotBadge}`),
      layer(-10, `<div style="position:absolute;left:0;right:0;bottom:0;height:190px;
        background:linear-gradient(180deg,rgba(6,9,15,0) 0%,rgba(96,192,240,0.10) 40%,rgba(6,9,15,0.92) 100%);
        filter:blur(1px);"></div>`),
      layer(0, `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,9,15,0.06),rgba(6,9,15,0.80));"></div>`),
    ], 700, '#070A16')}
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding:0 56px 52px;gap:16px;">
      <div style="display:flex;gap:6px;align-items:center;">${bulbs}</div>
      <div style="font-size:11px;letter-spacing:0.30em;color:${a};">SWANSTUDIOS &middot; THE MILE</div>
      <h1 style="font-size:62px;line-height:1.0;font-weight:800;letter-spacing:-0.02em;">${esc(V.headline)}</h1>
      <p style="font-size:21px;line-height:1.5;color:#D6E4F0;max-width:46ch;font-weight:500;">${esc(V.sub)}</p>
      ${ctas}
    </div>
  </section>`;

  const windows = Array.from({ length: 60 }, (_, i) => {
    const lit = [3, 7, 8, 12, 19, 21, 26, 30, 33, 41, 44, 47, 52, 55, 58].includes(i);
    return `<div style="aspect-ratio:1/1.35;border-radius:2px;background:${lit ? 'rgba(198,168,75,0.85)' : 'rgba(27,42,68,0.85)'};
      box-shadow:${lit ? '0 0 10px rgba(198,168,75,0.55)' : 'none'};"></div>`;
  }).join('');

  const proof = `
  <section style="padding:64px 56px 10px;background:${T.ink};">
    <div style="font-size:12px;letter-spacing:0.22em;color:${a};">04 &middot; PROOF &middot; THE WINDOW WALL</div>
    <h2 style="font-size:32px;font-weight:700;margin:10px 0 18px;">Swan Coach builds it with your trainer${NEW}</h2>
    <div style="display:grid;grid-template-columns:7fr 5fr;gap:24px;align-items:stretch;">
      <div style="border:1px solid ${T.rule};border-radius:12px;padding:18px;background:rgba(0,32,96,0.24);">
        <div style="display:grid;grid-template-columns:repeat(12,1fr);gap:6px;">${windows}</div>
        <div style="font-size:12px;color:#8FA8C8;margin-top:12px;">Each lit window is one session logged tonight.${NEW}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div style="border:1px solid ${T.rule};border-radius:12px;padding:18px;background:rgba(6,9,15,0.7);">
          <div style="font-size:11px;letter-spacing:0.18em;color:${T.ice};">HUMAN EVIDENCE</div>
          <div style="font-size:15px;line-height:1.6;color:${T.dim};margin-top:8px;">The wall is the community, counted. It is dark when nobody trained.${NEW}</div>
        </div>
        <div style="border:1px solid ${T.rule};border-radius:12px;padding:18px;background:rgba(6,9,15,0.7);">
          <div style="font-size:11px;letter-spacing:0.18em;color:${T.gold};">TRAINER ECONOMICS</div>
          <div style="font-size:15px;line-height:1.6;color:${T.dim};margin-top:8px;">A capped platform fee, so a good month is never punished.${NEW}</div>
        </div>
      </div>
    </div>
  </section>`;

  // Instruction 2: depth BETWEEN chapters, not only in the hero. Each interstitial
  // is a block of the mile you pass through — signage nearer than the storefronts,
  // reflection nearest of all.
  const milestone = (label, plate, sign) => `
  <section style="position:relative;">
    ${stage([
      plateLayer(-250, plate, '0.34'),
      plateLayer(-140, PLATES.night, '0.22', 'mix-blend-mode:screen;'),
      layer(-70, `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(139,92,246,0.14),rgba(6,9,15,0));"></div>`),
      layer(-25, `<div style="position:absolute;left:56px;top:50%;transform:translateY(-50%) translateZ(-25px);
        border:1px solid rgba(96,192,240,0.55);border-radius:10px;padding:14px 22px;background:rgba(6,9,15,0.62);
        font-size:22px;font-weight:800;letter-spacing:0.04em;color:${T.frost};
        box-shadow:0 0 30px rgba(139,92,246,0.35);">${esc(sign)}</div>`),
      layer(0, `<div style="position:absolute;left:0;right:0;bottom:0;height:64px;
        background:linear-gradient(180deg,rgba(96,192,240,0) 0%,rgba(96,192,240,0.10) 60%,rgba(6,9,15,0.9) 100%);filter:blur(1px);"></div>`),
    ], 260, '#070A16')}
    <div style="position:absolute;right:56px;bottom:16px;font-size:10px;letter-spacing:0.24em;color:#8FA8C8;">${label}</div>
  </section>`;

  return shell('F2 The Lit Mile', a, [
    hero,
    milestone('BLOCK 01 &middot; THE APPROACH', PLATES.harbor, 'HEALTH FIRST'),
    manifesto(a),
    movieSlot(1, 'Neon Mile Opening Night', 'The mile switching on sign by sign, reflections blooming across wet pavement, ending on the SwanStudios marquee.', 12),
    milestone('BLOCK 02 &middot; THE MAKERS', PLATES.crystal, 'COMMUNITY ALWAYS'),
    creative(a), proof,
    milestone('BLOCK 03 &middot; THE DOOR', PLATES.about, 'SOMETHING REAL'),
    movieSlot(2, 'The Record In Motion', 'A logged set condensing into a faceted crystalline record, turning once so every facet catches the neon.', 15),
    fork(a),
  ].join('\n'));
}

// ─────────────────────────────── F3 · NIGHT HARBOR ───────────────────────────
// Neither parent's architecture: the page BECOMES one from the other. Water
// hardens into wet pavement; distant harbour windows resolve into neon.
function nightHarbor() {
  const a = T.gold;
  const beat = (n, label, plate, tint, blur, body) => `
  <section style="position:relative;">
    ${stage([
      plateLayer(-240, plate, String(0.30 + n * 0.10)),
      layer(-120, `<div style="position:absolute;inset:0;background:${tint};filter:blur(${blur}px);"></div>`),
      layer(0, `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,9,15,0.25),rgba(6,9,15,0.88));"></div>`),
    ], 300, T.ink)}
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:0 56px;gap:8px;">
      <div style="font-size:11px;letter-spacing:0.26em;color:${a};">${label}</div>
      <div style="font-size:19px;line-height:1.6;color:${T.dim};max-width:66ch;">${esc(body)}${NEW}</div>
    </div>
  </section>`;

  const hero = `
  <section style="position:relative;">
    ${stage([
      plateLayer(-300, PLATES.water, '0.62'),
      plateLayer(-190, PLATES.testim, '0.28', 'mix-blend-mode:screen;'),
      layer(-90, `<div style="position:absolute;inset:0;background:radial-gradient(90% 60% at 50% 90%,
        rgba(96,192,240,0.16),rgba(6,9,15,0) 70%);"></div>`),
      layer(-20, `<img src="${SWANS}" alt="the swans, from Sean's own film" style="width:100%;height:100%;
        object-fit:cover;opacity:0.86;">${heroSlotBadge}`),
      layer(0, `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,9,15,0.05),rgba(6,9,15,0.84));"></div>`),
    ], 760, T.deep)}
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;
      text-align:center;gap:18px;padding:0 90px;">
      <div style="font-size:11px;letter-spacing:0.34em;color:${T.ice};">SWANSTUDIOS &middot; NIGHT HARBOR</div>
      <h1 style="font-size:60px;line-height:1.02;font-weight:800;letter-spacing:-0.02em;max-width:20ch;">${esc(V.headline)}</h1>
      <p style="font-size:20px;line-height:1.5;color:#D6E4F0;max-width:52ch;font-weight:500;">${esc(V.sub)}</p>
      <div style="display:flex;justify-content:center;">${ctas}</div>
    </div>
  </section>`;

  return shell('F3 Night Harbor', a, [
    hero,
    beat(0, '01 &middot; STILL WATER', PLATES.harbor, 'linear-gradient(180deg,rgba(0,32,96,0.42),rgba(6,9,15,0))', 0,
      'It opens far out, where the lights are only reflections and nothing is asked of you yet.'),
    manifesto(T.ice),
    beat(1, '02 &middot; THE WATER HARDENS', PLATES.about, 'linear-gradient(180deg,rgba(96,192,240,0.16),rgba(139,92,246,0.10))', 1,
      'The surface stops being water. Reflections sharpen the way they do on a wet street.'),
    movieSlot(1, 'The Harbor at Night', 'One continuous move from open water to a lit shoreline, the reflection hardening under the camera as it goes.', 18),
    creative(T.purple),
    beat(2, '03 &middot; THE MILE', PLATES.mile, 'linear-gradient(180deg,rgba(139,92,246,0.22),rgba(198,168,75,0.10))', 2,
      'The distant windows resolve into signage, and the harbour has become the mile without a cut.'),
    movieSlot(2, 'One Session End to End', 'Arrival, the work, the record forming — shot as one unbroken walk down the lit mile.', 20),
    fork(a),
  ].join('\n'));
}

const boards = [
  ['Main.dc.html', harborMile(), 'F1 · Harbor Mile'],
  ['LitMile.dc.html', litMile(), 'F2 · The Lit Mile'],
  ['NightHarbor.dc.html', nightHarbor(), 'F3 · Night Harbor'],
];

const W = 1280, H = 4100, GAP = 220;  // dry-loop R3: est content ~3450 + text flow; 3000 clipped all three
const artboards = [], annotations = [];
const notes = [
  'F1 · HARBOR MILE — B1 gives the bones, D2 gives the light. The section rail survives as calm wayfinding, but it is lit like a marquee: gold bulb on the chapter you are in.\n\nTRADEOFF: the most legible of the three and the least surprising — it reads as B1 with better lighting rather than as a new thing.',
  'F2 · THE LIT MILE — D2 gives the bones. You walk one continuous mile of signage; B1 is grafted in at THE PROOF as the window wall, where every lit window is a session logged tonight.\n\nTRADEOFF: no rail means no map — a visitor cannot see how long the page is, and the window wall goes dark at launch with no user data.',
  'F3 · NIGHT HARBOR — neither parent wins; the page TRANSFORMS. It opens on open water, the reflections harden into wet pavement, and the far windows resolve into neon. One move, no cut.\n\nTRADEOFF: the boldest and the most fragile — the whole idea only lands if the art in all three beats is regraded to match, and it is the hardest to keep coherent on mobile.',
];

boards.forEach(([file, html, title], i) => {
  fs.writeFileSync(path.join(here, file), html, 'utf8');
  const x = i * (W + GAP);
  artboards.push({ file, title, x, y: 0, w: W, h: H });
  annotations.push({ id: `note-f${i + 1}`, x, y: -300, w: 430, text: notes[i] });
});

annotations.push({
  id: 'fusion-manifest', x: -500, y: 0, w: 440,
  text: `THREE FUSIONS OF B1 + D2 — 2026-08-20\n\nSean picked B1 (Harbor Lights) and D2 (Vegas Mile), then asked for them combined into one final page. These are three ways to combine them, differing on ONE axis: which parent supplies the ARCHITECTURE and which supplies the LIGHT.\n\nSHARED BY ALL THREE (do not vary):\n• Sean's real header, lifted BYTE-IDENTICALLY from the approved B1 source — not retyped\n• hero = a real frame from his own Swans.mp4, badged as a swappable slot\n• 2 movie areas per board for MiniMax H3 films\n• parallax depth stages between chapters, not only in the hero\n• copy verbatim from copy-pack.json; gold tags mark new lines needing approval\n• real harvested plates + the real low-poly crystalline mark\n\nPick one, or name the graft (e.g. "F2's window wall inside F1").`,
});

fs.writeFileSync(path.join(here, 'canvas.json'),
  JSON.stringify({ artboards, annotations, launch: { view: 'canvas' } }, null, 2) + '\n', 'utf8');

console.log(`wrote ${artboards.length} fusion artboards + canvas.json`);
console.log(`header reused verbatim: ${HEADER.length} bytes`);
