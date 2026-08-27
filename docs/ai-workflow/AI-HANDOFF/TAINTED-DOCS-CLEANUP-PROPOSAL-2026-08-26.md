---
decision: "Rewrite operator identity in committed handoff docs to placeholders, and gate recurrence at pre-commit. Sean approved A+C on 2026-08-26; both executed."
status: shipped
supersedes: none
---

> **EXECUTED 2026-08-26.** Sean approved **A + C**. B, D, E were **not** approved and remain open.
> - **A** → `c42e827b4` — 58 files rewritten, 148 placeholders, `git grep` residual **0** (both the
>   username and the 8.3 short form, verified against `HEAD`, not just the working tree).
> - **C** → `f7b4fb75b` — pre-commit identity rule live, **plus** a pre-existing allowlist bug fixed
>   (see §8).
> The remainder of this document is the Phase 1 proposal as written; §8 records what actually happened.

# Tainted-docs cleanup — Rule-34 Phase 1 proposal (2026-08-26)

**Author:** Fable 5 (Final Decider) · **Linear:** SWA-219 · **Phase:** 1 — inventory + plan.
**Nothing was moved, edited, or deleted producing this document.** [VERIFIED]: `find docs/ai-workflow/AI-HANDOFF -newer scripts/redact-tainted-docs.mjs | wc -l` → 0 after the dry run.

## 1. Why this is the last open path

The egress redactor (slices 1-2, packet §8) now gates every *script* that sends documents to an
external model. What it cannot gate is **agent-driven egress with no code chokepoint**: an agent
pasting a handoff into a Linear comment, publishing it as an Artifact, or Hermes reading `docs/`
over SSH/cat. Those read the files as they sit on disk. As long as the files carry the operator's
Windows username, every one of those channels leaks it. The only fix is the files.

## 2. Inventory (counts and shapes only — the identity never appears in this doc)

Measured with `git grep -i <runtime username>` (case-insensitive) over tracked files.

| Scope | Files | Lines |
|---|---|---|
| Whole repo (tracked) | **93** | 410 |
| `docs/ai-workflow/` (all) | 69 | — |
| `docs/ai-workflow/AI-HANDOFF/` (this proposal's scope) | **58** | 147 |
| `scripts/` + `backend/` (code — separate class, §6) | 13 | 29 |
| `archive/`, `AI-Village-Documentation/`, `docs/LAPTOP-CONVERSION.md` | 8 | — |
| `.ai-workflow/` (gitignored, laptop-local; Hermes-readable) | 193 | — |
| Committed **history** touching a matching line in AI-HANDOFF | 38 commits | — |

**Shape classes in AI-HANDOFF** (from the dry run of `scripts/redact-tainted-docs.mjs`):

| Class | Example shape | Count | Rewrite to |
|---|---|---|---|
| `repo-path` | `C:\Users\<u>\Desktop\quick-pt\SS-PT\…` (any slash/case, incl. 8.3 short form) | 38 | `<REPO>\…` |
| `repo-path-wsl` | `/mnt/c/Users/<u>/Desktop/quick-pt/SS-PT/…` | 11 | `<REPO>/…` |
| `scratch-key` | `c--Users-<u>-Desktop-quick-pt-SS-PT` (Claude scratchpad dir key) | 26 | `<SCRATCH-KEY>` |
| `home-win` | `C:\Users\<u>\…` / same in Windows 8.3 short form | 73 | `<HOME>\…` |
| `home-wsl` | `/mnt/c/Users/<u>/…` | 3 | `<HOME>/…` |
| `home-posix` | `/home/<u>/…`, `/Users/<u>/…` | 23 | `<HOME>/…` |
| `ssh-login` | `ssh <u>@192.168.50.x` | 4 | `<OPERATOR>@…` |
| `bare-name` | standalone mention | 2 | `<OPERATOR>` |
| **Residual after all rules** | | **0** | — |

Top files: `USER-DASHBOARD-V3-OBSERVATORY-RECEIPT-2026-04-28.md` (23), `CONTINUITY-BRIDGE-PHASE-B-DEBATE-2026-04-22.md` (19), `panel-master-handoff-2026-08-22/SOL-PANEL-REVIEW.md` (13), `SWANGUARD-CM-CONTINUATION-HANDOFF-2026-08-19.md` (12).

## 3. The rewrite plan (Phase 2 — needs your approval)

One tool, runtime-derived identity, dry-run by default:

```
node scripts/redact-tainted-docs.mjs                       # dry run (what it would do) — READ-ONLY
node scripts/redact-tainted-docs.mjs --apply --approved-by-sean            # Phase 2, AI-HANDOFF only
node scripts/redact-tainted-docs.mjs --scope=docs/ai-workflow --apply --approved-by-sean   # wider, if you choose
```

Rules run most-specific-first (repo path → scratch key → home → ssh login → bare name) so a
repo path becomes `<REPO>/…` and stays a usable relative reference, not `<HOME>\Desktop\…`.
Placeholders match the redactor's vocabulary (`<OPERATOR>`, plus `<REPO>`/`<HOME>`/`<SCRATCH-KEY>`
which are more informative than the egress-time `<PATH>`).

**Why placeholders, not deletion:** the docs are receipts; `file:line` citations and launcher
paths must stay legible. `<REPO>/scripts/x.mjs` is still a citation. Nothing is deleted.

**Verification after apply:** `git grep -il <username> -- docs/ai-workflow/AI-HANDOFF | wc -l` → 0;
`node scripts/lib/redact-egress.test.mjs` unchanged; spot-read the two top files for readability;
commit with an explicit pathspec (`git commit -- docs/ai-workflow/AI-HANDOFF`).

**Rollback:** `git checkout -- docs/ai-workflow/AI-HANDOFF` before commit, or `git revert <sha>` after.

## 4. What Phase 2 deliberately does NOT do

- **History.** 38 commits still carry the strings; `git log -S` finds them. Rewriting history is
  Rule 45 territory (force-push, the same operation as the 2026-04-19 incident cleanup) and the
  repo's public/private status decides whether it matters. **Separate decision — not bundled.**
- **Emails.** 23 AI-HANDOFF files contain addresses; by domain: `evil.com`/`example.*`/`test.com`
  are fixtures (leave), `swanstudios.com`/`sswanstudios.com` are business (leave), `yahoo.com` ×5
  and `protonmail.com` ×6 are personal — **your call**; the egress redactor already masks them
  in transit.
- **LAN IPs / Pi hostnames** (`192.168.50.x`, `ssh` targets): not identity in the Rule-8 sense,
  but they are network facts about your home. Recommend a follow-on rule `192\.168\.\d+\.\d+ →
  <LAN-IP>` if you want it; not included by default.
- **Hostname:** 0 files. Nothing to do.

## 5. Recurrence prevention (Rule 39 — proposed, not applied)

Rewriting 58 files today buys nothing if tomorrow's handoff pastes a launcher path. Proposed
in the same Phase 2: extend `scripts/scan-secrets.sh` (pre-commit) with one runtime-derived
rule — `Users[\\/]<username>` and `/home/<username>` → **block the commit** — the same
identity derivation `redact-egress.mjs` uses, so the rule is never hardcoded. Until that
lands, the count will grow again (it went 59 → 61 during the session that first measured it).

## 6. Code files (out of scope here; listed so they are not forgotten)

13 code files hardcode the home path — `scripts/continuity-append.mjs` (15 lines), six
`scripts/launchers/*.ps1`, `scripts/hooks/drift-check-gate.mjs`, `scripts/swan-brain.mjs`,
`scripts/glm-audit.mjs`, `scripts/debate/panel-debate.mjs`, `backend/scripts/inspect-minors-ai-exposure.mjs`,
`scripts/hooks/egress-privacy-gate.test.mjs`. These are *bugs* (a launcher that only works on
one machine), not doc hygiene: fix with `$env:USERPROFILE` / `os.homedir()` in a separate
slice. `.ai-workflow/` (193 gitignored files) is laptop-local; Hermes reads it, so a `--scope=.ai-workflow`
pass is worth a follow-on once the tracked scope is clean.

## 7. Decision requested

- [ ] **A.** Run Phase 2 on `docs/ai-workflow/AI-HANDOFF` (58 files) — recommended, lowest risk, closes the open path.
- [ ] **B.** Widen to `docs/ai-workflow` (69 files) in the same run.
- [ ] **C.** Add the pre-commit identity rule (§5) — recommended with A.
- [ ] **D.** Personal emails (§4) — include / leave.
- [ ] **E.** History rewrite — defer (recommended) / schedule separately.

Reply with the letters. Phase 2 is one command per letter and commits with explicit pathspecs.

---

## 8. Phase 2 execution record — 2026-08-26 (A + C approved)

### 8.1 A — the rewrite (`c42e827b4`)

`node scripts/redact-tainted-docs.mjs --apply --approved-by-sean` → 58 files rewritten,
148 placeholder occurrences. Shape totals matched the dry run exactly (`home-win` 73,
`repo-path` 38, `scratch-key` 26, `home-posix` 23, `repo-path-wsl` 11, `ssh-login` 4,
`home-wsl` 3, `bare-name` 2).

**Verified against the committed tree, not the working tree:** `git grep -il <user> HEAD --
docs/ai-workflow/AI-HANDOFF` → **0**; the 8.3 short-form pattern → **0**. Pre-commit secret
scan reported CLEAN on all 58 staged blobs. Citations survived: repo paths read
`<REPO>\frontend\src\...\File.tsx:17` and remain navigable.

### 8.2 C — the gate (`f7b4fb75b`)

`scripts/scan-secrets.sh` gained two patterns: `operator-identity` (runtime-derived name;
`Users`/`home` paths, `<name>@host` ssh logins) and `operator-identity-8dot3` (shape-matched,
machine-independent). The name is derived from `USERPROFILE`/`HOME` at scan time and is never
written into the file. The rule self-disables when the name is absent, under 3 characters, or a
common word — a scanner that blocks every commit gets disabled, which is worse than one that
misses this class.

**Proven, not assumed:** 5 positive controls (Windows path, WSL path, ssh login, 8.3 short form,
scratchpad key) each produced a hit; 1 negative control (a doc using only placeholders, plus
`/home/runner` CI paths and a generic `Users/`) stayed CLEAN; a real staged file carrying a
Windows path was **blocked at pre-commit**; the 58 cleaned docs pass.

### 8.3 Pre-existing bug found because it blocked this commit

`is_allowlisted()` never stripped a trailing `\r`, so **every `.secretignore` entry saved with
CRLF was silently inert — 11 of 18 real entries**, including the scanner's own two
self-reference entries. An allowlist that quietly stops allowlisting is the same failure class
as a scan that quietly stops scanning: both report success either way. Fixed with one line
(`line="${line%$'\r'}"`). Verified: the 11 entries now match, negative controls still deny, and
the newly-activated entries suppress **nothing** today (those April-remediation files no longer
contain the patterns) — so no real finding is being hidden.

**Instrument note worth keeping:** `sed` and `cat -A` both normalised the CR away and reported
the file clean. Only `od -c` on the string *as read by the loop* showed it. When a parser
disagrees with your viewer about a file, trust the parser.

### 8.4 Blast radius — read before your next commit

**31 tracked files outside AI-HANDOFF still carry the identity and will now be BLOCKED at
pre-commit if you touch them.** That is the gate working, not a malfunction. Notable:
`scripts/continuity-append.mjs` (15 occurrences), six `scripts/launchers/*.ps1`,
`scripts/hooks/drift-check-gate.mjs`, `scripts/swan-brain.mjs`, `scripts/glm-audit.mjs`,
`backend/scripts/inspect-minors-ai-exposure.mjs`, plus docs under `docs/ai-workflow/`
(11 files) and `AI-Village-Documentation/`.

To unblock one, in preference order:
1. **Fix the path** — in code this is a real portability bug: use `os.homedir()` /
   `$env:USERPROFILE` instead of a hardcoded home. This is the recommended follow-on slice.
2. **Rewrite the doc** — `node scripts/redact-tainted-docs.mjs --scope=<path> --apply --approved-by-sean`.
3. **Allowlist** — `<path>::operator-identity` in `.secretignore`, only with a stated reason.

### 8.4b Known limitation of the 8.3 rule

`operator-identity-8dot3` requires a `Users` prefix, so a **bare** 8.3 short name sitting in
prose (`… incl. 8.3 ABCDEF~1`) is not caught. This document contained exactly that and the gate
did not flag it — found by reading, not by the scanner. Removing the prefix requirement was
rejected for now: the bare six-alphanumerics-tilde-digit shape is common enough in version and
build strings to make the rule noisy, and a noisy gate gets disabled. Treat the rule as covering
*paths*, not every mention.

### 8.5 Still open

- **B** (widen to `docs/ai-workflow`, 11 more files) — not approved; the tool takes `--scope=`.
- **D** (personal emails: yahoo ×5, protonmail ×6) — not approved; egress redactor masks them in transit.
- **E** (38 commits of history) — deliberately deferred; Rule 45 force-push class.
- **Code-path fixes** for the 13 files in §6 — recommended next slice.
- `.ai-workflow/` (193 gitignored files, Hermes-readable) — `--scope=.ai-workflow` when you want it.
