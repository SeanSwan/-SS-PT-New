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
import { renderDensitySvg } from './brainDensity.mjs';

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

function sparkline(hours, tier2) {
  const max = Math.max(...hours, 1);
  const peak = Math.max(...hours), peakHour = hours.indexOf(peak);
  const bars = hours.map((v, h) => {
    const height = v ? Math.max(8, (v / max) * 100) : 3;
    const upper = v ? Math.min(100, (tier2[h] / v) * 100) : 0;
    return `<span class="skybar${v ? '' : ' zero'}" style="height:${height}%"><i style="height:${upper}%"></i><title>${String(h).padStart(2,'0')}:00 UTC ? ${v} receipt(s), ${tier2[h]} T2+</title></span>`;
  }).join('');
  return `<div class="skyline sparkline" role="img" aria-label="24-hour receipt skyline">${bars}</div><div class="sky-ticks"><span>00</span><span>06</span><span>12</span><span>18</span><span>peak ${String(peakHour).padStart(2,'0')}:00</span></div>`;
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
    { color: 'var(--c-app)', label: a.label, sub: a.state, state: a.state === 'live' ? 'live' : a.state, activity: a.activity, spark: true, delay: jitter(i, 3), id: `app-${i}`, kind: 'k-app' }));
  d.routines.forEach((r, i) => addNode(arc(Math.max(d.routines.length, 2), i, 232, 236, 300),
    { color: 'var(--c-routine)', label: r.label, sub: r.cadence + (r.state === 'fault' ? ' · DEMOTED' : r.state === 'live' ? ' · ran today' : ''), state: r.state, activity: r.activity, spark: true, delay: jitter(i + 9, 3), id: `rt-${i}`, kind: 'k-rt', stagger: i % 2 }));
  d.memory.forEach((m, i) => addNode(arc(d.memory.length, i, 236, 58, 128),
    { color: 'var(--c-memory)', label: m.label + (m.count != null ? ` (${m.count})` : ''), sub: m.kind, state: 'live', activity: m.activity, spark: i < 3, delay: jitter(i + 17, 3), id: `mem-${i}`, kind: 'k-mem', stagger: i % 2 }));
  // Skills: dots always; labels are a SEMANTIC-ZOOM tier (hidden at the default
  // 'cluster' zoom, revealed on zoom-in) — the roster also lists all of them.
  d.skillNodes.forEach((s, i) => addNode(arc(Math.max(d.skillNodes.length, 2), i, 296, -46, 46),
    { color: 'var(--c-skill)', label: s.name + (s.count ? ` ${s.count}` : ''), state: 'live', r: s.aggregate ? 12 : 7.5, small: true, labelled: true, spark: s.count > 0, delay: jitter(i + 29, 3.4), id: `sk-${i}`, kind: 'k-sk', activity: s.count }));

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
    ? `<div class="stale-strip" role="alert">DATA IS ${d.dataAgeDays} DAY${d.dataAgeDays === 1 ? '' : 'S'} OLD &mdash; generated ${esc(d.when)}; today is ${esc(d.today)}. Double-click the Command Center to refresh.</div>`
    : '';
  const heatCells = d.healthHistory.map((x) => `<span class="heat-cell ${x.state}" title="${x.date} &mdash; ${x.state}, ${x.count} receipt(s)"></span>`).join('');

  const delta = (n) => n > 0 ? `\u2191${n}` : n < 0 ? `\u2193${Math.abs(n)}` : '\u00b70';
  const tiles = [
    [d.receiptCount, 'receipts today', '', d.tileDeltas.receipts],
    [d.skills.length, 'skills wired', '', d.tileDeltas.skills],
    [d.memoriesTotal ?? '?', 'memory notes', '', d.tileDeltas.memories],
    [d.routines.length, 'routines', d.routines.some((r) => r.state === 'fault') ? 'bad' : '', d.tileDeltas.routines],
    [d.queueOpen, d.digest.approvalFlow.medianMin == null ? 'await approval' : `approval ? median ${d.digest.approvalFlow.medianMin}m`, d.queueOpen ? 'warn' : '', d.tileDeltas.approvals],
    [d.anchorLevel.toUpperCase(), 'anchor', d.anchorLevel === 'ok' ? '' : d.anchorLevel === 'warn' ? 'warn' : 'bad', d.tileDeltas.anchor],
  ].map(([n,k,st,change]) => `<div class="tile ${st}"><div class="n">${esc(String(n))}</div><div class="delta ${change > 0 ? 'up' : change < 0 ? 'down' : ''}">${delta(change)}</div><div class="k">${esc(k)}</div>${st ? '<span class="dotp"></span>' : ''}</div>`).join('');

  const switchGroup = (name) => /BROKER/.test(name) ? 'BROKERS' : /MASTER|HARNESS|STALE/.test(name) ? 'SAFETY' : 'ROUTINES';
  const swGroups = ['BROKERS','ROUTINES','SAFETY'].map((group) => {
    const rows = d.switches === null ? [] : d.switches.filter((x) => switchGroup(x.name) === group);
    return `<section class="switch-group"><h3>${group}</h3><div class="bar">${rows.map((x) => `<span class="chip ${x.on ? 'on' : 'off'}" title="${esc(d.switchExplanations[x.name] || 'operator switch')}">${esc(x.name.replace('SWITCH_',''))} <b>${x.on ? 'on' : 'off'}</b></span>`).join('') || '<span class="muted">none</span>'}</div></section>`;
  }).join('');
  const anchorCls = d.anchorLevel === 'ok' ? 'on' : d.anchorLevel === 'warn' ? 'warn' : 'bad';
  const skillGrid = d.skillStats.map((item) => `<div><span>${esc(item.name)}</span><b>${item.count}</b></div>`).join('');
  const integrityCount = d.digest.unparseable.length + d.digest.tierless.length + d.digest.chainBroken.length;

  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hermes Brain · Command Center</title><link rel="icon" href="data:,">
<style>${CSS}</style>
<div class="shell${d.silentDay ? ' silent' : ''}">
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
          ${renderDensitySvg({ ...d.digest, when:d.when, queueEntries:d.queueEntries, productHealth:d.productHealth })}
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
      ${sparkline(d.hourly, d.hourlyTier2)}
      <h2>Thought stream</h2>
      ${d.thoughts.map((t) => `<div class="thought ${t.attention ? 'attention' : ''}"><span class="dot ${t.mood}"></span><span class="thought-body"><span class="thought-meta"><time>${t.time} UTC</time><b class="tier ${t.tier}">${t.tier}</b><span>${esc(t.actor)}</span></span>${esc(t.what)}<span class="tsub ${t.mood}">${esc(t.outcome.slice(0,96))}</span></span></div>`).join('') || '<p class="muted silent-day">silent day ? no receipts yet; the core is dimmed, not healthy-looking</p>'}
      ${d.moreThoughts ? `<a class="digest-more" href="digest-${esc(d.isoDate)}.md">${d.moreThoughts} more in digest &rarr;</a>` : ''}
      <h2>Operator ring</h2>
      <div class="bar">
        <span class="chip ${anchorCls}">anchor ${esc(d.anchorLevel.toUpperCase())}</span>
        <span class="chip ${d.queueOpen ? 'warn' : 'on'}">${d.queueOpen} awaiting approval</span>
        <span class="chip ${d.doctorOk === null ? 'warn' : d.doctorOk ? 'on' : 'bad'}">doctor ${d.doctorOk === null ? 'not run' : d.doctorOk ? 'healthy' : 'FAULT'}</span>
      </div>
      ${swGroups}
      <p class="integrity-line ${integrityCount ? 'bad' : ''}">INTEGRITY: ${d.digest.unparseable.length} unparseable &middot; ${d.digest.tierless.length} tierless &middot; ${d.digest.chainBroken.length} broken chains</p>
      <h2>Skills (${d.skills.length})</h2>
      <div class="skill-grid">${skillGrid || '<span class="muted">none</span>'}</div>
      <p class="muted" style="margin-top:auto">${esc(d.anchorNote)} · detail: <a href="hermes-status.html">hermes-status.html</a> · generated ${esc(d.when)} by brain-view (T0) · view-only · no network · grants nothing.</p>
    </div>
  </div>
  <nav class="phone-tabs" role="tablist" aria-label="Brain view"><label for="tab-overview" role="tab" aria-pressed="true">Overview</label><label for="tab-graph" role="tab" aria-pressed="false">Graph</label><label for="tab-detail" role="tab" aria-pressed="false">Detail</label></nav>
</div>
<script>${cameraClientJs(escapeForEmbed(nodesIndex))}</script>`;
}
