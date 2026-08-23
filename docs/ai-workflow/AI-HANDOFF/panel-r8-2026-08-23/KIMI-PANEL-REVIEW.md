# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-PACKET-R8-2026-08-23.md
**Seed:** (none)
**Tokens:** 4534 in / 3896 out | **Cost:** ~$0.0720 | **Wall:** 66.9s | **finish_reason:** stop

---

## VERDICT
REVISE — the classifier is genuinely tight after 8 rounds, but the emit path hard-codes `process.exitCode = 0`, so a confirmed MISSING phantom-guard alarm can never fail anything, and the round-7 containment fix has a case-sensitivity false-positive on macOS/Windows.

## BLOCKERS

1. **P1 — MISSING findings are advisory-only; the gate cannot gate.** `scripts/hooks/drift-check-gate.mjs` (emit tail): `process.exitCode = 0` is set unconditionally, even when `audit.findings` contains "registered hook file(s) DO NOT EXIST". The module's own header states the 2026-08-22 outage was "only ever caught by a human noticing a second-order symptom" — i.e., humans ignoring ambient signal is the *known* failure mode. A warning-line among other drift warnings, with a green exit, reproduces exactly that: protection off, CI/session reads as on. If exit-0 is deliberate policy for drift checks, MISSING hook files are not "drift" — they are the outage this whole module exists for, and they ride the same non-blocking path. The document gives no justification for exit 0 on this specific finding class.

2. **P2 — Case-insensitive filesystems produce false UNVERIFIED on healthy registrations.** `hook-registration.mjs` containment block: `realpathSync` returns canonical-case paths (macOS APFS, Windows), but `real.startsWith(rootReal + sep)` is a case-sensitive string compare. If the operator's checkout path differs in case from the on-disk canonical case (e.g. root typed as `/Users/Dev/Repo`, realpath returns `/Users/dev/Repo`), every otherwise-healthy hook reads UNVERIFIED. Safe direction (no false clean), but it manufactures noise in the loud path — the documented mechanism by which "a gate loses trust" and operators start ignoring it, which the header itself names as the consent-based restoration of the outage.

3. **P2 — `root` at a filesystem root makes containment unpassable.** `resolve(root) + sep` when `resolve(root) === '/'` yields `'//'`, which no absolute path starts with, so every candidate returns UNVERIFIED. Unlikely for a repo root, but the function is exported and takes `root` as a parameter; nothing guards it.

No P0s. The four round-7 fixes themselves are sound: the equals-form decline (`tok.startsWith('-')`) correctly closes `--import=./x.mjs`; the root-shape guard closes the `null`/`[]`/`"str"` silent-clean and the `null.hooks` throw that used to escape into the caller's catch; realpath containment closes the symlinked-dir escape; `scopeNote` is now actually emitted.

## ATTACKS

- **Correctness — eval flags not in `FLAG_TAKES_FILE`:** `-e` / `-p` (node), `-c` (python/bash meaning command-string, not file) are absent or wrong-semantics. `node -e ./guard.mjs` (unquoted, no shell meta) yields candidate `./guard.mjs`, `words[idx-1] === '-e'` doesn't match, statSync succeeds → **OK verdict on a file node will execute as eval source, not as an entrypoint**. The hook then fails loudly at runtime, so this is a wrong-OK rather than a silent clean — but it is a false assertion from a classifier whose contract is "lies in neither direction". Low severity; conservative fix is adding `-e`/`-p` to the decline set.
- **Correctness — TOCTOU between `realpathSync(abs)` and `statSync(abs)`:** the realpath is computed, then `statSync(abs)` re-follows the (possibly swapped) symlink. Stat `real` when realpath succeeded, or accept it — for a local pre-push hook this is negligible, but the code currently checks containment on one path and existence on another.
- **Correctness — `scopeNote` only emitted when `findings.length`:** clean runs never show the scope limitation. Consistent with "OK is the only silent verdict", but the round-7 fix rationale was that the limitation must be *seen*; it is still invisible in the state operators see most. Judgment call, not a defect.
- **Correctness — dedupe key includes `kind`:** the same command registered twice in the same event where one stat succeeds and one errors (e.g. transient EACCES between two `statSync` calls) yields both OK (silent) and UNVERIFIED. Harmless but shows dedupe is per-verdict, not per-registration.
- **Security:** no injection surface (no exec; all shell-meta input is declined, never evaluated). No secrets, no network, no multi-tenant scope. The classifier's narrowness is itself the security control and it holds. Nothing to attack here beyond the TOCTOU above.
- **Data-truth / schema drift:** the harness settings shape assumed (`hooks → event → groups[] → group.hooks[] → hook.command`) is asserted in comments but not validated against any schema source in the document. If the harness ever permits `hooks: { event: { hooks: [...] } }` (single group unwrapped) or a top-level `command`, this audit reports shape findings rather than missing the hooks — safe direction. No drift between `classifyCommand`'s return shape and the caller's consumption (`v.kind`/`v.key`/`v.path`/`v.why` all match).
- **House rules:** N/A to these files (Node scripts, no UI). No styled-components/MUI/Recharts/palette/touch-target surface; no PII-to-LLM path; no prohibited language. No violations to flag.

## HIGHEST RISK

Blocker 1: exit 0 on confirmed MISSING. The entire module exists because "nothing" was byte-identical to "clean"; a non-blocking warning among other warnings is the same signal buried one level shallower. Cheapest de-risk: in check 7, track `audit.findings` severity separately — if any finding contains "DO NOT EXIST", set `process.exitCode = 1` (or route MISSING to whatever hard-fail channel the harness provides) while leaving drift warnings at 0. That is a ~3-line change and converts the highest-severity alarm from advisory to blocking. If the team deliberately wants this gate non-blocking, write that decision and its rationale next to `process.exitCode = 0` — the comment currently documents *why not process.exit()*, not *why exit 0*.

## CONFIDENCE

- **I could not see the full `drift-check-gate.mjs`** — only the check-7 tail. `SS_PT` is used but not defined in the excerpt; if it is derived from `import.meta.url` vs `process.cwd()`, symlinked checkouts could interact with the realpath containment in ways I cannot evaluate. Evidence needed: the file head defining `SS_PT`.
- **I could not see the fuzz test** the header claims ("the test fuzzes for [completeness]"). My "no zero-verdict path found" conclusion is from reading, not from running the claimed totality fuzzer. Evidence needed: the test file, specifically whether it fuzzes `auditHookRegistrations` (shape-level) or only `classifyCommand` (entry-level) — the round-7 root-shape fix lives in the former.
- **Exit-0 intent:** I cannot tell from the document whether the drift gate is contractually advisory (in which case Blocker 1 downgrades to a design disagreement) or whether MISSING was meant to block. Evidence needed: how the harness consumes this hook's exit code and whether any other check in the gate sets non-zero.
- **Windows behavior:** `WIN_ENV` and `C:\` handling look right by inspection, but I did not verify `realpathSync` case-canonicalization behavior across APFS/NTFS versions — Blocker 2's trigger frequency is uncertain, though the fix (case-insensitive compare or `path.relative`) is cheap regardless.
