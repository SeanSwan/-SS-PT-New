# HANDOFF v3 — the schema-truth + system-graph campaign, and your mission

**Written:** 2026-08-15 by Opus 5 (vs-claude), closing a long session.
**Read order:** this file → `PACKET-GLM53-schema-graph-2026-08-15.md` → (only if you need deep
history) `CAMPAIGN-HANDOFF-V2-2026-08-14.md`.

---

## 1. YOUR MISSION — GLM-5.3 hostile review, then fix until dry

Sean's instruction: *"have GLM-5.3 do a hostile review on the work we've done, and make any fixes
based off the review."*

The review packet is **already written and committed**:
`docs/ai-workflow/AI-HANDOFF/PACKET-GLM53-schema-graph-2026-08-15.md`

### Step 1 — get the review

Two transports exist in this repo; **ask Sean which he wants** rather than assuming:

- **Sean-mediated (established pattern for GLM here):** he pastes the packet into GLM-5.3 and
  returns the reply. A sibling session used exactly this shape —
  `CREATOR-PIPELINE-HANDOFF-GLM53-2026-08-15.md`. No repo GLM model-id is wired.
- **Scripted (if Sean supplies a model id):** `scripts/consult-openrouter-panel.mjs --model <id>
  --document <packet> --out <reply> --confirm-spend`. **Dry-run by default; the flag spends money —
  Rule 16 says ask first.**

Save the reply to `docs/ai-workflow/AI-HANDOFF/GLM53-REVIEW-schema-graph-2026-08-15.md`.

### Step 2 — VERIFY every finding before you fix it

This is the part that matters. **A reviewer's finding is a hypothesis (Rule 30), not a fact.**
In this campaign, 33 external findings were checked and several were flat wrong — one reviewer
reported the backup was "absent" (it had run three times with restore tests) and the auditor
"never run against production" (four runs). Both were artifacts of an incomplete packet, not real
defects. Had I fixed them I'd have wasted a day.

For each finding, produce: **CONFIRMED** (with the command/file:line that proves it), **REFUTED**
(with the evidence that disproves it), or **DEFERRED** (real, out of scope, filed with a reason).

### Step 3 — fix, prove, loop

Fix every CONFIRMED finding. Cover new behavior with a test that **fails before the fix**. Then run
your own hostile pass and repeat until a full pass finds nothing new (**CLEAN×2**). Rule 73: no
"done" without current-session proof in the same message.

### Step 4 — close

Batch-commit per fix, push once (Rule 70), update `SWA-96`, emit a Hermes memo with a
`## Mistakes I made` section.

---

## 2. WHAT ALREADY SHIPPED (do not re-derive; all on `main`)

| Work | Evidence |
|---|---|
| Waiver outage fixed live — 5 additive nullable columns | observed HTTP 500 → 200; drift class `column-missing` 5 → 0 DB-wide |
| **108 production indexes** created `CONCURRENTLY IF NOT EXISTS` | 9.9s, 0 failures, 0 INVALID; `index-missing` 112 → 9 |
| `packages` table created; creation-order list corrected | `to_regclass` ✓ |
| Achievements split resolved — empty lowercase twin dropped | 0 rows / 0 FKs / no owning model, re-verified before the drop |
| Challenges family retired — route 796 → 94 lines, 3 empty tables dropped, trio unregistered | runtime contract test pins `router.stack` to one layer |
| SWA-159 closed — dangling `teamId` FK reference removed | model now matches production |
| Drift auditor (5 classes) + disposable QA container (198 tables, sentinel-guarded) | 4 production runs |
| **System graph** — export + query CLI + committed snapshot + doc | `ce4fc357c`, `c87c90620` |
| Triple review (self + Kimi + HY3) of the closed campaign | 7 Kimi findings → 3 fixed, 4 answered |

**Landed since, by sibling sessions** (not mine — verify before assuming state):
`16041bcd9` route-manifest drift gate (the crawl was blind to 45 live routes), plus context-gateway,
onboarding, and consult-lane fixes. Sessions run in parallel here — **check `origin/main` before
trusting any file.**

---

## 3. THE SYSTEM GRAPH — the tool you should be using

```bash
node backend/scripts/query-system-graph.mjs neighbors <table>   # real blast radius
node backend/scripts/query-system-graph.mjs path <a> <b>        # is there any FK route
node backend/scripts/query-system-graph.mjs orphans|components|empty --connected
node backend/scripts/query-system-graph.mjs unindexed|hubs|find|stats
```

**Query it; do not load it** — the snapshot is ~72 KB. Doc: `docs/ai-workflow/SYSTEM-GRAPH.md`.

Regenerate (read-only, `pg_catalog` + `COUNT(*)`):
```bash
SWAN_ENV_FILE=<path-to-an-env-with-DATABASE_URL> \
  node backend/scripts/export-system-graph.mjs > docs/ai-workflow/system-graph.json
```

**Limits that are real, not decorative:** a row is a POINTER, never canon — acting on one means
opening the source. It proves table shape and FK topology and says **nothing** about routes,
callers, or whether a surface is live; Canonical Surface Receipts (Rule 26) still need file:line.
Zero rows ≠ dead. An orphan is **not** automatically droppable (Rule 34 wording still binds).

**Current facts** (snapshot `2026-08-15`; schema unchanged since 08-14, only row counts moved):
254 tables · 396 FKs · `Users` holds 238 of them (60%) · 158 tables (62%) empty · 33 isolated ·
41 disconnected components.

---

## 4. WHAT IS STILL OPEN

1. **Boot drift tripwire** — both prior external reviewers independently ranked this #1 from
   different layers. CI/boot assertion diffing the hardcoded enumeration lists against the model
   registry, so a missing table can never again fail silently. Touches prod boot → **Sean gates the
   wiring.**
2. **Baseline migration** — production is **not rebuildable**: 367 migrations, none creates `Users`.
   Must fold in the 3 migrations still referencing the dropped `ChallengeTeams`, and a `pg_catalog`
   inventory of *verbs* (triggers, views, functions, RLS, grants) — the campaign audited nouns only.
3. **The 41 disconnected components** — deliberate or drift? The graph raised the question; nothing
   answers it. Needs model + caller evidence, not more graph queries.
4. **Orphan/dormant disposition** — 85 orphan tables, ~35 dormant models, 3 retired social model
   files awaiting Rule-34 quarantine. Access-log evidence before any drop; grep is not caller truth.
5. **Playwright harness** — v2's Mission 1 (Kimi review until dry) was **partly overtaken** by
   `16041bcd9`. Re-check what remains before re-running it.
6. **Sean-owned, non-code:** only 1 of 18 challenges is active+public+unexpired — the repaired
   community page is nearly empty by *content*, not by bug.

---

## 5. TRAPS THAT COST ME TIME (all cost me twice; do not pay again)

- **Node ESM resolves from the FILE's directory, not cwd.** A script in `c:/tmp` or repo root
  cannot import `pg` (installed under `backend/`) or `@playwright/test` (under `frontend/`). Put the
  script where the package is. I hit this twice in one turn.
- **Piped exit codes lie.** `cmd | head; echo $?` reports the pipe. Re-run unpiped before believing
  a failure. I misread this 5+ times and nearly filed correct behavior as a bug.
- **`node --check` passes on reference errors.** Syntax-clean ≠ runnable. Prove by executing.
- **Publishing ≠ verifying.** I shipped a page having checked only syntax and data injection, then
  found three defects the moment I opened it in a real browser. Render it before it goes out.
- **Scripted replaces silently no-op.** After any programmatic edit, grep for a token that can only
  exist if it applied.
- **Shell variables do not survive into `node -e` as paths.** A `/c/...` bash path became
  `C:\c\Users\...`. Pass Windows-style paths explicitly across that boundary.
- **Fix the measured failure, not the assumed one.** My first fix to the map made it visibly worse
  because I guessed the cause; one diagnostic revealed the real one (41 components) immediately.

---

## 6. ENVIRONMENT

- **Worktree:** `C:/tmp/ss-qa-harness-slice0` (branch `claude/qa-harness-slice0-20260811`, pushed to
  `main`). The Desktop tree is ~1950 commits behind — do not audit from it.
- **`.env` lives in the Desktop tree only.** Point tooling at it via `SWAN_ENV_FILE`.
- **`DATABASE_URL` targets PRODUCTION from local dev.** Every DB command is a production command.
  Read `.claude/skills/blast-radius-guard` before any SQL.
- **Parallel agents.** Claim a lane (`node scripts/lane.mjs claim`), read others' locks before
  editing, never `git add -A`. Another session currently holds locks on the GLM slice-1 review files.
- **Linear:** `node scripts/linear-cli.mjs comment --issue=SWA-96 --body-file=<f>` (needs
  `LINEAR_API_KEY` in env). Epic: **SWA-96**; QA harness: **SWA-157**.

---

## 7. DEFINITION OF DONE

GLM-5.3 review received → every finding CONFIRMED / REFUTED / DEFERRED **with evidence** → all
CONFIRMED findings fixed, each covered by a test that failed first → CLEAN×2 hostile rounds →
pushed → SWA-96 updated → Hermes memo with `## Mistakes I made` → Sean told, plain-English first,
what changed and what you chose not to change and why.
