# PR #73 opened — merge, not rebase; and the chunk walk finally carried a control

**From:** vs-claude (Fable 5) · terminal · 2026-08-25 · branch `feat/atelier-v2-compose` @ `301a9c299`
**Surface:** atelier / release plumbing
**Type:** push + PR + merged-tree re-verification. No product code changed this turn.

## What happened

- Branch was 8 commits behind `origin/main` (Forge catalog work). **Merged** main in — Rule 70 says re-base a moved main, Rule 45 forbids rewriting history without Sean; merge satisfies both. Zero file overlap, zero conflicts.
- The merge added `@swan/forge` as a `file:../packages/swan-forge` dependency. My isolated `npm ci` predated it, so a merged-tree build proof required a reinstall. Done: `npm ci` exit 0, `vite build` ✓ 23.09s.
- **Chunk walk carried a positive control this time** (the Render Queue chunk, known present) — the procedural fix from this morning's third false-absence. `AtelierCompose`, `ContentStudioHub`, and the control all present in `dist/v3/`.
- Pushed; **PR #73** opened against main with the full proof ledger; merged-tree result posted as a PR comment. Linear SWA-165 updated.

## Live-state facts

- **Hermes inbox memos ARE tracked** — 207 committed on main under `.ai-workflow/hermes-inbox/pending/`. The "gitignored / laptop-local" wording in Rule 69 is stale relative to the repo. Four Atelier memos are now committed (`301a9c299`).
- GitHub Actions is dead account-wide (drift-check); PR proof is local only.
- Merging #73 changes nothing at runtime: both lanes are OFF until `SWAN_ATELIER_LOCAL_STILLS=probed` (+ 3 `SWAN_ATELIER_STILL_*` keys) or `SWAN_ATELIER_MAX_SPEND_USD_DAILY > 0`.
- Pre-push hook skips the Rule 42 audit when main is not among pushed refs; I ran 42a/42b by hand before pushing anyway.

## Mistakes I made

- **Wrote `grep -E "->|error"`** to filter the push output; grep parsed `->` as an option and the confirmation line was lost, so I had to verify the remote ref separately. **MECHANISM:** patterns that start with `-` go after `--` or use `-e`.
- **Assumed memos were gitignored** because a rule said so, and left three untracked for a day. Caught by `git check-ignore` + `git ls-tree` on main. **MECHANISM:** a claim about ignore status is answered by `git check-ignore`, not by a doc.

## Error → fix → repeat ledger

| Error class | Recurrences this session | Previously written up? | What stopped it |
|---|---|---|---|
| Doc trusted over the tool that measures it (ignore status) | 1 | No | `git check-ignore` |
| Shell option-parsing in a filter pattern | 1 | No | Exit code from `PIPESTATUS` still read 0; verified the ref directly |
| Absence claim without a control | **0 this turn** — the control was in the command | Yes (three times yesterday) | The procedural shape held |

## External-model calibration

None — no external seat ran.
