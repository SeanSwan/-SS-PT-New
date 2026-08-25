# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Served:** `deepseek/deepseek-v4-pro`
**Document:** docs\ai-workflow\AI-HANDOFF\panel-swa200-final-2026-08-24\panel-r4\rounds\round-1\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 15754 in / 16262 out · **Cost:** ~$0.0814 · **Wall:** 301.1s · **finish:** stop

---

=== VERDICT ===
status: CONSENSUS
confidence: 95
findings: F1=MAJOR: backend/scripts/shadow-table-extract.mjs L56-57 (and similar L58 for CREATE TABLE): The regex patterns for raw SQL operations capture only the first word after the keyword, so a schema‑qualified table name (e.g., `ALTER TABLE public.users`) yields only `public`, not the actual table.  If the same migration contains other, correctly extracted table names, the migration is considered resolved and the skipped‑table FATAL is not triggered – a false green when the migration really touches a skipped table. This contradicts the builder’s claim that the FATAL closes the vacuous‑green path for skipped tables. | F2=MINOR: .github/workflows/migration-shadow-check.yml L189: The fallback base‑commit resolution for non‑PR, non‑push‑with‑before events (workflow_dispatch, new branch push) uses `git rev-parse HEAD^`, which only covers the very last commit. For multi‑commit branches this undercounts added migrations and can produce a false green when the gate is exercised outside a PR context (though the primary enforcement is via PR required checks, limiting real‑world impact).
rebuttals: (none)
open: Q1=Must the extractor also handle quoted identifiers with dots (e.g., `"public"."users"`)? Q2=Should the fallback use `git merge-base main HEAD` to correctly span all commits on a branch, or is the current scope acceptable for non‑PR runs?
consensus_block: RULING
F1 – fix in backend/scripts/shadow-table-extract.mjs, lines 56‑58.  
Change the SQL patterns to optionally consume a schema prefix and capture the table name properly.  
Example (ALTER TABLE): replace  
/\s+"?([A-Za-z0-9_]+)"?/gi  
with  
/\s+(?:"[A-Za-z0-9_]+"\.)?("?[A-Za-z0-9_]+"?)/gi  
and adjust the capture group extraction accordingly (m[1] becomes the table). Apply the same treatment to CREATE TABLE, INSERT INTO, DELETE FROM, UPDATE, and the INDEX‑ON pattern (lines 58‑63). Retest the selftest (expected 12/12) and the audit’s 6/6 suite, adding a case with schema‑qualified SQL.

F2 – fix in .github/workflows/migration-shadow-check.yml, line 189.  
Replace the else clause:  
BASE="$(git rev-parse HEAD^ 2>/dev/null || git rev-parse HEAD)"  
with a merge‑base computation (e.g., `git merge-base main HEAD 2>/dev/null || git rev-parse HEAD^`). If `main` is not guaranteed to exist, fall back to HEAD^ with a comment acknowledging the limitation for multi‑commit pushes. This ensures workflow_dispatch and edge‑case push events see the whole delta.

Residual risks
- The extractor’s static patterns cannot cover every dynamic table reference; the declared `// shadow-tables:` escape remains essential for migrations that compute table names at runtime.
- The `BASE_COUNT` assertion (leg A) compares the number of `.cjs`/`.js` migration files against `SequelizeMeta`; if any `.ts`/`.cts` migration were added, the count check would falsely fail (R3‑F5, acknowledged).  
- The guard `pre-migrate-guard.mjs --check` is advisory and never fails the job, which is intentional but limits its enforcement ability.  
- The gate is paper‑verified only; no real run has yet executed, so runtime‑only behaviours (e.g., network fetch of `sequelize-cli`, umzug’s actual resolution) remain unexercised.
=== END-VERDICT ===
