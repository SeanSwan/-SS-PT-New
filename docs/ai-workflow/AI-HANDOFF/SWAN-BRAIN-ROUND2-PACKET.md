# SWAN BRAIN — round 2: attack the fixes that round 1 produced

- **Date:** 2026-08-16 · **Branch A** `claude/design-brain-repave-20260816` @ `9420cb5b6` · **Branch B** `claude/constitution-s18-20260816` @ `bd8d0a96c`
- Both pushed, neither merged, **nothing deploy-linked** (Render deploys from `main`).
- **You reviewed round 1. This packet is the diff of what your findings produced.**

---

## 0. YOUR REMIT

**Round 1 found real defects. The fixes for them are now the primary attack surface** — in this workstream, fixes have repeatedly carried worse bugs than the defects they closed.

1. **Are the round-1 fixes correct, complete, and free of new defects?**
2. **What remains unfixed or newly broken?**
3. **Is this safe to merge to `main` now?** If yes say so plainly; the goal is a clean round, not a quota of findings.

**If you find nothing real, say "no new findings" and explain what you checked.** A manufactured finding costs more than a missed one at this stage.

### Output — TABLES FIRST

1. `ID | severity | claim | evidence (diff hunk/file:line) | proposed fix`
2. `branch | safe to merge? | blocking | pre-merge checklist`
3. Prose after.

Severity: CRITICAL / HIGH / MEDIUM / LOW. Label unverifiable claims **HYPOTHESIS**.

---

## 1. WHAT ROUND 1 FOUND, AND WHAT I DID

### Fixed

**KIMI F4 (HIGH) — "pre-existing red" did not absolve the delta.** I had argued three red test surfaces were pre-existing and therefore fine. Wrong, and worse than the packet showed:

| state | result | cause |
|---|---|---|
| `design.html` present (main today) | 2 fail | "external-reference receipt/fallback contract is incomplete" — a real pre-existing defect |
| after branch A merged (before fix) | 2 fail | **ENOENT on design.html** |

Same count, different cause — **my crash masked a real defect.** Fixed by retiring the check together with its subject: deleted `scripts/hermes/design-mirror-check.mjs`, removed its assertion from `receipt-prune.test.mjs`, removed two `design.html` assertions from `verify-world-engine.mjs`, and removed `design.html` from the release-scope list in `verify-world-engine.test.mjs`.

**That last one was missed on the first attempt** and caught only because a verification grep returned `1` where my own label predicted `0`. Source fixed, test's file list missed, one file over — the same partial-sweep class, in the fix for a partial sweep.

Result vs main baseline: `verify-world-engine` 9/2 → **9/2** (identical, crash gone); `receipt-prune` 4 pass/1 fail → **4 pass/0 fail** (better). Branch A now leaves main equal-or-better.

**GLM A1 (MEDIUM) — the sixth "sole" site.** After Fable's earlier overclaim finding I reworded five files and missed `ACTIVE-INDEX.md:26`, which every session reads at startup. Now reworded to "sole canonical **copy** … does not outrank SWAN-CINEMATIC-DESIGN-SYSTEM.md".

**GLM A7 (LOW)** — H1 read "reviewed by Kimi K3 Design **Review**", doubling the word. Trailing "Review" now stripped; the fallback deliberately keeps the full title, since there it stands alone rather than following "reviewed by".

### Disproven by execution — do not re-raise without new evidence

- **GLM A2** — `core.hooksPath = .githooks`, hook present (6970 bytes), and every commit this session printed `[pre-commit]` lines. The canon "wired, verified" claim holds.
- **KIMI F1 / F2** — `body` is `readFileSync` (`consult-glm.mjs:24`); `document` is `readFileSync` (`consult-hy3-design.mjs:118`). Both are file **content**, not paths. You flagged both HYPOTHESIS and were right to — the diff could not show it.
- **GLM A3 / KIMI F7** — wide `git grep` across **all tracked files** for the four old static header strings: every hit is the fix's own comment or a provider `title:` field now serving as fallback. **No reader, no parser exists.**
- **GLM F9** — `scripts/lane.mjs` and `.claude/skills/agent-lane/SKILL.md` both exist; rule 67's commanded artifacts resolve.
- **Header fix proven LIVE** — round 1's own Kimi review returned titled *"SWAN BRAIN — merge-readiness hostile review of two branches — reviewed by Kimi K3"*.

### Accepted but NOT fixed — tell me if any of these blocks a merge

- **GLM A4 (MEDIUM)** — the header derivation is **three hand-maintained copies** across two branches (`consult.mjs`, `consult-hy3-design.mjs` on A; `consult-glm.mjs` on B). Same regex, same constant, no shared module. This is the `design.md`/`design.html` failure mode at code scale, and the hy3 miss was *caused* by that duplication. Deferred because the two branches cannot share a module until they meet on main.
- **GLM A6 (LOW)** — the fence-stripper handles only column-0, paired, triple-backtick fences; an unclosed/indented/4-backtick fence leaks. `slice(0,119)` can split a surrogate pair.
- **GLM A5 / B2 (LOW)** — count drift in my own prose: "9 retitled" was **6 retitled + 3 born new**; "31 lines in two places" — the diff shows three regions (intro, rule 67, startup item 11).
- **KIMI F6 / GLM B1** — after A merges, Rule 40 in both constitutions still calls `design.html` a live mirror. **Verified by trial merge: 4 such references survive.** Needs a follow-up commit cut from post-A main.
- **KIMI F8 (LOW)** — a retitled packet still names branch `@6798ae029`, now three commits stale.
- **GLM H1 (HYPOTHESIS)** — a fourth header surface may exist outside `scripts/` if any review is written by a skill template rather than a generator. The 15 historical generic-header docs' provenance is unattributed.

---

## 2. NEW EVIDENCE SINCE ROUND 1 — THE TRIAL MERGE

I merged both branches onto **current `origin/main`** in a throwaway worktree:

- **Branch B onto main: 0 conflicts.** Post-merge the mirror is IN SYNC and `§18` is absent from both constitutions.
- **Branch A on top: 0 conflicts.**
- **On the merged tree:** brain gate **CLEAN** (28 files · 75 refs · 0 defects); design-brain suite **73 pass / 0 fail**; `design.html` correctly absent.
- **Confirmed order dependency:** 4 constitution references to `design.html` survive the merge and become false.
- **Zero file overlap between the two branches** — they cannot conflict with each other.

Also measured: the repo-wide **CATALOG is stale by 233 rows on main vs 223 on branch A** — i.e. the drift is pre-existing and repo-wide, *not* caused by this work. Branch A has fewer only because it is behind main.

---

## 3. SPECIFIC THINGS TO ATTACK IN THE ROUND-1 DIFF

1. **Deleting `design-mirror-check.mjs` removed a check.** Its subject is gone, but did it assert anything *else* of value — token-extraction coverage, palette validation — that now goes unasserted anywhere?
2. **I removed two assertions from `verify-world-engine.mjs`** on the grounds that `design.md` carries the Full/Lean/Still + Reduced-Motion contract itself. **Verify that claim** — if design.md does *not* carry it, I deleted coverage rather than relocating it.
3. **The A7 regex** `/\s+(?:Design\s+)?Review$/i` strips a trailing word from a provider title. Does it mangle any current or plausible future provider name?
4. **`receipt-prune.test.mjs` now passes 4/0.** Is a test file that lost its only design-related case still testing what its name implies, or did I quietly narrow its remit?
5. **The `ACTIVE-INDEX.md` rewording** — is the new sentence actually true, and does it contradict anything else in that file?
6. **Round-1 completeness:** I fixed 3 findings and disproved 4. Did I silently drop any round-1 finding without either fixing it or disproving it?

---

## 4. THE ROUND-1 FIX DIFF (`28cdf5941..9420cb5b6`)
```diff
diff --git a/ACTIVE-INDEX.md b/ACTIVE-INDEX.md
index 34dd688b9..efb908e7f 100644
--- a/ACTIVE-INDEX.md
+++ b/ACTIVE-INDEX.md
@@ -23,7 +23,7 @@
 - **`docs/ai-workflow/references/FABLE-CONTEXT-COMPRESSION-PROTOCOL.md`** - cost-control rule for Fable token economy: semantic compression, query-first reads, image-context estimator, and proxy safety gates
 - **Startup router rule:** fresh AI sessions read `AGENTS.md`/`CLAUDE.md`, then this index; keep bulky protocol details linked here instead of copied into startup context.
 - **`docs/ai-workflow/hermes-agentic-os/index.md`** - Hermes Agentic OS map: approval gates, receipts, kill switches, channels, command center
-- **`docs/ai-workflow/design-brain/index.md`** - Design Brain map: design.md (canonical, sole — the design.html mirror was retired 2026-08-16), adapters, archetypes, QA gates
+- **`docs/ai-workflow/design-brain/index.md`** - Design Brain map: design.md (canonical, and the sole canonical **copy** — the design.html mirror was retired 2026-08-16; it still ADAPTS SWAN-CINEMATIC-DESIGN-SYSTEM.md and does not outrank it), adapters, archetypes, QA gates
 - **`docs/ai-workflow/references/LENS-ADD-A-STYLE.md`** - the 30-minute five-entry recipe for adding Style Lens #N (proven: aurora-console #26 shipped through it with zero count-literal edits); pairs with `LENS-PORTABILITY-CONTRACT.md` (taking the v2 engine to a new host)
 - **`docs/ai-workflow/AI-HANDOFF/S0-CONSULT-LANE-HANDOFF-2026-08-14.md`** — **START HERE for consult-lane / receipts / model-review work.** S0 is merged (`5b2aa5030`, PR #42): every paid model call now leaves an auditable receipt, and a call that returns nothing is recorded as a failure rather than as `ok`. Carries the mandated hostile review of that work through **both Kimi K3 and HY3** (exact commands, verified dry-run), model calibration showing HY3 at ~40× better cost-per-usable-review, and a **P1: GitHub Actions has been dead repo-wide since 2026-08-12** (100/100 startup_failure) so every merge to main is currently ungated.
 - **`docs/ai-workflow/AI-HANDOFF/SWAN-CONTINUATION-HANDOFF-2026-08-14.md`** — **START HERE for Swan Brain / Forge / taste-curation work.** What is live (Swan Forge, 16 modules, capability truths already paid for — seed and i2i both probed dead, do not re-test), what Sean owes (blind A/B ruling — the file lives ONLY in the primary checkout, `.ai-workflow/` is gitignored), the reviewed 7-slice taste-curation plan (**start at Slice 0**, the contract), how to work alongside parallel agents, and the failure modes that cost this workstream real time. Supersedes `SWAN-MASTER-HANDOFF-2026-08-13.md`
diff --git a/scripts/__tests__/verify-world-engine.test.mjs b/scripts/__tests__/verify-world-engine.test.mjs
index 3657d3c68..3ff930e1e 100644
--- a/scripts/__tests__/verify-world-engine.test.mjs
+++ b/scripts/__tests__/verify-world-engine.test.mjs
@@ -20,7 +20,9 @@ const WORLD_ENGINE_RELEASE_FILES = Object.freeze([
   'docs/ai-workflow/design-brain/adapters/knowledge.md',
   'docs/ai-workflow/design-brain/adapters/reviewers.md',
   'docs/ai-workflow/design-brain/cinematic-pages.md',
-  'docs/ai-workflow/design-brain/design.html',
+  // design.html removed 2026-08-16 — the mirror was retired to docs/_attic/, so copying it into
+  // the release scope raised ENOENT. Found only because a verification grep returned 1 where the
+  // label predicted 0: the source assertions were fixed and THIS list was missed, one file over.
   'docs/ai-workflow/design-brain/design.md',
   'docs/ai-workflow/design-brain/experience-mode.md',
   'docs/ai-workflow/design-brain/external-reference-mcp.md',
diff --git a/scripts/ai-workflow/verify-world-engine.mjs b/scripts/ai-workflow/verify-world-engine.mjs
index d3b5a0ccc..2a964d69d 100644
--- a/scripts/ai-workflow/verify-world-engine.mjs
+++ b/scripts/ai-workflow/verify-world-engine.mjs
@@ -18,7 +18,7 @@ const REQUIRED_FILES = Object.freeze({
   registry: 'docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md', archetypes: 'docs/ai-workflow/design-brain/website-archetypes.md',
   sourceSystem: 'docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md', sourceAssets: 'docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md',
   knowledge: 'docs/ai-workflow/design-brain/adapters/knowledge.md', index: 'docs/ai-workflow/design-brain/index.md',
-  designMd: 'docs/ai-workflow/design-brain/design.md', designHtml: 'docs/ai-workflow/design-brain/design.html', motion: 'docs/ai-workflow/design-brain/motion.md',
+  designMd: 'docs/ai-workflow/design-brain/design.md', motion: 'docs/ai-workflow/design-brain/motion.md',
   cinematic: 'docs/ai-workflow/design-brain/cinematic-pages.md', reviewers: 'docs/ai-workflow/design-brain/adapters/reviewers.md',
   externalReference: 'docs/ai-workflow/design-brain/external-reference-mcp.md', handoff: 'docs/ai-workflow/AI-HANDOFF/SWAN-WORLD-ENGINE-BUILD-HANDOFF-2026-07-12.md',
   roulette: 'scripts/ai-workflow/world-roulette.mjs', rouletteVerifier: 'scripts/ai-workflow/verify-world-roulette.mjs',
@@ -191,8 +191,10 @@ export function auditWorldEngineBundle(bundle) {
   requirePattern(errors, bundle.knowledge ?? '', /direct(?:-to-|\s+)wiki\s+writ/i, 'knowledge adapter must prohibit direct wiki writes');
   requirePattern(errors, bundle.index ?? '', /worlds\.md[\s\S]*techniques\.md[\s\S]*psychology\.md[\s\S]*experience-mode\.md[\s\S]*swan-world-factory/i, 'Design Brain index lacks complete World Engine stitching');
   requirePattern(errors, bundle.designMd ?? '', /Full\/Lean\/Still[\s\S]*Reduced Motion is a separate accessibility override/i, 'design.md must define Full/Lean/Still plus separate Reduced Motion');
-  requirePattern(errors, bundle.designHtml ?? '', /Full cinema[\s\S]*Lean cinema[\s\S]*<b>Still<\/b>[\s\S]*Accessibility override — Reduced Motion/i, 'design.html must mirror Full/Lean/Still plus separate Reduced Motion');
-  if (/Tier 3 — Reduced motion/i.test(bundle.designHtml ?? '')) errors.push('design.html retains the retired Reduced-Motion-as-tier contract');
+  // design.html assertions REMOVED 2026-08-16: the mirror was retired to docs/_attic/. Keeping
+  // them turned a real pre-existing failure ("external-reference receipt/fallback contract is
+  // incomplete") into an ENOENT crash that MASKED it — same failure count, worse information.
+  // design.md carries the Full/Lean/Still + Reduced-Motion contract on its own, asserted above.
   requirePattern(errors, bundle.motion ?? '', /Licensed M4 pointer[\s\S]*Full\/Lean\/Still/i, 'motion doctrine lacks M4 and runtime-mode stitching');
   requirePattern(errors, bundle.cinematic ?? '', /M4 loss-matrix pointer[\s\S]*B3 failure[\s\S]*B1\/B0/i, 'cinematic doctrine lacks M4 backend-loss stitching');
   requirePattern(errors, bundle.reviewers ?? '', /M4 license and failure safety[\s\S]*automatic REVISE/i, 'reviewer adapter lacks M4 automatic-REVISE gate');
diff --git a/scripts/context-gateway/src/consult.mjs b/scripts/context-gateway/src/consult.mjs
index 1756723b6..f772f34cc 100644
--- a/scripts/context-gateway/src/consult.mjs
+++ b/scripts/context-gateway/src/consult.mjs
@@ -233,7 +233,10 @@ async function runConsultInner(providerName, defaultRemit, defaultOut, ctx = {})
   const unfenced = doc.replace(/^```[\s\S]*?^```/gm, '');
   let subject = (unfenced.match(/^#\s+(.+?)\s*$/m)?.[1] ?? '').replace(/\s+/g, ' ').trim();
   if (subject.length > SUBJECT_MAX) subject = `${subject.slice(0, SUBJECT_MAX - 1).trimEnd()}…`;
-  const shortTitle = provider.title.replace(/^SwanStudios\s+/, '');
+  // Trailing "Review" is stripped too, or the H1 reads "reviewed by Kimi K3 Design Review" —
+  // the word doubled. The FALLBACK deliberately keeps the full untrimmed title, because there it
+  // stands alone as the whole heading rather than following "reviewed by".
+  const shortTitle = provider.title.replace(/^SwanStudios\s+/, '').replace(/\s+(?:Design\s+)?Review$/i, '');
   const h1 = subject ? `${subject} — reviewed by ${shortTitle}` : provider.title;
   writeFileSync(outPath, `# ${h1}\n${failBanner}\n**Reviewer:** OpenRouter \`${r.model}\`${effort ? ` (effort: ${effort})` : ''}\n**Document:** ${shortPath(docPath)}\n**Seed:** ${seedPath ? shortPath(seedPath) : '(none)'}\n**Tokens:** ${r.inTok} in / ${r.outTok} out · **Cost:** ~$${r.cost.toFixed(4)} · **Wall:** ${(r.wallMs / 1000).toFixed(1)}s${r.finishReason ? ` · **finish_reason:** ${r.finishReason}` : ''}\n\n---\n\n${r.text}\n`, 'utf-8');
   // Relative, matching the receipt line: an absolute --out carries the OS username into the
diff --git a/scripts/hermes/design-mirror-check.mjs b/scripts/hermes/design-mirror-check.mjs
deleted file mode 100644
index b4b5ad51f..000000000
--- a/scripts/hermes/design-mirror-check.mjs
+++ /dev/null
@@ -1,35 +0,0 @@
-#!/usr/bin/env node
-/**
- * design-mirror-check.mjs — E6 custodial (G-13): design.md is CANONICAL and
- * design.html is its visual mirror; nothing diffed them, so the mirror rots
- * silently. This tiny T0-class checker extracts the canonical hex tokens from
- * design.md and requires EVERY one to appear in design.html — a canonical token
- * missing from the mirror = drift, exit 1. Extra hexes in the html are
- * presentation (gradients, shades) and are reported as a count, not drift.
- * Build tooling like registry-build.mjs — not a registered broker command.
- * Usage: node scripts/hermes/design-mirror-check.mjs
- */
-import fs from 'node:fs';
-import path from 'node:path';
-import { fileURLToPath } from 'node:url';
-
-const HERE = path.dirname(fileURLToPath(import.meta.url));
-const BRAIN = path.join(HERE, '..', '..', 'docs', 'ai-workflow', 'design-brain');
-
-const hexes = (text) => new Set([...String(text).matchAll(/#[0-9A-Fa-f]{6}\b/g)].map((m) => m[0].toUpperCase()));
-
-export function checkMirror(mdPath = path.join(BRAIN, 'design.md'), htmlPath = path.join(BRAIN, 'design.html')) {
-  const md = hexes(fs.readFileSync(mdPath, 'utf8'));
-  const html = hexes(fs.readFileSync(htmlPath, 'utf8'));
-  const missing = [...md].filter((h) => !html.has(h)).sort();
-  const extra = html.size - [...html].filter((h) => md.has(h)).length;
-  return { ok: missing.length === 0, missing, canonical: md.size, extra };
-}
-
-const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/').split('/').pop());
-if (isMain) {
-  const out = checkMirror();
-  if (out.ok) console.log(`mirror in sync: all ${out.canonical} canonical design.md tokens present in design.html (${out.extra} presentation-only hexes ignored)`);
-  else console.error(`MIRROR DRIFT: ${out.missing.length} canonical token(s) missing from design.html: ${out.missing.join(', ')} — design.md wins; update the mirror`);
-  process.exit(out.ok ? 0 : 1);
-}
diff --git a/scripts/hermes/receipt-prune.test.mjs b/scripts/hermes/receipt-prune.test.mjs
index 876a3b3f7..c7335ebf3 100644
--- a/scripts/hermes/receipt-prune.test.mjs
+++ b/scripts/hermes/receipt-prune.test.mjs
@@ -99,9 +99,8 @@ test('E6/G-16: readReceipts answers transparently from the archive after prune',
   assert.ok(bad[0].__unparseable, 'corrupt .gz surfaces as an __unparseable marker');
 });
 
-test('E6/G-13: design-mirror check parses and the live pair is in sync', async () => {
-  const { checkMirror } = await import('./design-mirror-check.mjs');
-  const out = checkMirror();
-  assert.equal(out.ok, true, `canonical tokens missing from design.html: ${out.missing.join(', ')}`);
-  assert.ok(out.canonical >= 20, 'canonical token extraction found the palette');
-});
+// E6/G-13 REMOVED 2026-08-16 together with design-mirror-check.mjs. The test asserted that
+// design.md and design.html held the same canonical tokens; design.html was retired to
+// docs/_attic/, so the check had no subject left. It was ALREADY failing before the retirement
+// (3 canonical tokens missing — the mirror had drifted), which is part of why the mirror went.
+// Deleting the check with its subject is the honest fix; leaving it would have crashed on ENOENT.
```
