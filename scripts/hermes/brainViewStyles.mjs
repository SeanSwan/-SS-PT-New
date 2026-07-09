/**
 * brainViewStyles.mjs — the tokenized Crystalline skin for the Hermes Brain
 * cockpit. Slice 1 of the redesign (v2 plan): the READABILITY + LAYOUT
 * foundation. Every color is a token (swap the block, rebrand the whole cockpit
 * AND Sean's future apps); every text size is on an explicit ramp with a hard
 * 13px floor; the layout is a full-screen grid that uses monitor space on
 * purpose. Node/cluster labels render in an HTML overlay (real device px,
 * WCAG-tunable, crisp at any size) — the fix for the SVG-text-shrinks-to-3px bug.
 *
 * Slice 1 is STATIC (identity transform, no client JS). The label overlay sits
 * over an aspect-locked graph pane so the percentage anchors are pixel-exact;
 * Slice 2 adds the camera by transforming the overlay CONTAINER (not per-label),
 * which the graphGeometry.mjs primitive proves keeps labels on their nodes.
 */
export const PAL = {
  // 5 semantic node families (locked hue per slot across future themes) + fault.
  app: '#60C0F0', routine: '#C6A84B', memory: '#8FB2EE', skill: '#8B5CF6', fault: '#E5484D',
  text: '#E0ECF4', muted: '#A6B4CC', dim: '#4A5470', // muted bumped to clear the 4.5:1 floor; dim is a real semantic
  bgDeep: '#08080e', bgCard: '#14151d', bgEdge: '#262b3d', // edge louder than the old near-invisible #1A1A24
  aur: '#60C0F0', // header aurora accent — was referenced but NEVER declared (the "dim" bug)
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
  /* A — global bar */
  .gbar{display:flex;align-items:baseline;gap:var(--s4);flex-wrap:wrap;padding:var(--s5) 0 var(--s3)}
  .gbar h1{font-size:var(--t-mark);letter-spacing:.2em;margin:0;font-weight:800}
  .gbar h1 em{font-style:normal;color:var(--c-app)}
  .gbar .meta{margin-left:auto;color:var(--c-muted);font-size:var(--t-sub);letter-spacing:.02em}
  /* fault strip (only when fail-closed) */
  .fault-strip{font-size:var(--t-fault);font-weight:700;color:#fff;background:linear-gradient(90deg,var(--c-fault),var(--fault-dark));
    border-radius:10px;padding:var(--s3) var(--s5);margin-bottom:var(--s3);box-shadow:0 0 24px rgba(229,72,77,.35)}
  /* B — NBA hero (loudest by construction) */
  .nba{border-radius:16px;padding:var(--s5) var(--s6);margin-bottom:var(--s4);border:1px solid var(--bg-edge);
    background:linear-gradient(100deg,rgba(96,192,240,.10),rgba(139,92,246,.09));position:relative;overflow:hidden}
  .nba.warn{background:linear-gradient(100deg,rgba(198,168,75,.14),rgba(139,92,246,.08));border-color:rgba(198,168,75,.4)}
  .nba.red{background:linear-gradient(100deg,rgba(229,72,77,.16),rgba(139,92,246,.06));border-color:rgba(229,72,77,.45)}
  .nba .eyebrow{font-size:var(--t-cap);letter-spacing:.2em;text-transform:uppercase;color:var(--c-app);font-weight:700}
  .nba.warn .eyebrow{color:var(--c-routine)} .nba.red .eyebrow{color:var(--c-fault)}
  .nba .lead{font-size:var(--t-hero);font-weight:800;line-height:1.2;margin:var(--s2) 0 0;text-wrap:balance}
  .nba .rail{margin:var(--s3) 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:var(--s1)}
  .nba .rail li{color:var(--c-muted);font-size:var(--t-body)}
  .nba .rail li::before{content:"→ ";color:var(--c-app)}
  /* C — vitals HUD */
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
  .tile .k{font-size:var(--t-cap);letter-spacing:.12em;color:var(--c-muted);text-transform:uppercase;margin-top:var(--s1)}
  .tile.bad .dotp,.tile.warn .dotp{position:absolute;top:var(--s3);right:var(--s3);width:8px;height:8px;border-radius:50%;
    background:currentColor;animation:pulse 1.6s ease-in-out infinite}
  /* D — main split: graph + inspector rail */
  .main{display:grid;grid-template-columns:minmax(0,2.2fr) minmax(480px,1fr);gap:clamp(16px,1.4vw,32px);min-height:0;align-items:start}
  .graph-pane{position:relative;aspect-ratio:1280/640;background:radial-gradient(560px 380px at 50% 47%, var(--pane) 0%, transparent 70%);
    border:1px solid var(--bg-edge);border-radius:18px;overflow:hidden}
  svg.brain{position:absolute;inset:0;width:100%;height:100%;display:block}
  .label-layer{position:absolute;inset:0;pointer-events:none}
  .nlabel{position:absolute;transform:translate(-50%,0);text-align:center;white-space:nowrap;
    font-size:var(--t-body);font-weight:600;color:var(--c-text);text-shadow:0 1px 4px rgba(0,0,0,.85)}
  .nlabel.dim{color:var(--c-muted)} .nlabel.fault{color:var(--c-fault)}
  .nlabel .nsub{display:block;font-size:var(--t-sub);font-weight:500;color:var(--c-muted);letter-spacing:.01em}
  .clabel{position:absolute;transform:translate(-50%,0);font-size:var(--t-h2);letter-spacing:.24em;text-transform:uppercase;
    color:var(--c-muted);font-weight:700;text-shadow:0 1px 4px rgba(0,0,0,.85)}
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
  .node{filter:drop-shadow(0 0 7px var(--glow))}
  .pulse{animation:pulse 2.6s ease-in-out infinite}
  .core-glow{filter:drop-shadow(0 0 16px var(--c-app)) drop-shadow(0 0 34px color-mix(in srgb, var(--c-skill) 55%, transparent))}
  .core-ring{fill:none;stroke:var(--c-app);opacity:.28;animation:ringgrow 3.4s ease-out infinite}
  .core-ring.r2{animation-delay:1.7s;stroke:var(--c-skill)}
  .core-spin{fill:none;stroke:var(--c-skill);stroke-dasharray:3 14;opacity:.55;transform-origin:640px 330px;animation:spin 26s linear infinite}
  /* inspector rail */
  .panel{background:var(--bg-card);border:1px solid var(--bg-edge);border-radius:18px;padding:var(--s5);display:flex;flex-direction:column;gap:var(--s2)}
  .panel h2{font-size:var(--t-h2);color:var(--c-app);letter-spacing:.14em;text-transform:uppercase;margin:var(--s3) 0 var(--s2);font-weight:700}
  .panel h2:first-child{margin-top:0}
  .thought{display:flex;gap:var(--s2);align-items:baseline;margin:var(--s2) 0;font-size:var(--t-body)}
  .thought code{color:var(--code);font-family:'Fira Code',ui-monospace,monospace;font-size:var(--t-data)}
  .thought .tsub{display:block;color:var(--c-muted);font-size:var(--t-sub);margin-top:2px}
  .dot{display:inline-block;width:.62em;height:.62em;border-radius:50%;flex:none;box-shadow:0 0 6px currentColor;margin-top:.4em}
  .dot.ok{background:var(--c-app);color:var(--c-app)} .dot.warn{background:var(--c-routine);color:var(--c-routine)} .dot.refused{background:var(--c-fault);color:var(--c-fault)}
  .thought:first-of-type .dot{animation:pulse 1.5s ease-in-out infinite}
  .sparkline{margin:var(--s2) 0}
  .sparkline rect{fill:var(--c-app);opacity:.85} .sparkline rect.zero{fill:var(--orbit);opacity:1}
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
  @media (prefers-reduced-motion: reduce){*{animation:none !important}}
  @media (max-width:1080px){.main{grid-template-columns:1fr}.panel{max-width:none}}
  @media (max-width:760px){.shell{padding-inline:var(--s4)}.gbar .meta{margin-left:0}.nba{padding:var(--s4)}
    :root{--t-hero:26px;--t-hud:24px}}
`;
