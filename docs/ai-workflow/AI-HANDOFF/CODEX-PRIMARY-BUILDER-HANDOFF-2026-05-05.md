# Codex Primary-Builder Handoff — SwanStudios

**Created:** 2026-05-05
**Author:** Claude Opus 4.7 (handing off the build seat)
**Audience:** Codex (taking over as primary builder)

> **Sean to Codex:** "I'm switching the team. You're now the builder. Claude becomes the hostile reviewer of your work. Read this doc + the linked context files. Then either start on the active task (§4) or ask one clarifying question if anything is genuinely unclear after reading."

---

## §0. Paste-ready prompt for Codex

Copy the block between `### CODEX PROMPT START` and `### CODEX PROMPT END` and paste it as your first message to Codex. Codex will use it to bootstrap context.

### CODEX PROMPT START

```
You are now the PRIMARY BUILDER for the SwanStudios project (sswanstudios.com).
Claude Opus 4.7 has been the builder up to this point and is handing the seat
to you. Going forward:

  - YOU build. Code, tests, commits, runbooks, migrations.
  - CLAUDE reviews — adversarially. Claude's role is hostile reviewer, not author.
  - GEMINI continues as architectural/design third-voice.
  - SEAN is CEO + final decision authority, single human in the loop.

The 3-Brain Review Loop (CLAUDE.md Rule 46) is therefore INVERTED from how it
previously ran:

  OLD: Claude builds → Gemini reviews → Codex is final gate
  NEW: Codex builds → Gemini reviews → Claude is hostile gate

Anti-rework Rule 52 still applies symmetrically. You don't get to demand rework
of recently-passed-gate code without failing-test/file:line evidence, and
Claude can't demand rework of YOUR code without the same.

BEFORE YOU DO ANYTHING ELSE — load these files in this order:

1. /CLAUDE.md
   The root operating index. 59 numbered rules, the active palette, the file
   layout, recent incidents. Every rule applies to your work. Critical rules
   you'll hit immediately:
     - Rule 17: Dual-pass completion (build + hostile self-review)
     - Rule 26: Canonical Surface Receipt before any UI/data-truth work
     - Rule 42: Pre-Push Backend Audit (untracked + modified-uncommitted)
     - Rule 44: Secret-scan covers writes
     - Rule 46: 3-Brain Review Loop (now Codex-builds → Claude-hostile)
     - Rule 50: Three-Layer QA Pipeline
     - Rule 51: Confidence-tag discipline (use [VERIFIED] / [LIKELY] / [HYPOTHESIS] / [UNKNOWN])
     - Rule 52: Anti-rework burden
     - Rule 58: Schema-drift detection
     - Rule 59: Read-time secret exposure prevention
     - Rule 47 + 49: Manual-inspection-by-Sean is FORBIDDEN — build a launcher
       script rather than asking Sean to "open this file and tell me what line X says"

2. /docs/ai-workflow/AI-HANDOFF/CODEX-PRIMARY-BUILDER-HANDOFF-2026-05-05.md
   This file. The full project state, completed phases, active task, deferred
   backlog, role expectations.

3. /ACTIVE-INDEX.md
   Where active vs archive vs planned material lives.

4. /docs/ai-workflow/AI-HANDOFF/PHASE-5-PLAUD-AUTO-INGESTION-PLAN-v1.2-2026-05-04.md
   The v1.2 plan that you (Codex) APPROVED. The implementation matches this plan;
   active task is staging activation per its runbook.

5. /docs/ai-workflow/references/PLAUD-APPLAUD-RUNBOOK.md
   Operational runbook for Sean's home-machine setup. Active task is Step 1.5
   (verify Applaud v0.5.10 field-name compatibility before flipping the env flag).

6. /.ai-workflow/continuity/rolling-last-done.md
   Cross-session continuity log. Read for the most-recent session-close summaries.

After reading: confirm you understand the active task (§4 of the handoff doc)
and either start on it OR raise ONE clarifying question if something is
genuinely ambiguous after the reading. Don't ask about the rules — they're
in CLAUDE.md.

When you commit:
  - Match the existing commit-message style: `type(scope): description`
  - Include `Co-Authored-By: Codex (or whatever your model name)` trailer
  - Don't push to main without Sean's explicit approval, even when work is
    complete — production deploys via Render auto-deploy on every push, and
    Sean is the human gate. Auto mode does NOT mean "auto-push to production."
  - When ready for review, write a hostile-review prompt for Claude (not for
    yourself); Sean will pass it through.

When you finish a substantial task:
  - Run Rule 17 dual-pass self-review before declaring done
  - Run Rule 42 pre-push backend audit
  - Tier-A QA (typecheck + targeted tests + lint where applicable)
  - Per Rule 41, the closeout-evidence-lock skill auto-runs at task close
    if you trigger it; otherwise produce its required artifacts manually
    (Canonical Surface Receipt for any new route/UI, post-task hygiene check,
    forbidden-language filter)

Your first response after reading should be EITHER:
  (a) "Ready. Starting on §4 active task." with your initial implementation plan, OR
  (b) "Need clarification on X" with the specific ambiguity.

Do not produce a meta-summary of what you read. Just confirm you read it and
get to work.
```

### CODEX PROMPT END

---

## §1. Project identity (snapshot)

- **Product:** SwanStudios — production personal-training SaaS at sswanstudios.com
- **Stack:** React 18 + TypeScript + styled-components (frontend), Node.js + Express + Sequelize + PostgreSQL (backend)
- **Hosting:** Render Professional plan (~$60/mo, NOT free tier — no cold starts)
- **Theme:** Enchanted Apex: Crystalline Swan (dark-first, Midnight Sapphire `#002060` + Ice Wing `#60C0F0` + Wing Purple `#8B5CF6`)
- **Owner-operator:** Sean Swan
- **Active priority** as of 2026-05-05: **Phase 5 PLAUD Auto-Ingestion** — staging activation
- **Repo:** https://github.com/SeanSwan/-SS-PT-New (main branch deploys to Render on push)

---

## §2. What's completed (high-confidence — `[VERIFIED]` against git history)

### Phase 3 — PLAUD Manual Multi-Clip Merge UI (shipped 2026-05-04)

24-commit slice chain culminating in `/dashboard/plaud-merge`. Trainer uploads 1-N audio clips, system normalizes + merges via ffmpeg, transcribes via LLM, parses fitness vocab, presents review state, trainer confirms → workout logged.

Stack: Sequelize models, Express routes, React components, ffmpeg-static (added when Render's apt-get sandbox proved read-only), R2 mirror worker, AES-256-GCM transcript encryption, dual-tier disk+R2 storage, atomic merge locks, TTL crons.

Reference: `docs/ai-workflow/AI-HANDOFF/PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md`

### Phase 4 — Swan Coach v15 view_available_slots (shipped 2026-05-04)

Swan Coach voice command lane added the read-only "view available slots" command. v14 was the last completed v before this; v15 is now in commandDispatcher.

### Phase 5 backend — PLAUD Auto-Ingestion (shipped 2026-05-04 to 2026-05-05)

Slices 5.1 → 5.5 + 5.6 + 5.8 + hostile-review hardening. **Currently dormant in production** — `PLAUD_APPLAUD_WEBHOOK_ENABLED` is unset, so the route is not mounted (Codex CR-5: route literally absent when flag off).

Cumulative commits this phase: 9, all on `main`.

| Commit | Slice | What |
|---|---|---|
| `e0ee8dbfb` | 5.1 | DB foundation (3 cols on plaud_clips + plaud_webhook_nonces table + 60s nonce cleanup cron + 32 unit tests + 17 schema-drift integration tests) |
| `3ba3c5932` | 5.2 | webhook signature service (HMAC + atomic nonce claim + 75 tests) |
| `0c924d72c` | 5.3 | Applaud audio fetcher (URL allowlist + DNS-rebinding rejection + redirect:'error' + content-length cap + streamed-bytes cap + 56 tests) |
| `cdc3ff8fc` | 5.4 | webhook controller (orchestrator: verify → status-aware dedup → fetch → probe → atomic INSERT → write → flip + concurrency semaphore + 45 tests) |
| `a5a55d4f9` | 5.5 | route mount + middleware (raw-body capture + rate limiter + startup env validation + 43 tests) |
| `ed153e299` | 5.6 + 5.8 | integration tests (concurrency + SSRF + manual-upload regression — 10 tests) + operational runbook |
| `347e10854` | hardening | 13 must-fix items per Codex impl review (lazy-import, schema check, logger redaction, length validation, IPv6 fix, status drift fix, etc.) |

**Plan ratchet:**
- `PHASE-5-PLAUD-AUTO-INGESTION-PLAN-v1-2026-05-04.md` → REVISE (6 CRITICAL findings)
- `PHASE-5-PLAUD-AUTO-INGESTION-PLAN-v1.1-2026-05-04.md` → REVISE (7 NEW HIGH findings)
- `PHASE-5-PLAUD-AUTO-INGESTION-PLAN-v1.2-2026-05-04.md` → APPROVE (Codex APPROVE on plan)
- Implementation hostile review → REVISE (13 must-fix)
- Hostile-review hardening commit → all 13 fixed

**Test totals:** 509/509 PLAUD + logger redaction unit tests pass. 10 integration tests skip cleanly without a local Postgres test DB.

---

## §3. What's deferred (v1.x backlog — explicit non-blockers)

These are tracked, non-urgent, and can be addressed post-staging-activation:

### Phase 5 backlog (all per Codex APPROVE conditions)
- **Slice 5.7** — Optional frontend "Source: Applaud" badge in `PlaudClipQueue` (1 day; UI polish)
- **Slice 5.9** — Staging activation (manual; runbook-driven; Sean's home machine)
- **Slice 5.10** — Production activation (after staging green; flag flip)
- **NH-2** — Rate-limiter ordering before sig verification (architectural)
- **NH-3** — SSRF DNS-rebinding TOCTOU between validate and fetch (residual risk; documented)
- **NH-9** — Runtime user_id re-check with TTL cache
- **NH-10** — MEDIA_BASE_URL DNS check at mount time
- **H-IMPL-2** — Per-process state in multi-instance deploys (Redis-backed limiter)
- **H-IMPL-10** — Full app-chain supertest integration test
- **OBS-1** — `PLAUD_MERGE_ENABLED` cross-check at mount
- **OBS-2** — Cloudflare Tunnel hostname rotation runbook section
- **CR-IMPL-3** — Applaud v0.5.10 webhook payload field-name verification (Sean's task — runbook Step 1.5)

### Plan minor wording polish (Codex APPROVE conditions)
- §1.4 stale "failed state" reference
- §12.3 stale "stuck in failed" wording
- Key-rotation V1→V2 fallback clarification
- M-3 rate-limiter key clarification when multi-source v2 ships

### Other open items (not Phase 5 specific)
- Untracked planning docs in `docs/ai-workflow/AI-HANDOFF/` — many `*.tmp.md` files + working drafts that should be reviewed for archive/delete (per Rule 32-39 hygiene scan)
- Multiple legacy `frontend/dist not found` warnings in Render boot logs (cosmetic, pre-existing, log-level should be downgraded from `error:` to `info:`)
- Sequelize `db.sync()` errors during background init (pre-existing dual-table-name mess covered by CLAUDE.md gotcha; would need a separate slice)

---

## §4. Active task — Phase 5 staging activation, Step 1.5

**Where we are right now:** Sean is following the runbook at `docs/ai-workflow/references/PLAUD-APPLAUD-RUNBOOK.md`. He's installing Applaud v0.5.10 on his home machine.

**The single outstanding gate before flipping `PLAUD_APPLAUD_WEBHOOK_ENABLED=true`** is Codex CR-IMPL-3: verify Applaud v0.5.10's actual webhook payload field names match our spec.

Our controller expects (from plan §5.2):
- `event_id` (string)
- `event_type` (string, value: `audio_ready` or `transcript_ready`)
- `recording_id` (string ≤255 chars)
- `audio_url` (string ≤2048 chars, HTTPS only)
- `audio_size_bytes` (positive number)
- `audio_mimetype` (string ≤64 chars, in our allowlist)
- `audio_filename` (optional string)
- `device_serial` (optional string)
- `applaud_instance_id` (optional string)
- `timestamp` (optional, must equal sig header `t` per Codex M-2)
- `nonce` (optional, must equal sig header `nonce` per Codex M-2)

Sean is going to inspect Applaud's source and paste the relevant snippet back. Three outcomes:

1. **Match** → Sean proceeds to runbook Steps 2-8. No code change.
2. **Partial mismatch** (e.g. Applaud uses `filesize` instead of `audio_size_bytes`) → **YOUR (Codex) job:** write a thin field-mapping adapter at the top of `backend/controllers/plaud/plaudApplaudWebhookController.mjs`. Map Applaud's actual names to our internal names BEFORE the validation block. Add a unit test asserting the mapping. Commit + push. Sean then proceeds to runbook Steps 2-8.
3. **Major mismatch** (HMAC signature scheme differs, no event_type field at all, etc.) → **YOUR (Codex) job:** write a triage doc + propose options (fork Applaud, write a translator middleware, pick a different bridge). Don't ship code until Sean approves the path.

**Once Sean confirms field-name compatibility (outcomes 1 or 2 unblock):** runbook Steps 2-8 are Sean-driven manual setup (generate AES-equivalent webhook secret, configure Applaud .env, set up Cloudflare Tunnel, set Render env vars, log into Plaud web app, start Applaud, send 1 test recording end-to-end).

**Once test recording lands successfully in `/dashboard/plaud-merge`:** Slice 5.9 is complete. Slice 5.10 is just verifying production matches staging behavior + the same env flag flip on production (which IS the same Render service since this codebase is single-environment).

---

## §5. How the team works (the rules of engagement)

### Roles (post-handoff)

| Role | Who |
|---|---|
| **Builder** | Codex (you) |
| **Hostile reviewer** | Claude Opus 4.7 |
| **Architectural / design third-voice** | Gemini 3.1 Pro (consult via `node scripts/consult-gemini.mjs`) |
| **AI Village (14-brain) escalation** | Reserved per CLAUDE.md Rule 16 — Sean's explicit per-run permission required (~$0.68/run) |
| **CEO + final authority** | Sean Swan (only human) |

### Commit + push policy

- Commit format: `type(scope): description` (e.g. `feat(plaud): add Applaud field mapper`)
- Trailer: `Co-Authored-By: Codex <noreply@openai.com>` or whatever your model identifies as
- **Don't push to main without Sean's explicit OK** — push triggers Render auto-deploy = production. Sean is the human gate even when auto mode is on.
- Render is paid Professional; deploys take 3-5 min; no cold starts but new deploys do redirect traffic
- Backend pre-push audit (Rule 42): `git ls-files --others --exclude-standard backend/` AND `git diff --name-only HEAD backend/` — both must be clean of unintended drift before push

### When you finish a slice

1. Self-hostile review (Rule 17)
2. Tier-A QA: typecheck (`cd frontend && npx tsc --noEmit` or backend equivalent), targeted vitest run, no lint failures introduced
3. Rule 42 backend audit
4. Pre-commit secret scan (auto-runs via `.githooks/pre-commit` — never `--no-verify`)
5. Commit
6. Hand the commit hash + brief change summary to Sean
7. Sean decides whether to invoke Claude for hostile review (your trigger: paste the commit + a hostile-review prompt to Claude via the `consult-claude-as-hostile.mjs` script if/when it exists, or just brief Sean and let him pass it through)

### When Claude flags an issue in your code

- If the finding is concrete (file:line evidence, failing test, or rule citation): apply the fix, run tests, re-commit
- If the finding lacks evidence: invoke Rule 52 anti-rework burden — push back politely, request specifics, document the disagreement in the relevant debate file
- Claude is acting as adversary; expect harshness. Don't take it personally; do verify each finding against actual repo state before agreeing or pushing back

### When Sean says "phase complete" / "log this and close" / "ship and close"

- Rule 48 phase audit record is MANDATORY at `docs/ai-workflow/AI-HANDOFF/<PHASE-NAME>-AUDIT-RECORD-<YYYY-MM-DD>.md`
- Rule 41 closeout-evidence-lock skill auto-handles per-task closeout if invoked; Rule 48 is the per-phase permanent re-review artifact
- Then update `.ai-workflow/continuity/rolling-last-done.md` via the documented script

---

## §6. Recent incidents to be aware of

These shape the safety bias of the project:

### 2026-04-19 credential leak incident
`.claude/settings.local.json` was tracked in public GitHub since 2025-10-29. All credentials rotated, 2,179 commits rewritten via `git-filter-repo`, force-pushed. CLAUDE.md Rule 44 (write-time secret scanning) and Rule 59 (read-time exposure prevention) emerged from this incident's response. **Pre-commit `.githooks/pre-commit` runs `scan-secrets.sh --staged` automatically.**

### 2026-05-04 production crash-loop (Phase 3 ship day)
A Sequelize raw-query bug pattern (`ANY(:array::type[])` with `replacements`) crashed the production server in a tight loop. Frontend's auto-poll on `/dashboard/plaud-merge` kept the server crashing as fast as Render restarted it. Hotfix: `4eac08739`. The bug class is now caught by source-text regression tests in every PLAUD slice. **Whenever you write raw SQL, use `type: QueryTypes.SELECT|INSERT|UPDATE|DELETE` AND destructure the result properly. Never `await sequelize.query(...)` and then `existing.length > 0` — that destructures wrong because the return is `[rows, metadata]`.**

### 2026-05-04 OpenRouter API key exposure to chat
Claude grepped `.env` with `output_mode: "content"` while diagnosing a script's env-load failure. The live `OPENROUTER_API_KEY` value surfaced into chat context. Sean rotated the key. **Rule 59 was added in response: never `Grep --output_mode=content` on `.env`-class files; use `output_mode: "files_with_matches"` or `"count"`. When a script needs the value, load it inside the script, not via `echo`.**

### 2026-05-04 frontend route mismatch
Slice 3.13 of Phase 3 added the `/dashboard/plaud-merge` route to `frontend/src/routes/DashboardRoutes.tsx`, which is dead code never imported anywhere. The actual production router is `frontend/src/routes/main-routes.tsx`. Took 2 production redeploys to discover. **Lesson: when adding a frontend route, verify it's mounted in the actual production router by running an import-graph trace, not by relying on the file's name.**

### 2026-05-04 Phase 5 plan + impl review chain
3 plan-review rounds (v1 → v1.1 → v1.2 = APPROVE) plus 1 implementation hostile-review round (REVISE → 13 must-fix → applied). Total OpenRouter spend: $2.45. The pattern of "always review twice" caught real bugs both times. **Don't skip the hostile-review step.**

---

## §7. Tools + scripts you'll use

- `node scripts/consult-gemini.mjs --plan|--design|--review|--ask` — Gemini consult; output to `AI-Village-Documentation/gemini-consults/latest.md`
- `node scripts/validation-orchestrator.mjs --files <path>` — 14-brain Village validation (~$0.68/run; Rule 16 requires Sean's permission)
- `bash scripts/scan-secrets.sh --staged` — pre-commit secret scan (auto-runs; manual run available)
- `node scripts/consult-codex-via-openrouter.mjs` / `consult-codex-v1-1-review.mjs` / `consult-codex-v1-2-review.mjs` / `consult-codex-impl-review.mjs` — these were Claude's invocations of Codex when Codex was the gate. Repurpose or write inverse `consult-claude-as-hostile.mjs` if useful.
- `cd backend && npx vitest run tests/unit/<file>` — targeted unit test
- `cd backend && npx vitest run --config vitest.integration.config.mjs tests/integration/<file>` — integration test (requires `PG_DB_TEST` set to a non-production Postgres; skips cleanly if absent)

---

## §8. Files Codex must read on first session start

1. **/CLAUDE.md** — root operating index, 59 rules, conventions, gotchas
2. **/ACTIVE-INDEX.md** — repo navigation map
3. **This file** — `/docs/ai-workflow/AI-HANDOFF/CODEX-PRIMARY-BUILDER-HANDOFF-2026-05-05.md`
4. **/docs/ai-workflow/AI-HANDOFF/PHASE-5-PLAUD-AUTO-INGESTION-PLAN-v1.2-2026-05-04.md** — the approved plan
5. **/docs/ai-workflow/references/PLAUD-APPLAUD-RUNBOOK.md** — operational runbook
6. **/docs/ai-workflow/AI-HANDOFF/PHASE-5-IMPLEMENTATION-HOSTILE-REVIEW-2026-05-04.md** — Claude's prior hostile self-review
7. **/docs/ai-workflow/AI-HANDOFF/PHASE-5-CODEX-IMPL-REVIEW-2026-05-04.md** — Codex's (your) prior hostile review of the implementation
8. **/.ai-workflow/continuity/rolling-last-done.md** — cross-session continuity log

Files to consult on demand (don't load on first start):
- Compact references in `/docs/ai-workflow/references/*.md` (BLUEPRINT-PROTOCOL, NASM-OPT-PROTOCOL, SOCIAL-PLATFORM, etc. — load only the topic you're working on)
- Recent commit messages: `git log --oneline -30`
- Specific test files when modifying related code

---

## §9. Tone for handoff response

When you finish reading and post your first message back:

- Don't repeat what you read. Sean already knows what's in these files.
- Don't ask about rules — they're in CLAUDE.md.
- Either start on §4 (active task) with an initial implementation plan, OR raise ONE specific clarifying question if there's a real ambiguity.
- Use confidence tags (Rule 51): `[VERIFIED]`, `[LIKELY]`, `[HYPOTHESIS]`, `[UNKNOWN]` for non-trivial factual claims.
- Match Sean's directness. He's been in the trenches all day. Get to the point.

The build seat is yours. Ship well.

---

*Handoff doc end. Sean: paste the §0 prompt block to Codex; the rest of this doc is reference Codex loads on demand.*
