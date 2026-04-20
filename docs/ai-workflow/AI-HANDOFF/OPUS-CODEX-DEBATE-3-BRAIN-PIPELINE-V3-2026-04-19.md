# Codex Review - v3 3-Brain Pipeline Plan

## ROUND 1 - Codex Review

## Verdict

**REVISE**

The plan is directionally right and pragmatic for a solo-dev remote workflow, but it is not ready for Week 1 rollout until the security gate covers file writes, not just Bash commands.

## Answers to 5 Open Questions

**Q1 - Daily cap:** $5 soft cap. Keep it. Warning at 80%, manual confirm after 100%, no hard kill. Add a one-session explicit override for emergency production incidents.

**Q2 - SOUL.md threshold:** Hybrid trigger. Use 100 active entries or 90 days old, whichever comes first. 200 is too much for a working memory file; archive the rest into dated docs.

**Q3 - Soft-warn grace period:** Warnings forever. Do not auto-deny all hard-coded dimensions; icons, fixed controls, canvases, and test fixtures sometimes need pixels. Escalate repeated violations in review, not at write time.

**Q4 - Model verification cadence:** Monthly plus on explicit model rotation or API/model error. Weekly is noise. Session-start verification is too much friction.

**Q5 - Escalation iteration:** Iteration 4 is right. Iterations 1-2 normal, iteration 3 reflection, iteration 4 asks Sean. For remote phone coding, endless autonomous retries are worse than one useful ping.

## Gaps Village Missed

- **CRITICAL - Bash denies do not prevent the exact re-leak Codex caught.** v3 lines 52-53 and 124-129 focus on Bash command patterns. The earlier re-leak was secret text written into a Markdown handoff doc, not a shell command. `Write(docs/**/*.md)` at lines 74-85 would still allow an agent to write a full key into `docs/ai-workflow/AI-HANDOFF/*.md`. Fix: add repo-wide content secret scanning for every Write/Edit and pre-commit, covering API keys, JWTs, DB URLs, PEM/private keys, and known rotated secret fingerprints.

- **HIGH - Pattern syntax is assumed, not verified.** The deny `Bash(*AIza[A-Za-z0-9_-]{35}*)` at line 129 looks regex-like. Claude permission patterns may be glob/exact-style, not full regex. If treated literally, the Google-key deny does not work. Fix: implement/test deny patterns with simulated commands before trusting them.

- **HIGH - v3 says `.ai-workflow/audit/` is gitignored, but current `.gitignore` does not include it.** v3 lines 24, 57, and 336 claim the audit path is covered. Current `.gitignore` only has the credential block for `.claude/settings.local.json`, env files, keys, and token artifacts. Add `.ai-workflow/`, `.ai-workflow/audit/`, and likely `SOUL.archive/` before rollout.

- **HIGH - Mandatory lint gate is currently impossible.** v3 lines 25 and 195-198 require ESLint clean, but `frontend/package.json` and `backend/package.json` do not expose a lint script. Fix: either add lint scripts/config first or define the Week 1 gate as TypeScript + tests + Playwright until lint exists.

- **HIGH - `Bash(node scripts/*:*)` is too broad.** v3 lines 110-113 pre-approve every script under `scripts/`. This can include cost-bearing AI calls, env readers, production helpers, or future destructive scripts. Fix: allow named safe scripts only; make `consult-gemini`, `hermes-village`, migration runners, and production scripts ask.

- **MEDIUM - Permission plan references `.claude/settings.json`, but this repo currently has no `.claude/settings.json`.** Only `.claude/settings.local.json` exists locally. That is fine for rollout, but the plan should say Phase 1 creates the tracked/shared base file and leaves local secrets/approvals in ignored local settings.

- **MEDIUM - `config/MODEL_VERSIONS.md`, `scripts/validate-env.sh`, `scripts/ai-workflow-run.sh`, `docs/ai-workflow/references/3-BRAIN-PIPELINE.md`, `.ai-workflow/`, and `SOUL.md` are aspirational paths.** v3 correctly lists them under "Files Changed By This Plan," but Phase 5 says integration paths exist today. Mark generated/future files explicitly.

- **LOW - Files Changed section says `SOUL.md` decision should "see Q3"; it should point to Q2.** v3 line 419 references the wrong open question.

## Pattern-Based Deny Test Results

- `Bash(*PGPASSWORD=*)` vs `PGPASSWORD=... psql ...`: **Yes, if wildcard matching works.** It misses split assignment forms, sourced env files, PowerShell `$env:PGPASSWORD=...`, and values already stored in shell history/settings.
- `Bash(*AIza[A-Za-z0-9_-]{35}*)` vs `GEMINI_API_KEY=AIza... node ...`: **Unknown/likely unsafe until tested.** This depends on whether Claude permission patterns support regex character classes and `{35}` quantifiers.
- Edge cases: base64/URL-encoded secrets, multiline PEM/JWT content, `echo SECRET > file`, Markdown handoff writes, PowerShell env assignment, `Set-Content`, heredocs, and secrets passed through variables. Bash deny alone is insufficient.

## Specific Code/Path Verification

Existing: v2 doc, v3 doc, briefing doc, `scripts/consult-gemini.mjs`, Hermes bridge doc, security remediation doc, Village `fix-instructions.md`, Village `design-recommendations.md`.

Missing today: `~/swanstudios-wiki/inbox/3-brain-prompt.md` on this machine, `memory/project_runtime_drift_backlog_2026_04_19.md`, `config/MODEL_VERSIONS.md`, `scripts/validate-env.sh`, `scripts/ai-workflow-run.sh`, `docs/ai-workflow/references/3-BRAIN-PIPELINE.md`, `.ai-workflow/audit/DAILY-SUMMARY.md`, `SOUL.md`.

## Recommendations

- Add a pre-commit and write-time secret scan before any Week 1 permission relaxation.
- Test Claude permission pattern semantics with simulated commands before relying on regex-like denies.
- Add `.ai-workflow/` and audit outputs to `.gitignore`.
- Do not pre-approve broad `node scripts/*`; enumerate safe scripts.
- Keep Codex `approval_policy = "on-request"` and `sandbox_mode = "workspace-write"`. Reduce prompts with narrow approved command prefixes, not blanket shell access.
- In Codex `config.toml`, consider making Playwright `browser_run_code` ask by default unless the target is localhost/trusted app; it is powerful enough to mutate live browser state.
- Add a CLAUDE.md pointer to this v3 review and a short rule: "secret scanning covers Write/Edit outputs, not only Bash."

## Status

**NEEDS REVISION**

This is close. Do not roll out the permission-relaxation phase until the write/pre-commit secret scanner and `.gitignore` audit paths are in place.
