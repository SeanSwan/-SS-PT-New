---
name: a-gate-for-hygiene-and-a-document-for-doctrine
title: The validator enforced everything that was easy to check and trusted everything that mattered — and a test harness's `git reset --hard` erased six files of fixes before they were committed
originating_model: claude-fable-5
tier: fable
tier_gate: PASS
tier_basis: claude-fable-5 is the Final Decider (Sean 2026-06-10); Opus 5 / Kimi K3 designated Fable-tier 2026-08-10
date: 2026-08-25
decision: When building a gate, enforce the constraint that JUSTIFIED the gate first, not the constraints that are easiest to check — and never run `git reset --hard` in a tree that holds uncommitted work, even to drop a temp commit
status: current
reviewed_by: six-seat branch gate (Ox Alpha, Kimi K3, HY3, Grok 4.6, DeepSeek V4 Pro, Fable)
supersedes: none
surface: scripts/assets, scripts/hooks, .githooks/pre-commit, assets/registry.json
commit: 283f20c9f (branch claude/aftertaste-p0-20260825, pushed)
models_used:
  - model: claude-fable-5
    role: builder, sixth seat, synthesizer
    did: built the gate across three slices; ran own adversarial seat (found catalog-check ran its CLI on import, proved the rebase clean, verified CRLF safety); applied the consensus fix set; erased six files of it with a reset --hard and rebuilt from kept scripts
    cost: subscription
  - model: stealth/ox-alpha
    role: hostile reviewer (standing first seat)
    did: the validator is wired to nothing; provenance is shape not truth; stub manifest would be found by --all; degraded override is a sticky footgun; guard fails open. Its negative-triangle attack was disproven by probe (already clamped)
    cost: $0
  - model: moonshotai/kimi-k3
    role: hostile reviewer
    did: self-attesting root of trust is the P0; chromeLaw unenforced; behavioural overlap on the shared hook unchecked; compression policy a no-op
    cost: $0.039
  - model: tencent/hy3
    role: hostile reviewer
    did: fail-open guard is the highest risk; hook activation path unverified (disproven — core.hooksPath=.githooks on both trees); similarityReviewed an honour bit
    cost: $0.004
  - model: x-ai/grok-4.6
    role: hostile reviewer
    did: the guard scanned only added lines, so a new claim above a pre-existing truncating command slipped through — the sharpest finding on the panel; SWAN_ALLOW_DEGRADED semantics; "install gltf-transform with no caller is not progress". Its "pipe destroys voxel assets" misread the inherited art law
    cost: $0.089
  - model: deepseek/deepseek-v4-pro
    role: hostile reviewer
    did: widened the truncation class (grep -q, find -quit, splitlines()[0]); provenance command is a stored injection surface; two frozen world lists can diverge
    cost: $0.033
skills_touched:
  - id: instrument-check
    change: reinforced (violated again)
    failure: a test harness reported 8 fixture failures and a fail-closed control "failing" — all of it against files a `git reset --hard` had silently reverted seconds earlier. The instrument was measuring the wrong artifact
  - id: rule-20 (sibling sweep)
    change: reinforced (violated)
    failure: two modules were fixed for CLI-on-import after a panel found them; the third sibling was never swept until my own seat on the next panel
  - id: closeout-evidence-lock
    change: gap found
    failure: a validator with 16 passing fixtures was reported as "the gate"; nothing invoked it, and it enforced none of the doctrinal fields. Passing tests on an uninvoked tool is not a gate
privacy: IDs/roles only; no PII, no secrets, no absolute paths
---

# A gate for hygiene and a document for doctrine

## What was decided/built (Fable-tier lesson)

Across three slices I built an asset validator with 16 passing fixtures, a registry as its namespace, and two guards. The branch-gate panel — six seats — converged on one structural finding none of the per-slice panels could see:

**The validator enforced hygiene and trusted doctrine.** Path containment, SHA-256, clip names, license shape — all mechanical, all enforced. `chromeLaw` (the Law-A/Law-B constraint that motivated the entire P0 correction), `bannedLikeness`, `proofActionContract`, `antiCheese`, `statusValues` — the fields that encode *why the project has an IP and health-language risk at all* — nine of them, declared in the registry and read by nothing. And the validator itself was invoked by nothing. A gate nobody runs, enforcing none of the rules it exists for, with a green test suite.

Then, while applying the fixes, a test harness I wrote ended with `git reset --hard HEAD~1` to drop a temporary commit. That reverted every tracked file with uncommitted changes — six files of panel fixes — and the control battery that ran next reported eight fixture failures and a fail-closed guard "failing." None of it was real; all of it was the harness measuring reverted code. I rebuilt from the edit scripts I had kept as files.

## Why (the rationale Hermes should carry forward)

**Ease of checking is anti-correlated with importance.** A hash is trivial to verify and almost never the thing that hurts you. "Does this asset's palette law match the surface it will render on" is awkward to encode and is the exact constraint a legal or brand incident turns on. A builder under time pressure enforces what is easy and defers what is awkward, and the test suite goes green either way. Green is not a signal about coverage of *doctrine*.

**A gate has three parts, and a test suite proves only one.** The rule, the invocation, and the enforcement point. My validator had rules. It had no caller (`grep -rn validate-asset .githooks .github package.json` → nothing) and it did not read the doctrinal fields. Four of six seats found the missing invocation independently. "Tests pass" said nothing about either gap.

**`git reset --hard` is a destructive command whose blast radius is the whole working tree, not the commit you are thinking about.** I was thinking about one temp commit on one throwaway file. The command reverted six real files. The fix was `--soft` plus `restore --staged` — same effect on the temp commit, zero effect on the tree. This is the same shape as the Ollama near-miss earlier in the day: acting on a resource without enumerating what else depends on it.

## Reusable pattern / rule Hermes should apply next time

1. **Before writing a validator, list the constraints in order of consequence, not ease.** Enforce the top of the list first. If the top of the list is awkward to encode, that is the work — not a reason to start at the bottom.
2. **A validator's docblock names its caller.** No caller named → not a gate. Add the hook/CI/npm wiring in the same commit as the rules.
3. **Every declared schema field has a reader, or the tool announces that it doesn't.** The CLI now prints every registry key with no reader at startup. Silent drift is now impossible; visible drift is a to-do.
4. **Provenance fields are checked for truth where truth is cheap.** `git cat-file -e` on a commit id. Measured triangles equal what the bytes say. A structured review artifact instead of a boolean. Shape checks alone are theatre.
5. **Never `reset --hard` in a tree with uncommitted work.** Temp commits are undone with `--soft` + `restore --staged`. Commit real work *before* running any harness that touches git state.
6. **After fixing a defect class in one module, sweep the siblings in the same commit.** Three modules had CLI-on-import; I fixed two after a panel found them and found the third myself on the next panel. That is a rule-20 violation with a day's delay.

## Who did what

Ox Alpha found the missing invocation and the stub-manifest trap. Kimi named the self-attesting root of trust as the P0. HY3 put fail-open at the top. **Grok found the sharpest defect of the day** — the guard judged only added lines, so a new absence claim placed above a truncating command already in the file slipped through; my own dry loop had "fixed" scope from window to file and closed exactly half the hole. DeepSeek widened the truncation class and flagged the stored-command injection surface. I found the third import-unsafe module and proved the rebase clean, then erased six files of everyone's fixes with a reset and rebuilt them.

Two seat claims were disproven by probe and recorded as such: Ox's negative-triangle attack (already clamped) and HY3/Grok's hooksPath doubt (`.githooks` on both trees). Grok's "the pipe destroys voxel assets" misread the inherited art law — bevel and dissolve *are* the doctrine.

## Skills created or changed

- `truncated-evidence-guard` — fail-closed with a loud bypass; claim on added lines, instrument and denominator on the full staged file; class widened.
- `validate-asset` — split into rules / CLI / selftest (24 fixtures); chromeLaw, status, commit-exists, measured-equals-declared, structured similarity review, compression enum, unread-key audit; wired into pre-commit; non-TTY override refused.
- `smoke.py` — the first thing to run after Blender lands; isolates the two unverified background-mode calls.

## Mistakes I made

- Built a gate that enforced the easy fields and none of the fields that justified it, across three slices and two panels, and called it a gate.
- Never wired the validator to anything. Reported "16/16" as if that were enforcement.
- **`git reset --hard HEAD~1` in a tree with six files of uncommitted work.** Wiped them. Then ran a battery against the wiped files and read eight false failures before noticing the line count was wrong.
- Fixed CLI-on-import in two modules after a panel found them and did not sweep the third sibling.
- Fixed the guard from window-scope to file-scope and believed the hole was closed; it was half closed.
- Two edit scripts failed to apply (a regex-escape mismatch; a heredoc parse error). Both aborted before writing, so no half-state — but the guard battery that ran next passed T6–T9 *against the old guard* and I nearly read that as the new guard working.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before recurring? | What actually stopped it |
|---|---|---|---|
| **Instrument measuring the wrong artifact / reporting on code that did not run** | **6** (capped grep; misread EXIT 2; `/tmp` matrix; pad-byte tamper; battery against reverted files; battery against the un-edited guard) | yes — four packets today | Only tools and external seats. Six times in one day is not a discipline problem to be solved by a seventh write-up; it is the reason the guard is now fail-closed and the validator is now in the hook |
| Destructive git command without enumerating blast radius | 1 (`reset --hard`) | no (Ollama rebind was the same shape, different resource) | `--soft`; commit before harness |
| Gate enforces the easy fields, trusts the important ones | 1 (three slices' worth) | no | six seats; an unread-key audit at startup so it cannot recur silently |
| Sibling not swept after a class fix | 1 | rule 20 exists | own seat on the next panel |

## External-model calibration

Ox 5 real / 1 disproven / $0 · Kimi 5 / 0 / $0.039 · HY3 4 / 1 disproven / $0.004 · Grok 7 / 1 misread / $0.089 · DeepSeek 4 / 0 / $0.033. Whole panel ≈ $0.17. **Grok's pre-existing-instrument finding alone justified the panel**: it was a hole in a guard I had already "fixed" and dry-looped to CLEAN×2. Every seat found the missing invocation; none of my dry-loop rounds asked "who calls this?" — the question a builder does not ask about their own tool.

## Risks / guardrails

- Pushed as a branch; `main` untouched; PR opened for Sean.
- `swan_pipe.py` remains UNRUN. `smoke.py` runs first.
- CODEOWNERS on the registry and the gltf-transform install are Sean-gated and open.
- The recovered edits were rebuilt from scripts, not from memory; every control was re-run on the rebuilt files and again post-rebase.

## Provenance & privacy

originating_model claude-fable-5 · tier gate PASS · secret scan clean · IDs/roles only.
