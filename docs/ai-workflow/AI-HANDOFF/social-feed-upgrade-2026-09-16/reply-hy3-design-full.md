# Design Brief — HY3 seat (design inspiration + overall judgment) — reviewed by HY3 (tencent/hy3)

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/social-feed-upgrade-2026-09-16/DESIGN-BRIEF-HY3.md
**Seed:** (none)
**Tokens:** 1221 in / 9189 out | **Cost:** ~$0.0051 | **Wall:** 88.7s | **finish_reason:** stop

---

## Component 1: Swan Spotlight (recommended spec)  — token-level CSS/component sketch

```css
/* Right rail slot */
.spotlight-rail {
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--bg-surface, #0A0A0F);
  border-left: 1px solid rgba(96,192,240,0.15);
}
.spotlight-card {
  position: relative;
  background: #141419;
  border: 1px solid rgba(96,192,240,0.35); /* ice-cyan chrome */
  box-shadow: inset 0 1px 0 rgba(224,236,244,0.08); /* inner sheen line */
  border-radius: 12px;
  padding: 12px;
  overflow: hidden;
}
.spotlight-hero {
  width: 100%;
  height: 132px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 8px;
}
.spotlight-headline {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  line-height: 22px;
  font-weight: 600;
  color: #E0ECF4;
  max-width: 280px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.spotlight-dek {
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  line-height: 18px;
  color: rgba(224,236,244,0.72);
  margin-top: 4px;
}
.spotlight-source {
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: #60C0F0;
  background: rgba(96,192,240,0.1);
  padding: 2px 8px;
  border-radius: 999px;
  display: inline-block;
  margin-top: 8px;
}
.spotlight-stamp {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 12px;
  color: #60C0F0;
  margin-top: 6px;
}
.spotlight-note {
  font-family: 'Sora', sans-serif;
  font-style: italic;
  font-size: 12px;
  color: rgba(224,236,244,0.6);
  max-width: 280px;
}
.spotlight-dismiss {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  background: transparent;
  border: none;
  color: #60C0F0;
  cursor: pointer;
}
.spotlight-dismiss:focus-visible {
  outline: 2px solid #60C0F0;
  outline-offset: 2px;
}
/* Empty/dismissed/muted */
.spotlight-empty {
  border: 1px dashed rgba(96,192,240,0.25);
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  color: rgba(224,236,244,0.5);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
}
.spotlight-muted-strip {
  border: 1px solid rgba(96,192,240,0.2);
  background: #0A0A0F;
  border-radius: 8px;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
/* Motion */
@keyframes spotlight-enter { from { opacity:0; transform: translateY(6px);} to {opacity:1; transform:none;} }
.spotlight-card { animation: spotlight-enter 240ms ease-out; }
@keyframes spotlight-exit { to { opacity:0; transform: translateX(12px);} }
.spotlight-card.dismissed { animation: spotlight-exit 180ms ease-in forwards; }
@media (prefers-reduced-motion: reduce) {
  .spotlight-card, .spotlight-card.dismissed { animation: none; opacity:1; transform:none; }
}
/* 414px full-width variant */
@media (max-width: 414px) {
  .spotlight-rail { width: 414px; padding: 16px; border-left:none; }
  .spotlight-hero { height: 160px; }
}
/* Only 1 item live */
.spotlight-ghost {
  border: 1px dashed rgba(96,192,240,0.15);
  border-radius: 12px;
  height: 120px;
  opacity: 0.4;
}
```

Card anatomy zones: hero (132px), text block (headline ≤80 / dek ≤200), source chip, "Curated by Swan" stamp, optional curator note ≤140, dismiss hit area 44px. Type scale per above tokens.

## Component 1 alt (one alternative worth considering)

Compact row variant (no hero image) for bandwidth: `.spotlight-row` min-height 44px with 40px thumbnail left, headline 14px single line clamp, dismiss right; same ice-cyan chrome (`border:1px solid rgba(96,192,240,0.35)`), reduces vertical footprint ~60%. Used when only 1–2 items live or on very short viewports.

## Component 2: Coach Signal (recommended + alt)

Recommended:
```css
.coach-signal {
  border: 1px solid #C6A84B; /* gilded fern gold */
  background: linear-gradient(180deg, rgba(198,168,75,0.08), rgba(198,168,75,0.02));
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
}
.coach-signal::before {
  content: ''; position: absolute; left:0; top:0; bottom:0; width:3px;
  background: #C6A84B; /* earned edge */
}
.coach-signal-head { display:flex; align-items:center; gap:8px; }
.coach-avatar { width:24px; height:24px; border-radius:50%; }
.coach-name { font-family:'Plus Jakarta Sans'; font-weight:700; font-size:14px; color:#E0ECF4; }
.coach-note { font-family:'Sora'; font-size:12px; line-height:16px; color:rgba(224,236,244,0.85); max-width:280px; }
@keyframes signal-pulse {
  0% { box-shadow: 0 0 0 rgba(198,168,75,0); }
  50% { box-shadow: 0 0 8px rgba(198,168,75,0.4); }
  100% { box-shadow: 0 0 0 rgba(198,168,75,0); }
}
.coach-signal { animation: signal-pulse 1200ms ease-out 1; }
@media (prefers-reduced-motion: reduce) { .coach-signal { animation:none; } }
```
CoachDock cheer panel one-tap:
```css
.cheer-btn {
  min-height:44px; min-width:44px; padding:0 16px;
  border:1px solid #C6A84B; background:transparent; color:#C6A84B;
  border-radius:999px; font-family:'Sora'; font-size:14px;
}
.cheer-btn[aria-pressed="true"] { background:#C6A84B; color:#030712; }
```

Alt: gold underline mark only — `.postcard-coach-mark { border-bottom:2px solid #C6A84B; padding-bottom:2px; }` under coach name, with same 1200ms pulse on mount; avoids any PostCard zone collision but weaker "earned" weight.

## Component 3: Proof Card (recommended + alt)

Recommended:
```css
.proof-card {
  background:#141419;
  border:1px solid rgba(224,236,244,0.12);
  box-shadow: inset 0 1px 0 rgba(224,236,244,0.08);
  border-radius:12px;
  padding:16px;
  width:320px;
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap:12px;
}
.proof-member { grid-column:1 / -1; font-family:'Plus Jakarta Sans'; font-weight:600; font-size:14px; color:#E0ECF4; }
.proof-workout { grid-column:1 / -1; font-family:'Cormorant Garamond'; font-style:italic; font-size:18px; color:#60C0F0; }
.proof-volume { grid-column:1 / -1; font-family:'Fira Code'; font-size:28px; color:#50A0F0; } /* biggest */
.proof-pill {
  min-height:44px; display:flex; flex-direction:column; justify-content:center;
  background:rgba(96,192,240,0.08); border-radius:999px; padding:0 12px;
}
.proof-pill span:first-child { font-family:'Sora'; font-size:11px; color:rgba(224,236,244,0.6); }
.proof-pill span:last-child { font-family:'Fira Code'; font-size:14px; color:#E0ECF4; }
.proof-xp { color:#60C0F0 !important; }
.victory-chart { grid-column:1 / -1; width:100%; height:32px; }
```
Shared-image split: in-app uses CSS vars; exported PNG uses hardcoded `#030712` bg, `#E0ECF4` text, `#50A0F0` volume, `#60C0F0` workout, wrapped in 16px dark rounded rect for light contexts; victory chart as static SVG bars.

Alt: rarity variant — when streak day ≥30, `.proof-streak` gets `color:#C6A84B; font-family:'Cormorant Garamond';` plus small gold medal glyph; other elements unchanged, preserving hierarchy.

## Judgment answers (1-5, one short paragraph each)

1. Right call to keep Spotlight in the right rail and never interleave: a coaching-first dashboard must protect the chronological coach/client feed from editorial insertion that could read as an ad or dilute coach signals; the rail preserves clear hierarchy (coach recognition > proof > spotlight > posts) and avoids dark-pattern interleaving seen in social feeds.
2. Banning comments/likes/shares on Spotlight is correct, not overly strict: the surface is curated editorial, not a social object, so disabling vanity metrics prevents fake engagement and keeps all coach–client interaction on real PostCards; the only allowed actions are per-item dismiss and global mute, which respects user agency.
3. Best pattern for optional editorial content is the Discover-style dismiss with a transient Undo snackbar: tapping × immediately removes the card (180ms exit) and writes `localStorage['spotlight-dismiss']`, while a 44px-tall "Undo" bar appears for 5s; repeated dismissals surface an honest "Mute curated content" toggle in settings with no guilt copy.
4. Motion budget: Spotlight earns a subtle 6s opacity pulse on the ice-cyan chrome edge (0.3→0.5 alpha) plus 240ms enter/180ms exit transforms; Coach Signal earns a single 1200ms box-shadow pulse on mount; Proof Card stays low-motion but may draw the victory chart via 800ms scaleX. All animations are disabled under `prefers-reduced-motion`.
5. Yes, gold Coach Signal and gold Proof Card accents could compete; mitigate by reserving gold frame + crest exclusively for Coach Signal (recognition), using gold text only for streak≥30 rarity on Proof Card (no frame), and keeping Spotlight strictly ice-cyan; this enforces coach > proof > spotlight > ordinary posts visually.

## One design idea the blueprint missed (max 1, concrete)

The blueprint missed a "shared-image safe wrapper" for Proof Card: export must embed a forced dark `#030712` rounded rect with 16px internal padding and minimum 16px font sizes so the card remains legible when shared to light-theme messengers (e.g., iMessage light mode) instead of relying on app CSS variables that third-party clients strip.
