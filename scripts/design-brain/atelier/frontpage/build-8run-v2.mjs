#!/usr/bin/env node
/**
 * build-8run-v2.mjs — REFACTOR after Sean's 2026-08-19 rejection of v1.
 *
 * WHAT WENT WRONG IN v1 (do not repeat):
 *   1. ONE build() template for all eight boards, parameterised only by colour. The
 *      fingerprint gate passed because it measured the SKELETON JSON, not the rendered
 *      HTML. Sean: "they're all exactly the same." He was right.
 *   2. Parallax was described in skeleton prose and never implemented. Zero layers existed.
 *   3. SwanStudios is not only training — dance, art, vocal/sound, photography, graphic
 *      design. Sean's own approved manifesto already says "celebrates your creativity"
 *      and v1 surfaced none of it.
 *
 * THIS FILE: eight INDEPENDENT layout functions. Different nav, grid, hero mechanics,
 * chapter arrangement and depth treatment. Real layered depth drawn as inline SVG, inside
 * a CSS `perspective` stage so it genuinely parallaxes when the artboard is scrolled.
 * A structural-diff gate (gate-8run.mjs) now compares the RENDERED OUTPUT, not the JSON.
 */
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const pack = JSON.parse(fs.readFileSync(path.join(here, 'copy-pack.json'), 'utf8'));
const C = pack.verbatim;
const CR = pack.creative;
const run = JSON.parse(fs.readFileSync(path.join(here, 'skeletons-8run.json'), 'utf8'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const NEW = '<span style="font-size: 10px; letter-spacing: 0.06em; color: #C6A84B; white-space: nowrap;"> [new copy - needs Sean approval]</span>';

const L = {
  A1: { sky: '#0A1430', deep: '#050A1C', warm: '#C6A84B', cool: '#60C0F0', ink: '#E0ECF4', mute: '#8FA8C8', name: 'warm amber in blue' },
  A2: { sky: '#0B1636', deep: '#070D22', warm: '#E8B06A', cool: '#7FB0E8', ink: '#E0ECF4', mute: '#93A9C4', name: 'dawn' },
  B1: { sky: '#0C1226', deep: '#06090F', warm: '#D8A24B', cool: '#5A93D8', ink: '#E0ECF4', mute: '#8FA0B8', name: 'dusk' },
  B2: { sky: '#08132C', deep: '#040814', warm: '#E8C87A', cool: '#60C0F0', ink: '#E0ECF4', mute: '#8FA8C8', name: 'cold crystalline, warm windows' },
  C1: { sky: '#061024', deep: '#03070F', warm: '#8FA8C8', cool: '#60C0F0', ink: '#E0ECF4', mute: '#7C93AD', name: 'cold crystalline' },
  C2: { sky: '#0C1226', deep: '#06090F', warm: '#D8A24B', cool: '#5A93D8', ink: '#E0ECF4', mute: '#93A6BC', name: 'dusk' },
  D1: { sky: '#050914', deep: '#02040A', warm: '#E8B06A', cool: '#4A7FD0', ink: '#E0ECF4', mute: '#7E93B4', name: 'deep night rising to dawn' },
  D2: { sky: '#04060E', deep: '#010204', warm: '#C6A84B', cool: '#8B5CF6', ink: '#E0ECF4', mute: '#9A8FB8', name: 'deep night neon' },
};

/* ── DEPTH ART ────────────────────────────────────────────────────────────────
   Drawn, not stock. Each returns an SVG layer; composed inside a perspective
   stage they read as depth statically AND parallax on scroll. */

const ridge = (c, o, y) => `<svg viewBox="0 0 1280 400" preserveAspectRatio="none" style="width:100%;height:100%;display:block;opacity:${o}"><path d="M0 ${y} C 160 ${y - 46}, 300 ${y + 22}, 470 ${y - 14} S 800 ${y - 62}, 980 ${y - 8} S 1180 ${y + 20}, 1280 ${y - 30} L1280 400 L0 400 Z" fill="${c}"/></svg>`;

const water = (c, glint) => `<svg viewBox="0 0 1280 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><rect width="1280" height="300" fill="${c}"/>${Array.from({ length: 26 }, (_, i) => { const y = 30 + i * 10; const w = 60 + ((i * 137) % 420); const x = ((i * 311) % 1180); return `<rect x="${x}" y="${y}" width="${w}" height="2" rx="1" fill="${glint}" opacity="${(0.30 - i * 0.009).toFixed(3)}"/>`; }).join('')}</svg>`;

/** People. D8 says the world has people IN it — here they are DRAWN, not asserted. */
const figures = (c, n, o, scale = 1) => `<svg viewBox="0 0 1280 120" preserveAspectRatio="none" style="width:100%;height:100%;display:block;opacity:${o}">${Array.from({ length: n }, (_, i) => { const x = 40 + ((i * 1493) % 1200); const h = (16 + ((i * 7) % 9)) * scale; const y = 110 - h; return `<g fill="${c}"><ellipse cx="${x}" cy="${y - h * 0.16}" rx="${h * 0.13}" ry="${h * 0.15}"/><rect x="${x - h * 0.11}" y="${y}" width="${h * 0.22}" height="${h * 0.62}" rx="${h * 0.09}"/></g>`; }).join('')}</svg>`;

/** A wall of lit windows — every one is somebody training or making something. */
const windows = (warm, cool, cols, rows, lit = 0.55) => `<svg viewBox="0 0 ${cols * 40} ${rows * 46}" preserveAspectRatio="none" style="width:100%;height:100%;display:block">${Array.from({ length: cols * rows }, (_, i) => { const cx = (i % cols) * 40, cy = Math.floor(i / cols) * 46; const on = ((i * 79) % 100) / 100 < lit; return `<rect x="${cx + 6}" y="${cy + 6}" width="26" height="32" rx="2" fill="${on ? warm : cool}" opacity="${on ? (0.34 + ((i * 13) % 50) / 100).toFixed(2) : 0.10}"/>`; }).join('')}</svg>`;

const reeds = (c, o) => `<svg viewBox="0 0 1280 200" preserveAspectRatio="none" style="width:100%;height:100%;display:block;opacity:${o}">${Array.from({ length: 44 }, (_, i) => { const x = ((i * 233) % 1280); const h = 70 + ((i * 53) % 120); return `<path d="M${x} 200 C ${x + 6} ${200 - h * 0.6}, ${x - 5} ${200 - h * 0.8}, ${x + 3} ${200 - h}" stroke="${c}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`; }).join('')}</svg>`;

const swanMark = (c, o = 1, w = 120) => `<svg viewBox="0 0 100 100" style="width:${w}px;height:${w}px;display:block;opacity:${o}"><path d="M62 20 C 48 20, 42 32, 44 44 C 46 56, 40 62, 30 66 C 44 78, 66 76, 76 62 C 86 48, 80 26, 62 20 Z" fill="none" stroke="${c}" stroke-width="2.2" stroke-linejoin="round"/><path d="M62 20 C 66 12, 74 10, 78 14" stroke="${c}" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>`;

/** REAL parallax: perspective on the stage, translateZ on the layers.
 *  Deeper layers are scaled back up so they stay full-bleed. Pure CSS, no JS. */
function stage(height, layers) {
  return `<div style="position: relative; height: ${height}px; overflow: hidden; perspective: 12px; perspective-origin: 50% 50%; transform-style: preserve-3d;">
    ${layers.map((l) => {
      const z = l.z ?? 0;
      const s = (12 - z) / 12;                       // counter-scale so depth stays full-bleed
      return `<div style="position: absolute; left: 0; right: 0; ${l.pos || 'top: 0; bottom: 0;'} transform: translateZ(${z}px) scale(${s.toFixed(3)}); transform-origin: 50% 50%; ${l.blur ? `filter: blur(${l.blur}px);` : ''} ${l.style || ''}">${l.html}</div>`;
    }).join('\n    ')}
  </div>`;
}

/* ── SHARED CONTENT FRAGMENTS (same copy everywhere — only the LAYOUT differs) ── */

const manifesto = (l, size = 25) => `
  <p style="margin: 0; font-size: ${size}px; line-height: 1.48; color: ${l.ink}; font-weight: 500; text-wrap: pretty;">${esc(C.mission_1)}</p>
  <p style="margin: 0; font-size: ${Math.round(size * 0.74)}px; line-height: 1.66; color: ${l.mute}; max-width: 60ch;">${esc(C.mission_2)}</p>
  <p style="margin: 0; font-size: ${Math.round(size * 0.74)}px; line-height: 1.66; color: ${l.mute}; max-width: 60ch;">${esc(C.mission_3)}</p>
  <p style="margin: 0; font-family: 'Cormorant Garamond', Georgia, serif; font-style: italic; font-size: ${Math.round(size * 1.16)}px; line-height: 1.32; color: ${l.warm};">${esc(C.mission_closing)}</p>`;

const DISCIPLINES = [
  ['Training', 'Strength, power, mobility &mdash; logged against a written plan.', true],
  [esc(CR.dance_title), esc(CR.dance_desc), false],
  [esc(CR.art_title), esc(CR.art_desc), false],
  [esc(CR.vocal_title), esc(CR.vocal_desc), false],
  ['Photography &amp; Graphic Design', 'Shoot it, design it, publish it &mdash; the studio is part of the membership.', true],
  [esc(CR.community_title), esc(CR.community_desc), false],
];

const disciplineCards = (l, cols) => `<div style="display: grid; grid-template-columns: repeat(${cols}, minmax(0, 1fr)); gap: 12px;">
  ${DISCIPLINES.map(([t, d, isNew]) => `<div style="display: flex; flex-direction: column; gap: 8px; padding: 16px; border: 1px solid ${l.cool}30; border-radius: 12px; background: #FFFFFF07;">
    <div style="font-size: 15px; font-weight: 700; color: ${l.ink};">${t}${isNew ? NEW : ''}</div>
    <div style="font-size: 12.5px; line-height: 1.5; color: ${l.mute};">${d}</div>
  </div>`).join('\n  ')}
</div>`;

const disciplineList = (l) => `<div style="display: flex; flex-direction: column; gap: 0;">
  ${DISCIPLINES.map(([t, d, isNew], i) => `<div style="display: grid; grid-template-columns: 46px 1fr; gap: 18px; padding: 18px 0; ${i ? `border-top: 1px solid ${l.cool}22;` : ''}">
    <div style="font-family: 'Fira Code', monospace; font-size: 11px; color: ${l.warm};">0${i + 1}</div>
    <div><div style="font-size: 17px; font-weight: 700; color: ${l.ink}; margin-bottom: 5px;">${t}${isNew ? NEW : ''}</div>
    <div style="font-size: 13px; line-height: 1.55; color: ${l.mute}; max-width: 62ch;">${d}</div></div>
  </div>`).join('\n  ')}
</div>`;

const chart = (l, h = 150) => `<svg viewBox="0 0 600 ${h}" style="width:100%;height:${h}px;display:block">
  <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${l.cool}" stop-opacity="0.30"/><stop offset="1" stop-color="${l.cool}" stop-opacity="0"/></linearGradient></defs>
  <path d="M0 ${h - 18} L100 ${h - 40} L200 ${h - 34} L300 ${h - 66} L400 ${h - 84} L500 ${h - 108} L600 ${h - 128} L600 ${h} L0 ${h} Z" fill="url(#cg)"/>
  <path d="M0 ${h - 18} L100 ${h - 40} L200 ${h - 34} L300 ${h - 66} L400 ${h - 84} L500 ${h - 108} L600 ${h - 128}" stroke="${l.cool}" stroke-width="2.4" fill="none"/>
  <path d="M0 ${h - 24} L600 ${h - 118}" stroke="${l.warm}" stroke-width="1.6" stroke-dasharray="5 5" fill="none" opacity="0.8"/>
</svg>
<div style="font-size: 11px; color: ${l.mute}; margin-top: 6px;">Gold = the written plan. Blue = sessions actually logged. Labelled demo dataset &mdash; never a real member's numbers.${NEW}</div>`;

const economics = (l) => `<div style="display: flex; flex-direction: column; gap: 10px; padding: 22px; border: 1px solid ${l.warm}55; border-radius: 14px; background: #FFFFFF07;">
  <div style="font-size: 11px; letter-spacing: 0.20em; color: ${l.warm};">IF YOU ARE A TRAINER OR A CREATOR</div>
  <div style="font-size: 44px; font-weight: 800; line-height: 1; color: ${l.warm};">15%</div>
  <div style="font-size: 15px; line-height: 1.55; color: ${l.ink};">Never more than <strong>$1,000 a month</strong>. Card processing included. No monthly fee, no setup fee. We only make money when you do.${NEW}</div>
</div>`;

const fork = (l, stacked) => `<div style="display: grid; grid-template-columns: ${stacked ? '1fr' : 'repeat(2, minmax(0, 1fr))'}; gap: 16px;">
  <a href="#" style="display: flex; flex-direction: column; gap: 8px; padding: 26px; border-radius: 16px; background: #002060; text-decoration: none; color: ${l.ink}; box-shadow: 0 0 28px rgba(139,92,246,0.32); min-height: 44px;">
    <div style="font-size: 22px; font-weight: 700;">${esc(C.cta_secondary)}</div>
    <div style="font-size: 13px; color: #B9CBDC;">Browse real trainers and creators before you sign up for anything.${NEW}</div>
  </a>
  <a href="#" style="display: flex; flex-direction: column; gap: 8px; padding: 26px; border-radius: 16px; background: #3B1E7A; text-decoration: none; color: ${l.ink}; box-shadow: 0 0 28px rgba(96,192,240,0.30); min-height: 44px;">
    <div style="font-size: 22px; font-weight: 700;">Build your practice here${NEW}</div>
    <div style="font-size: 13px; color: #D9CBF0;">Bring your clients. Keep your business. One email to start.${NEW}</div>
  </a>
</div>
<div style="font-size: 11px; color: ${l.warm}; margin-top: 10px;">&#9888; The second door has no destination yet &mdash; /trainers capture funnel is a hard dependency (F5).</div>`;

const footer = (l, id) => `<footer style="padding: 36px 48px 46px; border-top: 1px solid #FFFFFF14; display: flex; flex-direction: column; gap: 9px;">
  <div style="font-family: 'Cormorant Garamond', Georgia, serif; font-style: italic; font-size: 19px; color: ${l.warm};">${esc(C.mission_closing)}</div>
  <div style="font-size: 12px; color: ${l.mute};">Motion and iconography generated with MiniMax H3.</div>
  <div style="font-size: 10px; color: #55708C;">${esc(id)}</div>
</footer>`;

const shell = (l, id, body) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>
    body { margin: 0; font-family: 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif; background: ${l.deep}; }
    a { color: ${l.cool}; } a:hover { color: ${l.ink}; }
    h1, h2 { text-wrap: balance; margin: 0; }
  </style>
</helmet>
<div style="width: 1280px; background: ${l.deep}; color: ${l.ink};">
${body}
</div>
</x-dc>
<script data-dc-script data-props='{"accent":{"editor":"color","default":"${l.cool}","options":["#60C0F0","#C6A84B","#8B5CF6","#E0ECF4"]}}'>
class Component extends DCLogic {
  renderVals() { return { accent: this.props.accent ?? '${l.cool}' }; }
}
</script>
</body>
</html>
`;

/* ══ THE EIGHT — each its own layout function ══════════════════════════════ */

/** A1 · STILL WATER — no nav. One narrow centred measure. Enormous air. */
function A1() {
  const l = L.A1;
  return shell(l, 'A1 · still-water', `
  ${stage(900, [
    { z: -9, html: ridge('#0E2149', 1, 300), blur: 2, pos: 'top: 0; height: 62%;' },
    { z: -6, html: figures('#16305F', 3, 0.9, 0.8), pos: 'top: 52%; height: 8%;' },
    { z: -3, html: water('#071026', l.warm), pos: 'top: 58%; bottom: 0;' },
    { z: 0, html: `<div style="height:100%;display:flex;align-items:flex-end;padding:0 0 96px 120px;">${swanMark(l.warm, 0.5, 96)}</div>`, pos: 'top: 0; bottom: 0;' },
  ])}
  <div style="max-width: 640px; margin: -180px auto 0; position: relative; padding: 0 20px 120px; display: flex; flex-direction: column; gap: 96px;">
    <header style="display: flex; flex-direction: column; gap: 22px;">
      <h1 style="font-size: 54px; line-height: 1.06; font-weight: 800; letter-spacing: -0.02em;">${esc(C.headline)}</h1>
      <p style="margin: 0; font-size: 21px; line-height: 1.5; color: #D6E4F0; font-weight: 500;">${esc(C.sub)}</p>
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <a href="#f" style="display:inline-flex;align-items:center;min-height:48px;padding:0 28px;border-radius:10px;background:#002060;color:${l.ink};text-decoration:none;font-weight:700;box-shadow:0 0 24px rgba(139,92,246,0.35);">${esc(C.cta_primary)}</a>
        <a href="#f" style="display:inline-flex;align-items:center;min-height:48px;padding:0 24px;border-radius:10px;border:1px solid ${l.cool}55;color:${l.ink};text-decoration:none;">${esc(C.cta_secondary)}</a>
      </div>
    </header>
    <section style="display: flex; flex-direction: column; gap: 18px;">${manifesto(l, 23)}</section>
    <section style="display: flex; flex-direction: column; gap: 14px;">
      <h2 style="font-size: 26px;">Everything a person makes${NEW}</h2>
      ${disciplineList(l)}
    </section>
    <section style="display: flex; flex-direction: column; gap: 14px;">
      <h2 style="font-size: 26px;">Swan Coach builds it with your trainer${NEW}</h2>
      ${chart(l, 140)}
    </section>
    <section style="display: flex; flex-direction: column; gap: 16px;">${economics(l)}</section>
    <section id="f" style="display: flex; flex-direction: column; gap: 16px;">
      <h2 style="font-size: 30px;">${esc(C.cta_title)}</h2>
      <p style="margin:0;font-size:16px;line-height:1.65;color:${l.mute};">${esc(C.cta_body)}</p>
      ${fork(l, true)}
    </section>
  </div>
  ${footer(l, 'A1 · still-water · quiet · warm amber in blue')}`);
}

/** A2 · DAWN APPROACH — full-width alternating bands, content zig-zags L/R, light warms downward. */
function A2() {
  const l = L.A2;
  const band = (bg, i, left, html) => `<section style="background: ${bg}; padding: 66px 64px;">
    <div style="display: grid; grid-template-columns: repeat(12, minmax(0,1fr)); gap: 28px; align-items: start;">
      <div style="grid-column: ${left ? '1 / span 7' : '6 / span 7'}; display: flex; flex-direction: column; gap: 16px;">${html}</div>
      <div style="grid-column: ${left ? '9 / span 4' : '1 / span 4'}; font-family: 'Fira Code', monospace; font-size: 11px; color: ${l.warm}; opacity: 0.7; padding-top: 6px;">0${i}</div>
    </div>
  </section>`;
  return shell(l, 'A2 · dawn-approach', `
  <div style="position: sticky; top: 0; z-index: 5; height: 3px; background: linear-gradient(90deg, ${l.warm} 0%, ${l.cool} 100%);"></div>
  ${stage(720, [
    { z: -9, html: ridge('#101F45', 1, 250), blur: 3, pos: 'top: 0; height: 70%;' },
    { z: -7, html: ridge('#16294F', 0.9, 320), blur: 1, pos: 'top: 12%; height: 62%;' },
    { z: -4, html: figures('#20365E', 7, 0.95, 0.9), pos: 'top: 60%; height: 9%;' },
    { z: -2, html: water('#0A1330', l.warm), pos: 'top: 66%; bottom: 0;' },
    { z: 0, html: `<div style="height:100%;display:grid;place-items:center;">${swanMark(l.warm, 0.42, 150)}</div>` },
  ])}
  <section style="background: ${l.deep}; padding: 54px 64px 42px;">
    <div style="display: grid; grid-template-columns: repeat(12, minmax(0,1fr)); gap: 28px; align-items: end;">
      <h1 style="grid-column: span 7; font-size: 56px; line-height: 1.04; font-weight: 800;">${esc(C.headline)}</h1>
      <p style="grid-column: span 5; margin: 0; font-size: 20px; line-height: 1.5; color: #D6E4F0; font-weight: 500;">${esc(C.sub)}</p>
    </div>
    <div style="display: flex; gap: 12px; margin-top: 24px;">
      <a href="#f" style="display:inline-flex;align-items:center;min-height:48px;padding:0 28px;border-radius:10px;background:#002060;color:${l.ink};text-decoration:none;font-weight:700;box-shadow:0 0 24px rgba(139,92,246,0.35);">${esc(C.cta_primary)}</a>
      <a href="#f" style="display:inline-flex;align-items:center;min-height:48px;padding:0 24px;border-radius:10px;border:1px solid ${l.cool}55;color:${l.ink};text-decoration:none;">${esc(C.cta_secondary)}</a>
    </div>
  </section>
  ${band('#0A1430', 2, true, manifesto(l, 24))}
  ${band('#0E1B3E', 3, false, `<h2 style="font-size:28px;">Everything a person makes${NEW}</h2>${disciplineCards(l, 2)}`)}
  ${band('#132449', 4, true, `<h2 style="font-size:28px;">Swan Coach builds it with your trainer${NEW}</h2>${chart(l, 150)}`)}
  ${band('#1B2E55', 5, false, economics(l))}
  <section id="f" style="background: linear-gradient(180deg, #1B2E55 0%, #3A3A52 100%); padding: 66px 64px; display: flex; flex-direction: column; gap: 18px;">
    <h2 style="font-size: 34px;">${esc(C.cta_title)}</h2>
    <p style="margin:0;font-size:17px;line-height:1.65;color:#CBD9E8;max-width:70ch;">${esc(C.cta_body)}</p>
    ${fork(l, false)}
  </section>
  ${footer(l, 'A2 · dawn-approach · quiet · dawn')}`);
}

/** B1 · HARBOR LIGHTS — left rail nav + a WALL of lit windows. Every window is somebody. */
function B1() {
  const l = L.B1;
  return shell(l, 'B1 · harbor-lights', `
  <div style="display: flex;">
    <nav style="width: 92px; flex-shrink: 0; border-right: 1px solid ${l.cool}22; padding: 30px 0; display: flex; flex-direction: column; align-items: center; gap: 26px; position: sticky; top: 0; align-self: flex-start;">
      <div style="width:44px;height:44px;border-radius:11px;background:#002060;display:grid;place-items:center;font-weight:800;color:{{accent}};">S</div>
      ${['WORLD', 'WHY', 'MAKE', 'PROOF', 'JOIN'].map((t) => `<a href="#f" style="writing-mode: vertical-rl; text-decoration:none; font-size:11px; letter-spacing:0.24em; min-height:44px; color:${l.mute};">${t}</a>`).join('\n      ')}
    </nav>
    <main style="flex-grow: 1; min-width: 0;">
      ${stage(560, [
        { z: -9, html: `<div style="height:100%;background:linear-gradient(180deg,#0C1226 0%,#16223F 100%)"></div>`, pos: 'top:0;bottom:0;' },
        { z: -6, html: windows(l.warm, '#1B2740', 30, 8, 0.5), blur: 1.4, pos: 'top: 14%; height: 62%;' },
        { z: -3, html: windows(l.warm, '#22304C', 22, 5, 0.62), pos: 'top: 42%; height: 40%;' },
        { z: -1, html: figures('#050810', 14, 0.95, 1.15), pos: 'bottom: 0; height: 16%;' },
        { z: 0, html: `<div style="height:100%;display:flex;align-items:flex-start;justify-content:flex-end;padding:32px 44px 0 0;">${swanMark(l.warm, 0.55, 84)}</div>` },
      ])}
      <section style="padding: 34px 44px 26px; display: flex; flex-direction: column; gap: 16px;">
        <h1 style="font-size: 50px; line-height: 1.05; font-weight: 800;">${esc(C.headline)}</h1>
        <p style="margin:0;font-size:20px;line-height:1.5;color:#D6E4F0;font-weight:500;max-width:52ch;">${esc(C.sub)}</p>
        <div style="display:flex;gap:12px;">
          <a href="#f" style="display:inline-flex;align-items:center;min-height:48px;padding:0 26px;border-radius:10px;background:#002060;color:${l.ink};text-decoration:none;font-weight:700;box-shadow:0 0 24px rgba(139,92,246,0.35);">${esc(C.cta_primary)}</a>
          <a href="#f" style="display:inline-flex;align-items:center;min-height:48px;padding:0 22px;border-radius:10px;border:1px solid ${l.cool}55;color:${l.ink};text-decoration:none;">${esc(C.cta_secondary)}</a>
        </div>
      </section>
      <section style="padding: 26px 44px; display: grid; grid-template-columns: repeat(12,minmax(0,1fr)); gap: 22px;">
        <div style="grid-column: span 8; display:flex; flex-direction:column; gap:14px;">${manifesto(l, 22)}</div>
        <div style="grid-column: span 4;"><div style="border:1px solid ${l.cool}28;border-radius:12px;overflow:hidden;height:220px;">${windows(l.warm, '#141E33', 8, 6, 0.6)}</div>
        <div style="font-size:11px;color:${l.mute};margin-top:8px;">Each lit window is somebody training or making something tonight.${NEW}</div></div>
      </section>
      <section style="padding: 26px 44px; display:flex; flex-direction:column; gap:14px;">
        <h2 style="font-size:27px;">Everything a person makes${NEW}</h2>
        ${disciplineCards(l, 3)}
      </section>
      <section style="padding: 26px 44px; display: grid; grid-template-columns: repeat(12,minmax(0,1fr)); gap: 22px; align-items:start;">
        <div style="grid-column: span 7;"><h2 style="font-size:26px;margin-bottom:12px;">Swan Coach builds it with your trainer${NEW}</h2>${chart(l, 140)}</div>
        <div style="grid-column: span 5;">${economics(l)}</div>
      </section>
      <section id="f" style="padding: 30px 44px 40px; display:flex; flex-direction:column; gap:16px;">
        <h2 style="font-size:32px;">${esc(C.cta_title)}</h2>
        <p style="margin:0;font-size:16px;line-height:1.65;color:${l.mute};max-width:68ch;">${esc(C.cta_body)}</p>
        ${fork(l, false)}
      </section>
      ${footer(l, 'B1 · harbor-lights · people-first · dusk')}
    </main>
  </div>`);
}

/** B2 · TWO LANTERNS — strict 3 columns; a tall river of video down the middle, doors either side. */
function B2() {
  const l = L.B2;
  const col = (html) => `<div style="display:flex;flex-direction:column;gap:26px;padding:36px 30px;">${html}</div>`;
  return shell(l, 'B2 · two-lanterns', `
  <div style="display: grid; grid-template-columns: 1fr 420px 1fr; align-items: start;">
    ${col(`
      <h1 style="font-size: 42px; line-height: 1.06; font-weight: 800;">${esc(C.headline)}</h1>
      <p style="margin:0;font-size:18px;line-height:1.5;color:#D6E4F0;font-weight:500;">${esc(C.sub)}</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <a href="#f" style="display:inline-flex;align-items:center;min-height:48px;padding:0 24px;border-radius:10px;background:#002060;color:${l.ink};text-decoration:none;font-weight:700;box-shadow:0 0 22px rgba(139,92,246,0.35);">${esc(C.cta_primary)}</a>
        <a href="#f" style="display:inline-flex;align-items:center;min-height:48px;padding:0 20px;border-radius:10px;border:1px solid ${l.cool}55;color:${l.ink};text-decoration:none;">${esc(C.cta_secondary)}</a>
      </div>
      ${manifesto(l, 19)}
      <h2 style="font-size:22px;">Everything a person makes${NEW}</h2>
      ${disciplineList(l)}
    `)}
    <div style="position: sticky; top: 0;">
      ${stage(1180, [
        { z: -9, html: `<div style="height:100%;background:linear-gradient(180deg,#08132C 0%,#0E1F44 55%,#040814 100%)"></div>` },
        { z: -6, html: water('#0A1730', l.cool), blur: 1.2, pos: 'top: 24%; bottom: 0;' },
        { z: -3, html: figures('#152744', 5, 0.9, 1.0), pos: 'top: 62%; height: 10%;' },
        { z: 0, html: `<div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;">${swanMark(l.warm, 0.72, 120)}<div style="font-family:'Fira Code',monospace;font-size:11px;letter-spacing:0.2em;color:${l.warm};">THE RIVER</div></div>` },
      ])}
    </div>
    ${col(`
      <div style="display:flex;flex-direction:column;gap:14px;">
        <a href="#" style="display:flex;flex-direction:column;gap:8px;padding:24px;border-radius:16px;background:#002060;text-decoration:none;color:${l.ink};box-shadow:0 0 26px rgba(139,92,246,0.32);min-height:44px;">
          <div style="font-size:21px;font-weight:700;">${esc(C.cta_secondary)}</div>
          <div style="font-size:13px;color:#B9CBDC;">Browse real trainers and creators first.${NEW}</div></a>
        <a href="#" style="display:flex;flex-direction:column;gap:8px;padding:24px;border-radius:16px;background:#3B1E7A;text-decoration:none;color:${l.ink};box-shadow:0 0 26px rgba(96,192,240,0.30);min-height:44px;">
          <div style="font-size:21px;font-weight:700;">Build your practice here${NEW}</div>
          <div style="font-size:13px;color:#D9CBF0;">Bring your clients. Keep your business.${NEW}</div></a>
      </div>
      <div><h2 style="font-size:22px;margin-bottom:10px;">Swan Coach builds it with your trainer${NEW}</h2>${chart(l, 130)}</div>
      ${economics(l)}
      <div><h2 style="font-size:24px;margin-bottom:8px;">${esc(C.cta_title)}</h2>
      <p style="margin:0;font-size:15px;line-height:1.6;color:${l.mute};">${esc(C.cta_body)}</p></div>
    `)}
  </div>
  <div style="font-size:11px;color:${l.warm};padding:0 30px 14px;">&#9888; The second door has no destination yet &mdash; /trainers capture funnel is a hard dependency (F5).</div>
  ${footer(l, 'B2 · two-lanterns · people-first · cold crystalline, warm windows')}`);
}

/** C1 · INSTRUMENT FLIGHT — 9/3 with a sticky telemetry rail; data reads as instruments. */
function C1() {
  const l = L.C1;
  const readout = (k, v) => `<div style="display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid ${l.cool}1F;font-family:'Fira Code',monospace;font-size:11px;"><span style="color:${l.mute};">${k}</span><span style="color:${l.cool};">${v}</span></div>`;
  return shell(l, 'C1 · instrument-flight', `
  <div style="display: grid; grid-template-columns: 1fr 300px; align-items: start;">
    <main style="min-width:0;">
      ${stage(520, [
        { z: -9, html: `<div style="height:100%;background:radial-gradient(120% 80% at 50% 0%, #0C2145 0%, #03070F 70%)"></div>` },
        { z: -6, html: `<svg viewBox="0 0 1280 400" preserveAspectRatio="none" style="width:100%;height:100%"><path d="M0 340 C 300 300, 520 220, 760 170 S 1120 90, 1280 60" stroke="${l.cool}" stroke-width="2" fill="none" opacity="0.55" stroke-dasharray="7 6"/></svg>`, blur: 0.6 },
        { z: -3, html: figures('#0B1830', 9, 0.75, 0.7), pos: 'bottom: 0; height: 14%;' },
        { z: 0, html: `<div style="height:100%;display:flex;align-items:center;justify-content:flex-end;padding-right:70px;">${swanMark(l.cool, 0.85, 108)}</div>` },
      ])}
      <section style="padding: 30px 44px 24px; display:flex; flex-direction:column; gap:15px;">
        <h1 style="font-size:48px;line-height:1.05;font-weight:800;">${esc(C.headline)}</h1>
        <p style="margin:0;font-size:19px;line-height:1.5;color:#D6E4F0;font-weight:500;max-width:54ch;">${esc(C.sub)}</p>
        <div style="display:flex;gap:12px;">
          <a href="#f" style="display:inline-flex;align-items:center;min-height:48px;padding:0 26px;border-radius:10px;background:#002060;color:${l.ink};text-decoration:none;font-weight:700;box-shadow:0 0 24px rgba(139,92,246,0.35);">${esc(C.cta_primary)}</a>
          <a href="#f" style="display:inline-flex;align-items:center;min-height:48px;padding:0 22px;border-radius:10px;border:1px solid ${l.cool}55;color:${l.ink};text-decoration:none;">${esc(C.cta_secondary)}</a>
        </div>
      </section>
      <section style="padding: 20px 44px; display:flex;flex-direction:column;gap:13px;">${manifesto(l, 21)}</section>
      <section style="padding: 20px 44px;"><h2 style="font-size:25px;margin-bottom:12px;">Everything a person makes${NEW}</h2>${disciplineCards(l, 3)}</section>
      <section style="padding: 20px 44px;"><h2 style="font-size:25px;margin-bottom:10px;">Swan Coach builds it with your trainer${NEW}</h2>${chart(l, 160)}</section>
      <section style="padding: 20px 44px;">${economics(l)}</section>
      <section id="f" style="padding: 24px 44px 36px; display:flex;flex-direction:column;gap:15px;">
        <h2 style="font-size:30px;">${esc(C.cta_title)}</h2>
        <p style="margin:0;font-size:15px;line-height:1.65;color:${l.mute};max-width:66ch;">${esc(C.cta_body)}</p>
        ${fork(l, true)}
      </section>
      ${footer(l, 'C1 · instrument-flight · product-forward · cold crystalline')}
    </main>
    <aside style="position: sticky; top: 0; padding: 26px 24px; border-left: 1px solid ${l.cool}22;">
      <div style="font-family:'Fira Code',monospace;font-size:10px;letter-spacing:0.2em;color:${l.warm};margin-bottom:12px;">FLIGHT RECORDER</div>
      ${readout('DISCIPLINES', '6')}
      ${readout('PLAN ADHERENCE', '87%')}
      ${readout('WEEKS LOGGED', '12')}
      ${readout('TRAINER TAKE', '85%+')}
      ${readout('PLATFORM FEE', '15% cap $1k')}
      <div style="margin-top:18px;">${chart(l, 96)}</div>
    </aside>
  </div>`);
}

/** C2 · THE INSTRUMENT — 50/50 split; the left half is FIXED, the right half scrolls past it. */
function C2() {
  const l = L.C2;
  return shell(l, 'C2 · the-instrument', `
  <div style="display: grid; grid-template-columns: 1fr 1fr; align-items: start;">
    <div style="position: sticky; top: 0; height: 100vh; min-height: 900px;">
      ${stage(900, [
        { z: -9, html: `<div style="height:100%;background:linear-gradient(160deg,#0C1226 0%,#1A2340 60%,#06090F 100%)"></div>` },
        { z: -6, html: ridge('#152142', 0.9, 300), blur: 2, pos: 'top: 30%; height: 50%;' },
        { z: -3, html: figures('#1E2C4C', 4, 0.9, 1.1), pos: 'top: 68%; height: 10%;' },
        { z: 0, html: `<div style="height:100%;display:flex;flex-direction:column;justify-content:center;gap:22px;padding:0 52px;">
            <h1 style="font-size:50px;line-height:1.04;font-weight:800;">${esc(C.headline)}</h1>
            <p style="margin:0;font-size:19px;line-height:1.5;color:#D6E4F0;font-weight:500;">${esc(C.sub)}</p>
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
              <a href="#f" style="display:inline-flex;align-items:center;min-height:48px;padding:0 26px;border-radius:10px;background:#002060;color:${l.ink};text-decoration:none;font-weight:700;box-shadow:0 0 24px rgba(139,92,246,0.35);">${esc(C.cta_primary)}</a>
              <a href="#f" style="display:inline-flex;align-items:center;min-height:48px;padding:0 22px;border-radius:10px;border:1px solid ${l.cool}55;color:${l.ink};text-decoration:none;">${esc(C.cta_secondary)}</a>
            </div>
            ${swanMark(l.warm, 0.42, 92)}
          </div>` },
      ])}
    </div>
    <div style="padding: 56px 48px; display:flex; flex-direction:column; gap:52px;">
      <section style="display:flex;flex-direction:column;gap:14px;">${manifesto(l, 21)}</section>
      <section><h2 style="font-size:26px;margin-bottom:14px;">Everything a person makes${NEW}</h2>${disciplineList(l)}</section>
      <section><h2 style="font-size:26px;margin-bottom:10px;">Swan Coach builds it with your trainer${NEW}</h2>${chart(l, 150)}</section>
      <section>${economics(l)}</section>
      <section id="f" style="display:flex;flex-direction:column;gap:15px;">
        <h2 style="font-size:30px;">${esc(C.cta_title)}</h2>
        <p style="margin:0;font-size:15px;line-height:1.65;color:${l.mute};">${esc(C.cta_body)}</p>
        ${fork(l, true)}
      </section>
      ${footer(l, 'C2 · the-instrument · product-forward · dusk')}
    </div>
  </div>`);
}

/** D1 · BENEATH THE WATERLINE — full-bleed strata; dive through night, surface into dawn. */
function D1() {
  const l = L.D1;
  const strat = (bg, depth, html) => `<section style="position:relative;background:${bg};padding:74px 150px 74px 110px;">
    <div style="position:absolute;right:44px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;gap:8px;font-family:'Fira Code',monospace;font-size:10px;color:${l.warm};opacity:0.75;"><span style="writing-mode:vertical-rl;">${depth}</span></div>
    <div style="display:flex;flex-direction:column;gap:16px;max-width:820px;">${html}</div>
  </section>`;
  return shell(l, 'D1 · beneath-the-waterline', `
  ${stage(860, [
    { z: -9, html: `<div style="height:100%;background:linear-gradient(180deg,#0A1938 0%,#050914 55%,#02040A 100%)"></div>` },
    { z: -7, html: water('#0C1E3E', l.cool), blur: 0.8, pos: 'top: 0; height: 26%;' },
    { z: -5, html: `<svg viewBox="0 0 1280 500" preserveAspectRatio="none" style="width:100%;height:100%;opacity:0.5"><path d="M180 0 L300 500 L120 500 Z" fill="${l.cool}" opacity="0.10"/><path d="M640 0 L790 500 L560 500 Z" fill="${l.cool}" opacity="0.08"/><path d="M1040 0 L1180 500 L960 500 Z" fill="${l.cool}" opacity="0.09"/></svg>`, pos: 'top: 18%; bottom: 0;' },
    { z: -2, html: figures('#0A1428', 6, 0.8, 0.9), pos: 'top: 72%; height: 10%;' },
    { z: 0, html: `<div style="height:100%;display:flex;flex-direction:column;justify-content:flex-end;padding:0 110px 64px;gap:18px;">
        <h1 style="font-size:64px;line-height:1.02;font-weight:800;letter-spacing:-0.02em;">${esc(C.headline)}</h1>
        <p style="margin:0;font-size:21px;line-height:1.5;color:#D6E4F0;font-weight:500;max-width:50ch;">${esc(C.sub)}</p>
        <div style="display:flex;gap:12px;">
          <a href="#f" style="display:inline-flex;align-items:center;min-height:48px;padding:0 28px;border-radius:10px;background:#002060;color:${l.ink};text-decoration:none;font-weight:700;box-shadow:0 0 26px rgba(139,92,246,0.38);">${esc(C.cta_primary)}</a>
          <a href="#f" style="display:inline-flex;align-items:center;min-height:48px;padding:0 24px;border-radius:10px;border:1px solid ${l.cool}55;color:${l.ink};text-decoration:none;">${esc(C.cta_secondary)}</a>
        </div>
      </div>` },
  ])}
  ${strat('#04091A', '− 12 m', manifesto(l, 23))}
  ${strat('#030713', '− 34 m', `<h2 style="font-size:28px;">Everything a person makes${NEW}</h2>${disciplineCards(l, 3)}`)}
  ${strat('#02040C', '− 61 m', `<h2 style="font-size:28px;">Swan Coach builds it with your trainer${NEW}</h2>${chart(l, 160)}`)}
  ${strat('#071231', '− 22 m', economics(l))}
  <section id="f" style="background: linear-gradient(180deg,#12224C 0%,#3E3352 60%,#6E5540 100%); padding: 78px 110px; display:flex;flex-direction:column;gap:18px;">
    <div style="font-family:'Fira Code',monospace;font-size:10px;letter-spacing:0.2em;color:#FFE6C2;">SURFACE &middot; 06:14</div>
    <h2 style="font-size:36px;">${esc(C.cta_title)}</h2>
    <p style="margin:0;font-size:17px;line-height:1.65;color:#F0E4D4;max-width:70ch;">${esc(C.cta_body)}</p>
    ${fork(l, false)}
  </section>
  ${footer(l, 'D1 · beneath-the-waterline · full-cinematic · deep night rising to dawn')}`);
}

/** D2 · VEGAS MILE — marquee strip, neon blocks, wet pavement. The loudest of the eight. */
function D2() {
  const l = L.D2;
  const bulbs = `<div style="display:flex;gap:9px;align-items:center;">${Array.from({ length: 34 }, (_, i) => `<span style="width:7px;height:7px;border-radius:50%;background:${i % 3 ? l.warm : l.cool};opacity:${i % 3 ? 0.95 : 0.6};box-shadow:0 0 8px ${i % 3 ? l.warm : l.cool};"></span>`).join('')}</div>`;
  const blockk = (sign, tint, html) => `<section style="position:relative;background:${tint};padding:60px 56px;border-top:1px solid ${l.cool}2E;">
    <div style="display:inline-flex;align-items:center;gap:12px;padding:8px 18px;border:1px solid ${l.cool}66;border-radius:999px;margin-bottom:20px;box-shadow:0 0 22px ${l.cool}44, inset 0 0 14px ${l.cool}22;">
      <span style="font-family:'Fira Code',monospace;font-size:11px;letter-spacing:0.26em;color:${l.cool};">${sign}</span></div>
    <div style="display:flex;flex-direction:column;gap:16px;">${html}</div>
  </section>`;
  return shell(l, 'D2 · vegas-mile', `
  <div style="background:#02030A;padding:12px 24px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${l.cool}33;">
    ${bulbs}
    <div style="font-family:'Fira Code',monospace;font-size:11px;letter-spacing:0.3em;color:${l.warm};">SWANSTUDIOS</div>
    ${bulbs}
  </div>
  ${stage(760, [
    { z: -9, html: `<div style="height:100%;background:radial-gradient(90% 70% at 50% 25%, #1A0F3E 0%, #010204 72%)"></div>` },
    { z: -7, html: windows(l.warm, '#0A0820', 34, 9, 0.42), blur: 2.2, pos: 'top: 0; height: 58%;' },
    { z: -5, html: `<svg viewBox="0 0 1280 300" preserveAspectRatio="none" style="width:100%;height:100%;opacity:0.85">${Array.from({ length: 9 }, (_, i) => `<rect x="${60 + i * 140}" y="${40 + ((i * 37) % 90)}" width="88" height="26" rx="5" fill="none" stroke="${i % 2 ? l.cool : l.warm}" stroke-width="2" opacity="0.8"/>`).join('')}</svg>`, pos: 'top: 22%; height: 34%;' },
    { z: -2, html: figures('#050310', 16, 0.95, 1.25), pos: 'top: 62%; height: 14%;' },
    { z: -1, html: `<svg viewBox="0 0 1280 220" preserveAspectRatio="none" style="width:100%;height:100%"><rect width="1280" height="220" fill="#06040F"/>${Array.from({ length: 14 }, (_, i) => `<rect x="${(i * 97) % 1200}" y="${20 + ((i * 53) % 160)}" width="${70 + ((i * 31) % 150)}" height="4" rx="2" fill="${i % 2 ? l.cool : l.warm}" opacity="0.22"/>`).join('')}</svg>`, pos: 'bottom: 0; height: 26%;' },
    { z: 0, html: `<div style="height:100%;display:flex;flex-direction:column;justify-content:center;padding:0 56px;gap:18px;">
        <h1 style="font-size:66px;line-height:1.0;font-weight:800;letter-spacing:-0.02em;text-shadow:0 0 34px ${l.cool}77;">${esc(C.headline)}</h1>
        <p style="margin:0;font-size:20px;line-height:1.5;color:#E6DDF6;font-weight:500;max-width:50ch;">${esc(C.sub)}</p>
        <div style="display:flex;gap:12px;">
          <a href="#f" style="display:inline-flex;align-items:center;min-height:48px;padding:0 28px;border-radius:10px;background:#3B1E7A;color:${l.ink};text-decoration:none;font-weight:700;box-shadow:0 0 30px ${l.cool}66;">${esc(C.cta_primary)}</a>
          <a href="#f" style="display:inline-flex;align-items:center;min-height:48px;padding:0 24px;border-radius:10px;border:1px solid ${l.cool}77;color:${l.ink};text-decoration:none;">${esc(C.cta_secondary)}</a>
        </div>
      </div>` },
  ])}
  ${blockk('BLOCK 01 &middot; WHY', '#07051A', manifesto(l, 23))}
  ${blockk('BLOCK 02 &middot; THE MILE', '#0A0620', `<h2 style="font-size:28px;">Everything a person makes${NEW}</h2>${disciplineCards(l, 3)}`)}
  ${blockk('BLOCK 03 &middot; THE RECORD', '#060418', `<h2 style="font-size:28px;">Swan Coach builds it with your trainer${NEW}</h2>${chart(l, 150)}`)}
  ${blockk('BLOCK 04 &middot; THE DEAL', '#0B0722', economics(l))}
  <section id="f" style="background:#100A2C;padding:66px 56px;display:flex;flex-direction:column;gap:18px;border-top:1px solid ${l.cool}33;">
    ${bulbs}
    <h2 style="font-size:36px;text-shadow:0 0 24px ${l.cool}55;">${esc(C.cta_title)}</h2>
    <p style="margin:0;font-size:17px;line-height:1.65;color:#D9CFF0;max-width:70ch;">${esc(C.cta_body)}</p>
    ${fork(l, false)}
  </section>
  ${footer(l, 'D2 · vegas-mile · full-cinematic · deep night neon')}`);
}

/* ── EMIT ─────────────────────────────────────────────────────────────────── */

const BUILDERS = [
  ['Main.dc.html', 'A1', A1, 3400], ['DawnApproach.dc.html', 'A2', A2, 3300],
  ['HarborLights.dc.html', 'B1', B1, 2900], ['TwoLanterns.dc.html', 'B2', B2, 3000],
  ['InstrumentFlight.dc.html', 'C1', C1, 2900], ['TheInstrument.dc.html', 'C2', C2, 2900],
  ['BeneathTheWaterline.dc.html', 'D1', D1, 3400], ['VegasMile.dc.html', 'D2', D2, 3300],
];

const W = 1280, GAPX = 220, GAPY = 900;
const artboards = [], annotations = [];
const byId = Object.fromEntries(run.skeletons.map((s) => [s.id.slice(0, 2).toUpperCase(), s]));

BUILDERS.forEach(([file, letter, fn, h], i) => {
  fs.writeFileSync(path.join(here, file), fn(), 'utf8');
  const col = i % 4, row = Math.floor(i / 4);
  const rowH = Math.max(...BUILDERS.filter((_, j) => Math.floor(j / 4) === row).map((b) => b[3]));
  const y = row === 0 ? 0 : Math.max(...BUILDERS.slice(0, 4).map((b) => b[3])) + GAPY;
  artboards.push({ file, title: `${letter} · ${(byId[letter]?.id || file).replace(/^[A-D]\d-/, '').replace(/-/g, ' ')}`, x: col * (W + GAPX), y, w: W, h });
});

const noteH = (t, w) => { const per = Math.max(24, Math.floor(w / 8.1)); return t.split(String.fromCharCode(10)).reduce((n, p) => n + Math.max(1, Math.ceil(p.length / per)), 0) * 19 + 28; };

const LAYOUT_DESC = {
  A1: 'ONE narrow centred column, no nav at all, huge air. Depth = 4 layers (ridge / figures / water / swan).',
  A2: 'Full-width alternating BANDS that warm as you descend; content zig-zags left/right. Sticky gradient progress bar. 5 depth layers.',
  B1: 'Left rail nav + a WALL of lit windows; the skyline IS the activity feed. 5 depth layers, 14 drawn figures.',
  B2: 'Strict THREE columns with a sticky 420px river of video down the middle and a door panel on each flank.',
  C1: 'Nine/three split with a STICKY telemetry rail; the flight path IS the chart. Data reads as instruments.',
  C2: 'Fifty/fifty SPLIT: the left half is fixed and never moves while the right half scrolls past it.',
  D1: 'Full-bleed STRATA with depth markings (-12m ... -61m), diving through night and surfacing into dawn at the fork.',
  D2: 'Marquee bulb strip, neon signage blocks, wet-pavement reflections. The loudest of the eight.',
};

artboards.forEach((a, i) => {
  const letter = BUILDERS[i][1];
  const s = byId[letter] || {};
  const text = `${letter} · ${s.id || ''}\nVOLUME: ${s.volume || ''}  |  LIGHT: ${L[letter].name}\n\nLAYOUT: ${LAYOUT_DESC[letter]}\n\nPHENOMENON: ${s.phenomenon || ''}\n\nTRADEOFF: ${s.tradeoff || ''}\n\nREDUCED MOTION: ${s.reduced_motion_fallback || ''}`;
  annotations.push({ id: `note-${letter.toLowerCase()}`, x: a.x, y: a.y - (noteH(text, 430) + 48), w: 430, text });
});

annotations.push({
  id: 'run-manifest', x: -560, y: 0, w: 480,
  text: `EIGHT DIRECTIONS — REFACTOR v2 (2026-08-19)\n\nv1 was rejected: one template, eight colour swaps. The gate had measured the JSON skeletons, not the rendered pages.\n\nWHAT CHANGED\n• Eight INDEPENDENT layout functions — different nav, grid, hero, chapter arrangement.\n• REAL parallax: CSS perspective + translateZ, 4-6 drawn depth layers per board. No stock plates.\n• People are DRAWN into the world now, not asserted in a text field.\n• SwanStudios is not only training: Dance, Art & Visual Expression, Vocal & Sound Work, Photography & Graphic Design, Community — copy verbatim from CreativeExpressionSection.tsx, which is BUILT but not mounted in HomePage.V4.\n\nSHARED (never varies): the copy pack, the six chapters, two equal doors, the 15%/$1,000 economics, the H3 credit.\n\nGold tags = new copy needing Sean's approval.`,
});

fs.writeFileSync(path.join(here, 'canvas-8run.json'), JSON.stringify({ artboards, annotations, launch: { view: 'canvas' } }, null, 2) + '\n', 'utf8');
console.log(`v2: wrote ${artboards.length} artboards`);
artboards.forEach((a) => console.log(`  ${a.file.padEnd(28)} ${a.x},${a.y}  ${a.w}x${a.h}`));
