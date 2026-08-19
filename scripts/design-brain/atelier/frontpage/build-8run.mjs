#!/usr/bin/env node
/**
 * build-8run.mjs — generates the eight front-page artboards for the 2026-08-19 run.
 *
 * WHY A GENERATOR AND NOT EIGHT HAND-WRITTEN FILES:
 * copy is material (Sean's catch, 2026-08-19). Every string comes from copy-pack.json;
 * nothing is retyped. Hand-typing "verbatim" copy is how drift gets reintroduced —
 * it already happened once this session in the design brief.
 *
 * Each artboard renders the SAME six chapters (D10) with the SAME copy, and differs
 * only on volume (D6 primary axis) and lighting (D6 secondary lever).
 */
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const copy = JSON.parse(fs.readFileSync(path.join(here, 'copy-pack.json'), 'utf8')).verbatim;
const run = JSON.parse(fs.readFileSync(path.join(here, 'skeletons-8run.json'), 'utf8'));

const NEW = (t) => `<span style="font-size: 11px; letter-spacing: 0.06em; color: #C6A84B;"> [new copy - needs Sean approval]</span>`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Lighting families → the actual paint. Sean's second lever, made literal. */
const LIGHT = {
  'warm-amber-in-blue':               { sky: '#0A1430', deep: '#050A1C', warm: '#C6A84B', cool: '#60C0F0', wash: 'radial-gradient(120% 80% at 50% 100%, rgba(198,168,75,0.22) 0%, rgba(0,32,96,0.0) 60%)', label: 'warm amber in blue' },
  'dawn':                             { sky: '#0B1636', deep: '#070D22', warm: '#E8B06A', cool: '#7FB0E8', wash: 'linear-gradient(180deg, #070D22 0%, #12224C 55%, rgba(232,176,106,0.28) 100%)', label: 'dawn — night warming to amber' },
  'dusk':                             { sky: '#0C1226', deep: '#06090F', warm: '#D8A24B', cool: '#5A93D8', wash: 'linear-gradient(180deg, rgba(216,162,75,0.20) 0%, #0C1226 45%, #06090F 100%)', label: 'dusk — low sun, long shadows' },
  'cold-crystalline-with-warm-windows': { sky: '#08132C', deep: '#040814', warm: '#E8C87A', cool: '#60C0F0', wash: 'radial-gradient(90% 70% at 30% 40%, rgba(96,192,240,0.16) 0%, rgba(4,8,20,0) 65%)', label: 'cold crystalline, warm windows' },
  'cold-crystalline':                 { sky: '#061024', deep: '#03070F', warm: '#8FA8C8', cool: '#60C0F0', wash: 'radial-gradient(100% 70% at 50% 0%, rgba(96,192,240,0.20) 0%, rgba(3,7,15,0) 70%)', label: 'cold crystalline' },
  'deep-night-to-dawn':               { sky: '#050914', deep: '#02040A', warm: '#E8B06A', cool: '#4A7FD0', wash: 'linear-gradient(180deg, #02040A 0%, #071232 60%, rgba(232,176,106,0.30) 100%)', label: 'deep night rising to dawn' },
  'deep-night':                       { sky: '#04060E', deep: '#010204', warm: '#C6A84B', cool: '#8B5CF6', wash: 'radial-gradient(80% 60% at 50% 20%, rgba(139,92,246,0.22) 0%, rgba(1,2,4,0) 70%)', label: 'deep night — neon' },
};
const lightFor = (s) => LIGHT[s.lighting.split(' ')[0].replace(/[(,].*$/, '')] || LIGHT[Object.keys(LIGHT).find(k => s.lighting.startsWith(k))] || LIGHT['deep-night'];

/** Volume → how much room the swans get, and how the hero is composed. */
const HERO_H = { quiet: 760, 'people-first': 640, 'product-forward': 600, 'full-cinematic': 880 };

const chapterRule = (L) => `<div style="height: 1px; background: linear-gradient(90deg, rgba(96,192,240,0) 0%, ${L.cool}55 35%, rgba(96,192,240,0) 100%);"></div>`;

function heroBlock(s, L) {
  const h = HERO_H[s.volume];
  const cinematic = s.volume === 'full-cinematic';
  const productFwd = s.volume === 'product-forward';
  const peopleFirst = s.volume === 'people-first';
  // THE WORLD. D13: the sub-line is LOAD-BEARING in every design — real typographic weight, readable before any scroll.
  return `
    <section style="position: relative; min-height: ${h}px; background: ${L.sky}; overflow: hidden;">
      <div style="position: absolute; inset: 0; background: ${L.wash};"></div>
      <img src="${cinematic || peopleFirst ? 'plate-threshold.svg' : 'plate-swanwater.svg'}" alt="the living world — swans over water" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: ${productFwd ? '0.30' : cinematic ? '0.85' : '0.62'}; display: block;">
      <div style="position: relative; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 24px; padding: 64px 56px; min-height: ${h}px; align-content: ${cinematic ? 'end' : 'center'};">
        <div style="grid-column: span ${productFwd ? 6 : cinematic ? 9 : 7}; display: flex; flex-direction: column; gap: 20px;">
          <div style="font-size: 12px; letter-spacing: 0.30em; color: {{accent}};">SWANSTUDIOS</div>
          <h1 style="margin: 0; font-size: ${cinematic ? 74 : 58}px; line-height: 1.02; font-weight: 800; letter-spacing: -0.02em; text-wrap: balance;">${esc(copy.headline)}</h1>
          <p style="margin: 0; font-size: 22px; line-height: 1.5; color: #D6E4F0; max-width: 44ch; font-weight: 500; text-wrap: pretty;">${esc(copy.sub)}</p>
          <div style="display: flex; gap: 14px; flex-wrap: wrap;">
            <a href="#fork" style="display: inline-flex; align-items: center; min-height: 48px; padding: 0 30px; border-radius: 10px; background: #002060; color: #E0ECF4; text-decoration: none; font-weight: 700; box-shadow: 0 0 26px rgba(139,92,246,0.40);">${esc(copy.cta_primary)}</a>
            <a href="#fork" style="display: inline-flex; align-items: center; min-height: 48px; padding: 0 26px; border-radius: 10px; border: 1px solid ${L.cool}66; color: #E0ECF4; text-decoration: none; font-weight: 600;">${esc(copy.cta_secondary)}</a>
          </div>
        </div>
        ${productFwd ? `<div style="grid-column: span 6; align-self: center;"><img src="plate-proof.svg" alt="a progress chart drawing itself" style="width: 100%; border-radius: 14px; display: block; box-shadow: 0 24px 60px rgba(0,0,0,0.55);"></div>` : ''}
      </div>
      <div style="position: absolute; left: 56px; bottom: 18px; font-size: 11px; letter-spacing: 0.16em; color: ${L.warm}; opacity: 0.85;">${esc(L.label.toUpperCase())} &middot; ${esc(s.volume.toUpperCase())}</div>
    </section>`;
}

function build(s, letter) {
  const L = lightFor(s);
  const people = s.people_in_world;
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>
    body { margin: 0; font-family: 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif; background: ${L.deep}; }
    a { color: #60C0F0; } a:hover { color: #E0ECF4; }
    h1, h2 { text-wrap: balance; }
  </style>
</helmet>
<div style="width: 1280px; min-height: 2600px; background: ${L.deep}; color: #E0ECF4;">

  ${heroBlock(s, L)}

  <section style="padding: 18px 56px; background: ${L.deep}; border-bottom: 1px solid #FFFFFF12;">
    <div style="font-size: 12px; letter-spacing: 0.14em; color: #8FA8C8;">THE WORLD &middot; people in it: <span style="color: ${L.warm};">${esc(people)}</span></div>
  </section>

  <section style="padding: 84px 56px; background: ${L.deep};">
    ${chapterRule(L)}
    <div style="display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 28px; padding-top: 44px;">
      <div style="grid-column: span 2; font-size: 12px; letter-spacing: 0.22em; color: ${L.cool};">02<br>MANIFESTO</div>
      <div style="grid-column: span 10; display: flex; flex-direction: column; gap: 22px;">
        <p style="margin: 0; font-size: 26px; line-height: 1.5; color: #E0ECF4; font-weight: 500; text-wrap: pretty;">${esc(copy.mission_1)}</p>
        <p style="margin: 0; font-size: 19px; line-height: 1.65; color: #B9CBDC; max-width: 62ch;">${esc(copy.mission_2)}</p>
        <p style="margin: 0; font-size: 19px; line-height: 1.65; color: #B9CBDC; max-width: 62ch;">${esc(copy.mission_3)}</p>
        <p style="margin: 0; font-family: 'Cormorant Garamond', Georgia, serif; font-style: italic; font-size: 30px; line-height: 1.35; color: ${L.warm};">${esc(copy.mission_closing)}</p>
      </div>
    </div>
  </section>

  <section style="padding: 84px 56px; background: ${L.sky};">
    ${chapterRule(L)}
    <div style="display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 28px; padding-top: 44px;">
      <div style="grid-column: span 2; font-size: 12px; letter-spacing: 0.22em; color: ${L.cool};">03<br>THE LOOP</div>
      <div style="grid-column: span 10; display: flex; flex-direction: column; gap: 26px;">
        <h2 style="margin: 0; font-size: 36px; font-weight: 700;">Swan Coach builds it with your trainer${NEW()}</h2>
        <div style="display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px;">
          ${['Your data', 'Swan Coach reads it', 'Your trainer shapes it', 'Your program', 'Your chart, your feed']
            .map((step, i) => `<div style="display: flex; flex-direction: column; gap: 10px; padding: 18px; border: 1px solid ${L.cool}33; border-radius: 12px; background: #FFFFFF08; min-height: 96px;">
            <div style="font-family: 'Fira Code', monospace; font-size: 11px; color: ${L.warm};">0${i + 1}</div>
            <div style="font-size: 15px; line-height: 1.4; color: #D6E4F0;">${esc(step)}</div>
          </div>`).join('\n          ')}
        </div>
        <img src="plate-proof.svg" alt="a training program's plan line against the member's actual logged sessions" style="width: 100%; border-radius: 14px; display: block;">
        <div style="font-size: 12px; color: #8FA8C8;">Chart shown uses a labelled demo dataset &mdash; never a real member's numbers.${NEW()}</div>
      </div>
    </div>
  </section>

  <section style="padding: 84px 56px; background: ${L.deep};">
    ${chapterRule(L)}
    <div style="display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 28px; padding-top: 44px;">
      <div style="grid-column: span 2; font-size: 12px; letter-spacing: 0.22em; color: ${L.cool};">04<br>THE PROOF</div>
      <div style="grid-column: span 5; display: flex; flex-direction: column; gap: 14px; padding: 24px; border: 1px solid ${L.cool}33; border-radius: 14px;">
        <div style="font-size: 12px; letter-spacing: 0.18em; color: ${L.cool};">IF YOU WANT TO TRAIN</div>
        <img src="plate-crystal.svg" alt="a member's twelve-week progression" style="width: 100%; border-radius: 10px; display: block;">
        <div style="font-size: 15px; line-height: 1.55; color: #B9CBDC;">Twelve weeks, logged against a written plan by a trainer with 26+ years of experience, NASM-protocol.${NEW()}</div>
      </div>
      <div style="grid-column: span 5; display: flex; flex-direction: column; gap: 14px; padding: 24px; border: 1px solid ${L.warm}44; border-radius: 14px; background: #FFFFFF06;">
        <div style="font-size: 12px; letter-spacing: 0.18em; color: ${L.warm};">IF YOU ARE A TRAINER</div>
        <div style="font-size: 46px; font-weight: 800; line-height: 1; color: ${L.warm};">15%</div>
        <div style="font-size: 17px; line-height: 1.55; color: #D6E4F0;">Never more than <strong>$1,000 a month</strong>. Card processing included. No monthly fee, no setup fee. We only make money when you do.${NEW()}</div>
        <div style="font-size: 12px; color: #8FA8C8;">Rate and cap are read from config, never typed into a page.</div>
      </div>
    </div>
  </section>

  <section id="fork" style="padding: 84px 56px; background: ${L.sky};">
    ${chapterRule(L)}
    <div style="padding-top: 44px; display: flex; flex-direction: column; gap: 28px;">
      <h2 style="margin: 0; font-size: 40px; font-weight: 800;">${esc(copy.cta_title)}</h2>
      <p style="margin: 0; font-size: 18px; line-height: 1.65; color: #B9CBDC; max-width: 68ch;">${esc(copy.cta_body)}</p>
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px;">
        <a href="#" style="display: flex; flex-direction: column; gap: 10px; padding: 30px; border-radius: 16px; background: #002060; text-decoration: none; color: #E0ECF4; box-shadow: 0 0 30px rgba(139,92,246,0.35); min-height: 44px;">
          <div style="font-size: 24px; font-weight: 700;">${esc(copy.cta_secondary)}</div>
          <div style="font-size: 14px; color: #B9CBDC;">Browse real trainers before you sign up for anything.${NEW()}</div>
        </a>
        <a href="#" style="display: flex; flex-direction: column; gap: 10px; padding: 30px; border-radius: 16px; background: #3B1E7A; text-decoration: none; color: #E0ECF4; box-shadow: 0 0 30px rgba(96,192,240,0.32); min-height: 44px;">
          <div style="font-size: 24px; font-weight: 700;">Train on SwanStudios${NEW()}</div>
          <div style="font-size: 14px; color: #D9CBF0;">Bring your clients. Keep your business. One email to start.${NEW()}</div>
        </a>
      </div>
      <div style="font-size: 12px; color: #C6A84B;">&#9888; The trainer door has no destination yet &mdash; /trainers capture funnel is a hard dependency (F5).</div>
    </div>
  </section>

  <footer style="padding: 44px 56px 56px; background: ${L.deep}; border-top: 1px solid #FFFFFF12; display: flex; flex-direction: column; gap: 12px;">
    <div style="font-family: 'Cormorant Garamond', Georgia, serif; font-style: italic; font-size: 20px; color: ${L.warm};">${esc(copy.mission_closing)}</div>
    <div style="font-size: 13px; color: #8FA8C8;">Motion and iconography generated with MiniMax H3.</div>
    <div style="font-size: 11px; color: #55708C;">${esc(letter)} &middot; ${esc(s.id)} &middot; reduced motion: ${esc(s.reduced_motion_fallback.slice(0, 96))}&hellip;</div>
  </footer>

</div>
</x-dc>
<script data-dc-script data-props='{"accent":{"editor":"color","default":"${L.cool}","options":["#60C0F0","#C6A84B","#8B5CF6","#E0ECF4"]}}'>
class Component extends DCLogic {
  renderVals() {
    return { accent: this.props.accent ?? '${L.cool}' };
  }
}
</script>
</body>
</html>
`;
}

const NAMES = ['StillWater', 'DawnApproach', 'HarborLights', 'TwoLanterns', 'InstrumentFlight', 'TheInstrument', 'BeneathTheWaterline', 'VegasMile'];
const LETTERS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2'];

const W = 1280, H = 2600, GAPX = 200, GAPY = 780;
const artboards = [], annotations = [];

run.skeletons.forEach((s, i) => {
  // Main.dc.html is the entry file and must exist — the first artboard takes that name.
  const file = i === 0 ? 'Main.dc.html' : `${NAMES[i]}.dc.html`;
  fs.writeFileSync(path.join(here, file), build(s, LETTERS[i]), 'utf8');
  const col = i % 4, row = Math.floor(i / 4);
  const x = col * (W + GAPX), y = row * (H + GAPY);
  artboards.push({ file, title: `${LETTERS[i]} · ${s.id.replace(/^[A-D]\d-/, '').replace(/-/g, ' ')}`, x, y, w: W, h: H });
  annotations.push({
    id: `note-${LETTERS[i].toLowerCase()}`,
    x, y: y - 250, w: 420,
    text: `${LETTERS[i]} · ${s.id}\nVOLUME: ${s.volume}  |  LIGHT: ${s.lighting}\n\n${s.phenomenon}\n\nTRADEOFF: ${s.tradeoff}\n\nREDUCED MOTION: ${s.reduced_motion_fallback}\n\nfrom: ${s.lineage}`,
  });
});

annotations.push({
  id: 'run-manifest', x: -520, y: 0, w: 460,
  text: `EIGHT-DESIGN RUN — 2026-08-19\n\nPrimary axis: VOLUME of the swans moment.\nSecond lever: LIGHTING.\nRow 1 = quiet + people-first. Row 2 = product-forward + full-cinematic.\n\nSHARED BY ALL EIGHT (do not vary):\n• copy verbatim from copy-pack.json — gold tags mark new copy needing Sean's approval\n• 6 chapters: WORLD / MANIFESTO / LOOP / PROOF / FORK / FOOTER\n• living world at distance, real people IN it\n• two EQUAL doors, forking late\n• Swans.mp4 kept — 23.976fps, 25.2s, 17.1MB, loop-seam SSIM 0.694 (does NOT loop cleanly)\n• THE PROOF is dual-track: human evidence + trainer economics\n\nPlates are placeholders. Real backgrounds come from the 30-prompt pack via forge.mjs.`,
});

// Dry-loop round 2: notes AUTO-FIT their height, so a fixed -250 offset put all eight
// notes on top of their own artboards. Measure each note and seat it above its board.
const noteHeight = (text, w) => {
  const perLine = Math.max(24, Math.floor(w / 8.1));
  const lines = text.split(String.fromCharCode(10)).reduce((n, para) => n + Math.max(1, Math.ceil(para.length / perLine)), 0);
  return lines * 19 + 28;
};
for (const n of annotations) {
  if (n.id === 'run-manifest') continue;           // sits left of the grid, no vertical conflict
  const board = artboards.find((a) => a.x === n.x);
  if (board) n.y = board.y - (noteHeight(n.text, n.w) + 48);
}

fs.writeFileSync(path.join(here, 'canvas-8run.json'), JSON.stringify({
  artboards, annotations, launch: { view: 'canvas' },
}, null, 2) + '\n', 'utf8');

console.log(`wrote ${artboards.length} artboards + canvas-8run.json`);
console.log(artboards.map(a => `  ${a.file.padEnd(26)} ${a.x},${a.y}`).join('\n'));
