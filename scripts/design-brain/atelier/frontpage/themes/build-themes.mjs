#!/usr/bin/env node
/**
 * build-themes.mjs — five genuinely different front-page themes.
 *
 * Sean 2026-08-20: five themes, completely different from each other, drawn
 * from the Swan design brain, with the Mobbin MCP informing which UI elements
 * each one uses — AND the client/community half leading, not the trainer half.
 *
 * GOVERNANCE (docs/ai-workflow/design-brain/mobbin-learning-system.md):
 * Mobbin observations enter at L3/L5 as evidence and synthesis only. L6
 * adjudication and L7 canon are HUMAN-ONLY. Nothing here promotes a pattern
 * into Design Brain canon; every borrowed element is attributed in-artboard so
 * Sean can accept or reject it individually.
 *
 * TASTE PROFILE (design-brain/swan-element-intelligence.md §6):
 *   black + white + gold  -> Obsidian, Frost White, Gilded Fern
 *   black + white + blue  -> Obsidian, Frost White, Ice Wing, Midnight Sapphire
 *   black + white + green -> a real preference signal, but there is NO approved
 *                            client green token. Cyberforest green is operator-
 *                            only. A green theme is therefore a TOKEN_PROPOSAL
 *                            capped at TRIAL — offered as theme 6, NOT built as
 *                            if it were canon.
 *
 * COPY: copy-pack-full.json (40 blocks). Pack 01 covered 4 of 13 sections; this
 * uses the whole page, and leads with Beyond the Gym per Sean's correction that
 * the client arriving for community is under-served against the trainer.
 */

import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const parent = path.join(here, '..');
const CP = JSON.parse(fs.readFileSync(path.join(parent, 'copy-pack-full.json'), 'utf8'));

const src = fs.readFileSync(path.join(parent, 'fusion', '_src_B1.html'), 'utf8');
const HEADER = src.slice(src.indexOf('<header'), src.indexOf('</header>') + 9);
if (!/swan-logo\.png/.test(HEADER)) throw new Error('header lost the crystalline mark');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const NEW = (t) => ` <span style="font-size:10px;letter-spacing:0.06em;color:${t};">[new copy - needs Sean approval]</span>`;

const P = {
  harbor: 'social-hero-bg.jpg', water: 'hero-swan-bg.jpg', crystal: 'features-swan-bg.jpg',
  night: 'beyond-the-gym-bg.jpg', proof: 'video-library-bg.jpg', mile: 'store-hero-bg.jpg',
  about: 'about-hero-bg.jpg', testim: 'testimonials-swan-bg.jpg', golf: 'golf-section-bg.jpg',
};
const SWANS = 'swans-hero-frame.jpg', SWANS_B = 'swans-frame-b.jpg';

const stage = (layers, h, bg) => `
    <div style="position:relative;height:${h}px;overflow:hidden;background:${bg};
      perspective:1000px;perspective-origin:50% 50%;transform-style:preserve-3d;">
      ${layers.join('\n      ')}
    </div>`;
const layer = (z, inner, extra = '') => `<div style="position:absolute;inset:0;
        transform:translateZ(${z}px) scale(${(1 - z / 1000).toFixed(3)});${extra}">${inner}</div>`;
const plate = (z, f, o, extra = '') =>
  layer(z, `<img src="${f}" alt="" style="width:100%;height:100%;object-fit:cover;opacity:${o};display:block;">`, extra);

/* ─── shared content blocks, themed by a token object ───────────────────────── */

// THE COMMUNITY HALF — leads in every theme (Sean's correction).
const beyond = (K, layout) => {
  const c = CP.beyond_the_gym.categories;
  const grid = layout === 'board'
    ? 'grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;'
    : layout === 'ticker'
      ? 'grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;'
      : 'grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;';
  return `
  <section style="padding:72px 56px;background:${K.surface};">
    <div style="display:flex;align-items:baseline;justify-content:space-between;gap:20px;margin-bottom:8px;">
      <div style="font-size:11px;letter-spacing:0.26em;color:${K.accent};">I &middot; ${esc(CP.beyond_the_gym.section_title.toUpperCase())}</div>
      <div style="font-size:11px;letter-spacing:0.16em;color:${K.muted};">${c.length} WAYS IN${NEW(K.tag)}</div>
    </div>
    <h2 style="font-size:${K.h2}px;font-weight:${K.h2w};color:${K.ink};margin-bottom:8px;${K.h2extra || ''}">Come for one. Stay for the rest.${NEW(K.tag)}</h2>
    <p style="font-size:16px;line-height:1.6;color:${K.body};max-width:64ch;margin:0 0 24px;">${esc(CP.hero.sub)}</p>
    <div style="display:grid;${grid}">
      ${c.map((x, i) => `<div style="border:1px solid ${K.rule};border-radius:${K.radius}px;padding:16px;
        background:${K.card};display:flex;flex-direction:column;gap:6px;">
        <div style="font-size:10px;letter-spacing:0.18em;color:${K.muted};">${String(i + 1).padStart(2, '0')}</div>
        <div style="font-size:15px;font-weight:700;color:${K.ink};">${esc(x.title)}</div>
        <div style="font-size:13px;line-height:1.5;color:${K.body};">${esc(x.desc)}</div>
      </div>`).join('\n      ')}
    </div>
    <div style="margin-top:22px;">${cta(K)}</div>
  </section>`;
};

const cta = (K) => `
      <div style="display:flex;gap:14px;flex-wrap:wrap;">
        <a href="#join" style="display:inline-flex;align-items:center;min-height:48px;padding:0 30px;border-radius:${K.radius}px;
          background:${K.btnBg};color:${K.btnFg};text-decoration:none;font-weight:700;box-shadow:0 0 26px ${K.glow};">${esc(CP.hero.cta_primary)}</a>
        <a href="#trainers" style="display:inline-flex;align-items:center;min-height:48px;padding:0 26px;border-radius:${K.radius}px;
          border:1px solid ${K.rule};color:${K.ink};text-decoration:none;font-weight:600;">${esc(CP.hero.cta_secondary)}</a>
      </div>`;

const whatWeDo = (K) => `
  <section style="padding:70px 56px;background:${K.bg};">
    <div style="font-size:11px;letter-spacing:0.26em;color:${K.accent};margin-bottom:10px;">II &middot; WHAT WE DO</div>
    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;">
      ${CP.what_we_do.features.map((f) => `<div style="border-top:1px solid ${K.rule};padding-top:12px;">
        <div style="font-size:14px;font-weight:700;color:${K.ink};margin-bottom:5px;">${esc(f.title)}</div>
        <div style="font-size:12.5px;line-height:1.55;color:${K.body};">${esc(f.desc)}</div></div>`).join('\n      ')}
    </div>
  </section>`;

const manifesto = (K) => `
  <section style="padding:76px 56px;background:${K.surface};">
    <div style="font-size:11px;letter-spacing:0.26em;color:${K.accent};margin-bottom:16px;">III &middot; MANIFESTO</div>
    <p style="margin:0 0 16px;font-size:24px;line-height:1.5;color:${K.ink};font-weight:500;max-width:70ch;">${esc(CP.mission.p1)}</p>
    <p style="margin:0 0 12px;font-size:17px;line-height:1.65;color:${K.body};max-width:64ch;">${esc(CP.mission.p2)}</p>
    <p style="margin:0 0 18px;font-size:17px;line-height:1.65;color:${K.body};max-width:64ch;">${esc(CP.mission.p3)}</p>
    <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:28px;color:${K.accent};">${esc(CP.mission.closing)}</p>
  </section>`;

const stats = (K) => `
  <section style="padding:44px 56px;background:${K.bg};border-top:1px solid ${K.rule};border-bottom:1px solid ${K.rule};">
    <div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:14px;">
      ${CP.stats.items.map((s) => `<div>
        <div style="font-size:30px;font-weight:800;color:${K.ink};letter-spacing:-0.02em;">${esc(s.value)}</div>
        <div style="font-size:10.5px;letter-spacing:0.14em;color:${K.muted};margin-top:3px;">${esc(s.label.toUpperCase())}</div>
        ${s.status.startsWith('NEEDS') ? `<div style="font-size:9px;color:${K.tag};margin-top:3px;">NEEDS SEAN NUMBER</div>` : ''}
      </div>`).join('\n      ')}
    </div>
  </section>`;

const testimonials = (K) => `
  <section style="padding:66px 56px;background:${K.surface};">
    <div style="font-size:11px;letter-spacing:0.26em;color:${K.accent};margin-bottom:16px;">IV &middot; PROOF FROM PEOPLE</div>
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;">
      ${CP.testimonials.map((t) => `<div style="border:1px solid ${K.rule};border-radius:${K.radius}px;padding:18px;background:${K.card};">
        <div style="font-size:14px;line-height:1.6;color:${K.body};">&ldquo;${esc(t.quote)}&rdquo;</div>
        <div style="margin-top:12px;font-size:12px;font-weight:700;color:${K.ink};">${esc(t.author)} &middot; <span style="font-weight:500;color:${K.muted};">${esc(t.descriptor)}</span></div>
        <div style="margin-top:5px;display:inline-block;font-size:11px;letter-spacing:0.1em;color:${K.accent};border:1px solid ${K.rule};border-radius:99px;padding:3px 10px;">${esc(t.result)}</div>
      </div>`).join('\n      ')}
    </div>
  </section>`;

const programs = (K) => `
  <section style="padding:66px 56px;background:${K.bg};">
    <div style="font-size:11px;letter-spacing:0.26em;color:${K.accent};margin-bottom:14px;">V &middot; ${esc(CP.programs.section_title.toUpperCase())}</div>
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;">
      ${CP.programs.tiers.map((t) => `<div style="border:1px solid ${K.rule};border-radius:${K.radius}px;padding:20px;background:${K.card};display:flex;flex-direction:column;gap:8px;">
        ${t.badge ? `<div style="align-self:flex-start;font-size:10px;letter-spacing:0.14em;color:${K.btnFg};background:${K.accent};padding:3px 9px;border-radius:99px;">${esc(t.badge.toUpperCase())}</div>` : ''}
        <div style="font-size:19px;font-weight:800;color:${K.ink};">${esc(t.name)}</div>
        <div style="font-size:12px;letter-spacing:0.12em;color:${K.muted};">${esc(t.meta.toUpperCase())}</div>
        <ul style="margin:6px 0 0;padding-left:16px;color:${K.body};font-size:13px;line-height:1.65;">
          ${t.features.map((f) => `<li>${esc(f)}</li>`).join('')}
        </ul></div>`).join('\n      ')}
    </div>
  </section>`;

const movie = (K, n, title, brief, secs, art) => `
  <section style="padding:0 56px 14px;background:${K.bg};">
    <div style="position:relative;border:1px solid ${K.rule};border-radius:${K.radius}px;overflow:hidden;
      min-height:280px;display:flex;flex-direction:column;justify-content:flex-end;padding:24px;background:${K.card};">
      <img src="${art}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:${K.movieArt};">
      <div style="position:relative;display:flex;flex-direction:column;gap:7px;">
        <div style="font-size:10px;letter-spacing:0.24em;color:${K.tag};">MOVIE AREA ${n} &middot; MINIMAX H3</div>
        <div style="font-size:24px;font-weight:700;color:${K.ink};">${esc(title)}</div>
        <div style="font-size:13.5px;line-height:1.6;color:${K.body};max-width:62ch;">${esc(brief)}</div>
        <div style="font-size:11px;letter-spacing:0.14em;color:${K.muted};">TARGET ${secs}s &middot; SWAPPABLE SLOT</div>
      </div>
    </div>
  </section>`;

// Trainer half — kept, deliberately demoted below the community half.
const forTrainers = (K) => `
  <section id="trainers" style="padding:60px 56px;background:${K.surface};border-top:1px solid ${K.rule};">
    <div style="font-size:11px;letter-spacing:0.26em;color:${K.accent};margin-bottom:12px;">VI &middot; IF YOU ARE A TRAINER OR A CREATOR</div>
    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;">
      ${CP.for_trainers.features.map((f) => `<div>
        <div style="font-size:14px;font-weight:700;color:${K.ink};margin-bottom:4px;">${esc(f.title)}</div>
        <div style="font-size:12.5px;line-height:1.55;color:${K.body};">${esc(f.desc)}</div>
        ${/10%/.test(f.desc) ? `<div style="font-size:9.5px;color:${K.tag};margin-top:5px;">⚠ CONTRADICTS the 15% + $1,000 cap decision — Sean to resolve</div>` : ''}
      </div>`).join('\n      ')}
    </div>
  </section>`;

const closing = (K) => `
  <section id="join" style="padding:76px 56px 88px;background:${K.bg};">
    <h2 style="font-size:${K.h2 + 4}px;font-weight:800;color:${K.ink};margin-bottom:12px;${K.h2extra || ''}">${esc(CP.cta.title)}</h2>
    <p style="font-size:16px;line-height:1.7;color:${K.body};max-width:70ch;margin:0 0 22px;">${esc(CP.cta.body)}</p>
    ${cta(K)}
  </section>`;

const wordmark = (K) => `
  <section style="background:${K.footBg};padding:28px 40px 24px;">
    <div style="font-size:88px;line-height:0.9;font-weight:800;letter-spacing:-0.03em;color:${K.footFg};white-space:nowrap;">SWANSTUDIOS</div>
  </section>`;

const shell = (K, body) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>
    body { margin:0; font-family:${K.font}; background:${K.bg}; }
    a { color:${K.accent}; } a:hover { color:${K.ink}; }
    h1,h2 { text-wrap:balance; margin:0; }
    @media (prefers-reduced-motion: reduce) { * { animation:none !important; transition:none !important; } }
  </style>
</helmet>
<div style="width:1280px;background:${K.bg};color:${K.ink};">
${HEADER}
${body}
</div>
</x-dc>
<script data-dc-script data-props='{"accent":{"editor":"color","default":"${K.accent}","options":["#60C0F0","#C6A84B","#8B5CF6","#E0ECF4"]}}'>
class Component extends DCLogic {
  renderVals() { return { accent: this.props.accent ?? '${K.accent}' }; }
}
</script>
</body>
</html>
`;

/* ─── the five themes ──────────────────────────────────────────────────────── */

const OBSIDIAN_GOLD = {
  bg: '#0A0A0F', surface: '#111119', card: 'rgba(255,255,255,0.03)', ink: '#E0ECF4',
  body: '#B9CBDC', muted: '#7C8A9C', accent: '#C6A84B', tag: '#C6A84B', rule: 'rgba(198,168,75,0.22)',
  btnBg: '#C6A84B', btnFg: '#0A0A0F', glow: 'rgba(198,168,75,0.28)', radius: 2, movieArt: '0.22',
  h2: 40, h2w: 800, font: "'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif",
  h2extra: 'letter-spacing:-0.03em;',
};
const ICE_WING = {
  bg: '#050A1C', surface: '#0A1430', card: 'rgba(0,32,96,0.35)', ink: '#E0ECF4',
  body: '#B9CBDC', muted: '#8FA8C8', accent: '#60C0F0', tag: '#C6A84B', rule: 'rgba(96,192,240,0.20)',
  btnBg: '#002060', btnFg: '#E0ECF4', glow: 'rgba(139,92,246,0.40)', radius: 10, movieArt: '0.30',
  h2: 36, h2w: 700, font: "'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif",
};
const NEIGHBOURHOOD = {
  bg: '#F4EFE4', surface: '#EAE2D2', card: '#FFFFFF', ink: '#161410',
  body: '#4A453C', muted: '#7A7266', accent: '#0F4C3A', tag: '#8A6A1F', rule: 'rgba(22,20,16,0.16)',
  btnBg: '#161410', btnFg: '#F4EFE4', glow: 'rgba(15,76,58,0.18)', radius: 14, movieArt: '0.40',
  h2: 46, h2w: 800, font: "Georgia,'Cormorant Garamond',serif",
  h2extra: 'letter-spacing:-0.02em;',
};
const SIGNAL = {
  bg: '#07080C', surface: '#0B0D13', card: 'rgba(242,232,213,0.05)', ink: '#F2E8D5',
  body: '#C6BCA8', muted: '#8B8474', accent: '#C6A84B', tag: '#C6A84B', rule: 'rgba(242,232,213,0.18)',
  btnBg: '#F2E8D5', btnFg: '#07080C', glow: 'rgba(242,232,213,0.22)', radius: 6, movieArt: '0.26',
  h2: 38, h2w: 600, font: "'Cormorant Garamond',Georgia,serif",
  h2extra: "text-shadow:0 0 22px rgba(242,232,213,0.34),0 0 60px rgba(198,168,75,0.22);",
};
const RECORD = {
  bg: '#12100E', surface: '#1A1714', card: 'rgba(255,255,255,0.04)', ink: '#F5F1E8',
  body: '#BDB4A4', muted: '#8C8474', accent: '#8B5CF6', tag: '#C6A84B', rule: 'rgba(245,241,232,0.16)',
  btnBg: '#8B5CF6', btnFg: '#12100E', glow: 'rgba(96,192,240,0.34)', radius: 0, movieArt: '0.24',
  h2: 42, h2w: 400, font: "'Cormorant Garamond',Georgia,serif",
  h2extra: 'letter-spacing:-0.01em;',
};

const hero = (K, opts) => `
  <section style="position:relative;">
    ${stage([
      plate(-280, opts.plate, opts.plateOpacity),
      layer(-140, `<div style="position:absolute;inset:0;background:${opts.wash};"></div>`),
      layer(-40, `<img src="${SWANS}" alt="the swans, from Sean's own film" style="width:100%;height:100%;object-fit:cover;opacity:${opts.filmOpacity};">
        <div style="position:absolute;left:18px;bottom:14px;font-size:10px;letter-spacing:0.2em;color:${K.tag};
          background:rgba(6,9,15,0.66);padding:6px 10px;border-radius:6px;">SWANS.MP4 &middot; REAL FRAME &middot; SWAPPABLE SLOT</div>`),
      layer(0, `<div style="position:absolute;inset:0;background:${opts.scrim};"></div>`),
    ], 700, K.surface)}
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:${opts.justify};padding:0 56px ${opts.padBottom}px;gap:16px;${opts.align || ''}">
      <div style="font-size:11px;letter-spacing:0.30em;color:${K.accent};">SWANSTUDIOS &middot; ${opts.eyebrow}</div>
      <h1 style="font-size:${opts.h1}px;line-height:1.02;font-weight:${opts.h1w};color:${K.ink};max-width:18ch;${opts.h1extra || ''}">${esc(CP.hero.headline)}</h1>
      <p style="font-size:20px;line-height:1.5;color:${K.body};max-width:46ch;margin:0;font-weight:500;">${esc(CP.hero.sub)}</p>
      ${cta(K)}
    </div>
  </section>`;

const board = (K, opts, extras = []) => shell(K, [
  hero(K, opts),
  beyond(K, opts.beyondLayout),          // COMMUNITY LEADS
  movie(K, 1, opts.movie1[0], opts.movie1[1], opts.movie1[2], SWANS_B),
  whatWeDo(K),
  manifesto(K),
  stats(K),
  testimonials(K),
  ...extras,
  programs(K),
  movie(K, 2, opts.movie2[0], opts.movie2[1], opts.movie2[2], P.night),
  forTrainers(K),                        // trainer half, demoted
  closing(K),
  wordmark(K),
].join('\n'));

const BOARDS = [
  ['Main.dc.html', 'T1 · Obsidian & Gold', board(OBSIDIAN_GOLD, {
    plate: P.night, plateOpacity: '0.42', filmOpacity: '0.70', beyondLayout: 'board',
    wash: 'radial-gradient(100% 70% at 50% 100%,rgba(198,168,75,0.16),rgba(10,10,15,0) 62%)',
    scrim: 'linear-gradient(180deg,rgba(10,10,15,0.20),rgba(10,10,15,0.92))',
    justify: 'flex-end', padBottom: 56, eyebrow: 'THE RECORD OF A COMMUNITY', h1: 62, h1w: 800,
    h1extra: 'letter-spacing:-0.035em;',
    movie1: ['The Neighbourhood at Night', 'Doors opening across a neighbourhood — a walking club, a garage band, a late set. The swans pass over all of it once.', 14],
    movie2: ['One Session End to End', 'Arrival, the work, the record forming. Shot like a black-and-white contact sheet with one gold frame.', 20],
  })],
  ['IceWing.dc.html', 'T2 · Ice Wing', board(ICE_WING, {
    plate: P.water, plateOpacity: '0.58', filmOpacity: '0.80', beyondLayout: 'grid',
    wash: 'radial-gradient(110% 70% at 50% 100%,rgba(96,192,240,0.18),rgba(5,10,28,0) 62%)',
    scrim: 'linear-gradient(180deg,rgba(5,10,28,0.10),rgba(5,10,28,0.86))',
    justify: 'center', padBottom: 0, eyebrow: 'CRYSTALLINE', h1: 58, h1w: 800,
    movie1: ['The Harbor at Night', 'Still water, a shoreline of lit windows, each one somebody finishing a set. Ends on one window going bright.', 12],
    movie2: ['The Record In Motion', 'A logged set condensing into a faceted crystalline record, turning once so every facet catches the light.', 15],
  })],
  ['Neighbourhood.dc.html', 'T3 · The Neighbourhood', board(NEIGHBOURHOOD, {
    plate: P.harbor, plateOpacity: '0.30', filmOpacity: '0.55', beyondLayout: 'board',
    wash: 'linear-gradient(180deg,rgba(244,239,228,0.10),rgba(244,239,228,0.55))',
    scrim: 'linear-gradient(180deg,rgba(244,239,228,0.30),rgba(244,239,228,0.88))',
    justify: 'flex-end', padBottom: 48, eyebrow: 'YOUR PEOPLE, NEARBY', h1: 66, h1w: 800,
    movie1: ['Walking Club, Tuesday', 'Six people who met on the platform walking a real street at dusk. No gym. Handheld, warm, unglamorous on purpose.', 12],
    movie2: ['Open Mic in the Back Room', 'The comedy and music categories made literal — somebody from the app on a small stage, the room laughing.', 18],
  })],
  ['TheSignal.dc.html', 'T4 · The Signal', board(SIGNAL, {
    plate: P.water, plateOpacity: '0.40', filmOpacity: '0.86', beyondLayout: 'ticker',
    wash: 'radial-gradient(70% 60% at 50% 62%,rgba(242,232,213,0.14),rgba(7,8,12,0) 68%)',
    scrim: 'linear-gradient(180deg,rgba(7,8,12,0.40),rgba(7,8,12,0.90))',
    justify: 'center', padBottom: 0, eyebrow: 'THE SIGNAL', h1: 54, h1w: 600,
    h1extra: "font-family:'Cormorant Garamond',Georgia,serif;text-shadow:0 0 22px rgba(242,232,213,0.42),0 0 60px rgba(198,168,75,0.30);",
    movie1: ['The Signal', 'The swans arriving out of fog, lit from behind, the frame held long enough that the light does the work.', 16],
    movie2: ['One Session End to End', 'Arrival, the work, the record forming as a faceted crystal in the same haze the page lives in.', 20],
  })],
  ['TheRecord.dc.html', 'T5 · The Record', board(RECORD, {
    plate: P.about, plateOpacity: '0.46', filmOpacity: '0.74', beyondLayout: 'grid',
    wash: 'linear-gradient(120deg,rgba(139,92,246,0.20),rgba(18,16,14,0) 60%)',
    scrim: 'linear-gradient(180deg,rgba(18,16,14,0.18),rgba(18,16,14,0.90))',
    justify: 'center', padBottom: 0, eyebrow: 'AN EDITION', h1: 56, h1w: 400,
    h1extra: "font-family:'Cormorant Garamond',Georgia,serif;",
    movie1: ['Issue One', 'The community as a printed edition coming to life — pages turning into real rooms, real people, real sessions.', 14],
    movie2: ['The Record In Motion', 'A logged set condensing into a faceted crystalline record, shot like a press plate being struck.', 15],
  })],
];

const W = 1280, H = 6200, GAP = 240;
const artboards = [], annotations = [];
const NOTES = [
  'T1 · OBSIDIAN & GOLD — Sean taste profile #1 (black + white + gold). Editorial and high-contrast: square corners, hairline gold rules, no glass. Gold obeys the allowlist — hairline rules, one badge, the CTA.\n\nMOBBIN (L3 evidence, not canon): Shopify Editions — the page as a numbered edition.\n\nTRADEOFF: the most severe. Reads authoritative and expensive, and least like a place you would casually join.',
  'T2 · ICE WING — Sean taste profile #2 (black + white + blue). The Crystalline Swan canon as-is: sapphire surfaces, Ice Wing accents, purple glow on blue buttons, 10px radii.\n\nMOBBIN: none borrowed — this is the house style, included as the control against which the other four are judged.\n\nTRADEOFF: the safest and the most familiar; it is what the site already looks like, so it wins nothing new.',
  'T3 · THE NEIGHBOURHOOD — the answer to Sean\'s actual note: the client arriving for community, not the trainer. LIGHT ground, serif display, warm paper, deep-green accent. Feels like a notice board in a real place.\n\nMOBBIN: Busy Bee Honey — flat bold colour fields, labelled cards, giant footer wordmark.\n\n⚠ The green here is #0F4C3A used as an ACCENT ONLY. Per swan-element-intelligence §6 there is NO approved client green token; this is a TOKEN_PROPOSAL at TRIAL, not canon. Sean approves or it reverts to gold.\n\nTRADEOFF: breaks dark-first hardest. It is the only one a stranger would call friendly, and the only one that does not look like the rest of the product.',
  'T4 · THE SIGNAL — warm-cream serif GLOWING out of volumetric fog; the swans frame is the object inside the haze.\n\nMOBBIN: Shader (Norrköping) — glow-bloom display type, hero object in fog, institutional chrome.\n\nTRADEOFF: the most atmospheric and the least scannable. Eight community categories in fog is a lot of reading in low contrast — this one most needs a contrast audit before it is real.',
  'T5 · THE RECORD — the page as a printed edition. Serif at light weight, zero radii, violet accent against warm near-black, ink-on-press feeling.\n\nMOBBIN: Shopify Editions (masthead + numbered index) crossed with press-plate texture.\n\nTRADEOFF: the most "designed" and the slowest to the point. Beautiful for a brand film, risky for someone who googled a trainer near them.',
];

BOARDS.forEach(([file, title, html], i) => {
  fs.writeFileSync(path.join(here, file), html, 'utf8');
  const x = i * (W + GAP);
  artboards.push({ file, title, x, y: 0, w: W, h: H });
  annotations.push({ id: `note-t${i + 1}`, x, y: -420, w: 440, text: NOTES[i] });
});

annotations.push({
  id: 'themes-manifest', x: -540, y: 0, w: 470,
  text: `FIVE THEMES — 2026-08-20\n\nSean: five completely different themes from the Swan design brain, with the Mobbin MCP informing the elements — AND the client/community half leading instead of the trainer half.\n\nWHAT CHANGED FROM EVERY EARLIER RUN:\n• BEYOND THE GYM and its EIGHT categories now lead, immediately after the hero. The trainer half is kept but demoted to section VI.\n• Copy comes from copy-pack-full.json — 40 blocks. The previous pack carried 12 fields and covered 4 of 13 mounted sections, so every earlier design was built against a third of the page.\n• The full WHAT WE DO list (8), programs with real badges, 3 testimonials with named results, 6 stats, and the trainer features are all present for the first time.\n\nGOVERNANCE (mobbin-learning-system.md):\nMobbin observations enter at L3/L5 as evidence only. L6 adjudication and L7 canon are HUMAN-ONLY. Each theme's note names what it borrowed so you can accept or reject individually. Nothing here has been promoted to canon.\n\nFLAGGED, NOT DECIDED:\n• Trainer fee — the live page says ~10%, the grill decided 15% with a $1,000 cap. Marked in-artboard on every theme.\n• Stats marked NEEDS SEAN NUMBER are marked on the page too, so no theme hardens an unconfirmed figure.\n• T3's green is a TOKEN_PROPOSAL at TRIAL — there is no approved client green.\n\nTHEME 6, NOT BUILT: black + white + green as a full palette. Your taste profile records it as a real preference, but Cyberforest green is operator-only and no client green token exists. Say the word and it becomes a token proposal rather than a mockup pretending to be canon.`,
});

fs.writeFileSync(path.join(here, 'canvas.json'),
  JSON.stringify({ artboards, annotations, launch: { view: 'canvas' } }, null, 2) + '\n', 'utf8');

console.log(`wrote ${artboards.length} theme artboards + canvas.json`);
console.log(`header verbatim: ${HEADER.length}B · copy blocks: ${
  CP.beyond_the_gym.categories.length + CP.what_we_do.features.length + CP.programs.tiers.length
  + CP.testimonials.length + CP.stats.items.length + CP.for_trainers.features.length}`);
