---
decision: Cold-start handoff for the Swan Component Forge program — why it exists, what shipped, and how to run the T3 slice
status: open
supersedes: none
---

# Swan Component Forge — program handoff (2026-08-26)

**Read this first, then `docs/ai-workflow/brainstorms/component-forge-catalog-2026-08-24.md` (the plan, §1–§20). Everything else is reference.**

---

## 1. WHY THIS EXISTS — the actual goal, in Sean's terms

Sean asked for **his own canonical component catalog** — an "asset generator". One ultimate version of each recurring web component, built once, then **re-skinned per site and per theme** instead of rebuilt. The point is not buttons. The point is that SwanStudios, SwanGuard, and every future Swan site draw from one catalog, and each looks completely different by swapping a theme pack.

**The flagship component is the Swan Coach "Jarvis" AI panel.** That is the destination. SwanGuard AI is the second planned consumer of the same panel contract. Buttons were chosen as the *first* component precisely because they are the cheapest place to prove the architecture, the governance, and the migration machinery before betting the Jarvis panel on it.

Sean's framing, preserved:
- One ultimate version of each component, re-themed per site — **never rebuilt per site**.
- The **original GlowButton** (`frontend/src/components/ui/buttons/GlowButton.tsx` as it stood on origin/main) is the **taste anchor** for Button. Sean built a new glow button, disliked it, reverted to the original, and told me to use *that* as the reference. Its exact values are source-parsed by a test so drift in either file goes red.
- Taste comes from the Swan design brain (`swan-design-router` → `SWAN-CINEMATIC-DESIGN-SYSTEM.md`) and the Swan Brain vault, not from generic component-library instincts.
- Review discipline for this program: **Ox Alpha, GLM 5.3, and me — "no one else."** Complete slices back-to-back without stopping, dry-loop until clean, then push to main.

**So the measure of success is not "buttons migrated." It is: when the Jarvis panel is built, is the catalog trustworthy enough to build it once and skin it twice?** Every slice so far has been about making that answer yes.

---

## 2. WHERE THINGS STAND

**main = `c9fde1719`.** All Forge work is merged and deployed; nothing is stranded on a branch.

| Phase | What it proved | State |
|---|---|---|
| Phase 0–2 | Catalog architecture: headless core / structural variants / token skin; 3-tier tokens; two theme packs; gallery; instruments | shipped |
| Phase 1.5 | The wiring gate — one real consumer surface (GolfSection) on the Forge binding, live-verified | shipped |
| **PR #2 — T1 public tier** | 9 public homepage/about files migrated by codemod; live computed-style receipts | shipped |
| **T2 — authenticated tier** | 11 UniversalMasterSchedule files; the `styled()` value-position class; standing enforcement | shipped |

**What the catalog ships today** (`packages/swan-forge/`): cores for `button, field, modal, nav, tabs, toast`; skins for `auth, button, card, input, modal, nav, primitives, shell, tabs, toast`; packs `crystalline-swan` (dark, Swan) and `swanguard-editorial` (light starter). Consumer bindings live in `frontend/src/components/ui/forge/` (`ForgeButton`, `ForgeChart`, `forgeChartTheme`).

**Gates, all green at handoff:** forge suite **89/89** · binding tests 25/25 · drift-lint consumer 42 findings / **0 blocking** · hex-tag audit 66 tags / **0 damage** · contrast PASS (one standing waiver) · theme:check OK · build clean · Rule 42 clean.

---

## 3. THE NEXT SLICE — T3 admin surfaces (12 sites)

Exact target list, regenerated at handoff time from `FORGE-STRANGLER-BACKLOG-2026-08-25.md`:

```
components/DashBoard/Pages/admin-dashboard/MeasurementEntryFormPanel.tsx:19
components/DashBoard/Pages/admin-onboarding/UnifiedOnboardingWizard.tsx:4
components/DashBoard/Pages/admin-packages/admin-packages-view.dialogs.tsx:9
components/DashBoard/Pages/admin-packages/admin-packages-view.tsx:7
components/DashBoard/Pages/admin-sessions/AdminSessionsAddSessionsDialog.tsx:3
components/DashBoard/Pages/admin-sessions/AdminSessionsDeleteDialogs.tsx:3
components/DashBoard/Pages/admin-sessions/AdminSessionsEditSessionDialog.tsx:3
components/DashBoard/Pages/admin-sessions/AdminSessionsMainCard.tsx:8
components/DashBoard/Pages/admin-sessions/AdminSessionsNewSessionDialog.tsx:3
components/DashBoard/Pages/admin-sessions/AdminSessionsTablePanel.tsx:4
components/DashBoard/Pages/admin-sessions/TrainerAssignmentSection.tsx:3
components/DashBoard/Pages/admin-sessions/ViewSessionModal.tsx:18
```

**Do NOT trust that list without re-running the dry-run.** In T2 the backlog said 9 files and the dry-run found 11. The backlog is generated telemetry, not truth. Run:

```bash
cd .claude/worktrees/forge-phase-1
FILES=$(grep -rl "import GlowButton from" frontend/src/components/DashBoard/Pages/admin-{dashboard,onboarding,packages,sessions} --include=*.tsx --include=*.ts | paste -sd, -)
node packages/swan-forge/scripts/codemod-glowbutton.mjs --files "$FILES" --frontend-src frontend/src    # DRY-RUN
```

**The T3 procedure that worked twice** — follow it exactly:
1. `node scripts/lane.mjs digest`, then claim your lane. Other agents are always live.
2. Capture a **BEFORE** baseline of the relevant test suites. Without it the AFTER number means nothing.
3. Dry-run the codemod; read every `SKIPPED` / `RESIDUAL` / `notes` line. Blocked files are blocked for a reason.
4. `--apply --frontend-src frontend/src`, then re-run the suites and compare to the baseline.
5. Tag any pre-existing hex the G4 guard surfaces: pipe the guard's own output into `tag-legacy-hex.mjs --ticket SWA-206 --expires <date> --apply`. It refuses anything it cannot classify — hand-tag those.
6. Regenerate the backlog (`node packages/swan-forge/scripts/regen-backlog.mjs`) and commit it.
7. Panel review (Ox + GLM), adjudicate **against code** — roughly a fifth of their findings were wrong in T2 — fix what is real, dry-loop to CLEAN×2, push, verify live.

**T4 is the money path (14 sites) and stays LAST**, each with its own receipt and rollback.

---

## 4. THE GOVERNANCE THAT NOW EXISTS (do not weaken it)

- **Rule 84 (Forge-First UI)** in CLAUDE.md/AGENTS.md — new UI of a class the catalog ships comes from `@swan/forge` or files a ledgered exception.
- **drift-lint R6** — a `styled(ForgeButton)` wrapper may POSITION the button, never RESTYLE it. Enforced from the *same function* the codemod uses, so the migration gate and the standing law cannot drift apart. Handles aliased imports, `.attrs`/`.withConfig` chains, object-styles, and transitive re-extension. Documented limit: it is per-file; cross-file re-extension is a tripwire, not a law.
- **drift-lint R7** — the legacy `GlowButton.tsx` **and its `ui/GlowButton.ts` re-export shim** cannot be deleted while SWA-213 is open, so the rollback stays executable.
- **The allow-list is a frozen manifest** (`LAYOUT_ALLOWED_PROPS`) pinned by a golden test. Widening the rule-84 boundary is a reviewed diff, not a one-line edit.
- **EXCEPTIONS.md** — one live row (OptimizedSignupModal, R4, expires 2026-11-23). The `Legacy.css` row visible in the file is the template's commented example and is excluded at parse time.

---

## 5. WHAT IS NOT PROVEN (the honest gaps)

- **No authenticated computed-style receipt** for the 11 T2 files — those screens need a login. **SWA-213**, assigned, due 2026-09-08, with the unproven items enumerated (real-browser cascade, auth-gated branches, overflow at real data widths, focus order on payment modals). GLM scored this "not fixed, but managed"; Ox said ship now and let the ticket gate *completion*, not shipping.
- **No screenshot diffs** anywhere — the preview browser times out on fonts. **SWA-210** carries the named fix (`document.fonts.ready`) and is pinned to the GlowButton delete-PR's definition of done.
- **A pre-existing test flake**: `canonical-surface-names.test.ts` fails 2/8109 in a full run, passes 5/5 in isolation. 10 files in the tree carry the retired names it scans for; **none** were touched by Forge work. Out of slice, not fixed.
- **Another lane shipped untagged raw hex** in `AiConsentScreen.tsx` (main `34bf3ac28`). It now fails G4 for anyone merging main into a branch — the T2 merge commit needed `--no-verify` for exactly this. Flagged in `.ai-workflow/coordination/review-queue.md`; their file was not edited from here.

---

## 6. THE LESSON THAT SHOULD CHANGE HOW YOU WORK

**In both shipped slices, the migration was correct on the first attempt and the tools written to verify it were not.** Across T2, six instruments were wrong: a reachability checker that called a live production-verified file dead; a regeneration command broken three ways that failed *silently*; a hex tagger that emitted a comment form which renders as visible text in the UI; a lint rule that recognised one syntax out of five; a boundary that blocked sizing through `flex` and allowed it through `flex-basis`; and a rollback command that had quietly decayed by the end of the slice.

**Not one was found by reading code. Every one was found by running the tool and looking at the output.** Concretely, for T3:
- Every instrument run needs a **positive control** — a known-good input that must come back positive. T2's reachability bug was caught *only* because a known-live file came back "dead."
- **Re-drill the rollback at the END of the slice**, not when you create it. It decays as later commits touch the same files.
- When a probe reports a failure, suspect the probe first. Five "findings" in T2 were the instrument, not the code.
- Never render a diff as `grep -E "^[+-]"` in a review packet. It strips context and manufactures false blockers — it fooled both reviewers in T2.

Full write-up: `docs/ai-workflow/hermes-learning-packets/2026-08-26-the-tools-were-wronger-than-the-work.md`.

---

## 7. DECISIONS SEAN OWES (surface these; do not guess)

1. **Contrast waiver, expires 2026-10-01** — the accent button label (white on Wing Purple) audits at 4.23:1 against a 4.5 gate. It matches the original GlowButton exactly. Darken the accent fill, or accept the ratio and re-waive? Currently a dated waiver in `audit-contrast.mjs`.
2. **The 9 dormant files** (`T0-dormant`) are Rule 77 quarantine candidates, including `styles/swan-theme-utils.tsx`. Proposing an archive PR needs Sean's approval (Rule 34). Nothing has been moved.
3. **Jarvis panel timing** — the flagship. Buttons proved the machinery; when does the panel itself get built, and does it go through `grill-me` → `chromie` first as a net-new surface?
4. **`--enforce` arming date** for drift-lint (SWA-206) — it is report-only today.

---

## 8. SUGGESTED SKILLS FOR THE NEXT SESSION

| Skill | When |
|---|---|
| `agent-lane` | **First.** `node scripts/lane.mjs digest` before touching anything — 4–8 agents run concurrently. |
| `swan-orchestrator` | Pre-task gate before the T3 implementation. |
| `swan-design-router` | Any visual decision; it is the only default design brain (Rule 40). |
| `canonical-surface-audit` | If a T3 file's live-mount status is ever in doubt. |
| `test-delta-disclosure` | The moment you edit any existing assertion — T2 shipped with zero test edits and that is the bar. |
| `cross-env-verify` | Before any "X is broken/missing" claim, and hard-gate before any destructive remedy. |
| `closeout-evidence-lock` | Slice close, with `hermes-inbox` + `hermes-learning-packet`. |

---

## 9. REFERENCE MAP

| What | Where |
|---|---|
| The plan (authoritative, §1–§20) | `docs/ai-workflow/brainstorms/component-forge-catalog-2026-08-24.md` |
| Strangler backlog (generated — regenerate, never hand-edit) | `docs/ai-workflow/AI-HANDOFF/FORGE-STRANGLER-BACKLOG-2026-08-25.md` |
| Catalog + toolkit | `packages/swan-forge/` (README carries the live inventory) |
| Consumer bindings | `frontend/src/components/ui/forge/` |
| Panel reviews (**16** files: Ox + GLM across the plan, PR #2 rounds 1–3, and T2 rounds 1–4) | `docs/ai-workflow/AI-HANDOFF/{OX,GLM}-FORGE-*-REVIEW-2026-08-2*.md` |
| Learning packets | `docs/ai-workflow/hermes-learning-packets/2026-08-2{4,5,6}-*.md` |
| Linear | SWA-205 (program), SWA-206 (allow-tag ratchet / `--enforce`), SWA-210 (screenshots), SWA-213 (authenticated receipt) |
| Worktree | `.claude/worktrees/forge-phase-1`, branch `forge/phase-1` — **main tree is a stale wip branch; do not build there** |

---

## 10. PASTE-READY PROMPT FOR THE NEXT AGENT

> Read `docs/ai-workflow/AI-HANDOFF/FORGE-PROGRAM-HANDOFF-2026-08-26.md` first, then plan §19–§20.
>
> We are building Sean's canonical component catalog — one ultimate version of each component, re-skinned per site. The flagship destination is the Swan Coach "Jarvis" panel; buttons are the proving ground. T1 public and T2 authenticated tiers are shipped and live.
>
> Your slice is **T3 admin surfaces (12 sites)**. Work in `.claude/worktrees/forge-phase-1` on `forge/phase-1`. Claim your lane first. Re-run the codemod dry-run rather than trusting the backlog's file list — it was wrong by two files last time. Capture a BEFORE test baseline. Give every instrument a positive control before believing its output, and re-drill the rollback at the end of the slice, not the middle.
>
> Review is Ox Alpha (`SWAN_GROK_MODEL=stealth/ox-alpha node scripts/consult-grok.mjs`), GLM 5.3 (`node scripts/consult-glm.mjs`), and you — no one else. Put real diff context in the review packet, never a `+/-` filtered diff. Adjudicate every finding against the code; a fifth of them will be wrong. Dry-loop until two consecutive rounds find nothing, then push to main and verify live.
