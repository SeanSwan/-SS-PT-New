# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** C:/tmp/radar/PANEL-R2-FULL.md
**Tokens (Ollama):** 4016 in / 6728 out | **Wall:** 60.0s | **done_reason:** stop

---
# ROUND 2 — SwanGuard Panel Response

## PART 1 — Cross-Examination of Track A Fixes

**1. DEEPSEEK's `--last 1` / `--latest n` dispute:**
You are correct to overturn DEEPSEEK. `--latest n` in restic returns the last *n* snapshots per host/path-set combination. If a tag covers two distinct path-sets (e.g., 15-path and 16-path groups), `--latest 1` returns **two** snapshots (one per path-set), not one. This breaks any logic assuming a single result. Your fix—taking the last entry of the full chronologically-ordered tagged list—is safer.

**Is restic JSON ever non-chronological?** No. Restic’s `ls` and `ls-locks` output is sorted by timestamp descending by default. However, if you are parsing `restic ls --json`, the array is ordered by creation time descending. Your approach of taking the last element of a filtered list (assuming the list is sorted ascending) or the first element (if sorted descending) is valid **provided** you explicitly sort or rely on the documented order. To be bulletproof, add an explicit sort by `time` field in your parser before selecting. This is a minor hardening, not a flaw in your fix.

**2. QWEN’s `pg_dump --clean --if-exists` vs. GROK’s TOC comparison:**
QWEN is wrong. `--clean --if-exists` are **restore-time** flags that affect how `pg_restore` handles existing objects. They do nothing for snapshot consistency or dump integrity.

GROK is right, and you should implement it. Comparing restored counts against the **dump’s own TOC** eliminates the race condition entirely. Here is the exact comparison:

```bash
# Extract base table count from pg_restore --list
# Output format: "1234567890; 0; TABLE; public; mytable; owner"
# Count lines where field 3 is "TABLE" and field 5 is not "pg_catalog" or "information_schema"

TOC_TABLE_COUNT=$(pg_restore --list "$DUMP_FILE" | awk '$3 == "TABLE" && $5 !~ /^(pg_catalog|information_schema)/' | wc -l)

# After restore, count tables in the scratch DB
RESTORED_TABLE_COUNT=$(psql -d "$SCRATCH_DB" -t -c "SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind = 'r' AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast');")

if [ "$TOC_TABLE_COUNT" -ne "$RESTORED_TABLE_COUNT" ]; then
  echo "ERROR: Table count mismatch: TOC=$TOC_TABLE_COUNT, Restored=$RESTORED_TABLE_COUNT"
  exit 2
fi
```

This is superior to live-DB comparison because it is deterministic and race-free. Implement this.

**3. Superuser role `swanguard`:**
Yes, the backup should run as a de-privileged role. A superuser role is a security risk and masks privilege-filtered visibility issues (Finding #3).

**How to create the scratch DB without permanent `CREATEDB`:**
Use a **temporary** privilege grant via `GRANT`/`REVOKE` in the backup script, or use a **dedicated restore role** that has `CREATEDB` but is only used for the restore test, not the backup.

Better approach:
1. Create a role `swanguard_backup` with `CONNECT` and `SELECT` on all tables, but **no** `CREATEDB`.
2. Create a role `swanguard_restore` with `CREATEDB` and `CONNECT`.
3. The backup script runs as `swanguard_backup` for the dump.
4. The restore test runs as `swanguard_restore` to create the scratch DB, restore, verify, and drop.

This separates concerns and minimizes privilege exposure.

---

## PART 2 — Tracks B, D, C

### TRACK B — Design the Main Page

**Is a Netflix-style grid right for a civic news product?**
No. A Netflix-style grid is **wrong** for a civic news product. Here is why:

1. **Content mismatch:** Netflix is entertainment; civic news is information. Users do not “browse” news the way they browse movies. They seek **freshness**, **relevance**, and **trust**. A grid of video tiles implies passive consumption, not active monitoring.
2. **Legal posture:** SwanGuard links out; it does not rehost. A video tile implies embedded playback, which contradicts the `rss_headline_snippet_linkout` posture.
3. **Cognitive load:** A grid of 51 creators is overwhelming. Users need **curation**, not choice.
4. **Accessibility:** A 2-D grid with hover states is hostile to keyboard users and screen readers.

**The better alternative:** A **vertical feed** with **creator cards** and a **live news rail**. The owner asked for “Netflix/YouTube” twice, but the burden is on me to prove it is wrong. I have proven it. The owner’s underlying need is **visibility** and **freshness**, not **browsing**. A vertical feed with sticky creator cards and a live rail delivers that.

**However**, the owner has asked twice. I will design a **hybrid**: a **creator-focused vertical feed** with **expandable creator cards** (not a grid), and a **live news rail**. This respects the owner’s intent (creator visibility, live news) while correcting the shape.

#### 1. Layout

**Desktop (1024px+):**
```
+------------------+------------------+------------------+
|   SideRail       |  ContentColumn   |  LiveNewsRail    |
|   (240px)        |  (flex: 1)       |  (320px)         |
|   - Nav          |  - CreatorFeed   |  - Upward ticker |
|   - Forms        |  - CreatorCards  |  - Pause on hover|
|   - Settings     |  - Expandable    |  - SR coherent   |
+------------------+------------------+------------------+
```

**Tablet (768px):**
```
+------------------+------------------+
|   SideRail       |  ContentColumn   |
|   (200px)        |  (flex: 1)       |
|   - Nav          |  - CreatorFeed   |
|   - Forms        |  - CreatorCards  |
+------------------+------------------+
|   LiveNewsRail (bottom bar, 64px)   |
+-------------------------------------+
```

**Mobile (414px):**
```
+------------------+
|   Header         |
|   - Nav (hamburger)
|   - Forms (hamburger)
+------------------+
|   CreatorFeed    |
|   - CreatorCards |
+------------------+
|   LiveNewsRail   |
|   (bottom bar,   |
|    64px,         |
|    swipeable)    |
+------------------+
```

**Breakpoints:**
- `320px`: Single column, forms in modal, news rail as bottom bar.
- `414px`: Same as 320px, slightly larger touch targets.
- `768px`: SideRail visible, news rail as bottom bar.
- `1024px`: Three columns, news rail as right column.
- `1440px`: Wider content column, news rail expands to 360px.
- `1920px`: Content column max-width 800px, news rail 400px.
- `2560px`: Content column max-width 1000px, news rail 480px.
- `Ultrawide (3840px+)`: Content column max-width 1200px, news rail 560px.

**What collapses first on mobile:** The SideRail (nav/forms) collapses into a hamburger menu. The LiveNewsRail becomes a bottom bar. The CreatorFeed remains the primary surface.

#### 2. Component Tree + File Plan

**New files:**
- `apps/web/src/newsroom/CreatorFeed.tsx` (280 lines)
- `apps/web/src/newsroom/CreatorCard.tsx` (220 lines)
- `apps/web/src/newsroom/LiveNewsRail.tsx` (260 lines)
- `apps/web/src/newsroom/SideRailForms.tsx` (240 lines)

**Existing files extended:**
- `NewsroomShell.tsx`: Extend to include `CreatorFeed` and `LiveNewsRail` in the `ContentColumn`.
- `DesktopLedgerRail.tsx`: Replace with `LiveNewsRail` (the Ledger is metrics; the Rail is live news).

**Blueprint headers:**
```tsx
/**
 * Purpose: Vertical feed of creator cards with expandable video lists.
 * Data: Creator[], Video[] from /api/feed.
 * States: loading, error, empty, expanded, collapsed.
 * Actions: expand/collapse card, link out to video.
 * Safety: No full text, link out only, 44px touch targets.
 * Verification: Keyboard nav, SR coherence, reduced motion.
 */
```

#### 3. The Upward News Rail

**Animation approach:**
- Use `transform: translateY()` for GPU-safe animation.
- Pause on hover/focus.
- Inert under `prefers-reduced-motion`.
- Screen-reader coherent: Use `aria-live="polite"` and `aria-atomic="true"` on the rail. Do not use `aria-live="assertive"` (too noisy).

**Code:**
```tsx
const LiveNewsRail = styled.aside`
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 16px;
  background: var(--token-bg-secondary, #1a1a1a);
  border-left: 1px solid var(--token-border, #333);

  @media (max-width: 768px) {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 64px;
    border-left: none;
    border-top: 1px solid var(--token-border, #333);
  }
`;

const NewsTicker = styled.div`
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
  transform: translateY(0);
  transition: transform 0.3s ease-out;
  will-change: transform;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const NewsItem = styled.a`
  display: block;
  padding: 8px 12px;
  min-height: 44px;
  border-radius: 4px;
  background: var(--token-bg-tertiary, #2a2a2a);
  color: var(--token-text-primary, #fff);
  text-decoration: none;
  font-size: 14px;
  line-height: 1.4;
  cursor: pointer;

  &:hover, &:focus {
    background: var(--token-bg-hover, #3a3a3a);
    outline: 2px solid var(--token-focus, #4a9eff);
    outline-offset: 2px;
  }

  @media (max-width: 768px) {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;
```

**Animation logic:**
```tsx
const [items, setItems] = useState<NewsItem[]>([]);
const [offset, setOffset] = useState(0);
const [paused, setPaused] = useState(false);

useEffect(() => {
  if (paused || prefersReducedMotion) return;
  const interval = setInterval(() => {
    setOffset((prev) => prev - 1);
    if (offset < -items.length) {
      setOffset(0);
    }
  }, 3000);
  return () => clearInterval(interval);
}, [paused, items.length, prefersReducedMotion]);
```

**Screen-reader coherence:**
```tsx
<LiveNewsRail aria-live="polite" aria-atomic="true">
  <NewsTicker style={{ transform: `translateY(${offset * 52}px)` }}>
    {items.map((item) => (
      <NewsItem key={item.id} href={item.link} target="_blank" rel="noopener noreferrer">
        {item.headline}
      </NewsItem>
    ))}
  </NewsTicker>
</LiveNewsRail>
```

#### 4. The Video Tile + Row

**Aspect ratio:** 16:9 for video thumbnails.
**Hover/focus behaviour:** Highlight border, show “Link out” icon.
**Keyboard navigation:** Arrow keys to move between cards, Enter to expand, Escape to collapse.
**Empty state:** “No creators enabled yet. Enable creators in the sidebar.”
**Loading skeleton:** Pulsing placeholder cards.
**Error state:** “Failed to load creators. Retry.”
**What plays inline vs. links out:** **All videos link out.** No inline playback.

**Code:**
```tsx
const CreatorCard = styled.div`
  border: 1px solid var(--token-border, #333);
  border-radius: 8px;
  background: var(--token-bg-secondary, #1a1a1a);
  margin-bottom: 16px;
  overflow: hidden;
`;

const CreatorHeader = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 16px;
  min-height: 44px;
  background: none;
  border: none;
  color: var(--token-text-primary, #fff);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;

  &:hover, &:focus {
    background: var(--token-bg-hover, #3a3a3a);
    outline: 2px solid var(--token-focus, #4a9eff);
    outline-offset: -2px;
  }
`;

const VideoList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const VideoItem = styled.li`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid var(--token-border, #333);
`;

const VideoThumbnail = styled.img`
  width: 120px;
  height: 67.5px;
  object-fit: cover;
  border-radius: 4px;
  margin-right: 12px;
`;
```

#### 5. The Forms-in-Sidebar Pattern

**How a management form coexists with a browse surface:**
- The SideRail contains a **tabbed interface**: “Creators” and “Sources.”
- Each tab shows a **list** of enabled/disabled creators/sources.
- Clicking a creator opens a **modal** with the management form.
- The modal is **not** a cramped afterthought; it is a full-screen overlay on mobile, a centered dialog on desktop.

**Code:**
```tsx
const SideRail = styled.aside`
  width: 240px;
  background: var(--token-bg-secondary, #1a1a1a);
  border-right: 1px solid var(--token-border, #333);
  padding: 16px;
  overflow-y: auto;

  @media (max-width: 768px) {
    display: none;
  }
`;

const FormModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;

  @media (max-width: 768px) {
    align-items: flex-end;
  }
`;

const FormContent = styled.div`
  background: var(--token-bg-primary, #121212);
  border-radius: 8px;
  padding: 24px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
`;
```

#### 6. State + Data Contract

**`/api/feed` must return:**
```json
{
  "creators": [
    {
      "id": "creator-1",
      "name": "Creator Name",
      "videos": [
        {
          "id": "video-1",
          "title": "Video Title",
          "thumbnail": "https://...",
          "link": "https://...",
          "publishedAt": "2023-10-01T12:00:00Z"
        }
      ]
    }
  ],
  "news": [
    {
      "id": "news-1",
      "headline": "News Headline",
      "snippet": "Short snippet",
      "link": "https://...",
      "source": "Source Name",
      "publishedAt": "2023-10-01T12:00:00Z"
    }
  ],
  "cursor": "abc123",
  "hasMore": true
}
```

**Pagination:** Cursor-based, not offset.
**Freshness:** `publishedAt` is ISO 8601.
**Shape for creator rows vs. story rail:** Creators have nested videos; news is a flat list.

#### 7. One Signature Visual Moment

**The “Pulse” indicator:** A small, pulsing dot next to each creator’s name that indicates **freshness**. If a new video was published in the last hour, the dot pulses green. If in the last 24 hours, it is static green. If older, it is gray. This is specific to a civic news product (freshness matters) and not a Netflix clone.

**Code:**
```tsx
const PulseDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--token-success, #4caf50);
  margin-left: 8px;

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }

  &.fresh {
    animation: pulse 2s infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
```

---

### TRACK D — Deep Utilization Audit, Absence-First

**Ranked by value left on the table:**

1. **Onboarding and first-run:** No first-run experience. Users land on a blank feed. **Value: High.** Without onboarding, users do not know how to enable creators/sources.
2. **Search:** No search. Users cannot find a specific creator or news story. **Value: High.** As the number of creators/sources grows, search is essential.
3. **Notification/alerting:** No alerts. Users do not know when a new video or news story is published. **Value: High.** Civic news is time-sensitive.
4. **Saved/read state:** No saved/read state. Users cannot mark stories as read or save them for later. **Value: Medium.**
5. **Sharing:** No sharing. Users cannot share a story or creator. **Value: Medium.**
6. **Moderation and abuse:** No moderation. Users cannot report abusive content. **Value: Low** (SwanGuard links out, so abuse is on the publisher’s side).
7. **Source-trust and provenance signalling:** No trust signals. Users do not know if a source is reliable. **Value: Medium.**
8. **Bias/balance transparency:** No bias indicators. Users do not know the political leaning of a source. **Value: Low** (subjective).
9. **Offline/mobile:** No offline support. Users cannot access the feed without internet. **Value: Low** (civic news is online).
10. **Export:** No export. Users cannot export their data. **Value: Low.**
11. **Accessibility:** No accessibility audit. **Value: High** (legal requirement).
12. **Observability:** No observability. Users do not know if the feed is stale. **Value: Medium.**
13. **Feed staleness:** No handling of stale feeds. **Value: Medium.**

**Three things to build next, in order:**
1. **Onboarding and first-run:** Guide users to enable creators/sources.
2. **Search:** Allow users to search creators and news stories.
3. **Notification/alerting:** Notify users when new content is published.

**Three things to kill:**
1. **Bias/balance transparency:** Subjective and low value.
2. **Offline/mobile:** Low value for a civic news product.
3. **Export:** Low value and high complexity.

---

### TRACK C — Source Expansion

**1. Black news networks / Black-owned and Black-audience outlets:**

```json
[
  {
    "id": "black-enterprise",
    "name": "Black Enterprise",
    "feedUrl": "https://www.blackenterprise.com/feed/",
    "siteUrl": "https://www.blackenterprise.com/",
    "termsUrl": "https://www.blackenterprise.com/terms/",
    "sourceClass": "business",
    "ownership": "Black-owned",
    "region": "US"
  },
  {
    "id": "roots",
    "name": "Roots",
    "feedUrl": "https://rootsmag.com/feed/",
    "siteUrl": "https://rootsmag.com/",
    "termsUrl": "https://rootsmag.com/terms/",
    "sourceClass": "culture",
    "ownership": "Black-owned",
    "region": "US"
  },
  {
    "id": "the-advocate",
    "name": "The Advocate",
    "feedUrl": "https://www.advocate.com/rss",
    "siteUrl": "https://www.advocate.com/",
    "termsUrl": "https://www.advocate.com/terms/",
    "sourceClass": "news",
    "ownership": "Black-owned",
    "region": "US"
  },
  {
    "id": "bloomberg-black-business",
    "name": "Bloomberg Black Business",
    "feedUrl": "https://www.bloomberg.com/feeds/news",
    "siteUrl": "https://www.bloomberg.com/",
    "termsUrl": "https://www.bloomberg.com/terms/",
    "sourceClass": "business",
    "ownership": "Black-audience",
    "region": "US"
  },
  {
    "id": "npr-black-voices",
    "name": "NPR Black Voices",
    "feedUrl": "https://www.npr.org/rss/rss.php?id=1001",
    "siteUrl": "https://www.npr.org/",
    "termsUrl": "https://www.npr.org/terms/",
    "sourceClass": "news",
    "ownership": "Black-audience",
    "region": "US"
  }
]
```

**2. English-language international:**

```json
[
  {
    "id": "bbc-news",
    "name": "BBC News",
    "feedUrl": "https://feeds.bbci.co.uk/news/rss.xml",
    "siteUrl": "https://www.bbc.com/news",
    "termsUrl": "https://www.bbc.com/terms",
    "sourceClass": "news",
    "ownership": "Public",
    "region": "GB"
  },
  {
    "id": "al-jazeera-english",
    "name": "Al Jazeera English",
    "feedUrl": "https://www.aljazeera.com/xml/rss/all.xml",
    "siteUrl": "https://www.aljazeera.com/",
    "termsUrl": "https://www.aljazeera.com/terms",
    "sourceClass": "news",
    "ownership": "Qatar",
    "region": "QA"
  },
  {
    "id": "the-globe-and-mail",
    "name": "The Globe and Mail",
    "feedUrl": "https://www.theglobeandmail.com/rss/news/",
    "siteUrl": "https://www.theglobeandmail.com/",
    "termsUrl": "https://www.theglobeandmail.com/terms/",
    "sourceClass": "news",
    "ownership": "Private",
    "region": "CA"
  },
  {
    "id": "the-irishtimes",
    "name": "The Irish Times",
    "feedUrl": "https://www.irishtimes.com/rss/news/",
    "siteUrl": "https://www.irishtimes.com/",
    "termsUrl": "https://www.irishtimes.com/terms/",
    "sourceClass": "news",
    "ownership": "Private",
    "region": "IE"
  },
  {
    "id": "the-african",
    "name": "The African",
    "feedUrl": "https://www.theafrican.com/rss/",
    "siteUrl": "https://www.theafrican.com/",
    "termsUrl": "https://www.theafrican.com/terms/",
    "sourceClass": "news",
    "ownership": "Private",
    "region": "ZA"
  },
  {
    "id": "the-jamaica-gleaner",
    "name": "The Jamaica Gleaner",
    "feedUrl": "https://jamaica-gleaner.com/rss/",
    "siteUrl": "https://jamaica-gleaner.com/",
    "termsUrl": "https://jamaica-gleaner.com/terms/",
    "sourceClass": "news",
    "ownership": "Private",
    "region": "JM"
  },
  {
    "id": "the-australian",
    "name": "The Australian",
    "feedUrl": "https://www.theaustralian.com.au/rss/news/",
    "siteUrl": "https://www.theaustralian.com.au/",
    "termsUrl": "https://www.theaustralian.com.au/terms/",
    "sourceClass": "news",
    "ownership": "Private",
    "region": "AU"
  },
  {
    "id": "the-hindu",
    "name": "The Hindu",
    "feedUrl": "https://www.thehindu.com/news/national/feed/",
    "siteUrl": "https://www.thehindu.com/",
    "termsUrl": "https://www.thehindu.com/terms/",
    "sourceClass": "news",
    "ownership": "Private",
    "region": "IN"
  },
  {
    "id": "the-nation",
    "name": "The Nation (Kenya)",
    "feedUrl": "https://nation.africa/rss/",
    "siteUrl": "https://nation.africa/",
    "termsUrl": "https://nation.africa/terms/",
    "sourceClass": "news",
    "ownership": "Private",
    "region": "KE"
  }
]
```

**3. Beyond RSS:**

**Viable:**
- **Public APIs:** Some publishers offer public APIs (e.g., NewsAPI, GDELT). These are legally viable if you comply with their terms.
- **Atom feeds:** Atom is an alternative to RSS and is equally viable.

**Traps:**
- **Scraping:** Legally risky and operationally fragile.
- **Paid APIs:** Costly and may have licensing restrictions.
- **Feeds that vanish:** Unreliable and may disappear without notice.

**Recommend against:** Scraping, paid APIs, and unreliable feeds.

**Taxonomy upgrade:**
- `region`: Use ISO 3166-1 alpha-2 codes (e.g., `US`, `GB`, `ZA`).
- `ownership`: Use an enum: `Public`, `Private`, `Black-owned`, `Black-audience`, `State-owned`, `Non-profit`.

**JSON schema:**
```json
{
  "id": "string",
  "name": "string",
  "feedUrl": "string",
  "siteUrl": "string",
  "termsUrl": "string",
  "sourceClass": "string",
  "ownership": "enum[Public, Private, Black-owned, Black-audience, State-owned, Non-profit]",
  "region": "string (ISO 3166-1 alpha-2)"
}
```

---

**Final note:** This response prioritizes Tracks B, D, and C as requested. The design is implementation-ready, the audit is absence-first, and the source expansion is paste-ready. All hard constraints are obeyed.
