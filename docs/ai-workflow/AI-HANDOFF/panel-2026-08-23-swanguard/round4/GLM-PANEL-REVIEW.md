# GLM Consult

**Model:** glm-5.3
**Document:** C:/tmp/radar/PANEL-R4.md
**Tokens:** 1890 in / 7307 out (reasoning: 5877) | total 9197
**Wall:** 90.3s

---

`D1: 1B · D2: 2C · D3: 3C`

## D1 — 1B (overrules GROK 1A; DEEPSEEK's diagnosis upheld, QWEN's fix adopted)

DEEPSEEK correctly named the defect but supplied no fix; QWEN's persistent ticker is that fix. A monitoring tool whose live rail hides behind two taps on its most-carried form factor is inverted. But I amend 1B: no marquee — text swaps **in place**, statically. The ticker is a *jump control pointing at* the single list from D2, not a second list, so it dodges the two-UIs problem. **Cost at 320px:** 56px sticky strip ≈ 8.5% of a 667px viewport; grid collapses to one column; headlines truncate at one line (~30ch) with ellipsis; anchors need `scroll-margin-top: 64px` so sticky doesn't cover targets.

```jsx
// PhoneTicker.jsx (own file, ~60 lines)
const Ticker = styled.header`
  position: sticky; top: 0; z-index: 10;
  min-height: 56px; display: flex; align-items: center;
  padding: 0 var(--space-3, 12px);
  background: var(--surface-raised, #14161a);
  border-bottom: 1px solid var(--border-subtle, #2a2e35);
`;
const Jump = styled.button`
  all: unset; width: 100%; min-height: 44px;
  display: flex; align-items: center; gap: 8px; cursor: pointer;
  color: var(--text-primary, #f2f4f7); /* ~15:1 on #14161a */
`;
const Head = styled.span`
  flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`;
// render:
<Ticker>
  <Jump aria-label={`Latest from ${latest.source}: ${latest.headline}. Show story.`}
        onClick={() => document.getElementById(latest.id)?.scrollIntoView()}>
    <Dot aria-hidden="true" /><Head>{latest.headline}</Head>
    <Count aria-hidden="true">{n}</Count>
  </Jump>
</Ticker>
```

## D2 — 2C (overrules GROK's 8000ms and DEEPSEEK's split layer)

**Interval: 5000ms. DOM: same nodes — QWEN wins outright.** DEEPSEEK's decorative paint layer creates two trees that can diverge between what sighted users see and what SR/keyboard users traverse; the "moving layer" is just CSS entrance animation *on the `<li>`s themselves*, which satisfies everyone without duplication. GROK's atomic status phrasing survives as the announcer text — but a visually-hidden `role="status"` div is an announcement channel, not a second UI. Bursts of >5 in <2s coalesce to one summary. Focus is never stolen; toggle `aria-busy` on the `<ul>` during batch prepends.

```js
// useLiveAnnouncer.js (hook, own file)
const FLUSH_MS = 5000;
useEffect(() => {
  const id = setInterval(() => {
    const q = queueRef.current; if (!q.length) return;
    const burst = q.length > 5 && (now - q[0].at < 2000);
    announce(burst ? `${q.length} new stories arrived.`
      : `${q.length} new ${q.length === 1 ? 'story' : 'stories'}. Latest: ${q.at(-1).headline}`);
    q.length = 0;
  }, FLUSH_MS);
  return () => clearInterval(id);
}, []);
```
```jsx
setItems(prev => [...incoming, ...prev]); // true DOM prepend, newest-first top
```
```css
@media (prefers-reduced-motion: no-preference) {
  li { animation: rise 180ms ease-out both; }
}
```

## D3 — 3C (overrules GROK 3A hero; overrules DEEPSEEK only on tile resistance — its no-hero holds)

**og:image ruling: fetching it IS a breach.** `rss_headline_snippet_linkout` licenses headline + snippet + link *as declared by the feed*; og:image requires fetching the article page beyond the feed and repurposing an asset the publisher did not put in it. In-feed `enclosure`/`media:content` only. Hero is denied: a hero editorializes one item visually and, since a large share of text feeds carry no media [UNVERIFIED], would mostly render as oversized typographic cards — dishonest spectacle. Netflix-grade comes from the tile grid alone.

```jsx
// FeedTile.jsx (own file, ~90 lines; 16:9 only from feed-declared media)
const Tile = styled.a`
  display: flex; flex-direction: column; gap: var(--space-2, 8px);
  min-height: 44px; text-decoration: none; overflow: hidden;
  background: var(--surface-card, #191c21);
  border: 1px solid var(--border-subtle, #2a2e35);
  border-radius: var(--radius-md, 10px);
  color: var(--text-primary, #f2f4f7);
  @media (prefers-reduced-motion: no-preference) {
    &:hover, &:focus-visible { transform: translateY(-2px); }
  }
`;
const Title = styled.h3`
  display: -webkit-box; -webkit-box-orient: vertical;
  -webkit-line-clamp: 2; overflow: hidden;
`;
const Snip = styled.p`
  color: var(--text-secondary, #b8bec7); /* ~9:1 on #191c21 */
`;

const media = item.enclosure?.url ?? item.mediaContent?.[0]?.url ?? null; // feed-declared ONLY — never og:image
<a href={item.link} target="_blank" rel="noopener noreferrer"
   aria-label={`${item.headline} — ${item.source}. Opens in new tab.`}>
  {media ? <img src={media} alt="" loading="lazy" css={aspect16x9}/> : <Wordmark source={item.source}/>}
  <Title>{item.headline}</Title>
  <Snip>{item.snippet.slice(0, 140)}</Snip>
</a>
```

All files comfortably under 300 lines; extraction (PhoneTicker, useLiveAnnouncer, FeedTile) is the intended pattern.
