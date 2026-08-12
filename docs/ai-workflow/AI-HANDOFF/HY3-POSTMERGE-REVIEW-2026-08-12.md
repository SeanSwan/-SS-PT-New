# Tencent Hy3 - Design Inspiration

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/COORDINATION-POSTMERGE-REVIEW-PACKET-2026-08-12.md
**Seed:** (none)
**Tokens:** 15454 in / 19182 out | **Cost:** ~$0.0122 | **Wall:** 210.4s | **finish_reason:** stop

---

Ranked by cost × likelihood (1 = highest). File:line citations reference the shipped sources.

**1. Three-dot diff range reports other agents’ merged files as your push**  
`scripts/hooks/push-blast-radius.mjs:88` (with `remoteRef` resolved at `:84`).  
`git diff --name-only ${remoteRef}...HEAD` uses `...` (merge-base both sides). On a live repo with 110 worktrees and constant merges to `main`, any push to a branch off `main` includes files from commits that exist only on the remote — they are not in your push. Those files feed `hits` (`:96`) and `lockClash` (`:108-112`), producing false “EXECUTED on deploy” and false lock-clash warnings. Cost: agents needlessly split safe pushes or, worse, learn to ignore the one local warning that catches real migrations. Likelihood: near-certain on any active branch. Patch: use `..` and derive the diff ref from the actual push target, not `branch`.

**2. “EXECUTED by automation on deploy” printed for non-deploy pushes**  
`scripts/hooks/push-blast-radius.mjs:132-141`. The `hits` block unconditionally asserts files “are EXECUTED by automation on deploy” even when `targetsDeployRef` is false (feature-branch push). Same false-positive class as #1, independent of the diff bug. Cost: alert fatigue; the production-migration paragraph (`:136-141`) is the highest-value warning and gets diluted. Likelihood: high (most pushes are not to deploy-linked refs). Patch: gate the “EXECUTED on deploy” language and the `render.yaml` migration paragraph on `targetsDeployRef`.

**3. `release()` only clears `- ` bullet locks → phantom locks after “released”**  
`scripts/lane.mjs:148-162` (while-condition `:150`, `removed` counter `:151`, leftover verifier `:157-159`). `parseLane` (`scripts/lib/lane-core.mjs:136-169`) accepts `*`, `+`, numbered, checkbox, or bare lines, but `release()` assumes every lock line starts with `- `. A hand-edited or legacy lane using `* file` (or plain `file`) is left in the section after “released” is printed; the leftover check only inspects lines starting with `- `, so it passes silently. Result: digest still reports the file as locked by a session that believes it released — the false-negative collision-detector class. Cost: silent overwrite of a “free” file. Likelihood: moderate (agents edit lanes by hand). Patch: drive removal from `parseLane` output, not from a bullet prefix.

**4. `parseLane` drops space-separated paths inside one bullet**  
`scripts/lib/lane-core.mjs:149` (`.split(/\s+/)[0]`). A bullet `- a.ts b.ts` yields only `a.ts`; `b.ts` is never registered as a lock. Under-report. Cost: missed lock, collision. Likelihood: moderate (comma is documented but humans write spaces). Patch: after comma-split, also split each token on whitespace and keep all path tokens.

**5. `targetsDeployRef` true whenever current branch is main/master/production, regardless of push target**  
`scripts/hooks/push-blast-radius.mjs:69` (`['main','master','production'].includes(branch || '')`). An agent on `main` who runs `git push origin feature` gets the `⚠ DEPLOY-LINKED` flag and the production-migration lecture. False positive. Cost: alert fatigue. Likelihood: low-medium (main-tree sessions exist). Patch: drop the `branch` OR, or only infer deploy-linked from the resolved refspec.

**6. Glob `*` matches across directory boundaries**  
`scripts/lib/lane-core.mjs:209` (appended `(?:/.*)?$` after compiling `*` to `[^/]*`). `src/*` locks `src/foo/bar`, over-broadening a directory claim. Causes false `lockClash` entries in the push hook and false “DO NOT edit” in digest. Cost: unnecessary friction / ignored digests. Likelihood: low (`dir/*` plausible but rare). Patch: drop the trailing `(?:/.*)?` unless the pattern contained `**`.

**Lower-ranked / wiring mismatches (not parsing, but in remit):**

- **SKILL.md §3 says hash is “six characters”; code uses 10** (`lane-core.mjs:84` `slice(0,10)` vs SKILL.md §3). Doc contradicts the “one source of truth” claim.
- **SKILL.md says “five pre-existing Stop hooks”; `settings.json` wires six** (`settings.json` Stop array). Misleading count, no functional impact.
- **`parseLane` existence escape-hatch uses main-repo root, not declaring worktree** (`lane-core.mjs:169` with `root` from `readLanes:180`). A bare directory lock existing only in a worktree but not yet in main is filtered out → under-report. Low likelihood.
- **`PreToolUse` timeout 15s on `push-blast-radius.mjs`** (`settings.json`). At 110 lanes + large `git diff`, a slow machine could hit the timeout; if the harness treats timeout as hook failure, the “never break a push” contract is violated. Scale-only risk; raise timeout.

**Revert vs patch:**  
No finding warrants a full revert of the merge. The already-fixed defects are excluded; the remaining items are patchable and the core ledger parse/write logic is not structurally broken. However, #1 and #2 make `push-blast-radius.mjs` assert false production-migration impact on every feature-branch push and every divergent `main` push. Because that hook is the only local early-warning control, its false “production migration” output is exactly the alert-fatigue failure mode the design doc forbids. If a patch cannot land the same day, **revert the hook’s wiring in `settings.json` (remove the `PreToolUse` `push-blast-radius.mjs` entry) rather than leave it misleading** — server-side branch protection remains the real enforcement. All other findings are patch-only.
