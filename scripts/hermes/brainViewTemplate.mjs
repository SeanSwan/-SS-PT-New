/**
 * brainViewTemplate.mjs — HTML/SVG renderer for the Hermes Brain cockpit.
 * Slice 1 (v2 plan): the SVG carries VECTORS ONLY (edges, node circles, glow,
 * orbit rings, core); ALL text lives in an HTML overlay in real device px
 * (the fix for SVG-text-shrinks-to-3px). Layout is the full-screen grid shell.
 * STATIC — no client JS yet (Slice 2 adds the camera by transforming the
 * .label-layer container, proven by graphGeometry.mjs).
 */
import { CSS } from './brainViewStyles.mjs';
import { cameraClientJs } from './brainCamera.mjs';
import { resolveLabelLayout } from './brainLabels.mjs';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * escapeForEmbed — Slice 1 lands the helper Slice 2's snapshot embed needs
 * (v2 B1). Attacker text reaches receipt outcome/target verbatim (the refusal
 * trail); a naive JSON.stringify lets `</script` break out of the embed tag.
 * This neutralizes `<`/`>` and the JS line-separator chars so the JSON is inert
 * inside a <script> tag. (Client DOM must ALSO use textContent, never innerHTML,
 * on snapshot data — enforced in Slice 2.)
 */
export function escapeForEmbed(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
    .replace(new RegExp('\\u2028', 'g'), '\\u2028')
    .replace(new RegExp('\\u2029', 'g'), '\\u2029');
}

const VB_W = 1280, VB_H = 700, CX = 640, CY = 350;
const P = (v, total) => (v / total * 100).toFixed(3);
const jitter = (i, m) => ((i * 2654435761) % 1000) / 1000 * m;

function arc(count, i, radius, startDeg, endDeg) {
  const t = count === 1 ? 0.5 : i / (count - 1);
  const a = ((startDeg + (endDeg - startDeg) * t) * Math.PI) / 180;
  return { x: +(CX + radius * Math.cos(a)).toFixed(1), y: +(CY + radius * Math.sin(a)).toFixed(1) };
}

/** One node → its SVG vector fragment + its HTML overlay label fragment. When
 *  `id` is set the node circle is a focusable target (Slice 2 keyboard/click). */
function node(p, { color, label, sub = '', state = 'live', r = 22, small = false, labelled = true, spark = false, delay = 0, id = '', kind = '', stagger = 0, activity = 0 }) {
  const dim = state === 'dark' || state === 'idle';
  const fault = state === 'fault';
  const planned = state === 'planned';
  const stroke = fault ? 'var(--c-fault)' : dim ? 'var(--c-dim)' : color;
  const live = state === 'live' || state === 'on';
  const fill = fault ? 'url(#node-fault)' : state === 'dark' ? 'url(#node-dark)' : dim ? 'url(#node-idle)' : 'url(#node-live)';
  const glow = Math.max(4, 6 + activity * 2);
  const focusAttrs = id ? ` tabindex="0" role="button" aria-label="${esc(label)}${sub ? ', ' + esc(sub) : ''}" data-node="${esc(id)}"` : '';
  const svg = `
    <line x1="${CX}" y1="${CY}" x2="${p.x}" y2="${p.y}" class="edge ${live ? 'live' : ''}" stroke="${stroke}"/>
    ${spark && live ? `<circle class="spark" r="2.2" fill="${color}" style="offset-path:path('M ${CX} ${CY} L ${p.x} ${p.y}');animation-delay:${delay}s"/>` : ''}
    <circle cx="${p.x}" cy="${p.y}" r="${r}" class="node ${live ? 'pulse' : ''}" fill="${fill}" stroke="${stroke}" stroke-width="${fault ? 2 : 1.5}" ${planned ? 'stroke-dasharray="4 4"' : ''} style="--glow:${stroke};--halo:${glow}px;opacity:${state === 'dark' ? '.35' : '1'}"${focusAttrs}><title>${esc(label)}${sub ? ' — ' + esc(sub) : ''}</title></circle>
    ${fault ? `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="none" stroke="var(--c-fault)" stroke-width="1" opacity=".5"/>` : ''}`;
  const cls = (fault ? 'nlabel fault' : dim ? 'nlabel dim' : 'nlabel') + (kind ? ` ${kind}` : '');
  const labelData = labelled ? { id: id || label, label, sub, cls, x: p.x, y: p.y,
    angle: Math.atan2(p.y - CY, p.x - CX), cluster: kind || 'graph' } : null;
  return { svg, labelData };

}

const starLayer = (name, count, radius, opacity, salt) => `<g class="${name}" opacity="${opacity}">${Array.from({ length: count }, (_, i) =>
  `<circle class="star" cx="${(37 * (i + salt) * 7919) % VB_W}" cy="${(53 * (i + salt) * 6101) % VB_H}" r="${radius}" fill="${i % 2 ? 'var(--star-a)' : 'var(--star-b)'}" style="animation-delay:${jitter(i + salt, 4).toFixed(1)}s"/>`).join('')}</g>`;
const stars = () => [starLayer('stars-near', 46, 2, 1, 1), starLayer('stars-mid', 80, 1.5, .6, 47), starLayer('stars-far', 120, 1, .35, 131)].join('');

function sparkline(hours) {
  const max = Math.max(...hours, 1);
  const bars = hours.map((v, h) => {
    const bh = v ? Math.max(3, (v / max) * 26) : 2;
    return `<rect class="${v ? '' : 'zero'}" x="${h * 11.5}" y="${28 - bh}" width="8" height="${bh}" rx="1.5"><title>${String(h).padStart(2, '0')}:00 UTC — ${v} receipt(s)</title></rect>`;
  }).join('');
  return `<svg class="sparkline" viewBox="0 0 276 30" width="100%" height="30" role="img" aria-label="receipts by hour">${bars}</svg>`;
}

export function renderBrainHtml(d) {
  const svgParts = [];
  const labelModels = [];
  const nodesIndex = []; // {id,x,y} for the client camera's focus/keyboard nav
  const addNode = (p, opts) => {
    const n = node(p, opts);
    svgParts.push(n.svg);
    if (n.labelData) labelModels.push(n.labelData);
    if (opts.id) nodesIndex.push({ id: opts.id, x: p.x, y: p.y });
  };

  d.applications.forEach((a, i) => addNode(arc(d.applications.length, i, 288, 140, 224),
    { color: 'var(--c-app)', label: a.label, sub: a.state, state: a.state === 'live' ? 'live' : a.state, spark: true, delay: jitter(i, 3), id: `app-${i}`, kind: 'k-app' }));
  d.routines.forEach((r, i) => addNode(arc(Math.max(d.routines.length, 2), i, 232, 236, 300),
    { color: 'var(--c-routine)', label: r.label, sub: r.cadence + (r.state === 'fault' ? ' · DEMOTED' : r.state === 'live' ? ' · ran today' : ''), state: r.state, spark: true, delay: jitter(i + 9, 3), id: `rt-${i}`, kind: 'k-rt', stagger: i % 2 }));
  d.memory.forEach((m, i) => addNode(arc(d.memory.length, i, 236, 58, 128),
    { color: 'var(--c-memory)', label: m.label + (m.count != null ? ` (${m.count})` : ''), sub: m.kind, state: 'live', spark: i < 3, delay: jitter(i + 17, 3), id: `mem-${i}`, kind: 'k-mem', stagger: i % 2 }));
  // Skills: dots always; labels are a SEMANTIC-ZOOM tier (hidden at the default
  // 'cluster' zoom, revealed on zoom-in) — the roster also lists all of them.
  const SKILL_LABEL_CAP = 12;
  d.skills.forEach((s, i) => addNode(arc(Math.max(d.skills.length, 2), i, 296, -46, 46),
    { color: 'var(--c-skill)', label: s, state: 'live', r: 6.5, small: true, labelled: i < SKILL_LABEL_CAP, spark: i % 5 === 0, delay: jitter(i + 29, 3.4), id: `sk-${i}`, kind: 'k-sk' }));

  const labelParts = resolveLabelLayout(labelModels, VB_W).map((item) => {
    const transform = item.anchor === 'right' ? 'translate(-100%,-50%)' : item.anchor === 'center' ? 'translate(-50%,-50%)' : 'translate(0,-50%)';
    const hover = item.tier === 'hover' ? ' hover-tier' : '';
    return `<div class="${item.cls}${hover}" data-for="${esc(item.id)}" title="${esc(item.label)}" style="left:${P(item.x,VB_W)}%;top:${P(item.y,VB_H)}%;transform:${transform};text-align:${item.anchor}">${esc(item.label)}${item.sub ? `<span class="nsub">${esc(item.sub)}</span>` : ''}</div>`;
  });

  // The four families read as a fixed legend rather than four floating labels that
  // fought the node labels for space (and clipped at the pane edge). Colour does
  // the spatial mapping; the count makes it informative.
  const legend = [
    ['APPLICATIONS · C2', 'var(--c-app)', d.applications.length],
    ['ROUTINES · C4', 'var(--c-routine)', d.routines.length],
    ['MEMORY · C1', 'var(--c-memory)', d.memory.length],
    ['SKILLS · C3', 'var(--c-skill)', d.skills.length],
  ].map(([t, c, n]) => `<div class="lgd"><i style="background:${c}"></i>${esc(t)} <b>${n}</b></div>`).join('');

  const health = d.health;
  const nbaCls = health === 'red' ? 'nba red' : health === 'amber' ? 'nba warn' : 'nba';
  const rail = (d.nbaRail || []).slice(1, 3);
  const failClosed = d.switches === null || d.doctorOk === false;
  const faultStrip = failClosed
    ? `<div class="fault-strip">${d.switches === null ? 'switches UNREADABLE — fail closed; the operator gate is down, restore it first' : 'hermes-doctor reports a FAULT — read the doctor receipt before anything else'}</div>`
    : '';
  const staleBanner = d.dataAgeDays >= 1
    ? `<div class="stale-strip" role="alert">DATA IS ${d.dataAgeDays} DAY${d.dataAgeDays === 1 ? '' : 'S'} OLD ? generated ${esc(d.when)}; today is ${esc(d.today)}. Double-click the Command Center to refresh.</div>`
    : '';
  const heatCells = Array.from({ length: 30 }, (_, i) => `<span class="heat-cell ${i === 29 ? d.health : 'no-data'}" title="${i === 29 ? d.isoDate + ' ' + d.health : 'no data'}"></span>`).join('');

  const tiles = [
    [d.receiptCount, 'receipts today', ''],
    [d.skills.length, 'skills wired', ''],
    [d.memoriesTotal ?? '—', 'memory notes', ''],
    [d.routines.length, 'routines', d.routines.some((r) => r.state === 'fault') ? 'bad' : ''],
    [d.queueOpen, 'await approval', d.queueOpen ? 'warn' : ''],
    [d.anchorLevel.toUpperCase(), 'anchor', d.anchorLevel === 'ok' ? '' : d.anchorLevel === 'warn' ? 'warn' : 'bad'],
  ].map(([n, k, st]) => `<div class="tile ${st}"><div class="n">${esc(String(n))}</div><div class="k">${esc(k)}</div>${st ? '<span class="dotp"></span>' : ''}</div>`).join('');

  const swChips = d.switches === null
    ? '<span class="chip bad">switches UNREADABLE — fail closed</span>'
    : d.switches.map((s) => `<span class="chip ${s.on ? 'on' : 'off'}">${esc(s.name.replace('SWITCH_', ''))}</span>`).join('');
  const anchorCls = d.anchorLevel === 'ok' ? 'on' : d.anchorLevel === 'warn' ? 'warn' : 'bad';
  const skillList = d.skills.map((s) => esc(s)).join(' · ');

  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hermes Brain · Command Center</title>
<style>${CSS}</style>
<div class="shell">
  <div class="aurora"></div>
  <input class="tab-radio" type="radio" name="brain-tab" id="tab-overview" checked>
  <input class="tab-radio" type="radio" name="brain-tab" id="tab-graph">
  <input class="tab-radio" type="radio" name="brain-tab" id="tab-detail">
  <header class="gbar">
    <h1>HERMES <em>BRAIN</em></h1>
    <span class="meta">second-brain command center · ${esc(d.isoDate)} · read-only</span>
  </header>
  ${faultStrip}
  ${staleBanner}
  <section class="${nbaCls}" aria-label="next best action">
    <div class="eyebrow">Next best action</div>
    <p class="lead">${esc(d.nba)}</p>
    ${rail.length ? `<ul class="rail">${rail.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
  </section>
  <div class="hud">${tiles}</div>
  <div class="main">
    <div class="left-col">
    <div class="graph-pane">
      <div class="graph-stage">
      <svg class="brain" viewBox="0 0 ${VB_W} ${VB_H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Hermes second-brain graph — scroll to zoom, drag to pan, click a node to focus">
        <defs><radialGradient id="orb" cx="35%" cy="30%"><stop offset="0%" stop-color="var(--orb-0)"/><stop offset="100%" stop-color="var(--orb-1)"/></radialGradient><radialGradient id="node-live"><stop offset="0%" stop-color="var(--c-app)" stop-opacity=".42"/><stop offset="70%" stop-color="var(--c-app)" stop-opacity=".04"/></radialGradient><radialGradient id="node-idle"><stop offset="0%" stop-color="var(--c-muted)" stop-opacity=".18"/><stop offset="70%" stop-color="var(--c-muted)" stop-opacity=".02"/></radialGradient><radialGradient id="node-dark"><stop offset="0%" stop-color="var(--c-dim)" stop-opacity=".08"/><stop offset="70%" stop-color="var(--c-dim)" stop-opacity="0"/></radialGradient><radialGradient id="node-fault"><stop offset="0%" stop-color="var(--c-fault)" stop-opacity=".7"/><stop offset="70%" stop-color="var(--c-fault)" stop-opacity=".12"/></radialGradient></defs>
        <g class="camera">
          ${stars()}
          <circle class="orbit" cx="${CX}" cy="${CY}" r="238"/><circle class="orbit" cx="${CX}" cy="${CY}" r="300"/>
          ${svgParts.join('\n')}
          <circle class="core-ring" cx="${CX}" cy="${CY}" r="46"/><circle class="core-ring r2" cx="${CX}" cy="${CY}" r="46"/>
          <circle class="core-spin" cx="${CX}" cy="${CY}" r="58"/>
          <circle class="core-glow" cx="${CX}" cy="${CY}" r="44" fill="url(#orb)" stroke="var(--c-app)" stroke-width="3"/>
        </g>
      </svg>
      <div class="glegend">${legend}</div>
      <div class="label-layer">
        ${labelParts.join('\n')}
        <div class="corelabel" style="left:50%;top:${P(CY, VB_H)}%"><span class="cn">${esc(d.brain.label)}</span><span class="cs">${esc(d.brain.sub)}</span></div>
      </div>
      <div class="viewctl">
        <button id="zout" type="button" aria-label="zoom out">&minus;</button>
        <button id="zreset" type="button" aria-label="reset view">&#8862;</button>
        <button id="zin" type="button" aria-label="zoom in">+</button>
      </div>
      </div>
      <div id="ann" class="sr-live" aria-live="polite"></div>
    </div>
    <section class="heat-strip" aria-label="30-day brain health"><div class="heat-cells">${heatCells}</div><div class="heat-ticks"><span>-29d</span><span>-22d</span><span>-15d</span><span>-8d</span><span>today</span></div></section>
    </div>
    <div class="panel">
      <h2>Thinking today <span class="muted">(${d.receiptCount} receipts by hour, UTC)</span></h2>
      ${sparkline(d.hourly)}
      <h2>Thought stream</h2>
      ${d.thoughts.map((t) => `<div class="thought"><span class="dot ${t.mood}"></span><span><code>${esc(t.id)}</code> ${esc(t.what)}<span class="tsub">${esc(t.outcome.slice(0, 96))}</span></span></div>`).join('') || '<p class="muted">no receipts yet today — the brain is quiet</p>'}
      <h2>Operator ring</h2>
      <div class="bar">
        <span class="chip ${anchorCls}">anchor ${esc(d.anchorLevel.toUpperCase())}</span>
        <span class="chip ${d.queueOpen ? 'warn' : 'on'}">${d.queueOpen} awaiting approval</span>
        <span class="chip ${d.doctorOk === null ? 'warn' : d.doctorOk ? 'on' : 'bad'}">doctor ${d.doctorOk === null ? 'not run' : d.doctorOk ? 'healthy' : 'FAULT'}</span>
      </div>
      <div class="bar">${swChips}</div>
      <h2>Skills (${d.skills.length})</h2>
      <p class="muted">${skillList || 'none'}</p>
      <p class="muted" style="margin-top:auto">${esc(d.anchorNote)} · detail: <a href="hermes-status.html">hermes-status.html</a> · generated ${esc(d.when)} by brain-view (T0) · view-only · no network · grants nothing.</p>
    </div>
  </div>
  <nav class="phone-tabs" role="tablist" aria-label="Brain view"><label for="tab-overview" role="tab" aria-pressed="true">Overview</label><label for="tab-graph" role="tab" aria-pressed="false">Graph</label><label for="tab-detail" role="tab" aria-pressed="false">Detail</label></nav>
</div>
<script>${cameraClientJs(escapeForEmbed(nodesIndex))}</script>`;
}
