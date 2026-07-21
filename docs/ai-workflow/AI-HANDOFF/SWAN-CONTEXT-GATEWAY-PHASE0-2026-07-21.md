---
decision: Phase 0 foundation for the Swan Context Gateway — local-launcher inventory, threat model, authority map, and historical retrieval benchmark, per Fable's APPROVE-WITH-AMENDMENTS ruling on the 2026-07-21 deep-research brief.
status: open
supersedes: none
---

# Swan Context Gateway — Phase 0 (2026-07-21)

**Authorized by:** Fable Final-Decider ruling 2026-07-21 (APPROVE WITH AMENDMENTS on the ChatGPT-Pro deep-research brief).
**Branch:** `feat/swan-context-gateway`, clean worktree from origin/main @ `eb4bbdd63`.
**Scope:** documentation only — no runtime code, no provider calls, no Linear writes.
**Not authorized (standing):** vector RAG, knowledge graph, whole-repo provider uploads, transparent API proxy, public MCP exposure, unbounded tools, raw packets in Linear (Rule 72 + Fable ruling).

---

## 1. Local-only launcher inventory `[VERIFIED 2026-07-21]`

Tracked on origin/main: `consult-codex.mjs`, `consult-gemini.mjs`, `consult-codex-via-openrouter.mjs` (+ review variants).
**Local-only, absent from origin/main:** `consult-fable.mjs` (121 lines), `consult-kimi.mjs` (132), `consult-sol.mjs` (120). Repo docs/skills reference them; a clean checkout cannot run them. Phase 2 must migrate them into committed adapters.

### Shared core (identical across all three — extract to `scripts/lib/`)
| Concern | Behavior worth preserving |
|---|---|
| .env loader | Reads `.env` + `backend/.env`, splits on `/\r?\n/` (**CRLF-aware — the tracked `consult-codex-via-openrouter.mjs` has the '\n'-split latent bug**, flagged in consult-fable.mjs:31-32; Rule 20 sibling fix owed) |
| Key handling | `OPENROUTER_API_KEY` used only in Authorization header, never echoed (Rule 59) |
| Arg parser | Minimal `--name value` positional scan; `--document`, `--seed`, `--out`, `--remit` |
| Transport | OpenRouter `chat/completions`, `HTTP-Referer: sswanstudios.com`, AbortSignal timeout |
| Receipt | Markdown verdict doc with model, doc path, tokens in/out, computed cost, wall time |

### Per-launcher deltas
| Launcher | Model default | Env overrides | Pricing (hardcoded) | Remit / policy |
|---|---|---|---|---|
| consult-fable | `anthropic/claude-fable-5` | `SWAN_FUSION_JUDGE_MODEL` | $10/M in, $50/M out | Final-Decider hostile ruling; temp 0.25; 10-min timeout |
| consult-kimi | `moonshotai/kimi-k3` | `SWAN_KIMI_MODEL/_EFFORT/_MAX_TOKENS/_TIMEOUT_MS`, `--max-tokens` | $3/M in, $15/M out | Design/front-end ONLY — **Chinese provider, lowest-sensitivity slot; never security/auth/billing/PII docs**; `reasoning.effort`; high-effort + low cap can burn budget on reasoning → empty message (known gotcha) |
| consult-sol | `openai/gpt-5.6-sol` | `SWAN_SOL_MODEL/_EFFORT` | $5/M in, $30/M out | Codex-equivalent hostile gate; temp 0.2; `reasoning.effort` |

**Adapter-migration requirements (Phase 2):** one shared env-loader/transport/receipt module; per-provider config objects (model, pricing, remit, sensitivity ceiling, effort support); pricing moved from hardcoded comments to a small registry with a verified-date field; the CRLF fix applied to the tracked openrouter sibling; provider **sensitivity ceiling enforced in code** (Kimi packet compiler must apply the lower-sensitivity egress profile automatically, not by convention).

---

## 2. Threat model (gateway = an autonomous read tool; each row needs a fixture in Phase 1 tests)

| # | Threat | Mitigation | Gate |
|---|---|---|---|
| T1 | Path traversal / sibling-prefix escape (`../`, `SS-PT-evil/`) | Separator-aware containment on `realpath`, inverted design-brain jail (must resolve INSIDE repo root); never `startsWith(resolve(ROOT))` alone | All traversal fixtures denied |
| T2 | Symlink / junction pointing outside repo | `realpathSync` before read; refuse when real path exits root (pattern: `scripts/design-brain/src/paths.mjs`) | Symlink fixtures denied |
| T3 | Secret egress (.env, keys, JWTs, DB URLs) | DENY class for secret-bearing paths (Rule 59 list); write-time secret scan on every packet before it leaves | Zero leaks on fixture corpus |
| T4 | PII egress (client names, emails, medical) | Extract backend sanitizer into pure module; counts-not-values reporting; provider sensitivity ceilings | Zero leaks |
| T5 | Binary / giant / LFS / submodule reads | Binary sniff, size cap, `git ls-files` universe only | Fixtures safely handled |
| T6 | Stale/contradictory evidence ("confidence laundering") | Authority resolver (§3); catalog `source-SHA12` freshness check — stale row = rejected; agent-authored docs never self-corroborate | Authority beats superseded docs |
| T7 | Fabricated citations | Immutable evidence IDs (`[E014:L91-L138]`); verifier checks ID ∈ packet and range ⊆ window | 100% packet-grounded |
| T8 | Cost runaway | `compile` = $0/no-network always; `SWAN_CONTEXT_MAX_USD` cap + pre-call estimate (Village pattern) | Cost recorded < manual baseline |
| T9 | Destructive "sanitization" of evidence | Repo content is quoted untrusted evidence; secret/PII egress scan only — NEVER the chat-command input sanitizer (it mangles `import(`, SQL, role JSON, truncates at 2k chars) | Evidence byte-identical modulo redaction |
| T10 | Provider-policy bypass | Sensitivity ceiling resolved from provider registry at compile time; Kimi ceiling < Fable/Sol; local models may receive LOCAL_PRIVATE | Policy fixtures denied |
| T11 | Provenance confusion (Rule 68) | Packet + receipt stamp `originating_model`; sub-Fable output quarantined from Hermes learning corpus | Stamp present on every receipt |
| T12 | Prompt injection via repo content | Evidence delimited as quoted untrusted material; system remit instructs model to treat evidence as data | Documented; adversarial fixture in benchmark |

Privacy classes (from the original plan, adopted): `SAFE_REPO` / `INTERNAL_REDACTED` / `LOCAL_PRIVATE` / `DENY`.

---

## 3. Authority map (A0–A5, concrete repo mappings)

Higher tier wins on conflict. Agent-authored tiers (A3/A5) may point at stronger evidence but never corroborate themselves.

| Tier | Definition | Concrete sources on origin/main |
|---|---|---|
| A0 | Current source, tests, migrations, runtime/Git state | `frontend/src/**`, `backend/**`, `scripts/**` code + tests; `git log/blame/ls-files` |
| A1 | Governing policy + explicit reality records | `CLAUDE.md`, `AGENTS.md`, `docs/brain/REALITY.md` (self-declared authoritative over unverifiable infra docs), `docs/ai-workflow/references/*.md` |
| A2 | Shipped receipts, accepted decisions | AI-HANDOFF docs with catalog `status: shipped|consensus`; audit records; CLOSEOUT artifacts |
| A3 | Open plans, proposals, review findings | AI-HANDOFF docs with `status: open`; debate files pre-consensus |
| A4 | Generated indexes / pointers | `docs/ai-workflow/CATALOG.md`, `.ai-workflow/CATALOG.local.md` — pointers only, never canon (Rule 72); stale `source-SHA12` ⇒ row rejected |
| A5 | Agent memos, brainstorms, prior model outputs | `docs/ai-workflow/brainstorms/`, hermes-inbox memos, gemini/codex consult outputs |

**First implementation (Fable amendment #1):** catalog `status` field + pinned A1 list + small hardcoded map. Known truth-conflict regression case: old operator registry (claims Obsidian/Graphify implemented) vs `docs/brain/REALITY.md` (declares them never-built) — REALITY.md must win.

---

## 4. Historical retrieval benchmark (24 cases)

Each case: a question the gateway will be asked, with **required files/surfaces** (recall target ≥90%) and **required tests/callers** (≥85%). Drawn from real incidents in AI-HANDOFF receipts + memory. Phase 1 formalizes each as a fixture with exact expected path lists; the incident receipt named in each row is the ground-truth source.

| # | Incident (date) | Question shape | Must retrieve (core) |
|---|---|---|---|
| 1 | Gummy scroll (07-16) | "Scrolling feels gummy app-wide" | unscoped `html,body{height:100%}` global CSS; body-as-scroller receipt |
| 2 | Schema-drift chain (05-01) | "Trainer assignments 403/500" | `TrainerPermissions.mjs` field map, `authMiddleware.mjs` raw SQL, `GlobalClientContext.tsx` normalizer |
| 3 | MyClientsView filter (05-01) | "Client list renders empty" | `assignment.isActive` vs `status` drift + API response shape |
| 4 | styled-components #12 crash (04-12) | "Admin dashboard down after deploy" | `AdminOverviewPanel.tsx` bentoItemAnimation; Rule 43; BUILD-HARDENING.md |
| 5 | Render boot crash — untracked files (04-12) | "Render crash-loops ERR_MODULE_NOT_FOUND" | Rule 42 audit commands; Swan Coach untracked file list |
| 6 | Express params reset (04-28) | "chartData gets empty userId" | `clientAnalyticsRoutes.mjs` router.use param, `chartDataController.mjs:87`; Rule 55 probe doctrine |
| 7 | Route shadowing | "/api/workout/sessions wrong handler" | mount order in server file; both workout route files; Rule 31 |
| 8 | Cart 404 (04-11) | "/api/cart/add 404 in prod" | cart route mount, storefront seeder state |
| 9 | Credential re-leak (04-19) | "Did this handoff leak secrets?" | SECURITY-REMEDIATION receipt; scan-secrets script; Rule 44 |
| 10 | consult-gemini argv bug (04-21) | "Gemini reviewed the wrong content" | `consult-gemini.mjs` arg parser + its parseArgs test |
| 11 | WSL bash preflight (04-20) | "Script fails only on Windows" | the shelling-out call site; platform notes |
| 12 | Wrong-client coach draft (07-21) | "Draft appears under wrong client" | `useCoachComposerDraft.ts:14-17` scoping + actorScope test |
| 13 | Aurora console context collapse (07-17) | "Skin leaks outside console" | `data-console-root` scoping; UniversalThemeContext vs `paletteThemeId` lying-gate |
| 14 | Point self-award CRITICAL (07-15) | "Can users grant themselves points?" | gamification award route + idempotency; security-sweep receipt |
| 15 | ACH double-grant (07-15) | "Sessions granted twice on ACH" | payment webhook handler + idempotency keys |
| 16 | Trainer isolation HIGH (07-15) | "Trainer sees other trainers' clients" | assignment-scoped queries; authMiddleware role checks |
| 17 | Emails in logs (07-15) | "PII in production logs" | logger call sites; PII sanitizer module |
| 18 | Dual users/"Users" FK (standing) | "FK violation inserting X" | migrations referencing both tables; gotcha doc |
| 19 | Storefront pricing (04-11) | "What are canonical package prices?" | seeder `20260407-seed-storefront-packages.mjs`; pricing memory/receipt |
| 20 | tsc-OOM lying gate (07-17) | "Type-check passed but didn't run" | W3 rebuild receipt; frontend tsc invocation |
| 21 | vitest-cwd lying gate (07-17) | "Tests green from wrong cwd" | same receipt; vitest config |
| 22 | Obsidian/Graphify truth conflict | "Is Graphify infrastructure live?" | `docs/brain/REALITY.md` MUST outrank old operator registry (authority regression) |
| 23 | Catalog staleness | "What did we decide about X?" (edited source) | stale `source-SHA12` row rejected; source doc re-opened |
| 24 | Kimi sensitivity ceiling | "Send auth-flow audit to Kimi" | compiler must refuse/downgrade packet (provider-policy regression) |

Cases 22–24 are policy regressions, not retrieval recall — they gate authority, freshness, and egress behavior.

---

## 5. Reuse pointers (extract, don't rewrite)

- **Safe-read jail:** `scripts/design-brain/src/paths.mjs` (realpath walk, segment checks, git-ancestor scan) — invert predicate to "must stay inside repo root"; `writer.mjs` for atomic write/audit patterns.
- **PII sanitizer:** `backend/middleware/piiSanitizationMiddleware.mjs` (SSN/email/phone/Luhn/DOB/address/insurance; hostile test `backend/tests/api/piiCreditCardHostile.test.mjs`) → extract to pure provider-neutral module; counts-not-values.
- **Catalog:** `scripts/catalog-regen.mjs` + `docs/ai-workflow/CATALOG.md` rows (`decision/status/source-SHA12`) = free supersession + freshness data.
- **Ingest prototype:** `scripts/brain/ingest_repo_corpus.py` = design precedent for derived-data tier only; NOT the compiler core.
- **Spend cap:** `SWAN_VILLAGE_MAX_USD` pattern in validation-orchestrator → `SWAN_CONTEXT_MAX_USD`. (Do NOT copy its `startsWith(resolve(ROOT))` containment — insufficient, see T1.)

## 6. Next slice

**Phase 1, slice 1:** `swan-context compile` skeleton — safe-read module extraction (+ its attack-fixture test suite from §2 T1/T2/T5) and packet/evidence-ID data model. Dry-run only, $0, no network. Benchmark fixtures (§4) formalized as the Phase 1 eval harness in the same workstream.
