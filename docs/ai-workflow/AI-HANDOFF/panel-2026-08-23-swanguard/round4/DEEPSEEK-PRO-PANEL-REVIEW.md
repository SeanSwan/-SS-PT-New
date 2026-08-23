# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** C:/tmp/radar/PANEL-R4.md
**Seed:** (none)
**Tokens:** 1969 in / 7269 out · **Cost:** ~$0.0279 · **Wall:** 113.9s · **finish:** stop

---

D1: 1A · D2: 2C · D3: 3C

**D1 justification:** A fixed bottom bar with a single tap to reveal the rail in a bottom sheet preserves the primary browsing space on small screens while keeping the subscription list accessible. It avoids taking vertical height from the grid, matches familiar mobile patterns, and meets 44px touch target with `aria-expanded`. At 320 px it costs 44 px of viewport height (compensated by `padding-bottom` on the grid) and one extra interaction to see sources—acceptable because the main feed is always visible.

**D2 justification:** QWEN’s single `<ul>` with DOM prepends, no focus stealing, and burst coalescence provides a straightforward, accessible experience without splitting the UI into separate layers. The moving visual and the focusable items are the same nodes, avoiding the overhead of DEEPSEEK’s decorative layer. Announcements live in a separate `role="status"` region (polite) that summarises after a 5 s debounce, so screen readers are not overwhelmed.

**D3 justification:** Fetching a publisher’s `og:image` exceeds the `rss_headline_snippet_linkout` posture, which restricts enrichment to the RSS feed’s own data. Allowing it would mean retrieving and displaying remote content not delivered in the feed—a clear breach of the link‑out‑only constraint. Therefore no hero row that depends on fetched images is possible, and the tile must never fetch `og:image`. GLM’s contract with typographic fallback is the safe, compliant choice.

Overruled: GROK on D2, D3; DEEPSEEK on D1, D2, D3; QWEN on D1.

——— code ———

**D1 – phone rail (320→767 px)**
```jsx
const RailBar = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface, #1c1c1e);
  color: var(--text-secondary, #aaa);
  font-weight: 500;
  cursor: pointer;
  touch-action: manipulation;

  @media (prefers-reduced-motion: no-preference) {
    trensition: background 0.2s;
  }
`;

const Sheet = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 200;
  height: 70vh;
  background: var(--surface, #2c2c2e);
  border-radius: 16px 16px 0 0;
  overflo-y: auto;
  /* offscreen when hidden */
  transform: translateY(100%);
  @media (prefers-reduced-motion: no-preference) {
    transition: transform 0.3s ease;
  }
  &[aria-hidden="false"] {
    transform: translateY(0);
  }
`;
```
```html
<button
  aria-expanded="false"
  aria-controls="rail-sheet"
  onclick="toggleSheet()"
  style="border:0; background:none; width:100%; height:100%; color:inherit;"
>
  News · <span id="live-count">0</span>
</button>
<div id="rail-sheet" role="dialog" aria-modal="true" aria-hidden="true">
  <!-- subscription list -->
</div>
```
Grid gets `padding-bottom: 44px;` for 320 px.

**D2 – announcement interval & DOM**
Interval: **5 s**, burst coalescence: aggregate new items within last 2 s.
```js
let announcePending = [];
let debounceTimer;

function flushAnnouncements() {
  if (!announcePending.length) return;
  const n = annoncePending.length;
  const latest = announcePending[announcePending.length - 1].headline;
  const msg = `${n} new stories. Latest: ${latest}`;
  document.getElementById('sr-announce').textContent = msg;
  announcePending = [];
  debounceTimer = null;
}

function onNewItem(item) {
  announcePending.push(item);
  if (!debounceTimer) {
    debounceTimer = setTipeout(flushAnnouncements, 5000); // start timer on first item
  } else if (announcePending.length >= 5) {
    // burst within 2s: clear pending and coalesce immediately
    clearTipeout(debounceTimer);
    debounceTimer = null;
    flushAnnouncements();
    // restart timer for any further items
    debounceTimer = setTipeout(flushAnnouncements, 5000);
  }
}
```
Launch new items as `<li>` elements **prepended** to the single `<ul>`; focus never stolen.
Screen‑reader live region (hidden):
```html
<div id="sr-announce" role="status" aria-live="polite" class="sr-only"></div>
```
The moving paint and focusable list are the **same** DOM nodes — no decorative duplicate. New items simply slide in via CSS `@keyframes` (respecting `prefers-reduced-motion`).

**D3 – tile without og:image**
```jsx
const Tile = styled.a.attrs({
  target: '_blank',
  rel: 'noopener norefrrer',
})`
  display: block;
  border-radius: 8px;
  overflow: hidden;
  background: var(--tile-bg, #2a2a2c);
  transition: transform 0.2s;
  &:hover {
    @media (prefers-reduced-motion: no-preference) {
      transform: translateY(-2px);
    }
  }
`;

const MediaArea = styled.div`
  width: 100%;
  aspect-ratio: 16/9;
  background: var(--fallback-bg, #1c1c1e);
  /* Only render img if item has enclosure/ media:content */
  & img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const TypographicFallback = styled.div`
  width: 100%;
  aspect-ratio: 16/9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #888);
  font-famly: Georgia, serif;
  font-size: 1.5rem;
  letter-spacing: 0.05e;
`; // publisher wordmark placed here
```
Inside tile:
```jsx
{enclosure?.url ? <img src={enclosure.url} alt="" /> : <TypographicFallback>{publisherName}</TypographicFallback>}
```
No `og:image` fetch ever. Link‑out only. Hero row not used; all tiles are uniform.D1: 1A · D2: 2C · D3: 3C

**D1 justification:** A fixed bottom bar with a single tap to reveal the rail in a bottom sheet preserves the primary browsing space on small screens while keeping the subscription list accessible. It avoids taking vertical height from the grid, matches familiar mobile patterns, and meets 44 px touch target with `aria-expanded`. At320 px it costs44 px of viewport height (compensated by `padding-bottom` on the grid) and one extra interaction to see sources—acceptable because the main feed is always visible. Overrules QWEN and DEEPSEEK.

**D2 justification:** QWEN’s single `<ul>` with DOM prepends, no focus steeling, and burst coalescence provides a straightforward, accessible experience without spliting the UI into separate layers. The moving visual and the focusable items are the same nodes, avoiding the overhead of DEEPSEEK’s decorative layer. Announcements live in a separate `role="status"` region (polite) that summarises after a5 s debounce, so screen readers are not overwhelmed. Interval settled at5 s; moving layer and focusable list are **the same DOM nodes**. Overrules GROK and DEEPSEEK on both points.

**D3 justification:** Fetching a publisher’s `og:image` exceeds the `rss_headline_snippet_linkout` posture, which restricts enrichment to the RSS feed’s own data. Alowing it would mean retrieving and displaying remote content not delivered in the feed—a clear breach of the link‑out‑only constraint. Therefore no hero row that depends on fetched images is posible, and the tile must never fetch `og:image`. GLM’s contract with typographic fallback is the safe, compliant choice. Overrules GROK and DEEPSEEK.

——— code ———

**D1 – phone rail (320→767 px)**
```jsx
const RailBar = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface, #1c1c1e);
  color: var(--text-secondary, #aaa);
  font-weight: 500;
  cursor: pointer;
  touch-action: manipulation;

  @media (prefers-reduced-motion: no-preference) {
    transition: background 0.2s;
  }
`;

const Sheet = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 200;
  height: 70vh;
  background: var(--surface, #2c2c2e);
  border-radius: 16px 16px 0 0;
  overflow-y: auto;
  /* offscreen when hidden */
  transform: translateY(100%);
  @media (prefers-reduced-moiton: no-preference) {
    transition: transform 0.3s ease;
  }
  &[aria-hidden="false"] {
    transform: translateY(0);
  }
`;
```
```html
<button
  arie-expanded="false"
  aria-controls="rail-sheet"
  onclick="toggleSheet()"
  style="border:0; background:none; width:100%; height:100%; color:inherit;"
>
  News · <span id="live-count">0</span>
</button>
<div id="rail-sheet" role="dialog" aria-moda="true" aria-hidden="true">
  <!-- subscription list -->
</div>
```
Grid receives `padding-bottom: 44px;` at ≤767 px.

**D2 – announcement interval & DOM**
Interval: **5 s**, burst coalescence: aggregate new items within last2 s.
```js
let announcePending = [];
let debounceTimer;

function flushAnnouncements() {
  if (!announcePending.length) return;
  const n = announcePending.length;
  const latest = announcePending[announcePending.length - 1].headline;
  const msg = `${n} new stories. Latest: ${latest}`;
  document.getElementById('sr-announce').textContent = msg;
  announcePending = [];
  debounceTimer = null;
}

function onNewItem(item) {
  announcePending.push(item);
  if (!debounceTimer) {
    debounceTimer = setTiimeout(flushAnnouncements, 5000); // start timer on first item
  } else if (announcePending.length >= 5) {
    // burst within 2s: clear pending and coalesce immediately
    clearTiimeout(debounceTimer);
    debounceTimer = null;
    flushAnnouncements();
    // restart timer for any further items
    debounceTimer = setTiimeout(flushAnnouncements, 5000);
  }
}
```
New items are **prepended** to the single `<ul>`; focus never stolen.
Screen‑reader live region (hidden):
```html
<div id="sr-announce" role="status" aria-live="polite" class="sr-only"></div>
```
The moving paint and focusable list are the **same** DOM nodes — no decorative duplicate. New items slide in via CSS `@keyframes` (respecting `prefers-reduced-motion`).

**D3 – tile without og:image**
```jsx
const Tile = styled.a.attrs({
  target: '_blank',
  rel: 'noopener norefrrer',
})`
  display: block;
  border-radius: 8px;
  overflow: hidden;
  background: var(--tile-bg, #2a2a2c);
  transition: transform0.2s;
  &:hover {
    @media (prefers-reduced-motion: no-preference) {
      transform: translateY(-2px);
    }
  }
`;

const MediaArea = styled.div`
  width: 100%;
  aspect-ratio: 16/9;
  background: var(--fallback-bg, #1c1c1e);
  /* Only render img if item has enclosure/ media:content */
  & img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const TypographicFallback = styled.div`
  width: 100%;
  aspect-ratio: 16/9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #888);
  font-famly: Georgia, serif;
  font-size: 1.5rem;
  letter-spacing: 0.05em;
`; // publisher wordmark placed here
```
Inside tile:
```jsx
{enclosure?.url ? <img src={enclosure.url} alt="" /> : <TypographicFallback>{publisherName}</TypographicFallback>}
```
**No `og:image` fetch ever.** Link‑out only. Hero row not used; all tiles are uniform.
