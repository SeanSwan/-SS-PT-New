---
decision: Panel-corrected synthesis of the ARMS workflow audit. My P0 was wrong; 4/4 seats rejected it. Corrected build sequence, kill list, and the security layer ARMS structurally could not see.
status: open
supersedes: docs/ai-workflow/AI-HANDOFF/ARMS-WORKFLOW-AUDIT-2026-08-21.md (section 4 ranking only)
---

# ARMS Workflow — Panel Synthesis & Corrected Plan

- **Date:** 2026-08-21 · **Synthesis author:** Opus 5 (Fable-tier, Final Decider)
- **Audit under review:** `ARMS-WORKFLOW-AUDIT-2026-08-21.md`
- **Panel:** GLM 5.3 · Kimi K3 · Grok 4.6 (paid, ~$0.13 total) · Qwen 3.8 local (free) — all four fired hostile, all four reviewed the transcript *and* the audit
- **Raw reviews:** `panel-2026-08-21/{GLM,KIMI,GROK,QWEN-ARMS}-PANEL-REVIEW.md`

---

## 1. The verdict: my headline was wrong, and I'll say why plainly

I ranked a 53,700-token `CLAUDE.md` as the P0 and wrote "everything else in this audit is secondary to that number." **Four of four reviewers rejected that, independently, on overlapping grounds.** They are right. The specific errors:

| My error | Who caught it | Correction |
|---|---|---|
| **Prompt caching never considered.** I claimed "direct spend on every turn." | GLM, Grok | `CLAUDE.md` is a stable prefix and *is* cached — this session runs a 1-hour cache TTL. Cache reads bill at a fraction of input. **The money argument is roughly 10× overstated.** What survives caching: context-window occupancy, compaction lossiness, attention decay. Those are real. "Costs money every turn" is not. |
| **Arithmetic that tells two stories.** Table says floor ~65k; body says ~107k per pair-coding session. | Grok, GLM | 53.7+6.7+4.9 ≈ 65.3k is a *Claude* session. `AGENTS.md` is *Codex's* context — a separate bill in a separate window. Summing them into one "floor" inflates the headline. Two bills, not one. |
| **Token count is `wc -c / 4`.** | Grok | Crude. Dense markdown tables tokenize nearer 3.5 chars/token, so the true figure may be *higher* — but it is still an estimate presented as a measurement, and I never pulled real usage. |
| **I laundered a number.** The audit's §5 attributes "roughly 40% retrieval-token savings" to the transcript. | Grok (decisive), GLM, Kimi | **That number is not in the transcript.** I carried it forward from the 2026-07-07 consult without re-citing it, and framed it as the video's claim. That is the exact failure I flag in others: an unverified figure inherited across documents until it reads as fact. Struck. |
| **M-1 rated "L" effort while also "HIGH" risk.** | GLM, Qwen | Both cannot be true. Qwen rates it XL. Splitting 83 numbered rules cited across 775 docs, a guard hook, and a mirror sync is not L. |

**The rebuttal that lands hardest**, from Qwen (free, local, and the sharpest line of the four):

> *"The hooks are the control; the prompt is the documentation."*

We already run 14 deterministic Stop/PreToolUse hooks. The learning corpus already records "a written trap is not a control" (2026-08-21). The problem with Rule 73 sitting 1,000 lines deep is **not** that the file is long — thinning the file does not make a rule fire. The fix is to move safety-critical rules into the hook layer, where firing is deterministic. Thinning without hooking converts *"rule present but skimmed"* into *"rule absent unless a trigger fires"* — and it makes the constitution depend on the retrieval layer my own M-3 proves is 28% dark. GLM named that dependency inversion; Kimi named the same trap; Grok called the thin-router import "unsafe in this domain."

**Corrected position:** the token bulk is a real cost-and-attention smell, worth fixing **surgically and after measurement** — by extracting the *brochure* (palette, skills tables, gotchas, open-items index, org chart), none of which is cited by number, while **keeping all 83 numbered rules inline** until each is backed by a hook or a test. It is not P0.

---

## 2. Where the panel was wrong — verified against the repo

Consultant output is a hypothesis, not a finding (Rule 30). Two of their conclusions rest on premises I checked and falsified:

**2.1 — The headless surface is already ~90% built. The panel costed it as a new build.**
All four treated S-3 ("no headless skill surface") as new work. It is not:

```
origin/main:scripts/fusion-triangle.mjs:42
  claude: { cmd: 'claude', args: ['-p'] }
```
`[VERIFIED]` — a working, unit-testable `spawn` wrapper for headless `claude -p` already exists on main, plus `docs/ai-workflow/hermes-agentic-os/headless-runner-spec.md`. The remaining work is an **allowlist and a schedule**, not plumbing. This drops the top recommendation from S effort to XS and lowers its risk further, because the spawn path has already been through review.

**2.2 — A-3 was not "never built." A prototype exists and was never promoted.**
Grok and Kimi both argued "six weeks cold means the tree correctly refused a toy." The premise is off:

```
origin/main:docs/ai-workflow/hermes-agentic-os/prototypes/hermes-agentic-os-command-center.html
origin/main:docs/ai-workflow/hermes-agentic-os/dashboard-command-center-spec.md
origin/main:docs/ai-workflow/hermes-agentic-os/dashboard-button-registry.md
```
`[VERIFIED]` — a built prototype sits in `docs/`, unpromoted to a live surface. The finding is *"prototype exists, never promoted"*, not *"never built."* Their conclusion (demote below correctness work) still holds, but on different grounds — and a demote is not the outright kill Grok argued for.

---

**2.3 — RETRACTION: "the constitution advertises dead code" is false, and I caused the panel to repeat it.**

My audit stated that `CLAUDE.md`'s reference table advertises `scripts/swan-brain.mjs` as live while the script sits on a dead branch. All four seats amplified it — Grok called it "a documentation lie," GLM called it "a constitution that asserts falsehoods about the repo," Kimi called it "the M-2 finding's real content." I checked it before reporting:

```
$ git show origin/main:CLAUDE.md | grep -n "swan-brain"
(no output)
```
`[VERIFIED]` — **`swan-brain` is not mentioned in `origin/main`'s CLAUDE.md at all.** On main, neither the script nor the reference row exists. On the local wip branch, *both* exist (commit `5ac95ebda`). **Each branch is internally consistent. There is no lie on either.** I read the local CLAUDE.md, wrote "CLAUDE.md advertises it," and never said which one — and the panel, having only my document, could not check.

The real finding underneath is still real but is a different class: **a five-star July recommendation was implemented only on a branch 2,158 commits behind main, so it never reached production.** That is release and branch hygiene (SEC-8), not documentation integrity. It needs a stale-branch policy, not a one-line doc edit.

**This is the same error class as the laundered "40%" figure, committed twice in one session** — asserting a property of a surface without naming which surface, in a repo whose working tree is 2,158 commits from main. That repeat is recorded in the learning packet as its highest-signal entry, because a lesson written up and then immediately repeated proves the write-up was not the fix.

---

## 3. What ALL FIVE of us missed structurally

**ARMS has no Security layer.** GLM named this and it is the most important sentence in the panel: an audit organized by a sales acronym inherits the acronym's blind spots. Applications/Routines/Memory/Skills has no slot for secrets, injection, classification, or dual-control — so an ARMS-shaped audit **cannot produce those findings**, and mine didn't. Every item below was raised by the panel, none appears in my audit, and each outranks most of my original table:

| # | Absent control | Why it matters here |
|---|---|---|
| SEC-1 | **Secrets inventory, scoping, rotation** for agent-visible credentials | 14 hooks, MCP wiring, Stripe/Gmail planned, cross-machine sync contemplated — and no least-privilege story. The Render key rotation is *still* open in MEMORY.md. |
| SEC-2 | **Prompt-injection threat model** | Gmail and Drive are untrusted input channels. Agents here have memory-write (52 packets) and payment-adjacent reach. Neither the video nor my audit contains the phrase. |
| SEC-3 | **PII/payment scanner over our own corpus** | Rule 8 says IDs only. Nothing verifies that across 146 memory files, 775 handoffs, 52 packets. A rule without a verifier is a written trap — our own maxim, unapplied to ourselves. |
| SEC-4 | **Human dual-control for money and identity** | No gate on agent-initiated payout or customer-data export. |
| SEC-5 | **Constitution regression suite** — "given scenario X, did Rule N fire?" | The precondition for *any* constitution change. Without it, "inlining doesn't work" and "splitting breaks rules" are both unfalsifiable. |
| SEC-6 | **Connector allowlist** (the inverse of `search-connectors`) | Named, pinned, hash-checked MCP binaries. Not agent-web-search plus a vibe scan. |
| SEC-7 | **Handoff TTL / retention policy** | Grok's sharpest: 775 immortal handoff docs is a **retention failure being treated as a search failure.** Cataloguing them forever industrialises the disease. |
| SEC-8 | **Stale-fork release policy** | A 2,158-commit wip branch holds tooling (`swan-brain.mjs`) that a July consult ranked five stars and that never reached `main`. Release process, not a footnote. |
| SEC-9 | **Hook failure-mode review** | I counted 14 hooks as a strength. Nobody has reviewed what happens when one fires wrongly. |
| SEC-10 | **Cost/compaction telemetry** | The instrument that makes the M-1 debate decidable instead of rhetorical. |

---

## 4. Corrected build sequence

Consensus across four seats, with my two repo corrections folded in. Ordered by *risk of not fixing*, which my original table never scored.

### Tier 0 — do today, XS effort, near-zero risk
1. **Regenerate CATALOG — but ONLY on `main`. Running it on this branch would corrupt it.** `[VERIFIED]` by execution:
   ```
   $ node scripts/catalog-regen.mjs --check   # exit 2 = distillation needed
   rows: 584 · fresh: 246 · stale/new: 338 · dropped: 0
   ```
   The catalog's last generation scoped **558** files; `origin/main` now tracks **773** AI-HANDOFF `.md` files → roughly **215 docs dark**, and **338 of the 584 rows visible from here are stale or new**.

   **The trap:** this working tree tracks only **584** AI-HANDOFF docs against main's **773**. `catalog-regen.mjs` distills what it can *see*. Regenerating here and committing would **drop ~189 documents that exist on main** — turning a stale index into a smaller, confidently-wrong one. Tier 0 must run on a tree synced to `main`, and the result must be checked with `--check` (exit 2 = work remains) before commit.

   *Note on my own instrument:* my first attempt read `$?` after a pipe, so it captured `tail`'s exit code (0) instead of node's (2) and reported success. The tool was telling the truth; my probe was not.
2. ~~**Stop advertising dead code.**~~ **RETRACTED — see §2.3.** The "constitution advertises dead code" finding does not survive verification. Replace with the real finding: **SEC-8, a July five-star recommendation reached only a stale branch and never main.**

### Tier 1 — the real P0 the panel surfaced
3. **Hook-coverage audit of the 83 rules.** Which are *not* enforced by the 14 hooks — prioritising PII, payments, provenance, kill switches — then move that subset into the hook layer. This is the actual fix for "rules that don't fire," and it is what makes any later constitution change safe.

### Tier 2 — cheap, and it stops the drift class permanently
4. **Allowlisted headless maintenance runner.** Generalize the existing `fusion-triangle.mjs` spawn wrapper to run `catalog-regen`, `drift-check`, and `stale-check` on a schedule — **fixed model, no PII tools, receipts on, allowlist only.** Not a dashboard, not user-picked model/effort. This is *why* the catalog went ~215 docs dark and ACTIVE-INDEX drifts by weeks: we wrote maintenance skills and made them manual-only.

### Tier 3 — measure, then operate surgically
5. **Token/compaction telemetry** (SEC-10), then **extract the brochure only** from `CLAUDE.md` — palette, skills tables, gotchas, open-items, co-orchestrator hierarchy. None is cited by number, so blast radius is near zero, and it plausibly halves the file. **All 83 numbered rules stay inline** until each is a hook or a test.
6. **Single-source the `AGENTS.md` mirror.** 1,176 vs 1,182 lines is already drift.

### Tier 4 — the one genuine import from the video
7. **S-1 rich reference bundles**, scoped as Grok scoped it: only for skills that emit branded or customer-facing artifacts, starting with `swan-design-router` (2 files today). This is the single place the transcript legitimately beats us, and all four seats conceded it.

### Then: the SEC-1..SEC-10 backlog, ahead of anything cosmetic.

---

## 5. Kill list — consensus, do not re-propose

| Killed | Vote | Reason |
|---|---|---|
| **R-3 Syncthing / any full-workspace sync** | 4/4 | Replicates secrets, `.env`, memory, and client residue to a second box. Kimi: "a data-residency and breach-scope decision, not a sync-tool decision." My "MED risk" rating was badly wrong. |
| **A-2 `search-connectors`** (agent-found, agent-vetted community connectors) | 4/4 | Supply-chain roulette with OAuth scopes. "Ask Claude to scan it for safety" is a vibe check, not a review. My "LOW risk" rating was inverted. Replace with SEC-6 allowlist. |
| **M-2 `brain-query` as a build** | 4/4 | `rg` over CATALOG *is* the deterministic layer for this corpus. Over-narrowing to one file is unsafe when constraints (PII + payments + provenance) span sections. M-2's residual content is release hygiene (SEC-8), not the dead-code advertisement I originally claimed — see §2.3. |
| **M-4 per-department routers** | 3/4 | His departments are a solo consultancy's lanes; ours carry cross-cutting law. Grok: "how payment rules end up in the billing file the design agent never opens." |
| **Visual second-brain graph over the corpus** | 3/4 | Rule 8 dies the moment client names and artifact paths become nodes. |
| **Artifacts ring keyed by client name** | 2/4 | It is a PII index. ID-only or not at all. |
| **General-purpose headless `claude -p` with user-picked model/effort** | 3/4 | Bypasses T0–T4. The allowlisted maintenance runner (Tier 2) is the safe subset. |
| **"Prompt twice → make a skill"** | 2/4 | Grok: "that heuristic is how you get 44 skills of which 6 are real." |
| **S-2 `skill-creator`** | 2/4 | Accelerates sprawl without evals. Gate it behind skill-quality evaluation, or skip. |
| **A-3 command center — DEMOTED, not killed** | split | Prototype exists (§2.2). Below correctness work; revisit as operator telemetry, not calendar-and-YouTube widgets. |

**Do not kill** (§3 of the audit, which the panel unanimously endorsed): T0–T4 tiers · receipts · Rule 8 · provenance locks · hostile review · the learning corpus · the 14 Stop-hooks · the generated CATALOG once complete and scheduled.

---

## 6. The meta-finding none of us put in writing

Every seat circled it; nobody stated it. **This workflow's output is documents, and the business's stated need is customers.**

775 handoff docs. 52 learning packets. 560 catalog rows. 70 reference docs. 83 rules. Two prior consults recommended `brain-query` and a cockpit; neither shipped. This audit, four panel reviews, and this synthesis are **six more documents added today.** GLM named the pattern — "the third artifact in a series where the shop produces documents instead of fixes… when this panel review is filed next to it, that will be four" — and it is now six.

Meanwhile `MEMORY.md` records Sean's own #1 priority as *"Marketing Command Center = #1 focus — acquisition is the gap."*

The corrected sequence above is deliberately shaped against this: Tier 0 is two commands, not a project. Tier 1 and 2 are the smallest changes that convert recurring drift from manual to impossible. **Nothing in it requires another planning document.** If a tier cannot be executed without first writing a spec, that is the signal to drop it and go work on acquisition instead.

---

## 7. Decision queue for Sean

1. **Execute Tier 0 now?** Regenerate CATALOG **from a tree synced to `main`** (`--check` exits 2 today). One command, reversible, no spec needed — but it MUST NOT be run from this branch, which would drop ~189 docs.
2. **Tier 1 hook-coverage audit** — read-only analysis producing a table of which of the 83 rules lack deterministic enforcement. Approve?
3. **Tier 2 allowlisted maintenance runner** — the durable fix for drift. Approve the allowlist scope (catalog-regen, drift-check, stale-check)?
4. **Confirm the kill list** so these stop being re-proposed by future consults and future videos.
5. **SEC-1..SEC-10** — which of these become their own workstream, and when? SEC-3 (PII scanner over our own corpus) is the one I would put first.

**Next slice (Rule 60):** Tier 0, on your go — it is the only item that is pure execution with zero design surface, and every other memory item reads the index it fixes.
