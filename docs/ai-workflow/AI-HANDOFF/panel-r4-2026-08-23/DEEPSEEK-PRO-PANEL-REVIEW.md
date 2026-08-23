# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-PACKET-R4-2026-08-23.md
**Seed:** (none)
**Tokens:** 3781 in / 9726 out · **Cost:** ~$0.0094 · **Wall:** 157.6s · **finish:** stop

---

## VERDICT
REVISE — The design claims zero false cleans and zero phantoms, but the implementation leaves a gap for hooks with no recognised script extension and triggers phantoms on option arguments that happen to end in a script extension, violating both guarantees.

## BLOCKERS
1. P0: False negative — A simple command like `node hooks/my-guard` (no `.mjs/.js` etc.) where the file does not exist. The token `hooks/my-guard` fails `SCRIPT_EXT`; no other token matches; the command contains no shell metacharacters so it is never flagged as UNVERIFIED. The entire registration goes silently unchecked, exactly the original outage. Evidence: loop continues on `if (!SCRIPT_EXT.test(tok)) continue;` and the prior `SHELL_META.test(cmd)` gate would return false.
2. P0: False positive (phantom) — A simple command `node validate.mjs --output=report.mjs` where `report.mjs` is a generated artifact that may not exist at check time. The token `--output=report.mjs` satisfies `SCRIPT_EXT`, is not skipped, and causes a missing-file report for an argument that is not a hook script. Evidence: tokenize splits on whitespace, then the loop pushes any non-existent token with a script extension into `missing` without distinguishing command options.

## ATTACKS
- Correctness: The token-scanning loop treats every whitespace-delimited token as a potential script file; a token like `--config=hook.mjs` will be checked and, if missing, reported as a phantom guard. Conversely, any command whose script token lacks a recognised extension is silently dropped, leaving the door open to the very outage the check was built to prevent. Unquoted metacharacters are caught, but the `=` sign is not considered shell meta, so `--eval=...` arguments can slip through as simple.
- Security: No injection risk — inputs are local settings files, and JSON parse errors are handled without crashing.
- Data-truth / schema drift: The code validates array/object shape, so structural drift is handled; no schema drift beyond that.

## HIGHEST RISK
The silent false negative for extensionless script paths (P0 blocker 1) directly re-creates the 2026-08-22 outage. The cheapest de-risk is to add, after the token loop, a fallback: if no token produced a `missing` or `unresolvable` result and no token matched `SCRIPT_EXT`, emit an UNVERIFIED finding for that command. This turns silence into an honest “could not identify script file,” making the check safe for extensionless hooks without requiring shell parsing.

## CONFIDENCE
The code path is unambiguous from the provided snippet, but I could not verify the actual command strings used in the project’s settings files. Concrete evidence would settle it: run the gate against a settings file containing `node hooks/my-guard` (with a missing file) and `node validate.mjs --output=report.mjs` (with a missing report.mjs), then inspect the findings array. The tokenizer’s glue logic for quoted runs is likely correct, but edge cases with malformed quotes inside tokens are untested.
