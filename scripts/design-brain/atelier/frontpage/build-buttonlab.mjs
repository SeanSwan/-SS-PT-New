#!/usr/bin/env node
/**
 * build-buttonlab.mjs — Sean's ORIGINAL glow button, rendered FAITHFULLY at last.
 *
 * WHAT I GOT WRONG TWICE:
 *   v1 of the chooser rendered a flat diagonal gradient bar across the button face and
 *   called it "sheen". Sean: "All the colors you show me, they look more cartoony."
 *   He was right, and the palette was never the problem — the ORIGINAL and the version
 *   I showed have byte-identical hex values. The METAL is in the LAYER MECHANISM.
 *
 * THE REAL MECHANISM, from frontend/src/components/Button/glowButton.jsx @ 6108f5018
 * (2025-03-17, the first-ever commit of this button):
 *
 *   1. Gradient::before is a CIRCLE — border-radius:50%, padding-bottom:100% — filled with
 *      linear-gradient(90deg, shineLeft, shineRight), scaled 1.05, pushed UP 44px, and
 *      ROTATING 360deg on a 2s infinite linear loop. Masked by the button's rounded rect,
 *      that spinning circle sweeps a band of light around the RIM. That is the metal.
 *   2. ButtonSpan sits ON TOP with background-color:var(--button-background) — a near-black —
 *      so the rotating gradient only reads as a travelling rim highlight, never a face fill.
 *   3. ButtonSpan::before is a 32px circle, filter:blur(20px), translated by
 *      --pointer-x/--pointer-y from a pointermove listener: the glow that follows the cursor
 *      "in the color of the button itself", exactly as Sean described it.
 *   4. Ripple on click; optional breathing pulse when isAnimating.
 *
 * Palette below is byte-for-byte from that file. Metallic variants are ADDITIVE: same
 * mechanism, but the shine stops become a specular ramp (dark -> hot highlight -> mid -> dark)
 * which is what actually makes a colour read as brushed/polished metal rather than paint.
 */
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

/** Byte-for-byte from glowButton.jsx @ 6108f5018 (+ primary/neonBlue from the same lineage). */
const ORIGINAL = {
  primary:  { bg: '#041e2e', sl: 'rgba(0,160,227,0.5)',  sr: 'rgba(0,255,255,0.65)',   gs: '#00A0E3', ge: '#00FFFF' },
  neonBlue: { bg: '#001122', sl: 'rgba(0,136,255,0.6)',  sr: 'rgba(0,200,255,0.8)',    gs: '#0088FF', ge: '#00C8FF' },
  purple:   { bg: '#09041e', sl: 'rgba(120,0,245,0.5)',  sr: 'rgba(200,148,255,0.65)', gs: '#B000E8', ge: '#009FFD' },
  emerald:  { bg: '#0c1e0e', sl: 'rgba(0,245,111,0.5)',  sr: 'rgba(148,255,200,0.65)', gs: '#00E8B0', ge: '#00FD9F' },
  ruby:     { bg: '#1e040c', sl: 'rgba(245,0,90,0.5)',   sr: 'rgba(255,148,180,0.65)', gs: '#E80046', ge: '#FD009F' },
  cosmic:   { bg: '#0a0a18', sl: 'rgba(86,11,173,0.5)',  sr: 'rgba(255,255,255,0.65)', gs: '#5D3FD3', ge: '#FF2E63' },
};

/** METALLIC: same mechanism, specular ramp instead of a two-stop wash.
 *  A metal reads metallic because the highlight is NARROW and HOT and sits between two
 *  darker bands — not because the hue changed. `shine` is a full multi-stop gradient. */
const METALLIC = {
  // Sean 2026-08-20: "I gotta have that purple, that baby blue, and that green... create a
  // white and black one too. A yellow one, a pink one, red, a brown, and an orange one."
  // Every ramp is SIX stops: deep shadow -> mid-dark -> HOT NARROW HIGHLIGHT -> mid -> shadow
  // -> deep. The narrow hot band between two darks is what makes a colour read as metal.
  // Where the brand has a token, the ramp is built around it rather than around a generic hue.
  purple:   { bg: '#0C0618', shine: 'linear-gradient(90deg,#100823 0%,#4b1f9e 20%,#ddc9ff 40%,#8b5cf6 54%,#33146b 74%,#0b0517 100%)', gs: '#8B5CF6', ge: '#3B1E7A', label: 'Purple — Wing Purple #8B5CF6' },
  babyBlue: { bg: '#04121F', shine: 'linear-gradient(90deg,#061826 0%,#2b7fb5 20%,#dff3ff 40%,#60c0f0 54%,#124c72 74%,#04101a 100%)', gs: '#60C0F0', ge: '#124C72', label: 'Baby blue — Ice Wing #60C0F0' },
  green:    { bg: '#04120A', shine: 'linear-gradient(90deg,#06170e 0%,#0f7a45 20%,#b6ffd8 40%,#2fbf7a 54%,#0a4429 74%,#04150c 100%)', gs: '#2FBF7A', ge: '#0A5E36', label: 'Green — emerald metal' },
  white:    { bg: '#12141A', shine: 'linear-gradient(90deg,#2a2f38 0%,#8f98a6 20%,#ffffff 40%,#dfe4ec 54%,#6b7480 74%,#1a1e25 100%)', gs: '#FFFFFF', ge: '#B9C2CE', label: 'White — pearl' },
  black:    { bg: '#050506', shine: 'linear-gradient(90deg,#0a0a0c 0%,#2a2a30 20%,#9aa0aa 40%,#4a4d55 54%,#17181c 74%,#060607 100%)', gs: '#9AA0AA', ge: '#2A2A30', label: 'Black — onyx' },
  yellow:   { bg: '#16130A', shine: 'linear-gradient(90deg,#1c1808 0%,#9c8410 20%,#fff6bf 40%,#e8c93a 54%,#6b5a0e 74%,#141105 100%)', gs: '#E8C93A', ge: '#6B5A0E', label: 'Yellow — brass' },
  pink:     { bg: '#170811', shine: 'linear-gradient(90deg,#1e0a17 0%,#a83a72 20%,#ffd6e8 40%,#f078b0 54%,#6e1e46 74%,#150610 100%)', gs: '#F078B0', ge: '#6E1E46', label: 'Pink — rose metal' },
  red:      { bg: '#14040A', shine: 'linear-gradient(90deg,#1a0510 0%,#8c0f34 20%,#ffc2d4 40%,#d2436a 54%,#5c0a22 74%,#150409 100%)', gs: '#D2436A', ge: '#6E0A26', label: 'Red — ruby metal' },
  brown:    { bg: '#120B05', shine: 'linear-gradient(90deg,#180f07 0%,#8a5a2b 20%,#f2d5b0 40%,#c08a4e 54%,#5a3a1c 74%,#100a04 100%)', gs: '#C08A4E', ge: '#5A3A1C', label: 'Brown — bronze' },
  orange:   { bg: '#150A03', shine: 'linear-gradient(90deg,#1c0d04 0%,#a85512 20%,#ffdcb0 40%,#f08a2e 54%,#6e380c 74%,#130803 100%)', gs: '#F08A2E', ge: '#6E380C', label: 'Orange — copper' },
  silver:   { bg: '#0B0E12', shine: 'linear-gradient(90deg,#1a2028 0%,#5d6b7a 20%,#eef4fb 40%,#9fb0c2 54%,#39434f 74%,#12171d 100%)', gs: '#C8D4E0', ge: '#7C8FA3', label: 'Silver — steel (his original words)' },
  gilded:   { bg: '#140F03', shine: 'linear-gradient(90deg,#1a1405 0%,#8a6c1c 20%,#fff2c4 40%,#d8b64e 54%,#5c4712 74%,#130e03 100%)', gs: '#C6A84B', ge: '#7A5E18', label: 'Gold — Gilded Fern #C6A84B' },
};

/** Faithful markup: rotating gradient circle -> near-black face -> pointer glow -> label.
 *  The rotation is a REAL CSS animation here, so the sweep actually moves on the canvas. */
function btn(key, t, label, w = 208, metallic = false) {
  const shine = metallic ? t.shine : `linear-gradient(90deg, ${t.sl}, ${t.sr})`;
  return `<div class="gwrap">
    <div class="gbtn" onMouseMove="{{ track }}" onMouseLeave="{{ untrack }}" style="--bg:${t.bg};--shine:${shine};--gs:${t.gs};--ge:${t.ge};width:${w}px;">
      <div class="grad"></div>
      <span class="face">
        <span class="pglow"></span>
        <span class="lbl">${label}</span>
      </span>
    </div>
    <div class="gkey">${key}</div>
  </div>`;
}

const CSS = `
@keyframes swanRotate { to { transform: scale(1.05) translateY(-44px) rotate(360deg) translateZ(0); } }
@keyframes swanPulse { 0%,100% { opacity:.9; transform:scale(1);} 50% { opacity:1; transform:scale(1.02);} }
.gwrap { display:flex; flex-direction:column; gap:9px; align-items:center; }
.gkey { font-family:'Fira Code',monospace; font-size:10px; letter-spacing:.10em; color:#9AA5B1; text-align:center; }
.gbtn {
  position:relative; min-height:52px; border-radius:14px; overflow:hidden;
  box-shadow:0 8px 22px rgba(0,0,0,.55);
  --pointer-x:56px; --pointer-y:12px;          /* static stand-in for the live pointermove */
}
/* 1 — the rotating gradient CIRCLE. This is the metal. */
.gbtn .grad {
  position:absolute; inset:0; border-radius:inherit; overflow:hidden;
  -webkit-mask-image:-webkit-radial-gradient(white,black);
  transform:scaleY(1.02) scaleX(1.005) rotate(-.35deg);
}
.gbtn .grad:before {
  content:''; position:absolute; top:0; left:0; right:0;
  padding-bottom:100%; border-radius:50%;
  background:var(--shine);
  transform:scale(1.05) translateY(-44px) rotate(0deg) translateZ(0);
  animation:swanRotate linear 2s infinite;
}
/* 2 — the near-black face sits ON TOP, so the sweep only reads at the rim */
.gbtn .face {
  position:absolute; inset:2px; border-radius:12px;
  background-color:var(--bg);
  display:flex; align-items:center; justify-content:center;
  overflow:hidden; -webkit-mask-image:-webkit-radial-gradient(white,black);
  text-shadow:0 1px 2px rgba(0,0,0,.5);
}
/* 3 — the glow that follows the cursor, in the button's own colour */
.gbtn .pglow {
  content:''; position:absolute; left:-26px; top:-26px;
  width:52px; height:52px; border-radius:50%;
  /* whitened CORE fading into the button's own colour, per Sean's description:
     "it had the color of the button, but it was whitened out a little bit to kinda
      show the mouse cursor covering above it type feel. It was in a circle." */
  background:radial-gradient(circle at 50% 50%, rgba(255,255,255,.92) 0%, rgba(255,255,255,.55) 26%, var(--gs) 62%, transparent 74%);
  transform:translate(var(--pointer-x),var(--pointer-y)) translateZ(0);
  filter:blur(14px); opacity:0;
  transition:opacity .35s;
  pointer-events:none;
}
.gbtn:hover .pglow { opacity:1; }
.gbtn .lbl { position:relative; z-index:1; color:#fff; font-weight:700; font-size:14.5px; letter-spacing:.02em; padding:0 18px; }
`;

const sec = (title, sub, inner) => `<section style="padding:44px 56px;border-top:1px solid rgba(139,92,246,.22);">
  <h2 style="font-size:26px;margin:0 0 6px;">${title}</h2>
  <p style="margin:0 0 24px;font-size:13.5px;line-height:1.6;color:#9AA5B1;max-width:86ch;">${sub}</p>
  ${inner}</section>`;

const grid = (items) => `<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:30px 22px;">${items}</div>`;
/** Sean: "they need to just be a random button... I like those one to one place, then random
 *  positions." Staggered wrap with varied offsets so no two sit on the same baseline. */
const scatter = (items) => `<div style="display:flex;flex-wrap:wrap;gap:26px 20px;align-items:flex-start;">${
  items.map((h, i) => `<div style="margin-top:${[0, 34, 14, 48, 6, 26][i % 6]}px;">${h}</div>`).join('')
}</div>`;

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
    body { margin:0; font-family:'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif; background:#010204; }
    a { color:#8B5CF6; } a:hover { color:#E0ECF4; }
    h1,h2 { margin:0; text-wrap:balance; }
    code { font-family:'Fira Code',monospace; color:#C6A84B; }
    ${CSS}
  </style>
</helmet>
<div style="width:1280px;background:#010204;color:#E0ECF4;">

  <section style="padding:52px 56px 34px;">
    <div style="display:inline-flex;align-items:center;gap:12px;padding:8px 18px;border:1px solid rgba(139,92,246,.4);border-radius:999px;margin-bottom:16px;box-shadow:0 0 22px rgba(139,92,246,.27);">
      <span style="font-family:'Fira Code',monospace;font-size:11px;letter-spacing:.26em;color:#8B5CF6;">BUTTON LAB</span></div>
    <h1 style="font-size:40px;line-height:1.06;font-weight:800;">Your original glow button, rendered properly</h1>
    <p style="margin:14px 0 0;font-size:15px;line-height:1.65;color:#B9CBDC;max-width:88ch;">
      Recovered from <code>frontend/src/components/Button/glowButton.jsx</code> at commit <code>6108f5018</code> &mdash;
      <strong>2025-03-17, the first time this button ever entered the repo.</strong>
      The colours are identical to the version I showed you before, so the palette was never the problem.
      What I had missed is the <strong>mechanism</strong>: a gradient-filled <strong>circle</strong>, pushed up 44px and
      <strong>rotating 360&deg; every 2 seconds</strong> behind a near-black face, so light sweeps around the <em>rim</em>
      like it is travelling over polished metal. Plus a 32px blurred blob that <strong>follows your cursor</strong>,
      tinted the button's own colour. I had flattened all of it into one static diagonal bar. That is why it read cartoony.
    </p>
    <p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#C6A84B;">
      The rotation below is a real animation &mdash; it is moving. The cursor-glow is parked at a fixed offset because an
      artboard has no live pointer; in the app it tracks <code>pointermove</code> exactly as it did originally.
    </p>
  </section>

  ${sec('1 &middot; Your six originals, byte-for-byte',
    'Exact hex and rgba values from <code>6108f5018</code>. Nothing regraded. This is what the real component renders today if you mount it.',
    grid(Object.entries(ORIGINAL).map(([k, t]) => btn(k, t, 'Join the Community')).join('')))}

  ${sec('2 &middot; THE FULL METALLIC SET &mdash; every colour Sean asked for',
    'A colour reads as metal when the highlight is <strong>narrow and hot</strong> and sits between two darker bands &mdash; not when the hue changes. These use the identical rotating-rim mechanism, but the sweep is a six-stop specular ramp instead of a two-stop wash. Green and red are here because you asked for them specifically.',
    scatter(Object.entries(METALLIC).map(([k, t], i) => btn(t.label, t, ['Join the Community','Find a Trainer','Get Started','Book a Session','Start Training','See Programs'][i % 6], [208,188,214,196,204,182][i % 6], true))))}

  <section style="padding:34px 56px 56px;border-top:1px solid rgba(139,92,246,.22);">
    <h2 style="font-size:22px;margin-bottom:12px;">What is still not shown here</h2>
    <ul style="margin:0;padding-left:20px;font-size:13.5px;line-height:1.8;color:#9AA5B1;max-width:88ch;">
      <li><strong>Live pointer tracking is NOW WIRED.</strong> Move your mouse across any button below &mdash; the whitened circle follows your cursor, same contract as the original (<code>getBoundingClientRect()</code> &rarr; <code>--pointer-x</code>/<code>--pointer-y</code>). Sean: <em>&ldquo;it had the color of the button, but it was whitened out a little bit to kinda show the mouse cursor covering above it type feel. It was in a circle.&rdquo;</em></li>
      <li><strong>The click ripple</strong> &mdash; a white circle scaling from the click point over 0.6s.</li>
      <li><strong>The breathing pulse</strong> &mdash; opt-in via <code>isAnimating</code>, 2s ease.</li>
      <li><strong>Retired-token note:</strong> <code>primary</code> and <code>neonBlue</code> carry Galaxy-Swan cyan <code>#00FFFF</code>, which CLAUDE.md retires. Shown unmodified because they are your originals.</li>
    </ul>
  </section>

</div>
</x-dc>
<script data-dc-script data-props='{"accent":{"editor":"color","default":"#8B5CF6","options":["#60C0F0","#C6A84B","#8B5CF6","#E0ECF4"]}}'>
class Component extends DCLogic {
  renderVals() {
    // LIVE pointer tracking, same contract as the original component:
    // measure the cursor against getBoundingClientRect and write --pointer-x/--pointer-y.
    const track = (e) => {
      const el = e.currentTarget; if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--pointer-x', (e.clientX - r.left) + 'px');
      el.style.setProperty('--pointer-y', (e.clientY - r.top) + 'px');
    };
    const untrack = (e) => {
      const el = e.currentTarget; if (!el) return;
      el.style.setProperty('--pointer-x', '50%');
      el.style.setProperty('--pointer-y', '50%');
    };
    return { accent: this.props.accent ?? '#8B5CF6', track, untrack };
  }
}
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(here, 'ButtonLab.dc.html'), html, 'utf8');
console.log('ButtonLab.dc.html written —', Object.keys(ORIGINAL).length, 'originals +', Object.keys(METALLIC).length, 'metallic');
