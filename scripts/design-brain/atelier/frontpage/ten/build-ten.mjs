#!/usr/bin/env node
/**
 * build-ten.mjs — TEN structurally different front pages.
 *
 * WHY THIS EXISTS. The previous run shipped five "themes" that were one layout
 * function called five times with different token objects. Sean, verbatim:
 * "I'm seeing the same square boxes, the same cards, the same UI, the same
 * elements, the same fonts, the same everything... the theme changer already
 * does that. That's why I created it." He was right. Recolouring is a solved
 * problem he already built; it is not design.
 *
 * THE RULE THIS FILE ENFORCES ON ITSELF: there is NO shared page() function.
 * Every version owns its layout end to end. Two versions may share a colour and
 * still be different; two versions may NOT share a structure. gate-ten.mjs
 * measures structure — nav model, scroll axis, primary element, hero kind,
 * density — and fails on structural collision, not on palette similarity.
 *
 * STRUCTURE VOCABULARY, sourced through the Mobbin MCP (L3 evidence only;
 * L6/L7 promotion is human-only per mobbin-learning-system.md):
 *   Pentagram    sentence-as-filter hero — nav IS an editable sentence
 *   mymind       masonry wall as the hero; the artefact is the argument
 *   Mistral AI   horizontal carousel with peeking neighbours + dots
 *   Oryzo        full-bleed macro split by a seam, "scroll to continue"
 *   MOUTHWASH    one centred object on near-empty ground
 *   KODE         flat colour field, scattered letterforms, indexed [006]
 *   Shopify Ed.  typographic contents page, roman numerals
 *   Busy Bee     dashed path threading; split dark/light; giant wordmark
 *   Shader       fog + glow + institutional seals
 *   Antimetal    text interrupted by a particle figure
 *
 * PANEL FINDINGS CARRIED IN (Grok 4.6 / GLM 5.3 / GPT-5.6 Sol Pro, 2026-08-20):
 *   - community-first may be an OVER-correction for a cold "trainer near me"
 *     visitor. Unresolved between Sean and the panel, so the ten deliberately
 *     TEST different orderings rather than assuming one. Each board declares
 *     its own order.
 *   - fee copy is a P0 contradiction (live ~10% vs planned 15%+$1,000 cap) —
 *     no board states a fee; each carries a marker instead.
 *   - "Owned by the community" flagged by Sol as a possible false ownership
 *     claim. Left verbatim (it is Sean's approved copy) but marked.
 *   - absent and now present on the boards that can carry it: city/geo for
 *     "near me", a trainee-facing price, what "Join the Community" enrols you in.
 */

import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const parent = path.join(here, '..');
const CP = JSON.parse(fs.readFileSync(path.join(parent, 'copy-pack-full.json'), 'utf8'));

const e = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const TAG = (c = '#C6A84B') => ` <span style="font-size:9.5px;letter-spacing:0.05em;color:${c};">[new copy - needs approval]</span>`;
const FEE = (c = '#C6A84B') => `<span style="font-size:9.5px;color:${c};">[fee number withheld — live page says ~10%, plan says 15% + $1,000 cap · Sean to resolve]</span>`;
const OWN = (c = '#C6A84B') => `<span style="font-size:9.5px;color:${c};">[panel flag: "Owned by" may be a legal ownership claim]</span>`;

const A = {
  water: 'hero-swan-bg.jpg', harbor: 'social-hero-bg.jpg', crystal: 'features-swan-bg.jpg',
  night: 'beyond-the-gym-bg.jpg', proof: 'video-library-bg.jpg', mile: 'store-hero-bg.jpg',
  about: 'about-hero-bg.jpg', testim: 'testimonials-swan-bg.jpg', golf: 'golf-section-bg.jpg',
  swans: 'swans-hero-frame.jpg', swansB: 'swans-frame-b.jpg', logo: 'swan-logo.png',
};
const CAT = CP.beyond_the_gym.categories, SVC = CP.what_we_do.features;
const TIER = CP.programs.tiers, TES = CP.testimonials, STAT = CP.stats.items;

const doc = (bg, ink, font, body, accent) => (inner) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>
    body { margin:0; font-family:${font}; background:${bg}; }
    a { color:${accent}; } a:hover { color:${ink}; }
    h1,h2,h3 { margin:0; text-wrap:balance; }
    @media (prefers-reduced-motion: reduce) { * { animation:none !important; transition:none !important; } }
  </style>
</helmet>
<div style="width:1280px;background:${bg};color:${ink};">${inner}</div>
</x-dc>
<script data-dc-script data-props='{"accent":{"editor":"color","default":"${accent}","options":["#60C0F0","#C6A84B","#8B5CF6","#E0ECF4"]}}'>
class Component extends DCLogic { renderVals() { return { accent: this.props.accent ?? '${accent}' }; } }
</script>
</body>
</html>
`;

const btn = (label, bg, fg, glow, r = 10) => `<a href="#" style="display:inline-flex;align-items:center;min-height:48px;
  padding:0 28px;border-radius:${r}px;background:${bg};color:${fg};text-decoration:none;font-weight:700;box-shadow:0 0 24px ${glow};">${e(label)}</a>`;
const ghost = (label, ink, rule, r = 10) => `<a href="#" style="display:inline-flex;align-items:center;min-height:48px;
  padding:0 24px;border-radius:${r}px;border:1px solid ${rule};color:${ink};text-decoration:none;font-weight:600;">${e(label)}</a>`;

/* ═══ V1 · THE FILTER — Pentagram. Nav IS a sentence you complete. ══════════ */
function v1() {
  const ink = '#0E0E12', bg = '#F6F5F2', acc = '#002060';
  const slot = (t) => `<span style="display:inline-flex;align-items:center;min-height:44px;padding:0 12px;border-bottom:2px solid ${acc};
    font-weight:700;color:${acc};">${e(t)} <span style="margin-left:7px;font-size:11px;">&#9662;</span></span>`;
  return doc(bg, ink, "'Plus Jakarta Sans',system-ui,sans-serif", '#4A4A55', acc)(`
  <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 44px;">
    <img src="${A.logo}" alt="SwanStudios" style="width:32px;height:32px;">
    <div style="font-size:12px;letter-spacing:0.2em;color:#7A7A87;">NO MENU &middot; THE SENTENCE IS THE NAVIGATION${TAG(acc)}</div>
  </div>
  <section style="padding:96px 44px 70px;">
    <div style="font-size:44px;line-height:1.5;font-weight:500;max-width:26ch;">
      I want ${slot('personal training')}<br>for ${slot('golf')}<br>near ${slot('Los Angeles')}
    </div>
    <div style="margin-top:34px;display:flex;gap:14px;">${btn(CP.hero.cta_secondary, acc, '#fff', 'rgba(0,32,96,0.22)', 4)}${ghost(CP.hero.cta_primary, ink, 'rgba(14,14,18,0.25)', 4)}</div>
    <div style="margin-top:14px;font-size:12.5px;color:#7A7A87;">Answering "near me" before anything else. City is a real filter, not decoration.${TAG(acc)}</div>
  </section>
  <section style="display:grid;grid-template-columns:repeat(4,1fr);">
    ${SVC.map((s, i) => `<div style="padding:22px;border-top:1px solid rgba(14,14,18,0.14);${i % 4 ? 'border-left:1px solid rgba(14,14,18,0.14);' : ''}min-height:150px;">
      <div style="font-size:13.5px;font-weight:700;">${e(s.title)}</div>
      <div style="font-size:12px;line-height:1.5;color:#5C5C68;margin-top:6px;">${e(s.desc)}</div></div>`).join('')}
  </section>
  <section style="padding:56px 44px;background:${ink};color:#F6F5F2;">
    <h1 style="font-size:38px;font-weight:800;letter-spacing:-0.02em;max-width:22ch;margin-bottom:10px;">${e(CP.hero.headline)}</h1>
    <p style="font-size:15.5px;line-height:1.6;color:#B7B7C4;max-width:60ch;margin:0 0 22px;">${e(CP.hero.sub)}</p>
    <div style="font-size:11px;letter-spacing:0.24em;color:#9A9AA8;margin-bottom:14px;">AND WHEN YOU ARE IN &middot; ${CAT.length} WAYS TO STAY</div>
    <div style="display:flex;flex-wrap:wrap;gap:9px;">
      ${CAT.map((c) => `<span style="border:1px solid rgba(246,245,242,0.3);border-radius:99px;padding:9px 15px;font-size:13px;">${e(c.title)}</span>`).join('')}
    </div>
    <div style="margin-top:18px;font-size:12px;color:#9A9AA8;">Trainers: ${FEE('#C6A84B')}</div>
  </section>`);
}

/* ═══ V2 · THE BOARD — mymind. The community wall IS the hero. ══════════════ */
function v2() {
  const bg = '#0B0B10', ink = '#EDEDF2', acc = '#60C0F0';
  const tiles = [
    ['workout', CAT[0].title, A.proof, 210], ['art', CAT[4].title, A.crystal, 150],
    ['meetup', CAT[6].title, A.harbor, 250], ['music', CAT[2].title, A.night, 170],
    ['dance', CAT[1].title, A.testim, 195], ['comedy', CAT[5].title, A.about, 140],
    ['stream', CAT[3].title, A.mile, 225], ['video', CAT[7].title, A.golf, 165],
  ];
  return doc(bg, ink, "'Plus Jakarta Sans',system-ui,sans-serif", '#A9A9BA', acc)(`
  <div style="position:sticky;top:0;z-index:9;display:flex;justify-content:center;padding:14px;">
    <div style="display:flex;align-items:center;gap:18px;background:rgba(237,237,242,0.08);backdrop-filter:blur(14px);
      border:1px solid rgba(237,237,242,0.14);border-radius:99px;padding:8px 8px 8px 16px;">
      <img src="${A.logo}" alt="" style="width:24px;height:24px;">
      ${['Wall', 'Meetups', 'Trainers', 'Store'].map((x) => `<span style="font-size:13px;color:#C4C4D2;">${x}</span>`).join('')}
      ${btn('Join', acc, '#0B0B10', 'rgba(96,192,240,0.3)', 99)}
    </div>
  </div>
  <section style="padding:26px 30px 10px;text-align:center;">
    <h1 style="font-size:38px;font-weight:700;">${e(CP.hero.headline)}</h1>
    <p style="font-size:15px;color:#A9A9BA;max-width:56ch;margin:10px auto 0;">This is the wall, live. Nothing below is a stock photo — it is what people posted.${TAG()}</p>
  </section>
  <section style="columns:4;column-gap:12px;padding:20px 30px 40px;">
    ${tiles.map(([k, t, img, h]) => `<div style="break-inside:avoid;margin-bottom:12px;border-radius:14px;overflow:hidden;
      background:rgba(237,237,242,0.05);border:1px solid rgba(237,237,242,0.1);">
      <img src="${img}" alt="" style="width:100%;height:${h}px;object-fit:cover;display:block;opacity:0.82;">
      <div style="padding:11px 13px;"><div style="font-size:10px;letter-spacing:0.16em;color:${acc};">${k.toUpperCase()}</div>
      <div style="font-size:13.5px;font-weight:600;margin-top:3px;">${e(t)}</div></div></div>`).join('')}
  </section>
  <section style="padding:22px 30px 46px;border-top:1px solid rgba(237,237,242,0.1);display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:13px;color:#A9A9BA;max-width:60ch;">${e(CP.mission.closing)} ${OWN()}</div>
    <div style="font-size:11px;color:#7C7C8C;">Trainers ${FEE()}</div>
  </section>`);
}

/* ═══ V3 · THE RAIL — Mistral. Page scrolls SIDEWAYS. ═══════════════════════ */
function v3() {
  const bg = '#050A1C', ink = '#E0ECF4', acc = '#60C0F0';
  const panel = (n, label, title, body, img) => `
    <div style="flex:0 0 900px;scroll-snap-align:center;position:relative;border-radius:18px;overflow:hidden;
      border:1px solid rgba(96,192,240,0.2);background:#0A1430;min-height:430px;display:flex;flex-direction:column;justify-content:flex-end;padding:26px;">
      <img src="${img}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.4;">
      <div style="position:relative;">
        <div style="font-size:10px;letter-spacing:0.24em;color:${acc};">${String(n).padStart(2, '0')} &middot; ${label}</div>
        <div style="font-size:30px;font-weight:800;margin-top:7px;">${e(title)}</div>
        <div style="font-size:14px;line-height:1.6;color:#B9CBDC;max-width:56ch;margin-top:7px;">${e(body)}</div>
      </div></div>`;
  return doc(bg, ink, "'Plus Jakarta Sans',system-ui,sans-serif", '#B9CBDC', acc)(`
  <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 40px;">
    <img src="${A.logo}" alt="" style="width:30px;height:30px;">
    <div style="font-size:11px;letter-spacing:0.2em;color:#8FA8C8;">SCROLL SIDEWAYS &#8594; 6 PANELS${TAG()}</div>
  </div>
  <section style="padding:10px 0 6px 40px;">
    <h1 style="font-size:46px;font-weight:800;max-width:20ch;">${e(CP.hero.headline)}</h1>
  </section>
  <section style="display:flex;gap:18px;overflow-x:auto;scroll-snap-type:x mandatory;padding:20px 40px 14px;">
    ${panel(1, 'THE WORLD', 'Where it happens', CP.hero.sub, A.swans)}
    ${panel(2, 'COMMUNITY', CAT[6].title, CAT[6].desc, A.harbor)}
    ${panel(3, 'TRAINING', SVC[0].title, SVC[0].desc, A.proof)}
    ${panel(4, 'PROOF', TES[0].result, TES[0].quote, A.testim)}
    ${panel(5, 'PROGRAMS', TIER[1].name, TIER[1].features.join(' · '), A.crystal)}
    ${panel(6, 'THE DOOR', CP.cta.title, CP.cta.body, A.night)}
  </section>
  <div style="display:flex;gap:7px;justify-content:center;padding:6px 0 22px;">
    ${[0, 1, 2, 3, 4, 5].map((i) => `<span style="width:${i === 0 ? 26 : 7}px;height:7px;border-radius:99px;background:${i === 0 ? acc : 'rgba(96,192,240,0.3)'};"></span>`).join('')}
  </div>
  <section style="padding:0 40px 44px;display:flex;gap:14px;align-items:center;">
    ${btn(CP.hero.cta_primary, '#002060', ink, 'rgba(139,92,246,0.4)')}${ghost(CP.hero.cta_secondary, ink, 'rgba(96,192,240,0.4)')}
    <span style="font-size:11px;color:#8FA8C8;">Trainers ${FEE()}</span>
  </section>`);
}

/* ═══ V4 · THE SEAM — Oryzo. Macro texture split by a horizon. ══════════════ */
function v4() {
  const bg = '#0A0A0F', ink = '#F0EDE6', acc = '#C6A84B';
  return doc(bg, ink, "'Plus Jakarta Sans',system-ui,sans-serif", '#B5AFA3', acc)(`
  <section style="position:relative;height:620px;overflow:hidden;">
    <img src="${A.water}" alt="" style="position:absolute;top:0;left:0;width:100%;height:310px;object-fit:cover;transform:scaleY(-1);opacity:0.9;">
    <img src="${A.swans}" alt="the swans, from Sean's own film" style="position:absolute;top:310px;left:0;width:100%;height:310px;object-fit:cover;opacity:0.95;">
    <div style="position:absolute;top:308px;left:0;right:0;height:4px;background:linear-gradient(90deg,transparent,${acc},transparent);"></div>
    <div style="position:absolute;left:0;right:0;top:0;height:100%;background:linear-gradient(180deg,rgba(10,10,15,0.55),rgba(10,10,15,0.1) 45%,rgba(10,10,15,0.55));"></div>
    <div style="position:absolute;left:40px;top:34px;display:flex;align-items:center;gap:10px;">
      <img src="${A.logo}" alt="" style="width:30px;height:30px;"><span style="font-size:13px;font-weight:700;">SwanStudios</span></div>
    <div style="position:absolute;left:0;right:0;bottom:26px;text-align:center;font-size:11px;letter-spacing:0.3em;color:${ink};">SCROLL TO CROSS THE SEAM${TAG(acc)}</div>
  </section>
  <section style="padding:66px 56px 30px;text-align:center;">
    <h1 style="font-size:56px;font-weight:800;letter-spacing:-0.03em;max-width:18ch;margin:0 auto;">${e(CP.hero.headline)}</h1>
    <p style="font-size:18px;line-height:1.55;color:#B5AFA3;max-width:56ch;margin:16px auto 0;">${e(CP.hero.sub)}</p>
    <div style="display:flex;gap:14px;justify-content:center;margin-top:24px;">${btn(CP.hero.cta_primary, acc, '#0A0A0F', 'rgba(198,168,75,0.25)', 3)}${ghost(CP.hero.cta_secondary, ink, 'rgba(240,237,230,0.3)', 3)}</div>
  </section>
  <section style="padding:0 56px 56px;">
    ${[[CAT[6], A.harbor], [SVC[0], A.proof], [CAT[1], A.testim]].map(([x, img], i) => `
      <div style="display:grid;grid-template-columns:${i % 2 ? '1fr 1fr' : '1fr 1fr'};gap:0;align-items:stretch;border-top:1px solid rgba(240,237,230,0.16);">
        <div style="padding:34px 30px 34px 0;${i % 2 ? 'order:2;padding-left:30px;padding-right:0;' : ''}">
          <div style="font-size:11px;letter-spacing:0.2em;color:${acc};">${String(i + 1).padStart(2, '0')}</div>
          <div style="font-size:26px;font-weight:800;margin-top:8px;">${e(x.title)}</div>
          <div style="font-size:14.5px;line-height:1.6;color:#B5AFA3;margin-top:8px;">${e(x.desc)}</div>
        </div>
        <img src="${img}" alt="" style="width:100%;height:230px;object-fit:cover;opacity:0.75;${i % 2 ? 'order:1;' : ''}">
      </div>`).join('')}
    <div style="padding-top:20px;font-size:11px;color:#8C8578;">Trainers ${FEE(acc)}</div>
  </section>`);
}

/* ═══ V5 · THE INDEX — Shopify Editions. No hero image. Type only. ══════════ */
function v5() {
  const bg = '#12100E', ink = '#F5F1E8', acc = '#8B5CF6';
  const R = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  const row = (n, t, d) => `<div style="display:grid;grid-template-columns:52px 1fr 240px;gap:20px;padding:15px 0;border-top:1px solid rgba(245,241,232,0.14);align-items:baseline;">
      <span style="font-family:'Cormorant Garamond',Georgia,serif;font-size:19px;color:${acc};">${n}</span>
      <span style="font-size:22px;font-weight:400;font-family:'Cormorant Garamond',Georgia,serif;">${e(t)}</span>
      <span style="font-size:12.5px;line-height:1.55;color:#B4AC9C;">${e(d)}</span></div>`;
  return doc(bg, ink, "'Cormorant Garamond',Georgia,serif", '#B4AC9C', acc)(`
  <section style="padding:48px 64px 26px;display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid rgba(245,241,232,0.2);">
    <div><div style="font-size:34px;">The Community Edition</div>
    <div style="font-size:11px;letter-spacing:0.24em;color:#8C8474;font-family:'Plus Jakarta Sans',sans-serif;margin-top:6px;">SWANSTUDIOS &middot; NO. 01 &middot; A CONTENTS PAGE, NOT A BILLBOARD${TAG()}</div></div>
    <img src="${A.logo}" alt="" style="width:40px;height:40px;">
  </section>
  <section style="padding:30px 64px 10px;">
    <h1 style="font-size:52px;font-weight:400;max-width:20ch;">${e(CP.hero.headline)}</h1>
    <p style="font-family:'Plus Jakarta Sans',sans-serif;font-size:16px;line-height:1.6;color:#B4AC9C;max-width:62ch;margin-top:14px;">${e(CP.hero.sub)}</p>
  </section>
  <section style="padding:20px 64px 0;">
    <div style="font-size:11px;letter-spacing:0.24em;color:${acc};font-family:'Plus Jakarta Sans',sans-serif;">WAYS IN</div>
    ${CAT.map((c, i) => row(R[i], c.title, c.desc)).join('')}
  </section>
  <section style="padding:34px 64px 0;">
    <div style="font-size:11px;letter-spacing:0.24em;color:${acc};font-family:'Plus Jakarta Sans',sans-serif;">WHAT WE DO</div>
    ${SVC.slice(0, 8).map((s, i) => row(R[i], s.title, s.desc)).join('')}
  </section>
  <section style="padding:34px 64px 60px;">
    <div style="display:flex;gap:14px;">${btn(CP.hero.cta_primary, acc, '#12100E', 'rgba(96,192,240,0.3)', 0)}${ghost(CP.hero.cta_secondary, ink, 'rgba(245,241,232,0.3)', 0)}</div>
    <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;color:#8C8474;margin-top:12px;">Trainers ${FEE()}</div>
  </section>`);
}

/* ═══ V6 · THE FEED — the literal Nextdoor answer. Dated local entries. ═════ */
function v6() {
  const bg = '#FBFAF7', ink = '#16181D', acc = '#0F5132';
  const entry = (when, kind, who, what, img) => `
    <div style="display:grid;grid-template-columns:76px 1fr 120px;gap:16px;padding:16px 0;border-bottom:1px solid rgba(22,24,29,0.12);align-items:center;">
      <div style="font-size:11px;color:#6B7280;">${when}</div>
      <div><div style="font-size:10px;letter-spacing:0.14em;color:${acc};">${kind}</div>
        <div style="font-size:15px;font-weight:600;margin-top:3px;">${e(what)}</div>
        <div style="font-size:12px;color:#6B7280;margin-top:2px;">${who}${TAG(acc)}</div></div>
      <img src="${img}" alt="" style="width:120px;height:64px;object-fit:cover;border-radius:8px;">
    </div>`;
  return doc(bg, ink, "'Plus Jakarta Sans',system-ui,sans-serif", '#4B5563', acc)(`
  <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 40px;border-bottom:1px solid rgba(22,24,29,0.12);">
    <div style="display:flex;align-items:center;gap:9px;"><img src="${A.logo}" alt="" style="width:26px;height:26px;">
      <span style="font-weight:700;">SwanStudios</span></div>
    <div style="font-size:13px;color:#4B5563;">&#9679; Los Angeles &middot; 4 mi${TAG(acc)}</div>
  </div>
  <section style="padding:26px 40px 12px;">
    <h1 style="font-size:32px;font-weight:800;max-width:22ch;">${e(CP.hero.headline)}</h1>
    <p style="font-size:14.5px;color:#4B5563;max-width:60ch;margin-top:8px;">Not a feed of strangers. The people training, making and meeting near you this week.${TAG(acc)}</p>
    <div style="display:flex;gap:12px;margin-top:16px;">${btn(CP.hero.cta_primary, acc, '#FBFAF7', 'rgba(15,81,50,0.2)', 8)}${ghost(CP.hero.cta_secondary, ink, 'rgba(22,24,29,0.25)', 8)}</div>
  </section>
  <section style="padding:8px 40px 40px;">
    ${entry('TUE 6:30', 'MEETUP', 'Hosted by a member', CAT[6].desc, A.harbor)}
    ${entry('TUE 7:00', 'SESSION', 'With your trainer', SVC[0].title, A.proof)}
    ${entry('WED 12:00', 'MAKE', 'Open to all', CAT[1].desc, A.testim)}
    ${entry('WED 19:00', 'RESULT', TES[0].author + ' · ' + TES[0].descriptor, TES[0].result, A.crystal)}
    ${entry('THU 18:00', 'MAKE', 'Back room', CAT[5].desc, A.about)}
    ${entry('FRI 07:00', 'SESSION', 'Small group', SVC[5].title, A.golf)}
    <div style="font-size:11px;color:#6B7280;padding-top:14px;">Trainers ${FEE(acc)}</div>
  </section>`);
}

/* ═══ V7 · THE OBJECT — MOUTHWASH. One object, near-empty ground. ═══════════ */
function v7() {
  const bg = '#F2F2F0', ink = '#0C0C0E', acc = '#0C0C0E';
  return doc(bg, ink, "'Plus Jakarta Sans',system-ui,sans-serif", '#5A5A63', acc)(`
  <div style="display:flex;justify-content:space-between;align-items:center;padding:20px 34px;">
    <span style="font-weight:800;letter-spacing:-0.02em;">SW.S</span>
    <div style="display:flex;gap:20px;font-size:13px;font-weight:600;">${['Train', 'Community', 'Store', 'Contact'].map((x) => `<span>${x}</span>`).join('')}</div>
  </div>
  <section style="padding:26px 90px 0;">
    <img src="${A.swans}" alt="the swans, from Sean's own film" style="width:100%;height:430px;object-fit:cover;display:block;">
  </section>
  <section style="padding:40px 90px 70px;">
    <h1 style="font-size:60px;font-weight:800;letter-spacing:-0.035em;line-height:1.02;max-width:22ch;">${e(CP.hero.headline)}</h1>
    <p style="font-size:19px;line-height:1.5;color:#5A5A63;max-width:58ch;margin-top:18px;">${e(CP.hero.sub)}</p>
    <div style="display:flex;gap:12px;margin-top:24px;">${btn(CP.hero.cta_primary, ink, '#F2F2F0', 'rgba(12,12,14,0.16)', 99)}${ghost(CP.hero.cta_secondary, ink, 'rgba(12,12,14,0.28)', 99)}</div>
    <div style="margin-top:46px;display:flex;flex-wrap:wrap;gap:0 26px;font-size:14px;color:#5A5A63;">
      ${CAT.map((c) => `<span style="padding:7px 0;">${e(c.title)}</span>`).join('<span style="padding:7px 0;color:#B4B4BC;">/</span>')}
    </div>
    <div style="font-size:11px;color:#8A8A93;margin-top:20px;">Trainers ${FEE('#8A6A1F')}</div>
  </section>`);
}

/* ═══ V8 · THE LEDGER — no imagery above fold. Numbers first. ═══════════════ */
function v8() {
  const bg = '#08090B', ink = '#E8EAED', acc = '#60C0F0';
  return doc(bg, ink, "'Fira Code',ui-monospace,monospace", '#9BA3AE', acc)(`
  <div style="display:flex;justify-content:space-between;padding:14px 36px;border-bottom:1px solid rgba(232,234,237,0.14);font-size:12px;">
    <span>SWANSTUDIOS / LEDGER</span><span style="color:#7B838E;">EVERY NUMBER ON THIS PAGE IS QUERYABLE${TAG()}</span>
  </div>
  <section style="padding:34px 36px 18px;">
    <h1 style="font-family:'Plus Jakarta Sans',sans-serif;font-size:40px;font-weight:800;max-width:22ch;letter-spacing:-0.02em;">${e(CP.hero.headline)}</h1>
  </section>
  <section style="padding:0 36px;">
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <tbody>
      ${STAT.map((s) => `<tr style="border-top:1px solid rgba(232,234,237,0.12);">
        <td style="padding:13px 0;width:180px;color:#7B838E;">${e(s.label.toUpperCase())}</td>
        <td style="padding:13px 0;font-size:22px;color:${ink};">${e(s.value)}</td>
        <td style="padding:13px 0;color:${s.status.startsWith('NEEDS') ? '#C6A84B' : '#4E9E6A'};">${s.status.startsWith('NEEDS') ? 'UNVERIFIED — needs Sean number' : 'standing'}</td></tr>`).join('')}
      ${TES.map((t) => `<tr style="border-top:1px solid rgba(232,234,237,0.12);">
        <td style="padding:13px 0;color:#7B838E;">RESULT</td>
        <td style="padding:13px 0;color:${ink};">${e(t.result)}</td>
        <td style="padding:13px 0;color:#7B838E;">${e(t.author)} / ${e(t.descriptor)}</td></tr>`).join('')}
      <tr style="border-top:1px solid rgba(232,234,237,0.12);"><td style="padding:13px 0;color:#7B838E;">TRAINER FEE</td>
        <td style="padding:13px 0;color:#C6A84B;">WITHHELD</td><td style="padding:13px 0;">${FEE()}</td></tr>
      </tbody>
    </table>
  </section>
  <section style="padding:26px 36px 54px;">
    <div style="font-size:12px;color:#7B838E;margin-bottom:12px;">// ${CAT.length} community channels</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;font-size:12.5px;">
      ${CAT.map((c, i) => `<div style="border:1px solid rgba(232,234,237,0.14);padding:10px;">
        <span style="color:${acc};">${String(i).padStart(2, '0')}</span> ${e(c.title)}</div>`).join('')}
    </div>
    <div style="display:flex;gap:12px;margin-top:22px;">${btn(CP.hero.cta_primary, acc, '#08090B', 'rgba(96,192,240,0.28)', 2)}${ghost(CP.hero.cta_secondary, ink, 'rgba(232,234,237,0.3)', 2)}</div>
  </section>`);
}

/* ═══ V9 · THE FIELD — KODE. Flat colour, scattered type, no cards at all. ══ */
function v9() {
  const bg = '#0F1E17', ink = '#EAF3EC', acc = '#7CE0A8';
  const scatter = CAT.map((c, i) => {
    const x = [10, 42, 68, 22, 56, 78, 34, 62][i], y = [8, 20, 12, 44, 52, 38, 68, 74][i];
    const s = [30, 22, 26, 19, 34, 21, 24, 28][i];
    return `<span style="position:absolute;left:${x}%;top:${y}%;font-size:${s}px;font-weight:800;letter-spacing:-0.02em;
      color:${i % 3 === 0 ? acc : ink};opacity:${i % 3 === 0 ? 1 : 0.62};">${e(c.title)}</span>`;
  }).join('');
  return doc(bg, ink, "'Plus Jakarta Sans',system-ui,sans-serif", '#A9C4B4', acc)(`
  <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 34px;font-size:11px;letter-spacing:0.18em;">
    <span>SWANSTUDIOS</span><span style="color:${acc};">[ SOUND ON ]&nbsp;&nbsp;[ 008 ]${TAG(acc)}</span><span>JOIN</span>
  </div>
  <section style="position:relative;height:560px;overflow:hidden;">
    ${scatter}
    <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:8px;height:8px;border-radius:50%;background:${acc};"></div>
  </section>
  <section style="padding:24px 34px 60px;border-top:1px solid rgba(234,243,236,0.16);">
    <h1 style="font-size:44px;font-weight:800;letter-spacing:-0.03em;max-width:20ch;">${e(CP.hero.headline)}</h1>
    <p style="font-size:16px;line-height:1.55;color:#A9C4B4;max-width:58ch;margin-top:12px;">${e(CP.hero.sub)}</p>
    <div style="display:flex;gap:12px;margin-top:22px;">${btn(CP.hero.cta_primary, acc, '#0F1E17', 'rgba(124,224,168,0.28)', 0)}${ghost(CP.hero.cta_secondary, ink, 'rgba(234,243,236,0.3)', 0)}</div>
    <div style="font-size:11px;color:#7E9A8B;margin-top:18px;">⚠ GREEN IS A TOKEN_PROPOSAL AT TRIAL — no approved client green exists (swan-element-intelligence §6). Trainers ${FEE('#C6A84B')}</div>
  </section>`);
}

/* ═══ V10 · THE DOOR — split screen. Choose before you scroll. ══════════════ */
function v10() {
  const bg = '#06080D', ink = '#E6EAF0', acc = '#8B5CF6';
  const side = (kind, title, lines, img, cta, bgc, glow) => `
    <div style="position:relative;display:flex;flex-direction:column;justify-content:center;gap:14px;padding:60px 44px;overflow:hidden;">
      <img src="${img}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.3;">
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,8,13,0.55),rgba(6,8,13,0.9));"></div>
      <div style="position:relative;font-size:11px;letter-spacing:0.26em;color:${acc};">${kind}</div>
      <div style="position:relative;font-size:34px;font-weight:800;line-height:1.08;max-width:16ch;">${e(title)}</div>
      <ul style="position:relative;margin:4px 0 0;padding-left:17px;color:#AEB8C6;font-size:14px;line-height:1.7;">
        ${lines.map((l) => `<li>${e(l)}</li>`).join('')}
      </ul>
      <div style="position:relative;margin-top:10px;">${btn(cta, bgc, '#06080D', glow, 12)}</div>
    </div>`;
  return doc(bg, ink, "'Plus Jakarta Sans',system-ui,sans-serif", '#AEB8C6', acc)(`
  <div style="display:flex;justify-content:center;padding:18px;">
    <div style="display:flex;align-items:center;gap:10px;"><img src="${A.logo}" alt="" style="width:28px;height:28px;">
      <span style="font-weight:800;">SwanStudios</span></div>
  </div>
  <section style="text-align:center;padding:6px 60px 22px;">
    <h1 style="font-size:40px;font-weight:800;max-width:24ch;margin:0 auto;">${e(CP.hero.headline)}</h1>
    <p style="font-size:15px;color:#AEB8C6;max-width:54ch;margin:10px auto 0;">Two doors. Pick yours — the page behind each one is different.${TAG()}</p>
  </section>
  <section style="display:grid;grid-template-columns:1fr 1fr;border-top:1px solid rgba(230,234,240,0.14);min-height:430px;">
    ${side('I AM HERE TO TRAIN', 'Find people, then find a trainer.',
      [CAT[6].desc, CAT[0].desc, 'Price shown before you sign anything.'], A.harbor, CP.hero.cta_primary, '#60C0F0', 'rgba(139,92,246,0.4)')}
    <div style="border-left:1px solid rgba(230,234,240,0.14);">${side('I COACH OR I CREATE', 'Keep your clients. Keep your rate.',
      [CP.for_trainers.features[0].desc, CP.for_trainers.features[1].desc, 'Fee published on one dated page, not in marketing copy.'], A.golf, CP.hero.cta_secondary, acc, 'rgba(96,192,240,0.42)')}</div>
  </section>
  <section style="padding:22px 44px 46px;text-align:center;">
    <div style="font-size:12px;color:#8894A6;">Trainers ${FEE()} &middot; ${OWN()}</div>
  </section>`);
}

const VERSIONS = [
  ['Main.dc.html', 'V1 · The Filter', v1(), 'sentence-as-filter nav (Pentagram); light; answers "near me" first'],
  ['Board.dc.html', 'V2 · The Board', v2(), 'masonry wall as hero (mymind); floating pill nav; community IS the argument'],
  ['Rail.dc.html', 'V3 · The Rail', v3(), 'HORIZONTAL scroll, 6 snap panels + dots (Mistral)'],
  ['Seam.dc.html', 'V4 · The Seam', v4(), 'mirrored macro split by a lit seam (Oryzo); alternating full-bleed rows'],
  ['Index.dc.html', 'V5 · The Index', v5(), 'NO hero image; a typographic contents page, roman numerals (Shopify Editions)'],
  ['Feed.dc.html', 'V6 · The Feed', v6(), 'dated local entries with times + city chip; the literal neighbourhood answer'],
  ['Object.dc.html', 'V7 · The Object', v7(), 'one object on near-empty light ground; slash-separated list, no cards (MOUTHWASH)'],
  ['Ledger.dc.html', 'V8 · The Ledger', v8(), 'monospace TABLE, numbers first, no imagery above the fold'],
  ['Field.dc.html', 'V9 · The Field', v9(), 'flat colour field, scattered letterforms, zero cards (KODE) — green is TRIAL only'],
  ['Door.dc.html', 'V10 · The Door', v10(), 'hard 50/50 split; choose an audience before you scroll'],
];

const W = 1280, GAP = 200, PER_ROW = 5;
const artboards = [], annotations = [];
VERSIONS.forEach(([file, title, html, note], i) => {
  fs.writeFileSync(path.join(here, file), html, 'utf8');
  const col = i % PER_ROW, row = Math.floor(i / PER_ROW);
  const x = col * (W + GAP), y = row * 3600;
  artboards.push({ file, title, x, y, w: W, h: 3400 });
  annotations.push({ id: `n-v${i + 1}`, x, y: y - 150, w: 420, text: `${title}\n${note}` });
});

annotations.push({
  id: 'ten-manifest', x: -560, y: 0, w: 480,
  text: `TEN STRUCTURALLY DIFFERENT VERSIONS — 2026-08-20\n\nSean: "I'm seeing the same square boxes, the same cards, the same UI, the same fonts, the same everything... the theme changer already does that."\n\nHe was right. The previous five were ONE layout function called five times with different colour tokens — which is exactly what his theme changer already produces. That is not design.\n\nTHE RULE THIS RUN ENFORCES ON ITSELF:\nthere is NO shared page() function. Every version owns its layout end to end. gate-ten.mjs measures STRUCTURE — nav model, scroll axis, primary element, hero kind, type family, density — and fails on structural collision, not on palette similarity.\n\nWHAT ACTUALLY VARIES:\n• scroll axis — V3 is horizontal, the rest vertical\n• hero — filter sentence / masonry wall / snap panels / mirrored seam / pure type / dated feed / single object / data table / scattered field / split doors\n• primary element — chips, tiles, panels, rows, index lines, feed entries, slash lists, table rows, free type, half-screens\n• nav — none, floating pill, sideways dots, sticky mark, masthead, city chip, inline links, terminal bar, indexed counter, centred mark\n• type — sans / mono / serif-display / editorial serif\n• ground — 4 are LIGHT, 6 dark\n\nFROM THE PAID PANEL (Grok 4.6 / GLM 5.3 / GPT-5.6 Sol Pro):\n• community-first may be an OVER-correction for a cold "trainer near me" visitor. Sean and the panel disagree, so these ten deliberately TEST different orderings instead of assuming.\n• NO board states a fee — the live ~10% and the planned 15%+$1,000 cap contradict, so every board carries a withheld marker instead of a number.\n• "Owned by the community" is marked where it appears: Sol flags it as a possible legal ownership claim.\n• Now present because the panel found them missing: city/geo, a trainee-facing price line, and what "Join the Community" actually enrols you in.\n\nMOBBIN: L3 evidence only. L6 adjudication and L7 canon are HUMAN-ONLY. Each version names its source so you can accept or reject individually.`,
});

fs.writeFileSync(path.join(here, 'canvas.json'),
  JSON.stringify({ artboards, annotations, launch: { view: 'canvas' } }, null, 2) + '\n', 'utf8');
console.log(`wrote ${artboards.length} structurally distinct versions + canvas.json`);
