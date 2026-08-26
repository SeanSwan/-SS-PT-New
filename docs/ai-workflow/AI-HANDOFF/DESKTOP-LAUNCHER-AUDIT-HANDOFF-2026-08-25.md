---
decision: "Desktop .cmd estate audited and consolidated 22 → 15; Hermes Desktop launcher repaired; Ox Alpha given its own launcher after a documented lesson repeated"
status: open
supersedes: none
---

# HANDOFF — Desktop .cmd audit + Ox seat control (2026-08-25)

**For the next agent.** Read this top to bottom before touching anything. It is
self-contained: you do not need the prior transcript.

- **Session:** `ss-pt-b2` · branch `wip/comms-notifications-2026-07-05`
- **Commit landed:** `c49c35d83` (one file) · **NOT pushed**
- **Linear:** SWA-196 (commented, In Review)
- **Total paid-AI spend:** $0.18

---

## 1. What Sean asked for, in his words

1. Audit every `.cmd` on the Desktop; say which are relevant.
2. The taskbar refresher should run on one click — **no Y/N prompt**.
3. **Hermes Desktop is the daily driver.** The other Hermes launchers open "that
   web app, which I hate, and I'm never going back." Retire them — but first
   check whether any of their options should move into Hermes Desktop.
   **Wonderschool is dead — skip it entirely.**
4. Keep only the newest SwanGuard launcher; drop the rest.
5. He wants to actually USE SwanGuard for news — *"I made it for myself, and then
   I want to make it for everybody else."*
6. Icons: the `.cmd` files "look like just two nuts and bolts," all identical. He
   wants to recognise them by logo, not by reading names.
7. Then: "run Ox and GLM 5.3 as well as Qwen and HY3, hostile review, make fixes."
8. Then a correction: **"Grok 4.6 is not Ox. Ox is its own AI."** Fix it so it
   cannot recur.
9. Then: commit.

---

## 2. State on disk RIGHT NOW (verified, not remembered)

### Desktop — 15 live `.cmd` (was 22)

**Keep / current:** `Hermes Desktop.cmd` (daily driver, rewritten), `Hermes.cmd`
(terminal), `Hermes Tools.cmd` (NEW), `Flush Taskbar Auto-Hide.cmd` (fixed),
`Cool The GPU.cmd`, `Swan Prompt Studio.cmd`, `Swan Local Video 5090.cmd`,
`Swan Visualizer.cmd` + `Swan Experiment 1/2`, `Swan Guard.cmd`,
`Swan Code Guards.cmd`, `Swan Training Studio.cmd`, `Swan-Command.cmd`.

**UNRESOLVED — Sean never ruled on it:** `Hermes Command Center.cmd`. It opens a
BROWSER status page from `~/.hermes/runner-repo`. Different thing from the web
chat he hates, so it was left in place. **Ask him.**

### Archived (moved, NOT deleted) — `Desktop\_retired-launchers-20260825\`

Six web-app Hermes launchers (`Start Hermes 2`, `Hermes Daily Brief`,
`Hermes Dashboard GUI`, `Hermes Local Private Chat`, `Hermes Local Private Check`,
`Hermes Browser Harness Check`), plus `Swan Guard (Newsroom).cmd` (demo-only,
superseded by `Swan Guard.cmd --demo`), `Swan Video Studio.cmd/.ps1`,
`Start-Swan-Applaud-Sync.cmd/.ps1`, `Fable Context Estimator.cmd`.
`WHY-THESE-ARE-HERE.txt` explains each. Drag back to restore.

> `Start-Swan-Applaud-Sync.cmd/.ps1` was already versioned at `scripts/launchers/`
> — the Desktop copy was a duplicate. Archiving lost nothing.

### Backups

`c:\tmp\Hermes Desktop.cmd.bak-20260825`
`c:\tmp\Flush Taskbar Auto-Hide.cmd.bak-20260825`

---

## 3. The two bugs that justified rewriting Hermes Desktop.cmd

Both VERIFIED, not inferred:

1. **`HERMES_HOME` was never exported.** `~/.hermes/config.yaml` DOES NOT EXIST on
   this machine; the real 25 KB config is `~/hermes2/.hermes/config.yaml`; and
   `HERMES_HOME` is empty in a WSL login shell. So Hermes fell back to built-in
   defaults — losing model aliases, toolsets, compact display — while the
   launcher's own banner claimed "same config as your terminal Hermes."
   `Hermes.cmd` already pinned it, with a comment describing this exact failure.
2. **The gateway was never started.** `Hermes.cmd` starts it; Desktop did not.

**REFUTED — do not re-fix:** the gateway does NOT need `HERMES_HOME` passed in.
`c:\tmp\hermes2-gateway-bg-start.sh:3` exports it itself.

---

## 4. Review rounds — what each seat is actually worth

- **Round 1:** Grok 4.6 ($0.159) · GLM 5.3 (sub) · HY3 ($0.023) · Qwen 3.8 ($0)
- **Round 2:** Ox Alpha ($0.00) — scrubbed packet, told what R1 already found

| Seat | Signal |
|---|---|
| **Ox Alpha** | 8 findings the other four missed. Hedged one claim as unverified rather than asserting it — correct reviewer behaviour. |
| **Grok 4.6** | 1 BLOCKER + 3 HIGH, all specific; also explicitly refuted 5 of my stated suspicions. |
| **GLM 5.3** | 11 findings, correctly graded; caught 2 Grok missed. |
| **HY3** | Confirmed the BLOCKER independently. Terse, cheap. |
| **Qwen 3.8** | **NOISE.** Reasoned in circles, self-contradicted, landed a false HIGH. |

**Disproven findings — do NOT re-raise:**

- Qwen: *"`StuckRects3` is the wrong Win11 registry key."* Verified: `StuckRects3`
  EXISTS, `StuckRects2` does NOT, blob 48 bytes, byte[8]=3.
- Ox H1: *"`HERMES_HOME` never reaches the gateway."* See §3.
- My own: *"`echo.` resets ERRORLEVEL."* Empirically FALSE. `del` does; `echo.` does not.

**All 17 real findings are fixed.** Highlights: unsafe `echo` prompt-write (an `&`
in a question broke the file AND could execute), swallowed gateway errors, false
exit codes, delayed-expansion input mangling, quote-injection in the menu,
gateway-started ≠ gateway-reachable (now a 6×2s status poll), WSL-failure
misreported as first-run, recovery commands missing `-d`, and a taskbar banner
claiming "open windows stay open" when `Stop-Process -Force` does the opposite.

---

## 5. Verification actually performed — and its limit

**Done:**

- Menu dispatch exercised against the REAL dispatch block extracted from the
  shipped file: all 11 options route; `1"` strips and routes; `1!0` / `zz` /
  empty correctly rejected.
- Gateway retry loop tested in isolation: succeeds-on-3 stops at 3;
  never-succeeds tries 6 then warns. (`if defined` inside `for /L` without
  delayed expansion — the construct that silently breaks — confirmed working.)
- All 3 files: CRLF-only, 0 tabs, balanced parens, 0 missing labels.
- Taskbar PowerShell payload parses via `[ScriptBlock]::Create`.
- `consult-ox.mjs`: `node --check` clean, `--model` refusal returns 2.

**LIMIT — state this to Sean, do not paper over it:** *no launcher has been
double-clicked.* Logic is verified; runtime is not. Launching Electron and
restarting Explorer are Sean's clicks.

---

## 6. The Ox fix — why a note was not enough

Ox Alpha has **no transport of its own**. It rides `consult-grok.mjs`, selected by
the `SWAN_GROK_MODEL` env var. This misfired TWICE:

- **2026-08-24** — `--model stealth/ox-alpha` passed as a flag → ignored (the
  script reads env, not argv) → Grok served. Written up in memory WITH the correct
  command and "check the `Served:` line before attributing anything."
- **2026-08-25** — `SWAN_GROK_MODEL="${SWAN_GROK_MODEL:-}"` sets it to the EMPTY
  STRING → fell through to the `x-ai/grok-4.6` default. The report said
  `Grok 4.6` and `Served: x-ai/grok-4.6`. It was relayed to Sean as "Ox Alpha"
  anyway.

**The write-up did not prevent the repeat.** `scripts/consult-ox.mjs` (`c49c35d83`)
is the control: hardcodes the model, OVERRIDES inherited env, exits 2 on
`--model`, prints the retention warning every run.

```
node scripts/consult-ox.mjs --document <doc> --out <out> --remit "..." --effort high
```

**PRIVACY:** Ox is $0 *because* it is an OpenRouter **stealth** listing — an
undisclosed lab RETAINS the prompts. Sean's standing 2026-08-23 yes covers design
briefs and review packets, NOT PII, credentials, or raw config. Scrub the packet;
never drop the seat. (The round-1 packet went out carrying the WSL username and
machine paths before this was caught. Round 2 was scrubbed and verified clean.)

Memory updated in two places: `feedback-consult-seat-gotchas` #1 and
`feedback_ox_alpha_always_in_panel`.

---

## 7. Mistakes made this session — the training signal

- **Repeated a documented lesson** (the Ox misfire). Highest-signal entry here: a
  correction that only lives in prose will be skipped again. It took a script to
  actually close it.
- **Labelled a report by intent, not by its header.** The output said "Grok 4.6"
  in three separate places and was still relayed as Ox.
- **Backslash-eating corruption hit 4×.** `C:\tmp` became `C:<TAB>mp` in a live
  path; bare-LF regressions twice; two failed anchors. Root cause: `\\` collapses
  to `\` passing through the write layer. **What works: build backslashes with
  `chr(92)`, never type them, and re-verify bytes after EVERY write.**
- **Wrote a probe that lied.** `readlink -f` returned empty for both paths, so the
  comparison printed "SAME BINARY" from two empty strings. Then hit
  `MSYS_NO_PATHCONV` on the retry. Validate the instrument before believing it.
- **Sent unscrubbed machine paths to a retention-unknown provider** in round 1.
- **Hit the ~8K Bash command-line cap** writing this very file (surfaced as
  `unexpected EOF while looking for matching '`). Documented as gotcha #7; use the
  Write tool for anything over ~7K.

---

## 8. OPEN — pick up here

### Blocked on Sean (remind him)

- **Anchor key.** `~/.hermes/anchor-key-STORE-IN-PASSWORD-MANAGER-THEN-DELETE-THIS-FILE.txt`
  **STILL EXISTS.** It was copied to his clipboard; he was asked to paste it into
  Proton Pass and confirm. He has not. The live key is the `HERMES_ANCHOR_KEY`
  User env var (verified identical, 64 chars), so the file is a redundant
  plaintext copy and deleting it breaks nothing. **Do not delete without his yes.**
- **Click the two launchers** and report what happens (see §5 limit).
- **`Hermes Command Center.cmd`** — keep or retire? (§2)
- **Push?** Branch is 472 ahead / 2,272 behind `origin/main`. Not pushed on purpose.

### NEXT SLICE — SwanGuard recon (Sean's stated priority)

He wants to *use* SwanGuard for news. **Do NOT start coding. Recon first.**

1. **Nobody is in that lane.** The only lane claim is `vs-claude--main-s4829253c`
   ("SwanGuard P0 security remediation"), stale since Aug 14. Named sessions, all
   OFFLINE: `SwanGuard pre-ship hardening handoff and hostile review` `[04ca6a]`;
   `Hostile review and handoff of SwanGuard and git-lock work` `[f2c720]` and
   `[69a38e]`.
2. **SwanGuard is a SEPARATE repo** with **9 worktrees** across 7 branches. The
   live one is `C:\Users\BigotSmasher\Desktop\SwanGuard-Newsroom` on
   `merge/newsroom-mainline-v3`, HEAD `433cb64` (Aug 23). Others:
   `Desktop\family-first-intelligence-command-center` `[main]` (has NO
   NewsroomShell), `c:\tmp\swanguard-civic-release-20260813`,
   `…-desktop-upgrade-20260801`, `…-docs-push-20260802`,
   `…-newsroom-audit-20260801`, `…-production-completion-20260714`,
   `…-refactor-fable`, and `SS-PT\tmp\swanguard-backend-hardening`.
   **Which checkout is truth is the first question to answer.**
3. **The demo-data question Sean actually asked.**
   `apps/web/src/newsroom/demoData.ts` still exists and is imported by
   `storyService.ts` (plus `creators/types.ts` and two test files). BUT
   `Swan Guard.cmd` already boots **LIVE** by default (`--demo` is opt-in), and the
   outlet registry ships **EMPTY** — so an empty feed there is HONEST, not broken.
   Determine (a) whether `storyService.ts` can still serve demo rows on the live
   path, and (b) whether any real source is seeded.
4. Related board item: **SWA-203** — "SwanGuard watch surface + /api/feed (F3) +
   source expansion — panel design ready, awaiting Sean's shape call."

### Also open — icons (Sean asked; not yet built)

**Key fact: a `.cmd` CANNOT have a custom icon.** Windows has no per-file icon
field for `.cmd`/`.bat`. The fix is `.lnk` shortcuts, which do support one — he
already has working examples on the Desktop (Brave, Plaud, Proton, Wispr Flow).

Plan: move the `.cmd` files into a folder, put `.lnk` shortcuts on the Desktop,
point each at a multi-resolution `.ico` (16/32/48/256 in one file — a renamed PNG
looks fine in Explorer and blurry on the taskbar). **XnConvert is already
installed** and does this.

Recommendation given: generate art on his own 5090 via Swan Prompt Studio (free,
on-brand) for the ~6 he opens daily; flat colour-coded glyphs for the rest, since
AI illustration turns to mush at 32px. Colour families: **Hermes = gold,
SwanGuard = red/civic, Swan creative = cyan, system utilities = grey.**

### Nice-to-have

Version the 3 rewritten launchers into `scripts/launchers/` — precedent exists
(`swan-guards.ps1`, `Start-Swan-Applaud-Sync.*` already live there). They
currently exist in ONE place plus a `c:\tmp` backup that gets cleared.

---

## 9. Rules that bit this session — carry them forward

- **Rule 67:** the tree holds OTHER AGENTS' uncommitted work (deleted Hermes inbox
  memos, modified `.claude/settings.json`, Village archives, ~200 untracked
  scripts). **NEVER `git add -A`.** Stage explicit paths. Run
  `node scripts/lane.mjs doctor` first.
- **Rule 73:** no "done / fixed" without current-session proof AND a clean hostile
  pass in the same message.
- **Rule 16 / spend-guard:** cheap and free seats first. This entire two-round
  review cost **$0.18**. Fable was not needed and was not called.
