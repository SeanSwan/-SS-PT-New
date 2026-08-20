#!/usr/bin/env node
/**
 * build-winner.mjs — D2 VEGAS MILE is the winner. Sean, 2026-08-20: "I like d two."
 *
 * HIS THREE ASKS THIS PASS:
 *  1. The discipline area (singing, music, dance, voice...) becomes VIDEO BACKGROUNDS —
 *     each card's background is an H3-generated film describing that discipline.
 *  2. KEEP HIS FOOTER. "I wanna keep my footer that I already have too as well."
 *     -> replicated from frontend/src/components/Footer/Footer.tsx (446 lines).
 *  3. His ORIGINAL glow button — the SHEEN one, "more like a colored silver metal...
 *     could be green, red, all these colors" — not the current cartoony animated one.
 *     -> recovered from git 16a18d905 (pre-Crystalline). Six themes rendered as a
 *        chooser strip so he can pick. See GLOW_ORIGINAL below.
 *
 * Everything from the kill pass still holds: his header replicated and unchanged,
 * the Swans.mp4 video hero, movie areas between sections, parallax stages.
 */
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const pack = JSON.parse(fs.readFileSync(path.join(here, 'copy-pack.json'), 'utf8'));
const C = pack.verbatim, CR = pack.creative;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const NEW = '<span style="font-size:10px;letter-spacing:0.06em;color:#C6A84B;white-space:nowrap;"> [new copy - needs Sean approval]</span>';

const l = { sky: '#04060E', deep: '#010204', warm: '#C6A84B', cool: '#8B5CF6', ink: '#E0ECF4', mute: '#9A8FB8' };

/* ── ASK 3 — SEAN'S ORIGINAL GLOW BUTTON, recovered from git 16a18d905 ────────
   The sheen is a ROTATING 90deg gradient sweep (shineLeft -> shineRight) over a very
   dark base, with a blurred glow blob behind it. That metallic sweep is what he means
   by "silver metal"; the current button pulses instead, which is the "cartoony" one.
   Palette below is byte-for-byte from the recovered file. NOTE: primary/neonBlue carry
   Galaxy-Swan cyan (#00FFFF), which CLAUDE.md retires — flagged, not silently shipped. */
const GLOW_ORIGINAL = {
  primary:  { bg: '#041e2e', shineL: 'rgba(0,160,227,0.5)',  shineR: 'rgba(0,255,255,0.65)',   gs: '#00A0E3', ge: '#00FFFF', note: 'original "primary" — Galaxy-Swan cyan (RETIRED token)' },
  neonBlue: { bg: '#001122', shineL: 'rgba(0,136,255,0.6)',  shineR: 'rgba(0,200,255,0.8)',    gs: '#0088FF', ge: '#00C8FF', note: 'electric blue' },
  purple:   { bg: '#09041e', shineL: 'rgba(120,0,245,0.5)',  shineR: 'rgba(200,148,255,0.65)', gs: '#B000E8', ge: '#009FFD', note: 'violet' },
  emerald:  { bg: '#0c1e0e', shineL: 'rgba(0,245,111,0.5)',  shineR: 'rgba(148,255,200,0.65)', gs: '#00E8B0', ge: '#00FD9F', note: 'GREEN — the one he asked about' },
  ruby:     { bg: '#1e040c', shineL: 'rgba(245,0,90,0.5)',   shineR: 'rgba(255,148,180,0.65)', gs: '#E80046', ge: '#FD009F', note: 'RED — the one he asked about' },
  cosmic:   { bg: '#0a0a18', shineL: 'rgba(86,11,173,0.5)',  shineR: 'rgba(255,255,255,0.65)', gs: '#5D3FD3', ge: '#FF2E63', note: 'purple -> hot pink' },
};
/** A Crystalline-graded silver/chrome added by me — closest to "colored silver metal". */
const GLOW_EXTRA = {
  chrome:   { bg: '#101418', shineL: 'rgba(255,255,255,0.55)', shineR: 'rgba(190,205,220,0.85)', gs: '#C8D4E0', ge: '#8FA8C8', note: 'SILVER CHROME — new, my read of "colored silver metal"' },
  gilded:   { bg: '#1A1505', shineL: 'rgba(198,168,75,0.55)',  shineR: 'rgba(218,195,110,0.75)', gs: '#C6A84B', ge: '#DAC36E', note: 'gold — from the SheenCard palette' },
};

/** Faithful static render of the original: dark base, blurred glow, rotating sheen bar. */
function glowBtn(key, t, label, w = 200) {
  return `<div style="position:relative;display:inline-block;">
    <div style="position:absolute;inset:-10px;border-radius:16px;background:linear-gradient(90deg,${t.gs},${t.ge});filter:blur(20px);opacity:0.55;"></div>
    <div style="position:relative;width:${w}px;min-height:48px;border-radius:14px;background:${t.bg};overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 22px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.10);">
      <span style="position:absolute;left:-20%;top:-60%;width:140%;height:220%;background:linear-gradient(90deg,${t.shineL},${t.shineR});transform:rotate(18deg);opacity:0.55;"></span>
      <span style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0) 42%);"></span>
      <span style="position:relative;color:#fff;font-weight:700;font-size:14.5px;letter-spacing:0.02em;">${label}</span>
    </div>
    <div style="margin-top:7px;font-family:'Fira Code',monospace;font-size:9.5px;letter-spacing:0.10em;color:${l.mute};text-align:center;width:${w}px;">${key}</div>
  </div>`;
}

const glowChooser = () => `<section style="background:#07051A;padding:52px 56px;border-top:1px solid ${l.cool}2E;">
  <div style="display:inline-flex;align-items:center;gap:12px;padding:8px 18px;border:1px solid ${l.cool}66;border-radius:999px;margin-bottom:10px;box-shadow:0 0 22px ${l.cool}44,inset 0 0 14px ${l.cool}22;">
    <span style="font-family:'Fira Code',monospace;font-size:11px;letter-spacing:0.26em;color:${l.cool};">PICK YOUR BUTTON</span></div>
  <h2 style="font-size:26px;margin:6px 0 6px;">Your original sheen glow button, recovered${NEW}</h2>
  <p style="margin:0 0 22px;font-size:13.5px;line-height:1.6;color:${l.mute};max-width:78ch;">
    Recovered from git <code style="color:${l.warm};">16a18d905</code> &mdash; the version before the Galaxy-Swan &rarr; Crystalline migration.
    The sheen is a rotating 90&deg; gradient sweep over a very dark base with a blurred glow behind it: that is the metal look.
    The button currently shipping pulses and breathes instead &mdash; that is the &ldquo;cartoony&rdquo; one.
    The first six are <strong>yours, byte-for-byte</strong>. The last two I added.${NEW}</p>
  <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:26px 20px;">
    ${Object.entries(GLOW_ORIGINAL).map(([k, t]) => glowBtn(k, t, 'Join the Community')).join('\n    ')}
    ${Object.entries(GLOW_EXTRA).map(([k, t]) => glowBtn(k, t, 'Join the Community')).join('\n    ')}
  </div>
  <div style="margin-top:20px;display:flex;flex-direction:column;gap:5px;font-size:11.5px;color:${l.mute};">
    ${Object.entries({ ...GLOW_ORIGINAL, ...GLOW_EXTRA }).map(([k, t]) => `<div><span style="color:${l.warm};font-family:'Fira Code',monospace;">${k.padEnd(9)}</span> &mdash; ${t.note}</div>`).join('\n    ')}
  </div>
  <div style="margin-top:16px;font-size:11.5px;color:${l.warm};">&#9888; <strong>primary</strong> and <strong>neonBlue</strong> carry Galaxy-Swan cyan (#00FFFF), which CLAUDE.md retires. Shown because they are your originals &mdash; say the word and I regrade them to Crystalline.</div>
</section>`;

/* ── PARALLAX + ART ──────────────────────────────────────────────────────── */
const bgImg = (f, o = 1) => `<img src="${f}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;opacity:${o}">`;
const logoMark = (w = 120, o = 1) => `<img src="swan-logo.png" alt="SwanStudios" style="width:${w}px;height:${w}px;display:block;opacity:${o}">`;
const figures = (c, n, o, s = 1) => `<svg viewBox="0 0 1280 120" preserveAspectRatio="none" style="width:100%;height:100%;display:block;opacity:${o}">${Array.from({ length: n }, (_, i) => { const x = 40 + ((i * 1493) % 1200); const h = (16 + ((i * 7) % 9)) * s; const y = 110 - h; return `<g fill="${c}"><ellipse cx="${x}" cy="${y - h * 0.16}" rx="${h * 0.13}" ry="${h * 0.15}"/><rect x="${x - h * 0.11}" y="${y}" width="${h * 0.22}" height="${h * 0.62}" rx="${h * 0.09}"/></g>`; }).join('')}</svg>`;
const windows = (warm, cool, cols, rows, lit = 0.5) => `<svg viewBox="0 0 ${cols * 40} ${rows * 46}" preserveAspectRatio="none" style="width:100%;height:100%;display:block">${Array.from({ length: cols * rows }, (_, i) => { const cx = (i % cols) * 40, cy = Math.floor(i / cols) * 46; const on = ((i * 79) % 100) / 100 < lit; return `<rect x="${cx + 6}" y="${cy + 6}" width="26" height="32" rx="2" fill="${on ? warm : cool}" opacity="${on ? (0.34 + ((i * 13) % 50) / 100).toFixed(2) : 0.1}"/>`; }).join('')}</svg>`;

function stage(height, layers) {
  return `<div style="position:relative;height:${height}px;overflow:hidden;perspective:12px;perspective-origin:50% 50%;transform-style:preserve-3d;">
    ${layers.map((x) => { const z = x.z ?? 0, s = (12 - z) / 12; return `<div style="position:absolute;left:0;right:0;${x.pos || 'top:0;bottom:0;'}transform:translateZ(${z}px) scale(${s.toFixed(3)});transform-origin:50% 50%;${x.blur ? `filter:blur(${x.blur}px);` : ''}">${x.html}</div>`; }).join('\n    ')}
  </div>`;
}

/* ── HIS HEADER (replicated, unchanged) ── */
const HEADER_H = 64;
const swanHeader = () => {
  const link = (t) => `<a href="#" style="text-decoration:none;color:#D6E4F0;font-size:13.5px;font-weight:600;min-height:44px;display:inline-flex;align-items:center;">${t}</a>`;
  return `<header style="position:sticky;top:0;z-index:50;height:${HEADER_H}px;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:0 24px;background:rgba(10,16,34,0.72);backdrop-filter:blur(20px) saturate(1.8);border-bottom:1px solid rgba(96,192,240,0.18);">
    <div style="display:flex;align-items:center;gap:10px;">${logoMark(36)}<span style="font-weight:800;font-size:15px;color:#E0ECF4;">SwanStudios</span></div>
    <nav style="display:flex;align-items:center;gap:22px;">${['Home', 'Store', 'Video Library', 'Waiver', 'Contact', 'Photography', 'About'].map(link).join('')}</nav>
    <div style="display:flex;align-items:center;gap:10px;">
      <a href="#" style="text-decoration:none;color:#D6E4F0;font-size:13.5px;font-weight:600;min-height:44px;display:inline-flex;align-items:center;padding:0 12px;">Login</a>
      <a href="#" style="text-decoration:none;color:#E0ECF4;font-size:13.5px;font-weight:700;min-height:44px;display:inline-flex;align-items:center;padding:0 16px;border-radius:8px;background:#002060;box-shadow:0 0 18px rgba(139,92,246,0.35);">Sign Up</a></div>
  </header>
  <div style="height:2px;background:linear-gradient(90deg,#60C0F0,#8B5CF6 50%,#C6A84B);opacity:0.55;"></div>
  <div style="padding:6px 24px;font-size:10px;letter-spacing:0.16em;color:#7C93AD;border-bottom:1px solid rgba(255,255,255,0.06);">EXISTING HEADER &mdash; REPLICATED FROM components/Header/header.tsx &middot; NOT REDESIGNED</div>`;
};

/* ── ASK 2 — HIS FOOTER, replicated from components/Footer/Footer.tsx ── */
const FOOTER_COLS = [
  ['Quick Links', ['Home', 'Store', 'About Us', 'Contact', 'Video Library']],
  ['Programs', ['Personal Training', 'Group Classes', 'Online Training', 'Nutrition Coaching', 'Recovery &amp; Wellness']],
  ['Contact Us', ['Anaheim Hills', 'Hours', 'Phone', 'Email']],
];
const swanFooter = () => `<footer style="background:#04060E;border-top:1px solid ${l.cool}33;padding:46px 56px 30px;">
  <div style="padding:6px 0 18px;font-size:10px;letter-spacing:0.16em;color:#7C93AD;">EXISTING FOOTER &mdash; REPLICATED FROM components/Footer/Footer.tsx &middot; NOT REDESIGNED</div>
  <div style="display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:34px;">
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;align-items:center;gap:10px;">${logoMark(42)}<span style="font-weight:800;font-size:17px;color:${l.ink};">SwanStudios</span></div>
      <div style="font-size:13px;line-height:1.6;color:${l.mute};">Excellence in Performance Training</div>
      <div style="display:flex;gap:10px;margin-top:4px;">
        ${['F', 'IG', 'in', 'YT'].map((s) => `<span style="width:34px;height:34px;border-radius:9px;border:1px solid ${l.cool}44;display:grid;place-items:center;font-size:11px;font-weight:700;color:${l.mute};">${s}</span>`).join('')}
      </div>
      <div style="margin-top:10px;padding:14px;border:1px solid ${l.cool}33;border-radius:12px;">
        <div style="font-size:13px;font-weight:700;color:${l.ink};margin-bottom:8px;">Stay in the loop</div>
        <div style="display:flex;gap:8px;"><span style="flex-grow:1;height:40px;border-radius:8px;border:1px solid ${l.cool}33;background:#00000055;"></span>
        <span style="height:40px;min-width:80px;border-radius:8px;background:#002060;display:grid;place-items:center;font-size:12px;font-weight:700;color:${l.ink};">Join</span></div>
      </div>
    </div>
    ${FOOTER_COLS.map(([h, items]) => `<div style="display:flex;flex-direction:column;gap:9px;">
      <div style="font-size:13px;font-weight:700;color:${l.ink};letter-spacing:0.04em;">${h}</div>
      ${items.map((i) => `<a href="#" style="text-decoration:none;font-size:13px;color:${l.mute};min-height:24px;">${i}</a>`).join('\n      ')}
    </div>`).join('\n    ')}
  </div>
  <div style="margin-top:30px;padding-top:18px;border-top:1px solid ${l.cool}22;display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap;">
    <div style="font-size:12px;color:${l.mute};">&copy; SwanStudios. Motion and iconography generated with MiniMax H3.</div>
    <div style="display:flex;gap:18px;">
      <a href="#" style="text-decoration:none;font-size:12px;color:${l.mute};">Privacy Policy</a>
      <a href="#" style="text-decoration:none;font-size:12px;color:${l.mute};">Terms of Service</a>
    </div>
  </div>
</footer>`;

/* ── ASK 1 — DISCIPLINE CARDS AS VIDEO BACKGROUNDS ────────────────────────── */
const DISCIPLINES = [
  ['Training', 'Strength, power, mobility &mdash; logged against a written plan.', 'features-swan-bg.jpg', 'A lift from three angles, chalk in the light.'],
  [esc(CR.dance_title), esc(CR.dance_desc), 'social-hero-bg.jpg', 'Bodies moving through a shaft of light, shot slow.'],
  [esc(CR.art_title), esc(CR.art_desc), 'about-hero-bg.jpg', 'A brush loaded with paint meeting canvas, macro.'],
  [esc(CR.vocal_title), esc(CR.vocal_desc), 'testimonials-swan-bg.jpg', 'A mic in a dark booth, breath visible, one lamp.'],
  ['Photography &amp; Graphic Design', 'Shoot it, design it, publish it &mdash; the studio is part of the membership.', 'video-library-bg.jpg', 'A shutter, a contact sheet, a layout snapping to grid.'],
  [esc(CR.community_title), esc(CR.community_desc), 'beyond-the-gym-bg.jpg', 'A room of people mid-laugh, handheld, warm.'],
];

const disciplineVideoCards = () => `<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;">
  ${DISCIPLINES.map(([t, d, plate, brief], i) => `<div style="position:relative;border-radius:14px;overflow:hidden;min-height:264px;border:1px solid ${l.cool}3A;">
    <div style="position:absolute;inset:0;">${bgImg(plate, 0.55)}</div>
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(2,3,10,0.30) 0%,rgba(2,3,10,0.86) 62%,rgba(2,3,10,0.96) 100%);"></div>
    <div style="position:absolute;top:12px;left:12px;display:inline-flex;align-items:center;gap:7px;padding:5px 10px;border-radius:999px;border:1px solid ${l.cool}77;background:rgba(0,0,0,0.5);backdrop-filter:blur(6px);">
      <svg viewBox="0 0 24 24" style="width:11px;height:11px;"><path d="M7 4 L20 12 L7 20 Z" fill="${l.warm}"/></svg>
      <span style="font-family:'Fira Code',monospace;font-size:8.5px;letter-spacing:0.16em;color:${l.ink};">VIDEO BG ${i + 1} &middot; H3</span></div>
    <div style="position:relative;height:100%;display:flex;flex-direction:column;justify-content:flex-end;gap:8px;padding:18px;">
      <div style="font-size:17px;font-weight:700;color:${l.ink};">${t}</div>
      <div style="font-size:12.5px;line-height:1.5;color:#CFC4E6;">${d}</div>
      <div style="margin-top:4px;padding-top:8px;border-top:1px solid ${l.cool}33;font-size:11px;line-height:1.45;color:${l.warm};">FILM BRIEF: ${brief}${NEW}</div>
    </div>
  </div>`).join('\n  ')}
</div>`;

/* ── shared content ── */
const manifesto = () => `
  <p style="margin:0;font-size:23px;line-height:1.48;color:${l.ink};font-weight:500;text-wrap:pretty;">${esc(C.mission_1)}</p>
  <p style="margin:0;font-size:17px;line-height:1.66;color:${l.mute};max-width:60ch;">${esc(C.mission_2)}</p>
  <p style="margin:0;font-size:17px;line-height:1.66;color:${l.mute};max-width:60ch;">${esc(C.mission_3)}</p>
  <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:27px;line-height:1.32;color:${l.warm};">${esc(C.mission_closing)}</p>`;

const chart = () => `<svg viewBox="0 0 600 150" style="width:100%;height:150px;display:block">
  <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${l.cool}" stop-opacity="0.30"/><stop offset="1" stop-color="${l.cool}" stop-opacity="0"/></linearGradient></defs>
  <path d="M0 132 L100 110 L200 116 L300 84 L400 66 L500 42 L600 22 L600 150 L0 150 Z" fill="url(#cg)"/>
  <path d="M0 132 L100 110 L200 116 L300 84 L400 66 L500 42 L600 22" stroke="${l.cool}" stroke-width="2.4" fill="none"/>
  <path d="M0 126 L600 32" stroke="${l.warm}" stroke-width="1.6" stroke-dasharray="5 5" fill="none" opacity="0.8"/></svg>
<div style="font-size:11px;color:${l.mute};margin-top:6px;">Gold = the written plan. Blue = sessions actually logged. Labelled demo dataset.${NEW}</div>`;

const economics = () => `<div style="display:flex;flex-direction:column;gap:10px;padding:22px;border:1px solid ${l.warm}55;border-radius:14px;background:#FFFFFF07;">
  <div style="font-size:11px;letter-spacing:0.20em;color:${l.warm};">IF YOU ARE A TRAINER OR A CREATOR</div>
  <div style="font-size:44px;font-weight:800;line-height:1;color:${l.warm};">15%</div>
  <div style="font-size:15px;line-height:1.55;color:${l.ink};">Never more than <strong>$1,000 a month</strong>. Card processing included. No monthly fee, no setup fee. We only make money when you do.${NEW}</div></div>`;

const movieSlot = (n, title, note, plate) => stage(430, [
  { z: -11, html: bgImg(plate, 0.85), blur: 1.2 },
  { z: -7, html: `<div style="height:100%;background:radial-gradient(80% 70% at 50% 50%, rgba(0,0,0,0.10), ${l.deep}E6)"></div>` },
  { z: -3, html: figures(l.deep, 8, 0.55, 0.9), pos: 'bottom:0;height:16%;' },
  { z: 0, html: `<div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:13px;text-align:center;padding:0 60px;">
      <div style="width:74px;height:74px;border-radius:50%;border:2px solid ${l.cool};display:grid;place-items:center;box-shadow:0 0 30px ${l.cool}66;background:rgba(0,0,0,0.34);">
        <svg viewBox="0 0 24 24" style="width:28px;height:28px;margin-left:4px;"><path d="M7 4 L20 12 L7 20 Z" fill="${l.ink}"/></svg></div>
      <div style="font-family:'Fira Code',monospace;font-size:10px;letter-spacing:0.24em;color:${l.warm};">MOVIE AREA ${n} &middot; MINIMAX H3</div>
      <div style="font-size:26px;font-weight:700;color:${l.ink};">${title}${NEW}</div>
      <div style="font-size:13.5px;line-height:1.55;color:${l.ink};opacity:0.86;max-width:62ch;">${note}${NEW}</div></div>` },
]);

const bulbs = `<div style="display:flex;gap:9px;align-items:center;">${Array.from({ length: 30 }, (_, i) => `<span style="width:7px;height:7px;border-radius:50%;background:${i % 3 ? l.warm : l.cool};opacity:${i % 3 ? 0.95 : 0.6};box-shadow:0 0 8px ${i % 3 ? l.warm : l.cool};"></span>`).join('')}</div>`;
const blockk = (sign, tint, html) => `<section style="background:${tint};padding:56px;border-top:1px solid ${l.cool}2E;">
  <div style="display:inline-flex;align-items:center;gap:12px;padding:8px 18px;border:1px solid ${l.cool}66;border-radius:999px;margin-bottom:20px;box-shadow:0 0 22px ${l.cool}44,inset 0 0 14px ${l.cool}22;">
    <span style="font-family:'Fira Code',monospace;font-size:11px;letter-spacing:0.26em;color:${l.cool};">${sign}</span></div>
  <div style="display:flex;flex-direction:column;gap:16px;">${html}</div></section>`;

const body = `
${swanHeader()}
<div style="background:#02030A;padding:11px 24px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${l.cool}33;">
  ${bulbs}<div style="font-family:'Fira Code',monospace;font-size:11px;letter-spacing:0.3em;color:${l.warm};">THE MILE</div>${bulbs}
</div>

${stage(640, [
  { z: -11, html: bgImg('swans-hero-frame.jpg', 1) },
  { z: -8, html: `<div style="height:100%;background:linear-gradient(180deg,rgba(4,8,20,0.34) 0%,rgba(4,8,20,0.60) 55%,${l.deep} 100%)"></div>` },
  { z: -4, html: figures('#0A1220', 5, 0.5, 0.8), pos: 'bottom:4%;height:10%;' },
  { z: 0, html: `<div style="height:100%;display:flex;flex-direction:column;justify-content:flex-end;padding:0 56px 44px;gap:16px;">
      <div style="display:inline-flex;align-items:center;gap:9px;align-self:flex-start;padding:6px 13px;border-radius:999px;border:1px solid ${l.cool}66;background:rgba(0,0,0,0.42);backdrop-filter:blur(6px);">
        <span style="width:8px;height:8px;border-radius:50%;background:${l.warm};box-shadow:0 0 8px ${l.warm};"></span>
        <span style="font-family:'Fira Code',monospace;font-size:10px;letter-spacing:0.2em;color:${l.ink};">VIDEO SLOT &middot; Swans.mp4 &middot; SWAPPABLE FOR H3</span></div>
      ${logoMark(80)}
      <h1 style="font-size:64px;line-height:1.0;font-weight:800;letter-spacing:-0.02em;text-shadow:0 0 34px ${l.cool}77;">${esc(C.headline)}</h1>
      <p style="margin:0;font-size:20px;line-height:1.5;color:#E6DDF6;font-weight:500;max-width:50ch;">${esc(C.sub)}</p>
      <div style="display:flex;gap:14px;align-items:flex-start;">
        ${glowBtn('cosmic', GLOW_ORIGINAL.cosmic, esc(C.cta_primary), 220)}
        ${glowBtn('chrome', GLOW_EXTRA.chrome, esc(C.cta_secondary), 200)}
      </div></div>` },
])}

${blockk('BLOCK 01 &middot; WHY', '#07051A', manifesto())}

${movieSlot(1, 'Neon Mile, Opening Night', 'Push down a rain-slick boulevard; every sign is a discipline. 8-12s, loops on the wet pavement.', 'store-hero-bg.jpg')}

${blockk('BLOCK 02 &middot; THE MILE', '#0A0620', `<h2 style="font-size:28px;">Everything a person makes${NEW}</h2>
  <p style="margin:0 0 4px;font-size:13.5px;color:${l.mute};max-width:78ch;">Each card's background is its own H3 film &mdash; the video describes the discipline. Briefs written below each.${NEW}</p>
  ${disciplineVideoCards()}`)}

${stage(280, [
  { z: -11, html: bgImg('beyond-the-gym-bg.jpg', 0.9), blur: 1.0 },
  { z: -6, html: windows(l.warm, '#0A0820', 32, 6, 0.44), blur: 1.8, pos: 'top:6%;height:60%;' },
  { z: -2, html: figures('#050310', 15, 0.9, 1.2), pos: 'bottom:0;height:24%;' },
])}

${blockk('BLOCK 03 &middot; THE RECORD', '#060418', `<h2 style="font-size:28px;">Swan Coach builds it with your trainer${NEW}</h2>${chart()}`)}

${movieSlot(2, 'The Record, In Motion', 'Twelve weeks of a real progression rendered as light travelling up the strip. 10-15s.', 'features-swan-bg.jpg')}

${blockk('BLOCK 04 &middot; THE DEAL', '#0B0722', economics())}

${glowChooser()}

<section id="f" style="background:#100A2C;padding:60px 56px;display:flex;flex-direction:column;gap:18px;border-top:1px solid ${l.cool}33;">
  ${bulbs}
  <h2 style="font-size:36px;text-shadow:0 0 24px ${l.cool}55;">${esc(C.cta_title)}</h2>
  <p style="margin:0;font-size:17px;line-height:1.65;color:#D9CFF0;max-width:70ch;">${esc(C.cta_body)}</p>
  <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;">
    <a href="#" style="display:flex;flex-direction:column;gap:8px;padding:26px;border-radius:16px;background:#002060;text-decoration:none;color:${l.ink};box-shadow:0 0 28px rgba(139,92,246,0.32);min-height:44px;">
      <div style="font-size:22px;font-weight:700;">${esc(C.cta_secondary)}</div>
      <div style="font-size:13px;color:#B9CBDC;">Browse real trainers and creators before you sign up.${NEW}</div></a>
    <a href="#" style="display:flex;flex-direction:column;gap:8px;padding:26px;border-radius:16px;background:#3B1E7A;text-decoration:none;color:${l.ink};box-shadow:0 0 28px rgba(96,192,240,0.30);min-height:44px;">
      <div style="font-size:22px;font-weight:700;">Build your practice here${NEW}</div>
      <div style="font-size:13px;color:#D9CBF0;">Bring your clients. Keep your business. One email to start.${NEW}</div></a></div>
  <div style="font-size:11px;color:${l.warm};">&#9888; The second door has no destination yet &mdash; /trainers capture funnel is a hard dependency (F5).</div>
</section>

${swanFooter()}`;

const html = `<!doctype html>
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
    code { font-family:'Fira Code',monospace; }
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

fs.writeFileSync(path.join(here, 'Main.dc.html'), html, 'utf8');
for (const f of ['VegasMile.dc.html']) { const p = path.join(here, f); if (fs.existsSync(p)) fs.unlinkSync(p); }

const noteText = `D2 · VEGAS MILE — THE WINNER\n\nSean 2026-08-20: "I like d two."\n\nTHIS PASS:\n1. DISCIPLINE CARDS ARE VIDEO BACKGROUNDS. All six (Training / Dance / Art & Visual / Vocal & Sound / Photography & Graphic Design / Community) carry a VIDEO BG badge and a written FILM BRIEF for the H3 film that becomes that card's background.\n2. HIS FOOTER IS BACK, replicated from components/Footer/Footer.tsx — brand + tagline + socials + "Stay in the loop", Quick Links / Programs / Contact Us, Privacy Policy + Terms.\n3. HIS ORIGINAL SHEEN GLOW BUTTON, recovered from git 16a18d905 (pre-Crystalline). Eight swatches at the bottom to pick from: his six originals byte-for-byte (primary / neonBlue / purple / emerald=GREEN / ruby=RED / cosmic) plus chrome (silver) and gilded (gold) added by me.\n\nSTILL TRUE: his header replicated and unchanged · the Swans.mp4 video hero (swappable for H3) · 2 movie areas · 4 parallax stages.\n\nHEADS UP: primary and neonBlue carry Galaxy-Swan cyan #00FFFF, a RETIRED token. Shown because they are his originals — say the word and they get regraded.`;
const noteH = (t, w) => { const per = Math.max(24, Math.floor(w / 8.1)); return t.split(String.fromCharCode(10)).reduce((n, p) => n + Math.max(1, Math.ceil(p.length / per)), 0) * 19 + 28; };

fs.writeFileSync(path.join(here, 'canvas-8run.json'), JSON.stringify({
  artboards: [{ file: 'Main.dc.html', title: 'D2 · vegas mile — WINNER', x: 0, y: 0, w: 1280, h: 4600 }],
  annotations: [{ id: 'note-winner', x: 1420, y: 0, w: 480, text: noteText }],
  launch: { view: 'canvas' },
}, null, 2) + '\n', 'utf8');
console.log('winner: D2 written to Main.dc.html');
