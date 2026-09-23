# Consult reply — Ox Alpha (stealth/ox-alpha) — 2026-08-23T20:37:57.265Z

> tokens: prompt=6994 completion=1925 | finish_reason: stop | max_tokens: 60000

## Round 4 finding

**Not converged.** Rev 4's fixes created one new defect.

### The defect: A1's `entryImports` check inherits production credentials

Section 5, A1 table: *"import() the backend entry point in a subprocess … exactly as `migration-shadow-check.yml` already does — reuse that code, do not rewrite it."*

The code is reusable; **the environment is not the same**, and the instruction papers over that difference. In the shadow workflow, the entry point imports against an empty throwaway Postgres. On the Render build container — where A1 will actually run after the merge — `DATABASE_URL` is **production** (0.2 establishes this). So every deploy will now execute the backend's module top-level code with live production credentials, before the migration has been confirmed applied. Depending on what that entry point does at import time — open a Sequelize pool, run association setup, or worse, any eager seed/sync/bootstrap logic — you have either a connection held against prod mid-deploy, a false `entryImports:false` from a schema-version mismatch, or an actual write to production from a "verification" step. Rev 4 added a verify spec that quietly executes arbitrary application code against the thing being protected. Same bug class as `Z:`: a control that looks like safety and behaves like exposure.

### The blocking sentence

**Before landing A1 on the PR, specify that the entry-import subprocess must run with a neutralized database target (e.g., `DATABASE_URL` pointed at a local sqlite/empty pg or unset with the import asserting it fails closed) so the check proves the module *loads*, not that it *connects* — otherwise delete `entryImports` from A1 rather than ship it wired to prod.**

Everything else held up under re-read: the 3.0 sequencing table is now genuinely atomic, the cwd/path story is coherent, all four shapes have exits and the shape-4 caveat is stated twice consistently, custody split in 3.5 is right, and section 9 no longer asserts a recovery point. Fix the one sentence above and I'd call it converged next round — no need to manufacture a sixth.
