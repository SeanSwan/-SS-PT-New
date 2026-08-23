# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** C:/tmp/radar/PANEL-R4.md
**Seed:** (none)
**Tokens:** 2123 in / 7837 out · **Cost:** ~$0.0511 · **Wall:** 155.7s · **finish:** stop

---

D1: 1B · D2: 2C · D3: 3C

**D1.** Overrule GROK: a 48px control → 70vh sheet buries the monitoring surface (two taps). Overrule DEEPSEEK on remedy — persistence is the fix. Rail is a sticky top strip, always on, grid in-flow below; not a sheet, not a marquee (moving 44px targets stay a defect). Cost at 320px: 44px chrome (~8% of 568px SE), one headline ~18ch + count, rest `overflow-x: auto`.

```css
/* PhoneRail — 320–767 only */
.phone-rail {
  position: sticky; top: 0; z-index: 2;
  display: flex; align-items: center; gap: var(--space-2, 8px);
  min-height: 44px; height: 44px;
  padding: 0 var(--space-3, 12px);
  background: var(--bg-rail, #111);
  border-bottom: 1px solid var(--border, #2a2a2a);
  color: var(--fg, #eee);
}
.phone-rail ul {
  display: flex; gap: var(--space-4, 16px);
  list-style: none; margin: 0; padding: 0;
  overflow-x: auto; flex: 1; min-width: 0;
}
.phone-rail a {
  display: inline-flex; align-items: center;
  min-height: 44px; max-width: 18ch;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: inherit; text-decoration: none;
}
```
```html
<nav class="phone-rail" aria-label="Latest headlines">
  <span>News · {n}</span>
  <ul>{items.map(i => <li key={i.id}><a href={i.link} target="_blank" rel="noopener noreferrer">{i.headline}</a></li>)}</ul>
</nav>
```

**D2.** Overrule DEEPSEEK on split nodes (two representations drift; that is two UIs). Winner vs GROK: same DOM nodes. Overrule GROK on 8000ms. Interval **5000ms debounce**. One `<ul>`; new `<li>` prepended; focus never stolen; `>5` items in `<2000ms` → one utterance. Live region holds the string only — not a second list.

```js
const ANNOUNCE_DEBOUNCE_MS = 5000;
const BURST_WINDOW_MS = 2000;
const BURST_COALESCE_AT = 5;
const SAME_DOM_NODES = true; // list IS the moving layer
// utterance: `${n} new stories. Latest: ${headline}`
// <ul> no aria-live; sibling: <div aria-live="polite" aria-atomic="true" class="sr-only">
```

**D3.** Overrule GROK on hero — newest-first grid already leads with the latest tile; a featured row is a catalogue cue. Overrule DEEPSEEK’s “large visuals ⇒ catalogue” — 16:9 is allowed only from feed-native `enclosure`/`media:content`. **Fetching `og:image` is a breach** of `rss_headline_snippet_linkout`: it is not in the public RSS, requires fetching the link-out target (or an unfurl proxy), hotlink phones-home the user IP before any click, and proxying is rehosting. Never fetch it.

```js
// Tile contract (no hero row)
// <a target="_blank" rel="noopener noreferrer"> whole card
media: item.enclosure?.url || item.mediaContent?.url || null // never og:image
aspect: media ? '16 / 9' : 'auto'
fallback: publisher wordmark + typographic card
headline: { WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }
snippet: String(item.snippet || '').slice(0, 140)
order: pubDate desc // never engagement
// hover only:
'@media (prefers-reduced-motion: no-preference)': { '&:hover': { transform: 'translateY(-2px)' } }
minHeight: 44 // hit target on the <a>
color: 'var(--fg, #eee)', background: 'var(--bg-card, #1a1a1a)'
```
