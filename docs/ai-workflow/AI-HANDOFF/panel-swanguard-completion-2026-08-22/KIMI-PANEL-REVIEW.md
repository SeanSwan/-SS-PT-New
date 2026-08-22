# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWANGUARD-COMPLETION-REVIEW-PACKET-2026-08-22.md
**Seed:** (none)
**Tokens:** 2945 in / 5593 out | **Cost:** ~$0.0927 | **Wall:** 193.8s | **finish_reason:** stop

---

# PART 1 — HOSTILE REVIEW (§2–§4), ranked by severity

---

## S0 — The entire verified feature set ships nothing

**File:** `apps/web/src/main.tsx` → `RootApp`; `apps/web/src/App.tsx` imported only from `src/testAppHarness.ts`.
**Symptom:** §2.2 rows B1a/B1b (and the pre-existing connector wall) exist only in tests. The production bundle (deterministic, 320 KB) contains zero console markup.
**Reproduction:** `grep -c "official-connectors-title" dist/assets/*.js` → 0.

**What's claimed beyond evidence:** §2's header says "What exists and is verified." Nothing that cannot be reached from the production entry *exists* as product. Every downstream claim — "live listing 742ms → 45ms", "batch enable names failures" — is verified *in a harness that is not the app*. The B0 read-cost claim is live-DB verified, so it stands; the B1a/B1b claims do not, as user-facing statements.

**The review asks "tell us the right resolution" — reversing the burden. Fine:**
The console must ship from `RootApp` behind a Newsroom route, gated on the same owner-auth the API already enforces. Cost: one lazy `React.lazy(() => import('./App'))` chunk + route + nav entry; the API auth is already real because `setOwnerEnabled` works against live Postgres. "Stay parked" is not an option — you built an enablement UX with no enablement path, so §3.3's attestation and all of B3 are unreachable. Parking it means the 146-outlet plan is dead on arrival, so decide now, not "owner's decision" later.

---

## S1 — Governance gates are attested, not enforced, and §2.1's own numbers prove the gap

**File/symptom:** Live DB: 39 sources, **0 enabled creator items**, 1 state row, 10 items total, quota_spent 2. Both contract gates "signed." Yet §3.3 admits it's unresolved whether one attestation covers 107 future feeds.
**Reproduction:** `select count(*) from contract_approvals` → 2, covering 39 feeds. Ask the schema: is `contract_approvals` keyed per-connector-key, per-family, or global? If per-family or global, adding feed #40 inherits a signature made before that feed was ever probed — the gate is a vibe.

**Defect:** There is no stated mechanism binding an approval to a *feed set*. The correct rule: `contract_approvals` must carry a **feed-set hash** (sorted URL list, hashed); enabling any outlet not in the signed set returns `contract_not_signed` for that key. Without this, B3's "enable in batches" silently extends a licence attestation to outlets it never covered. This is the single most dangerous open item because it is legal exposure, not UX.

**Also unexamined:** quota. One state row shows `quota_spent 2`. What is the quota *ceiling*, where is it enforced, and what does 2,951 items × 146 outlets do to it? §2 never mentions a quota gate firing in any test. A governance gate that has never fired is indistinguishable from an absent one (your own Law 4).

---

## S2 — The "lexical tripwire" is a regex cargo cult presented as a safety proof

**File:** Slice A tripwire test scanning `apps/api/src`, `apps/web/src`, `packages/domain/src`, `packages/database/src`.
**Symptom:** It "scans for 8 bug shapes and fails unless `isNewsRssOutletKey` is consulted."
**Reproduction:** Add a ninth shape — e.g. a connectorKey comparison inside a `.ts` file in `apps/worker/`, or in a SQL migration, or via template-literal key construction `` `news_rss:${id}` `` compared with `.startsWith('news_rss')` — tripwire silent. Or write `key === 'news_rss'` where the linter shape expects `key.startsWith(`: silent.

**Defect:** "A deliberate sweep found no fourth site" is a claim about *one day, one reader, 8 known shapes*. The tripwire's self-test proves it fires on the shapes you thought of — Law 4 applies to the tripwire itself, and you've decorated. The actual invariant you want is **type-level**: make bare `connectorKey` comparisons on news keys a compile error by branding the type (`NewsOutletKey` vs `LiteralKey`) and removing the `string` overlap — you already half-did this with `Record<FamilyKey,…>` in B1a and it worked. Finish the job; demote the regex to a backup.

---

## S3 — Shallow-merge upsert (Law 1) is a time bomb with a known trigger date

**File:** the `news_rss_sources` upsert, `config = config || jsonb_strip_nulls(excluded.config) || …`.
**Symptom:** "safe only while `config` stays flat."
**Reproduction:** The moment `config` gains a nested object — `{"quota": {"daily": 100}}` — an upsert carrying `{"quota": {"burst": 5}}` **destroys** `daily`. No error, no log; the value is just gone. And B2 *will* add nested config: `termsUrl`, `ownership`, per-outlet retention budgets are exactly the kind of thing that becomes a sub-object.

**Defect:** The law documents the caveat and then schedules B2/B3 to hit it. Fix is cheap and must precede B2: either pin flatness with a schema test + CHECK constraint (`jsonb_typeof` on every value = scalar), or write the recursive merge now. "Safe while flat" with a plan to make it non-flat is not a caveat; it's a defect with a calendar date.

---

## S4 — The born-dormant guard has a hole the size of `DO UPDATE`

**File:** migration 0028 triggers + seed statement.
**Symptom:** Triggers "refuse `enabled=true` on insert and any false→true without an owner-attributed event."
**Reproduction:** The trigger fires on `UPDATE` when `enabled` changes false→true. But the batch-enable path (`setOutletsEnabled`) — does it write through the same table with an owner-attributed event *in the same transaction*? If the attribution event is written by application code in a separate statement, a crash between them leaves either (a) enable blocked forever (trigger saw no event) or (b) a trigger bypass via `session_replication_role` or a security-definer function — you don't say which. Also: the removed runtime "count unmoved" assertion false-positived under READ COMMITTED and was *deleted*, not fixed. So today there is **no runtime verification** that dormancy holds — only structural guards and a pinned-statement test. Per Law 3, the structural guard is the fake-client suite; the live proof was deleted. Re-add the assertion correctly (in the same transaction as the seed, or as a deferred constraint check), or admit dormancy is currently unmonitored in production.

---

## S5 — `news_rss:ghost` → 409 `connector_not_ready` (§3.5) will poison the batch ledger at scale

**File:** family definition resolution for `news_rss:*`.
**Symptom:** Unknown outlet and not-ready outlet are the same 409.
**Reproduction:** In a 146-outlet world, `listOutletStatuses()` unions registry ∪ orphaned state keys (B0 — good). An orphan from a typo'd key (`news_rss:npr-new` vs `npr_news`) lists as `provider_not_configured`, gets selected in a batch (its sole blocker reads as `owner_not_enabled` after config), and the batch "succeeds" against a ghost that can never sync. Ledger says "enabled"; nothing ever ingests; the tripwire for staleness (whatever it is) must distinguish "stale feed" from "phantom feed."

**Defect:** Fix is one branch: if no registry row and no source row exists for the key → 404 `unknown_outlet`. 409 must mean "exists, blocked." This is a prerequisite for the operator surface in §5.4 — otherwise the console displays ghosts as governable rows.

---

## S6 — Baseline with a known red is a broken alarm (§3.2), and the fix is trivial

**File:** `civicOfficialSourcesRoutes.test.ts`, "returns nothing while gated…".
**Defect:** You state the problem correctly and then don't fix it. Either fix the test, or quarantine it into a `known-failures` suite that the gate *expects* (fail if it passes). A CI where red is normal guarantees the next real regression is merged. This is your own Law 4 applied to your own baseline, and it costs an afternoon.

---

## S7 — Minor but real: §3.4 percent-encoding 405

405 on `/out%6Cets` is house-wide and standards-defensible (decoded path ≠ route), so severity is low — but it means **probes and health checks that URL-encode will get 405, not 404**, and any automated monitor will misclassify. Add a canonicalization redirect (308) or document it; don't leave a monitor to discover it.

---

## Claims-vs-evidence ledger (quick hits)

| Claim (§2) | Evidence status |
|---|---|
| B0 read cost constant in outlet count | **Stands** — live-Postgres verified |
| 742ms→45ms, zero writes | Stands *as measured at 1 state row*; re-run at 146 before B3 sign-off |
| B1a/B1b work | **Harness-only** (S0) |
| "No fourth site" (Slice A) | **Unprovable as stated** (S2) |
| Dormancy enforced | Structural only; runtime proof deleted (S4) |
| Contract gates signed | Signed, but **scope undefined** (S1) |

---

# PART 2 — COMPLETION BLUEPRINT

## 1. The decomposition is wrong in three places

1. **B2 and B3 are one slice pretending to be two, and both are blocked behind an unlisted Slice U (unblock the console, S0) and Slice L (licence scope, S1).** You cannot "enable in batches" through a console that doesn't ship, against an attestation whose scope is undefined. As written, the plan front-loads ingest work whose governance is unresolved.
2. **B2 as specified measures the wrong thing twice.** "Zero overlap" via feed-URL string equality is nearly meaningless: the same outlet serves `feeds.npr.org/1001/rss.xml` and `npr.org/rss/rss.php?id=1001`. Overlap must be computed on **outlet identity** (normalised domain + publisher name) and **content fingerprint** (first-N GUIDs/links per feed), not URL strings. And the re-probe must be a **recurring job with a TTL** (liveness decays — your words), not a one-shot producing a static JSON that B3 then treats as current.
3. **Claim extraction (D/W1) before syndication keys is backwards in one respect:** the syndication-detection *schema* must land **with or before** extraction, because extraction must write provenance into it. Extracting claims into a table you'll then migrate is rework. Split D into D0 (schema delta, below) and D1 (extractor writing into it).

**Corrected ordering with dependencies and acceptance evidence:**

| # | Slice | Depends on | Acceptance evidence |
|---|---|---|---|
| **U** | Ship owner console from `RootApp` behind Newsroom route + owner auth | — | `vite build` bundle contains console chunk; Playwright: owner enables one dormant outlet in prod build; 401 for non-owner |
| **L** | Licence scope: `contract_approvals.feed_set_hash`; enable of out-of-set key rejected | U | Test: enable feed not in signed set → `contract_not_signed`; migration backfills hash for existing 39 |
| **B2′** | Re-probe as recurring job (`probe_runs` table, TTL 7d); overlap on domain + content fingerprint; `termsUrl`+`ownership` mandatory per entry, missing → excluded from seed file | L | `probe_runs` row per feed with timestamp; overlap report naming *outlet-identity* collisions; zero entries in output lacking `termsUrl` |
| **B3′** | Seed 107 born dormant + retention/volume budget enforced in config (item cap + TTL per outlet, default conservative) + recursive-merge or flat-config CHECK (fixes S3) + ghost/404 fix (S5) | B2′ | Seeded rows all `lifecycle=dormant` (trigger-verified, runtime assertion re-added per S4); upsert test with nested config proves no silent drop; `news_rss:ghost` → 404 |
| **B4** | Batch-enable 107 in waves of ~20 with per-wave receipt review and quota ceilings that have *fired in a test* | B3′ | Quota gate demonstrably blocks wave N+1 at ceiling; ledger shows named failures; staleness probe marks a deliberately-killed feed within one TTL |
| **D0** | Schema delta for claims + source-side syndication (below) | B4 (needs real items flowing) | Migration + round-trip test: two outlets, same wire story, distinct claim rows, shared `syndication_group_id` via shared `source_evidence` |
| **D1/W0+W1 merged** | `news` WikiSourceModule + extractor writing claims with provenance | D0 | Module registered (compile error if family missing, à la B1a); extractor emits claim rows each with `source_item_id`, `quoted_span` offsets, `evidence_url`; nothing stored that is only LLM-restated |
| **E** | Clustering + disagreement map surface (read-only) | D1 | Two outlets disagreeing on a value render as one cluster, two positions, primary docs linked; verdict UI absent or human-only |

## 2. Mermaid — end-to-end lane with every gate as a decision node

```mermaid
flowchart TD
    A[Feed candidate] --> P[Re-probe job<br/>TTL 7d]
    P -->|dead / 403 bot| X1[Excluded - probe_runs row, reason]
    P -->|live| Q{termsUrl +<br/>ownership present?}
    Q -->|no| X1
    Q -->|yes| O{Overlap?<br/>domain + content fingerprint}
    O -->|outlet-identity collision| X2[Duplicate report - human dedupe]
    O -->|clear| S[Seed born dormant<br/>enabled absent from INSERT/UPDATE<br/>trigger-enforced]

    S --> E1{Owner enable<br/>in feed_set_hash?}
    E1 -->|no| B1[409 contract_not_signed - blocker]
    E1 -->|yes| E2{Kill switch clear?}
    E2 -->|tripped| B2[Blocked - kill switch receipt]
    E2 -->|clear| E3{Activation phrase<br/>one per batch}
    E3 -->|wrong| B3[No state change - attempt logged]
    E3 -->|ok| E4{Outlet exists<br/>registry or source row?}
    E4 -->|no| B4[404 unknown_outlet]
    E4 -->|yes| EN[setOwnerEnabled<br/>owner-attributed event, same txn]
    EN --> L[Batch ledger: N of M, failures named]

    L --> SY{sync()}
    SY --> QO{Quota ceiling?}
    QO -->|exceeded| R1[Receipt: quota_exceeded, items 0]
    QO -->|ok| RT{Retention budget<br/>cap + TTL}
    RT -->|over cap| R2[Receipt: retention_trim, oldest evicted]
    RT -->|ok| IT[official_connector_items<br/>headline+snippet+link, shadow-only]

    IT --> CE[Claim extraction D1]
    CE --> EV{Source-side evidence?<br/>span offsets + source URL + GUID}
    EV -->|no, restated text only| RJ[Reject - never write restated-only claims]
    EV -->|yes| CL[claims + claim_evidence rows]

    CL --> CG{Shared evidence?<br/>same wire URL / GUID / doc}
    CG -->|yes| SG[Same syndication_group_id<br/>corroboration visible]
    CG -->|no| SG2[Own group]
    SG --> DM
    SG2 --> DM[Disagreement map<br/>cluster, positions, primary docs]
    DM --> V{Verdict?}
    V -->|system| NV[Not allowed - verdicts human-set]
    V -->|human| HV[Human verdict, attributed]

    style X1 fill:#3a1a1a
    style B1 fill:#3a1a1a
    style B2 fill:#3a1a1a
    style B3 fill:#3a1a1a
    style B4 fill:#3a1a1a
    style R1 fill:#3a2f1a
    style R2 fill:#3a2f1a
    style RJ fill:#3a1a1a
    style NV fill:#3a1a1a
```

## 3. Wireframe — operator surface for 146 outlets

**Where it lives:** a lazy-loaded route in `NewsroomShell` (Slice U), not the parked `App.tsx`. `/newsroom/owner/outlets`.

```
┌─ Outlets ──────────────────────────────────────────── [Owner: kim] ─┐
│ Filters: [status ▾][family: news_rss][stale >7d ☐][ghost ☐]  🔍____ │
│ Contract: feeds 1-39 signed 8/22 · set hash 9f3e… · 107 UNSIGNED ⚠  │
│ Quota: 1,204 / 5,000 items (24%) ▓▓▓░░░░░░░  Retention: 90d default │
├──────────────────────────────────────────────────────────────────────┤
│ ☑ │ OUTLET          │ STATE      │ BLOCKER           │ LAST SYNC   │
│───┼─────────────────┼────────────┼───────────────────┼─────────────│
│ ☐ │ NPR News        │ ● live     │ —                 │ 2m ago      │
│ ☑ │ AP Top          │ ○ dormant  │ owner_not_enabled │ never       │
│ ☑ │ AP Politics     │ ○ dormant  │ owner_not_enabled │ never       │
│ ☐ │ Reuters World   │ ◐ blocked  │ contract_unsigned │ never   ⚠   │
│ ☐ │ KBOI-TV         │ ● STALE    │ —                 │ 9d ago  🔴  │
│ ☐ │ npr-new (ghost) │ ✖ unknown  │ no source row     │ —       👻  │
│ ...density: ~30 rows/screen, virtualized, no per-row switches...    │
├──────────────────────────────────────────────────────────────────────┤
│ Selected: 2 (only sole-blocker=owner_not_enabled selectable)         │
│ [Enable selected]  → phrase: [____________] [Confirm]                │
│ [Disable selected] (no phrase)                                       │
├──────────────────────────────────────────────────────────────────────┤
│ LAST BATCH LEDGER                                2026-08-29 14:02    │
│ Enabled 18 of 20 · FAILED: news_rss:ktv7 (kill_switch),             │
│ news_rss:ghost (404 unknown_outlet)            [full receipt →]     │
└──────────────────────────────────────────────────────────────────────┘
```

Non-negotiables: (a) **staleness column with age, not a boolean** — "notice a feed going stale" requires the age visible in the default sort; (b) **ghost rows rendered as ghosts** (depends on S5 404 fix) so a phantom can't be batched into a fake success; (c) the **unsigned-set banner** (depends on Slice L) so licence scope is visible before enabling, not discovered in an audit; (d) the batch ledger *persists* — it's the receipt for the phrase attestation.

## 4. Data model delta — claims + syndication on source-side evidence

```sql
-- D0. Nothing here stores LLM-restated text as a key. Ever.

CREATE TABLE claims (
  claim_id          uuid PRIMARY KEY,
  source_item_id    uuid NOT NULL REFERENCES official_connector_items,  -- the RSS item
  outlet_key        text NOT NULL,            -- denormalised for partition/quota
  claim_type        text NOT NULL,            -- 'event' | 'attribution' | 'quantity' | 'date' | 'actor'
  subject_text      text NOT NULL,            -- VERBATIM span from source, not restatement
  subject_span      int4range NOT NULL,       -- offsets into fetched snippet -> provable
  predicate         text NOT NULL,            -- normalised verb/relation (vocabulary-controlled)
  object_json       jsonb,                    -- structured value; nulls allowed, never erased (Law 1)
  extracted_by      text NOT NULL,            -- model+version, for retraction-by-version
  extracted_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE claim_evidence (                  -- the corroboration surface
  claim_id          uuid NOT NULL REFERENCES claims,
  evidence_kind     text NOT NULL,  -- 'source_url' | 'feed_guid' | 'wire_agency' | 'linked_doc_hash' | 'byline'
  evidence_value    text NOT NULL,  -- the SOURCE's own identifier: its URL, its GUID, its cited doc
  PRIMARY KEY (claim_id, evidence_kind, evidence_value)
);

CREATE TABLE syndication_groups (
  group_id          uuid PRIMARY KEY,
  canonical_evidence text NOT NULL,  -- strongest shared source-side key, e.g. wire URL or doc hash
  first_seen_at     timestamptz NOT NULL
);
ALTER TABLE claims ADD COLUMN syndication_group_id uuid REFERENCES syndication_groups;

CREATE TABLE claim_clusters (                  -- disagreement, never verdict
  cluster_id        uuid PRIMARY KEY,
  topic_key         text NOT NULL,             -- deterministic cluster key, not embedding
  created_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE claims ADD COLUMN cluster_id uuid REFERENCES claim_clusters;

CREATE TABLE claim_positions (                 -- who says what inside a cluster
  cluster_id        uuid NOT NULL REFERENCES claim_clusters,
  outlet_key        text NOT NULL,
  claim_id          uuid NOT NULL REFERENCES claims,
  stance            text,                      -- 'asserts' | 'denies' | 'hedges' — HUMAN-overridable
  PRIMARY KEY (cluster_id, outlet_key, claim_id)
);
```

Why this honours the law: corroboration is detected by **joining `claim_evidence` on `evidence_value`** — two outlets sharing a `feed_guid`, a `wire_agency`+story-id, or a `linked_doc_hash` land in one `syndication_group` *because the sources themselves carry the same pointer*. LLM-restated text appears nowhere as a key; `subject_text` is verbatim-with-offsets so every claim is auditable back to the fetched snippet (which is also what keeps extraction inside the shadow-only licence posture — you store spans and links, you republish nothing). Retraction-by-model-version is one `DELETE … WHERE extracted_by =` away.

## 5. Three biggest risks, each with a build-step mitigation

1. **Licence scope creep (S1): one attestation silently covering 146 feeds.** This is the only risk that is legal rather than technical, and it compounds — every batch enable under a scoped-out attestation is exposure you can't retro-fix. **Build step (Slice L):** add `feed_set_hash` to `contract_approvals`, enforce at enable time, re-sign per wave. Blocking, before B2′.
2. **Scale illusion: every performance and correctness claim was verified at 1 state row and 10 items; B3 jumps to 146 outlets / ~3k items in one move.** The 45ms listing, the batch ledger, quota, and the dormancy triggers are all unproven at the target scale. **Build step:** a `scripts/loadgen-146.ts` that seeds 146 synthetic outlets + 3k items into a scratch live Postgres (Law 3 — fake clients don't count) and re-runs the B0 read-cost, batch-enable, and trigger assertions *before* the first real wave. Quota ceilings must be observed firing in this run.
3. **Extraction quietly becoming RAG-by-hand (restated text as join key), which destroys corroboration detection — the product's core differentiator.** The failure mode is seductive because restated keys cluster *better* superficially. **Build step (D0/D1):** a DB-level CHECK/trigger rejecting any `claim_evidence` row whose `evidence_kind='restated_text'`, plus the `EV` gate in the flowchart as an extractor test: any claim with zero source-side evidence rows is rejected, loudly, with a receipt. Make the wrong thing unwritable, not merely discouraged.

One last blunt note: the strongest thing in this codebase is its test culture, and the two places that culture was abandoned — the deleted runtime dormancy assertion (S4) and the tolerated red baseline (S6) — were abandoned for convenience, not principle. Those are the canaries. Fix both this week; they cost hours and they're the difference between a system that is governed and one that is merely described as governed.
