# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** C:/tmp/radar/PANEL-R2-FULL.md
**Seed:** (none)
**Tokens:** 4183 in / 34171 out · **Cost:** ~$0.2132 · **Wall:** 528.2s · **finish:** stop

---

**Seat: independent panelist (Round 2).** Track A is mostly converged; I overturn two residual points and answer the superuser question. Tracks B/C/D were unanswered — this is the implementation.

Disagree with **DEEPSEEK** (`--last 1` / `--latest 1`). Disagree with **QWEN** (`pg_dump --clean --if-exists` as a consistency fix). Agree with **GROK** on TOC comparison — owner should implement it; the before/after lower bound is strictly weaker. Slightly disagree with the **owner** on restic: dropping the flag is correct, trusting list order is not. No other seat produced B/C/D to dispute.

---

# PART 1 — Track A only where new or overturning

## Restic chronology — owner's fix is incomplete

**Is restic JSON always chronological?** Not as a contract. Default `restic snapshots` (including `--json`) has been time-sorted in current versions, but:

- `--group-by` changes the JSON shape from a flat time-ordered array to grouped objects.
- `restic copy` inserts foreign snapshots; array order has not always matched `.time` across versions.
- Equal timestamps exist. Clock-skewed hosts exist.

[UNVERIFIED] that every restic minor pins array order as an API guarantee.

**Replacement:** drop `--last`/`--latest` (owner is right; DEEPSEEK is wrong — two path-sets ⇒ two snapshots, and `542d24d2` had no vault). Do **not** `tail -1` the raw list. Sort by `.time` then `.id`, and require the vault path:

```bash
snap_id="$(restic snapshots --tag "$TAG" --json \
  | jq -r --arg p "$VAULT_PATH_BASENAME" '
      [ .[]
        | select(any(.paths[]; endswith($p)))
      ]
      | sort_by(.time, .id)
      | last
      | .id // empty
    ')"
[ -n "$snap_id" ] || { echo "no vault snapshot"; exit 2; }
```

If `jq` sees grouped JSON, fail closed (`cannot_run`), do not pick `[0]`.

## TOC comparison — yes, implement GROK's version

The before/after lower bound still races (delete/create between the two live counts, or a dump that silently omitted a table the live DB still has). The dump is a frozen artifact. Compare the restore to the dump, never to live.

`pg_restore -l` TOC object type sits in field 3 of the post-semicolon record. `TABLE DATA` also matches a naive `TABLE` grep — exclude it.

```bash
toc_table_count() {
  pg_restore -l "$1" | awk '
    /^[0-9]+; / {
      rest = $0
      sub(/^[^;]+; +/, "", rest)
      n = split(rest, a, / +/)
      if (a[3] == "TABLE" && a[4] != "DATA" && a[4] != "ATTACH") c++
    }
    END { print c+0 }'
}

toc_data_count() {
  pg_restore -l "$1" | awk '
    /^[0-9]+; / {
      rest = $0
      sub(/^[^;]+; +/, "", rest)
      n = split(rest, a, / +/)
      if (a[3] == "TABLE" && a[4] == "DATA") c++
    }
    END { print c+0 }'
}

# after pg_restore into $SCRATCH (fail closed on either mismatch)
got_tables="$(psql -d "$SCRATCH" -v ON_ERROR_STOP=1 -Atc "
  SELECT count(*) FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r','p')
    AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')
    AND c.relpersistence <> 't';")"

want="$(toc_table_count "$DUMP")"
[ "$got_tables" -eq "$want" ] || { echo "TOC TABLE $want != restored $got_tables"; return 2; }
```

Empty tables still emit `TABLE` (schema) in custom format; `TABLE DATA` is the extra check that rows were scheduled. Do **not** add `--clean --if-exists` to the dump (QWEN) — those flags do not freeze a snapshot.

## Superuser backup role — yes, de-privilege. No permanent `CREATEDB`.

Finding #3 is masked because `rolsuper=t`. A non-superuser `pg_class` count only sees what that role can see; that is the correct backup invariant **if and only if** the role's `SELECT` grants *are* the backup surface.

One-time privileged provision (not in the nightly script):

```sql
ALTER ROLE swanguard NOSUPERUSER NOCREATEDB NOCREATEROLE LOGIN;
-- scratch already exists; swanguard owns it. Nightly never CREATE DATABASE.
GRANT CONNECT ON DATABASE appdb TO swanguard;
GRANT USAGE ON SCHEMA public TO swanguard;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO swanguard;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO swanguard;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO swanguard;
```

Nightly restore test, no `CREATEDB`:

```bash
psql -d swanguard_restore_scratch -v ON_ERROR_STOP=1 -c \
  "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO swanguard;"
pg_restore -d swanguard_restore_scratch --no-owner --no-acl --role=swanguard "$DUMP"
```

If you truly must `DROP DATABASE` / `CREATE DATABASE`, do it in systemd `ExecStartPre=` as the postgres OS user, not as `swanguard`. Do not use a `SECURITY DEFINER` create-db function — that is superuser with extra steps.

---

# PART 2

# TRACK B — Watch surface (implementation)

## Is Netflix right? No. YouTube Subscriptions + civic rail is.

The owner asked twice, so the burden is on me.

A Netflix *homepage* fights this product. Proof, not taste:

1. **Legal posture.** Netflix tiles play. SwanGuard **must not rehost**. A play-on-hover billboard is a lie and a copyright incident. Tiles are link-outs. That is YouTube's subscription grid (thumb → publisher), not Netflix.
2. **Default-off.** 51 creators + 39 sources are dormant. Netflix assumes a full catalog and paints a hero. This product's honest first screen is an enablement empty state, not a fake billboard.
3. **Civic vs preference.** Netflix ranks to retain. A civic monitor must be time-ordered and provenance-visible. Hidden ranking is a bias bug here, a feature there.
4. **The owner already specified the third element** — an upward live news rail. That is a terminal/wire pattern, not a streaming catalog. The page is two metaphors and should look like both, not like one clone.

**What we keep from the ask:** horizontal creator rows of 16:9 tiles, browse-first, forms off the main canvas, a vertical story rail. **What we refuse:** autoplay, continue-watching, "Because you watched", genre taxonomy, red progress bars, a hero that plays.

Signature moment is **The Rise**: the browse grid is still; the only motion on the page is a new story entering the rail from below and lifting the stack toward the top edge, with a 2px provenance hairline scaling on the rail's left. Motion = civic present. Stillness = creator record. Not a Netflix fade.

---

## 1. Layout — concrete values

```
>=1024
┌─ 56px topbar ──────────────────────────────────────────────────────────┐
│ brand | section tabs (Watch / Sources / Archive) | health dot | id     │
├─ 240px ─────────┬─ 1fr (max 1440) ──────────────┬─ 320px (1440:360) ───┤
│ SideNav          │ WatchPage                     │ LiveNewsRail          │
│  + FormsPanel    │  per creator: label + row     │  56px head + track    │
│    240, opens    │  tiles 16:9, gap 12           │  item 96px            │
│    to 360 overlay│  padding 16 / 24              │  padding 12           │
└──────────────────┴───────────────────────────────┴──────────────────────┘
```

| bp | nav | main | rail | tiles / row | what collapses |
|---|---|---|---|---|---|
| 320 | drawer (0) | 100% | peek 48 + sheet | 1 | forms → drawer; rail → peek bar; 1-col tiles |
| 414 | drawer | 100% | peek 48 + sheet | 1 | same; tile uses full width − 32 |
| 768 | drawer | 100% | 280 overlay, toggle | 2 | forms still drawer; rail can dock if `?rail=1` |
| 1024 | 200 | 1fr | 280 | 3 | 3-col shell appears; forms compact in nav |
| 1440 | 240 | 1fr | 320 | 4 | forms overlay 360 |
| 1920 | 240 | 1fr, content max 1440 | 360 | 5 | side margins absorb slack |
| 2560 / ultra | 240 | content max 1440, centered | 360 | 5 | **do not** 8-col stretch; unused width is gutter |

**Collapse order (phone-first, owner checks 320):**
1. **Forms first** — management is rare; browse is the product. `FormsPanel` becomes a left drawer, 44px hamburger in the topbar.
2. **Rail second** — a 320px ticker on a 320px phone leaves no Watch. Becomes a 48px peek bar (`↑ {latest headline}`) that opens a 70vh bottom sheet. Peek does not animate continuously (moving 44px target on a phone is a defect).
3. **Tiles last** — they *are* the main page.

`--shell-nav-w: 240px; --shell-nav-w-narrow: 200px; --shell-rail-w: 320px; --shell-rail-w-wide: 360px; --shell-topbar-h: 56px; --gutter: 16px; --gutter-lg: 24px; --tile-gap: 12px; --tile-min: 168px; --touch: 44px; --rail-item-h: 96px;`

---

## 2. Component tree + file plan

Existing:
- `NewsroomShell.tsx` (255) — **extract**, do not grow. It already owns the 3-col shell and section registry. Add `watch` as **default** section. Right rail is `LiveNewsRail` on `watch`, `DesktopLedgerRail` on `archive` / `sources`.
- `DesktopLedgerRail.tsx` — **keep**. Do not put metrics and a moving ticker in the same column on Watch (two jobs, two pages).
- `Feed.tsx` — **supersede as a primary nav item** (see Track D kill #1). Stories live in the rail. Keep the file as the "all stories" archive-of-headlines behind Archive, or delete in the same PR as Watch ships.
- `CreatorManager.tsx` / `CreatorSettings.tsx` — **extend** with `variant="panel"`. Stop being routes.

New files (each ≤300, Blueprint if >100):

```
apps/web/src/styles/tokens.css            ~80   EXTEND
apps/web/src/newsroom/NewsroomShell.tsx   ~140  REPLACE body (extract)
apps/web/src/shell/ShellTopBar.tsx        ~90   NEW
apps/web/src/shell/ShellNav.tsx           ~120  NEW
apps/web/src/shell/FormsPanel.tsx         ~160  NEW
apps/web/src/watch/WatchPage.tsx          ~180  NEW
apps/web/src/watch/CreatorRow.tsx         ~170  NEW
apps/web/src/watch/VideoTile.tsx          ~150  NEW
apps/web/src/watch/VideoTileSkeleton.tsx  ~50   NEW
apps/web/src/watch/WatchEmptyState.tsx    ~110  NEW
apps/web/src/rails/LiveNewsRail.tsx       ~220  NEW
apps/web/src/rails/NewsRailItem.tsx       ~100  NEW
apps/web/src/rails/usePrefersReducedMotion.ts  ~30  NEW
apps/web/src/feed/feedTypes.ts            ~90   NEW (shared with api)
apps/web/src/feed/httpFeedService.ts      ~80   NEW
```

`NewsroomShell` stays the owner of `section` and data loaders. Watch does not fetch on its own beyond pagination inside a row.

---

## 3–7. Implementation

### tokens (append)

```css
/* apps/web/src/styles/tokens.css — dark-first, WCAG 4.5:1 vs --bg-base */
:root {
  --bg-base: #0b0d10;
  --bg-elevated: #14181d;
  --bg-rail: #10141a;
  --bg-tile: #181d24;
  --fg-primary: #e8edf2;
  --fg-muted: #93a0b0;
  --fg-faint: #6b7785;
  --accent: #d4a017;
  --accent-dim: #8a6a10;
  --border: #243040;
  --focus: #7eb6ff;
  --danger: #e85d4c;
  --ok: #3dbe8c;
  --chip-black-owned: #e0b15b;
  --chip-public: #7eb6ff;
  --chip-state: #e85d4c;
  --chip-unknown: #6b7785;
  --shell-nav-w: 240px;
  --shell-nav-w-narrow: 200px;
  --shell-rail-w: 320px;
  --shell-rail-w-wide: 360px;
  --shell-topbar-h: 56px;
  --gutter: 16px;
  --gutter-lg: 24px;
  --tile-gap: 12px;
  --touch: 44px;
  --rail-item-h: 96px;
  --rise-ms: 700ms;
  --radius: 8px;
}
```

`#93a0b0` on `#0b0d10` is ~7:1. `#e8edf2` on `#0b0d10` is well above 4.5:1. Do not put `--fg-faint` on `--bg-base` for essential text.

---

### Data contract — `/api/feed` (F3)

Cursor, not offset. Server returns **only owner-enabled** creators and sources. Empty is 200 + empty arrays, never 404. No full text. No auto-enable.

```ts
/** apps/web/src/feed/feedTypes.ts
 * Shared with apps/api. IDs and roles only. Headline + snippet + linkout.
 */
export type Cursor = string; // opaque; server: base64url(isoPublishedAt + "|" + id)

export type FeedResponse = {
  generatedAt: string;       // ISO
  freshnessSeconds: number;  // age of oldest successful source fetch in this payload
  staleSourceIds: string[];  // enabled sources with lastSuccessAt older than 6h
  creators: CreatorRowPayload[];
  stories: StoryPage;
};

export type CreatorRowPayload = {
  creatorId: string;
  displayName: string;
  platform: "youtube" | "other";
  videos: VideoCard[];
  nextVideoCursor: Cursor | null;
};

export type VideoCard = {
  id: string;
  creatorId: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string | null; // publisher URL or first-party cache; never scraped page
  canonicalUrl: string;        // ALWAYS link out
  durationSeconds: number | null;
  platform: "youtube" | "other";
};

export type StoryPage = {
  items: StoryCard[];
  nextCursor: Cursor | null;
};

export type StoryCard = {
  id: string;
  sourceId: string;
  sourceName: string;
  ownership: string;  // controlled vocab, see Track C
  region: string;     // ISO 3166-1 alpha-2
  audience: string[]; // additive, may be empty
  headline: string;
  snippet: string;    // RSS description, tags stripped, <= 240 chars
  publishedAt: string;
  canonicalUrl: string;
};

export type FeedQuery = {
  storyCursor?: Cursor;
  storyLimit?: number;          // default 20, max 50
  videosPerCreator?: number;    // default 8, max 16
  creatorId?: string;           // row pagination
  videoCursor?: Cursor;
};
```

```ts
/** apps/web/src/feed/httpFeedService.ts */
import type { Cursor, FeedResponse, VideoCard } from "./feedTypes";

export async function getFeed(q: {
  storyCursor?: Cursor;
  creatorId?: string;
  videoCursor?: Cursor;
} = {}): Promise<FeedResponse> {
  const p = new URLSearchParams();
  if (q.storyCursor) p.set("storyCursor", q.storyCursor);
  if (q.creatorId) p.set("creatorId", q.creatorId);
  if (q.videoCursor) p.set("videoCursor", q.videoCursor);
  const res = await fetch(`/api/feed?${p.toString()}`, {
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error(`feed_${res.status}`);
  return res.json();
}

export async function getCreatorVideos(
  creatorId: string,
  videoCursor: Cursor
): Promise<{ videos: VideoCard[]; nextVideoCursor: Cursor | null }> {
  const feed = await getFeed({ creatorId, videoCursor });
  const row = feed.creators.find((c) => c.creatorId === creatorId);
  return { videos: row?.videos ?? [], nextVideoCursor: row?.nextVideoCursor ?? null };
}
```

Backend slice (shape only, for the implementer of F3): `GET /api/feed` reads enablement tables first; if none, return empty payload with `freshnessSeconds: 0`. Stories projected from the RSS ingest table as `{headline, snippet, canonicalUrl}` — **never** body. Videos from the YouTube Data API cache (Track C: this is the one non-RSS path that is viable), stored as metadata + canonical URL, not media.

---

### Shell (extracted, default section = watch)

```tsx
/**
 * Blueprint: NewsroomShell
 * Purpose: App chrome. Default section is watch (creator tiles + live rail).
 * Data: FeedResponse via StoryService/httpFeedService; section registry.
 * States: loading | ready | empty-disabled | error. Forms drawer open/closed.
 * Actions: navigate sections, toggle forms, toggle rail (mobile), open linkout.
 * Safety: default-off (empty is valid). No PII in UI. rss_headline_snippet_linkout.
 * Verification: 320px hamburger works; Tab never traps; rail unmounts on archive.
 */
import React, { useEffect, useState } from "styled-components";
import styled from "styled-components";
import { ShellTopBar } from "../shell/ShellTopBar";
import { ShellNav } from "../shell/ShellNav";
import { FormsPanel } from "../shell/FormsPanel";
import { WatchPage } from "../watch/WatchPage";
import { LiveNewsRail } from "../rails/LiveNewsRail";
import { DesktopLedgerRail } from "./DesktopLedgerRail";
import { Archive } from "./Archive";
import { getFeed } from "../feed/httpFeedService";
import type { FeedResponse } from "../feed/feedTypes";

type Section = "watch" | "sources" | "archive";

const Root = styled.div`
  min-height: 100vh;
  background: var(--bg-base, #0b0d10);
  color: var(--fg-primary, #e8edf2);
  display: grid;
  grid-template-rows: var(--shell-topbar-h, 56px) 1fr;
`;

const Body = styled.div<{ $forms: boolean }>`
  display: grid;
  grid-template-columns: 1fr;
  min-height: 0;
  @media (min-width: 1024px) {
    grid-template-columns:
      var(--shell-nav-w-narrow, 200px)
      minmax(0, 1fr)
      var(--shell-rail-w, 320px);
  }
  @media (min-width: 1440px) {
    grid-template-columns:
      var(--shell-nav-w, 240px)
      minmax(0, 1fr)
      var(--shell-rail-w, 320px);
  }
  @media (min-width: 1920px) {
    grid-template-columns:
      var(--shell-nav-w, 240px)
      minmax(0, 1fr)
      var(--shell-rail-w-wide, 360px);
  }
`;

const Main = styled.main`
  min-width: 0;
  overflow: auto;
  padding: var(--gutter, 16px);
  @media (min-width: 1440px) {
    padding: var(--gutter-lg, 24px);
  }
`;

const RailSlot = styled.aside<{ $open: boolean }>`
  background: var(--bg-rail, #10141a);
  border-left: 1px solid var(--border, #243040);
  min-height: 0;
  display: ${(p) => (p.$open ? "flex" : "none")};
  flex-direction: column;
  @media (max-width: 1023px) {
    position: fixed;
    inset: auto 0 0 0;
    height: 70vh;
    border-left: 0;
    border-top: 1px solid var(--border, #243040);
    z-index: 20;
    display: ${(p) => (p.$open ? "flex" : "none")};
  }
  @media (min-width: 1024px) {
    display: flex;
    position: static;
    height: auto;
  }
`;

export function NewsroomShell() {
  const [section, setSection] = useState<Section>("watch");
  const [formsOpen, setFormsOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(false); // mobile sheet; desktop always on
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getFeed()
      .then((f) => alive && setFeed(f))
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, []);

  const latestHeadline = feed?.stories.items[0]?.headline ?? null;

  return (
    <Root>
      <ShellTopBar
        section={section}
        onSection={setSection}
        onToggleForms={() => setFormsOpen((v) => !v)}
        onToggleRail={() => setRailOpen((v) => !v)}
        latestHeadline={latestHeadline}
        formsOpen={formsOpen}
        railOpen={railOpen}
      />
      <Body $forms={formsOpen}>
        <ShellNav
          section={section}
          onSection={setSection}
          formsOpen={formsOpen}
          onCloseForms={() => setFormsOpen(false)}
        >
          <FormsPanel open={formsOpen} onClose={() => setFormsOpen(false)} />
        </ShellNav>
        <Main id="main" tabIndex={-1}>
          {section === "watch" && (
            <WatchPage feed={feed} error={error} onOpenForms={() => setFormsOpen(true)} />
          )}
          {section === "archive" && <Archive />}
          {section === "sources" && <FormsPanel open forced />}
        </Main>
        <RailSlot
          $open={section === "watch" ? true : section !== "watch"}
          aria-label={section === "watch" ? "Live headlines" : "Ledger"}
        >
          {section === "watch" ? (
            <LiveNewsRail
              page={feed?.stories}
              staleSourceIds={feed?.staleSourceIds ?? []}
              mobileOpen={railOpen}
              onMobileClose={() => setRailOpen(false)}
            />
          ) : (
            <DesktopLedgerRail />
          )}
        </RailSlot>
      </Body>
    </Root>
  );
}
```

(Shell file above is the composition target — if imports push it over 300 after wiring saved/sources, split the `useEffect` into `useFeed.ts`. Do not leave `Feed.tsx` as a fourth section.)

---

### Top bar + mobile peek (48px, not a moving target)

```tsx
/** apps/web/src/shell/ShellTopBar.tsx */
import styled from "styled-components";

const Bar = styled.header`
  display: flex;
  align-items: center;
  gap: 8px;
  height: var(--shell-topbar-h, 56px);
  padding: 0 8px;
  background: var(--bg-elevated, #14181d);
  border-bottom: 1px solid var(--border, #243040);
`;

const IconBtn = styled.button`
  min-width: var(--touch, 44px);
  min-height: var(--touch, 44px);
  border: 0;
  background: transparent;
  color: var(--fg-primary, #e8edf2);
  cursor: pointer;
  &:focus-visible {
    outline: 2px solid var(--focus, #7eb6ff);
    outline-offset: 2px;
  }
  @media (min-width: 1024px) {
    &.mobile-only { display: none; }
  }
`;

const Peek = styled.button`
  display: none;
  @media (max-width: 1023px) {
    display: inline-flex;
    align-items: center;
    min-height: var(--touch, 44px);
    max-width: 46vw;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    background: transparent;
    border: 0;
    color: var(--fg-muted, #93a0b0);
    font-size: 13px;
    cursor: pointer;
  }
  &:focus-visible {
    outline: 2px solid var(--focus, #7eb6ff);
  }
`;

const Tabs = styled.nav`
  display: flex;
  gap: 4px;
  flex: 1;
`;

const Tab = styled.button<{ $on: boolean }>`
  min-height: var(--touch, 44px);
  padding: 0 12px;
  border: 0;
  background: transparent;
  color: ${(p) => (p.$on ? "var(--fg-primary, #e8edf2)" : "var(--fg-muted, #93a0b0)")};
  box-shadow: ${(p) => (p.$on ? "inset 0 -2px 0 var(--accent, #d4a017)" : "none")};
  cursor: pointer;
  &:focus-visible { outline: 2px solid var(--focus, #7eb6ff); }
`;

type S = "watch" | "sources" | "archive";

export function ShellTopBar(props: {
  section: S;
  onSection: (s: S) => void;
  onToggleForms: () => void;
  onToggleRail: () => void;
  latestHeadline: string | null;
  formsOpen: boolean;
  railOpen: boolean;
}) {
  return (
    <Bar>
      <IconBtn className="mobile-only" aria-expanded={props.formsOpen} aria-controls="forms-panel" onClick={props.onToggleForms}>
        Menu
      </IconBtn>
      <strong style={{ letterSpacing: "0.04em", fontSize: 14 }}>SWANGUARD</strong>
      <Tabs aria-label="Primary">
        {(["watch", "sources", "archive"] as const).map((s) => (
          <Tab key={s} $on={props.section === s} onClick={() => props.onSection(s)}>
            {s}
          </Tab>
        ))}
      </Tabs>
      <Peek onClick={props.onToggleRail} aria-expanded={props.railOpen}>
        {props.latestHeadline ? `↑ ${props.latestHeadline}` : "↑ Headlines"}
      </Peek>
    </Bar>
  );
}
```

---

### Forms-in-sidebar (not a cramped afterthought)

Pattern: nav column is 240px of *navigation + enablement list*. Clicking a creator opens a **360px overlay** that covers nav + 120px of main, browse stays visible on the right. On &lt;1024 the same panel is a full-height drawer. Inputs are 44px. Save is sticky at the bottom. `CreatorManager` / `CreatorSettings` get `variant="panel"` and drop page-level headings.

```tsx
/**
 * Blueprint: FormsPanel
 * Purpose: Host creator/source management beside Watch, not instead of it.
 * Data: existing creatorSettingsForm / httpCreatorService. Enablement only.
 * States: closed | creators | sources | editing(id). Never auto-enables.
 * Actions: enable/disable, edit, save. Close returns focus to the opener.
 * Safety: default-off. Absent seed row ≠ delete owner enablement (server rule).
 * Verification: focus trap while open on mobile; none on desktop overlay.
 */
import React, { useEffect, useRef } from "react";
import styled from "styled-components";
import { CreatorManager } from "../creators/CreatorManager";

const Overlay = styled.div<{ $open: boolean }>`
  display: ${(p) => (p.$open ? "flex" : "none")};
  flex-direction: column;
  background: var(--bg-elevated, #14181d);
  border-right: 1px solid var(--border, #243040);
  min-height: 0;
  @media (max-width: 1023px) {
    position: fixed;
    inset: var(--shell-topbar-h, 56px) 0 0 0;
    z-index: 30;
    width: 100%;
  }
  @media (min-width: 1024px) {
    position: sticky;
    top: 0;
    height: calc(100vh - var(--shell-topbar-h, 56px));
    width: 100%;
  }
`;

const Wide = styled.div`
  @media (min-width: 1024px) {
    position: absolute;
    top: 0;
    left: 0;
    width: 360px;
    height: 100%;
    z-index: 5;
    background: var(--bg-elevated, #14181d);
    border-right: 1px solid var(--border, #243040);
    display: flex;
    flex-direction: column;
  }
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  min-height: var(--touch, 44px);
  padding: 0 12px;
  border-bottom: 1px solid var(--border, #243040);
`;

const Close = styled.button`
  min-width: var(--touch, 44px);
  min-height: var(--touch, 44px);
  margin-left: auto;
  border: 0;
  background: transparent;
  color: var(--fg-primary, #e8edf2);
  cursor: pointer;
  &:focus-visible { outline: 2px solid var(--focus, #7eb6ff); }
`;

const Scroll = styled.div`
  overflow: auto;
  flex: 1;
  padding: 12px;
`;

export function FormsPanel(props: { open: boolean; onClose?: () => void; forced?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const show = props.forced || props.open;
  useEffect(() => {
    if (show) ref.current?.querySelector<HTMLElement>("button, [href], input")?.focus();
  }, [show]);
  if (!show) return null;
  const inner = (
    <>
      <Head>
        <span>Manage</span>
        {!props.forced && (
          <Close onClick={props.onClose} aria-label="Close manage panel">
            Close
          </Close>
        )}
      </Head>
      <Scroll>
        <CreatorManager variant="panel" />
      </Scroll>
    </>
  );
  return props.forced ? (
    <Overlay $open id="forms-panel">{inner}</Overlay>
  ) : (
    <Wide id="forms-panel" role="dialog" aria-label="Manage creators and sources" ref={ref}>
      {inner}
    </Wide>
  );
}
```

`CreatorManager` change (not a rewrite): accept `variant?: "page" | "panel"`. In panel mode, one accordion section open at a time, 44px list rows (name + dormant/enabled toggle only). Full settings open in the same panel, not a new route.

---

### Watch page + row + tile

```tsx
/**
 * Blueprint: WatchPage
 * Purpose: Main page. Rows of creator video tiles. Link-out only.
 * Data: FeedResponse.creators (enabled only). Empty if none enabled.
 * States: loading skeletons | empty-disabled | ready | error.
 * Actions: open forms, paginate a row, activate tile (new tab).
 * Safety: no inline player. No auto-enable CTA that enables without a tap.
 * Verification: 320 shows 1 tile/row; keyboard 2-D nav in CreatorRow.
 */
import styled from "styled-components";
import { CreatorRow } from "./CreatorRow";
import { WatchEmptyState } from "./WatchEmptyState";
import { VideoTileSkeleton } from "./VideoTileSkeleton";
import type { FeedResponse } from "../feed/feedTypes";

const Wrap = styled.div`
  max-width: 1440px;
  margin: 0 auto;
`;

const Err = styled.p`
  color: var(--danger, #e85d4c);
  min-height: var(--touch, 44px);
`;

export function WatchPage(props: {
  feed: FeedResponse | null;
  error: string | null;
  onOpenForms: () => void;
}) {
  if (props.error) return <Err role="alert">Feed unavailable. {props.error}</Err>;
  if (!props.feed) {
    return (
      <Wrap aria-busy="true" aria-label="Loading watch">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: 24 }}>
            {Array.from({ length: 4 }, (__, j) => (
              <VideoTileSkeleton key={j} />
            ))}
          </div>
        ))}
      </Wrap>
    );
  }
  if (props.feed.creators.length === 0) {
    return <WatchEmptyState onOpenForms={props.onOpenForms} />;
  }
  return (
    <Wrap>
      {props.feed.creators.map((row, i) => (
        <CreatorRow key={row.creatorId} row={row} rowIndex={i} />
      ))}
    </Wrap>
  );
}
```

```tsx
/** apps/web/src/watch/WatchEmptyState.tsx */
import styled from "styled-components";

const Box = styled.section`
  max-width: 520px;
  padding: 24px 8px;
`;
const H = styled.h1`
  font-size: 22px;
  font-weight: 600;
  margin: 0 0 8px;
`;
const P = styled.p`
  color: var(--fg-muted, #93a0b0);
  margin: 0 0 16px;
`;
const Btn = styled.button`
  min-height: var(--touch, 44px);
  padding: 0 16px;
  border: 1px solid var(--accent, #d4a017);
  background: transparent;
  color: var(--fg-primary, #e8edf2);
  cursor: pointer;
  &:focus-visible { outline: 2px solid var(--focus, #7eb6ff); }
`;

export function WatchEmptyState({ onOpenForms }: { onOpenForms: () => void }) {
  return (
    <Box>
      <H>Nothing is on yet</H>
      <P>
        51 creators and 39 sources are seeded and dormant. SwanGuard does not
        turn anything on for you. Enable a creator to fill this page; enable a
        source to fill the rail.
      </P>
      <Btn onClick={onOpenForms}>Enable creators and sources</Btn>
    </Box>
  );
}
```

```tsx
/**
 * Blueprint: CreatorRow
 * Purpose: One enabled creator. Horizontal 16:9 tiles + row-level pager.
 * Data: CreatorRowPayload. nextVideoCursor for "more".
 * States: ready | paging | end | row-error.
 * Actions: ArrowLeft/Right within row; ArrowUp/Down between rows (same index);
 *          Home/End; Enter follows the <a>.
 * Safety: link-out only. Does not fetch disabled creators.
 * Verification: Tab lands on each tile link; arrows do not trap at ends.
 */
import React, { useRef, useState } from "react";
import styled from "styled-components";
import { VideoTile } from "./VideoTile";
import { getCreatorVideos } from "../feed/httpFeedService";
import type { CreatorRowPayload, VideoCard } from "../feed/feedTypes";

const Section = styled.section`
  margin-bottom: 28px;
`;
const Label = styled.h2`
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 10px;
  min-height: var(--touch, 44px);
  display: flex;
  align-items: center;
`;
const Scroller = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(168px, 1fr);
  gap: var(--tile-gap, 12px);
  overflow-x: auto;
  padding-bottom: 4px;
  scroll-snap-type: x mandatory;
  @media (min-width: 768px) { grid-auto-columns: minmax(180px, 1fr); }
  @media (min-width: 1024px) { grid-auto-columns: minmax(190px, 22%); }
  @media (prefers-reduced-motion: reduce) { scroll-snap-type: none; }
`;
const More = styled.button`
  min-width: var(--touch, 44px);
  min-height: var(--touch, 44px);
  border: 1px solid var(--border, #243040);
  background: var(--bg-tile, #181d24);
  color: var(--fg-primary, #e8edf2);
  cursor: pointer;
  &:focus-visible { outline: 2px solid var(--focus, #7eb6ff); }
`;

export function CreatorRow(props: { row: CreatorRowPayload; rowIndex: number }) {
  const [videos, setVideos] = useState<VideoCard[]>(props.row.videos);
  const [cursor, setCursor] = useState(props.row.nextVideoCursor);
  const refs = useRef<(HTMLAnchorElement | null)[]>([]);

  function focusAt(i: number) {
    const next = Math.max(0, Math.min(i, refs.current.length - 1));
    refs.current[next]?.focus();
  }

  function onKey(e: React.KeyboardEvent, i: number) {
    if (e.key === "ArrowRight") { e.preventDefault(); focusAt(i + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); focusAt(i - 1); }
    if (e.key === "Home") { e.preventDefault(); focusAt(0); }
    if (e.key === "End") { e.preventDefault(); focusAt(videos.length - 1); }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const dir = e.key === "ArrowDown" ? 1 : -1;
      const target = document.querySelector<HTMLElement>(
        `[data-watch-row="${props.rowIndex + dir}"] [data-watch-col="${i}"]`
      );
      target?.focus();
    }
  }

  async function more() {
    if (!cursor) return;
    const page = await getCreatorVideos(props.row.creatorId, cursor);
    setVideos((v) => [...v, ...page.videos]);
    setCursor(page.nextVideoCursor);
  }

  return (
    <Section data-watch-row={props.rowIndex} aria-labelledby={`cr-${props.row.creatorId}`}>
      <Label id={`cr-${props.row.creatorId}`}>{props.row.displayName}</Label>
      <Scroller>
        {videos.map((v, i) => (
          <VideoTile
            key={v.id}
            video={v}
            col={i}
            row={props.rowIndex}
            onKeyDown={(e) => onKey(e, i)}
            ref={(el) => { refs.current[i] = el; }}
          />
        ))}
        {cursor && <More onClick={more}>More</More>}
      </Scroller>
    </Section>
  );
}
```

```tsx
/**
 * Blueprint: VideoTile
 * Purpose: 16:9 thumb + title. Looks watchable; legally a link-out.
 * Data: VideoCard. No media blob.
 * States: ready | missing-thumb | focus/hover lift.
 * Actions: open canonicalUrl in new tab. Keyboard via native <a> + row arrows.
 * Safety: rel=noopener noreferrer. No iframe. No preview play.
 * Verification: hit target >=44px tall; reduced-motion disables lift.
 */
import React, { forwardRef } from "react";
import styled from "styled-components";
import type { VideoCard } from "../feed/feedTypes";

const Card = styled.a`
  display: flex;
  flex-direction: column;
  min-height: var(--touch, 44px);
  color: inherit;
  text-decoration: none;
  scroll-snap-align: start;
  border-radius: var(--radius, 8px);
  background: var(--bg-tile, #181d24);
  &:focus-visible {
    outline: 2px solid var(--focus, #7eb6ff);
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: no-preference) {
    transition: transform 160ms ease;
    &:hover, &:focus-visible { transform: translate3d(0, -2px, 0); }
  }
`;
const Thumb = styled.div`
  position: relative;
  aspect-ratio: 16 / 9;
  background: var(--bg-elevated, #14181d);
  border-radius: var(--radius, 8px) var(--radius, 8px) 0 0;
  overflow: hidden;
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
`;
const Badge = styled.span`
  position: absolute;
  right: 8px;
  bottom: 8px;
  min-height: 24px;
  padding: 0 8px;
  font-size: 11px;
  background: var(--bg-base, #0b0d10);
  color: var(--fg-primary, #e8edf2);
`;
const Title = styled.span`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: var(--touch, 44px);
  padding: 8px 10px;
  font-size: 13px;
`;

export const VideoTile = forwardRef<
  HTMLAnchorElement,
  {
    video: VideoCard;
    col: number;
    row: number;
    onKeyDown: (e: React.KeyboardEvent) => void;
  }
>(function VideoTile({ video, col, row, onKeyDown }, ref) {
  return (
    <Card
      ref={ref}
      href={video.canonicalUrl}
      target="_blank"
      rel="noopener noreferrer"
      data-watch-col={col}
      data-watch-row={row}
      onKeyDown={onKeyDown}
    >
      <Thumb>
        {video.thumbnailUrl ? (
          <img src={video.thumbnailUrl} alt="" />
        ) : (
          <div style={{ width: "100%", height: "100%" }} />
        )}
        <Badge>Watch on {video.platform === "youtube" ? "YouTube" : "source"}</Badge>
      </Thumb>
      <Title>{video.title}</Title>
    </Card>
  );
});
```

```tsx
/** apps/web/src/watch/VideoTileSkeleton.tsx */
import styled, { keyframes } from "styled-components";

const pulse = keyframes`
  50% { opacity: 0.55; }
`;
const Bone = styled.div`
  aspect-ratio: 16 / 9;
  min-width: 168px;
  flex: 1;
  background: var(--bg-tile, #181d24);
  border-radius: var(--radius, 8px);
  @media (prefers-reduced-motion: no-preference) {
    animation: ${pulse} 1.2s ease-in-out infinite;
  }
`;
export function VideoTileSkeleton() {
  return <Bone aria-hidden />;
}
```

**Inline vs link-out:** nothing plays inline. The badge is the honest verb. Thumbnails are publisher URLs (YouTube `i.ytimg.com` via Data API metadata, not a scraped watch page).

---

### Upward news rail — event-driven Rise, not a marquee

A continuously moving focusable list is a defect (owner's words, and WCAG 2.2.2). Continuous motion is allowed only on an `aria-hidden` decorative layer; the real list must be static. That is two UIs. We do **one** UI: items sit still; when a story arrives it mounts at the bottom and the stack translates up. GPU: `transform` / `opacity` only. Pause on `:hover` and `:focus-within`. `prefers-reduced-motion`: no transition, new item appears at the top of a scrollable list.

Screen readers: the moving/transitioning list has `aria-live="off"`. A **separate** region `aria-live="polite"` updates at most every 30s with a count + latest headline. Never a live region that fires per tick.

```tsx
/** apps/web/src/rails/usePrefersReducedMotion.ts */
import { useEffect, useState } from "react";

export function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduce(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduce;
}
```

```tsx
/** apps/web/src/rails/NewsRailItem.tsx */
import styled from "styled-components";
import type { StoryCard } from "../feed/feedTypes";

const Item = styled.li`
  min-height: var(--rail-item-h, 96px);
  padding: 8px 10px 8px 14px;
  border-bottom: 1px solid var(--border, #243040);
`;
const Link = styled.a`
  display: block;
  min-height: var(--touch, 44px);
  color: var(--fg-primary, #e8edf2);
  text-decoration: none;
  &:focus-visible { outline: 2px solid var(--focus, #7eb6ff); outline-offset: 2px; }
`;
const Kicker = styled.div`
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: var(--fg-muted, #93a0b0);
  margin-bottom: 4px;
`;
const Chip = styled.span<{ $own: string }>`
  color: ${(p) =>
    p.$own === "black-owned" || p.$own === "black-led-nonprofit"
      ? "var(--chip-black-owned, #e0b15b)"
      : p.$own === "state-affiliated"
      ? "var(--chip-state, #e85d4c)"
      : p.$own === "public-broadcaster"
      ? "var(--chip-public, #7eb6ff)"
      : "var(--chip-unknown, #6b7785)"};
`;
const Snip = styled.p`
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--fg-muted, #93a0b0);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

export function NewsRailItem({ story }: { story: StoryCard }) {
  return (
    <Item>
      <Kicker>
        <Chip $own={story.ownership}>{story.ownership}</Chip>
        <span>{story.region}</span>
        <span>{story.sourceName}</span>
      </Kicker>
      <Link href={story.canonicalUrl} target="_blank" rel="noopener noreferrer">
        {story.headline}
      </Link>
      <Snip>{story.snippet}</Snip>
    </Item>
  );
}
```

```tsx
/**
 * Blueprint: LiveNewsRail
 * Purpose: Vertical rail. New stories rise from the bottom toward the top.
 * Data: StoryPage + staleSourceIds. Headline + snippet + linkout only.
 * States: empty | ready | paused (hover/focus) | reduced-motion | stale.
 * Actions: follow linkout, load older (appends below, no animation), pause.
 * Safety: aria-live is a sibling, throttled 30s. No full text. No focus steal.
 * Verification: hover/focus-within sets animation-play-state equivalent
 *   (we disable the transform transition). Reduced-motion = static list.
 */
import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { NewsRailItem } from "./NewsRailItem";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import { getFeed } from "../feed/httpFeedService";
import type { StoryCard, StoryPage } from "../feed/feedTypes";

const Head = styled.header`
  display: flex;
  align-items: center;
  min-height: var(--touch, 44px);
  padding: 0 12px;
  border-bottom: 1px solid var(--border, #243040);
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;
const Hair = styled.div<{ $on: boolean }>`
  position: absolute;
  left: 0;
  top: 0;
  width: 2px;
  height: 100%;
  background: var(--accent, #d4a017);
  transform-origin: bottom;
  transform: scaleY(${(p) => (p.$on ? 1 : 0)});
  @media (prefers-reduced-motion: no-preference) {
    transition: transform var(--rise-ms, 700ms) cubic-bezier(0.22, 1, 0.36, 1);
  }
`;
const Frame = styled.div`
  position: relative;
  flex: 1;
  overflow: hidden;
  &:hover, &:focus-within { /* pause signal consumed in JS */ }
  @media (prefers-reduced-motion: reduce) {
    overflow: auto;
  }
`;
const Track = styled.ol<{ $shift: number; $animate: boolean }>`
  list-style: none;
  margin: 0;
  padding: 0;
  transform: translate3d(0, ${(p) => p.$shift}px, 0);
  transition: ${(p) =>
    p.$animate ? "transform var(--rise-ms, 700ms) cubic-bezier(0.22, 1, 0.36, 1)" : "none"};
  will-change: transform;
`;
const Live = styled.div`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
`;
const Empty = styled.p`
  padding: 12px;
  color: var(--fg-muted, #93a0b0);
`;

const ITEM = 96;
const MAX = 12;
const LIVE_MS = 30_000;

export function LiveNewsRail(props: {
  page?: StoryPage;
  staleSourceIds: string[];
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const reduce = usePrefersReducedMotion();
  const [items, setItems] = useState<StoryCard[]>(props.page?.items ?? []);
  const [shift, setShift] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [paused, setPaused] = useState(false);
  const [liveText, setLiveText] = useState("");
  const lastLive = useRef(0);
  const known = useRef(new Set((props.page?.items ?? []).map((s) => s.id)));

  useEffect(() => {
    const incoming = props.page?.items ?? [];
    const fresh = incoming.filter((s) => !known.current.has(s.id));
    if (fresh.length === 0) {
      if (items.length === 0 && incoming.length) setItems(incoming.slice(0, MAX));
      return;
    }
    fresh.forEach((s) => known.current.add(s.id));
    if (reduce || paused) {
      setItems((cur) => [...fresh, ...cur].slice(0, MAX));
    } else {
      setAnimate(true);
      setShift(fresh.length * ITEM);
      setItems((cur) => [...cur, ...fresh].slice(-MAX));
      window.setTimeout(() => {
        setAnimate(false);
        setShift(0);
        setItems((cur) => cur.slice(-MAX));
      }, 720);
    }
    const now = Date.now();
    if (now - lastLive.current > LIVE_MS) {
      lastLive.current = now;
      setLiveText(
        `${fresh.length} new stor${fresh.length === 1 ? "y" : "ies"}. Latest: ${fresh[0].headline}`
      );
    }
  }, [props.page, reduce, paused]); // eslint: items omitted on purpose

  async function older() {
    if (!props.page?.nextCursor) return;
    const more = await getFeed({ storyCursor: props.page.nextCursor });
    setItems((cur) => [...cur, ...more.stories.items]);
  }

  return (
    <>
      <Head>
        Live · rising
        {props.staleSourceIds.length > 0 && (
          <span style={{ marginLeft: 8, color: "var(--danger, #e85d4c)" }}>
            {props.staleSourceIds.length} stale
          </span>
        )}
      </Head>
      <Frame
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <Hair $on={animate && !reduce} aria-hidden />
        {items.length === 0 ? (
          <Empty>No enabled sources. Enable one to fill this rail.</Empty>
        ) : (
          <Track $shift={reduce ? 0 : -shift} $animate={animate && !reduce && !paused}>
            {items.map((s) => (
              <NewsRailItem key={s.id} story={s} />
            ))}
          </Track>
        )}
      </Frame>
      {props.page?.nextCursor && (
        <button
          type="button"
          onClick={older}
          style={{ minHeight: 44, background: "transparent", color: "inherit", border: 0 }}
        >
          Older headlines
        </button>
      )}
      <Live aria-live="polite" aria-atomic="true">
        {liveText}
      </Live>
    </>
  );
}
```

Polling for new stories belongs in `httpFeedService` / a `useFeedPoll` hook (15–30s, paused when `document.hidden` or reduced-motion user has not asked for live). Not shown to stay under the line ceiling; it only calls `getFeed()` and passes a new `page` in.

**Keyboard:** items are real links in document order. Focus-within pauses the shift so the target does not move under the caret. No roving tabindex that steals focus from the grid. Tab from the last rail link goes to the browser chrome, not back into a loop.

---

### Signature visual

**The Rise** — 2px `--accent` hairline `scaleY` from the bottom of the rail, timed with the stack's `translate3d`. The Watch grid does not move. Memorable because the rest of the product is still; the only thing that ever animates is a verified, enabled, link-out headline arriving. Specific to SwanGuard, not a reskin.

---

# TRACK D — Absence-first (priority after B)

Not a grade of what exists. What a product of this kind **must have and does not**.

## Ranked by value left on the table

| rank | missing entirely | why the hole is expensive |
|---|---|---|
| 1 | **First-run enablement** | 51+39 dormant. Default-off without a guided "pick N, tap enable" makes the main page look broken. Highest value because it unlocks every other surface. |
| 2 | **Watch surface + `GET /api/feed`** | Creators are forms. There is no place to see their work. This *is* the product the owner asked for. F3 is not optional chrome. |
| 3 | **Source health / stale / withdrawal** | A civic rail that shows a dead feed or a pulled headline as if it were live is worse than empty. No `lastSuccessAt`, no tombstone, no "publisher withdrew". |
| 4 | **Provenance on the glass** | `ownership` and `region` exist in the seed and are invisible in the UI. The differentiator of this product is *who is speaking*. Currently unused. |
| 5 | **Alerting** | A monitor you must stare at is a dashboard, not a guard. "This creator posted" / "this term hit this source" does not exist. |
| 6 | **Mix / balance transparency** | No "what am I looking at" breakdown (region, ownership, audience). Without it the rail can silently skew and nobody can audit it. |
| 7 | **Search** | No search across headlines, snippets, creator names, source names. Unusable past ~20 enabled items. |
| 8 | **Seen / read state that means something** | `saved` is loaded; there is no read/unread, no "seen this video", no resume-row. |
| 9 | **Ingest observability for the owner** | Parse failures, 403/404 on a feed, charset disasters — no owner-facing health. The backup workstream already taught this lesson. |
| 10 | **Export / audit log of enablement** | Which sources were on when a claim was seen. Civic use needs a paper trail. IDs only. |
| 11 | **Citation share** | Copy `headline — source — URL — fetchedAt`. Not republication; a citation. Missing. |
| 12 | **Accessibility as a stated bar** | No skip link, no documented live-region policy, no reduced-motion policy (Track B now specifies one). |
| 13 | **Offline / PWA** | Phone-checked product with zero offline cache of already-fetched headlines. |
| 14 | **Moderation / abuse** | Fine if truly single-owner. A trap if a second login appears without it. |
| 15 | **Multi-user ACL** | Not needed until it is. Do not build it. |

Onboarding, search, alerts, saved/read, sharing, moderation, provenance, bias transparency, offline, export, a11y, observability, stale/pull — all absent except a stub of `saved` and raw seed fields for ownership/region.

## Three to build next (order)

1. **First-run enablement (default-off intact).** A 3-step panel in `FormsPanel`: pick creators (checkbox list, 44px rows, none pre-checked) → pick sources (same, grouped by the Track C taxonomy) → "Turn on these N". Empty Watch and empty rail both CTA here. Acceptance: a new owner sees a working page only after explicit taps; seed remains dormant for everyone else.
2. **Watch + `GET /api/feed` as specified in Track B.** Including cursor pagination, enabled-only filter, story rail payload, YouTube metadata for tiles. This is F3 + the frontend above.
3. **Source health + provenance chips.** `lastSuccessAt`, stale after 6h, 404/410 marks the source `broken` (does not delete owner enablement — absent ≠ erase). Withdrawal: if a GUID disappears from a feed, persist a tombstone `{id, withdrawnAt, lastHeadline}` and render "Withdrawn by publisher" instead of the link. Chips use `ownership` / `region` / `audience` on every rail item (already in `NewsRailItem`).

## Three to kill

1. **`Feed.tsx` as a primary destination.** It competes with Watch+Rail and splits the main ask. Headlines live in the rail; a full list belongs under Archive. Shipping both is two products.
2. **Non-RSS aggregator APIs** (NewsAPI, GNews, Mediastack, unofficial Google News RSS). See Track C. They will hurt him — ToS, double-hop copyright, feeds that vanish, paid tiers that still are not a publisher license. Kill the "way more APIs" exploration this quarter.
3. **Entertainment ranking / autoplay / billboard hero.** If it is on a whiteboard, erase it. It fights `rss_headline_snippet_linkout`, default-off, and civic framing. Also kill any plan that auto-enables "popular" sources to avoid an empty first run — that is a default-off violation dressed as UX.

---

# TRACK C — sources + taxonomy

**Rule applied:** if I cannot assert a live public RSS URL, it is marked `[UNVERIFIED]` and is **not** in the paste-ready seed. Terms URLs that I have not fetched are `[UNVERIFIED]` in the table; the JSON still carries the conventional terms path so the owner can `curl -I` before merge. Ingest must skip 404/non-XML and must not scrape the homepage.

Owner said "Roots" — treated as **The Root**, not Ancestry. The Root's historical feed is `https://www.theroot.com/rss`. Post-G/O ownership change: **[UNVERIFIED] liveness**. Not in the seed until `curl -I` returns XML.

## Taxonomy upgrade (additive — no migration, no break)

Keep `region` as ISO 3166-1 alpha-2 and `ownership` as a string so today's 39 rows still parse. Tighten the *vocabulary* and add optional fields the parser ignores if absent:

```ts
/** additive. old rows remain valid. */
export const OWNERSHIP = [
  "black-owned",
  "black-led-nonprofit",
  "independent",
  "family-owned",
  "public-broadcaster",
  "state-affiliated",
  "publicly-traded",
  "private-equity",
  "cooperative",
  "unknown",
] as const;

export const AUDIENCE = [
  "general",
  "black",
  "african-diaspora",
  "caribbean",
  "indigenous",
  "business",
  "world",
] as const;

// region: still "US" | "ZA" | "IE" | ... (ISO 3166-1 alpha-2)
// locale?: BCP-47 ("en-JM", "en-ZA") — do not overload region
// regions?: alpha-2[] — only for genuinely transnational desks (e.g. BBC World)
```

**Ownership ≠ audience.** Essence can be `black-owned` + audience `black`. Andscape would be `publicly-traded` (Disney) + audience `black` — and is **not** in the seed below because I will not launder Disney as Black-owned. The Root, if added later, is `private-equity` or `unknown` + audience `black`, never `black-owned` without evidence.

Filter/balance/audit later via these fields without a migration: `WHERE ownership = ANY($1) AND region = ANY($2) AND audience && $3`.

`sourceClass` stay as now (`newspaper | magazine | public-broadcaster | digital | wire | consortium`).

---

## Beyond RSS — honest, mostly no

| path | viable? | why |
|---|---|---|
| Publisher's own public RSS | **yes** | the legal posture |
| YouTube Data API (creator tiles only) | **yes, required for B** | official, quota'd, metadata + canonical URL, no rehost. Cache IDs/titles/thumbs/URLs. Not a news ingest. |
| Podcast RSS | yes | already RSS |
| NewsAPI.org / GNews / Mediastack / Currents | **no** | aggregator license, storage limits on free tiers, you do not have the publisher's permission, they vanish, you inherit their omissions as if they were yours |
| Unofficial Google News RSS | **no** | undocumented, breaks, ToS gray, not the publisher's feed |
| X / Facebook / Instagram / TikTok | **no** | paid or forbidden, not RSS, scraping banned by constraint 1 |
| Lexis / ProQuest / Meltwater | **no** | paid, republication terms, wrong posture |
| Apple News / SmartNews partner APIs | **no** | partnership, not public |
| Scraping sites without RSS | **no** | constraint 1, discarded unread |
| Official gov/open RSS (gazettes, court) | maybe later | civic-relevant, public, but not the owner's ask this round |

**Recommend against anything that is not the publisher's own public feed or the YouTube Data API for the watch tiles.** That is the trap list. "Way more APIs" is how this product inherits a ToS it cannot see.

---

## Verification table (do not skip)

Black-owned / Black-audience — **in seed** (conventional WordPress or documented RSS; still `curl -I` on merge):

| id | ownership (honest) | audience | feed pattern | terms | notes |
|---|---|---|---|---|---|
| black-enterprise | black-owned | black, business | `/feed/` | [UNVERIFIED] path | owner-named |
| thegrio | unknown | black | `/feed/` | [UNVERIFIED] | do not mark Black-owned; eOne/Hasbro history [UNVERIFIED current] |
| amsterdam-news | black-owned | black | `/feed/` | [UNVERIFIED] | NY Amsterdam News |
| the-afro | black-owned | black | `/feed/` | [UNVERIFIED] | Afro-American Newspapers |
| capital-b | black-led-nonprofit | black | `/feed/` | [UNVERIFIED] | |
| word-in-black | black-led-nonprofit | black | `/feed/` | [UNVERIFIED] | consortium of Black newsrooms |
| blackpressusa | black-led-nonprofit | black | `/feed/` | [UNVERIFIED] | NNPA |
| essence | black-owned | black | `/feed/` | [UNVERIFIED] | Essence Ventures 2018+ [UNVERIFIED still] |
| blavity | black-owned | black | `/feed/` | [UNVERIFIED] | |
| madamenoire | unknown | black | `/feed/` | [UNVERIFIED] | |
| newsone | publicly-traded | black | `/feed/` | [UNVERIFIED] | Urban One |
| colorlines | unknown | black | `/feed/` | [UNVERIFIED] | Race Forward |
| black-wall-street-times | black-owned | black | `/feed/` | [UNVERIFIED] | |
| haitian-times | black-owned | caribbean, black | `/feed/` | [UNVERIFIED] | |
| okayafrica | unknown | african-diaspora | `/feed/` | [UNVERIFIED] | do not mark Black-owned |
| atlanta-voice | black-owned | black | `/feed/` | [UNVERIFIED] | |
| st-louis-american | black-owned | black | `/search/?f=rss` **[UNVERIFIED]** | — | **omitted from JSON** until feed confirmed |
| philly-tribune | black-owned | black | feed **[UNVERIFIED]** | — | omitted |
| chicago-defender | black-owned | black | feed **[UNVERIFIED]** | — | omitted |
| the-root | unknown / private-equity | black | `theroot.com/rss` **[UNVERIFIED]** | — | omitted (owner-named; do not ship dark) |
| andscape | publicly-traded | black | `/feed/` possible | — | omitted; Disney, not Black-owned; easy to mis-chip |
| shade-room | unknown | black | no public RSS **[UNVERIFIED]** | — | omitted, constraint 1 |

English-language international — **in seed** (documented public RSS, editorial reason, not flag-collecting):

| id | region | why |
|---|---|---|
| daily-maverick | ZA | best independent EN investigative in southern Africa |
| mail-guardian | ZA | long-form EN, courts and politics |
| africanews-en | CG | continental EN wire (Euronews family — ownership `publicly-traded`, not African-owned) |
| african-arguments | GB | EN analysis from African authors; desk in GB |
| premium-times | NG | EN investigative, West Africa gap |
| nation-africa | KE | East African daily EN [feed path documented historically; still curl] |
| jamaica-gleaner | JM | Caribbean paper of record, EN |
| stabroek-news | GY | Guyana/Caribbean EN, strong courts |
| rte-news | IE | Irish public broadcaster EN |
| thejournal-ie | IE | independent EN digital Ireland |
| abc-news-au | AU | Oceania public EN |
| rnz-national | NZ | NZ public EN |
| guardian-au | AU | EN Oceania desk (Guardian; ownership `independent` of Scott Trust — not News Corp) |
| dawn | PK | South Asia EN paper of record |
| rappler | PH | SE Asia EN, accountability |
| cna | SG | SE Asia EN public-ish (Mediacorp — `state-affiliated`, chip it) |
| the-diplomat | US | Indo-Pacific EN; region US desk, audience world — include because the hole is SE/SA coverage, not another US general |

Already have GB/DE/FR/IN/JP/QA/CA/US — I am not adding BBC/Guardian/Al Jazeera/DW duplicates. If those IDs are not already in the 39, say so in review; I will not double-seed [UNVERIFIED against the 39].

---

## Paste-ready JSON

All dormant on ingest (default-off is owner data, not a seed flag). Parser shape preserved. Additive keys `audience` and `locale` are ignored by old parsers.

```json
[
  {
    "id": "black-enterprise",
    "name": "Black Enterprise",
    "feedUrl": "https://www.blackenterprise.com/feed/",
    "siteUrl": "https://www.blackenterprise.com/",
    "termsUrl": "https://www.blackenterprise.com/terms-of-use/",
    "sourceClass": "magazine",
    "ownership": "black-owned",
    "region": "US",
    "audience": ["black", "business"],
    "locale": "en-US"
  },
  {
    "id": "thegrio",
    "name": "TheGrio",
    "feedUrl": "https://thegrio.com/feed/",
    "siteUrl": "https://thegrio.com/",
    "termsUrl": "https://thegrio.com/terms-of-use/",
    "sourceClass": "digital",
    "ownership": "unknown",
    "region": "US",
    "audience": ["black"],
    "locale": "en-US"
  },
  {
    "id": "amsterdam-news",
    "name": "New York Amsterdam News",
    "feedUrl": "https://amsterdamnews.com/feed/",
    "siteUrl": "https://amsterdamnews.com/",
    "termsUrl": "https://amsterdamnews.com/terms-of-use/",
    "sourceClass": "newspaper",
    "ownership": "black-owned",
    "region": "US",
    "audience": ["black"],
    "locale": "en-US"
  },
  {
    "id": "the-afro",
    "name": "The Afro-American",
    "feedUrl": "https://afro.com/feed/",
    "siteUrl": "https://afro.com/",
    "termsUrl": "https://afro.com/terms-of-use/",
    "sourceClass": "newspaper",
    "ownership": "black-owned",
    "region": "US",
    "audience": ["black"],
    "locale": "en-US"
  },
  {
    "id": "capital-b",
    "name": "Capital B",
    "feedUrl": "https://capitalbnews.org/feed/",
    "siteUrl": "https://capitalbnews.org/",
    "termsUrl": "https://capitalbnews.org/terms-of-service/",
    "sourceClass": "digital",
    "ownership": "black-led-nonprofit",
    "region": "US",
    "audience": ["black"],
    "locale": "en-US"
  },
  {
    "id": "word-in-black",
    "name": "Word In Black",
    "feedUrl": "https://wordinblack.com/feed/",
    "siteUrl": "https://wordinblack.com/",
    "termsUrl": "https://wordinblack.com/terms-of-use/",
    "sourceClass": "consortium",
    "ownership": "black-led-nonprofit",
    "region": "US",
    "audience": ["black"],
    "locale": "en-US"
  },
  {
    "id": "blackpressusa",
    "name": "BlackPressUSA",
    "feedUrl": "https://blackpressusa.com/feed/",
    "siteUrl": "https://blackpressusa.com/",
    "termsUrl": "https://blackpressusa.com/terms-of-use/",
    "sourceClass": "consortium",
    "ownership": "black-led-nonprofit",
    "region": "US",
    "audience": ["black"],
    "locale": "en-US"
  },
  {
    "id": "essence",
    "name": "Essence",
    "feedUrl": "https://www.essence.com/feed/",
    "siteUrl": "https://www.essence.com/",
    "termsUrl": "https://www.essence.com/terms-of-use/",
    "sourceClass": "magazine",
    "ownership": "black-owned",
    "region": "US",
    "audience": ["black"],
    "locale": "en-US"
  },
  {
    "id": "blavity",
    "name": "Blavity",
    "feedUrl": "https://blavity.com/feed",
    "siteUrl": "https://blavity.com/",
    "termsUrl": "https://blavity.com/terms",
    "sourceClass": "digital",
    "ownership": "black-owned",
    "region": "US",
    "audience": ["black"],
    "locale": "en-US"
  },
  {
    "id": "madamenoire",
    "name": "MadameNoire",
    "feedUrl": "https://madamenoire.com/feed/",
    "siteUrl": "https://madamenoire.com/",
    "termsUrl": "https://madamenoire.com/terms-of-use/",
    "sourceClass": "digital",
    "ownership": "unknown",
    "region": "US",
    "audience": ["black"],
    "locale": "en-US"
  },
  {
    "id": "newsone",
    "name": "NewsOne",
    "feedUrl": "https://newsone.com/feed/",
    "siteUrl": "https://newsone.com/",
    "termsUrl": "https://newsone.com/terms-of-use/",
    "sourceClass": "digital",
    "ownership": "publicly-traded",
    "region": "US",
    "audience": ["black"],
    "locale": "en-US"
  },
  {
    "id": "colorlines",
    "name": "Colorlines",
    "feedUrl": "https://colorlines.com/feed/",
    "siteUrl": "https://colorlines.com/",
    "termsUrl": "https://colorlines.com/terms/",
    "sourceClass": "digital",
    "ownership": "unknown",
    "region": "US",
    "audience": ["black"],
    "locale": "en-US"
  },
  {
    "id": "black-wall-street-times",
    "name": "The Black Wall Street Times",
    "feedUrl": "https://theblackwallsttimes.com/feed/",
    "siteUrl": "https://theblackwallsttimes.com/",
    "termsUrl": "https://theblackwallsttimes.com/terms-of-use/",
    "sourceClass": "newspaper",
    "ownership": "black-owned",
    "region": "US",
    "audience": ["black"],
    "locale": "en-US"
  },
  {
    "id": "haitian-times",
    "name": "The Haitian Times",
    "feedUrl": "https://haitiantimes.com/feed/",
    "siteUrl": "https://haitiantimes.com/",
    "termsUrl": "https://haitiantimes.com/terms-of-use/",
    "sourceClass": "newspaper",
    "ownership": "black-owned",
    "region": "US",
    "audience": ["caribbean", "black"],
    "locale": "en-US"
  },
  {
    "id": "okayafrica",
    "name": "OkayAfrica",
    "feedUrl": "https://www.okayafrica.com/feed/",
    "siteUrl": "https://www.okayafrica.com/",
    "termsUrl": "https://www.okayafrica.com/terms/",
    "sourceClass": "digital",
    "ownership": "unknown",
    "region": "US",
    "audience": ["african-diaspora"],
    "locale": "en-US"
  },
  {
    "id": "atlanta-voice",
    "name": "The Atlanta Voice",
    "feedUrl": "https://theatlantavoice.com/feed/",
    "siteUrl": "https://theatlantavoice.com/",
    "termsUrl": "https://theatlantavoice.com/terms-of-use/",
    "sourceClass": "newspaper",
    "ownership": "black-owned",
    "region": "US",
    "audience": ["black"],
    "locale": "en-US"
  },
  {
    "id": "daily-maverick",
    "name": "Daily Maverick",
    "feedUrl": "https://www.dailymaverick.co.za/dmrss/",
    "siteUrl": "https://www.dailymaverick.co.za/",
    "termsUrl": "https://www.dailymaverick.co.za/terms-and-conditions/",
    "sourceClass": "digital",
    "ownership": "independent",
    "region": "ZA",
    "audience": ["general"],
    "locale": "en-ZA"
  },
  {
    "id": "mail-guardian",
    "name": "Mail & Guardian",
    "feedUrl": "https://mg.co.za/feed/",
    "siteUrl": "https://mg.co.za/",
    "termsUrl": "https://mg.co.za/privacy-policy/",
    "sourceClass": "newspaper",
    "ownership": "independent",
    "region": "ZA",
    "audience": ["general"],
    "locale": "en-ZA"
  },
  {
    "id": "africanews-en",
    "name": "Africanews English",
    "feedUrl": "https://www.africanews.com/feed/rss",
    "siteUrl": "https://www.africanews.com/",
    "termsUrl": "https://www.africanews.com/terms-and-conditions/",
    "sourceClass": "wire",
    "ownership": "publicly-traded",
    "region": "CG",
    "audience": ["general"],
    "locale": "en"
  },
  {
    "id": "african-arguments",
    "name": "African Arguments",
    "feedUrl": "https://africanarguments.org/feed/",
    "siteUrl": "https://africanarguments.org/",
    "termsUrl": "https://africanarguments.org/terms/",
    "sourceClass": "digital",
    "ownership": "independent",
    "region": "GB",
    "audience": ["world"],
    "locale": "en-GB"
  },
  {
    "id": "premium-times",
    "name": "Premium Times",
    "feedUrl": "https://www.premiumtimesng.com/feed",
    "siteUrl": "https://www.premiumtimesng.com/",
    "termsUrl": "https://www.premiumtimesng.com/terms-of-use",
    "sourceClass": "newspaper",
    "ownership": "independent",
    "region": "NG",
    "audience": ["general"],
    "locale": "en-NG"
  },
  {
    "id": "nation-africa",
    "name": "Nation Africa",
    "feedUrl": "https://nation.africa/service/rss/kenya/news/index.rss",
    "siteUrl": "https://nation.africa/",
    "termsUrl": "https://nation.africa/kenya/terms-of-use",
    "sourceClass": "newspaper",
    "ownership": "publicly-traded",
    "region": "KE",
    "audience": ["general"],
    "locale": "en-KE"
  },
  {
    "id": "jamaica-gleaner",
    "name": "The Gleaner",
    "feedUrl": "https://jamaica-gleaner.com/feed",
    "siteUrl": "https://jamaica-gleaner.com/",
    "termsUrl": "https://jamaica-gleaner.com/terms",
    "sourceClass": "newspaper",
    "ownership": "publicly-traded",
    "region": "JM",
    "audience": ["caribbean", "general"],
    "locale": "en-JM"
  },
  {
    "id": "stabroek-news",
    "name": "Stabroek News",
    "feedUrl": "https://www.stabroeknews.com/feed/",
    "siteUrl": "https://www.stabroeknews.com/",
    "termsUrl": "https://www.stabroeknews.com/terms-of-use/",
    "sourceClass": "newspaper",
    "ownership": "independent",
    "region": "GY",
    "audience": ["caribbean", "general"],
    "locale": "en-GY"
  },
  {
    "id": "rte-news",
    "name": "RTÉ News",
    "feedUrl": "https://www.rte.ie/news/rss/news-headlines.xml",
    "siteUrl": "https://www.rte.ie/news/",
    "termsUrl": "https://www.rte.ie/terms/",
    "sourceClass": "public-broadcaster",
    "ownership": "public-broadcaster",
    "region": "IE",
    "audience": ["general"],
    "locale": "en-IE"
  },
  {
    "id": "thejournal-ie",
    "name": "The Journal",
    "feedUrl": "https://www.thejournal.ie/feed/",
    "siteUrl": "https://www.thejournal.ie/",
    "termsUrl": "https://www.thejournal.ie/privacy-policy/",
    "sourceClass": "digital",
    "ownership": "independent",
    "region": "IE",
    "audience": ["general"],
    "locale": "en-IE"
  },
  {
    "id": "abc-news-au",
    "name": "ABC News Australia",
    "feedUrl": "https://www.abc.net.au/news/feed/51120/rss.xml",
    "siteUrl": "https://www.abc.net.au/news/",
    "termsUrl": "https://www.abc.net.au/conditions-of-use/",
    "sourceClass": "public-broadcaster",
    "ownership": "public-broadcaster",
    "region": "AU",
    "audience": ["general"],
    "locale": "en-AU"
  },
  {
    "id": "rnz-national",
    "name": "RNZ National",
    "feedUrl": "https://www.rnz.co.nz/rss/national.xml",
    "siteUrl": "https://www.rnz.co.nz/",
    "termsUrl": "https://www.rnz.co.nz/about/terms-of-use",
    "sourceClass": "public-broadcaster",
    "ownership": "public-broadcaster",
    "region": "NZ",
    "audience": ["general"],
    "locale": "en-NZ"
  },
  {
    "id": "guardian-au",
    "name": "Guardian Australia",
    "feedUrl": "https://www.theguardian.com/australia-news/rss",
    "siteUrl": "https://www.theguardian.com/au",
    "termsUrl": "https://www.theguardian.com/help/terms-of-service",
    "sourceClass": "newspaper",
    "ownership": "independent",
    "region": "AU",
    "audience": ["general"],
    "locale": "en-AU"
  },
  {
    "id": "dawn",
    "name": "Dawn",
    "feedUrl": "https://www.dawn.com/feeds/home",
    "siteUrl": "https://www.dawn.com/",
    "termsUrl": "https://www.dawn.com/terms-and-conditions",
    "sourceClass": "newspaper",
    "ownership": "independent",
    "region": "PK",
    "audience": ["general"],
    "locale": "en-PK"
  },
  {
    "id": "rappler",
    "name": "Rappler",
    "feedUrl": "https://www.rappler.com/feed/",
    "siteUrl": "https://www.rappler.com/",
    "termsUrl": "https://www.rappler.com/about/1183-terms-of-use/",
    "sourceClass": "digital",
    "ownership": "independent",
    "region": "PH",
    "audience": ["general"],
    "locale": "en-PH"
  },
  {
    "id": "cna",
    "name": "Channel News Asia",
    "feedUrl": "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml",
    "siteUrl": "https://www.channelnewsasia.com/",
    "termsUrl": "https://www.channelnewsasia.com/terms-and-conditions",
    "sourceClass": "public-broadcaster",
    "ownership": "state-affiliated",
    "region": "SG",
    "audience": ["general"],
    "locale": "en-SG"
  },
  {
    "id": "the-diplomat",
    "name": "The Diplomat",
    "feedUrl": "https://thediplomat.com/feed/",
    "siteUrl": "https://thediplomat.com/",
    "termsUrl": "https://thediplomat.com/terms-of-use/",
    "sourceClass": "magazine",
    "ownership": "independent",
    "region": "US",
    "audience": ["world"],
    "locale": "en-US"
  }
]
```

**Merge gate (do not skip):** for each row, `curl -sI "$feedUrl"` must be `200`/`301`/`302` and `Content-Type` matching XML/RSS/Atom. Failures stay out of the seed (constraint 1). A 404 is not "close enough." Removing a row later must not delete owner enablement (constraint 3).

`nation-africa` feed path and several `/terms-of-use/` URLs are **[UNVERIFIED]** at fetch time. CNA's `_format=xml` endpoint has been public; if it 401s, drop the row, do not scrape CNA HTML.

Irish Times, News24, The Continent, Loop Caribbean, Stuff.co.nz, Scroll.in, Bangkok Post, Jakarta Post: editorial value exists; public RSS **[UNVERIFIED]** this round — not in the seed.

---

# Cross-track wiring (so this can be built)

1. De-privilege `swanguard`, TOC-compare restores, sort restic by `.time` (Part 1).
2. Land tokens + `feedTypes` + empty Watch (default section) — page is honest on day one.
3. First-run enablement in `FormsPanel` (D1). Still nothing on until a tap.
4. F3 `GET /api/feed` + YouTube metadata for enabled creators only (B + D2).
5. `LiveNewsRail` + provenance chips + stale/tombstone (B + D3).
6. Append Track C JSON only after the curl gate. Never auto-enable the new rows.

That is the product the owner asked for twice, without becoming a Netflix clone and without violating `rss_headline_snippet_linkout` or default-off.
