---
decision: "Three-brain verdict on the Hermes terminal rebuild: ratify Slices 0-1 only; re-audit before any reskin"
status: open
supersedes: none
originating_model: claude-opus-5
date: 2026-08-15
author: Opus 5 (vs-claude) — Final Decider (Fable absent)
---

# Hermes Terminal — Panel Verdict
**Panel:** GLM 5.2 (blueprint) · Kimi K3 (hostile review) · Opus 5 (hostile review + Final Decider)
**Inputs:** `HERMES-OS-TERMINAL-AUDIT-2026-08-15.md` · `GLM-52-HERMES-TERMINAL-BLUEPRINT.md` · `KIMI-K3-HERMES-TERMINAL-HOSTILE-REVIEW.md`
**Actual spend:** GLM 5.2 ~$0.04 · Kimi K3 $0.2179 · **total ≈ $0.26**

---

## 1. VERDICT

**Ratify Slices 0–1 (update + re-audit) only. Everything downstream is REJECTED pending a re-audit on the updated tree.**

Kimi is right on the decisive point: GLM's blueprint diagnoses its own fatal flaws in its preface and then ships slices that ignore them. But Kimi is not right about everything — I verified its claims rather than accepting them, and **one of its headline findings is itself refuted by evidence.**

---

## 2. I verified the panel's claims. Results:

### 2.1 Kimi M15 — **CONFIRMED. My audit was wrong.**

Kimi said my §2.1 grep overclaimed because I only searched `ui-tui/src` + `agent`. I re-ran repo-wide (excluding `node_modules`/`.git`):

| Feature | My claim (§2.1) | Repo-wide truth | Verdict |
|---|---|---|---|
| `a2a` | 0 files — ❌ MISSING | **163 files** | **my claim WRONG** |
| `barge` | 0 files — ❌ MISSING | **43 files** | **my claim WRONG** |
| `wake_word` | 0 files — ❌ MISSING | **5 files** | **my claim WRONG** |
| `shell_mode` | 0 files — ❌ MISSING | 0 files repo-wide | claim holds |
| `/diff` | 0 files — ❌ MISSING | (ui-tui scope valid) | claim holds |

**Three of my five "MISSING" claims were false.** They were artifacts of a too-narrow search scope presented as product-level absence. The version-lag conclusion (§2) survives on the release-notes evidence and the 4,657-commit count, but **§2.1 as written must not be trusted** and is corrected here.

### 2.2 Kimi H7 (Ink `<Static>`) — **CONFIRMED as a gap, but severity OVERSTATED.**

Verified: `grep -rl "Static" ui-tui/src` → **0 files.** The app genuinely never uses Ink's `<Static>`. Neither my audit nor GLM's blueprint mentioned Ink's rendering model — that omission is real and Kimi is right to flag it as the central unaddressed implementation decision.

**But** Kimi's implied consequence ("every token re-renders the whole transcript") is **not established.** Verified counter-evidence:

- `appLayout.tsx` — **8** `React.memo` sites, 4 `useMemo`
- `messageLine.tsx` — 1 `React.memo`
- `streamingMarkdown.tsx` — 1 `React.memo`
- Windowing/slicing logic present in `app/useMainApp.ts` and `app/turnController.ts`

The codebase mitigates re-render cost via **memoization + windowing** rather than `<Static>`. That is a legitimate alternative strategy. The finding stands as *"the render strategy is undocumented and unspecified in both plans"* — not as *"the render strategy is broken."*

### 2.3 Kimi H6 (pets/fpsOverlay not really mounted) — ⚠ **MY "REFUTED" WAS UNEARNED. Retracted 2026-08-15.**

> **GLM 5.3 (added as 4th reviewer) overturned this section.** I proved a **mount point exists**;
> I did **not** prove it **renders**. The JSX is conditional — `!kitty && grid ? <PetSprite/> : null` —
> and both operands come from `usePet()`, which exposes an **`enabled`** flag I never checked
> (`ui-tui/src/components/appLayout.tsx:58` → `const { enabled, grid, kitty } = usePet()`).
> Kimi's actual claim was "file presence ≠ default rendering." My grep answered only the
> narrower sub-claim about mount-point existence and I stamped the broader claim REFUTED.
>
> **This is the same error class I confessed to in §6, re-performed inside the section announcing
> the correction.** Status of H4 is now **`[UNKNOWN]` — unresolvable by grep; only the Step-0
> capture settles it.** Do not cite this section as a refutation of Kimi.

Original (retracted) reasoning follows for the record:

Kimi argued my H4 was "likely wrong in strong form" because file presence ≠ default rendering, and that nobody grepped mount points. I grepped mount points:

```
src/components/appLayout.tsx:108   {!kitty && grid ? <PetSprite grid={grid} /> : null}
src/components/appLayout.tsx:571   <FpsOverlay t={ui.theme} />
```

Both are **mounted in the default layout tree** (conditionally, but in-tree). My H4 stands. Kimi asserted an evidentiary gap that, when actually checked, resolves against Kimi. This is the same error it accused GLM and me of — asserting without checking.

### 2.4 Kimi M14 — **CONFIRMED. My commit math was inconsistent.**

I wrote "4,657 behind" (§1) while §2 listed release windows summing to ~7,883 commits. Both numbers are real but measure different things: the release notes count commits *since each previous release tag*, while Sean's HEAD (2026-07-24) sits **inside** the v0.19.1 window, so he already holds part of it. I presented them side by side without reconciling. **4,657 is the authoritative figure** (GitHub compare, `behind_by: 0 / ahead_by: 4657`).

Kimi's second half is also right: extrapolating "4,657 commits per 3 weeks" as a steady-state cadence uses a window containing the largest release in project history. The merge-debt *argument* survives; the *quantification* is an upper bound, not a rate.

### 2.5 Kimi C1 (no-fork constraint) — **CONFIRMED, and it is the decisive finding.**

GLM's keep/cut table marks **13 components Cut**. Cutting upstream files *is* a fork. My Constraint 1 said "do not fork," GLM's plan forks, and neither of us specified a patch-queue or upstream-PR disposition. This is the single most important structural objection and it invalidates Slices 2–6 as written.

### 2.6 Kimi C2 (Slice 5 void) — **CONFIRMED.**

Slice 0's own acceptance criteria require `/diff` to exist post-update. Slice 5 then specifies building `/diff`. The slice is obsolete before it runs.

### 2.7 Kimi L21, L22 — **CONFIRMED.**

GLM drew a permanent `$0.00` cost field in the status bar for a user running a local Ollama model (cost is a constant). And GLM's "Claude Code's composer is ~300 LOC" is **fabricated** — Claude Code is closed-source — yet it was the basis for Slice 4's LOC budget.

---

## 3. My own findings — what all three of us missed

**O1 — Nobody rendered the terminal.** The entire audit chain is static analysis. Not one screenshot, not one recorded session, not one frame of the thing Sean says is unpleasant. Every legibility, density, and motion hypothesis (H1, H2, H5, H7) is unfalsifiable without a capture. **A single asciinema recording of a real session would be worth more than all three of these documents.** This is the highest-value next action and it costs nothing.

**O2 — "Chore to work on" was never decomposed.** Sean's actual words describe *friction over time*, not a static appearance. That could be startup latency, input lag, scrollback loss, session-resume cost, or the update ritual itself — none of which a reskin addresses. We optimized for "looks bad" when the complaint may be "works badly." **This should be grilled before any build.**

**O3 — The macOS-only trap is a live class of bug here.** `qwen3.8:27b-nvfp4` failed with `412: this model requires macOS`. Kimi's H9 (Windows terminal reality ignored) is the same class and is confirmed by this session's own evidence: the panel proposed a tmux/WSL degradation matrix for a user whose verified environment is Windows + winget + native `nvidia-smi`.

**O4 — The 365-commit Codex worktree is still unexamined by anyone.** Kimi flagged its absence from the blueprint (L25); I flagged it in the audit (§1.1, Q1); nobody has actually looked inside it. If it contains TUI work, the re-audit targets the wrong base.

---

## 4. Ratified execution order

> ⚠ **REVISED 2026-08-15 after GLM 5.3's review.** The original table had four defects GLM caught:
> steps 0/1 were mis-ordered, step 3 didn't gate step 4, steps 6/7 were circular (posture "per slice"
> required *before* slices exist), and it collided with the "Slices 0–1" numbering in §1.
> **One numbering scheme governs: the step numbers below.**

| # | Step | Status |
|---|---|---|
| 1 | **Grill Sean on what "chore" concretely means** (O2) — friction-over-time may not appear in an ad-hoc recording | **RATIFIED — first** |
| 2 | **Targeted capture** (asciinema) at **Sean's real terminal dimensions** — not the unmotivated 120×40 / 80×24. ⚠ asciinema has no verified native-Windows support; recording via WSL captures a *different* terminal stack (O3's own lesson). Resolve the tool before running the step. | **RATIFIED — after grill** |
| 3 | **Preserve the 2 local patches — by `git stash` or a commit, NOT a branch.** `git rev-list --count origin/main..HEAD` = **0** and status shows ` M`: these are **uncommitted working-tree changes**. A branch alone does not protect them; `reset --hard` destroys them. **Read the patch contents** (nobody has). | **RATIFIED — corrected** |
| 4 | Triage the 365-commit Codex worktree | **RATIFIED** |
| 5 | **BASE DECISION GATE** — if the worktree contains TUI work, updating the old base is wasted and the re-audit targets the wrong tree. Must sit between triage and update. | **NEW — GLM 2.2** |
| 6 | Capture a **pre-update test baseline**, then `fetch --unshallow`, fast-forward to `v2026.8.13`, reinstall, run tests, **re-apply and verify the local patches** | **RATIFIED — corrected** |
| 7 | Verify **user-state survival**: sessions, config schema, log formats across 4,657 commits | **NEW — GLM 1.3** |
| 8 | **Re-audit on the new tree** — must carry explicit scope, method, owner, and acceptance criteria, and must bind §6's rules (scope-stated absence claims, reconciled numbers). An unspecified re-audit is this same failure with fresher input. | **RATIFIED — was an empty box** |
| 9 | **Post-update capture**, compared against step 2 — the before/after that justifies update-first was never instrumented | **NEW — GLM 2.1** |
| 10 | Re-derive slices against the updated tree | **REJECTED as written; re-plan after step 8** |
| 11 | Decide fork posture per slice — **after** slices exist. First check **upstreamability** (contributing guide, PR history): removing default-mounted chrome is classically rejected upstream, so the posture menu may be length one — *fork* — meaning Constraint 1 is unsatisfiable and needs replacing. | **AFTER step 10 — was circular** |

---

## 5. External-model calibration

| Model | Cost | Findings real | Findings disproven | Verdict |
|---|---|---|---|---|
| **GLM 5.2** | ~$0.04 | Structure excellent — Mermaid flowchart, sequence diagram, ASCII wireframes at 2 widths × 4 states, 36-row keep/cut table, correct update-before-reskin ordering | Fabricated a Claude Code LOC figure; arithmetic in its own table wrong (claimed 11/8/17, actual 13/8/15); 3 target-state components owned by no slice; drew cost chrome for a local-model user | **Good value.** Strong at artifact production; weak at self-consistency. Use for structure, never trust its numbers. |
| **Kimi K3** | $0.22 | C1 fork contradiction (decisive), C2 Slice-5 void, C3 orphaned components, M14 my commit math, M15 my grep overclaim, L22 fabrication catch, Ink `<Static>` gap | Its H6 verdict (pets not mounted) is refuted by mount-point evidence; its `<Static>` severity claim is overstated given existing memo+windowing | **Excellent value at $0.22.** Best single reviewer of the three. Caught two real errors in my work. Still requires verification — it asserted one gap without checking, the exact sin it charged others with. |

| **GLM 5.3** (direct Z.ai coding endpoint, added as 4th reviewer) | flat-rate (coding plan) | **Strongest reviewer of the four.** Overturned my §2.3 "REFUTED" as unearned (verified: `usePet()` exposes an `enabled` flag I never checked); proved the 2 local patches are **uncommitted** via the `ahead_by:0` contradiction I had quoted without noticing; found step 3 doesn't gate step 4; found steps 6/7 circular; found a numbering collision; found the re-audit was an empty box; found no post-update capture was scheduled; noted asciinema re-performs the very platform error O3 had just named | Its §1.1 (that my repo-wide correction is a mirror-image scope error) is **also correct** — 163 files proves repo presence, not product exposure; the right probe is the command registry, which nobody ran | **Best value of the panel.** Caught what Kimi and I both missed, and caught me re-performing my own confessed error. **Escalate GLM 5.3 to default hostile reviewer for decision records.** |

**Routing lesson (revised):** **GLM 5.3 > Kimi K3 > GLM 5.2** for hostile review of plan/decision artifacts. GLM 5.3 is on Sean's flat-rate coding plan — effectively free — and out-reviewed a $0.22 Kimi pass. Kimi K3 remains strong ROI and a good second opinion. GLM 5.2 is an *artifact generator*, not a reviewer; verify every number it produces.

**Transport note:** GLM 5.3 requires the **coding** endpoint (`https://api.z.ai/api/coding/paas/v4`) via `scripts/consult-glm.mjs`; streaming is mandatory. Measured this run: **wall 312.4s** (a non-streaming fetch dies at 300s) and **18,648 of 22,227 output tokens were invisible reasoning — 84%**. Full access rules: `docs/ai-workflow/references/GLM-ZAI-ACCESS.md`.

---

## 6. Mistakes I made

- **I overclaimed feature absence from a too-narrow grep.** I searched `ui-tui/src` + `agent` and reported `a2a`, `barge`, `wake_word` as "❌ MISSING" from the product. Repo-wide they have 163, 43, and 5 files. **Three of five claims in my §2.1 table were false.** Caught by Kimi K3, then confirmed by my own re-grep. **Rule that prevents the repeat:** an absence claim is only as wide as its search scope — state the scope in the claim, and never render a scoped negative as a product-level fact. This is Rule 54's grep-evidence requirement applied to *absence*, and it is the second time this session I trusted an under-scoped probe (see the Ollama exit-code error below).
- **I presented two irreconcilable commit counts in one document** (4,657 vs ~7,883 summed) without noticing they measure different windows. Caught by Kimi M14. **Rule:** when two numbers describing the same thing appear in one artifact, reconcile them explicitly or delete one.
- **I trusted a wrapper's exit code over its contents.** The first Qwen pull run exited 0 while both inner `ollama pull` commands failed with an upgrade demand; I only found out by reading the log. **Rule:** a pipeline's exit status is not evidence its inner commands succeeded — grep the output for the success string.
- **I picked a model build without checking platform support.** `qwen3.8:27b-nvfp4` was my recommended Blackwell-FP4 backup; it is macOS-only and failed with HTTP 412 on Windows. I reasoned from the 5090's FP4 tensor cores to availability, which does not follow. **Rule:** verify platform/registry support before recommending a build, not after the pull fails.
- **I ran the whole audit without ever looking at the thing.** Sean's complaint is visual and experiential; I produced 13k characters of static analysis and commissioned two reviews of it without capturing a single frame of the running terminal. Kimi didn't catch this either. **Rule:** when the complaint is about how something looks or feels, observe it before theorizing about it.
