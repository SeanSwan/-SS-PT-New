# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-PACKET-R3-2026-08-23.md
**Seed:** (none)
**Tokens:** 5238 in / 3316 out | **Cost:** ~$0.0655 | **Wall:** 27.7s | **finish_reason:** stop

---

## VERDICT
REVISE — the round-2 fixes are directionally right, but the check-7 tokeniser still produces false positives on two realistic command shapes (`sh -c '…'` and backslash-escaped spaces), which is the exact phantom-finding failure mode the file's own header says restores the original outage.

## BLOCKERS

1. **P1 — Phantom "missing hook" on `sh -c 'node scripts/hooks/x.mjs'` (or any quoted command-with-spaces).** Input: a hook whose command is `sh -c 'node scripts/hooks/x.mjs'`. The tokeniser matches `'node scripts/hooks/x.mjs'` as one quoted run, strips quotes → token `node scripts/hooks/x.mjs`, which passes `SCRIPT_EXT` (ends in `.mjs`), contains no `$%{}`, is not absolute → `join(SS_PT, 'node scripts/hooks/x.mjs')` → `existsSync` false → reported MISSING on a perfectly healthy hook. Evidence: `drift-check-gate.mjs`, the `tokenize` definition (`.map((t) => t.replace(/["']/g, ''))`) and the `if (!existsSync(abs)) missing.push(...)` line. The glue-fix for `"$DIR"/path` created this: any quoted run containing a space and ending in a script extension is now treated as a path. This is the precise "phantom trains operator to ignore the gate" scenario the comments warn about.

2. **P1 — Phantom on backslash-escaped spaces in paths.** Input: `node scripts/my\ hooks/x.mjs`. Tokeniser splits on whitespace regardless of escaping → tokens `scripts/my\` and `hooks/x.mjs`. The second passes `SCRIPT_EXT`, is relative → checked as `SS_PT/hooks/x.mjs` → phantom missing. Evidence: same `tokenize` regex `[^\s"']` — it has no escape handling, and the later `tok.replace(/\\/g,'/')` only runs *after* the split, so it cannot repair the damage.

3. **P2 — False negative on `;`-glued commands.** Input: `node a.mjs;node missing.mjs` (or `cmd1; cmd2` without spaces). `a.mjs;node` fails `SCRIPT_EXT` (`$`-anchored), and `missing.mjs` is never its own token → a genuinely absent hook file reports clean. Lower likelihood in real settings.json commands, but it is a silent-clean path in a check whose entire purpose is killing silent-clean paths. Evidence: `tokenize` splits only on whitespace/quotes; `SCRIPT_EXT = /\.(?:…)$/i`.

4. **P2 — `~/` paths phantom.** `node ~/hooks/x.mjs`: tilde is never expanded, no `$%{}` present, treated as relative → `join(SS_PT, '~/hooks/x.mjs')` → missing. Add `~` to the unresolvable test or expand it.

## ATTACKS

- **Correctness (check 7):** Dedup key is `${event}:${tok}` — it omits the settings filename, so the same hook registered in both `settings.json` and `settings.local.json` is checked once and reported once; if the two files resolve differently (they can't here, since both join against `SS_PT`, but the key structure hides which file declared it in the `missing` message only via the first-seen `name`). Minor, but the report can attribute a finding to the wrong file.
- **Correctness (check 7):** `hook?.command || ''` assumes the hooks schema is always a `command` string. If the harness also supports an `args` array or a `type: "prompt"` hook, those are silently skipped — a potential false-negative class the document gives no evidence of handling. Unverifiable from here (see CONFIDENCE).
- **Correctness (consult-panel):** `requested.filter((n) => SEATS[n].paid)` and `SEATS[n].premium` will throw `TypeError: Cannot read properties of undefined` on an unknown seat name (`--seats gemni`). No validation of `requested` against `SEATS` is shown in the excerpt. If it exists earlier in the file, fine; the document doesn't show it.
- **Correctness (consult-panel):** `seedPath && existsSync(seedPath) ? … : ''` — an explicitly passed `--seed` that doesn't exist is silently dropped. For a file whose whole thesis is "silence is ambiguous," a missing explicit seed should be a hard error, not an empty string.
- **Security (consult-gemini-panel):** `console.error(… key=present(${apiKey.length}ch))` leaks key length into stderr, which consult-panel.mjs captures verbatim into INDEX.md (per the file's own comment). Key length is low-grade metadata, but it goes into a persisted artifact; drop the length or hash-prefix it.
- **Security (consult-gemini-panel):** Error-body scrub is `.split(apiKey).join('<REDACTED>')` — correct for exact echoes, but if Google ever returns the key URL-encoded or partially masked, the scrub misses. Low risk now that the key is in a header; acceptable residual.
- **Security / house rule (zero PII to LLMs):** All three egress strings (document, seed, remit) are now redacted at the boundary — good. But the document never shows `redactForEgress`'s implementation, so "redaction is complete" is asserted, not demonstrated. If it only strips name-like patterns, emails/phones in the remit still egress. This is the rule-zero house rule; it needs evidence, not comments.
- **Data-truth / schema drift:** The exit-code question cannot be answered from the excerpt. Fix 4 claims "zero runnable seats → exit 1," but the shown code computes `seatsToRun` and then handles `dryRun` (exit 0) and `skipped` — the zero-seats exit-1 path and the partial-failure exit path are both below the cut. Notably, `--dry-run` with all-paid seats and no `--confirm-spend` exits 0 with zero runnable seats, which may or may not violate fix 4's intent — the ordering shown makes dry-run win, and the document doesn't say whether that's deliberate.
- **House rules:** No styled-components/MUI/Recharts/palette/touch-target surface in these files (Node tooling) — no violations to flag. No "NASM-certified" or "yoga/meditation" language present.

## HIGHEST RISK

Blocker 1 (`sh -c '…'` phantom). It is the highest-probability realistic command shape (wrapping a hook in `sh -c` or `bash -c` is idiomatic), and the file's own header states the cost model: a phantom finding trains the operator to ignore the gate, which silently restores the undetected-missing-hooks outage this check exists to catch. Cheapest de-risk before ship: after quote-stripping, reject any token containing whitespace from path consideration (`if (/\s/.test(tok)) continue;` — or push it to `unresolvable`), and add `sh -c 'node scripts/hooks/x.mjs'` plus the escaped-space and `;`-glued cases to the check's own case matrix that the comments say already exists. That's ~3 lines plus test rows.

## CONFIDENCE

- **I could not verify the exit-code claim (fix 4).** The excerpt of consult-panel.mjs ends before the zero-runnable-seats and partial-failure paths. Evidence needed: the rest of the file, or a transcript of `--seats <paid-only>` without `--confirm-spend` and of a run where one seat fails.
- **I could not verify redaction completeness.** `redactForEgress` and `readForEgress` are imported, not shown. "Every string that reaches the wire is redacted" is true *structurally* in the shown code, but whether redaction actually removes PII is unverifiable. Evidence needed: the redactor source plus a fixture with names/emails/phones in remit, seed, and document.
- **I could not verify the hooks schema assumption.** Whether real `.claude/settings.json` hooks can be non-`command` shaped (args arrays, prompt hooks) determines whether `hook?.command || ''` is a false-negative hole. Evidence needed: the harness's settings schema doc or a real settings.json from the repo.
- **I could not verify seat-name validation** before `SEATS[n].paid` is dereferenced. Evidence needed: the argument-parsing region of consult-panel.mjs above the excerpt.
- **Uncertainty on Blocker 3 (`;`):** I have not seen a real-world settings.json with semicolon-glued hook commands; I rate it P2 precisely because likelihood is unproven, not because impact is small.
