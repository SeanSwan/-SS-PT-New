# Tencent Hy3 - Design Inspiration

**Reviewer:** `tencent/hy3` (high)
**Document:** C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\AI-Village-Documentation\validation-prompts\swanguard-osir-external-audit-packet-2026-08-12.md
**Seed:** (none)
**Tokens:** 2779 in / 7325 out | **Cost:** ~$0.0043 | **Wall:** 179.5s | **finish_reason:** stop

---

# HY3 Independent Divergent OSIR Review – SwanGuard Audit Packet 2026-08-12

**Reviewer persona**: HY3, external adversarial OSIR interaction & systems reviewer.  
**Layer separation enforced**:
1. `origin/main` @ `2666b49` (Phase 127) – committed remote reality.
2. Uncommitted `main` WIP (Phases 127.5/127.6/128) – dirty, not shipped.
3. Clean worktree `refactor/shell-rebuild-20260721` @ `4f001fa` – 15 unpublished commits ahead of its remote, 72 ahead of `main`.
4. Blueprint/policy-only intent (planning branch, omitted-area docs) – not implemented.
5. Deployed/live state – **UNPROVEN**; no production receipt verified.

**Verdict**: **`REVISE`** (with **`UNPROVEN`** stamped on any claim of live, deployed, complete, or safe).  
- Not `APPROVE`: strongest branch fails 3 tests, missing package scripts; mounted Newsroom has a competing-surface data-truth defect; main is dirty.  
- Not `BLOCK`: no evidence of imminent irreversible harm; all gaps are correctable with defined sequencing; project is pre-deployment.

---

## 2. Findings Table

| # | Finding | Severity | Confidence | Evidence from this packet | Correction / Recommendation | Verification needed |
|---|---------|----------|------------|---------------------------|-----------------------------|---------------------|
| F1 | Strongest branch `4f001fa` fails `npm test` (3/115) and lacks 3 `smoke:*:postgres` package scripts (resolve `undefined`). | High (merge blocker) | High | “npm test: FAIL… three package-script contracts missing… target scripts and tests exist but package commands resolve to undefined.” | Add missing scripts to `package.json` or fix resolution; run full suite in CI before any merge. | Run `npm run smoke:web-command-receipt:postgres`, `smoke:web-deletion:postgres`, `smoke:web-evidence-graph:postgres` in clean env. |
| F2 | Mounted Newsroom writes to browser `localStorage` while an authenticated PostgreSQL `/api/civic/archive` exists off-path. Competing-surface data-truth defect. | Critical (data truth) | High | “mounted httpStoryService saves Newsroom records to browser localStorage… separate authenticated user-scoped /api/civic/archive … mounted Newsroom does not use them.” | Rewire `NewsroomShell` to use the archive service as primary store; keep localStorage only for offline draft; deprecate implicit “durable” claim. | Integration test proving records persist across sessions via API, not only local. |
| F3 | Legacy 14-module `App` shell remains in repo with active tests but `RootApp` declares it unmounted. | Medium (misleading test surface) | High | “legacy 14-module App shell remains… its tests remain active, but RootApp says it is no longer mounted on any runtime path.” | Mark legacy tests as `noncanonical` or migrate features into `NewsroomShell`; avoid double-counting coverage. | Static call-path analysis + test tag audit. |
| F4 | `main` checkout dirty with Phase 127.5/6/128 WIP. | Medium (truth of “main”) | High | “main checkout is dirty with uncommitted Phase 127.5… preserve it and do not treat as shipped.” | Commit or stash WIP to a branch; never report as `origin/main` reality. | `git status` diff review. |
| F5 | No broad multi-outlet ingestion proven; only `federal_register` via `GET /api/civic/official-sources` (max 100, read-only, no upstream fetch). RSS/Atom parser & manifests are default-off. | High (product truth) | High | “mounted feed is not a broad multi-outlet news service… manifest makes a source available for later approval; it does not make that source live.” | Implement approval-gated worker that ingests manifests + RSS/Atom with provenance; expose as canonical. | Runtime proof of non-federal_register source flowing through mounted path. |
| F6 | Main build emits 590.68 kB JS chunk warning (non-blocking). Refactor branch meets budget (81.26 kB gzip). | Low/Medium (mobile) | High | “web build emits non-blocking 590.68 kB main JavaScript chunk warning.” | Merge refactor branch after tests fixed; code-split heavy modules. | Lighthouse mobile audit on merged branch. |
| F7 | No live deployment or critical-journey receipt verified. | Informational but binding | High | “No current production deployment or live critical-journey receipt was verified for this audit.” | Do not label any feature “live”; require deploy receipt before future claims. | Request signed deployment + smoke test logs. |
| F8 | Crawl4AI (if adopted later) carries RCE/SSRF/etc advisories. | High (future risk) | High (external claim) | “Crawl4AI … Docker server has had significant RCE, SSRF … advisories.” | Pin reviewed version, isolate network/fs/creds, keep auth on, treat I/O as untrusted. | Security review before any crawl path is enabled. |
| F9 | Claim/article/rhetoric/participation taxonomy exists only as direction, not proven mounted. | Medium | Medium | “Avoid one opaque truthfulness percentage… Prefer claim-level…” (no code reference). | Implement as described in `Newsroom` UI + AI run metadata. | UI review + unit tests for label rendering. |
| F10 | Accessibility, failure-state, alert-triage UX not assessed in packet. | Unknown (gap) | Low | Omitted from verification scope. | Add to must-not-ship checklist: a11y audit, offline/auth/empty states. | WCAG scan + failure-state walkthrough. |

---

## 3. Stale-Review Corrections (Requested Decision #1)

- **Stale**: Any prior research review citing “July 6 baseline” or old `main` state. Packet confirms `origin/main` is now Phase 127 (`2666b49`). Correct all references.
- **Overstated**: Claims that SwanGuard has a “broad multi-outlet Newsroom” or “live clustering/corroboration.” Current evidence: one `federal_register` path; RSS/Atom parser not wired to mounted surface.
- **Overstated**: Implication that legacy `App` shell features are reachable. `RootApp` explicitly unmounts it.
- **Understated**: Risk of `localStorage` as primary store (competing surface) – not highlighted in earlier matrix.
- **Still correct**: Bing Search API retirement (2025-08-11); YouTube `commentThreads.list` pagination/quota; caption OAuth requirement; Crawl4AI advisories; no crawler equals universal social API.
- **False if claimed**: Purchase automation exists – intentionally disabled except planning/alerts.

---

## 4. Canonical-Surface & Competing-Surface Findings (Requested #3, #4)

**Canonical surface**: `main.tsx → RootApp.tsx → NewsroomShell` (demo or backend via `AuthGate`+`createHttpStoryService`). This is the only mounted runtime.

**Competing surfaces**:
- **Legacy `App` shell** – code + tests present but not mounted; any feature there (if any) is noncanonical until rewired.
- **Durable archive API** (`/api/civic/archive` + Postgres) vs **browser `localStorage`** – the mounted Newsroom uses the latter, creating a data-truth split: users may believe records are saved server-side when they are not.
- **Source manifests / RSS parser** (in refactor branch) vs **mounted federal_register endpoint** – manifests are default-off; no proof of approval flow to live ingestion.

**Minimum architecture for broad news without scraping monolith** (Decision #4):
1. Source Registry (manifest-driven, default-off, ownership/citation meta).
2. Approval gate (human/owner-enabled, contracted, unsuspended).
3. Bounded ingest workers for Official APIs/RSS/Atom only (no crawl unless isolated Crawl4AI later).
4. Immutable observation store with canonical URL + fetch provenance.
5. Dedupe + syndication lineage + clustering as post-ingest jobs.
6. Mounted Newsroom reads from durable archive, not localStorage.

---

## 5. Architecture & Data-Model Gaps (Requested #6)

Missing or unproven links in the core loop `observe → preserve → normalize/dedupe/cluster → resolve entities/claims → compare → explain → bounded actions`:

- **Source registry**: manifests exist but no proven approval→live pipeline.
- **Immutable observations**: not proven for RSS/Atom; federal_register returns pre-stored items, does not fetch upstream.
- **Workers/checkpoints**: no evidence of ingestion workers or checkpointing.
- **Canonical URLs & dedupe**: not proven; “each record is one center-classified official source, not multi-outlet cluster.”
- **Syndication lineage / clustering**: “genuine clustering, syndication lineage, corroboration are not proven.”
- **Entities & claims**: evidence graph + planning exist; no automatic retrieval/temporal reasoning engine proven.
- **Timelines / corrections / watches / alerts**: blueprint only; alert triage UI not proven.
- **Data model**: connector-key constraint intended for per-outlet keys but unmounted; archive store detached from mounted path.

---

## 6. Security, Legal & Abuse Risks

- **Crawl4AI**: RCE/SSRF/file-write/XSS/credential-exfil advisories. Must not be enabled without pinned reviewed version, network/filesystem/credential isolation, auth on, untrusted I/O.
- **Caption/OAuth**: YouTube captions require OAuth; public video does not imply general download right. Must not build unauthorized caption vault.
- **Political neutrality**: bot signals must never use political viewpoint/race/religion/candidate. Taxonomy must avoid clinical labels for humans; only evidence-cited public-record patterns with human review.
- **Defamation / epistemic safety**: opaque truthfulness % banned; use claim-level states (supported, contradicted, etc.) with ranges and calibration version. No autonomous verdicts.
- **LocalStorage**: although policy excludes PII, browser store is vulnerable to clearing; if any proxy identifiers leak, risk. Prefer server store.
- **Rate limits / robots / ToS**: browser-assisted capture must remain page-scoped, policy-gated; no bypass of auth/CAPTCHA/queues.
- **MCP writes / purchase execution**: must remain disabled (see must-not-build-yet).

---

## 7. Product & UX Gaps – Desktop & Mobile (Stress-Test)

- **Dense desktop workflows**: Command-bar WIP (Phase 128) uncommitted; no proof of integrated command receipt. Evidence graph exists but not mounted in Newsroom. Need compressed panels: source list, claim badges, evidence sidecar.
- **Mobile**: Main bundle 590 kB impedes low-end mobile; refactor branch 81 kB gzip not merged. No responsive proof for `NewsroomShell` on small screens.
- **Information compression**: Replace any % with claim-level chips (e.g., “mixed”, “context omitted”) + expandable evidence. Not implemented per packet.
- **Evidence explanations**: AI run metadata (provider, model, version, prompt version, evidence IDs, cost, confidence, review state) required but not shown in UI.
- **Alert triage**: Watches/alerts blueprint only; no mounted triage queue, severity sorting, or mute/unmute.
- **Accessibility**: No mention of ARIA, keyboard nav, contrast. Must be added before ship.
- **Failure states**: Empty `federal_register` (dormant), auth failure, localStorage wipe, offline – no documented fallback. Need explicit empty/error components.
- **Demo vs real**: Demo mode uses fixtures; risk of confusion if not watermarked.

---

## 8. Prioritized 90-Day Sequence + Must-Not-Build-Yet (Requested #2, #8, #9)

**Branch convergence (Decision #2)**: P0. Preservation-first integration order:
1. Freeze `main` WIP: commit Phases 127.5/6/128 to branch `wip/civic-127.5-128` (do not lose dirty state).
2. In `refactor/shell-rebuild-20260721` (local `4f001fa`): fix missing smoke scripts + 3 test failures; run full CI.
3. Merge `refactor` into `main` via PR after green; keep legacy `App` tests tagged `noncanonical`.
4. Then port `wip/civic-*` onto merged base; resolve conflicts.
5. Planning branch remains separate (future program only).

**90-Day Plan** (each with acceptance tests + rollback):

- **Days 1–15**: Test/package-script repair + branch converge.  
  *Acceptance*: `npm test` 0 failures, all smoke scripts present, CI green.  
  *Rollback*: revert merge if archive rewire regresses.

- **Days 16–30**: Rewire mounted Newsroom to `/api/civic/archive` (Postgres); demote localStorage to draft cache.  
  *Acceptance*: record created via UI appears after reload from API; test with auth.  
  *Rollback*: feature flag to revert to localStorage.

- **Days 31–45**: Source Registry approval gate + RSS/Atom ingest worker (official APIs only).  
  *Acceptance*: default-off manifest becomes live after owner enable; ingested item appears in mounted Feed with provenance.  
  *Rollback*: disable worker, keep federal_register only.

- **Days 46–60**: Dedupe + clustering + claim extraction MVP (claim-level labels).  
  *Acceptance*: two similar items collapse; claim badge renders with state.  
  *Rollback*: hide clustering UI.

- **Days 61–75**: Alert triage + watches + accessibility pass (keyboard, ARIA, mobile layout).  
  *Acceptance*: alert queue sorts by severity; Lighthouse a11y > 90.  
  *Rollback*: flag off alerts.

- **Days 76–90**: Mobile bundle optimization, evidence-explanation UI, failure-state components, final OSIR re-audit.  
  *Acceptance*: mobile bundle < 150 kB gzip, empty/error states documented.  
  *Stop conditions*: any data-truth defect open, or test gap > 0.

**Must-Not-Build-Yet List** (Requested #8):
- Autonomous fact verdicts / claim adjudication without human review.
- Bot certainty counts or clinical mental-state labels.
- General social-network scraping (X, Bluesky, Reddit, Meta, TikTok broad live connectors).
- MCP write operations or general MCP server driving canonical services.
- Purchase execution (except future retailer-approved, policy-compliant actions).
- Unauthorized YouTube caption vault / OAuth bypass.
- Crawl4AI until isolated & pinned.
- Omitted product area via cloud review (local audit lane only).
- Any claim of “live/deployed/safe” without verified receipt.

---

## 9. Residual Unknowns & Exact Probes

| Unknown | Probe to resolve |
|---------|------------------|
| Are the 15 unpublished commits fixing smoke scripts? | `git diff 4f001fa origin/refactor/shell-rebuild-20260721 -- package.json` |
| Does `/api/civic/official-sources` return data in test env? | Authenticated curl with owner-enabled config; inspect 100-record limit. |
| Is legacy `App` referenced by any dynamic import? | Static analysis of `RootApp.tsx` + bundle tree. |
| Does refactor branch include archive service wiring? | Grep `createHttpStoryService` vs `/api/civic/archive` usage in `4f001fa`. |
| Any hidden deployment? | Request deploy logs, DNS, uptime monitors. |
| Mobile rendering of NewsroomShell? | Emulate at 360px width; check overflow. |
| Accessibility state? | Run axe-core on mounted demo. |
| Calibration version for participation signals? | Inspect code for `coordination likelihood` range output. |

---

## 10. Attestation

Per packet instruction: **I do not claim live, deployed, complete, or safe without evidence in this packet.** All verdicts are `UNPROVEN` for runtime beyond described mounts. The strongest branch is not merge-ready. Product truth requires the corrections above before any `APPROVE` is possible.

**HY3 sign-off**: `REVISE` issued; re-audit after Days 1–45 sequence with green tests and archive rewire.
