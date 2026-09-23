# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\AI-Village-Documentation\validation-prompts\swanguard-osir-external-audit-packet-2026-08-12.md
**Seed:** (none)
**Tokens:** 2814 in / 6172 out | **Cost:** ~$0.1010 | **Wall:** 58.2s | **finish_reason:** stop

---

# OSIR Review — SwanGuard External Audit Packet (2026-08-12)

**Reviewer role:** Independent OSIR product and systems reviewer. Advisory only. Not a release or merge sign-off.

---

## 1. Verdict: **BLOCK**

**Scope of the block:** No merge of `refactor/shell-rebuild-20260721` (remote or local tip) into `main`, no release claim, no "shipped" language for any capability.

**Why BLOCK and not REVISE:**

1. The strongest candidate branch fails its own gate: `npm test` = 3/115 failures, and three package-script contracts (`smoke:web-command-receipt:postgres`, `smoke:web-deletion:postgres`, `smoke:web-evidence-graph:postgres`) resolve to `undefined` while their targets exist. A branch whose own smoke contracts are broken cannot be certified from old receipts.
2. A live **data-truth defect** exists on the canonical mounted path: the mounted `httpStoryService` persists Newsroom records to browser `localStorage` while an authenticated, user-scoped PostgreSQL archive service exists unused. This is not a polish issue — it means the canonical surface silently produces non-durable, non-portable, per-browser state that contradicts the product's core promise ("preserve provenance," "durable archive").
3. No production deployment or live critical-journey receipt was verified. Deployed state is **UNPROVEN**.
4. The capability matrix shows the product's headline promises (broad Newsroom, clustering, corroboration, cross-article comparison, coordination analysis) are all **UNPROVEN** on any mounted path.

**What would downgrade this to REVISE:** the three script contracts restored, the 3 test failures resolved or explicitly quarantined with receipts, the mounted Newsroom rewired to the durable archive service (or the localStorage path explicitly labeled and gated as demo-only), and a fresh end-to-end receipt on the merged result. Direction and sequencing in the packet are largely sound; the block is on truth claims and integration state, not on vision.

---

## 2. Findings Table

| # | Finding | Severity | Confidence | Evidence from packet | Correction / recommendation | Verification needed |
|---|---|---|---|---|---|---|
| F1 | Strongest branch fails its own test gate (3/115) and has 3 broken package-script contracts | **Critical** | High | "Fresh verification" section: `npm test` FAIL; scripts resolve to `undefined` while targets exist | Fix or quarantine the 3 failures with named receipts; restore the three `smoke:*:postgres` scripts before any merge discussion | Re-run full suite + the three smoke scripts on the exact merge candidate SHA; capture output |
| F2 | Competing persistence surfaces: mounted Newsroom saves to `localStorage`; durable user-scoped `/api/civic/archive` + Postgres store exists unused | **Critical** | High | "Mounted-surface truth": `httpStoryService` → `localStorage`; archive service "exists, but the mounted Newsroom does not use them" | Rewire mounted Newsroom to the archive service, or hard-gate localStorage mode behind an explicit demo/fixture flag with UI labeling | Caller-path trace from `NewsroomShell` save action to storage backend; receipt showing durable round-trip |
| F3 | Legacy 14-module `App` shell still in repo with active tests, unmounted | **High** | High | "`RootApp` says it is no longer mounted on any runtime path"; "legacy-shell feature work noncanonical unless its service is also wired into the mounted Newsroom" | Icebox formally: mark legacy shell deprecated in-repo, stop counting its test passes as product evidence, inventory services trapped behind it (see §4) | Grep/caller-path audit of every service imported only by legacy `App` |
| F4 | No verified deployment or live critical-journey receipt | **High** | High | "No current production deployment or live critical-journey receipt was verified" | Treat all deployed-state claims as UNPROVEN; produce one minimal live receipt before any external claim | Deployed-environment smoke receipt against the exact candidate SHA |
| F5 | 15 unpublished local commits on top of remote refactor branch; dirty main checkout with Phase 127.5/127.6/128 WIP | **High** | High | "Repository truth" section | Preservation-first: snapshot/backup dirty WIP and unpublished commits before any rebase or merge (see §3 integration order) | Confirm snapshots exist (bundle files / pushed backup branches) before integration begins |
| F6 | "Broad multi-outlet Newsroom" is one authenticated, read-only, ≤100-item `federal_register` path, center-classified per record | **High** | High | "Mounted-surface truth" and "Capability reality matrix" | Correct all outward language: current state is a single-channel official-record reader, not a newsroom. Do not market clustering/corroboration | Inventory of mounted routes and their actual data sources |
| F7 | Manifest-driven connector catalogue exists but manifests are default-off; no live multi-outlet ingestion proven | **High** | High | "Source-ingestion truth": "A manifest makes a source available for later approval; it does not make that source live" | Build the registry→approval→worker→checkpoint pipeline (§5) before claiming ingestion breadth | Receipt: one approved non-federal_register source flowing end-to-end into the mounted Newsroom |
| F8 | 590.68 kB main chunk warning on main build (non-blocking) vs. refactor branch budget PASS at 266.37 KiB raw / 81.26 KiB gzip | Medium | High | "Fresh verification" both sections | Adopt the refactor branch's bundle budget as a CI gate on main after convergence; do not let main regress | Bundle-budget check in CI on merged result |
| F9 | Comment Intelligence is manual-import only; no calibrated automation/coordination estimator proven | Medium | High | Capability matrix row | Keep manual-import + human-review framing; do not ship any automation-likelihood number without calibration version, coverage, and ranges (§6) | Calibration artifact + human-review receipt before any participation signal ships |
| F10 | MCP: grants/receipts/UI shells exist; no working general MCP server driving canonical services | Medium | High | Capability matrix row | Keep MCP read-only/preview until canonical services stabilize; no MCP writes (§8) | Receipt of one MCP read path against a canonical service, behind a grant, with redaction |
| F11 | YouTube: dormant read-only adapter + contracts; no OAuth, sync, or caption vault | Medium | High | Capability matrix + "External research claims" | Minimum useful path = official `commentThreads.list`/`comments.list` with quota accounting; captions only via OAuth-authorized `captions.list/download` for the user's own or explicitly authorized content (§7) | Quota-cost receipt; OAuth scope audit |
| F12 | Crawl4AI class tooling has serious advisory history (RCE, SSRF, file-write, auth, XSS, credential exfiltration) | **High** | High | "External research claims checked" | If ever used: pin reviewed version, isolate network/filesystem/credentials, auth on, all inputs/outputs untrusted. Not a near-term build item | Security review receipt before any crawler enters the dependency tree |
| F13 | Planning-documentation branch describes future program; risk of intent being read as reality | Medium | High | "explicitly describes a future program rather than implemented functionality" | Label planning docs with `STATUS: INTENT` headers; exclude from capability claims | Doc audit |
| F14 | Omitted product area excluded from cloud review | N/A | High | Scope statement | Correctly handled; keep it in the local audit lane only. No external reviewer inference about it | None for this lane |

---

## 3. Stale-Review Corrections

The supplied research review predates current branch and caller-path evidence. Corrections:

1. **STALE — "July 6 baseline" framing.** `origin/main` is at `2666b49` recording Phase 127 HTTP hardening, plus uncommitted Phase 127.5/127.6/128 WIP. Any review claim anchored to the July 6 baseline is stale.
2. **STALE — any claim that the refactor branch is merge-ready from prior receipts.** It is 57 commits ahead of `main` remotely, plus 15 unpublished local commits at `4f001fa`, and it currently **fails** its own test suite and has three broken script contracts. Old green receipts do not transfer.
3. **STALE/OVERSTATED — "Newsroom exists."** What is mounted is a single-channel, authenticated, read-only, ≤100-record `federal_register` reader with browser-local persistence. Clustering, syndication lineage, corroboration, and multi-outlet breadth are UNPROVEN.
4. **OVERSTATED — "archive is durable."** The durable archive exists but is off the canonical path. The mounted path's durability is `localStorage`. Both halves of that sentence must travel together.
5. **OVERSTATED — "connectors exist."** Manifests + a bounded RSS/Atom parser with hostile-input tests exist locally. Manifest ≠ approved ≠ live. No live multi-outlet ingestion is proven.
6. **OVERSTATED — any implied MSN/Bing path.** Microsoft retired the Bing Search APIs (2025-08-11) and points to Grounding with Bing Search. No public MSN feed-plus-comments API is established. Any plan depending on it is void.
7. **OVERSTATED — "public YouTube captions are obtainable."** Caption list/download requires OAuth 2.0 authorization. Public video ≠ caption rights. `commentThreads.list` paginates threads but full replies may need `comments.list` — quota math must reflect both.
8. **STILL CORRECT — hostile-input posture on parsing.** The bounded RSS/Atom parser with hostile-input tests is the right pattern and should be the template for all ingestion.
9. **STILL CORRECT — purchase automation disabled.** This remains correct and must remain so until retailer-approved, human-confirmed flows exist.
10. **STILL CORRECT — Crawl4AI risk assessment.** The advisory history is real; the isolation requirements in the packet are the minimum, not the maximum.

**Branch convergence is still P0.** Preservation-first integration order:

- **Step 0 (before anything):** Create `git bundle` snapshots of (a) the dirty main checkout including untracked files, (b) the full local refactor worktree at `4f001fa` including the 15 unpublished commits. Push both as backup branches to a private remote. Verify restoration from one bundle before proceeding.
- **Step 1:** Publish the 15 local commits to `origin/refactor/shell-rebuild-20260721` (or a `refactor/...-wip` sibling) so no work exists only on one disk.
- **Step 2:** On the refactor worktree, fix the 3 test failures and restore the 3 missing script contracts. Green suite required before any merge.
- **Step 3:** Commit or stash the dirty main WIP (Phase 127.5/127.6/128, command bar, docs) onto a named WIP branch off `main`. Do not carry uncommitted state into a merge.
- **Step 4:** Merge `main` → refactor branch (not the reverse) to absorb Phase 127 hardening into the candidate; resolve conflicts there; re-run full gates.
- **Step 5:** Merge refactor → `main` only after: green suite, bundle budget gate, and the F2 persistence rewire (or explicit demo gating) is done.
- **Step 6:** Rebase/replay the Step-3 WIP branch onto the new `main` in small, individually verified chunks.

---

## 4. Canonical-Surface and Competing-Surface Findings

**Canonical surface (mounted):** `main.tsx → RootApp.tsx → NewsroomShell` (demo mode with fixtures; backend mode behind `AuthGate` via `createHttpStoryService`). Mounted tabs: `Feed / Sources / Archive`, reading `GET /api/civic/official-sources`.

**Competing/orphaned surfaces:**

1. **Legacy 14-module `App` shell** — present, tested, unmounted. Every service reachable only through it is **noncanonical** and must not be counted as product capability. Inventory required; likely candidates per the packet's capability matrix include: Comment Intelligence workflows, evidence-graph viewers, Creator Board source-switch contracts, MCP UI shells, model-harness governance UIs, weather/recall contracts. Each needs an explicit disposition: **rewire into NewsroomShell / keep iceboxed with a deprecation marker / delete.**
2. **Durable civic archive (`/api/civic/archive` + Postgres store)** — exists, authenticated, user-scoped, and **unused by the mounted Newsroom**, which saves to `localStorage`. This is the single most damaging competing-surface defect: two persistence truths, and the canonical one is the wrong one.
3. **Connector catalogue + RSS/Atom parser** — real code, real tests, zero mounted callers. Not a product capability until wired through the registry→approval→worker path.
4. **Planning-documentation branch** — intent only; must be labeled as such wherever it is visible.

**Rule going forward:** a feature counts only if a caller-path trace from `RootApp` reaches it and a receipt demonstrates it. Tests for unmounted code are engineering hygiene, not product evidence.

---

## 5. Architecture and Data-Model Gaps

**Minimum architecture to unlock broad news without a scraping monolith** (Decision 4):

1. **Source registry** (DB-backed, not just manifests): every source has owner, citation metadata, policy version, approval state (default-off), egress class (official API / RSS-Atom / explicit browser-assisted capture), rate limits, and suspension state. Manifests become import format, not the system of record.
2. **Immutable observation store:** every fetch is an append-only observation (raw payload hash, fetched-at, source version, policy version, HTTP status). Observations are never mutated; corrections are new observations. This is the provenance spine the core loop requires.
3. **Worker + checkpoint layer:** per-source workers with durable checkpoints (last-seen cursor/etag/date), backoff, and kill switch. No in-process ad-hoc fetching from request handlers.
4. **Canonical URL + dedupe service:** URL normalization, canonical resolution, content-hash near-dedupe, and **syndication lineage** (wire/syndicated copies linked to origin) as first-class records.
5. **Clustering as a separate stage:** story clusters built from deduped items, with cluster membership explainable (which features, which items). Multi-outlet corroboration falls out of clusters, not out of per-record classification.
6. **Entity/claim extraction as versioned runs:** every extraction run records provider, model, version, prompt version, evidence IDs, cost, confidence, review state, and superseding run — per the packet's own AI-run retention spec. Claims link to observations, never to free-floating text.
7. **Timeline/corrections layer:** claim state over time; corrections are first-class events that re-label prior states without erasing them.
8. **Watches/alerts** sit on top of clusters and claim-state changes, not on raw items.

**Sequencing answer (Decision 6):** registry → immutable observations → workers/checkpoints → canonical URLs → dedupe → syndication lineage → clustering → entities → claims → timelines → corrections → watches → alerts. Do not parallelize claims extraction before dedupe/lineage exists, or you will extract claims against duplicate and syndicated copies and poison the graph.

**Data-model gaps:**

- No proven immutable-observation store (the core loop's "preserve provenance" has no evidenced substrate).
- No evidenced canonical-URL/dedupe/lineage model.
- Claim/entity graph exists as "evidence graph, comment or influence fact records, and planning" — i.e., partial and unproven end-to-end.
- Persistence split (F2) means the canonical surface has no durable user data model at all.
- AI-run retention schema is specified but no evidence it is enforced by schema/constraints rather than convention.

---

## 6. Security, Legal, and Abuse Risks

1. **Crawler/capture risk (High).** Crawl4AI-class tooling carries RCE/SSRF/file-write/auth/XSS/credential-exfiltration advisory history. Requirements if ever adopted: pinned reviewed version, network/filesystem/credential isolation, authentication on, all crawl inputs and outputs treated as untrusted, page-scoped and policy-gated only, no auth/CAPTCHA/queue/robots/rate-limit bypass. No crawler is a social-comments API.
2. **Defamation and false-light risk (High).** Rhetoric-pattern labels ("quote distortion," "attribution laundering," "promise-action mismatch") applied to named people or outlets are legally sensitive. Mitigations: labels attach to **claims and articles with cited evidence**, not to persons; every adversarial-rhetoric presentation is evidence-cited and human-reviewed; no clinical/mental-state claims about any person, ever (packet rule — keep it absolute).
3. **Political-neutrality abuse surface (High).** The packet correctly forbids viewpoint, race, nationality, religion, candidate support, criticism, or unpopular opinion as bot signals. This must be enforced as a **schema-level denylist** on participation-signal features, with a test suite proving those features cannot be inputs — not as a policy sentence.
4. **Coordination/automation mislabeling (High).** A definitive "bot count" would be both epistemically false and reputationally harmful. Only ranges + coverage + calibration version + human-review state. "Authenticity unknown" must be a first-class, common output.
5. **Caption/IP risk (Medium).** Caption download requires OAuth authorization; a "general caption vault" over arbitrary videos is neither API-supported nor rights-supported. Own-content or explicitly authorized content only.
6. **Retailer/ToS risk (Medium).** Acquisitions must remain: official APIs/feeds first, human-confirmed or retailer-approved actions only, honest promise = fastest policy-compliant eligible attempt. No queue/CAPTCHA/rate-limit bypass, ever.
7. **MCP write risk (High if built early).** Grants/receipts exist but no proven server; enabling writes against unstable canonical services would create un-auditable mutation paths. Read-only until canonical services stabilize.
8. **Data-protection (Medium).** Packet correctly excludes credentials/PII/location/payment fields. The future local-safety/location feature must be confidence-qualified and minimize precise location retention.

---

## 7. Product and UX Gaps (Desktop and Mobile)

1. **Truthful framing gap (Critical for trust).** The mounted product is a civic official-record reader. If the UI implies a broad newsroom, the first informed user will discover the gap and trust collapses. Label the current surface honestly: "Official Record Monitor — more source types in review."
2. **Persistence transparency.** Users must be able to see where their data lives. Until F2 is fixed, any save in the mounted Newsroom is per-browser and lossy — this must be either fixed or visibly flagged.
3. **Explainability UI absent.** The taxonomy (§6 of packet) is good but there is no evidenced mounted UI for claim state, article form, rhetoric patterns with cited evidence, or participation signals with ranges/calibration. Design the claim-detail view first: claim → state → evidence IDs → run provenance → review state → history/supersessions.
4. **Uncertainty as a first-class visual language.** "Unverifiable," "insufficient evidence," "authenticity unknown," and "outdated" need non-alarmist, non-deceptive treatments — not red/green truth meters. Explicitly avoid the single truthfulness percentage.
5. **Mobile gaps (UNPROVEN — no mobile evidence in packet at all):** no evidence of responsive behavior of `NewsroomShell`, no evidence of touch targets, offline behavior, or the 266 KiB initial load's performance on mid-tier mobile. The bundle budget is a good start; add a mobile performance budget and a critical-journey test on a constrained device profile.
6. **Corrections UX.** When a claim state changes, the user who saw the old state must be able to discover the change. Corrections are a notification surface, not just a data event.
7. **Demo vs. backend mode honesty.** Demo mode with fixtures must be unmistakably labeled as fixture data in the UI chrome.

---

## 8. Prioritized 90-Day Sequence

**Phase 0 — Preservation and gate repair (Days 1–10)**
- Execute Step 0–2 of the integration order (§3): bundles, publish 15 commits, fix 3 test failures, restore 3 smoke scripts.
- *Acceptance:* full green suite on refactor worktree; three smoke scripts execute and pass; restoration from one bundle verified.
- *Rollback:* bundles + backup branches.
- *Stop condition:* if the 3 test failures touch the evidence-graph or deletion paths and cannot be fixed in 10 days, stop and re-scope — do not merge around them.

**Phase 1 — Convergence (Days 8–25)**
- Steps 3–6 of integration order; adopt bundle budget as CI gate on `main`.
- *Acceptance:* merged `main` passes test/type-check/build/budget; legacy shell formally marked deprecated; caller-path audit (F3) delivered as a document.
- *Rollback:* merge is reversible; pre-merge `main` tagged.
- *Stop condition:* any regression in Phase 127 HTTP hardening behavior → halt, bisect, do not patch forward.

**Phase 2 — Fix the data-truth defect (Days 20–40)**
- Rewire mounted Newsroom persistence to `/api/civic/archive` + Postgres; localStorage retained only behind an explicit demo flag with UI labeling; migration/export path for any existing localStorage data.
- *Acceptance:* receipt showing save→reload→cross-browser durable round-trip through the authenticated archive; `smoke:web-deletion:postgres` passing against the mounted path.
- *Rollback:* feature-flag the archive-backed service; revert to localStorage-with-label if the archive service misbehaves.
- *Stop condition:* any data-loss or cross-user leakage signal in testing → stop, treat as incident.

**Phase 3 — Ingestion spine, one new source (Days 35–65)**
- Build registry (DB-backed), immutable observation store, worker+checkpoint layer, canonical URL + dedupe. Promote exactly **one** non-`federal_register` RSS/Atom source through approval → live, end-to-end, into the mounted Newsroom.
- *Acceptance:* receipt of one approved source flowing fetch→observation→dedupe→mounted UI, with checkpoint resume demonstrated after a forced worker restart; hostile-input parser tests still green.
- *Rollback:* source suspension flag; observation store is append-only so rollback = stop worker + hide source.
- *Stop condition:* if dedupe/canonicalization cannot be made deterministic on the test corpus, do not proceed to clustering.

**Phase 4 — Clustering and claim detail, read-only (Days 60–90)**
- Clustering over deduped items with explainable membership; claim-detail view (claim state, evidence IDs, run provenance, review state); AI-run retention enforced by schema; corrections as first-class events.
- *Acceptance:* receipt showing a multi-item cluster with membership explanation; a claim with state, cited evidence, and a superseding correction visible in UI; schema test proving AI-run fields are non-nullable.
- *Rollback:* clustering behind flag; claim view ships only with human-review state enforced.
- *Stop condition:* any claim state rendered without evidence IDs or review state → pull the feature.

**Explicitly out of the 90 days:** YouTube OAuth/sync, MCP server, model-harness production orchestration, multi-source expansion beyond the one proving source, any participation-signal automation.

### Must-Not-Build-Yet List (Decision 8)

1. **Bot/coordination certainty outputs** — no definitive counts, ever; no automated likelihood numbers until calibration artifacts + human review exist.
2. **General social scraping** (X, Bluesky, Reddit, Meta, TikTok) — no crawler-as-API; official APIs only, and only after the ingestion spine is proven.
3. **MCP writes** — read-only/preview until canonical services are stable and receipts exist.
4. **Purchase execution** — remains disabled; planning, alerts, and future retailer-approved human-confirmed actions only.
5. **Autonomous fact verdicts** — no system-adjudicated truth; claim states are evidence-cited and human-reviewed.
6. **General caption vault** — OAuth-authorized, own/authorized content only, and not before the minimum YouTube path (§7 answer below) proves quota economics.
7. **Location-aware safety experience** — contracts exist; do not build until confidence-qualified design and data-minimization review exist.
8. **Any Crawl4AI-class dependency** — barred until the §6 isolation requirements are met and a security review receipt exists.
9. **Truthfulness percentage UI** — permanently, not just "yet."

---

## 9. Residual Unknowns and Exact Probes

| Unknown | Probe that resolves it |
|---|---|
| Root cause of the 3/115 test failures — cosmetic vs. evidence-graph/deletion corruption | Run the 3 failing specs individually with verbose output on `4f001fa`; classify each as flake, contract drift, or logic defect |
| Why the three `smoke:*:postgres` scripts resolve to `undefined` | Inspect `package.json` script block diff between `main` and the worktree; confirm whether it is a merge artifact or a rename |
| Full inventory of services trapped behind the legacy shell | Static import graph rooted at legacy `App` minus import graph rooted at `RootApp`; the set difference is the rewire list |
| Whether the durable archive service actually works end-to-end | Authenticated write→read→delete round-trip against `/api/civic/archive` with the Postgres store, captured as a receipt |
| Whether any deployment exists at all | Attempt one authenticated request against the purported production URL; UNPROVEN stands until a receipt exists |
| Whether the RSS/Atom parser survives real feeds, not just hostile fixtures | Run it against a recorded corpus of 50 real-world feeds (including malformed ones); measure parse rate and failure modes |
| Whether dedupe/canonicalization is feasible on the target corpus | Prototype on 1,000 recorded items; measure duplicate-detection precision/recall by hand-labeled sample |
| Mobile viability of `NewsroomShell` | Lighthouse + manual critical-journey run on a mid-tier Android profile against the refactor build |
| Whether AI-run retention is schema-enforced | Attempt an insert missing provider/model/prompt-version/evidence-IDs; it must fail |
| Quota economics of the minimum YouTube path | Cost model: `commentThreads.list` pages + `comments.list` reply fetches per video at target volume vs. daily quota; if the math fails, the feature scope shrinks before any code |
| Whether the dirty main WIP (127.5/127.6/128) conflicts semantically with the refactor shell | Dry-run merge into a throwaway branch; conflict list becomes the integration backlog |

**Minimum useful YouTube path (Decision 7):** read-only, official API only — `commentThreads.list` with pagination plus `comments.list` for full replies, quota-costed and receipted, feeding the existing manual-import Comment Intelligence workflow. Captions: OAuth 2.0 `captions.list/download` strictly for the authenticated user's own or explicitly authorized content. No subscription sync, no upload, no general caption vault in this horizon.

---

## 10. Standing Caveat

Nothing in this review asserts that any SwanGuard capability is live, deployed, complete, or safe beyond what the packet's own fresh-verification section demonstrates. Where the packet shows intent, planning, contracts, or unmounted code, this review records **UNPROVEN**. The verdict is **BLOCK**, resolvable to REVISE via the four conditions in §1 and executable through the Phase 0–4 sequence above.
