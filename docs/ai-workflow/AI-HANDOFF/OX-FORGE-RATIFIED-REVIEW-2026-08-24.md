# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** docs/ai-workflow/brainstorms/component-forge-catalog-2026-08-24.md
**Seed:** (none)
**Tokens:** 5852 in / 6814 out · **Cost:** ~$0.0000 · **Wall:** 305.7s · **finish:** stop

---

# OX ALPHA — HOSTILE PASS, ROUND 3 (v0.3)

## Part 1: Did my v0.1 breaks survive the amendments?

| Break | Status | Evidence |
|---|---|---|
| #1 Variant layer | ✅ Held | §1.2, strengthened by A1 (focus order core-invariant) and A3 (variants under rule-of-two) |
| #2 Dark-first-not-law | ✅ Held | §1, reinforced by §9.1 (light pack pulled into Phase 1) |
| #3 Three-tier tokens | ⚠️ Held on paper | §1 — but the promised **codemods have no owner, no phase, no deliverable line anywhere in §6**. A deprecation window without scheduled codemod tooling is a promise to future-you. |
| #4 Styling runtime | ⚠️ Held, then wounded | D2 ratified, but A5(iv) reintroduces a token-split problem — see Part 3, Finding 1 |
| #5 Rule-of-two | ✅ Held, strengthened | B1's downgrade of SwanGuard to "planned profile" + "unbuilt sites never satisfy rule-of-two" is the correct ruling — but see Finding 3 on D6's replacement evidence |
| #6 Chart adapter | ✅ Held | A6, correctly deferred |

All seven additions (#1–#7) are present and wired. No regression to REJECT-level. Now the attacks.

## Part 2: §11 adjudications — paper vs. substance

**A5(iv) is substantively WRONG, and it's the load-bearing wall of D2 interop.** "Forge reads only custom properties, which SC-styled hosts already see natively" — false. styled-components' `ThemeProvider` distributes a **JS object**, not CSS custom properties. An SC host does not emit `--sw-*` variables onto `:root` unless someone writes code that maps them. By banning the "ThemeProvider bridge," A5(iv) hasn't eliminated the bridge problem — it has created a **dual source of truth**: SS-PT's SC theme object and the crystalline-swan pack must be kept in sync by hand, and the drift-linter (§4, A2) scans raw hex and `var()` defaults — it does **not** scan SC-theme-object-vs-pack divergence. This is precisely the fork-by-drift failure the whole governance apparatus exists to prevent, introduced by the amendment meant to prevent forks. The fix is trivial (generate the SC theme *from* the pack file, one-way, or relax the ban to permit a one-way generator) but the plan currently ships a false claim as a resolved interop guarantee, to be "proven" at Phase 1.5 — where it will fail exactly as described here.

**B1's D6 re-adjudication is honest in form, unverified in provenance.** The corrected grounds cite `Hero-Section.V2.tsx`, `videoAssets.ts`, `StoreV2.tsx`, `StoreV3.tsx`. C1 just taught this panel that the repo carries **stale-tree duplicates** (`buttons/GlowButton.tsx` vs `ui/GlowButton.ts`). The B1 evidence says "in-repo" — it does not say **origin/main**. If StoreV2/V3 live only in the wip tree, D6 stands on contaminated evidence, the exact error class C1 caught. Additionally: the **scroll-bound-video variant** is promoted to day-one (§2, D6) on no cited consumer at all. Under A3 — which this same section adopts — a variant needs a demonstrated second consumer or a written Sean exception. Neither exists on paper. One of those two things must happen before Phase 2.

**B2–B8 adopted, but the gate arithmetic is broken.** §3's hard gate: Phase 3 begins when **F1+F3 merge**. B2–B8 hardening happens "**before contract v1 locks**," and §9.2 says the contract is derived only after S1+S2 merge. Sequence as written: F1+F3 merge → Phase 3 frontend starts → contract derived → hardened → locked. That means the flagship organism is built against an **unlocked contract** missing TTL, job-status lifecycle, and target-gone semantics — the exact churn B2–B8 exist to prevent. The gate must be contract-v1-**lock**, not F1+F3 merge. Relatedly: with B7's conformance profiles, the §3 Prism-class mock must be told **which profile to enforce per run** — unspecified. A conformance mock without a profile selector tests nothing well.

**C3 adopted, but the ledger has no teeth definition.** EXCEPTIONS.md fields (owner/reason/expiry/review) are defined; the behavior of an **expired** exception is not. Does the linter escalate? Block? Who is notified? And the transition from report-only (Phase 1) to enforcing (D4 rule lands at Phase 1 close) has no amnesty/migration plan — Day 1 of enforcement flags every violation accumulated during the report-only window with no triage protocol. That's how linters get disabled within a week.

## Part 3: NEW defects — amendment interactions

**Finding 1 (Critical): A5(iv) vs D2 — the SC/custom-property split.** Covered above. This invalidates the Phase 1.5 acceptance design as currently specified.

**Finding 2 (Critical): Phase 1.5 gate vs §10.3a push cadence — direct contradiction.** §10.3a: push to main = **additive-only content, root package.json untouched**. Phase 1.5 (C2): Forge Button live on a real production surface via **strangler PR #1** — which by definition *modifies* consumer code and is the opposite of additive. Worse: D3 puts the Forge in a workspace inside SS-PT, and **npm workspaces require editing root package.json**; pnpm needs `pnpm-workspace.yaml`. The plan never names the package manager, so nobody can say whether "root package.json untouched" is even satisfiable while registering the workspace. As written, the plan forbids itself from executing its own strongest gate. Either the push policy is per-phase (and must say so, with a distinct protocol for the Phase 1.5 strangler PR including rollback), or the workspace registration mechanism must be specified as manifest-free.

**Finding 3 (High): D6 evidence provenance + scroll-video variant vs A3.** Covered in Part 2. Verify on origin/main or demote.

**Finding 4 (Medium): Phase 3 gate timing.** Covered in Part 2. Move gate to contract-v1-lock.

**Finding 5 (Medium): R5's 20% cap vs Phase 1's actual scope.** Phase 1 now bundles: three-tier schema, 4 primitives, TWO packs, gallery-as-test-gate skeleton, drift-linter, exception ledger, router step (§9.3), vault integration (§10.3), logical-properties i18n baseline. Is the 20% catalog-tax cap (§4) binding on Phase 1 itself? If yes, Phase 1 is silently multi-sprint and the §6 sequencing is fiction; if no, the cap has an unstated exemption. Say which.

**Finding 6 (Low): Gallery matrix has no CI-time budget.** §5.3 screenshots the full component × pack matrix (now × variants per A1/A3, × states per §1) on every PR; §5.4 budgets KB but not minutes. With T1+Hero+shell+cluster+auth+chart by Phase 2, this matrix becomes the PR latency bottleneck. Name a runtime budget and a sharding/sampling strategy now.

**Finding 7 (Low): Two version axes, one tag namespace.** §3 declares contract-semver ≠ component-semver; C6 defines only `forge-vX.Y.Z`. Contract releases have no tagging/release mechanics. Trivial to fix, embarrassing to discover mid-Phase 3.

## Part 4: First Render push safety (additive-only packages/swan-forge + docs)

The push is safe **iff** all of the following hold — none are currently written down:

1. **Zero bytes outside `packages/swan-forge/**` and `docs/**`.** No `pnpm-workspace.yaml`, no root manifest edit, no lockfile touch (see Finding 2 — this must be decided *before* the push, not after).
2. **No new root/dev dependencies.** Gallery tooling (Chromium/Playwright-class) and the drift-linter's deps must not enter the root lockfile in this push, or Render's build/install steps change behavior on a supposedly inert commit. Dev-only, package-scoped, or deferred.
3. **Deploy pipeline indifference verified, not assumed:** confirm Render's build command ignores unknown directories and that a postinstall/prebuild hook can't be shadowed by the new package.
4. **Drift-linter confirmed report-only in this push** (C3) — with 84 GlowButton consumers on main, an enforcing linter would fail CI on arrival.
5. **Rule 42 audit precedes push** (already stated §10.3a — keep it as a hard precondition, not a habit).
6. **Nothing imports the package yet.** The moment any consumer file references `swan-forge`, this stops being an additive push. Phase 1.5 is that moment — it needs its own push class, deploy, and rollback plan (Finding 2).

If those six hold, the first push is genuinely low-risk: worst case is a wasted deploy of an unchanged app.

---

## VERDICT: **REVISE**

The architecture and governance spine is sound and my v0.1 breaks held. But v0.3 contains one factually false interop claim (A5(iv)) and one self-contradiction between its own ratification record and its own strongest gate (§10.3a vs C2), both of which sit directly on the critical path of the next three phases. These are surgical fixes, not structural ones — one more pass, no re-ratification of D1–D6 required except the D6 evidence re-verification.

### Top 5 changes, ranked

1. **Rewrite A5(iv):** SC hosts do not natively expose theme values as CSS custom properties. Mandate one-way generation of SS-PT's SC theme *from* the crystalline-swan pack (single source of truth), extend the drift-linter to scan SC-theme↔pack divergence. Without this, Phase 1.5 proves nothing. (§11.A5, §8.D2)
2. **Resolve the push-cadence contradiction:** declare push policies per-phase; specify the package manager and a manifest-free workspace registration (or amend "root package.json untouched"); give the Phase 1.5 strangler PR its own push/deploy/rollback protocol. (§10.3a, §6 Phase 1.5, §8.D3)
3. **Re-verify D6 evidence strictly on origin/main** (StoreV2/V3 provenance, C1-style); force the scroll-bound-video variant through A3 — named second consumer or written Sean exception — or demote it from day-one. (§11.B1, §2)
4. **Move the Phase 3 entry gate from "F1+F3 merged" to "contract v1 locked"** (B2–B8 hardened, red-teamed, profile-selected); specify which conformance profile the Prism-class mock enforces per CI run. (§3, §11.B2–B8, §9.2)
5. **Give the exception ledger a lifecycle:** define expired-exception behavior, escalation on enforcement day, amnesty/triage plan for the report-only→enforcing transition; while in there, schedule the token codemod tooling (§1) into a named phase and state whether R5's 20% cap binds Phase 1. (§11.C3, §4, §1, §6)

Fix these five and this plan earns its locks.
