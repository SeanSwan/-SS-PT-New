#!/usr/bin/env node
/**
 * build-final2.mjs — Sean's kill pass: only D2 (vegas-mile) and B1 (harbor-lights) survive.
 *
 * HIS FOUR INSTRUCTIONS THIS PASS:
 *  1. KEEP THE EXISTING HEADER. "we're not gonna get rid of my header or change that style in
 *     any way. They need to adapt to what I already have." -> both boards render a faithful
 *     replica of frontend/src/components/Header/header.tsx (64px fixed glass, blur, real nav)
 *     and lay their content out BELOW it. No design draws its own top nav.
 *  2. MORE PARALLAX. Depth stages between every chapter, not only in the hero.
 *  3. AT LEAST TWO MOVIE AREAS between sections, for films he will make with MiniMax H3.
 *  4. THE HEADER HERO IS A VIDEO BACKGROUND — the swans-in-a-lake footage he already has.
 *     "We're not gonna get rid of that." He may later swap in a better H3 film, so the hero
 *     is a named SLOT (D9) whose current source is Swans.mp4.
 *
 * HARVESTED, NOT DRAWN (the lesson from three repeats):
 *   - header structure/nav from the real component
 *   - hero poster = a real frame pulled from the real Swans.mp4 (23.976fps, 25.23s, 17.1MB)
 *   - cosmic-swan plates from frontend/public/images/parallax/
 *   - crystalline mark from frontend/public/Logo.png
 */
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const pack = JSON.parse(fs.readFileSync(path.join(here, 'copy-pack.json'), 'utf8'));
const C = pack.verbatim, CR = pack.creative;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const NEW = '<span style="font-size: 10px; letter-spacing: 0.06em; color: #C6A84B; white-space: nowrap;"> [new copy - needs Sean approval]</span>';

const L = {
  B1: { sky: '#0C1226', deep: '#06090F', warm: '#D8A24B', cool: '#5A93D8', ink: '#E0ECF4', mute: '#8FA0B8', name: 'dusk' },
  D2: { sky: '#04060E', deep: '#010204', warm: '#C6A84B', cool: '#8B5CF6', ink: '#E0ECF4', mute: '#9A8FB8', name: 'deep night neon' },
};

const bg = (file, o = 1) => `<img src="${file}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;opacity:${o}">`;
const logoMark = (w = 120, o = 1) => `<img src="swan-logo.png" alt="SwanStudios" style="width:${w}px;height:${w}px;display:block;opacity:${o}">`;

const figures = (c, n, o, scale = 1) => `<svg viewBox="0 0 1280 120" preserveAspectRatio="none" style="width:100%;height:100%;display:block;opacity:${o}">${Array.from({ length: n }, (_, i) => { const x = 40 + ((i * 1493) % 1200); const h = (16 + ((i * 7) % 9)) * scale; const y = 110 - h; return `<g fill="${c}"><ellipse cx="${x}" cy="${y - h * 0.16}" rx="${h * 0.13}" ry="${h * 0.15}"/><rect x="${x - h * 0.11}" y="${y}" width="${h * 0.22}" height="${h * 0.62}" rx="${h * 0.09}"/></g>`; }).join('')}</svg>`;

const windows = (warm, cool, cols, rows, lit = 0.55) => `<svg viewBox="0 0 ${cols * 40} ${rows * 46}" preserveAspectRatio="none" style="width:100%;height:100%;display:block">${Array.from({ length: cols * rows }, (_, i) => { const cx = (i % cols) * 40, cy = Math.floor(i / cols) * 46; const on = ((i * 79) % 100) / 100 < lit; return `<rect x="${cx + 6}" y="${cy + 6}" width="26" height="32" rx="2" fill="${on ? warm : cool}" opacity="${on ? (0.34 + ((i * 13) % 50) / 100).toFixed(2) : 0.10}"/>`; }).join('')}</svg>`;

/** Parallax stage: perspective + translateZ. Instruction 2 — used between chapters too. */
function stage(height, layers) {
  return `<div style="position: relative; height: ${height}px; overflow: hidden; perspective: 12px; perspective-origin: 50% 50%; transform-style: preserve-3d;">
    ${layers.map((l) => {
      const z = l.z ?? 0, s = (12 - z) / 12;
      return `<div style="position:absolute;left:0;right:0;${l.pos || 'top:0;bottom:0;'}transform:translateZ(${z}px) scale(${s.toFixed(3)});transform-origin:50% 50%;${l.blur ? `filter:blur(${l.blur}px);` : ''}${l.style || ''}">${l.html}</div>`;
    }).join('\n    ')}
  </div>`;
}

/* ── INSTRUCTION 1 — SEAN'S REAL HEADER, REPLICATED, NOT REDESIGNED ──────────
   Source: frontend/src/components/Header/header.tsx (247 lines)
     position: fixed · height: calc(var(--header-height,64px) + safe-area)
     backdrop-filter: blur(12px) saturate(1.2)  ->  blur(20px) saturate(1.8) when scrolled
     border-bottom: 1px solid var(--border-soft) · padding 0 24px desktop
   Nav from components/NavigationLinks.tsx + DesktopMoreMenu.tsx:
     Home · Store · Video Library · Waiver · Contact · (more) Photography · About
     actions: Login · Sign Up                                                    */
const HEADER_H = 64;
function swanHeader() {
  const link = (t) => `<a href="#" style="text-decoration:none;color:#D6E4F0;font-size:13.5px;font-weight:600;letter-spacing:0.01em;min-height:44px;display:inline-flex;align-items:center;padding:0 2px;">${t}</a>`;
  return `<header style="position:sticky;top:0;z-index:50;height:${HEADER_H}px;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:0 24px;
      background:rgba(10,16,34,0.72);backdrop-filter:blur(20px) saturate(1.8);-webkit-backdrop-filter:blur(20px) saturate(1.8);
      border-bottom:1px solid rgba(96,192,240,0.18);box-shadow:0 1px 0 rgba(255,255,255,0.04);">
    <div style="display:flex;align-items:center;gap:10px;min-width:0;">
      ${logoMark(36)}
      <span style="font-weight:800;font-size:15px;letter-spacing:0.02em;color:#E0ECF4;white-space:nowrap;">SwanStudios</span>
    </div>
    <nav style="display:flex;align-items:center;gap:22px;">
      ${['Home', 'Store', 'Video Library', 'Waiver', 'Contact', 'Photography', 'About'].map(link).join('\n      ')}
    </nav>
    <div style="display:flex;align-items:center;gap:10px;">
      <a href="#" style="text-decoration:none;color:#D6E4F0;font-size:13.5px;font-weight:600;min-height:44px;display:inline-flex;align-items:center;padding:0 12px;">Login</a>
      <a href="#" style="text-decoration:none;color:#E0ECF4;font-size:13.5px;font-weight:700;min-height:44px;display:inline-flex;align-items:center;padding:0 16px;border-radius:8px;background:#002060;box-shadow:0 0 18px rgba(139,92,246,0.35);">Sign Up</a>
    </div>
  </header>
  <div style="height:2px;background:linear-gradient(90deg,#60C0F0 0%,#8B5CF6 50%,#C6A84B 100%);opacity:0.55;"></div>
  <div style="padding:6px 24px;font-size:10px;letter-spacing:0.16em;color:#7C93AD;border-bottom:1px solid rgba(255,255,255,0.06);">EXISTING HEADER &mdash; REPLICATED FROM components/Header/header.tsx &middot; NOT REDESIGNED &middot; 64px fixed glass</div>`;
}

/* ── INSTRUCTION 4 — the hero IS the swans video (a named slot, swappable for H3) ── */
function heroVideo(l, h, overlayHtml) {
  return stage(h, [
    { z: -11, html: bg('swans-hero-frame.jpg', 1), blur: 0 },
    { z: -8, html: `<div style="height:100%;background:linear-gradient(180deg, rgba(4,8,20,0.30) 0%, rgba(4,8,20,0.55) 55%, ${l.deep} 100%)"></div>` },
    { z: -4, html: figures('#0A1220', 5, 0.5, 0.8), pos: 'bottom: 4%; height: 10%;' },
    {
      z: 0, html: `<div style="height:100%;display:flex;flex-direction:column;justify-content:flex-end;padding:0 44px 42px;gap:16px;">
      <div style="display:inline-flex;align-items:center;gap:9px;align-self:flex-start;padding:6px 13px;border-radius:999px;border:1px solid ${l.cool}66;background:rgba(0,0,0,0.42);backdrop-filter:blur(6px);">
        <span style="width:8px;height:8px;border-radius:50%;background:${l.warm};box-shadow:0 0 8px ${l.warm};"></span>
        <span style="font-family:'Fira Code',monospace;font-size:10px;letter-spacing:0.2em;color:${l.ink};">VIDEO SLOT &middot; Swans.mp4 &middot; SWAPPABLE FOR H3</span>
      </div>
      ${overlayHtml}
    </div>`,
    },
  ]);
}

/* ── INSTRUCTION 3 — MOVIE AREAS between sections, for films Sean makes with H3 ── */
function movieSlot(l, n, title, note, plate, h = 420) {
  return stage(h, [
    { z: -11, html: bg(plate, 0.85), blur: 1.2 },
    { z: -7, html: `<div style="height:100%;background:radial-gradient(80% 70% at 50% 50%, rgba(0,0,0,0.10) 0%, ${l.deep}E6 100%)"></div>` },
    { z: -3, html: figures(l.deep, 8, 0.55, 0.9), pos: 'bottom: 0; height: 16%;' },
    {
      z: 0, html: `<div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:0 60px;">
      <div style="width:74px;height:74px;border-radius:50%;border:2px solid ${l.cool};display:grid;place-items:center;box-shadow:0 0 30px ${l.cool}66;background:rgba(0,0,0,0.34);">
        <svg viewBox="0 0 24 24" style="width:28px;height:28px;margin-left:4px;"><path d="M7 4 L20 12 L7 20 Z" fill="${l.ink}"/></svg>
      </div>
      <div style="font-family:'Fira Code',monospace;font-size:10px;letter-spacing:0.24em;color:${l.warm};">MOVIE AREA ${n} &middot; MINIMAX H3</div>
      <div style="font-size:26px;font-weight:700;color:${l.ink};">${title}${NEW}</div>
      <div style="font-size:13.5px;line-height:1.55;color:${l.ink};opacity:0.86;max-width:62ch;">${note}${NEW}</div>
    </div>`,
    },
  ]);
}

const manifesto = (l, size = 24) => `
  <p style="margin:0;font-size:${size}px;line-height:1.48;color:${l.ink};font-weight:500;text-wrap:pretty;">${esc(C.mission_1)}</p>
  <p style="margin:0;font-size:${Math.round(size * 0.74)}px;line-height:1.66;color:${l.mute};max-width:60ch;">${esc(C.mission_2)}</p>
  <p style="margin:0;font-size:${Math.round(size * 0.74)}px;line-height:1.66;color:${l.mute};max-width:60ch;">${esc(C.mission_3)}</p>
  <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:${Math.round(size * 1.16)}px;line-height:1.32;color:${l.warm};">${esc(C.mission_closing)}</p>`;

const DISCIPLINES = [
  ['Training', 'Strength, power, mobility &mdash; logged against a written plan.', true],
  [esc(CR.dance_title), esc(CR.dance_desc), false],
  [esc(CR.art_title), esc(CR.art_desc), false],
  [esc(CR.vocal_title), esc(CR.vocal_desc), false],
  ['Photography &amp; Graphic Design', 'Shoot it, design it, publish it &mdash; the studio is part of the membership.', true],
  [esc(CR.community_title), esc(CR.community_desc), false],
];

const disciplineCards = (l, cols) => `<div style="display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:12px;">
  ${DISCIPLINES.map(([t, d, n]) => `<div style="display:flex;flex-direction:column;gap:8px;padding:16px;border:1px solid ${l.cool}30;border-radius:12px;background:#FFFFFF07;">
    <div style="font-size:15px;font-weight:700;color:${l.ink};">${t}${n ? NEW : ''}</div>
    <div style="font-size:12.5px;line-height:1.5;color:${l.mute};">${d}</div></div>`).join('\n  ')}
</div>`;

const chart = (l, h = 150) => `<svg viewBox="0 0 600 ${h}" style="width:100%;height:${h}px;display:block">
  <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${l.cool}" stop-opacity="0.30"/><stop offset="1" stop-color="${l.cool}" stop-opacity="0"/></linearGradient></defs>
  <path d="M0 ${h - 18} L100 ${h - 40} L200 ${h - 34} L300 ${h - 66} L400 ${h - 84} L500 ${h - 108} L600 ${h - 128} L600 ${h} L0 ${h} Z" fill="url(#cg)"/>
  <path d="M0 ${h - 18} L100 ${h - 40} L200 ${h - 34} L300 ${h - 66} L400 ${h - 84} L500 ${h - 108} L600 ${h - 128}" stroke="${l.cool}" stroke-width="2.4" fill="none"/>
  <path d="M0 ${h - 24} L600 ${h - 118}" stroke="${l.warm}" stroke-width="1.6" stroke-dasharray="5 5" fill="none" opacity="0.8"/></svg>
<div style="font-size:11px;color:${l.mute};margin-top:6px;">Gold = the written plan. Blue = sessions actually logged. Labelled demo dataset.${NEW}</div>`;

const economics = (l) => `<div style="display:flex;flex-direction:column;gap:10px;padding:22px;border:1px solid ${l.warm}55;border-radius:14px;background:#FFFFFF07;">
  <div style="font-size:11px;letter-spacing:0.20em;color:${l.warm};">IF YOU ARE A TRAINER OR A CREATOR</div>
  <div style="font-size:44px;font-weight:800;line-height:1;color:${l.warm};">15%</div>
  <div style="font-size:15px;line-height:1.55;color:${l.ink};">Never more than <strong>$1,000 a month</strong>. Card processing included. No monthly fee, no setup fee. We only make money when you do.${NEW}</div></div>`;

const fork = (l) => `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;">
  <a href="#" style="display:flex;flex-direction:column;gap:8px;padding:26px;border-radius:16px;background:#002060;text-decoration:none;color:${l.ink};box-shadow:0 0 28px rgba(139,92,246,0.32);min-height:44px;">
    <div style="font-size:22px;font-weight:700;">${esc(C.cta_secondary)}</div>
    <div style="font-size:13px;color:#B9CBDC;">Browse real trainers and creators before you sign up.${NEW}</div></a>
  <a href="#" style="display:flex;flex-direction:column;gap:8px;padding:26px;border-radius:16px;background:#3B1E7A;text-decoration:none;color:${l.ink};box-shadow:0 0 28px rgba(96,192,240,0.30);min-height:44px;">
    <div style="font-size:22px;font-weight:700;">Build your practice here${NEW}</div>
    <div style="font-size:13px;color:#D9CBF0;">Bring your clients. Keep your business. One email to start.${NEW}</div></a></div>
<div style="font-size:11px;color:${l.warm};margin-top:10px;">&#9888; The second door has no destination yet &mdash; /trainers capture funnel is a hard dependency (F5).</div>`;

const footer = (l, id) => `<footer style="padding:36px 44px 46px;border-top:1px solid #FFFFFF14;display:flex;flex-direction:column;gap:9px;">
  <div style="font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:19px;color:${l.warm};">${esc(C.mission_closing)}</div>
  <div style="font-size:12px;color:${l.mute};">Motion and iconography generated with MiniMax H3.</div>
  <div style="font-size:10px;color:#55708C;">${esc(id)}</div></footer>`;

const shell = (l, body) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>
    body { margin:0; font-family:'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif; background:${l.deep}; }
    a { color:${l.cool}; } a:hover { color:${l.ink}; }
    h1,h2 { text-wrap:balance; margin:0; }
  </style>
</helmet>
<div style="width:1280px;background:${l.deep};color:${l.ink};">
${body}
</div>
</x-dc>
<script data-dc-script data-props='{"accent":{"editor":"color","default":"${l.cool}","options":["#60C0F0","#C6A84B","#8B5CF6","#E0ECF4"]}}'>
class Component extends DCLogic { renderVals() { return { accent: this.props.accent ?? '${l.cool}' }; } }
</script>
</body>
</html>
`;

/* ══ B1 · HARBOR LIGHTS — left rail + wall of lit windows, under Sean's header ══ */
function B1() {
  const l = L.B1;
  return shell(l, `
${swanHeader()}
<div style="display:flex;">
  <nav style="width:92px;flex-shrink:0;border-right:1px solid ${l.cool}22;padding:26px 0;display:flex;flex-direction:column;align-items:center;gap:24px;position:sticky;top:${HEADER_H}px;align-self:flex-start;">
    <div style="font-family:'Fira Code',monospace;font-size:9px;letter-spacing:0.18em;color:${l.warm};writing-mode:vertical-rl;">SECTION RAIL</div>
    ${['WORLD', 'WHY', 'MAKE', 'PROOF', 'JOIN'].map((t) => `<a href="#f" style="writing-mode:vertical-rl;text-decoration:none;font-size:11px;letter-spacing:0.24em;min-height:44px;color:${l.mute};">${t}</a>`).join('\n    ')}
  </nav>
  <main style="flex-grow:1;min-width:0;">
    ${heroVideo(l, 560, `<h1 style="font-size:50px;line-height:1.05;font-weight:800;">${esc(C.headline)}</h1>
      <p style="margin:0;font-size:19px;line-height:1.5;color:#D6E4F0;font-weight:500;max-width:52ch;">${esc(C.sub)}</p>
      <div style="display:flex;gap:12px;">
        <a href="#f" style="display:inline-flex;align-items:center;min-height:48px;padding:0 26px;border-radius:10px;background:#002060;color:${l.ink};text-decoration:none;font-weight:700;box-shadow:0 0 24px rgba(139,92,246,0.35);">${esc(C.cta_primary)}</a>
        <a href="#f" style="display:inline-flex;align-items:center;min-height:48px;padding:0 22px;border-radius:10px;border:1px solid ${l.cool}66;color:${l.ink};text-decoration:none;">${esc(C.cta_secondary)}</a>
      </div>`)}

    ${stage(300, [
      { z: -11, html: bg('social-hero-bg.jpg', 0.9), blur: 1.4 },
      { z: -6, html: windows(l.warm, '#1B2740', 30, 7, 0.5), blur: 0.8, pos: 'top:18%;height:64%;' },
      { z: -2, html: figures('#050810', 14, 0.9, 1.1), pos: 'bottom:0;height:22%;' },
      { z: 0, html: `<div style="height:100%;display:flex;align-items:center;padding:0 44px;"><div style="font-size:13px;letter-spacing:0.14em;color:${l.ink};background:rgba(0,0,0,0.4);padding:9px 15px;border-radius:8px;backdrop-filter:blur(6px);">Every lit window is somebody training or making something tonight.${NEW}</div></div>` },
    ])}

    <section style="padding:34px 44px;display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:22px;">
      <div style="grid-column:span 8;display:flex;flex-direction:column;gap:14px;">${manifesto(l, 22)}</div>
      <div style="grid-column:span 4;"><div style="border:1px solid ${l.cool}28;border-radius:12px;overflow:hidden;height:230px;">${windows(l.warm, '#141E33', 8, 6, 0.6)}</div></div>
    </section>

    ${movieSlot(l, 1, 'The Harbor at Night', 'A slow drift along the waterfront as the windows come on one by one. 8-12s, loops on the water.', 'testimonials-swan-bg.jpg', 400)}

    <section style="padding:34px 44px;display:flex;flex-direction:column;gap:14px;">
      <h2 style="font-size:27px;">Everything a person makes${NEW}</h2>
      ${disciplineCards(l, 3)}
    </section>

    ${stage(260, [
      { z: -11, html: bg('golf-section-bg.jpg', 0.85), blur: 1.6 },
      { z: -5, html: `<div style="height:100%;background:linear-gradient(180deg,${l.deep}CC 0%,rgba(0,0,0,0.20) 50%,${l.deep}CC 100%)"></div>` },
      { z: -1, html: figures('#04070E', 10, 0.7, 0.85), pos: 'bottom:0;height:26%;' },
    ])}

    <section style="padding:34px 44px;display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:22px;align-items:start;">
      <div style="grid-column:span 7;"><h2 style="font-size:26px;margin-bottom:12px;">Swan Coach builds it with your trainer${NEW}</h2>${chart(l, 150)}</div>
      <div style="grid-column:span 5;">${economics(l)}</div>
    </section>

    ${movieSlot(l, 2, 'One Session, End to End', 'A real hour compressed: the warm-up, the correction, the last set, the log. 10-15s.', 'video-library-bg.jpg', 400)}

    <section id="f" style="padding:34px 44px 42px;display:flex;flex-direction:column;gap:16px;">
      <h2 style="font-size:32px;">${esc(C.cta_title)}</h2>
      <p style="margin:0;font-size:16px;line-height:1.65;color:${l.mute};max-width:68ch;">${esc(C.cta_body)}</p>
      ${fork(l)}
    </section>
    ${footer(l, 'B1 · harbor-lights · header preserved · 2 movie areas · 5 parallax stages')}
  </main>
</div>`);
}

/* ══ D2 · VEGAS MILE — neon blocks under Sean's header (marquee moved BELOW it) ══ */
function D2() {
  const l = L.D2;
  const bulbs = `<div style="display:flex;gap:9px;align-items:center;">${Array.from({ length: 30 }, (_, i) => `<span style="width:7px;height:7px;border-radius:50%;background:${i % 3 ? l.warm : l.cool};opacity:${i % 3 ? 0.95 : 0.6};box-shadow:0 0 8px ${i % 3 ? l.warm : l.cool};"></span>`).join('')}</div>`;
  const blockk = (sign, tint, html) => `<section style="background:${tint};padding:56px;border-top:1px solid ${l.cool}2E;">
    <div style="display:inline-flex;align-items:center;gap:12px;padding:8px 18px;border:1px solid ${l.cool}66;border-radius:999px;margin-bottom:20px;box-shadow:0 0 22px ${l.cool}44,inset 0 0 14px ${l.cool}22;">
      <span style="font-family:'Fira Code',monospace;font-size:11px;letter-spacing:0.26em;color:${l.cool};">${sign}</span></div>
    <div style="display:flex;flex-direction:column;gap:16px;">${html}</div></section>`;
  return shell(l, `
${swanHeader()}
<div style="background:#02030A;padding:11px 24px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${l.cool}33;">
  ${bulbs}<div style="font-family:'Fira Code',monospace;font-size:11px;letter-spacing:0.3em;color:${l.warm};">THE MILE</div>${bulbs}
</div>

${heroVideo(l, 640, `<h1 style="font-size:64px;line-height:1.0;font-weight:800;letter-spacing:-0.02em;text-shadow:0 0 34px ${l.cool}77;">${esc(C.headline)}</h1>
  <p style="margin:0;font-size:20px;line-height:1.5;color:#E6DDF6;font-weight:500;max-width:50ch;">${esc(C.sub)}</p>
  <div style="display:flex;gap:12px;">
    <a href="#f" style="display:inline-flex;align-items:center;min-height:48px;padding:0 28px;border-radius:10px;background:#3B1E7A;color:${l.ink};text-decoration:none;font-weight:700;box-shadow:0 0 30px ${l.cool}66;">${esc(C.cta_primary)}</a>
    <a href="#f" style="display:inline-flex;align-items:center;min-height:48px;padding:0 24px;border-radius:10px;border:1px solid ${l.cool}77;color:${l.ink};text-decoration:none;">${esc(C.cta_secondary)}</a>
  </div>`)}

${blockk('BLOCK 01 &middot; WHY', '#07051A', manifesto(l, 23))}

${movieSlot(l, 1, 'Neon Mile, Opening Night', 'Push down a rain-slick boulevard; every sign is a discipline. 8-12s, loops on the wet pavement.', 'store-hero-bg.jpg', 440)}

${blockk('BLOCK 02 &middot; THE MILE', '#0A0620', `<h2 style="font-size:28px;">Everything a person makes${NEW}</h2>${disciplineCards(l, 3)}`)}

${stage(280, [
  { z: -11, html: bg('beyond-the-gym-bg.jpg', 0.9), blur: 1.0 },
  { z: -6, html: windows(l.warm, '#0A0820', 32, 6, 0.44), blur: 1.8, pos: 'top:6%;height:60%;' },
  { z: -2, html: figures('#050310', 15, 0.9, 1.2), pos: 'bottom:0;height:24%;' },
])}

${blockk('BLOCK 03 &middot; THE RECORD', '#060418', `<h2 style="font-size:28px;">Swan Coach builds it with your trainer${NEW}</h2>${chart(l, 150)}`)}

${movieSlot(l, 2, 'The Record, In Motion', 'Twelve weeks of a real progression rendered as light travelling up the strip. 10-15s.', 'features-swan-bg.jpg', 440)}

${blockk('BLOCK 04 &middot; THE DEAL', '#0B0722', economics(l))}

<section id="f" style="background:#100A2C;padding:60px 56px;display:flex;flex-direction:column;gap:18px;border-top:1px solid ${l.cool}33;">
  ${bulbs}
  <h2 style="font-size:36px;text-shadow:0 0 24px ${l.cool}55;">${esc(C.cta_title)}</h2>
  <p style="margin:0;font-size:17px;line-height:1.65;color:#D9CFF0;max-width:70ch;">${esc(C.cta_body)}</p>
  ${fork(l)}
</section>
${footer(l, 'D2 · vegas-mile · header preserved · 2 movie areas · 5 parallax stages')}`);
}

/* ── EMIT: only the two survivors ── */
for (const f of ['DawnApproach.dc.html', 'TwoLanterns.dc.html', 'InstrumentFlight.dc.html', 'TheInstrument.dc.html', 'BeneathTheWaterline.dc.html']) {
  const p = path.join(here, f); if (fs.existsSync(p)) fs.unlinkSync(p);
}
fs.writeFileSync(path.join(here, 'Main.dc.html'), B1(), 'utf8');
fs.writeFileSync(path.join(here, 'VegasMile.dc.html'), D2(), 'utf8');

const artboards = [
  { file: 'Main.dc.html', title: 'B1 · harbor lights', x: 0, y: 0, w: 1280, h: 3600 },
  { file: 'VegasMile.dc.html', title: 'D2 · vegas mile', x: 1560, y: 0, w: 1280, h: 3700 },
];
const noteH = (t, w) => { const per = Math.max(24, Math.floor(w / 8.1)); return t.split(String.fromCharCode(10)).reduce((n, p) => n + Math.max(1, Math.ceil(p.length / per)), 0) * 19 + 28; };
const notes = [
  ['note-b1', 0, `B1 · HARBOR LIGHTS  — Sean's pick\n\nSean's header is REPLICATED at the top, unchanged: 64px fixed glass, blur(20px) saturate(1.8), real nav (Home / Store / Video Library / Waiver / Contact / Photography / About) + Login / Sign Up. The design adapts BELOW it. Its own left rail is a SECTION rail, not a second nav.\n\nHERO = the Swans.mp4 video slot (real frame shown). Swappable for an H3 film later.\n\n2 MOVIE AREAS: "The Harbor at Night" and "One Session, End to End".\n\n5 parallax stages: hero · window-wall band · movie 1 · golf band · movie 2.`],
  ['note-d2', 1560, `D2 · VEGAS MILE  — Sean's pick\n\nSean's header is REPLICATED at the top, unchanged. The marquee bulb strip moved BELOW his header so it never competes with it.\n\nHERO = the Swans.mp4 video slot (real frame shown), with neon type over it. Swappable for an H3 film later.\n\n2 MOVIE AREAS: "Neon Mile, Opening Night" and "The Record, In Motion".\n\n5 parallax stages: hero · movie 1 · skyline band · movie 2 · (block tints).\n\nTRADEOFF: loudest of the eight and the furthest from "homey"; highest perf cost.`],
];
const annotations = notes.map(([id, x, text]) => ({ id, x, y: -(noteH(text, 460) + 48), w: 460, text }));
annotations.push({
  id: 'kill-pass', x: -560, y: 0, w: 470,
  text: `KILL PASS — 2026-08-19\n\nSean: "I like d two and b one."\nSix directions killed. These two survive.\n\nHIS FOUR INSTRUCTIONS, ALL APPLIED:\n1. KEEP THE HEADER. "not gonna get rid of my header or change that style in any way. They need to adapt to what I already have." Both boards replicate components/Header/header.tsx and lay out below it.\n2. MORE PARALLAX — 5 depth stages per board, not just the hero.\n3. AT LEAST 2 MOVIE AREAS between sections for MiniMax H3 films — both boards have two, each with a brief and a duration.\n4. THE HERO IS THE SWANS VIDEO — real frame from the real Swans.mp4. Kept, and marked as a swappable slot in case an H3 film beats it.\n\nGold tags = new copy needing approval.`,
});
fs.writeFileSync(path.join(here, 'canvas-8run.json'), JSON.stringify({ artboards, annotations, launch: { view: 'canvas' } }, null, 2) + '\n', 'utf8');
console.log('final2: B1 + D2 written; 6 killed boards removed');
