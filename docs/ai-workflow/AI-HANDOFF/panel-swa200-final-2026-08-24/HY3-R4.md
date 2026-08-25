# SWA-200 ROUND 4 — six-seat hostile review of a CI migration gate — reviewed by HY3 (tencent/hy3)

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/panel-swa200-final-2026-08-24/PACKET-R4.md
**Seed:** (none)
**Tokens:** 14595 in / 13580 out | **Cost:** ~$0.0091 | **Wall:** 227.3s | **finish_reason:** stop

---

## 1. Paths where the job goes GREEN while testing nothing

- **Workflow self-edit (still open, R3-F7).** `pull_request` has no `paths:` filter (lines 49‑64). A PR that rewrites `.github/workflows/migration-shadow-check.yml` to delete Leg B, stub `exit 0`, or neuter the assertions will run *that* edited workflow, report success, and satisfy the required check. The Summary even admits it (line 467). This is a literal green‑while‑testing‑nothing path.
- **Modify‑/delete‑/rename‑only PRs.** When a PR changes existing migration files but adds none, `added.length == 0`. Leg B applies zero migrations (`applied == 0`), `shadow-delta-audit.mjs --mode verify` does **not** fatal (lines 142‑148), and the step prints “NOT APPLICABLE” but still exits 0 (lines 385‑388). The required check is green although the edited migrations were executed nowhere (as the script itself notes, they run “NOWHERE, here or in prod”).
- **Skipped‑table bypass via `// shadow-tables:` (new).** An added migration that touches a skipped table through runtime interpolation can declare `// shadow-tables: some_other_table` (or any table not in the seeder’s skip list). The extractor returns a non‑empty array, so the `unresolved` branch does not fire, and if the declared name isn’t in `skipped`, the `hits` branch does not fire. Leg B runs against the empty skipped table, and the job goes green having proven nothing about the real target.
- **Extractor mis‑read of qualified names (new).** The SQL regexes capture `[A-Za-z0-9_]+` and stop at a dot. `CREATE TABLE public.users` yields `public`, not `users`. If `users` is in the skipped list, the hit is missed → green.
- **`.mjs` “migrations” added.** 36 `.mjs` files exist that never execute under any runner. Because `RUNS = /\.(cjs|js)$/` (line 63), adding only `.mjs` files yields `added=0`, `applied=0`, green. The job says “no migrations added” while dead migration‑shaped files were introduced.

## 2. What the round‑3 fixes BROKE

The round‑3 rewrite traded the previous **false‑red** (modify‑only PRs FATAL‑ed) for a **vacuous green**: modify/delete/rename‑only changes now pass unchanged. That is the defined failure mode of this gate — green while testing nothing for those files.

It also introduced the `// shadow-tables:` escape hatch as a machine‑readable override. The prior round‑2 complaint was “visibility is not enforcement”; the round‑3 fix was supposed to make skipped‑table gaps *enforce*, but the escape hatch reverts that to “author declares, machine trusts” — exactly visibility‑not‑enforcement, now with a greppable comment.

Additionally, the round‑3 `SEED_SKIPPED` plumbing writes the literal `(none)` when no tables are skipped (workflow lines 308‑312). This makes `skipped.length === 1` even when zero tables are skipped, so the audit’s skipped‑check block always executes and prints a misleading “1 skipped” (line 199). Not fatal, but evidence the glue code was not attacked.

## 3. Targeted attacks

- **Leg‑A/Leg‑B `git checkout` juggling.** Leg A checks out `BASE` migrations+models; Leg B checks out `HEAD` migrations+models. `.sequelizerc` and `backend/config` are **never** checked out to BASE (R3‑F6). Leg A therefore applies the BASE schema using HEAD’s config (possibly different migration storage, dialect options, or seeder hooks). The `before == BASE_COUNT` assertion (lines 347‑351) can then fail for the wrong reason (false red) or, if config silently changes the meta table, under‑count and let a real gap through. Baseline‑then‑delta is only honest if *all* migration‑behavioral files are at BASE.
- **`applied == added` assertion.** Sound for executed `.cjs/.js` names, but it intentionally ignores modified/deleted/renamed‑old names, so those pass green (see above). It also ignores `.mjs` adds. The assertion compares like with like only inside the narrow set of files the runner actually executes; everything outside that set is green‑by‑omission.
- **Skipped‑table FATAL + extractor.** The FATAL hinges entirely on `tablesFromSource`. The function fails closed on empty (`null`), which is good, but (a) the escape hatch defeats it, (b) schema‑qualified names are truncated, (c) the const‑capture regex only handles simple literals — a `const T = 'x'+'y'` or `const T = process.env.X` yields no capture, but then the identifier is unresolved and `out` may be empty → `null` → fatal (safe). The real leak is the author‑declared override and the dot bug.
- **`BASE_COUNT` assertion.** Counts `.cjs/.js` via `find` (line 242), matching `safe-migrate`’s filter. This is correct *today* but R3‑F5 notes umzug’s pattern also allows `.ts/.cts`; the moment a TypeScript migration appears, `BASE_COUNT` (file count) and `SequelizeMeta` (executed names) diverge → guaranteed false red. Latent, not a green path.
- **Unfiltered `pull_request` trigger.** Required for enforcement (correct), but combined with R3‑F7 it is self‑defeating: the one trigger that makes the gate a gate also lets a PR rewrite the gate.
- **`// shadow-tables:` escape hatch.** Already attacked above. It is a non‑verified override; nothing checks that the declared tables are *complete* or *truthful*. It converts the FATAL back into a comment‑driven waiver.

## 4. Plain statement

This is **not** a dry round. The round‑3 fixes closed some extractor bugs but introduced a waivable override and turned modify‑only into a silent green. Combined with the still‑open self‑edit hole and the never‑run workflow (startup_failure), the packet cannot be confirmed.

---

status: REJECT
confidence: 92
findings: F1=HIGH: .github/workflows/migration-shadow-check.yml lines 49-64,467: PR can edit this workflow to neuter the gate; unfiltered pull_request lets the edited workflow satisfy the required check (green while testing nothing). F2=HIGH: backend/scripts/shadow-table-extract.mjs lines 77-90 + shadow-delta-audit.mjs lines 160-200: // shadow-tables: escape hatch lets an added migration declare a non-skipped table and bypass the skipped-table FATAL, producing vacuous green. F3=MEDIUM: shadow-delta-audit.mjs lines 142-148 + workflow lines 385-388: modify/delete/rename-only PRs (added=0) exit green with Leg B executing nothing; changed migrations tested nowhere. F4=MEDIUM: shadow-table-extract.mjs lines 56-63: SQL regex captures only [A-Za-z0-9_]+, truncates schema-qualified names (public.users -> public), missing skipped-table hits -> green. F5=MEDIUM: workflow lines 231-232 (R3-F6): only migrations/models are checked out per leg; .sequelizerc and backend/config stay at HEAD, breaking baseline fidelity. F6=LOW: workflow line 364 + verified facts: pre-migrate-guard.mjs --check always exits 0; dead enforcement. F7=LOW: shadow-delta-audit.mjs lines 63,90: .mjs added files excluded from added count, so a PR adding only .mjs "migrations" goes green though they never execute anywhere.
evidence: YAML lines cited; shadow-delta-audit.mjs verify block (142-205); shadow-table-extract.mjs decl regex (87-90) and SQL regexes (56-63); documented verified facts (guard always 0, workflow never parsed/startup_failure, 36 .mjs never run); round-3 open items R3-F5/R3-F6/R3-F7.
ruling: REJECT. Multiple paths remain where the job reports GREEN while testing nothing (self-edit, modify-only, escape-hatch bypass, extractor mis-parse). Round-3 fixes traded a false-red for a vacuous-green and added an author-override that defeats the skipped-table enforcement it was meant to add. The workflow has also never executed (startup_failure), so all assertions are paper-verified. Do not mark required until a real run reports and the above are closed.
