# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (medium)
**Document:** docs/ai-workflow/AI-HANDOFF/SWANGUARD-KIMI-FEATURE-DESIGN-PACKET-4-2026-08-04.md
**Seed:** (none)
**Tokens:** 7295 in / 3010 out | **Cost:** ~$0.0670 | **Wall:** 107.7s | **finish_reason:** stop

---

# SwanGuard — Feature + Design Gap Analysis

## 1. Ranked gap table: vision vs. built

Ranked by **value-per-unit-effort**, where value is measured against the locked north star: *owner opens app, knows where he is, what to do, zero confusion, on his phone.*

| # | Vision says | Actually built | Gap severity | Effort | Value/Effort |
|---|---|---|---|---|---|
| 1 | "One primary feed you land on" | Feed tab exists but renders 100 Federal Register *documents* — not stories. One connector, no clustering, no kicker/locality population on live data | **Critical** — the app reads as a government-records dump, not a newsroom | M | ★★★★★ |
| 2 | Many real sources ("Idaho News", local stations, MSN-style breadth) | Exactly one connector; `listSources()` returns `DEMO_SOURCES` even in production path until wired | **Critical** — nothing else can exist without this | M | ★★★★★ |
| 3 | "Stop being confusing" — too many buttons, looks amateur | 3 tabs + gated console is *better* than the 14-module shell, but the Feed has no clear hierarchy (no lead, no grouping, no obvious affordance for what a card does) | **Critical** — stated #1 pain | M (design work, not infra) | ★★★★★ |
| 4 | Source spectrum + blindspot | Deliberately faked-off, `{left:0,center:1,right:0}` | High — but *correctly* off. Turning it on wrong is worse than off | L (depends on #2) | ★★★★ |
| 5 | Archive = "truth-vault + historical spine" | localStorage save/unsave only. No search, no notes UI, no records linking | High | M | ★★★★ |
| 6 | "Who owns/funds each source" on every line | `SourceRef.ownership` exists in type; nothing populates it for live sources | Medium — cheap metadata, high trust payoff | S | ★★★★★ |
| 7 | Contradictions flagged with both receipts | `ClaimRef` + `contradicts` schema exists; zero claims extracted from live data | Medium | L (needs extraction/clustering) | ★★★ |
| 8 | "Keep it real" disparity cards (Stanford Open Policing) | `disparity` field exists; nothing feeds it | Medium — a single curated dataset, not a pipeline | M | ★★★ |
| 9 | Records backing claims | Federal Register items ARE records — but nothing links them to outlet stories as corroboration | Medium | L | ★★★ |
| 10 | Safety Map, Ethical Market, News Analyst | Unbuilt | Out of scope for "usable now" — pillars 4–5 are post-usability | XL | ★ |

**Blunt summary:** the app has excellent *plumbing* (service boundary, connector control plane, honest schema) and almost no *newsroom*. Everything that makes it a news product — real outlets, clustering, spectrum, contradiction flags — is unbuilt. The right move is not to build pillars 2–5; it's to make pillar 1 real.

---

## 2. Source-expansion architecture: one connector → 50+ sources

**The abstraction already exists and is correct: `OfficialConnectorProviderClient` (a `fetchBatch()` returning normalized `OfficialConnectorFetchedItem[]`).** What's missing is that today's clients are *code-per-source*. The fix:

### The abstraction: **declarative connector manifests + two generic client factories**

Almost every target source is one of exactly two shapes:

1. **RSS/Atom feed** — the vast majority of news outlets, including virtually all local TV stations ("Idaho News"-class). One generic `createRssClient(manifest)` handles all of them.
2. **JSON list endpoint** — like the three existing ones (Federal Register, NWS, CPSC). One generic `createJsonListClient(manifest)` with a configurable items-path and field map handles most of the rest.

A **manifest** is pure data, roughly:

```typescript
interface ConnectorManifest {
  connectorKey: string;
  kind: 'rss' | 'json-list';
  url: string;
  itemsPath?: string;              // e.g. 'results' for FR-style payloads
  fieldMap: {                      // source field -> canonical StoryItem field
    externalId: string; title: string; summary?: string;
    url: string; publishedAt?: string;
  };
  headers?: Record<string, string>; // e.g. NWS user-agent
  sourceMeta: {                    // feeds SourceRef + the channel wall
    name: string; camp: Camp;      // camp from a *curated, cited* ratings table — never inferred
    group: SourceChannel['group'];
    ownership: string;             // curated, with citation
    locality?: string;
  };
  limits?: { maxItems?: number; maxResponseBytes?: number; timeoutMs?: number };
}
```

### Rules that make this scale honestly

- **New source = new manifest + contract test, not new client code.** The existing contract-gate/enable/kill-switch/quota/retention/provenance machinery is manifest-driven and untouched. Adding source #51 is a data entry plus a fixture-based contract test.
- **A bespoke client is the escape hatch, not the norm.** Reserved for sources whose auth, pagination, or payload shape genuinely doesn't fit (licensed wires if ever pursued). Expect <10% of sources to need one.
- **Fetch server-side only.** The existing `readCapped`/redirect-`error`/byte-cap discipline is the security posture; RSS widens the hostile-upstream surface (the code comment already anticipates this). RSS needs XML parsing server-side with a defused parser (no external entities — this is the one new dependency decision; pick a parser with XXE disabled by default or a minimal hand-rolled item extractor over the capped bytes).
- **Per-source fetch cadence from manifest**, so 50 sources ≠ 50 simultaneous fetches; quota and circuit-breaker per connectorKey already exist.
- **`camp` is curated metadata, never computed.** The bias rating for each outlet is a human-entered value **with a citation stored beside it** (defamation discipline: nothing labelled without a citation). Flag for verification: whose ratings methodology you'll cite — do not assert any specific third-party rating service's terms without checking them.
- **Free news-API aggregators (GDELT, Currents, GNews, NewsData.io): treat each as ONE connector** whose manifest fans out to many outlets upstream, not 50 connectors. GDELT is the strongest candidate for archival/analysis later. **Verify each one's licence, commercial-use terms, and rate limits before relying on any** — the research notes are plausible but unverified. RSS remains the zero-licence-risk backbone.

**Result:** 50+ sources ≈ 45–50 RSS manifests + a handful of JSON manifests + 0–3 bespoke clients + one contract-test harness parameterized over manifests.

---

## 3. Minimum honest mechanism for the bias/blindspot spectrum

The current refusal to fabricate is correct. The minimum honest on-switch, in dependency order:

1. **≥3 enabled independent outlets** (from §2) with curated `camp` values, each carrying its citation.
2. **Story clustering.** Minimum viable version, no ML: normalize title + published-day, cluster on **shared named entities + title-token overlap** above a threshold. This is fuzzy and *will* both over-merge and under-merge — so:
3. **Honesty in the type, not just the number.** The spectrum is computed **only over sources within a cluster**, and the UI must say so: *"3 of your enabled sources covered this story"* — never implying it's the whole media landscape. Blindspot is computed the same way (a camp with enabled sources but zero coverage in-cluster), and when clustering confidence is low, `blindspot: null` — same fail-closed posture as today, just moved up one level.
4. **User-triggered merge/split comes later** (News Analyst pillar). V1 accepts imperfect clusters and labels them "coverage among your sources."

**What is explicitly NOT required to turn it on:** AI extraction, claim status, contradiction detection, cross-outlet entity resolution beyond titles. Those enrich the spectrum later; they are not its precondition.

**Uncertainty:** title-token clustering quality on local news (where outlet titles diverge most) is unknown — build it against a recorded corpus of real feeds before enabling, and tune the threshold with owner-visible precision/recall on a sample. If clustering proves too weak, an intermediate honest step is: spectrum shown *per topic section* (e.g. "across Justice stories this week: 60% of your enabled left sources covered, 20% of right") rather than per story.

---

## 4. Design directions (mobile-first, buildable, React + styled-components, 44px targets, dark default)

### Direction A — "Front Page" (Ground News simplified, recommended default)

**Feed:** A single scroll. Slot 1 is a **lead card** (the `lead` field already exists): full-bleed tone block, kicker chip, title, one-line deck, and a *coverage chip* ("3 sources · L C R"). Below, stories grouped under max 3 section headers derived from kicker (e.g. *Justice · Economy · Health*), 4–6 compact cards each: kicker, title (2 lines max), source line with **ownership microcopy** ("via AP — nonprofit cooperative"), time. **One primary action per card: tap to open.** Save is a single persistent 44px bookmark icon, nothing else on the card. Tapping a story opens a **reader sheet** (bottom sheet on mobile, 85% height, drag-to-dismiss) with tabs: Story / Sources / Record. Back always returns to scroll position — the flow never dead-ends.

**Channel wall (Sources tab):** a grid of **large source tiles** (2-up on mobile), each: outlet name, camp chip (colored, with its citation on long-press/info), ownership line, locality, toggle. Toggles map 1:1 to `SourceChannel.enabled`; groups render as section headers (Local / Wire / Independent / Government / Protective orgs). Off-by-default posture preserved: tiles show "Off — enable in console" state rather than pretending content exists.

**Distinctiveness:** fewest concepts on screen (feed → story → back). Closest to the owner's verbatim pain fix.

### Direction B — "Spectrum-first"

Same lead card, but **every card's footer is a miniature spectrum bar** (three segments L/C/R sized by count, blindspot camp shown as a hatched empty segment). Feed sort toggle is a single segmented control at top: *Latest / Coverage gaps* (stories a camp is missing surface first). Sources tab identical wall, but tiles are grouped by camp column instead of group. The Ledger/sheet's default tab is Sources, not Story.

**Distinctiveness:** makes the credibility moat the visual identity — you can *see* the blindspot before reading anything. Risk: more visual noise; the spectrum bar must stay honest ("among your sources") to avoid overclaiming. Best second-phase evolution of A rather than a competitor to it.

### Direction C — "Local edition"

First-run asks one question: **state (and optionally metro)**. Feed becomes a front page with a **"Your area" rail** at top (horizontal scroll of local-outlet cards, Idaho-style stations), then the national feed below. Sources wall defaults to filtering by your state with a clear "All sources" toggle. Disparity cards (Stanford Open Policing) attach to the locality rail, sourced and dated.

**Distinctiveness:** directly serves the "keep it real" doctrine and the owner's local-station ask; locality is the filter, not a buried setting. Cost: requires enough local RSS manifests per state to not feel empty — gate it until ≥5 local sources for the user's state exist, else hide the rail (empty-state honesty, never fixtures).

**Recommendation:** build A now; A's card footer grows into B's spectrum bar once clustering lands (§3); C is a manifest-coverage threshold away and rides on both.

---

## 5. Build order

1. **RSS generic client + manifest registry + parameterized contract-test harness** (§2). Ship with 5–8 curated outlets across camps incl. 2–3 local stations. Everything else is blocked on this.
2. **Feed simplification pass (Direction A).** Lead card + sectioned compact cards + reader sheet + single bookmark action. This is the owner's #1 pain; do it on real RSS data, even pre-clustering.
3. **Populate `SourceRef.ownership` + camp citations everywhere** — cheap, immediate trust payoff, defamation-discipline compliant.
4. **Story clustering v1 (title/entity overlap) + per-cluster spectrum + honest blindspot** (§3), behind the same owner-enable gate; validate against a recorded corpus first.
5. **Archive upgrade:** real saved-list UI with search, notes, tags — it already writes the real schema; give it a real screen.
6. **Records linkage:** cross-reference Federal Register items against clustered stories as `RecordRef`s ("What the record says") — the FR connector finally becomes corroboration instead of the whole feed.
7. **Local rail (Direction C)** once per-state source coverage crosses threshold; disparity cards sourced from Stanford Open Policing alongside it.
8. **Only then** evaluate aggregator APIs (GDELT first, terms verified) for Archive depth, and pillar 2 (Analyst) entity/claim enrichment.

**Explicitly deferred:** Safety Map, Ethical Market, contradiction auto-detection, any AI analyst. The app feels complete when steps 1–5 ship; everything after is depth, not usability.
