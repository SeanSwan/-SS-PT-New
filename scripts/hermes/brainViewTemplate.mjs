/**
 * brainViewTemplate.mjs — HTML/SVG renderer for the Hermes Brain (F-2/SB-2,
 * elevated per Sean's "make it extremely beautiful" directive). Signature
 * moments: the dual-glow spinning core (Ice Wing × Wing Purple — the house
 * Dual-Button-Glow doctrine applied to the brain), synapse particles flowing
 * along live edges (CSS offset-path, no JS), a health aurora readable from
 * across the room, a vitals HUD, and the hour-by-hour thinking sparkline.
 * Zero action surface; reduced-motion kills all animation. Tokenized skin in
 * brainViewStyles.mjs so future apps can rebrand the shell wholesale.
 */
import { CSS, PAL } from './brainViewStyles.mjs';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CX = 640, CY = 330;

function arc(count, i, radius, startDeg, endDeg) {
  const t = count === 1 ? 0.5 : i / (count - 1);
  const a = ((startDeg + (endDeg - startDeg) * t) * Math.PI) / 180;
  return { x: +(CX + radius * Math.cos(a)).toFixed(1), y: +(CY + radius * Math.sin(a)).toFixed(1) };
}
// Deterministic pseudo-random (no Math.random — renders must be reproducible)
const jitter = (i, m) => ((i * 2654435761) % 1000) / 1000 * m;

function node(p, { color, label, sub = '', state = 'live', r = 22, small = false, spark = false, delay = 0 }) {
  const dim = state === 'dark' || state === 'idle';
  const fault = state === 'fault';
  const planned = state === 'planned';
  const stroke = fault ? PAL.fault : dim ? PAL.dim : color;
  const live = state === 'live' || state === 'on';
  return `
  <g>
    <line x1="${CX}" y1="${CY}" x2="${p.x}" y2="${p.y}" class="edge ${live ? 'live' : ''}" stroke="${stroke}"/>
    ${spark && live ? `<circle class="spark" r="2.2" fill="${color}" style="offset-path:path('M ${CX} ${CY} L ${p.x} ${p.y}');animation-delay:${delay}s"/>` : ''}
    <circle cx="${p.x}" cy="${p.y}" r="${r}" class="node ${live ? 'pulse' : ''}" fill="url(#orb)"
      stroke="${stroke}" stroke-width="${small ? 1.4 : 2.4}" ${planned ? 'stroke-dasharray="4 4"' : ''} style="--glow:${stroke}">
      <title>${esc(sub || label)}</title>
    </circle>
    ${fault ? `<text x="${p.x}" y="${p.y + 4}" class="mark" fill="${PAL.fault}">!</text>` : ''}
    ${small ? '' : `<text x="${p.x}" y="${p.y + r + 14}" class="lbl" fill="${dim ? PAL.muted : PAL.text}">${esc(label)}</text>`}
    ${small || !sub ? '' : `<text x="${p.x}" y="${p.y + r + 27}" class="sub">${esc(sub)}</text>`}
  </g>`;
}

const stars = () => Array.from({ length: 46 }, (_, i) =>
  `<circle class="star" cx="${(37 * i * 7919) % 1280}" cy="${(53 * i * 6101) % 640}" r="${(i % 3) * 0.45 + 0.35}" style="animation-delay:${jitter(i, 4).toFixed(1)}s"/>`).join('');

function sparkline(hours) {
  const max = Math.max(...hours, 1);
  const bars = hours.map((v, h) => {
    const bh = v ? Math.max(3, (v / max) * 26) : 2;
    return `<rect class="${v ? '' : 'zero'}" x="${h * 11.5}" y="${28 - bh}" width="8" height="${bh}" rx="1.5"><title>${String(h).padStart(2, '0')}:00 UTC — ${v} receipt(s)</title></rect>`;
  }).join('');
  return `<svg class="sparkline" viewBox="0 0 276 30" width="100%" height="30" role="img" aria-label="receipts by hour">${bars}</svg>`;
}

export function renderBrainHtml(d) {
  const parts = [];
  d.applications.forEach((a, i) => parts.push(node(arc(d.applications.length, i, 300, 122, 238),
    { color: PAL.app, label: a.label, sub: a.state, state: a.state === 'live' ? 'live' : a.state, spark: true, delay: jitter(i, 3) })));
  d.routines.forEach((r, i) => parts.push(node(arc(Math.max(d.routines.length, 2), i, 238, 243, 297),
    { color: PAL.routine, label: r.label, sub: r.cadence + (r.state === 'fault' ? ' · DEMOTED' : r.state === 'live' ? ' · ran today' : ''), state: r.state, spark: true, delay: jitter(i + 9, 3) })));
  d.memory.forEach((m, i) => parts.push(node(arc(d.memory.length, i, 262, 57, 123),
    { color: PAL.memory, label: m.label + (m.count != null ? ` (${m.count})` : ''), sub: m.kind, state: 'live', spark: i < 3, delay: jitter(i + 17, 3) })));
  d.skills.forEach((s, i) => parts.push(node(arc(Math.max(d.skills.length, 2), i, 302, -54, 54),
    { color: PAL.skill, label: s, sub: s, state: 'live', r: 6.5, small: true, spark: i % 5 === 0, delay: jitter(i + 29, 3.4) })));

  const aur = d.health === 'red' ? PAL.fault : d.health === 'amber' ? PAL.routine : PAL.app;
  const swChips = d.switches === null
    ? `<span class="chip bad">switches UNREADABLE — fail closed</span>`
    : d.switches.map((s) => `<span class="chip ${s.on ? 'on' : 'off'}">${esc(s.name.replace('SWITCH_', ''))}</span>`).join('');
  const anchorCls = d.anchorLevel === 'ok' ? 'on' : d.anchorLevel === 'warn' ? 'warn' : 'bad';
  const tiles = [
    [d.receiptCount, 'receipts today', PAL.app], [d.skills.length, 'skills wired', PAL.skill],
    [d.memoriesTotal ?? '—', 'memory notes', PAL.memory], [d.routines.length, 'routines', PAL.routine],
    [d.queueOpen, 'await approval', d.queueOpen ? PAL.routine : PAL.app],
    [d.anchorLevel.toUpperCase(), 'anchor', d.anchorLevel === 'ok' ? PAL.app : d.anchorLevel === 'warn' ? PAL.routine : PAL.fault],
  ].map(([n, k, c]) => `<div class="tile" style="--tc:${c}"><div class="n">${esc(String(n))}</div><div class="k">${esc(k)}</div></div>`).join('');

  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hermes Brain · Command Center</title>
<style>${CSS}</style>
<div class="aurora" style="--aur:${aur}"></div>
<header>
  <h1>HERMES <em>BRAIN</em> <span class="muted" style="letter-spacing:.02em">· second-brain command center · ${esc(d.isoDate)}</span></h1>
  <div class="nba"><b>NEXT BEST ACTION</b> · ${esc(d.nba)}</div>
</header>
<div class="hud">${tiles}</div>
<div class="wrap">
<svg class="brain" viewBox="0 0 1280 640" role="img" aria-label="Hermes second-brain graph">
  <defs>
    <radialGradient id="orb" cx="35%" cy="30%"><stop offset="0%" stop-color="#232b45"/><stop offset="100%" stop-color="#101018"/></radialGradient>
  </defs>
  ${stars()}
  <circle class="orbit" cx="${CX}" cy="${CY}" r="238"/><circle class="orbit" cx="${CX}" cy="${CY}" r="300"/>
  <text x="235" y="616" class="cluster">APPLICATIONS · C2</text>
  <text x="640" y="26" class="cluster">ROUTINES · C4</text>
  <text x="640" y="632" class="cluster">MEMORY · C1</text>
  <text x="1075" y="616" class="cluster">SKILLS · C3 (${d.skills.length})</text>
  ${parts.join('\n')}
  <circle class="core-ring" cx="${CX}" cy="${CY}" r="46"/><circle class="core-ring r2" cx="${CX}" cy="${CY}" r="46"/>
  <circle class="core-spin" cx="${CX}" cy="${CY}" r="58"/>
  <circle class="core-glow" cx="${CX}" cy="${CY}" r="44" fill="url(#orb)" stroke="${PAL.app}" stroke-width="3"/>
  <text x="${CX}" y="${CY - 2}" class="lbl" style="font-size:14px;letter-spacing:.14em" fill="${PAL.text}">${esc(d.brain.label)}</text>
  <text x="${CX}" y="${CY + 14}" class="sub">${esc(d.brain.sub)}</text>
</svg>
<div class="panel">
  <h2>THINKING TODAY <span class="muted">(${d.receiptCount} receipts by hour, UTC)</span></h2>
  ${sparkline(d.hourly)}
  <h2>THOUGHT STREAM</h2>
  ${d.thoughts.map((t) => `<div class="thought"><span class="dot ${t.mood}"></span><span><code>${esc(t.id)}</code> ${esc(t.what)}<br><span class="muted">${esc(t.outcome.slice(0, 88))}</span></span></div>`).join('') || '<p class="muted">no receipts yet today — the brain is quiet</p>'}
  <h2>OPERATOR RING</h2>
  <div class="bar">
    <span class="chip ${anchorCls}">anchor ${esc(d.anchorLevel.toUpperCase())}</span>
    <span class="chip ${d.queueOpen ? 'warn' : 'on'}">${d.queueOpen} awaiting approval</span>
    <span class="chip ${d.doctorOk === null ? 'warn' : d.doctorOk ? 'on' : 'bad'}">doctor ${d.doctorOk === null ? 'not run' : d.doctorOk ? 'healthy' : 'FAULT'}</span>
  </div>
  <div class="bar">${swChips}</div>
  <p class="muted" style="margin-top:auto">${esc(d.anchorNote)}</p>
  <p class="muted">Detail tables: <a href="hermes-status.html">hermes-status.html</a> · generated ${esc(d.when)} by brain-view (T0) · read-only, zero buttons — this page grants nothing.</p>
</div>
</div>`;
}
