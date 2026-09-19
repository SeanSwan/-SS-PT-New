# Design Brief — HY3 seat (design inspiration + overall judgment) — reviewed by HY3 (tencent/hy3)

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/social-feed-upgrade-2026-09-16/DESIGN-BRIEF-HY3.md
**Seed:** (none)
**Tokens:** 1208 in / 8000 out | **Cost:** ~$0.0044 | **Wall:** 96.8s | **finish_reason:** length

---

> ⚠ **TRUNCATED** — hit max_tokens (8000); this reply is INCOMPLETE.
> Re-run with --max-tokens higher, or split the packet into narrower consults.

## Component 1: Swan Spotlight (recommended spec)  — token-level CSS/component sketch

```css
/* tokens */
:root{
  --spot-bg:var(--card,#141419);
  --spot-chrome:rgba(224,236,244,0.12); /* thin light border */
  --spot-sheen:inset 0 1px 0 rgba(255,255,255,0.06);
  --spot-ice:var(--ice-wing,#60C0F0);
  --spot-ice-soft:rgba(96,192,240,0.08);
  --spot-ice-border:rgba(96,192,240,0.40);
  --spot-text:var(--frost,#E0ECF4);
  --spot-dek:rgba(224,236,244,0.80);
  --radius:12px;
}
.sw-spotlight-rail{ width:320px; padding:0 0 24px; font-family:var(--font-ui,'Sora'); }
.sw-spotlight-head{ font-family:var(--font-head,'Plus Jakarta Sans'); font-size:16px; font-weight:600; color:var(--spot-text); margin:0 0 12px 4px; }
.sw-card{
  position:relative; background:var(--spot-bg); border:1px solid var(--spot-chrome);
  box-shadow:var(--spot-sheen); border-radius:var(--radius); padding:16px; margin-bottom:12px;
  overflow:hidden;
}
.sw-hero{ width:100%; aspect-ratio:16/9; height:auto; border-radius:8px; object-fit:cover; display:block; background:#0A0A0F; }
.sw-stamp{ position:absolute; top:20px; left:20px; font-family:var(--font-drama,'Cormorant Garamond'); font-style:italic; font-size:12px; color:var(--spot-ice); background:rgba(3,7,18,0.55); padding:2px 6px; border-radius:4px; }
.sw-dismiss{ position:absolute; top:8px; right:8px; width:44px; height:44px; display:grid; place-items:center; background:transparent; border:0; color:var(--spot-text); opacity:.6; cursor:pointer; border-radius:8px; }
.sw-dismiss:focus-visible{ outline:2px solid var(--spot-ice); outline-offset:2px; }
.sw-dismiss:hover{ color:var(--spot-ice); opacity:1; }
.sw-title{ font-family:var(--font-head,'Plus Jakarta Sans'); font-size:18px; line-height:24px; font-weight:600; color:var(--spot-text); margin:12px 0 0; max-height:48px; overflow:hidden; }
.sw-dek{ font-size:14px; line-height:20px; color:var(--spot-dek); margin:8px 0 0; max-height:60px; overflow:hidden; }
.sw-source{ display:inline-flex; align-items:center; height:24px; padding:0 10px; margin-top:10px; font-size:12px; color:var(--spot-ice); border:1px solid var(--spot-ice-border); border-radius:12px; background:var(--spot-ice-soft); }
.sw-note{ font-family:var(--font-drama,'Cormorant Garamond'); font-style:italic; font-size:14px; color:#B8C6D0; margin:8px 0 0; padding-left:8px; border-left:2px solid var(--spot-ice); max-height:40px; overflow:hidden; }
/* states */
.sw-rail--empty, .sw-rail--dismissed{ border:1px dashed var(--spot-chrome); border-radius:var(--radius); height:120px; display:grid; place-items:center; color:var(--spot-dek); font-size:14px; text-align:center; padding:0 16px; }
.sw-rail--muted{ height:44px; display:flex; align-items:center; justify-content:space-between; padding:0 12px; border:1px solid var(--spot-chrome); border-radius:8px; font-size:13px; color:var(--spot-dek); }
.sw-rail--muted button{ width:44px; height:44px; background:transparent; border:0; color:var(--spot-ice); cursor:pointer; }
/* motion */
@keyframes sw-enter{ from{opacity:0; transform:translateX(12px);} to{opacity:1; transform:none;} }
@keyframes sw-exit{ to{opacity:0; transform:scale(.96) translateX(8px);} }
.sw-card{ animation:sw-enter 240ms cubic-bezier(.22,1,.36,1) both; }
.sw-card.is-dismissing{ animation:sw-exit 160ms ease-in both; }
@media (prefers-reduced-motion: reduce){ .sw-card{ animation:none; } .sw-card.is-dismissing{ animation:none; transition:opacity 120ms; } }
/* 414px full-width variant */
@media (max-width:414px){
  .sw-spotlight-rail{ width:100%; padding:0 16px 24px; }
  .sw-card{ padding:14px; }
  .sw-hero{ aspect-ratio:16/9; }
}
/* only 1 live item */
.sw-rail--single .sw-footer{ margin-top:8px; font-size:12px; color:var(--spot-dek); text-align:center; }
```

Card anatomy zones (sizes): hero 288×162 (desktop inner), stamp 12px italic top-left overlay, dismiss 44×44 hit top-right, title 18/24 two-line cap, dek 14/20 three-line cap, source pill 24h, note 14 italic left-border. Type scale: head 16, title 18, dek 14, chip 12, note 14. Chrome: 1px `--spot-chrome` + inner sheen. Empty: dashed box 120px “No curated highlights right now”. Dismissed: same dashed + “You cleared Spotlight [Undo] [Mute]” 44px buttons. Muted: 44px bar with unmute. Enter 240ms slide/opacity; exit 160ms scale/opacity + height collapse 200ms. 414px: rail full width, card padding 14px. Single live: header + one card + footer pill “More curated soon”.

## Component 1 alt (one alternative worth considering)

**Swan Spotlight Compact (no hero)** — for users who dismiss images or on very narrow sidebars.  
```css
.sw-card.compact{ padding:12px 14px; }
.sw-card.compact .sw-hero{ display:none; }
.sw-card.compact{ border-left:3px solid var(--spot-ice); }
.sw-card.compact .sw-title{ margin-top:0; font-size:16px; line-height:22px; }
.sw-card.compact .sw-dek{ font-size:13px; }
/* stamp becomes inline before title */
```
All other tokens identical; motion budget same; saves 162px vertical per item, allowing all 3 max items in shorter rail. Good A/B for density preference.

## Component 2: Coach Signal (recommended + alt)

**Recommended**
```css
:root{ --gold:var(--gilded-fern,#C6A84B); --gold-soft:rgba(198,168,75,0.12); --gold-line:rgba(198,168,75,0.40); }
.coach-signal{
  display:flex; align-items:center; gap:10px; min-height:44px; margin:-8px -16px 12px; /* span PostCard padding */
  padding:8px 16px; border:1px solid var(--gold); border-radius:8px;
  background:linear-gradient(90deg,var(--gold-soft),rgba(198,168,75,0.04));
  box-shadow:inset 0 1px 0 rgba(255,255,255,0.08);
  font-family:var(--font-ui,'Sora');
}
.coach-signal .avatar{ width:32px; height:32px; border-radius:50%; border:1px solid var(--gold-line); }
.coach-signal .who{ font-family:var(--font-head,'Plus Jakarta Sans'); font-size:14px; font-weight:600; color:var(--frost,#E0ECF4); }
.coach-signal .role{ font-size:11px; color:var(--gold); letter-spacing:.04em; text-transform:uppercase; }
.coach-signal .note{ font-size:13px; color:#D8C9A0; line-height:18px; flex:1; overflow:hidden; max-height:36px; }
.coach-signal .glyph{ width:20px; height:20px; color:var(--gold); flex:none; }
@keyframes cs-pulse{ 0%{box-shadow:0 0 0 0 rgba(198,168,75,0.4) inset;} 100%{box-shadow:0 0 0 4px rgba(198,168,75,0) inset;} }
.coach-signal{ animation:cs-pulse 1200ms ease-out 1 both; }
@media (prefers-reduced-motion: reduce){ .coach-signal{ animation:none; } }
/* CoachDock cheer panel control */
.coach-dock .signal-btn{ height:44px; padding:0 16px; background:transparent; border:1px solid var(--gold); border-radius:8px; color:var(--gold); font-family:var(--font-ui); font-size:14px; cursor:pointer; }
.coach-dock .signal-btn[aria-pressed="true"]{ background:var(--gold-soft); color:var(--frost); cursor:default; }
.coach-dock .signal-pop{ position:absolute; bottom:48px; right:0; width:280px; background:var(--modal,#1A1A24); border:1px solid var(--gold-line); border-radius:8px; padding:12px; }
.coach-dock .signal-pop textarea{ width:100%; height:60px; background:#0A0A0F; color:var(--frost); border:1px solid var(--gold-line); border-radius:6px; font-family:var(--font-ui); font-size:13px; padding:6px; }
```
Banner anatomy: left avatar (32), name+role block, flexible note (≤120 char), right star glyph. Gold usage: 1px solid matte gold border + gradient fill ≤12% opacity, no drop-shadow spam, uppercase “Coach” in gold small caps to signal earned status, not ad. Animation: single 1200ms inset glow pulse (GPU box-shadow). Coach-side: 44px “Signal this post” button opens popover with note input + confirm; after tap becomes disabled “Signaled ✓”.

**Alt** – *Inline Gold Quote*: remove full-width banner; insert a 4px left gold border block inside caption area:
```css
.coach-signal.inline{ margin:8px 0; padding:8px 12px; border-left:4px solid var(--gold); border-radius:0 6px 6px 0; background:var(--gold-soft); }
```
Less prominent, avoids top collision, but loses “frame” recognition. Use only if PostCard top zone crowded.

## Component 3: Proof Card (recommended + alt)

**Recommended**
```css
:root{ --proof-bg:var(--card,#141419); --data:#50A0F0; --xp:#60C0F0; --gold:#C6A84B; }
.proof-card{ width:100%; max-width:480px; background:var(--proof-bg); border:1px solid rgba(224,236,244,0.12); box-shadow:inset 0 1px 0 rgba(255,255,255,0.06); border-radius:16px; padding:20px; font-family:var(--font-ui,'Sora'); color:var(--frost,#E0ECF4); }
.proof-head{ display:flex; align-items:center; gap:12px; }
.proof-avatar{ width:40px; height:40px; border-radius:50%; }
.proof-member{ font-family:var(--font-head,'Plus Jakarta Sans'); font-size:16px; font-weight:600; }
.proof-stamp{ font-family:var(--font-drama,'Cormorant Garamond'); font-style:italic; font-size:13px; color:var(--xp); margin-left:auto; }
.proof-workout{ font-family:var(--font-head); font-size:22px; font-weight:700; margin:14px 0 16px; }
.proof-grid{ display:grid; grid-template-columns:1fr 1fr; gap:14px 16px; }
.proof-stat .label{ font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:rgba(224,236,244,0.6); }
.proof-stat .val-data{ font-family:var(--font-data,'Fira Code'); font-size:32px; color:var(--data); line-height:1; } /* total volume biggest */
.proof-stat .val-xp{ font-family:var(--font-data); font-size:20px; color:var(--xp); }
.proof-stat .val-gold{ font-family:var(--font
