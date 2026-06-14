# Secret Exposure Incident — 2026-06-14 (Rule 59)

**Severity:** MEDIUM (contained — not in git, not public). Rotation recommended due to LLM-transcript/telemetry persistence.
**Status:** OPEN — awaiting Sean's rotation decision.

## What happened
During the `acquisition-engine-design` workflow (run `wf_374923cf-e6b`), the compliance-recon subagent grepped environment variables to assess email-sending posture. The grep printed the **live SendGrid API key value** (`SG.`-prefixed) from `backend/.env` (≈ lines 5 and 88) into the subagent's tool output. The subagent self-flagged it and did not re-quote the value in its summary.

This is a Rule 59 (read-time secret exposure) violation: the recon agent's prompt asked it to "assess SendGrid integration + env vars," and it grepped `.env` **contents** instead of using presence-only checks.

## Secret class + source
- **SendGrid API key** (`SG....`) — full email-send capability. Source: `backend/.env` (~:5, :88).
- The same file also holds owner email/phone (PII) and other env values; the recon grep was pattern-scoped to `SENDGRID_*` / `FROM` / `OWNER_*`, so Stripe/JWT/DB-URL keys were likely **not** matched/printed (not verified, to avoid re-reading the contaminated output).

## Exposure path (and what is NOT exposed)
- **Exposed to:** the subagent's tool-call transcript + the workflow output file under the session temp dir, and potentially Anthropic telemetry for that subagent run.
- **NOT exposed to git/public:** `git check-ignore backend/.env` → ignored; `git ls-files backend/.env` → not tracked; `git log --all -- backend/.env` → **never committed**. `.gitignore` lines 18, 330, 335-336 cover `.env` + `backend/.env`. So unlike the 2026-04-19 incident, this is not a repo/public leak.

## Recommended action
1. **Rotate the SendGrid API key** — SendGrid dashboard → API Keys → revoke the exposed key + issue a new one; update `SENDGRID_API_KEY` in Render env + local `backend/.env`. (This is the only rotatable secret confirmed surfaced.)
2. Owner email/phone are Sean's own contact info (PII, not rotatable) — no action beyond awareness.
3. Claude will **not** re-quote the value; the worktree `.env` is the source of truth.

## Process fix (prevent recurrence)
- Recon/audit agent prompts MUST forbid reading or grepping `.env` **contents**. Use presence-only checks only: `grep -c '^SENDGRID_API_KEY=' backend/.env`, `awk -F= '/^KEY=/{print "set, "length($2)" chars"}'`, or `git check-ignore`. Never print env values.
- Add this constraint to future Workflow recon prompts that touch config/env.

## Closeout note
Logged per Rule 59 step 4. The acquisition-engine-design workflow's PLAN + STRESS outputs live in the same (contaminated) output file; Claude will re-synthesize the acquisition plan from in-context recon + the existing marketing audit rather than re-reading that file.
