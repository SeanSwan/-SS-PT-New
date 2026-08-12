---
decision: Add entity-intel connectors to SwanGuard via an OPERATOR-ASSISTED ingest (local residential collector → existing connector tables), with a free/official-first source ladder and a public-entity-only scope gate. Do NOT scrape from SwanGuard's server IP, and do NOT ship free-text person search.
status: open
supersedes: none
---

# SwanGuard — Entity Intel Connectors (X / YouTube / open networks)

**Sean's ask, restated sharply:** SwanGuard should let you name an entity — a
company, an agency, a public figure — and pull back what that entity has actually
published: their posts on X, their videos on YouTube, ideally more. He wants it
without funding X, and he was explicit that this is **benevolent** work and must
be legal and defensible.

**Verdict:** the goal is sound and fits SwanGuard's existing architecture almost
perfectly. Three gaps would have sunk it, and one of them is fatal-on-day-one.
All three have clean fixes.

---

## 1. The three gaps

### Gap A — FATAL: SwanGuard runs on a server, and servers get blocked

This is the one that would have killed the feature in production.

`[VERIFIED]` We learned this exact lesson today building `swan-scout`: hosted
transcript APIs exist *because YouTube blocks datacenter IPs*. Every major platform
does the same. Scraping logic that works perfectly on Sean's desktop will be
blocked, CAPTCHA'd, or fed poisoned data the moment it runs from SwanGuard's host.

**Fix — operator-assisted ingest.** Split collection from serving:

```
Sean's machine (residential IP)          SwanGuard (server)
┌───────────────────────────┐            ┌──────────────────────────────┐
│ swan-collect              │            │ POST /connectors/ingest      │
│  • official APIs first    │  signed    │  • owner-scoped auth         │
│  • yt-dlp / browser       │ ─────────► │  • manifest-validated        │
│  • normalizes to the      │  batch     │  • quota + retention + receipt│
│    EXISTING item shape    │            │  • existing kill switch      │
└───────────────────────────┘            └──────────────────────────────┘
```

Why this is the right shape and not a workaround:
- It **reuses every control already built** — `official_connector_states` /
  `_items` / `_sync_receipts`, quotas, retention checks, contract gating,
  owner-enabled-default-OFF, kill switches. Nothing new to secure.
- The server **never makes an outbound fetch to a social platform**, so the whole
  SSRF surface that packet 3 hardened stays exactly as it is.
- It matches the existing doctrine that **a source is DATA, not code** — the
  collector emits manifest-shaped items; the server does not learn about X.
- It degrades honestly: if Sean's collector hasn't run, the UI says *"last synced
  N hours ago"* rather than inventing freshness.

**New security surface it creates** (must be in the packet when this is reviewed):
the ingest endpoint accepts attacker-shaped data if the operator credential ever
leaks. It must be treated exactly like the syndication extractor — narrow
allowlisted fields, hard caps, no HTML passthrough, per-batch size limit, replay
protection, and items attributed to the collector identity in the receipt.

### Gap B — "search anybody and any person" collides with the newsroom's own doctrine

SwanGuard's stated discipline is *"nothing is labelled without a citation"* and
*"defamation discipline."* A free-text **person** search that aggregates
everything an individual ever posted is a materially different product from a
civic newsroom — it is a people-search / dossier tool. That category carries
privacy-tort, GDPR/CCPA, and harassment-facilitation exposure that the rest of
SwanGuard has been carefully engineered to avoid, and it would undercut the
credibility the citation discipline is buying.

**Fix — entity scope gate, allowlist by category.** A subject is searchable only
when it is one of:

| Category | Example | Why it is fair game |
|---|---|---|
| `organization` | a company, agency, nonprofit | Institutional speech |
| `official` | elected/appointed official, in-role | Accountability of public power |
| `brand_account` | a verified product/brand account | Commercial speech, Sean's stated use case |
| `public_figure` | requires a **citation** establishing public-figure status | Matches existing "no label without a citation" rule |

Everything else resolves to **no results, with a reason** — never a partial
dossier. This is the benevolence made mechanical rather than aspirational: the
product *cannot* be pointed at a private person, so it can't be misused by
someone who isn't Sean.

### Gap C — deleted content must actually disappear

If an entity deletes or corrects a post and SwanGuard keeps serving the original
as current, that is both an ethical failure for a newsroom and the likeliest route
to a real defamation claim — the one risk class this codebase already takes
seriously.

**Fix:** every item carries `last_seen_at`. A re-sync that no longer finds an item
marks it `retracted_at` and the UI renders it as *withdrawn by source*, retaining
the record for accountability but never presenting it as live. This pairs with the
existing `retention_expires_at` constraint rather than replacing it.

---

## 2. Verified facts that shape the source choice

**X / Twitter**
- `[VERIFIED]` X's API moved to pay-per-use with **no free tier for new signups**
  (~$0.005 per post read). Sean's refusal to fund it is therefore also the
  economically rational call for a bulk-read product.
- `[VERIFIED, with nuance]` In *X Corp. v. Bright Data* (N.D. Cal.), Judge Alsup
  dismissed **all** of X's claims — breach of contract, trespass, misappropriation,
  unjust enrichment, tortious interference — holding that federal copyright law
  preempted X's attempt to control publicly posted data, and warning that letting
  platforms control public data risks "information monopolies." Bright Data had
  already beaten Meta on similar ground.
  **The nuance matters:** a later ruling permitted X to *revive* part of that
  battle. So the accurate statement is **courts have been notably skeptical of
  platform anti-scraping claims over public data — but this is not settled law,
  and "public web scraping is not a crime" is not the same as "you have no
  exposure."** Treat ToS breach as a real civil risk, distinct from criminality.

**YouTube — better news than Sean expected**
- `[VERIFIED]` YouTube Data API v3 gives **10,000 units/day free** — no billing, no
  credit card. `search.list` costs 100 units (≈100 searches/day), but
  `channels.list` and `playlistItems.list` cost **1 unit each**.
- So the efficient pattern is: resolve a channel **once** (100 units), store the
  uploads-playlist id, then page uploads at 1 unit per call **forever**. That
  makes "pull all of this creator's videos" essentially free and fully ToS-clean.
- Quota cannot be bought; overflow needs a manual audit form. So design to the
  cheap endpoints from the start rather than treating search as the primary path.

---

## 3. The source ladder — free and clean first, X last

This is the part that most improves on the original ask. **X is not the only way to
reach the entities Sean cares about, and often not the best one.**

**Tier 1 — official, free, ToS-clean (build these first):**
- **YouTube Data API v3** — free quota above; the entity's full video record.
- **Bluesky / AT Protocol** — public data readable **without a key**, open by
  design. Large numbers of newsrooms, agencies, and journalists moved here
  precisely because of X. Ideologically and technically the cleanest win available.
- **Mastodon** — public timelines via open API, no key for public reads.
- **RSS / Atom** — **SwanGuard already parses this.** Most orgs, agencies, and
  newsrooms publish releases this way. Zero new code, zero new risk.
- **Government/press wires** — already the existing connector pattern.

**Tier 2 — free but gray (operator-side only, never server-side):**
- `yt-dlp` (already proven in `swan-scout`) for YouTube where the API is awkward.
- X's public syndication/embed surface and RSS-bridge style routes.
- Browser-session reads via the already-installed Playwright MCP persistent profile.

**Tier 3 — paid, but pays someone other than X:**
- **Apify** (this is almost certainly the tool Sean saw — its MCP server dominates
  the YouTube results for "scrape anything with Claude") or SocialCrawl. Metered,
  ships an MCP server, and the vendor carries the operational ToS risk.
- **This satisfies the actual objection.** Sean's stated goal is not to avoid
  spending money — it is to avoid *giving money to X*. Paying a data vendor does
  not fund X.

**Recommended build order:** RSS (free, already built) → YouTube API (free, huge
value) → Bluesky (free, no key) → Mastodon → *then* evaluate whether X is still
needed. There is a real chance the top four cover 80% of the entities Sean wants,
and every one of them is defensible without argument.

---

## 4. Provenance — non-negotiable, and it is already the house style

Every ingested item records: `source_key`, `source_tier` (official-api /
public-web / vendor), `fetch_method`, `fetched_at`, `collector_identity`,
`canonical_url`, `last_seen_at`, `retracted_at`. Existing doctrine — *no fabricated
data, ever; an unparseable date is OMITTED, never guessed* — carries over
unchanged. A UI that shows a post must be able to answer "where did this come from
and when did we last confirm it existed."

Add a per-source `terms_posture` field in the manifest (`official-api` /
`public-no-auth` / `vendor-licensed` / `tos-gray`). It costs nothing, makes the
posture auditable at a glance, and means a future reviewer can find every gray
source with one query instead of reading code.

---

## 5. Proposed slices

| # | Slice | Depends on |
|---|---|---|
| 1 | Entity scope gate + `entity` table with category + public-figure citation | — |
| 2 | YouTube connector via Data API v3 (channel resolve → uploads paging) | 1 |
| 3 | Operator ingest endpoint (auth, caps, replay protection, receipts) | 1 |
| 4 | `swan-collect` local collector; reuse `swan-scout` for YouTube | 2, 3 |
| 5 | Bluesky connector (no key) | 1 |
| 6 | `last_seen_at` / `retracted_at` lifecycle + withdrawn-by-source UI | 2 |
| 7 | Mastodon connector | 5 |
| 8 | X — decide vendor vs operator-side only, **after** 1-7 land | 3, 6 |

Slice 8 is deliberately last. By then Sean will know from real data how much X
actually adds over the free tiers, and the decision becomes evidence-based instead
of ideological — which is the stronger footing for a call he already has strong
feelings about.

---

## 6. Open questions for Sean

1. **Entity scope** — confirm the four allowlisted categories, or name a fifth.
   Free-text private-person search stays out unless he overrides explicitly.
2. **Is this SwanGuard-only**, or should SwanStudios reuse the collector for
   competitor/marketing intel? The collector is generic; the *scope gate* is what
   makes it a newsroom tool.
3. **Vendor budget** — is a metered Apify/SocialCrawl line acceptable if Tier 1
   leaves a real gap, given it does not pay X?
4. **Where does `swan-collect` live** — SwanGuard's repo, SS-PT, or standalone?
   SwanGuard is a separate repo, so this spec is a handoff, not an in-place build.

## 7. Status

**Spec only — nothing built.** SwanGuard lives in a separate repository; SS-PT has
no `packages/` tree. This document follows the existing convention of keeping
SwanGuard planning artifacts in `docs/ai-workflow/AI-HANDOFF/` and is ready to move
to the SwanGuard repo for implementation and a Kimi hostile-review packet (which
should target the ingest endpoint first — it is the widest new surface).
