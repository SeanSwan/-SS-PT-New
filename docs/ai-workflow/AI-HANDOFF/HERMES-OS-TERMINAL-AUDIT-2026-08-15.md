---
decision: "Audit Sean's Hermes terminal (ui-tui) — establish why it lacks upstream options and specify a Claude-Code/Codex-grade terminal rebuild"
status: open
supersedes: none
originating_model: claude-opus-5
date: 2026-08-15
author: Opus 5 (vs-claude)
---

# Hermes OS — Terminal (ui-tui) Audit & Rebuild Packet
**Date:** 2026-08-15 · **Auditor:** Opus 5 · **Target:** `~/hermes2/hermes-agent/ui-tui`
**Purpose:** input packet for GLM 5.2 (blueprint) + Kimi K3 (hostile review) + Opus 5 (hostile review)

---

## 0. TL;DR — the headline finding

Sean's complaint was *"my Hermes OS doesn't have all the options that the original Hermes OS has."*

**Root cause is version lag** — the install is **4,657 commits behind upstream** (three weeks, three releases, including v0.20.0 "The Herald Release").

> ### ⚠ MAJOR CORRECTION 2026-08-15 — the original claim that "the missing options arrive by updating" is SUBSTANTIALLY FALSE
>
> That sentence rested on **upstream release notes** — which are the upstream equivalent of a
> repo-wide grep: they assert feature *existence*, not *product exposure in this surface*.
> GLM 5.3 flagged it as the fourth instance of this document's recurring scope error and supplied
> the probe. **Probe run against the real upstream tag** (`v2026.8.13` = `4e693dc68`), by extracting
> registered command names from all 8 upstream `slash/commands/*.ts` blobs:
>
> | Command (advertised as v0.20.0 CLI power commands) | In upstream slash registry? |
> |---|---|
> | `/diff` | **NO — absent upstream too** |
> | `/init` | **NO — absent upstream too** |
> | `/context` | **NO — absent upstream too** |
> | `!` shell mode | **NO — absent upstream too** |
> | `/focus` | **YES — new** |
>
> **Upstream registers 68 commands; local registers 66. The entire slash-command delta from
> updating is `focus` and `wake` — two commands, not a feature wave.**
>
> **Correctly scoped statement:** these features are absent *from the ui-tui slash registry* at
> the upstream tag. They may be dispatched elsewhere — `!` shell mode is plausibly input-layer
> (`textInput.tsx`), `/diff` plausibly CLI-side in `agent/`. **That remains UNRESOLVED**, and
> asserting product-wide absence here would repeat the same error inverted.
>
> **Consequence:** updating is still justified — 4,657 commits of fixes, stability, voice, A2A —
> **but NOT by the CLI-power-command story.** Any plan that sells the update to Sean as
> "this is where your missing options come from" is mis-selling it. The `wake.ts` command module
> (wake words) is genuinely new and is the clearest concrete gain.

**Instrument warning for anyone re-running this:** `git grep <rev> -- <path>` returns **empty for
everything** on this shallow clone — a silent false negative that produced a full round of bogus
"NOT registered upstream" results. `git show <rev>:<path>` works. **Always run a known-present
control term first**; a probe that returns zero for every input is broken, not informative.
A stale `.git/shallow.lock` dated 2026-07-30 was also blocking all fetches (backed up to
`/tmp/hermes-shallow.lock.bak-20260815`, removed) — this would have blocked the update too.

The *second* complaint — the terminal being unpleasant to work in versus Claude Code and Codex — is **a separate, genuine problem that updating will not fix.** It requires a presentation-layer rebuild.

These two must not be conflated. **Update first, then reskin** — reskinning a 4,657-commit-stale tree would be throwaway work.

The *second* complaint — the terminal being unpleasant to work in versus Claude Code and Codex CLI — is **a separate, genuine problem that updating will not fix.** It requires a presentation-layer rebuild.

These two must not be conflated. **Update first, then reskin** — reskinning a 4,657-commit-stale tree would be throwaway work.

---

## 1. Verified environment state

All rows below are `[VERIFIED]` — observed this session via executed command.

| Item | Value | Evidence |
|---|---|---|
| Hermes upstream | `github.com/NousResearch/hermes-agent` | `git remote -v` |
| Local version | `0.19.0` | `pyproject.toml` |
| Local HEAD | `a61183b56`, committed **2026-07-24** | `git log -1 --format=%cI` |
| Latest upstream tag | **`v2026.8.13`** (v0.20.1), published 2026-08-13 | GitHub releases API |
| **Commits behind** | **4,657** | GitHub compare API, `behind_by: 0 / ahead_by: 4657` |
| Fast-forward safe? | **Yes** — local HEAD is a clean ancestor (`behind_by: 0`) | same |
| Clone type | **shallow, depth 1** (`rev-list --count HEAD` = 1) | `git rev-parse --is-shallow-repository` → `true` |
| Local modifications | **2 files, +103 lines** | `git status --porcelain` |
| Extra worktree | `codex/hermes-operations-truth-20260712` — **ahead 365** | `git branch -vv` |
| GPU | RTX 5090, **31.8 GiB usable VRAM**, driver 610.62 | `nvidia-smi` |
| Ollama | upgraded **0.32.6 → 0.32.13** this session | `winget`, `ollama --version` |
| Local model | `qwen3.6:35b-a3b` (23 GB, MoE 3B-active) | `ollama list` |

### 1.1 ⚠ Local work at risk — MUST be preserved

`git status` shows two modified files that are **not** upstream:

```
 M tui_gateway/server.py            (+23)
 M tests/test_tui_gateway_server.py (+80)
```

This is **a real bug fix with a real test**, not scratch work. It expands user quick-command aliases in `tui_gateway/server.py` *before* routing, so that an alias like `/builder → /model deepseek --global` does not persist a new global default while leaving the live session on the old model. The comment block explicitly documents the failure mode it prevents.

**A naive `git checkout v2026.8.13` or `git reset --hard` destroys this.** Any update procedure must stash/branch it first and re-apply or confirm upstream fixed it independently.

There is additionally a worktree branch `codex/hermes-operations-truth-20260712` sitting **365 commits ahead** of its base. Its contents are unaudited by this pass and must be triaged before any cleanup touches `~/hermes2/worktrees/`.

---

## 2. What the version lag actually costs — the "missing options"

From upstream release notes for the three releases Sean does not have:

### v0.19.1 (2026-07-30) — ~2,789 commits
Gateway/voice/desktop/installer salvage waves; Buzz/Nostr channel; FLUX3 video generation & delivery; Telegram media reliability.

### v0.20.0 "The Herald Release" (2026-08-03) — ~3,650 commits, ~1,400 PRs
The largest release in project history. Directly relevant to Sean's complaints:

- **CLI power commands — `!` shell mode, `/init`, `/diff`, `/context`, `/focus`.** These are precisely the Claude-Code/Codex-CLI-class affordances Sean is asking for.
- **Real-time conversational voice** — streaming TTS, barge-in (interrupt mid-sentence), on-device wake words, hands-free across CLI/desktop/gateways.
- **A2A v1.0** — agent-to-agent protocol.
- **Signed outbound webhooks.**
- **Grounded research** with verifiable citations + fact-checking.
- **Desktop app became a platform** — artifacts with live preview, plugin SDK, quick-entry, multi-window.
- Smarter/gentler compression; tools that recover from their own failures instead of making the model guess.

### v0.20.1 (2026-08-13) — 1,444 commits, ~656 PRs
Broad stabilization across desktop, gateway platforms, installers, tool system, provider catalogs.

### 2.1 Feature-presence grep — ⚠ CORRECTED 2026-08-15 after hostile review

> **This section originally reported five features as MISSING. Three of those claims were FALSE.**
> They came from a grep scoped to only `ui-tui/src` + `agent`, whose scoped negative I wrote up as
> a product-level absence. Kimi K3 challenged the scope; a repo-wide re-grep disproved me.
> Corrected table below. Do not cite the original numbers.

Repo-wide grep (excluding `node_modules`/`.git`) vs the original narrow scope:

| Feature | Narrow scope (`ui-tui/src`+`agent`) | **Repo-wide (authoritative)** | Status |
|---|---|---|---|
| `/diff` | 0 files | — (ui-tui-scoped question; scope valid) | ❌ absent from ui-tui |
| `!` shell mode (`shell_mode`) | 0 files | **0 files** | ❌ absent |
| voice barge-in (`barge`) | 0 files | **43 files** | ✅ **PRESENT — original claim WRONG** |
| wake words (`wake_word`) | 0 files | **5 files** | ✅ **PRESENT — original claim WRONG** |
| A2A (`a2a`) | 0 files | **163 files** | ✅ **PRESENT — original claim WRONG** |
| `/context` | 12 files | — | ✅ present (v0.19.0) |
| `/init` | 8 files | — | ✅ present |
| `/focus` | 3 files | — | ✅ present |

### 2.2 ⚠ AUTHORITATIVE — the command registry (the probe nobody ran until GLM 5.3 named it)

> GLM 5.3 (§1.1) pointed out that **both** earlier tables were wrong in the same way: a narrow grep
> proved nothing, and the repo-wide grep proved only *repository presence*, not *product exposure*.
> 163 files can be tests, fixtures, docs, or dead modules. **The correct probe is the slash-command
> registry** — `ui-tui/src/app/slash/{registry.ts, commands/*.ts}`. It was run 2026-08-15.
> **This table supersedes both tables above.**

**66 registered entries** (≈63 real commands after parse noise) in 7 command modules
(`core, debug, ops, session, setup, subscription, topup`):

```
agents background battery branch browser busy clear compress copy density details fast
fortune heapdump help history image indicator journey logs mem model mouse paste
personality pet plugins prompt queue quit reasoning redraw reload reload-mcp reload-skills
replay replay-diff retry rollback save sessions setup skin skills status statusbar steer
stop subscription terminal-setup theme theme-info title tools topup undo update usage
verbose voice widgets-reload yolo
```

| Command | Registry status | Corrects |
|---|---|---|
| `/diff` | **not registered** | original claim holds |
| `!` shell mode | **not registered** | original claim holds |
| `/context` | **NOT REGISTERED** | ❌ I called this "✅ present" — **wrong at product level** |
| `/init` | **NOT REGISTERED** | ❌ I called this "✅ present" — **wrong** |
| `/focus` | **NOT REGISTERED** | ❌ I called this "✅ present" — **wrong** |
| `/voice` | **REGISTERED** | voice IS product-exposed; barge-in/wake-words are sub-features of a shipped command |
| `/replay-diff` | **REGISTERED** | diff rendering is not wholly absent — H6 must be re-scoped |
| `/journey`, `/pet`, `/agents` | **REGISTERED** | **H4 CONFIRMED on proper evidence** — the novelty surface is genuinely user-exposed, not merely present in the tree |

**Net:** the `/context` `/init` `/focus` grep hits were in the **agent** package, not the TUI —
they are not commands Sean can type. My "✅ present" rows were the *same error inverted*: a
positive asserted from a scope that could not establish it.

**Corrected conclusion:** the version-lag finding (§1, §2) still stands — it rests on the GitHub
compare count (4,657, `behind_by: 0`) and the upstream release notes, neither of which any of
these grep errors touches. But **neither grep table is evidence for it**; only §2.2 is.

**Method rule this produced (three iterations to learn):** a claim is only as strong as the
surface it was probed against. A narrow grep proves nothing; a wide grep proves *presence*, not
*exposure*. For "does the product offer X," probe the **registry/route table** — the surface that
defines what users can actually reach. This applies to positives exactly as much as to negatives.

---

## 3. The terminal itself — what actually exists today

| Metric | Value |
|---|---|
| TS/TSX files under `src` | **266** |
| Total LOC | **56,640** |
| Components | **36** |
| Stack | TypeScript + React + **Ink** (React-for-terminal) |

**Existing components (36):** accordion, activeSessionSwitcher, agentsOverlay, appChrome, appLayout, appOverlays, billingOverlay, branding, fpsOverlay, gridStreamsDemo, gridTestOverlay, helpHint, journey, loaders, markdown, maskedPrompt, messageLine, modelPicker, overlay, overlayControls, overlayPrimitives, overlayScrollbar, petPicker, petSprite, pluginsHub, prompts, queuedMessages, skillsHub, streamingAssistant, streamingMarkdown, subscriptionOverlay, textInput, themed, thinking, todoPanel, widgetGrid.

**Core shell sizes:**

| File | LOC | Note |
|---|---|---|
| `src/components/textInput.tsx` | **1,501** | composer — largest single component |
| `src/components/appChrome.tsx` | 845 | frame/header/status |
| `src/components/appLayout.tsx` | 590 | layout arbiter |
| `src/theme.ts` | 944 | palette engine |
| `src/components/messageLine.tsx` | 289 | transcript row |
| `src/components/streamingMarkdown.tsx` | 166 | incremental markdown |
| `src/app.tsx` | 25 | thin entry |

### 3.1 The theme layer is better than the complaint implies

`src/theme.ts` is **not** a naive color map. It is a seed-based palette generator with genuine accessibility machinery:

- `buildPalette(seeds, isLight)` derives a full palette from `DARK_SEEDS` / `LIGHT_SEEDS`
- `contrastRatio` / `ensureContrast` exported from `lib/color.js`
- Explicit contrast floors: `DISPLAY_MIN_CONTRAST 1.45`, `SEMANTIC_MIN_CONTRAST 2.2`, plus separate light-mode floors
- `normalizeThemeForAnsiLightTerminal()` — degrades correctly on 256-color terminals
- `detectLightMode()` with luma thresholds and per-terminal defaults

Sean's gold/bronze customization is injected at `~/.hermes/tui-theme-boot.json` and loaded by `src/lib/themeBoot.ts`.

**Implication for the rebuild:** the problem is **not** the color system. Do not rewrite `theme.ts`. The dissatisfaction lives in **layout, chrome, information density, motion, and interaction affordances** — `appChrome.tsx`, `appLayout.tsx`, `messageLine.tsx`, `textInput.tsx`.

---

## 4. Why it "feels like a chore" — hypotheses to be tested by the review panel

These are `[HYPOTHESIS]` — they are the reviewers' job to confirm, refute, or extend. They are **not** verified defects.

- **H1 — Chrome-to-content ratio.** 845 LOC of chrome plus overlays suggests heavy persistent framing. Claude Code and Codex CLI are near-chromeless: transcript dominates, status is one quiet line.
- **H2 — Transcript legibility.** `messageLine.tsx` at 289 LOC handles every row type. Claude/Codex win on generous vertical rhythm, restrained color, and clear role separation.
- **H3 — Composer weight.** `textInput.tsx` at 1,501 LOC is the biggest component. Suspected mixed concerns (editing + history + completion + selection + paste). Input latency here is felt on every keystroke.
- **H4 — Novelty surface vs work surface.** `petSprite`, `petPicker`, `petFlashStore`, `fpsOverlay`, `gridStreamsDemo`, `gridTestOverlay`, `journey` are present in the default build. Claude Code and Codex ship nothing comparable. Cognitive noise on a work tool.
- **H5 — Overlay-first navigation.** Six overlay modules (`overlay`, `overlayControls`, `overlayPrimitives`, `overlayScrollbar`, `appOverlays`, plus hubs). Modal-heavy navigation interrupts flow; Claude/Codex keep interaction inline.
- **H6 — Diff rendering.** `/diff` is absent locally and `DIFF_DARK`/`DIFF_LIGHT` exist only as theme constants. Reviewing code changes is central to Claude/Codex; this is likely the single biggest experiential gap.
- **H7 — Motion/streaming feel.** ⚠ **RETRACTED 2026-08-15.** Original text: *"Upstream v0.19.0 claims 14× faster streaming markdown and per-token painting. Sean's build predates part of that curve."* This is incoherent — the local build **IS** v0.19.0, so it already holds those improvements; "predates part of that curve" never named which part. Kimi K3 flagged it; the contradiction is with this document's own §1. **There is no evidentiary basis for a motion/streaming complaint.** Any future streaming work is verification-only until a real capture (see §4.1) shows otherwise.

### 4.1 ⚠ The whole of §4 is unfalsifiable as written

Every hypothesis above is derived from **static analysis only** — file sizes, component counts, and greps. Not one frame of the running terminal was captured. LOC is not render cost (a 1,500-line file can paint one line; Ink cost is tree-shape, not file size), and file presence is not default rendering. H1, H2, H3 and H5 in particular rest on LOC proxies and are marked `[HYPOTHESIS]` for exactly that reason.

**Verified exceptions** (these two were actually checked):
- **H4 holds** — `petSprite` and `fpsOverlay` are mounted in the default tree at `ui-tui/src/components/appLayout.tsx:108` and `:571`.
- **H6 holds locally** — `/diff` is grep-absent from `ui-tui`, though it ships upstream in v0.20.0 and therefore closes on update.

**A single asciinema capture at 120×40 and 80×24 would be worth more than this entire section.** Do that before acting on any hypothesis here.

---

## 5. Constraints any rebuild must respect

1. **Do not fork upstream.** At ~4,657 commits per three weeks, a fork is unmaintainable within one release cycle. All work must be theme-layer, config-layer, or upstreamable patches.
2. **Preserve the local `tui_gateway` alias fix** (§1.1) until confirmed upstream.
3. **Do not rewrite `theme.ts`** (§3.1) — extend its seeds instead.
4. **Ink/React is the substrate.** Not negotiable without a full rewrite.
5. **`ui-tui` is upstream code, not SwanStudios code.** SwanStudios CLAUDE.md rules on styled-components, Victory charts, and the Crystalline palette **do not apply here**. Rules on evidence, hostile review, and secret handling **do**.
6. **Terminal reality:** must degrade to 256-color and to no-truecolor terminals; must not assume a specific font or emoji width.

---

## 6. What the review panel is asked to produce

### GLM 5.2 — blueprint author
1. A **Mermaid architecture flowchart** of the proposed terminal (current → target).
2. A **Mermaid sequence diagram** for the render/stream path (keystroke → gateway → token → paint).
3. **ASCII wireframes** of the target terminal at 120×40 and 80×24, showing: idle, streaming response, tool call in progress, and diff review.
4. A **numbered, independently-shippable slice plan**, each slice with explicit acceptance criteria a worker-bot can execute with zero further questions.
5. An explicit **keep / cut / defer** table for the 36 existing components.

### Kimi K3 — hostile reviewer
Attack the blueprint. Specifically: where does it break upstream compatibility; where does it create merge debt against a 4,657-commit/3-week cadence; where is it cosmetic rather than experiential; which hypotheses in §4 are wrong; what did it miss.

### Opus 5 — hostile reviewer
Independent pass, same remit, plus: verify every factual claim in this packet against the repo, and flag anything GLM or Kimi assert without evidence.

---

## 7. Recommended execution order (proposed, not yet approved)

| # | Step | Risk | Reversible? |
|---|---|---|---|
| 1 | Branch + stash the 2 local patches | none | yes |
| 2 | `git fetch --unshallow` | none (read) | yes |
| 3 | Triage the 365-commit Codex worktree | none (read) | yes |
| 4 | Fast-forward to `v2026.8.13`, reinstall deps | medium | yes (branch) |
| 5 | Re-apply / retire the alias patch; run test suite | low | yes |
| 6 | **Re-audit the terminal on the NEW tree** — §3/§4 may be partly obsolete | none | — |
| 7 | Execute the GLM/Kimi-ratified reskin slices | per slice | per slice |

**Step 6 is not optional.** Three releases of TUI work landed since this tree; §4's hypotheses may already be fixed upstream. Reskinning before re-auditing risks solving problems that no longer exist.

---

## 8. Open questions for Sean

1. The 365-commit `codex/hermes-operations-truth-20260712` worktree — keep, merge, or archive?
2. Voice/A2A/webhooks arrive with the update. In scope, or noise to be switched off?
3. `pets` / `fpsOverlay` / `gridDemo` — cut from your build, or keep?
4. Is a **config/theme-layer** reskin acceptable, or do you want upstreamable **PRs** to NousResearch?

---

## 9. Mistakes I made

- **Assumed Ollama could pull `qwen3.8` at its installed version.** I started a 45 GB background download before checking client compatibility; the registry rejected both pulls with an upgrade notice and the run was wasted. Caught by reading the log rather than trusting exit code 0 — the wrapper exited 0 while both pulls failed. **Rule that prevents the repeat:** verify tool-version compatibility *before* dispatching a long download, and never treat a pipeline's exit code as proof its inner commands succeeded.
- **Claimed GLM 5.3 does not exist — it does, and it later reviewed this very document.** ⚠ GLM 5.3 flagged the resulting contradiction (§2.2 credits GLM 5.3 with naming the registry probe while this section denied its existence, same document, same date): *"I am comfortable with my existence; the document's provenance for its own key evidence is not."* I checked only the OpenRouter catalog (ceiling `glm-5.2`) and asserted non-existence. Z.ai serves `glm-5.3` on its **coding** endpoint. I additionally misdiagnosed Sean's working subscription as unattached by probing the PAYG endpoint — a free-tier model answering there made the wrong conclusion look confirmed. Access rules: `docs/ai-workflow/references/GLM-ZAI-ACCESS.md`. **Kimi K3.2 genuinely does not exist** — newest is `moonshotai/kimi-k3`; that half stands. **Rule:** probe the vendor's own API before declaring a model absent, and grep the repo for an existing access reference first — one already existed, on this branch, written the same day.
- **Initially treated "most powerful" as a pure spec question.** `27b-bf16` is nominally the most powerful build and I nearly queued it; it is 51.8 GB against 31.8 GiB of VRAM and would have crawled. Caught by checking `nvidia-smi` before pulling. **Rule:** size every model against measured VRAM, not against the tag name.
