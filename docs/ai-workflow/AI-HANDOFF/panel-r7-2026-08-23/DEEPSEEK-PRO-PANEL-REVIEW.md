# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-PACKET-R7-2026-08-23.md
**Seed:** (none)
**Tokens:** 3938 in / 5941 out · **Cost:** ~$0.0053 · **Wall:** 159.9s · **finish:** stop

---

## VERDICT
REVISE — The classifier still contains false-positive paths (unquoted spaces, `--flag=value`) that can return OK for missing hooks, directly violating the invariant that silence means clean.

## BLOCKERS
1. **P0** – Unquoted spaces in command paths cause false OK.  
   Input: `node ./my script.mjs` (no quotes, space in path). The split yields `script.mjs` as a candidate; if a file named `script.mjs` exists anywhere in the repo, `classifyCommand` returns OK, but the intended file `./my script.mjs` is missing.  
   Evidence: `classifyCommand` splits on whitespace after only checking for `"` and `'` (line ~70). No guard for unquoted spaces. This recreates the original outage: a missing hook reads as clean.

2. **P0** – `--flag=value` syntax bypasses the loader-operand guard.  
   Input: `node --import=./preload.mjs ./guard` (no extension on guard). The candidate `--import=./preload.mjs` is a single token; the FLAG_TAKES_FILE check (line ~100) expects a separate word, so it never fires. If that file exists, the classifier returns OK, ignoring the real entrypoint `./guard`.  
   Evidence: `FLAG_TAKES_FILE` regex matches only standalone flags; `--import=...` is not detected. This is the same class of bug as round 6’s loader-operand detection, now in `=` form.

3. **P1** – Symlink following can validate a hook that points outside the repo.  
   If a settings file registers a symlink inside the repo that points to an external file, `statSync` follows it and returns OK, but the executed script may lie outside the repository’s control.  
   Evidence: `statSync(abs).isFile()` (line ~120) follows symlinks; no `realpath` check ensures the target stays within `root`.

## ATTACKS
- **Correctness**  
  - The two P0 blockers above.  
  - The SHELL_META regex does not catch a lone `%` (though WIN_ENV catches `%VAR%`); low risk.  
  - No handling of commands that are a bare script path with spaces (e.g., `./my script.sh` without an interpreter) — same unquoted-space class.  
  - Deduplication key uses `v.key` (raw command for UNVERIFIED, candidate path for MISSING) — consistent and safe.

- **Security**  
  - Symlink following (P1) allows registration of a hook that executes outside the repo, undermining the integrity gate.  
  - No path traversal in file reads (`join(root, '.claude', name)` is safe).  
  - No injection; findings are plain strings.  
  - No authn/authz concerns (local script).

- **Data-truth / schema drift**  
  - The settings schema is handled defensively: non-object `hooks`, non-array groups, missing `hooks` arrays all produce shape warnings. No drift risk.  
  - `scopeNote` accurately limits the claim to project-scope files.

## HIGHEST RISK
The unquoted-space false positive is the most dangerous because it directly resurrects the original outage (missing hook reads as clean) with a plausible real-world pattern (filenames with spaces are common on macOS/Windows).  
**Cheapest de-risk:** After the quoting check, test if the command contains a space and would split into multiple words where one looks like a script path. If so, return UNVERIFIED with a message that spaces in paths require quoting. This closes the hole without complex parsing.

## CONFIDENCE
I could **not** verify from the document alone:  
- Whether the harness that executes hooks follows symlinks or resolves real paths. If it does not, the symlink issue is moot. Evidence: the hook runner’s implementation (not provided).  
- Whether `--flag=value` syntax ever appears in practice; the harness may always separate flags and values. Evidence: the hook command parser’s specification.  
- Whether the test suite (not included) already covers these edge cases. Evidence: the test file for `hook-registration.mjs`.
