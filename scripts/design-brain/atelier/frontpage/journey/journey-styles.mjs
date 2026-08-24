/**
 * journey-styles.mjs — CSS for the SwanJourney board (The Surface and the Depth).
 * Crystalline Swan tokens only; dark-first; 414px-safe; 44px targets; 13px text floor.
 * Consumed by build-journey.mjs. Board-only CSS — not production React.
 */
export const css = /* css */ `
:root{
  --obsidian:#0A0A0F; --carbon:#141419; --graphite:#1A1A24;
  --sapphire:#002060; --royal:#003080; --ice:#60C0F0; --arctic:#50A0F0;
  --gold:#C6A84B; --frost:#E0ECF4; --lavender:#4070C0; --wing:#8B5CF6;
  --serif:'Cormorant Garamond',Georgia,'Times New Roman',serif;
  --sans:'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif;
  --ui:'Sora','Segoe UI',system-ui,sans-serif;
}
*{margin:0;padding:0;box-sizing:border-box}
html,body{overflow-x:clip}
body{background:var(--obsidian);color:var(--frost);font-family:var(--sans);line-height:1.6}
img{max-width:100%;display:block}
a{color:inherit;text-decoration:none}
.wrap{max-width:1180px;margin:0 auto;padding:0 clamp(16px,4vw,48px)}

/* ---------- chrome nav ---------- */
.nav{position:absolute;inset:0 0 auto 0;z-index:9;display:flex;align-items:center;gap:18px;
  padding:14px clamp(16px,4vw,48px);background:linear-gradient(180deg,rgba(10,10,15,.72),rgba(10,10,15,0));}
.nav img{width:44px;height:44px;object-fit:contain;filter:drop-shadow(0 0 10px rgba(96,192,240,.45))}
.nav .brand{font-family:var(--ui);font-weight:700;letter-spacing:.12em;font-size:15px}
.nav .links{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap}
.nav .links a{font-size:13px;letter-spacing:.08em;opacity:.85;padding:12px 14px;min-height:44px;
  display:inline-flex;align-items:center;border-radius:10px}
.nav .links a:hover{background:rgba(96,192,240,.08)}

/* ---------- hero: the surface ---------- */
.hero{position:relative;min-height:94vh;display:flex;align-items:center;isolation:isolate}
.hero .plate{position:absolute;inset:0;z-index:-2;background:url('swans-hero-frame.jpg') center 38%/cover no-repeat}
.hero .grade{position:absolute;inset:0;z-index:-1;background:
  linear-gradient(180deg,rgba(10,10,15,.62) 0%,rgba(0,32,96,.28) 34%,rgba(0,32,96,.34) 62%,rgba(3,10,26,.92) 100%),
  radial-gradient(120% 70% at 50% 108%,rgba(96,192,240,.30),transparent 55%);}
.hero .inner{position:relative;width:100%;padding-top:96px;padding-bottom:150px;text-align:center}
.kicker{font-family:var(--ui);font-size:13px;letter-spacing:.34em;color:var(--ice);text-transform:uppercase;margin-bottom:22px}
.chrome{font-family:var(--sans);font-weight:800;font-size:clamp(2.4rem,7.2vw,5.4rem);line-height:1.04;
  letter-spacing:-.015em;background:linear-gradient(103deg,#dfe9f2 0%,#ffffff 26%,#9fb8cc 46%,#f2f9ff 54%,#8aa4ba 72%,#e6f0f8 100%);
  -webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 2px 14px rgba(10,20,40,.65));}
.hero .sub{max-width:620px;margin:22px auto 34px;font-size:clamp(15px,1.9vw,18px);color:rgba(224,236,244,.92);
  text-shadow:0 1px 8px rgba(3,10,26,.8)}
.ctas{display:flex;gap:16px;justify-content:center;flex-wrap:wrap}
.btn{font-family:var(--ui);font-weight:700;font-size:15px;letter-spacing:.04em;border-radius:14px;
  min-height:48px;padding:14px 30px;display:inline-flex;align-items:center;justify-content:center;border:1px solid transparent}
.btn-blue{background:linear-gradient(160deg,var(--royal),var(--sapphire));color:var(--frost);
  border-color:rgba(139,92,246,.55);box-shadow:0 0 26px rgba(139,92,246,.45),inset 0 1px 0 rgba(224,236,244,.18)}
.btn-purple{background:linear-gradient(160deg,#7b4de8,#5b34c4);color:#fff;
  border-color:rgba(96,192,240,.55);box-shadow:0 0 26px rgba(96,192,240,.40),inset 0 1px 0 rgba(255,255,255,.16)}
.dive{position:absolute;left:50%;transform:translateX(-50%);bottom:118px;font-family:var(--ui);
  font-size:12.5px;letter-spacing:.3em;color:var(--ice);opacity:.9}
.dive::after{content:'';display:block;width:1px;height:34px;margin:10px auto 0;
  background:linear-gradient(180deg,var(--ice),transparent)}

/* waterline fast-lane strip: half-submerged glass */
.fastlane{position:relative;z-index:4;margin-top:-64px}
.fastlane .card{display:flex;gap:14px;align-items:center;flex-wrap:wrap;justify-content:center;
  background:linear-gradient(160deg,rgba(20,20,25,.88),rgba(0,32,96,.62));backdrop-filter:blur(8px);
  border:1px solid rgba(96,192,240,.35);border-radius:18px;padding:18px 22px;
  box-shadow:0 18px 50px rgba(3,7,18,.6),0 0 0 1px rgba(10,10,15,.4)}
.fastlane .q{font-family:var(--ui);font-weight:600;font-size:15px}
.fastlane .field{display:inline-flex;align-items:center;min-height:44px;padding:10px 18px;border-radius:12px;
  background:rgba(10,10,15,.65);border:1px solid rgba(64,112,192,.5);color:rgba(224,236,244,.62);font-size:14px;min-width:200px}
.fastlane .btn{min-height:44px;padding:10px 22px}

/* ---------- depth sections ---------- */
.depth{background:
  radial-gradient(90% 40% at 18% 0%,rgba(0,48,128,.35),transparent 60%),
  radial-gradient(70% 34% at 85% 12%,rgba(139,92,246,.14),transparent 60%),
  linear-gradient(180deg,#030A1A 0%,var(--obsidian) 42%)}
.section{padding:clamp(64px,9vw,120px) 0;position:relative}
.eyebrow{font-family:var(--ui);font-size:12.5px;letter-spacing:.3em;text-transform:uppercase;color:var(--ice);margin-bottom:14px}
h2.title{font-size:clamp(1.9rem,4.4vw,3.1rem);font-weight:800;letter-spacing:-.01em;margin-bottom:14px}
.gold-rule{width:64px;height:2px;background:linear-gradient(90deg,var(--gold),transparent);margin:18px 0 30px}
.drama{font-family:var(--serif);font-style:italic;font-weight:500;font-size:clamp(1.7rem,4vw,2.7rem);
  line-height:1.25;color:var(--frost)}
.drama .g{color:var(--gold)}
.mission-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:26px;margin-top:34px}
.mission-grid p{color:rgba(224,236,244,.82);font-size:15.5px}
.closing{margin-top:34px;font-family:var(--serif);font-style:italic;font-size:clamp(1.15rem,2.4vw,1.5rem);color:var(--gold)}

/* community: aurora world */
.world{position:relative;border-radius:24px;overflow:hidden;border:1px solid rgba(96,192,240,.28);
  background:url('beyond-the-gym-bg.jpg') center/cover no-repeat;min-height:420px;
  box-shadow:0 30px 80px rgba(3,7,18,.7)}
.world .veil{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,10,15,.25),rgba(10,10,15,.78) 88%)}
.world .in{position:relative;padding:clamp(24px,4.5vw,48px);display:flex;flex-direction:column;justify-content:flex-end;min-height:420px}
.world h3{font-size:clamp(1.3rem,2.6vw,1.8rem);margin-bottom:8px}
.world .sub{color:rgba(224,236,244,.85);max-width:560px;font-size:15px;margin-bottom:20px}
.pins{position:absolute;inset:0;pointer-events:none}
.pin{position:absolute;width:14px;height:14px;border-radius:50%;background:var(--ice);
  box-shadow:0 0 0 6px rgba(96,192,240,.22),0 0 22px rgba(96,192,240,.85)}
.pin.g{background:var(--gold);box-shadow:0 0 0 6px rgba(198,168,75,.2),0 0 22px rgba(198,168,75,.8)}
.groups{display:flex;gap:10px;flex-wrap:wrap}
.chip{display:inline-flex;align-items:center;min-height:44px;padding:10px 20px;border-radius:999px;
  font-family:var(--ui);font-size:13.5px;letter-spacing:.03em;background:rgba(10,10,15,.62);
  border:1px solid rgba(96,192,240,.45);backdrop-filter:blur(4px)}
.chip.gold{border-color:rgba(198,168,75,.6);color:var(--gold)}
.cats{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:16px;margin-top:26px}
.cat{background:linear-gradient(165deg,var(--graphite),var(--carbon));border:1px solid rgba(64,112,192,.30);
  border-radius:16px;padding:20px;position:relative;overflow:hidden}
.cat::before{content:'';position:absolute;inset:0 auto 0 0;width:2px;background:linear-gradient(180deg,var(--ice),transparent)}
.cat h4{font-size:15.5px;margin-bottom:6px}
.cat p{font-size:13.5px;color:rgba(224,236,244,.72)}
.cat.featured{border-color:rgba(198,168,75,.55)}
.cat.featured::before{background:linear-gradient(180deg,var(--gold),transparent)}
.cat.featured h4{color:var(--gold)}

/* events timeline */
.events{margin-top:30px;display:grid;gap:14px}
.event{display:flex;gap:18px;align-items:center;flex-wrap:wrap;background:linear-gradient(160deg,rgba(20,20,25,.9),rgba(0,32,96,.35));
  border:1px solid rgba(64,112,192,.32);border-radius:16px;padding:16px 20px}
.event .date{font-family:'Fira Code',monospace;font-size:13px;color:var(--arctic);min-width:86px}
.event .name{font-weight:700;font-size:15.5px}
.event .where{font-size:13px;color:rgba(224,236,244,.68)}
.event .faces{margin-left:auto;display:flex;align-items:center}
.face{width:30px;height:30px;border-radius:50%;border:2px solid var(--carbon);margin-left:-8px;
  background:linear-gradient(160deg,var(--lavender),var(--sapphire));display:inline-flex;align-items:center;justify-content:center;
  font-size:12.5px;font-family:var(--ui)}
.event .rsvp{min-height:44px;padding:10px 20px;border-radius:12px;font-family:var(--ui);font-size:13.5px;
  background:rgba(96,192,240,.14);border:1px solid rgba(96,192,240,.5);color:var(--ice);display:inline-flex;align-items:center}
.sample{font-size:12.5px;font-family:var(--ui);letter-spacing:.14em;color:rgba(224,236,244,.5);
  border:1px dashed rgba(224,236,244,.28);border-radius:6px;padding:2px 8px}

/* services + cards */
.grid-4{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(250px,100%),1fr));gap:16px}
.svc{background:linear-gradient(165deg,var(--graphite),var(--carbon));border:1px solid rgba(64,112,192,.28);
  border-radius:16px;padding:22px;box-shadow:inset 0 1px 0 rgba(224,236,244,.06)}
.svc h4{font-size:15.5px;margin-bottom:8px;color:var(--ice)}
.svc p{font-size:13.5px;color:rgba(224,236,244,.75)}

/* programs */
.tiers{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr));gap:20px}
.tier{background:linear-gradient(170deg,var(--graphite),#0d0d14);border:1px solid rgba(64,112,192,.3);
  border-radius:20px;padding:28px;position:relative}
.tier.hot{border:1px solid rgba(139,92,246,.7);box-shadow:0 0 40px rgba(139,92,246,.25)}
.tier .badge{position:absolute;top:-13px;left:24px;background:linear-gradient(90deg,var(--wing),#5b34c4);
  color:#fff;font-family:var(--ui);font-size:12.5px;letter-spacing:.08em;padding:5px 14px;border-radius:999px}
.tier .badge.gold{background:linear-gradient(90deg,var(--gold),#9a7c2e);color:#0A0A0F}
.tier h4{font-size:19px}
.tier .meta{font-family:var(--ui);font-size:13px;color:var(--arctic);margin:6px 0 18px}
.tier ul{list-style:none}
.tier li{font-size:14px;color:rgba(224,236,244,.82);padding:7px 0 7px 26px;position:relative}
.tier li::before{content:'◆';position:absolute;left:0;color:var(--ice);font-size:11px;top:10px}
.tier .btn{width:100%;margin-top:22px}

/* golf */
.golf{position:relative;border-radius:24px;overflow:hidden;border:1px solid rgba(96,192,240,.25);
  background:url('golf-section-bg.jpg') center/cover no-repeat}
.golf .veil{position:absolute;inset:0;background:linear-gradient(90deg,rgba(10,10,15,.88) 0%,rgba(10,10,15,.55) 55%,rgba(10,10,15,.25))}
.golf .in{position:relative;padding:clamp(28px,5vw,56px);max-width:640px}
.golf .feat{display:flex;gap:14px;margin-top:18px}
.golf .feat .n{font-family:'Fira Code',monospace;color:var(--gold);font-size:13px;min-width:30px;padding-top:2px}
.golf .feat h5{font-size:15px;margin-bottom:4px}
.golf .feat p{font-size:13.5px;color:rgba(224,236,244,.75)}

/* proof */
.proofs{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:20px}
.proof{background:linear-gradient(170deg,var(--graphite),var(--carbon));border:1px solid rgba(64,112,192,.3);
  border-radius:20px;padding:24px}
.ba{display:flex;gap:12px;margin-bottom:16px}
.slot{flex:1;aspect-ratio:5/4;border-radius:12px;border:1px dashed rgba(224,236,244,.3);
  background:linear-gradient(170deg,#10101a,#0b0b12);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px}
.slot .tag{font-family:'Fira Code',monospace;font-size:12.5px;color:rgba(224,236,244,.55)}
.slot .m{font-family:var(--ui);font-size:12.5px;letter-spacing:.2em;color:var(--arctic)}
.result{display:inline-flex;align-items:center;gap:8px;background:rgba(198,168,75,.14);border:1px solid rgba(198,168,75,.55);
  color:var(--gold);font-family:var(--ui);font-size:13px;font-weight:700;border-radius:999px;padding:7px 14px;margin-bottom:14px}
.proof blockquote{font-size:14px;color:rgba(224,236,244,.85);margin-bottom:14px}
.proof .who{font-family:var(--ui);font-size:13px;color:var(--ice)}
.proof .who span{color:rgba(224,236,244,.6)}

/* stats: the vault */
.stats{background:linear-gradient(180deg,var(--obsidian),#07070c);border-block:1px solid rgba(198,168,75,.25)}
.stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 28px}
@media (max-width:700px){.stat-grid{grid-template-columns:repeat(2,1fr)}}
.stat{padding:26px 0;text-align:center}
.stat .n{font-family:var(--serif);font-size:clamp(2.6rem,5.4vw,4.2rem);line-height:1;color:var(--frost)}
.stat .l{font-family:var(--ui);font-size:12.5px;letter-spacing:.18em;text-transform:uppercase;color:rgba(224,236,244,.6);margin-top:10px}
.stat .pend{display:inline-block;margin-top:8px;font-size:12.5px;font-family:'Fira Code',monospace;
  color:rgba(198,168,75,.75);border:1px dashed rgba(198,168,75,.4);border-radius:6px;padding:1px 8px}

/* about: the family */
.about{position:relative;border-radius:24px;overflow:hidden;border:1px solid rgba(96,192,240,.22);
  background:url('swans-frame-b.jpg') center/cover no-repeat}
.about .veil{position:absolute;inset:0;background:linear-gradient(180deg,rgba(3,10,26,.30),rgba(10,10,15,.82) 82%)}
.about .in{position:relative;padding:clamp(28px,5vw,56px)}
.pillars{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:16px;margin-top:26px}
.pillar{background:rgba(10,10,15,.66);border:1px solid rgba(64,112,192,.35);border-radius:16px;padding:20px;backdrop-filter:blur(6px)}
.pillar h4{font-size:15px;color:var(--ice);margin-bottom:6px}
.pillar p{font-size:13.5px;color:rgba(224,236,244,.78)}

/* trainers */
.trainers .grid-4 .svc h4{color:var(--wing)}
.trainers .svc{border-color:rgba(139,92,246,.3)}

/* emergence CTA */
.emerge{position:relative;text-align:center;background:
  radial-gradient(80% 60% at 50% 0%,rgba(96,192,240,.16),transparent 60%),
  linear-gradient(180deg,var(--obsidian),#0d1526 70%,#132038)}
.emerge .body{max-width:640px;margin:18px auto 34px;color:rgba(224,236,244,.85);font-size:16px}
footer{background:#05050a;padding:34px 0;border-top:1px solid rgba(64,112,192,.25)}
footer .row{display:flex;align-items:center;gap:14px;flex-wrap:wrap;justify-content:space-between}
footer img{width:38px;height:38px}
footer .tag{font-family:var(--serif);font-style:italic;font-size:14.5px;color:rgba(224,236,244,.6)}
@media (max-width:520px){
  .hero .inner{padding-bottom:170px}
  .event .faces{margin-left:0}
  .nav .links{display:none}
}
`;
