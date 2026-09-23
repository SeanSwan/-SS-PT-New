# Swan Ops console — handoff

> ## ⚠ SUPERSEDED — read `SWAN-OPS-HANDOFF-V2-2026-08-14.md` instead
>
> This v1 doc is kept for history. Two things in it are now known wrong:
>
> 1. **§4 "PROVEN" — `browser_click is DENIED under the launcher's config → probe
>    returned BLOCKED`.** That was an instrument artifact. Browser tools were not
>    reachable at all in that run (MCP tools are deferred and nothing had run tool
>    discovery), so *everything* looked blocked. Per-tool `approval_mode` is in fact
>    non-functional on codex 0.146.1, and with browsing on, clicking completes.
> 2. **§3's pricing headline** ($250–375/session; SwanStudios priced *below* the premium
>    band) is contradicted by the better-sourced 2026-08-14 15:32 report, which found
>    local golf-fitness mostly *below* $175 and affluent comparators at $190–250.
>
> §5's "next slice: re-run with Pass C working" is **done** — Pass C works as of
> 2026-08-14 evening. Everything else here still holds.

**Date:** 2026-08-14 · **Author:** vs-claude (Opus 5) · **Status:** job 1 shipped and dry; job 2 not started
**Tool location:** `C:\Users\BigotSmasher\Desktop\quick-pt\swan-ops\` — **outside the SwanStudios repo, deliberately**

---

## 1. Where this started

Sean was trying to find a conversation from a few days earlier in which he had pasted 6–7 YouTube
transcripts about Codex techniques (browser use, computer use, GPT-5.6 Sol). It was found: the
transcripts were captured on 2026-08-11 into `docs/ai-workflow/design-brain/field-techniques.md`
(commit `c41c47b0f`, on `origin/main`) as sections T1–T6. Note the **computer-use / browser-use
material was never written down** — only the design/art-direction half was captured.

From that, Sean's actual ask: *"I want to be able to just click a CMD button, and then from there I
can have Codex work on my site, on my social media, help me promote my emails, help me market this
business."*

**The key discovery, made before any building:** the capability was already installed.
`~/.codex/config.toml` already had `computer-use@openai-bundled`, `browser`, and `chrome` plugins
enabled, Playwright MCP with per-tool approval modes, and plugins for stripe/github/render/linear/
cloudflare/twilio/sites. `codex exec` is the headless primitive. **Nothing needed installing. What
was missing was a front door** — one entry point plus prewritten, guardrailed job prompts.

## 2. Decisions Sean made (do not re-litigate these)

| Decision | Value |
|---|---|
| Autonomy | **Draft & stage only.** No job posts, sends, buys, submits a form, or logs in. Publishing stays a manual act in the admin UI. |
| First job | **Market & competitor recon** only. Site work, social pipeline, and email campaigns were explicitly deferred. |
| Review panel | **Kimi K3 + HY3 only.** Sean cut the Opus 5 seat ($1.65) as redundant — the builder was already Opus 5. |
| Location | Tool lives outside the repo because this checkout is ~1,868 commits behind `origin/main`; anything committed here never reaches production. |

## 3. What exists now

```
swan-ops/
  Swan-Ops.cmd          double-click entry
  Swan-Ops.ps1          300 lines exactly (repo cap is 300)
  lib/Console.ps1       126 lines — palette, prompts, input hardening, link checker
  jobs/market-recon.md  the job 1 prompt (5 passes, A–E)
  README.md             usage + an honest "Known gaps" section
  sandbox/              the agent's ENTIRE writable universe
  reports/  logs/  .work/
```

Run it: double-click `Swan-Ops.cmd`, or non-interactively
`.\Swan-Ops.ps1 -Market "..." [-Focus "..."] [-Yes]`.

**First real output exists:** `reports/2026-08-14-004800-golf-focused-and-affluent-personal-train.md`,
44,082 bytes, 9/9 required sections, 60 VERIFIED / 31 INFERRED / 41 UNKNOWN, 55 unique source URLs,
0 occurrences of "NASM-certified". Findings worth knowing: premium 1:1 in this market runs
**$250–375/session** and integrated concierge programs run **$36,000–$40,000/year**, against
SwanStudios' $175/session and $33,600/12-month — i.e. **priced below the premium band.**

## 4. What is PROVEN — do not re-derive these

Every one measured in-session. Re-verify only if you change the relevant code.

- Sandbox blocks writes outside its root → `patch rejected: writing outside of the project`
- `jobs/` and `Swan-Ops.ps1` sit **outside** the agent's root (resolve as `..\`) → it cannot edit its own instructions
- Sandbox produce→move works e2e → codex wrote `sandbox/reports/PATHTEST.md`, `Move-Item` relocated it
- `browser_click` is **denied** under the launcher's config → probe returned `BLOCKED`
- `--isolated` exists in `@playwright/mcp --help` (in-memory profile, no cookies/logins)
- Arg fidelity: the `@codexArgs` **splat** delivers 8/8 args with spaced paths intact.
  **`Start-Process -ArgumentList` does NOT** — 13 args arrived as 17, quotes stripped. Do not "fix" it that way.
- Output capture: `*>` captures stdout **and** stderr. The old `2>&1 | Tee-Object` silently dropped
  stderr (100 lines in, 58 out) — that is why a failing run once produced a 26-byte log.
- A TOML array survives PS 5.1 native-arg passing **only** in the backslash form:
  `'key=[\"a\",\"b\"]'`. Plain quotes get stripped; backticks stay backticks.
- Input hardening: whitespace market → refused, exit 1. `'a {{RUN_TS}} b'` → rendered `a RUN_TS b`.
- Honest exit codes: failure → 1 (a scheduler can finally see it).

## 5. What is OPEN — the actual work left

**Next slice (highest value): re-run the recon with Pass C working.**
The first run lost its entire paid-ads sub-pass — it tried to read the Meta Ad Library and Google Ads
Transparency Center as plain text, and they are JavaScript apps. The prompt has since been changed to
route Pass C through browser/Chrome control, **but that change has never been exercised.** Competitors'
live ad creatives and how long each has been running is the single most valuable missing data — an ad
running for months is a proven ad.

Acceptance: a new report whose "How they acquire" section contains ad-library findings tagged
`[VERIFIED]` with URLs, **or** an explicit `[UNKNOWN]` stating browser control was unavailable. Both
outcomes are acceptable; a silent web-search guess is not.

**Then, in rough priority:**
1. Job 2. Sean's original ask named site work, social, and email. Social publishing already exists in
   the app (`nativeSocialPublishingService`, `SocialPublishingJob`, retry, compliance) — **Bluesky is
   the only natively-available channel**; YouTube/Facebook/Instagram need OAuth, TikTok needs Content
   Posting API approval, Nextdoor needs partner status. Email is blocked on DMARC (below).
2. Verbatim-quote enforcement — the prompt now demands a ≤25-word quote beside each VERIFIED URL, but
   nothing checks the quote matches the page. The link checker only proves the URL resolves.
3. A real timeout. See "Known gaps" — the obvious implementation was built, measured, and rejected.

**Known gaps (disclosed in README, do not treat as bugs to rediscover):**
- **No hard timeout.** `Start-Job`+`Wait-Job` was built and measured: `Stop-Job` blocks until the child
  exits, so a 3s timeout on a 20s task took 26s. It bounds nothing. Truly bounding it means killing the
  codex process, and **this machine runs other Codex sessions** a broad kill would destroy. Removed
  rather than ship a false guarantee. Blast radius is bounded instead by a 20-hour interval + 2/day cap
  on `-Yes` runs.
- **Network egress is not sandboxed.** The Codex sandbox governs the filesystem only; Playwright runs
  outside it. Click/type/submit are denied, but a plain GET can still change state on someone's server.
  This is the real residual risk in the design.
- A cancelled interactive run exits 1, same as failure.

## 6. Environment defects found (Sean's Codex install, not the tool)

- `models_cache.json` re-corrupts after nearly every call (`missing field base_instructions`).
  Self-heals on load, immediately re-breaks. It killed one run outright.
- **`prompt-depth-router` skill is broken** — `.codex/skills/prompt-depth-router/` has `SKILL.md`,
  `agents/`, `references/` but **no `scripts/`**, so `route-prompt.mjs` is missing. Errors every session.
- Linear MCP OAuth grant is dead (`invalid_grant: Grant not found`). Linear is API-key auth, not OAuth.
  `LINEAR_API_KEY` is also absent from env, so Linear capture is currently impossible.

## 7. Hard-won process lessons (read this or repeat them)

**Six instrument failures happened in this session.** Every one was a tool that could not observe the
thing it was being used to claim:

- `&&` short-circuit → empty output read as "not in git history" (it was there)
- Git Bash path conversion mangled `cmd /c` → nearly filed the `.cmd` entry as broken (needs `MSYS_NO_PATHCONV=1`)
- A partial log read → "the run failed" while it was still running (log grew 19KB→25KB→31KB mid-writeup)
- `pgrep`/`tasklist` for a Windows process → false "exited"
- A monitor firing on **file existence** → the file was 0 bytes
- A `.cmd` arg-echo harness → batch splits on `=`, so it blamed PowerShell for its own behaviour

**The rule that would have caught all six:** before reporting that something is absent, stopped, or
broken, name the signal that would change if it were present, and confirm your instrument can actually
observe that signal.

**Second lesson: self-review vs paid review find different classes.** Four rounds of self-review found
mechanical defects (encoding, capture, argument fidelity). Kimi and HY3 went straight to architecture —
what the boundary actually governs, and what lives inside the writable root. Neither would have come
from attacking my own work harder, because both follow from an assumption I couldn't see.

**Third: the round that applies a fix is the next round's primary attack surface.** Two of the worst
defects in this session were introduced by fixes — a logging fix that corrupted every argument, and a
timeout that timed nothing out.

## 8. Rules that bound this work

- **Proof-before-done:** no "done/fixed/working" without current-session reproducible evidence in the
  same message. Rule 73/74.
- **Dry-loop:** hostile rounds until two consecutive rounds find nothing, each from a NEW vantage.
  This work closed at `DRY-LOOP: CLEAN×2 (rounds: 16)`.
- **Hermes memo** at substantial task close → `.ai-workflow/hermes-inbox/pending/`, must include a
  literal `## Mistakes I made` heading.
- **Dual-tier summary**, plain-English first, at every substantial closeout.
- **Privacy:** no PII, no secrets, no precise home-location data in any committed artifact or paid-model
  packet. A location example in a code comment was caught and removed for exactly this reason.
- **Credentials phrasing:** "26+ years of experience", "NASM-protocol". **Never "NASM-certified."**
- No "yoga"/"meditation" for SwanStudios offerings — use "stretching"/"flexibility".
- Paid model calls: zero-call preflight first, then explicit approval for that exact preflight.

## 9. Artifacts from this session

- Review packet (sanitized, sent to the panel): `docs/ai-workflow/AI-HANDOFF/SWAN-OPS-CONSOLE-REVIEW-PACKET-2026-08-14.md`
- Kimi K3 review: `docs/ai-workflow/AI-HANDOFF/KIMI-K3-SWAN-OPS-REVIEW-2026-08-14.md` ($0.2056)
- HY3 review: `docs/ai-workflow/AI-HANDOFF/HY3-SWAN-OPS-REVIEW-2026-08-14.md` ($0.0050)
- Hermes memos: `.ai-workflow/hermes-inbox/pending/20260814T063000Z-*`, `20260814T080000Z-*`, `20260814T084000Z-*`
- Learning packet: `docs/ai-workflow/hermes-learning-packets/20260814-a-green-pipeline-is-not-an-intact-payload.md`

**These are all untracked/uncommitted on branch `wip/comms-notifications-2026-07-05`, which is ~1,868
commits behind `origin/main`.** Sean's instruction was to leave the branch alone. Another agent doing
`git add -A` would sweep them — stage explicit paths only.
