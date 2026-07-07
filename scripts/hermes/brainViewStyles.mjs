/**
 * brainViewStyles.mjs — the Crystalline Cyberforest skin for the Hermes Brain
 * view. Tokenized at the top so the shell is REUSABLE for Sean's future apps:
 * swap the six --c-* tokens and the whole cockpit rebrands. All motion is pure
 * CSS (offset-path particles, keyframe pulses, conic shimmer) and every
 * animation dies under prefers-reduced-motion. Zero JS by doctrine.
 */
export const PAL = {
  app: '#60C0F0', routine: '#C6A84B', memory: '#8FB2EE', skill: '#8B5CF6',
  fault: '#E5484D', dim: '#39415a', text: '#E0ECF4', muted: '#8b93a7',
};

export const CSS = `
  :root{color-scheme:dark;
    --c-app:${PAL.app};--c-routine:${PAL.routine};--c-memory:${PAL.memory};
    --c-skill:${PAL.skill};--c-fault:${PAL.fault};--c-text:${PAL.text};--c-muted:${PAL.muted};
    --bg-deep:#07070c;--bg-card:#12121a;--bg-edge:#1A1A24}
  *{box-sizing:border-box}
  body{margin:0;color:var(--c-text);font:14px/1.5 'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif;
    background:
      radial-gradient(1100px 620px at 46% 40%, #131a2e 0%, transparent 62%),
      radial-gradient(900px 500px at 72% 68%, #171229 0%, transparent 60%),
      var(--bg-deep);
    min-height:100vh;padding:0 1.1rem 1.2rem}
  .aurora{height:3px;margin:0 -1.1rem;border-radius:0 0 6px 6px;
    background:linear-gradient(90deg,transparent,var(--aur) 18%,var(--aur) 82%,transparent);
    box-shadow:0 0 22px 2px var(--aur);animation:breathe 5s ease-in-out infinite}
  header{display:flex;align-items:baseline;gap:1rem;flex-wrap:wrap;margin:.9rem 0 .4rem}
  h1{font-size:1.02rem;letter-spacing:.22em;margin:0;font-weight:700}
  h1 em{font-style:normal;color:var(--c-app)}
  .nba{margin-left:auto;font-size:.8rem;color:var(--c-text);border:1px solid var(--bg-edge);
    background:linear-gradient(180deg,#161625,#101018);border-radius:10px;padding:.35rem .8rem}
  .nba b{color:var(--c-routine);letter-spacing:.06em;font-weight:600}
  .hud{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:.55rem;margin:.55rem 0 .8rem}
  .tile{background:var(--bg-card);border:1px solid var(--bg-edge);border-radius:12px;padding:.5rem .7rem;
    position:relative;overflow:hidden}
  .tile::after{content:'';position:absolute;inset:0;border-radius:12px;padding:1px;
    background:linear-gradient(135deg,var(--tc,#2a3142)66,transparent 45%);
    -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none}
  .tile .n{font:600 1.35rem/1 'Sora','Fira Code',monospace;color:var(--tc,var(--c-text))}
  .tile .k{font-size:.62rem;letter-spacing:.14em;color:var(--c-muted);text-transform:uppercase;margin-top:.15rem}
  .wrap{display:flex;gap:1rem;flex-wrap:wrap;align-items:stretch}
  svg.brain{flex:1 1 700px;min-width:620px;max-width:100%;height:auto;
    background:radial-gradient(560px 380px at 50% 47%, #0f1424cc 0%, transparent 70%);border-radius:16px}
  .orbit{fill:none;stroke:#22293d;stroke-width:1;stroke-dasharray:2 6;opacity:.8}
  .star{fill:#9fb4dd;animation:twinkle 4.2s ease-in-out infinite}
  .edge{stroke-width:1;opacity:.28}
  .edge.live{opacity:.55;stroke-dasharray:4 8;animation:flow 3s linear infinite}
  .spark{offset-rotate:0deg;animation:travel 3.4s linear infinite;opacity:0}
  .node{filter:drop-shadow(0 0 7px var(--glow))}
  .pulse{animation:pulse 2.6s ease-in-out infinite}
  .core-glow{filter:drop-shadow(0 0 16px ${PAL.app}) drop-shadow(0 0 34px ${PAL.skill}88)}
  .core-ring{fill:none;stroke:${PAL.app};opacity:.28;animation:ringgrow 3.4s ease-out infinite}
  .core-ring.r2{animation-delay:1.7s;stroke:${PAL.skill}}
  .core-spin{fill:none;stroke:${PAL.skill};stroke-dasharray:3 14;opacity:.55;
    transform-origin:640px 330px;animation:spin 26s linear infinite}
  .lbl{font-size:11px;text-anchor:middle;font-weight:600}
  .sub{font-size:9px;text-anchor:middle;fill:var(--c-muted)}
  .mark{font-size:14px;font-weight:700;text-anchor:middle}
  .cluster{font-size:10.5px;letter-spacing:.28em;fill:var(--c-muted);text-anchor:middle;font-weight:600}
  .panel{flex:1 1 300px;max-width:400px;background:var(--bg-card);border:1px solid var(--bg-edge);
    border-radius:16px;padding:.85rem 1rem;display:flex;flex-direction:column;gap:.15rem}
  .panel h2{font-size:.72rem;color:var(--c-app);letter-spacing:.16em;margin:.35rem 0 .35rem}
  .thought{display:flex;gap:.55rem;align-items:baseline;margin:.28rem 0;font-size:.78rem}
  .thought code{color:#50A0F0;font-family:'Fira Code',monospace;font-size:.7rem}
  .dot{display:inline-block;width:.6em;height:.6em;border-radius:50%;flex:none;box-shadow:0 0 6px currentColor}
  .dot.ok{background:var(--c-app);color:var(--c-app)} .dot.warn{background:var(--c-routine);color:var(--c-routine)}
  .dot.refused{background:var(--c-fault);color:var(--c-fault)}
  .thought:first-of-type .dot{animation:pulse 1.5s ease-in-out infinite}
  .sparkline{margin:.2rem 0 .1rem}
  .sparkline rect{fill:var(--c-app);opacity:.85}
  .sparkline rect.zero{fill:#232a3f;opacity:1}
  .bar{display:flex;flex-wrap:wrap;gap:.32rem;margin:.25rem 0}
  .chip{border:1px solid #2a3142;border-radius:999px;padding:.08rem .55rem;font-size:.68rem;color:var(--c-muted)}
  .chip.on{color:var(--c-app);border-color:${PAL.app}55} .chip.off{color:var(--c-fault);border-color:${PAL.fault}55}
  .chip.warn{color:var(--c-routine);border-color:${PAL.routine}66} .chip.bad{color:var(--c-fault);border-color:var(--c-fault)}
  .muted{color:var(--c-muted);font-size:.74rem}
  a{color:var(--c-app)}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  @keyframes breathe{0%,100%{opacity:.9}50%{opacity:.45}}
  @keyframes twinkle{0%,100%{opacity:.7}50%{opacity:.12}}
  @keyframes flow{to{stroke-dashoffset:-24}}
  @keyframes ringgrow{0%{r:46;opacity:.3}100%{r:118;opacity:0}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes travel{0%{offset-distance:0%;opacity:0}12%{opacity:.9}88%{opacity:.9}100%{offset-distance:100%;opacity:0}}
  @media (prefers-reduced-motion: reduce){*{animation:none !important}}
  @media (max-width:760px){svg.brain{min-width:100%}.nba{margin-left:0}}
`;
