/**
 * brainViewStyles.mjs - the tokenized Crystalline skin for the Hermes Brain
 * cockpit. Slice 1 of the redesign (v2 plan): the READABILITY + LAYOUT
 * foundation. Every color is a token (swap the block, rebrand the whole cockpit
 * AND Sean's future apps); every text size is on an explicit ramp with a hard
 * 13px floor; the layout is a full-screen grid that uses monitor space on
 * purpose. Node/cluster labels render in an HTML overlay (real device px,
 * WCAG-tunable, crisp at any size) - the fix for the SVG-text-shrinks-to-3px bug.
 *
 * DOCTRINE (amended Slice 2, v2 plan B2): the page now carries VIEW-ONLY client
 * JS (zoom/pan/focus - brainCamera.mjs). It is still "grants nothing": ZERO
 * network, ZERO action/command surface; the old "Zero JS by doctrine" line is
 * superseded here and the brain-view.test.mjs `<script>`-ban is replaced by the
 * real no-network invariant. The camera transforms the .label-layer CONTAINER
 * (not per-label), which graphGeometry.mjs proves keeps labels on their nodes.
 */
export const PAL = {
  // 5 semantic node families (locked hue per slot across future themes) + fault.
  app: '#60C0F0', routine: '#C6A84B', memory: '#8FB2EE', skill: '#8B5CF6', fault: '#E5484D',
  text: '#E0ECF4', muted: '#A6B4CC', dim: '#4A5470', // muted bumped to clear the 4.5:1 floor; dim is a real semantic
  bgDeep: '#08080e', bgCard: '#14151d', bgEdge: '#262b3d', // edge louder than the old near-invisible #1A1A24
  aur: '#60C0F0', // header aurora accent - was referenced but NEVER declared (the "dim" bug)
  starA: '#8cc4f4', starB: '#a096f0', orbit: '#2a3350', orb0: '#232b45', orb1: '#101018',
  gradA: '#131a2e', gradB: '#171229', codeCyan: '#50A0F0', chipEdge: '#2a3142',
  pane: '#0f1424cc', faultDark: '#b23842', // pane tint + fault-gradient dark end (tokenized for the theme pass)
};

export const CSS = `
  :root{color-scheme:dark;
    --c-app:${PAL.app};--c-routine:${PAL.routine};--c-memory:${PAL.memory};--c-skill:${PAL.skill};--c-fault:${PAL.fault};
    --c-text:${PAL.text};--c-muted:${PAL.muted};--c-dim:${PAL.dim};
    --bg-deep:${PAL.bgDeep};--bg-card:${PAL.bgCard};--bg-edge:${PAL.bgEdge};--aur:${PAL.aur};
    --grad-a:${PAL.gradA};--grad-b:${PAL.gradB};--star-a:${PAL.starA};--star-b:${PAL.starB};
    --orbit:${PAL.orbit};--orb-0:${PAL.orb0};--orb-1:${PAL.orb1};--code:${PAL.codeCyan};--chip-edge:${PAL.chipEdge};--pane:${PAL.pane};--fault-dark:${PAL.faultDark};
    /* type ramp (px, hard 13px floor) */
    --t-hero:32px;--t-fault:18px;--t-hud:28px;--t-mark:20px;--t-h2:15px;--t-body:16px;--t-data:15px;--t-sub:13px;--t-cap:13px;
    /* 8px spacing scale */
    --s1:4px;--s2:8px;--s3:12px;--s4:16px;--s5:24px;--s6:32px;--s7:48px;--s8:64px}
  *{box-sizing:border-box}
  body{margin:0;color:var(--c-text);font:var(--t-body)/1.55 'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif;
    background:radial-gradient(1100px 620px at 46% 34%, var(--grad-a) 0%, transparent 62%),
      radial-gradient(900px 500px at 74% 70%, var(--grad-b) 0%, transparent 60%), var(--bg-deep);min-height:100vh}
  a{color:var(--c-app)}
  .shell{display:grid;grid-template-rows:auto auto auto 1fr;min-height:100vh;
    padding-inline:clamp(20px,2.4vw,56px);padding-bottom:var(--s6)}
  .aurora{height:3px;border-radius:0 0 6px 6px;background:linear-gradient(90deg,transparent,var(--aur) 18%,var(--aur) 82%,transparent);
    box-shadow:0 0 22px 2px var(--aur);animation:breathe 5s ease-in-out infinite}
  /* A - global bar */
  .gbar{display:flex;align-items:baseline;gap:var(--s4);flex-wrap:wrap;padding:var(--s5) 0 var(--s3)}
  .gbar h1{font-size:var(--t-mark);letter-spacing:.2em;margin:0;font-weight:800}
  .gbar h1 em{font-style:normal;color:var(--c-app)}
  .gbar .meta{margin-left:auto;color:var(--c-muted);font-size:var(--t-sub);letter-spacing:.02em}
  /* fault strip (only when fail-closed) */
  .fault-strip{font-size:var(--t-fault);font-weight:700;color:var(--c-text);background:linear-gradient(90deg,var(--c-fault),var(--fault-dark));
    border-radius:10px;padding:var(--s3) var(--s5);margin-bottom:var(--s3);box-shadow:0 0 24px rgba(229,72,77,.35)}
  .stale-strip{font-size:var(--t-fault);font-weight:700;color:var(--bg-deep);background:linear-gradient(90deg,var(--c-routine),color-mix(in srgb,var(--c-routine) 68%,var(--c-text)));border-radius:10px;padding:var(--s3) var(--s5);margin-bottom:var(--s3);box-shadow:0 0 24px color-mix(in srgb,var(--c-routine) 28%,transparent)}
  /* B - NBA hero (loudest by construction) */
  .nba{border-radius:16px;padding:var(--s5) var(--s6);margin-bottom:var(--s4);border:1px solid var(--bg-edge);
    background:linear-gradient(100deg,rgba(96,192,240,.10),rgba(139,92,246,.09));position:relative;overflow:hidden}
  .nba.warn{background:linear-gradient(100deg,rgba(198,168,75,.14),rgba(139,92,246,.08));border-color:rgba(198,168,75,.4)}
  .nba.red{background:linear-gradient(100deg,rgba(229,72,77,.16),rgba(139,92,246,.06));border-color:rgba(229,72,77,.45)}
  .nba .eyebrow{font-size:var(--t-cap);letter-spacing:.2em;text-transform:uppercase;color:var(--c-app);font-weight:700}
  .nba.warn .eyebrow{color:var(--c-routine)} .nba.red .eyebrow{color:var(--c-fault)}
  .nba .lead{font-size:var(--t-hero);font-weight:800;line-height:1.2;margin:var(--s2) 0 0;text-wrap:balance}
  .nba .rail{margin:var(--s3) 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:var(--s1)}
  .nba .rail li{color:var(--c-muted);font-size:var(--t-body)}
  .nba .rail li::before{content:"\\2192 ";color:var(--c-app)}
  /* C - vitals HUD */
  .hud{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:var(--s3);margin-bottom:var(--s5)}
  .tile{background:var(--bg-card);border:1px solid var(--bg-edge);border-radius:14px;padding:var(--s4) var(--s4) var(--s3);
    position:relative;overflow:hidden}
  .tile::after{content:'';position:absolute;inset:0;border-radius:14px;padding:1px;
    background:linear-gradient(135deg,var(--tc,var(--chip-edge))66,transparent 46%);
    -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none}
  .tile.bad::after{background:linear-gradient(135deg,var(--c-fault),transparent 46%)}
  .tile.warn::after{background:linear-gradient(135deg,var(--c-routine),transparent 46%)}
  .tile .n{font:600 var(--t-hud)/1 'Sora','Fira Code',monospace;color:var(--tc,var(--c-text));font-variant-numeric:tabular-nums}
  .tile.bad .n{color:var(--c-fault)} .tile.warn .n{color:var(--c-routine)}
  .tile .delta{position:absolute;right:var(--s4);top:var(--s4);font:700 var(--t-sub)/1 'Fira Code',monospace;color:var(--c-muted)}
  .tile .delta.up{color:var(--c-app)}.tile .delta.down{color:var(--c-routine)}
  .tile .k{font-size:var(--t-cap);letter-spacing:.12em;color:var(--c-muted);text-transform:uppercase;margin-top:var(--s1)}
  .tile.bad .dotp,.tile.warn .dotp{position:absolute;top:var(--s3);right:var(--s3);width:8px;height:8px;border-radius:50%;
    background:currentColor;animation:pulse 1.6s ease-in-out infinite}
  /* D - main split: graph + inspector rail */
  .main{display:grid;grid-template-columns:minmax(0,2.2fr) minmax(480px,1fr);gap:clamp(16px,1.4vw,32px);height:clamp(760px,calc(100vh - 420px),1400px);min-height:0;align-items:stretch}
  .left-col{display:grid;grid-template-rows:minmax(560px,1fr) auto;gap:var(--s4);min-width:0}
  .graph-pane{position:relative;min-height:560px;background:radial-gradient(480px 480px at 24% 68%,color-mix(in srgb,var(--c-app) 7%,transparent),transparent),radial-gradient(480px 480px at 74% 74%,color-mix(in srgb,var(--c-routine) 7%,transparent),transparent),radial-gradient(480px 480px at 26% 24%,color-mix(in srgb,var(--c-memory) 7%,transparent),transparent),radial-gradient(480px 480px at 76% 20%,color-mix(in srgb,var(--c-skill) 7%,transparent),transparent),radial-gradient(560px 380px at 50% 47%,var(--pane) 0%,transparent 70%);
    border:1px solid var(--bg-edge);border-radius:18px;overflow:hidden}
  .heat-strip{background:var(--bg-card);border:1px solid var(--bg-edge);border-radius:14px;padding:var(--s4)}
  .heat-cells{display:grid;grid-template-columns:repeat(30,minmax(6px,18px));gap:4px;justify-content:space-between}
  .heat-cell{display:block;height:18px;border-radius:5px;background:var(--bg-edge)}
  .heat-cell.green{background:var(--c-app)}.heat-cell.amber{background:var(--c-routine)}.heat-cell.red{background:var(--c-fault)}.heat-cell.no-data{opacity:.42}
  .heat-ticks{display:flex;justify-content:space-between;margin-top:var(--s2);font:var(--t-sub)/1 'Fira Code',monospace;color:var(--c-muted)}
  .graph-stage{position:absolute;left:0;right:0;top:50%;aspect-ratio:1280/700;transform:translateY(-50%)}
  svg.brain{position:absolute;inset:0;width:100%;height:100%;display:block}
  .label-layer{position:absolute;inset:0;pointer-events:none}
  .nlabel{position:absolute;transform:translate(-50%,0);text-align:center;white-space:nowrap;line-height:1.25;
    font-size:var(--t-body);font-weight:600;color:var(--c-text);text-shadow:0 1px 4px rgba(0,0,0,.85)}
  .nlabel.dim{color:var(--c-muted)} .nlabel.fault{color:var(--c-fault)} .nlabel.hover-tier{display:none;color:var(--c-muted);opacity:.6}
  .nlabel .nsub{display:block;font-size:var(--t-sub);font-weight:500;color:var(--c-muted);letter-spacing:.01em}
  /* family legend - fixed chrome (never camera-transformed), colour maps to the arcs */
  .glegend{position:absolute;left:var(--s4);top:var(--s4);display:flex;flex-direction:column;gap:var(--s1);z-index:2;pointer-events:none}
  .lgd{display:flex;align-items:center;gap:var(--s2);font-size:var(--t-sub);letter-spacing:.16em;text-transform:uppercase;
    color:var(--c-muted);font-weight:700;text-shadow:0 1px 4px rgba(0,0,0,.85)}
  .lgd i{width:8px;height:8px;border-radius:50%;flex:none;box-shadow:0 0 8px currentColor}
  .lgd b{color:var(--c-text);font-weight:700;font-variant-numeric:tabular-nums}
  .corelabel{position:absolute;transform:translate(-50%,-50%);text-align:center}
  .corelabel .cn{font-size:var(--t-mark);font-weight:800;letter-spacing:.14em;color:var(--c-text)}
  .corelabel .cs{display:block;font-size:var(--t-sub);color:var(--c-muted);margin-top:2px}
  .nmark{position:absolute;transform:translate(-50%,-50%);font-size:var(--t-mark);font-weight:800;color:var(--c-fault)}
  /* svg vector styles (no text) */
  .orbit{fill:none;stroke:var(--orbit);stroke-width:1;stroke-dasharray:2 6;opacity:.85}
  .star{animation:twinkle 4.2s ease-in-out infinite}
  .edge{stroke-width:1;opacity:.3}
  .edge.live{opacity:.6;stroke-dasharray:4 8;animation:flow 3s linear infinite}
  .spark{offset-rotate:0deg;animation:travel 3.4s linear infinite;opacity:0}
  .node{filter:drop-shadow(0 0 var(--halo,6px) var(--glow))}
  .pulse{animation:pulse 2.6s ease-in-out infinite}
  .core-glow{filter:drop-shadow(0 0 16px var(--c-app)) drop-shadow(0 0 34px color-mix(in srgb,var(--c-skill) 55%,transparent));animation:coredrift 90s linear infinite}
  .core-ring{fill:none;stroke:var(--c-app);opacity:.28;animation:ringgrow 3.4s ease-out infinite}
  .core-ring.r2{animation-delay:1.7s;stroke:var(--c-skill)}
  .core-spin{fill:none;stroke:var(--c-skill);stroke-dasharray:3 14;opacity:.55;transform-origin:640px 350px;animation:spin 26s linear infinite}
  /* inspector rail */
  .panel{background:var(--bg-card);border:1px solid var(--bg-edge);border-radius:18px;padding:var(--s5);display:flex;flex-direction:column;gap:var(--s2);min-height:0;overflow-y:auto;scrollbar-color:var(--c-app) var(--bg-card)}
  .panel h2{font-size:var(--t-h2);color:var(--c-app);letter-spacing:.14em;text-transform:uppercase;margin:var(--s3) 0 var(--s2);font-weight:700}
  .panel h2:first-child{margin-top:0}
  .thought{display:flex;gap:var(--s2);align-items:baseline;margin:var(--s2) 0;font-size:var(--t-body)}
  .thought.attention{border-left:3px solid var(--c-fault);padding-left:var(--s2)}
  .thought-body{min-width:0}.thought-meta{display:flex;align-items:center;gap:var(--s2);color:var(--c-muted);font:var(--t-sub)/1 'Fira Code',monospace;margin-bottom:var(--s1)}
  .tier{border:1px solid currentColor;border-radius:999px;padding:2px 6px;font-size:var(--t-sub)}.tier.T0{color:var(--c-app)}.tier.T1{color:var(--c-memory)}.tier.T2{color:var(--c-routine)}.tier.T3{color:var(--c-skill)}.tier.T4{color:var(--c-fault)}
  .thought code{color:var(--code);font-family:'Fira Code',ui-monospace,monospace;font-size:var(--t-data)}
  .thought .tsub{display:block;color:var(--c-muted);font-size:var(--t-sub);margin-top:2px}
  .dot{display:inline-block;width:.62em;height:.62em;border-radius:50%;flex:none;box-shadow:0 0 6px currentColor;margin-top:.4em}
  .dot.ok{background:var(--c-app);color:var(--c-app)} .dot.warn{background:var(--c-routine);color:var(--c-routine)} .dot.refused{background:var(--c-fault);color:var(--c-fault)}
  .thought:first-of-type .dot{animation:pulse 1.5s ease-in-out infinite}
  .skyline{height:112px;display:flex;align-items:flex-end;gap:3px;margin:var(--s2) 0 0;border-bottom:1px solid var(--bg-edge)}
  .skybar{position:relative;display:flex;align-items:flex-end;flex:1;min-width:3px;background:var(--c-app);border-radius:3px 3px 0 0;opacity:.9}.skybar.zero{background:var(--orbit);opacity:.5}.skybar i{display:block;width:100%;background:var(--c-routine);border-radius:3px 3px 0 0}
  .sky-ticks{display:flex;justify-content:space-between;font:var(--t-sub)/1 'Fira Code',monospace;color:var(--c-muted);margin-top:var(--s2)}
  .switch-group h3{font:700 var(--t-sub)/1 'Sora',sans-serif;letter-spacing:.14em;color:var(--c-muted);margin:var(--s3) 0 var(--s1)}
  .integrity-line{font:var(--t-sub)/1.5 'Fira Code',monospace;color:var(--c-muted);padding:var(--s2) 0}.integrity-line.bad{color:var(--c-fault)}
  .skill-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--s1) var(--s3);font-size:var(--t-sub)}.skill-grid div{display:flex;justify-content:space-between;gap:var(--s2);border-bottom:1px solid var(--bg-edge);padding:var(--s1) 0}.skill-grid span{overflow-wrap:anywhere}.skill-grid b{font-family:'Fira Code',monospace;color:var(--c-skill)}
  .digest-more{font-size:var(--t-sub);margin:var(--s2) 0}.silent .core-glow{opacity:.35}
  .tier-ring{opacity:.5}.tier-ring.hot{animation:pulse 3s ease-in-out infinite}.tier-label,.actor-label,.product-label{fill:var(--c-muted);font-family:'Fira Code',monospace}.refusal-thorn{fill:var(--c-fault);opacity:.8}.refusal-thorn.flood{stroke:var(--c-fault);stroke-width:2}.integrity-crack{opacity:.7}.approval-countdown,.actor-satellite,.product-satellite{filter:drop-shadow(0 0 6px currentColor)}
  .bar{display:flex;flex-wrap:wrap;gap:var(--s2);margin:var(--s2) 0}
  .chip{border:1px solid var(--chip-edge);border-radius:999px;padding:var(--s1) var(--s3);font-size:var(--t-sub);color:var(--c-muted)}
  .chip.on{color:var(--c-app);border-color:color-mix(in srgb,var(--c-app) 40%,transparent)}
  .chip.off{color:var(--c-fault);border-color:color-mix(in srgb,var(--c-fault) 40%,transparent)}
  .chip.warn{color:var(--c-routine);border-color:color-mix(in srgb,var(--c-routine) 45%,transparent)} .chip.bad{color:var(--c-fault);border-color:var(--c-fault)}
  .muted{color:var(--c-muted);font-size:var(--t-sub)}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  @keyframes breathe{0%,100%{opacity:.9}50%{opacity:.45}}
  @keyframes twinkle{0%,100%{opacity:.7}50%{opacity:.12}}
  @keyframes flow{to{stroke-dashoffset:-24}}
  @keyframes ringgrow{0%{r:46;opacity:.3}100%{r:118;opacity:0}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes travel{0%{offset-distance:0%;opacity:0}12%{opacity:.9}88%{opacity:.9}100%{offset-distance:100%;opacity:0}}
  @keyframes coredrift{to{filter:hue-rotate(360deg) drop-shadow(0 0 16px var(--c-app))}}
  /* Slice 2 - interactivity chrome (view-only) */
  .graph-stage{cursor:grab;touch-action:none}
  .graph-stage:active{cursor:grabbing}
  .camera{will-change:transform}
  .label-layer{will-change:transform}
  [data-node]{cursor:pointer}
  [data-node]:focus-visible{outline:2px solid var(--c-app);outline-offset:2px}
  .sr-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  .viewctl{position:absolute;right:12px;bottom:12px;display:flex;gap:6px;z-index:3}
  .viewctl button{width:36px;height:36px;min-width:44px;min-height:44px;display:grid;place-items:center;
    font:600 18px/1 'Sora',system-ui,sans-serif;color:var(--c-text);background:rgba(20,21,29,.82);
    border:1px solid var(--bg-edge);border-radius:10px;cursor:pointer}
  .viewctl button:hover{border-color:color-mix(in srgb,var(--c-app) 50%,transparent);color:var(--c-app)}
  .viewctl button:focus-visible{outline:2px solid var(--c-app);outline-offset:2px}
  /* SEMANTIC ZOOM - the density ladder. Legible labels collide if all are shown at
     once, so each zoom tier reveals one more layer of detail:
       galaxy  (<=0.75): cluster labels only - the shape of the brain
       cluster (default): the 4 big families, no sub-lines, no skill labels
       macro   (>=1.4)  : sub-lines return (cadence/state)
       detail  (>=2.4)  : skill labels appear */
  [data-zoom="galaxy"] .nlabel{display:none}
  [data-zoom="cluster"] .nlabel.k-sk{display:none}
  [data-zoom="cluster"] .nlabel .nsub{display:none}
  [data-zoom="macro"] .nlabel.k-sk{display:none}
  [data-zoom="detail"] .nlabel.hover-tier{display:block}
  .tab-radio,.phone-tabs{display:none}
  @media(prefers-reduced-motion:reduce){*{animation:none!important}}
  @media (max-width:1080px){.main{grid-template-columns:1fr;height:auto}.panel{max-width:none;overflow:visible}}
  @media (max-width:760px){.shell{padding-inline:var(--s4)}.gbar .meta{margin-left:0}.nba{padding:var(--s4)}:root{--t-hero:26px;--t-hud:24px}}
  @media(max-width:700px){body{overflow-x:hidden}.shell{padding-bottom:68px}.tab-radio{position:absolute;opacity:0;pointer-events:none}.phone-tabs{position:fixed;display:grid;grid-template-columns:repeat(3,1fr);left:0;right:0;bottom:0;z-index:20;background:var(--bg-card);border-top:1px solid var(--bg-edge)}.phone-tabs label{min-height:44px;display:grid;place-items:center;font:700 var(--t-sub)/1 'Sora',sans-serif;color:var(--c-muted);border-bottom:3px solid transparent;cursor:pointer}.phone-tabs label:focus-visible{outline:2px solid var(--c-app);outline-offset:-3px}#tab-overview:checked~.phone-tabs label[for="tab-overview"],#tab-graph:checked~.phone-tabs label[for="tab-graph"],#tab-detail:checked~.phone-tabs label[for="tab-detail"]{color:var(--c-text);border-bottom-color:var(--c-app)}#tab-overview:checked~.main{display:none}#tab-graph:checked~.nba,#tab-graph:checked~.hud,#tab-detail:checked~.nba,#tab-detail:checked~.hud{display:none}#tab-graph:checked~.main{display:block;overflow:hidden;height:auto}#tab-graph:checked~.main .panel,#tab-graph:checked~.main .heat-strip{display:none}#tab-graph:checked~.main .left-col{display:block;width:100%;max-width:100%;overflow-x:auto}#tab-graph:checked~.main .graph-pane{width:980px;min-width:980px;height:calc(100vh - 92px);min-height:620px}#tab-graph:checked~.main .graph-stage{top:0;transform:none}#tab-detail:checked~.main{display:block;height:auto}#tab-detail:checked~.main .left-col{display:none}#tab-detail:checked~.main .panel{display:flex;overflow:visible}.hud{grid-template-columns:repeat(2,minmax(0,1fr))}.panel{border-radius:14px}.gbar{padding-top:var(--s4)}}
`;
