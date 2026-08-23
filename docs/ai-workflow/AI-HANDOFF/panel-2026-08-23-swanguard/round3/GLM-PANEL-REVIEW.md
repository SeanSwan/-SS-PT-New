# GLM Consult

**Model:** glm-5.3
**Document:** C:/tmp/radar/PANEL-R3.md
**Tokens:** 1764 in / 13245 out (reasoning: 11593) | total 15009
**Wall:** 201.7s

---

VERDICT: UPHOLD-WITH-AMENDMENT

The ruling's *behavioral* ruling stands — link-outs only, reverse-chronological, provenance-visible, enablement empty state. Its rhetorical blanket "Is Netflix right? No" is overruled: it convicts a skin using evidence about a contract.

**1. The shape**

Two of GROK's three legs fail to discriminate. The legal leg convicts *playback*, not poster presentation — a grid of whole-tile `<a>` link-outs with 16:9 media areas satisfies `rss_headline_snippet_linkout` trivially, and GROK's own chosen shape (YouTube subs grid) is visually 90% Netflix anyway. The default-off leg is shape-neutral: a subscriptions grid with zero subscriptions is exactly as empty as a catalogue with zero titles; the enablement empty state is mandatory either way, so it proves nothing about which grid fills it. Only leg three (hidden retention ranking vs. civic time-order) actually discriminates, and it convicts *ranking*, not tiles.

**Strongest unaddressed counter:** the owner asked twice; "Netflix slash YouTube" is a request for a genre, and overruling him requires the genre to be *impossible* under the constraints. It isn't. Only playback and rank-order are impossible. Answer — the amendment: the build may use Netflix-grade presentation under YouTube mechanics:

- Whole tile = one `<a href={item.link} target="_blank" rel="noopener noreferrer">`.
- 16:9 media area **only** when the feed item itself carries `enclosure`/`media:content` — never fetched og:image, which leaves the RSS posture. Fallback: typographic card, `aspect-ratio: 16/9`, publisher wordmark on `var(--surface-2, #1c1f26)`.
- Headline `-webkit-line-clamp: 2`; snippet `item.summary.replace(/\s+/g,' ').slice(0,140) + '…'`.
- Hover `translateY(-2px)` + border token swap, wrapped in `@media (prefers-reduced-motion: no-preference)`.
- Grid ordered by `pubDate` desc. Never engagement, never "because you watched."

GROK's conclusion survives; his verbiage doesn't. The owner gets his Netflix.

**2. The layout**

It breaks in the **768–1023 band, hardest edge exactly 1024.**

At 1024 (iPad landscape — a flagship civic-browsing device): chrome = 200 + 280 = 480px = **46.9% of the viewport** while "tiles ARE the main page." Main = 544 − 48 padding = 496 usable; 3-up tiles = (496 − 32)/3 ≈ **155px wide, 87px of media**. That is not a poster, it's a postage stamp — and at 1023px the same device gets a full-width grid. A 1px crossing costs ~480px of product.

At 768 the table is incoherent: a 280px "overlay" is either default-open (permanently occluding 36% of a 768px grid — first tile column unclickable) or default-closed (rail absent by default, contradicting the ruling's own thesis that civic presence is the ambient signal — and leaving the 30s polite region announcing a panel that isn't in-flow). Fix, one rule: at 768–1023 the rail is in-flow, not overlay — 280px rail + 2-up tiles at (768 − 280 − 48 − 16)/2 = **212px**, fully viable. At 1024, drop rail to 240px or hold 3-up until 1152.

Minor convictions: the peek bar needs `bottom: env(safe-area-inset-bottom)` and `height: calc(48px + env(safe-area-inset-bottom))`, sheet `70dvh` with `70vh` fallback — absent from the spec. Forms living in a 200px sidenav at 1024–1439 but becoming a 360 overlay at ≥1440 is inverted persistence. The ultrawide gutter call and content max 1440 are correct; don't touch them.

**3. The rail**

Concede first: `aria-live="off"` on the transforming list plus a separate throttled polite region is the *correct* architecture, not a workaround — per-item live announcements are the actual WCAG failure. But:

- **Parity gap.** Sighted users ambiently receive every headline; a screen-reader user receives ≤1 per 30s window, and only "count + latest." Fix with what's already half-built: pause-on-focus means parity is available *on demand* — so expose it. Rail accessible name: `"Civic rail — 12 unread, latest 09:41"`, updated on `focusin`, not on the timer.
- **Burst.** 40 arrivals × 72px = 2,880px of queued translate; serialized at ~1.2s/item that's ~48 seconds of convulsion; coalesced it's a teleport. Values: `MAX_ANIM = 5; queue.length > MAX_ANIM → render one coalesced "12 new — expand" entry; flush the rest into it.` Same coalescing under reduced motion, zero transform.
- **Scroll.** `overflow-anchor: none` on the animated stack; on insert above scroll position, `rail.scrollTop += insertedCount * 72`.
- **Keyboard.** `:focus-within` must freeze the *queue*, not just CSS. Guard exits: `if (node.contains(document.activeElement)) defer(node)` — otherwise a focused item ages out, focus dumps to `<body>`, and the tab run resets. Resume on `focusout` after 150ms debounce, then flush. Residual gap GROK must own rather than claim parity: NVDA/JAWS browse mode uses a virtual cursor that never fires `:focus-within`, so bottom-of-list deletions can occur under it. That's precisely why the polite region exists — say so.
- **Ordering contradiction.** Motion path: item "enters from below," stack "lifts toward the top edge" — newest lands at the *bottom*, oldest exits the top (receipt order). Reduced-motion path: new item "appears at the top." Two modalities, two opposite orderings. Ship one: newest at top, exits at bottom, both modalities.

**4. New defect**

**The Rise is arrival-ordered; the ruling's leg three demands publication-order — and with 39 sources on heterogeneous poll cadences, these diverge constantly.** A source polled hourly delivers its 09:00 item at 09:55 and it "rises" above items *published* at 09:52 by a 5-minute-polled source. The civic timeline is falsified by polling cadence. This is a data-model choice that costs a rebuild if skipped: the rail must be sorted-insert by `pubDate` (tie-break arrival, dedupe on `guid`), `items.insertAt(binarySearchBy(pubDate))`; only index-0 insertions animate The Rise, everything else inserts statically. This also largely dissolves the burst problem — 40 items disperse through the list instead of stacking the top.

**Seat disagreements:** I disagree with GROK on the 768 overlay, the modality ordering contradiction, and the skin-vs-behavior overreach in leg one. DEEPSEEK's and QWEN's round-2 texts are not in this record [UNVERIFIED] — I file no disagreement with them rather than invent their positions. GLM's empty return stands convicted by its own budget.
