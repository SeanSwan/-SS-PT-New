# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** C:/tmp/radar/PANEL-R3.md
**Seed:** (none)
**Tokens:** 1985 in / 10221 out · **Cost:** ~$0.0651 · **Wall:** 234.6s · **finish:** stop

---

VERDICT: UPHOLD-WITH-AMENDMENT

1. Shape. YouTube Subscriptions + civic rail stands. Netflix-as-model cannot clear the three constraints at once: a tile that plays is rehosting (`rss_headline_snippet_linkout`), a hero on a 0/51+0/39 catalogue is a fake (default-off), and preference-rank is a bias bug (civic time-order). The strongest argument I did not answer in R2 is the owner’s double ask: Netflix *chrome* (dark, large cards, a first row that reads as a billboard) with no player and no rank. That chrome is legal — it is still a link-out card at a larger `min-width`. It does not make Netflix right. A static image billboard of a dormant catalogue is the same lie as an autoplay hero; an iframe/embed is a copyright incident. Once `enabledCount >= 1`, tiles may grow to Netflix scale (`min 220px`, 1-row featured of the newest link-out, time-ordered, headline+snippet+`<a href={item.link} rel="noopener noreferrer">` only). That is YouTube subscriptions at a larger tile, not Netflix. I disagree with any seat that treats a non-playing hero as satisfying default-off while 90 sources are off. GLM and OX ALPHA did not sit. DEEPSEEK/QWEN positions on a static-image hero are [UNVERIFIED]; if they argued it, I disagree.

2. Layout. **It breaks at 1024.** `200 + 280 = 480`; main `= 544`. Three tiles: `544 - 32 pad - 24 gap = 488 / 3 ≈ 163px`. Snippet is ~16ch. Unreadable. Amendment: 3-col shell moves to **1280** (`220 / 1fr / 280`, three tiles in ~780 ≈ 240px). 1024 keeps the 768 pattern (drawer, 280 overlay, 2 tiles). Collapse order forms → rail → tiles stays on width, but the R2 rationale “management is rare” is false under default-off and is withdrawn; empty main must mount enablement, not a blank grid: `{enabledCount === 0 && <EnableEmpty onOpenNav={() => setDrawer('forms')} />}`. 48px peek does not animate (stands) but cannot show a headline; it is a `48px` control, `min-height: 44px`, label `News · {n}`, `aria-expanded`, no moving text. `content-max: 1440` + “unused width is gutter” detaches the rail if the gutter lands in the `1fr` track (`2560 - 240 - 1440 - 360 = 520px` dead zone between browse and rail). Gutter is outside the shell only:

```css
@media (min-width: 2560px) {
  .shell { display: grid; grid-template-columns: 1fr 240px minmax(0, 1440px) 360px 1fr; }
}
```

3. Rail. `aria-live="off"` on the moving list stands — a per-tick live region is the WCAG 2.2.2 fail, and a decorative copy plus a real list is two UIs. The 30s polite region is compliant (4.1.3 has *a* status message) and not equivalent: sighted users get The Rise now; SR users get a digest up to 29s late. On a civic monitor that is merely compliant. Amendment: same region, `aria-atomic="true"`, `debounceMs = 8000`, text `` `${n} new stories. Latest: ${headline}` ``. Burst of 40: one commit, one `translateY(-${n * itemH}px)`, no 40-stagger (40 × 72px = 2880px / ~12s of motion). Scroll compensation if newest is prepended: `if (rail.scrollTop > 0) rail.scrollTop += n * itemH`. Keyboard: never unmount `document.activeElement`; if a cull would drop it, skip that node or `remaining[0].querySelector('a')?.focus({preventScroll:true})`. Pause on `:hover`/`:focus-within` stands. Reduced-motion as written is a logic bug: “mount at bottom” vs “appear at top” is two orderings. Amendment — both modes are newest-first at the top; motion is siblings `transform: translateY(-itemH)` 200ms + new item `opacity` 200ms; `@media (prefers-reduced-motion: reduce) { .rise { transition: none; } }`.

4. R2 collapse copy names “Watch.” There is no Watch under `rss_headline_snippet_linkout`. A Watch pane is an embed waiting to happen and a rebuild. The main is Browse (link-out grid). Empty Browse is enablement, not a player-shaped hole.
