# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** C:/Users/BIGOTS~1/AppData/Local/Temp/claude/c--Users-BigotSmasher-Desktop-quick-pt-SS-PT/8165aa9b-249b-40eb-909f-e8b5aa73ae42/scratchpad/tri-dashboard-kimi-seed.md
**Seed:** (none)
**Tokens:** 5438 in / 8157 out | **Cost:** ~$0.1387 | **Wall:** 244.5s | **finish_reason:** stop

---

# PART 1 — ADVERSARIAL CRITIQUE OF THE BRIEF

Before the rewrite: here's what's wrong, leading, or missing. Bluntly.

## 1.1 — Things that are wrong or overstated

**C1. The brief over-generalizes Sean's complaint.** Sean said "admin and trainer should be synchronous." He did *not* say the client dashboard should match. The brief silently expands the mandate to three-way unification — which directly collides with the trainer-indispensability doctrine it also insists on. The audit scope must be: **admin↔trainer parity where roles overlap; client divergence by design, made legible.** Don't smuggle in a scope expansion Sean never asked for.

**C2. §4.4's "deliberate decision" framing is doing too much work.** A code comment from 2026-07-29 is evidence of *a* decision, not evidence of a *correct* one, and it explains admin having "Log My Workout" — it does **not** explain why the trainer lacks an equivalent. Trainers also train. The asymmetry may be the actual drift: the exception was carved for Sean personally and never generalized. The brief treats the comment as exonerating; it's actually a suspect. The audit must adjudicate whether the trainer *should* have a personal logger, not just classify the current state.

**C3. §6/A1's binary classification is malformed.** "INTENTIONAL-ROLE-SCOPED vs ACCIDENTAL-DRIFT" forces every difference into two buckets, but the most important findings will be a third: **intentional divergence that is badly communicated** (presentation failure, not IA failure — exactly the §4.4 situation) and a fourth: **divergence that was intentional but is now wrong** (decision outlived its rationale). A two-bucket taxonomy will produce confidently wrong classifications. Fixed in the rewrite.

**C4. §6/A3 is a false dichotomy.** "One config vs. per-role divergence" omits the likely correct answer: **one config schema with role projections** — a single source of truth where each role's nav is a *derived view*, so divergence is declared in one place rather than re-implemented in three. As written, the question invites the auditor to pick a side instead of design the mechanism.

**C5. §6/B3 presumes consolidation.** "Propose the consolidation" assumes Teach Mode / Teach Me Guide / Holodex *should* merge. They may serve genuinely different intents (guided exercise instruction vs. product tour vs. reference lookup). The leading phrasing risks a forced merger that destroys a working surface (Holodex — the one Sean confirmed works). Reframed to intent-first.

**C6. D1 asks for "costs" with no costing unit.** Sean builds this himself. Effort must be denominated in **Sean-hours and calendar weeks of solo work**, with opportunity cost against client-facing feature work. "Effort" as an abstract number is unanswerable and will produce fantasy estimates.

**C7. "Rebuild from scratch is explicitly permitted" is quoted without the risk context that makes it evaluable.** A solo developer rebuilding a live, paying-client SaaS frontend is a 3–6 month freeze. That's not a stylistic preference, it's a business decision. The rewrite forces the rebuild case to prove it survives contact with that reality.

**C8. §4.6's failure-mode list omits the most likely unifying explanation.** Display *and* download both failed. If both share the same authenticated blob fetch (they almost certainly do — `useProtectedPlanPdfViewer.ts` is the single choke point), then **one failure explains both symptoms**, and the audit should look for a single root cause before enumerating six independent hypotheses. Also missing from the list: **expired/signed URL**, **Content-Type/Content-Disposition mishandling on the backend**, and **CORS on the blob fetch**. And the brief never states which role Sean was demoing as — presumably admin, but that's an assumption to verify, because §4.6's own last bullet (role/route divergence) depends on it.

## 1.2 — Structural gaps in the brief itself

**C9. The audit scope is frontend-only, but two of the three P0 bugs may be backend.** PDF generation/delivery lives in Express routes the brief never enumerates. `GET /api/exercises/:id/teach-mode` is mentioned once, as frontend context. You cannot root-cause "no PDF displayed" without auditing the API contract, the Sequelize query that resolves the plan, and the response headers. The rewrite puts the backend explicitly in scope.

**C10. No mention of the data-fetching/state layer.** React Query? Redux? Hand-rolled fetches? A "self-contained" audit prompt that doesn't state or ask this is incomplete — the PDF bug and the minimal-click analysis both depend on it. Flagged as a to-verify unknown.

**C11. E5 ("what should be deleted?") is unanswerable as written.** There is no usage telemetry mentioned anywhere in the brief. Deletion recommendations without usage data are opinion cosplaying as analysis. The rewrite makes "instrument first, delete later" an explicit finding, and reframes E5 as "what is a *candidate* for deletion, pending data."

**C12. A5 has a probable answer the brief dances around:** parity tests check *routes and structure*, not *pixels*. Three sidebars can pass every route-parity test while looking completely different, because no test compares rendered output. The missing guardrail is **visual regression testing** (screenshot diffing per role × breakpoint). The audit should confirm this hypothesis rather than rediscover it — and the fix (Chromatic/Percy/Loki + token-lint) should be in scope.

**C13. The responsive matrix is untestable as specified.** Eleven breakpoints × three roles × every surface, verified by a solo dev, is a recipe for "we checked a few." The rewrite imposes a tiered matrix: P0 breakpoints verified on everything, P1 on changed surfaces only.

**C14. No error-monitoring gap is named.** A client-facing failure was discovered *live in a demo*, not by an alert. If Sentry or equivalent isn't wired to the PDF path, that's a finding in itself.

**C15. Nothing addresses demo safety.** Sean demos live to clients. There is no staging environment, seeded demo account, or demo script mentioned. The incident repeats until demos never depend on unverified production state.

---

# PART 2 — THE ULTIMATE PROMPT

*(Self-contained. Feed this to any auditor with zero prior context.)*

---

# TRI-DASHBOARD UNIFICATION AUDIT — MASTER BRIEFING v2

## 0. YOUR MISSION

You are auditing **SwanStudios**, a production personal-training SaaS at sswanstudios.com (Render, paid tier, real paying clients today). Three role-based dashboards — **admin** (owner), **trainer**, **client** — have visibly drifted apart in navigation structure and styling. The owner discovered this live in front of a client when the Workout Planner's PDF viewer failed, the PDF download failed, and he could not locate "Teach Me" exercise content.

You will produce an **evidence-backed audit**, not opinions. Every claim must carry a confidence tag and, where applicable, a file:line citation:

- **[VERIFIED]** — you read the code/document directly
- **[INFERRED]** — reasoned from verified evidence; state the reasoning
- **[HYPOTHESIS]** — plausible but unproven; state what would prove it

Any answer presented without tags and citations is **wrong by definition**, regardless of content.

## 1. PRODUCT DOCTRINE (constraints that invalidate any violating recommendation)

1. **Trainer indispensability.** Clients get read + do, never decide. Switching active plans and editing plan data are trainer-only. Any IA proposal granting clients decision surfaces is invalid.
2. **Data truth.** Progress charts come from real logged workouts. Mock data is a gap to close, never a feature.
3. **Workout-progress-first.** Logging and progress must be immediately reachable on every dashboard.
4. **The core loop:** log workout → save diary → render progress proof → decide next action → share milestones.
5. **Business model:** trainer-led B2B2C. The moat is coach workflow depth + first-party data + paid accountability.

## 2. GROUND TRUTH (verified at `origin/main` @ `57ef01d43` — re-verify this commit before starting; main moves)

1. **Root cause of drift identified:** the admin sidebar (`Pages/admin-dashboard/AdminStellarSidebar.tsx`, 296 lines) is config-driven (imports `WORKSPACE_CONFIG` from `config/dashboard-tabs.ts:51`); the trainer (275 lines) and client (256 lines) sidebars are hand-rolled with inline nav. Each has its own `.styles.ts`. There is no shared sidebar component to keep consistent.
2. **The shared-tabs export is dormant:** `COMMON_DASHBOARD_TABS` (`config/dashboard-tabs.ts:26`) has zero runtime importers; only tests reference it.
3. **A naming-unification layer exists and works:** `config/canonical-surface-names.ts` is imported by all three sidebars. Names are unified; nav structure and styling are not.
4. **Admin "Log My Workout" is deliberate** per code comment at `config/dashboard-tabs.ts:195-199` (owner's personal log, distinct from logging a client's workout). Whether the *trainer* should have an equivalent is an **open question**, not settled by this comment.
5. **"Teach Me" is three different things:** (a) **Teach Mode** — exercise teaching content (`features/teach-mode/`, API `GET /api/exercises/:id/teach-mode`), mounted only via `Pages/admin-workout-planner/TeachModeSidebar.tsx`; (b) **Teach Me Guide** — a dashboard tour (`components/Shared/DashboardTeachMeGuide.*`, ~30 files); (c) **Workout Holodex** — exercise info on click, confirmed working by the owner. [HYPOTHESIS: Teach Mode was never mounted on trainer/client planner surfaces — verify via route config, not imports.]
6. **PDF path:** `useProtectedPlanPdfViewer.ts` (125 lines) fetches an authenticated blob via `normalizeProtectedPlanPdfUrl` and throws on falsy normalization. Layered services: `services/pdf/*`, `services/pdfExportService.ts`, `PdfApprovalVault.tsx`, planner-specific dialog/hooks/adapter. White-label branding (`services/pdf/brandIdentity.ts`, imported by the client sidebar) must survive any rework.
7. **Swan Lens** (theme system) is large and real: `core/style-lens-os/`, `adapters/style-lens-swan/` with named lenses and worlds, `v2/catalogV2Exemptions.ts` (likely enumerates non-governed surfaces), `Pages/workout-design-lab/`. **Known trap:** `UniversalThemeContext` ≠ Style-Lens `paletteThemeId` — surfaces have appeared themed while reading the wrong source ("lying gate"). Lens-connection claims must be proven per surface.
8. **Parity tests exist** (sidebar route parity, superset invariant, workout-first, icon coverage, mobile nav, trainer a11y/responsive contracts, lens runtime contract) and **must keep passing** — yet visual drift occurred anyway. These tests check routes/structure, not rendered output [INFERRED — confirm what each test actually asserts].
9. **Scale:** ~40 top-level entries under `components/DashBoard/`; 20+ files for one progress-charts grid; `UniversalDashboardLayout` split across 20+ files. This is a large, mature, heavily-tested surface built by one developer.

## 3. HARD CONSTRAINTS (a violating recommendation is invalid)

No Material-UI (styled-components only) · no hardcoded colors (`var(--token, #fallback)` always) · dark-first (`crystalline-dark`) · palette: Midnight Sapphire #002060, Royal Depth #003080, Ice Wing #60C0F0, Arctic Cyan #50A0F0 (charts only), Gilded Fern #C6A84B, Frost White #E0ECF4, Wing Purple #8B5CF6, Obsidian #0A0A0F, Carbon #141419, Graphite #1A1A24 · dual-button glow (blue bg→purple glow; purple bg→cyan glow) · RETIRED: Galaxy-Swan (#0a0a1a, #00FFFF, #7851A9) · typography: Plus Jakarta Sans / Cormorant Garamond Italic / Fira Code / Sora · 44px touch targets · WCAG 4.5:1 · 300-line file limit (extract at limit — note: consolidation must compose, not concentrate, or it will violate this) · Victory only for charts · `prefers-reduced-motion` respected · zero PII to LLMs · "26+ years experience," NASM-*protocol* (never "NASM-certified") · "stretching/flexibility," never yoga/meditation language · responsive matrix P0: 375/414/768/1440, P1: 320/1024/1280/1920/2560×1440/3840×2160/3440 ultrawide · client-management surfaces verified at phone width · data cards low-motion (no pointer tracking, no hover-only actions); showcase cards may animate fully.

**Unknowns you must establish, not assume:** data-fetching/state layer (React Query? Redux? hand-rolled?) · where design tokens are defined and whether the palette is already tokenized · error-monitoring coverage (Sentry or equivalent) · which role the owner was demoing as when the PDF failed · whether usage analytics exist anywhere.

## 4. AUDIT QUESTIONS

### A. Structural coherence

**A1.** Enumerate every tab/nav entry for all three dashboards (table: surface id, label, route, testId, per-role presence). Classify each *difference* into one of four buckets: **ROLE-SCOPED-CORRECT** (client must not log client workouts) · **ACCIDENTAL-DRIFT** (same job, diverged) · **INTENTIONAL-BUT-ILLEGIBLE** (deliberate divergence the UI fails to communicate — e.g., the admin personal logger) · **LEGACY-DECISION-NOW-WRONG** (rationale expired). *An answer is wrong if: it uses fewer than four buckets; it classifies without citing the code comment or commit rationale behind each "intentional" call; it treats label differences as drift when labels are intentionally role-voiced.*

**A2.** Should the trainer have a personal "Log My Workout" equivalent to admin's? Trainers train. Adjudicate with product reasoning, not symmetry aesthetics. *Wrong if: it assumes symmetry is inherently correct, or treats the existing code comment as settling the question.*

**A3.** Design the shared IA: one config schema with **role projections** (single source of truth; each role's nav is a declared, derived view — divergence lives in one file, not three components). Specify the role-capability model that drives projection. *Wrong if: it proposes three per-role configs (recreates drift); it proposes one flat config with runtime `if(role)` branching scattered in components (untestable); it grants clients decision surfaces.*

**A4.** Why did `COMMON_DASHBOARD_TABS` die unused? Identify the mechanism (no import-site enforcement? no ownership? superseded by `WORKSPACE_CONFIG`?) and specify what prevents the replacement from dying identically. *Wrong if: the prevention plan is "documentation" or "discipline" — the answer must be structural (enforced by lint, test, or type).*

**A5.** Why did existing parity tests fail to prevent visual drift? Confirm or refute: they assert routes/structure, never rendered output. Specify the guardrail that would have caught it (visual regression per role × P0 breakpoint; token-lint blocking hex literals; a shared-sidebar contract test). *Wrong if: it recommends more tests of the same kind that already failed.*

### B. The three P0 bugs

**B1. PDF display + download.** Both failed simultaneously — hypothesize a **single shared failure point** first (the blob fetch is one choke point), then test alternatives. Trace end to end, frontend AND backend: UI trigger → hook → URL normalization → API route → auth → Sequelize query → response headers (Content-Type/Content-Disposition) → blob → object URL → render / download. Also test: approval-vault gate holding the plan unapproved; expired/signed URL; CORS on blob fetch; generation never ran (data problem in UI costume); role/route divergence. Preserve white-label branding. Name the exact failure point with evidence (network response, server log, or reproduction). *Wrong if: it fixes the viewer without checking whether generation ran; it proposes frontend-only remediation without auditing the API contract; it breaks per-client-type branding; it "fixes" by adding a retry without naming the cause.*

**B2. Teach Mode placement.** Confirm or refute via route/mount config (not imports) that Teach Mode is admin-planner-only. Then decide where it *should* live per role, given doctrine (clients get read+do — is consuming teaching content "do"? Argue it). *Wrong if: it verifies mount scope via import statements alone; it recommends mounting everywhere without a permission argument.*

**B3. Three exercise-info surfaces.** Define the **user intent** each surface serves (guided instruction / product orientation / reference lookup) *before* proposing anything. Then classify each as canonical/legacy/dormant/competing, propose consolidation or coexistence-with-renaming, and propose names that can't be confused. *Wrong if: it presumes merger (the working Holodex may be the canonical surface to extend, not fold); it keeps any name containing "Teach" for more than one system.*

### C. Styling & Swan Lens

**C1.** Starting from `catalogV2Exemptions.ts`, enumerate every dashboard surface not lens-governed, with per-surface proof (which theme source it actually reads). *Wrong if: any claim rests on the surface "looking themed" — the lying-gate trap.*

**C2.** Design how lens coverage becomes structurally unskippable for new surfaces (gate in `SurfaceLensGate`? registry requirement? CI check that fails on unregistered surface?). *Wrong if: it relies on code-review vigilance.*

**C3.** Audit Swan Lens itself: architecture, ergonomics for a solo dev, performance (runtime cost of lens resolution on low-end phones), gaps, upgrades. The owner explicitly wants suggestions here — this is a deliverable, not a courtesy.

**C4.** Propose the permanent elimination of the `UniversalThemeContext` vs `paletteThemeId` duality: one source of truth, one consumer hook, a codemod or lint rule for stragglers.

**C5.** Specify the shared-primitive library (Sidebar, TabBar, PageHeader, DataCard, EmptyState, ErrorState, LoadingState): each primitive's props contract, token usage, motion budget, and which existing components it absorbs. Mind the 300-line limit — compose, don't concentrate.

### D. Rebuild vs refactor

**D1.** Recommend shared-primitive extraction vs. ground-up rebuild vs. hybrid, costed in **Sean-hours and solo-dev calendar weeks**, with regression risk and business risk to live paying clients. Include opportunity cost. *Wrong if: costs lack units; it recommends a rebuild without a migration plan that keeps production green weekly; it refuses a rebuild on vague risk grounds without comparing against the known cost of maintaining three hand-rolled sidebars.*

**D2.** If any rebuild component: strangler-fig path — route-by-route or surface-by-surface behind the existing shell, with rollback per slice.

**D3.** Slice plan: independently shippable slices, each with acceptance criteria executable with zero further questions, each ≤ one week of solo work, ordered by (client-facing risk reduction ÷ effort).

### E. Gaps, friction, mobile

**E1.** What would a best-in-class trainer-led platform have that these dashboards lack? Benchmark explicitly against trainer-workflow tools, not consumer fitness apps.

**E2.** Minimal-click analysis: count taps today for the live-session loop (find client → start session → log set → save → show progress) and each dashboard's top-3 tasks; propose target counts with before→after tables. Consider a command palette / global client search as a structural click-reducer.

**E3.** What's duplicated across the three dashboards that should be one component (beyond the sidebar)?

**E4.** Trainer mid-session on a phone in a gym: what's desktop-shaped that shouldn't be? Include poor-network behavior (gym wifi) — retry states, offline tolerance of the logging loop.

**E5.** Deletion **candidates**, each tagged "pending usage data." State the instrumentation needed (event tracking per tab) before any deletion is executed. *Wrong if: it recommends deleting anything on aesthetic grounds alone.*

### F. Meta

**F1.** What is this brief wrong about or missing?
**F2.** What must be verified before code, because acting on it while wrong is expensive? (Minimum: the §2 hypotheses, the data-layer unknown, the demo role, the commit hash.)
**F3.** What should the design pass (HY3) be asked?
**F4.** What genuinely contested calls should go to a multi-model panel rather than one model deciding? (Candidates: trainer personal logger; Teach-surface consolidation; rebuild vs. refactor.)

## 5. DELIVERABLE FORMAT

Per question: finding (tagged, cited) → classification or decision → recommendation → what would prove this wrong. Then: consolidated slice plan (D3), regression-contract additions (A5), and a one-page executive summary for the owner.

---

# PART 3 — RECOMMENDED SEQUENCING (multi-pass plan)

| Pass | Angle | Why this order |
|---|---|---|
| **0. Recon re-verification** | Confirm commit hash; resolve the five "unknowns to establish" (§3); capture the PDF failure's actual network response | Everything downstream cites these; cheap to do, expensive to skip |
| **1. Bug forensics (B1–B3)** | Root-cause the three P0s | Client-facing credibility; independent of architecture; fixes can ship while design work proceeds |
| **2. Structural audit (A1–A5)** | Tab inventory, four-bucket classification, config-schema design, guardrail post-mortem | Produces the IA decisions the design pass depends on |
| **3. Lens & styling audit (C1–C5)** | Exemptions, lying gate, primitive contracts | Needs A's surface inventory as input |
| **4. HY3 design pass** | Runs **parallel after Pass 2**, fed A's classification + C1's exemption map | Design shouldn't wait for D, but must not design over undecided IA |
| **5. Friction & mobile pass (E1–E5)** | Tap counts, phone-width trainer flow | Needs working knowledge from 1–3 to count clicks accurately |
| **6. Rebuild-vs-refactor synthesis (D1–D3)** | Costed recommendation + slice plan | Last, because it consumes every prior pass's findings |
| **7. AI Village adjudication** | Only the contested calls (F4) | Panels adjudicate; they don't audit |
| **8. Final decision pass** | Merge all passes into the decision document for Sean | — |

# PART 4 — QUESTIONS FOR HY3 (design/UI-UX pass)

1. **Token architecture:** design the full design-token schema (color, spacing, type scale, elevation, motion, glow) implementing the Crystalline Swan palette, such that hex literals can be lint-banned. Where do tokens live so styled-components and the PDF branding layer share one source?
2. **Role differentiation without drift:** how should admin/trainer/client dashboards read as *one product with three permission levels* — same chrome, role-voiced labels? Specify exactly what varies per role (accent? density? labeling?) and what must never vary.
3. **Communicating intentional asymmetry:** design the UI pattern that makes "admin has a personal logger, trainer doesn't" (or its resolution) legible rather than confusing — tooltip, grouping, section labeling?
4. **Shared-primitive visual spec:** full spec for Sidebar, TabBar, PageHeader, DataCard, Empty/Error/Loading states — states, tokens, motion budget, 44px targets, reduced-motion fallbacks.
5. **Dual-Button Glow systematized:** exact rules (tokens, intensity, dark-bg contrast) so it's a system, not a vibe — and verify 4.5:1 contrast under glow on Obsidian/Carbon/Graphite.
6. **Typography roles:** concrete usage rules for the four fonts (which is UI chrome, which is data, when Cormorant Italic is permitted without becoming costume).
7. **Chart palette governance:** spec Victory theming so Arctic Cyan stays charts-only, charts are lens-aware, and charts read on low-end phone screens in gym lighting.
8. **Phone-width trainer session UI:** design the logging loop for one-handed, between-sets use — what's the minimum viable tap target layout at 375/414?
9. **Density vs. touch targets:** data-dense trainer client-management tables at phone width without overlap, clipped text, or hover-only actions — what's the pattern (stacked cards? progressive disclosure?)?
10. **Motion tiers:** codify the two-tier motion rule (data cards low-motion vs. showcase cards full treatment) into checkable rules, including `prefers-reduced-motion` behavior per tier.
11. **White-label as a lens:** should per-client-type branding (Move Fitness) be modeled as a Swan Lens variant? Design the mechanism so white-label is governance, not a fork.
12. **Teach Mode UX:** design the exercise-teaching experience (video, phases, cues) for trainer-demo and client-self-serve contexts — same surface, two audiences?
13. **PDF viewer design:** the viewer and its error/empty/approval-pending states — the failure Sean hit should have *looked* like something actionable, not a blank.
14. **Swan Lens ergonomics:** from a designer's seat, what's wrong with the lens authoring experience (`workout-design-lab`, manifests, catalogs)? What would make lenses the path of least resistance?
15. **4K/ultrawide behavior:** what should dashboards do at 2560×1440 and 3840×2160 — max-width shell, multi-column, or true responsive? (P1, but decide once.)
16. **Command palette:** if E2 recommends one, design it — client search, tab jump, quick-log.

# PART 5 — MY GAP LIST (what neither Sean nor the brief author covered)

1. **Backend is in scope.** PDF routes, the teach-mode endpoint, auth on blob fetches, response headers. Two of three P0s may be server-side.
2. **Server-side permission audit.** Trainer indispensability must be enforced by the API, not just by hidden tabs. Verify client-role tokens are rejected from trainer endpoints — hidden UI is not a permission model.
3. **No usage telemetry = no deletion authority.** Instrument tab/surface events before E5 can be answered honestly. Also: telemetry answers "which dashboards do clients actually open."
4. **Visual regression testing is the missing guardrail.** Parity tests assert structure; pixels drifted. Screenshot diffing per role × P0 breakpoint + token-lint is the actual fix for A5.
5. **Error monitoring.** The PDF failure was discovered in a live demo, not by an alert. Wire client+server error reporting on the PDF path at minimum.
6. **Demo safety infrastructure.** Staging environment or seeded demo account + demo script, so client demos never depend on unverified production state. The incident class repeats until this exists.
7. **Gym-network reality.** Trainer logging must tolerate bad wifi: optimistic writes, retry queues, offline indication. Untested assumption in the whole brief.
8. **Concurrency.** Trainer edits a plan while the client views it — stale-state behavior is undefined and will surface during any PDF/plan rework.
9. **Empty-state design is a data-truth issue.** New clients have no logged workouts; "charts from real data" means designing honest empty states, or the data-truth doctrine produces blank screens.
10. **Config schema versioning.** If nav becomes one config with role projections, schema changes need migration discipline and an ADR trail — so the next "why does admin have this tab?" question is answered by a decision record, not archaeology. Write the ADR for §4.4 as part of this workstream.
11. **The 300-line rule vs. consolidation tension.** A unified config or shared sidebar will hit the limit fast; mandate composition patterns up front or the refactor violates its own constraints.
12. **Accessibility parity.** Only the trainer dashboard has an a11y contract test. Admin and client need equivalent contracts — the client dashboard arguably needs it most (broadest user population).
13. **Cost unit discipline.** All estimates in Sean-hours. Every "quick win" claim should be treated as a lie until sliced to ≤ one week.
14. **The comment-as-decision problem.** §4.4 taught us: rationale lives in code comments invisible to product. Institute lightweight ADRs for role-scoping decisions going forward, or every future auditor relitigates settled questions — and occasionally overturns correct ones.

**One correction summary for the record:** I reframed Sean's complaint as admin↔trainer parity (his actual words) rather than three-way unification (the brief's expansion); replaced the two-bucket drift taxonomy with four buckets; replaced A3's false dichotomy with config-schema-with-role-projections; de-led B3; added backend, telemetry, visual-regression, demo-safety, and network-resilience scope; and re-tiered the responsive matrix into testable P0/P1 bands. Everything else in the seed's §4 verified findings stands and is carried into the master briefing unchanged.
