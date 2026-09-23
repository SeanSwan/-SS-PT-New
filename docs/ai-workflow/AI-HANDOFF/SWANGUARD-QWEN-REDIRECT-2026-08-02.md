# STOP — you are building the wrong application

Your last run opened `BOOTCAMP-BRAIN-QWEN-BUILD-BLUEPRINT-2026-08-02.md` and began work on slice 3a, `exercisesUsed`, JSONB exercise data.

**That is a different product, in a different repository, for a different job.** That blueprint is real and its task is real — it is just not this task. It lives in the SwanStudios repo (`SS-PT/docs/ai-workflow/AI-HANDOFF/`). `exercisesUsed` does not exist anywhere in SwanGuard; the string returns zero matches.

You then stopped building entirely and began listing files in `/mnt/c/tmp/ss-bootcamp-v2-20260731` — also Bootcamp — and offered to diff PNGs and parse logs. **No SwanGuard code was written. You never entered the SwanGuard repository.**

You also reported `npm test` completing in ~0.3 seconds. The SwanGuard web suite alone runs **321 tests in ~36 seconds**. A sub-second "test run" is a command that failed instantly, almost always because it ran in the wrong directory.

**The failure that matters is not the wrong repo — it is that you never said you were lost.** You produced confident, well-formatted output about the wrong product. Silence about confusion is the one failure mode this blueprint is written to prevent.

---

## Orientation gate — do this before anything else

Run these three commands and paste the real output. Do not proceed until all three pass.

```bash
cd /mnt/c/Users/BigotSmasher/Desktop/SwanGuard-Newsroom && pwd
ls docs/SWANGUARD-PERSONAL-HUB-BUILDER-SUPERPROMPT-2026-08-02.md
ls packages/database/migrations/ | sort | tail -1
```

Expected: the path ends in `SwanGuard-Newsroom`; the builder document exists; the newest migration is `0025_news_rss_connector_schema.sql`.

**If any command fails, STOP and report it.** Do not improvise a different directory. Do not fall back to a repo you were in previously.

---

## Hard boundaries

- **Your only working directory is `Desktop/SwanGuard-Newsroom`.** Nothing in `SS-PT`, nothing in `/tmp` or `/mnt/c/tmp`, nothing in `Desktop/family-first-intelligence-command-center` (that is a stale copy from 2026-07-05 — never build there).
- **The Bootcamp blueprint is out of scope for this assignment.** If you find yourself reading it, you have drifted. Stop and say so.
- SwanGuard inherits SwanStudios *engineering discipline only* — never its fitness, trainer, workout, or client-dashboard concepts. Introducing them is a scope-drift failure and is item 2 on this repo's hostile-review checklist.

---

## What you are actually building

SwanGuard Personal Hub: a personal intelligence system over news, streaming, commerce, and agents. Read in this order, then stop and confirm your understanding before writing code:

1. `AGENTS.md` and `CLAUDE.md` at the repo root — engineering law, wins over everything below
2. `docs/SWANGUARD-PERSONAL-HUB-BUILDER-SUPERPROMPT-2026-08-02.md` — **your instruction set**, including 10 traps that will each cost you hours
3. `docs/11-slice-registry.md` — state the next slice before coding, per AGENTS.md #9
4. `docs/SWANGUARD-PERSONAL-HUB-BLUEPRINT-2026-08-02.md` and `-MASTER-PROMPT-` — architecture and product intent, as needed

**Build order:** H0 → H0.5 → H1 → H2 → H2.5 → H3. There is no separate P1 slice; it was folded into H0.5.

---

## Your first slice is H0, not H2.5 or H3

H0 is the outlet taxonomy migration — schema only, no behavior change, no UI. Its full spec including exact types and acceptance criteria is in the builder document.

The single most important thing in the whole build sits in **H0.5**, immediately after. Its literal first command, decided by Kimi K3, is written verbatim in that slice. Do not reinvent it.

---

## Baseline — measured 2026-08-02, so you can tell your breakage from pre-existing breakage

| Command | Expected |
|---|---|
| `npm run type-check` | exit 0, clean across all five workspaces |
| `npm test` | exit 0 — web **321 passed / 8 skipped in ~36s**, database 45, domain 204, plus api and scripts |

**The baseline is green. Any red you see is yours.** If the baseline is red when you start, something changed — stop and report rather than absorbing it into your slice.

Boot with `npm run dev:backend`. Never hand-assemble environment variables; there is no `.env.example` and the API throws on a dozen missing vars.

---

## Rules that override your instincts

1. **You do not decide. You implement.** Every product, architecture, security, and legal call is already made and written down.
2. **If the spec does not cover it, STOP and report the gap.** Do not guess, do not improvise, do not substitute a similar-looking task. A stop with a clear question is a success. A confident guess is a failure.
3. **Failing test first**, then the fix.
4. **No completion claim without pasted command output.** "Should work" is banned.
5. **Hostile review after every slice** — attack your own work, fix, re-verify, repeat until a full pass finds nothing.
6. **No merge to main. No deploy.** Ever, without Sean's explicit word.
7. **Never widen scope.** Notice dead code — mention it, do not delete it.

---

## When to escalate to Kimi K3

Escalate for a **design or architecture decision the spec genuinely does not cover** — not for anything answerable by reading a file.

Give it, in this order: (a) that this is SwanGuard, a personal-intelligence app, **not** SwanStudios; (b) which slice you are on and the exact spec text that is silent; (c) what you have already verified in-tree, with file:line; (d) the specific decision needed and the options you see; (e) that a low-autonomy builder will execute the answer verbatim, so it must be unambiguous.

Never ask Kimi to re-decide something the blueprint already settled. Report those to Sean instead.

---

## Linear

Board is `SWA`. The SwanGuard program issue is **SWA-70** — read its recent comments before starting; they carry the panel verdicts, the B8 sequencing decision, and the B6 procurement findings.

Comment on SWA-70 at each slice close with: what you built, pasted proof, hostile-review rounds and findings, and the next slice. Do not open new issues without asking.

---

## Answer these three before writing any code

1. What is the absolute path of your working directory?
2. What is your first slice, and what is its first file?
3. Name one thing the spec forbids you from doing.

If you cannot answer all three from the documents, say so instead of starting.
