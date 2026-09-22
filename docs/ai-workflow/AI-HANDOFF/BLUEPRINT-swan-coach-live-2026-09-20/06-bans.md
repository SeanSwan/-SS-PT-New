---
decision: "Explicit do-NOT list for a builder with zero prior context; the feature-specific bans encode defects already paid for."
status: open
supersedes: none
---

# 06 — Bans

A builder with no memory of this project will fill silence with its own judgment. This is the
silence, filled.

## 1. House rules (non-negotiable)

- **No Material-UI.** styled-components only, with CSS custom properties.
- **Max 300 lines per file**, counted by `wc -l`. Extract before adding.
- **No hardcoded colours.** `var(--token, #fallback)` only.
- **44 px minimum** interactive targets.
- **Dark-first**; WCAG **4.5:1** minimum contrast.
- **Victory only** for charts. No Recharts in new work.
- **No "yoga" / "meditation" wording** — use "stretching" / "flexibility".
- **Zero PII to LLMs.** Client IDs only. See §3 — this is stronger than it sounds.
- Shared style fragments containing `${}` interpolation use the `` css`` `` helper, never a plain
  template string (a plain string stringifies a `keyframes` object and crashes at mount).
- Commit style `type(scope): description`. **No `git add -A`** — stage explicit paths.
- FK constraints reference `"Users"` (PascalCase), never `users`.

## 2. Process bans

- **Do NOT proceed past a STOP line** in `05-slices.md` without a checkpoint verdict.
- **Do NOT claim a criterion passed without pasting its output.** Unrun = `NOT RUN`, never `PASS`.
- **Do NOT modify a test to make a refactor pass.** In S0 the unchanged suite *is* the evidence.
- **Do NOT add keys to a `vi.mock` factory** while "just moving code".
- **Do NOT use PowerShell `Measure-Object -Line`** to check file length — it drops blank lines and
  reports a 605-line file as 563 `[SUPPLIED]`. Use `wc -l`.
- **Do NOT report a piped command's exit code as the program's.** `cmd | tail` yields *tail's*
  status. Capture the exit code on its own line before piping. *(This package's own architect made
  exactly this error and reported a failed model call as `exit 0`.)*
- **Do NOT treat repository absence as production absence** (round-2 **R2-06**). "I grepped and
  found nothing" bounds the repo, not the deployment.

## 3. Privacy bans

- **Do NOT assume client IDs sanitise dictated free text.** Dictation is spoken prose full of
  names; IDs sanitise *structured* fields and nothing else.
- **Do NOT rely on the existing PHI regex as proof of coverage.** `[SUPPLIED]` round-2 **R2-02**:
  it enumerates only the **first** match per pattern, and it does **not detect names at all** —
  `"log a workout for Jordan T., knee felt bad"` returns `hasPHI: false`.
- **Do NOT send any new field to a provider** without adding it to `OUTBOUND_ALLOWLIST` in
  `03b-privacy-boundary.md` §2 and adding its own canary test.
- **Do NOT treat a successful detector invocation as the release predicate** (round-3 **R3-03**). A
  clean scan is **P3 alone** (`03c-release-predicate.md` §6); the detector provably does not see names
  (`"log a workout for Jordan T., knee felt bad"` → `hasPHI: false`), so a clean scan licenses nothing
  by itself. The predicate is the conjunction.
- **Do NOT let a generic `catch` absorb a privacy rejection** (round-3 **D-B**). It must remain a typed,
  non-retriable error. `classifyIntent`'s `catch` (`intentClassifier.mjs:170`) otherwise converts a
  rejection into a chat fallback (`:187`), making `503 PRIVACY_UNAVAILABLE` unreachable on the
  classification dispatch and `09-tests.md` T-04.7 unpassable there.
- **Do NOT scan a field in isolation and call the request safe.** Scan the **final serialized body**.
- **Do NOT fail open.** If privacy cannot be established, do not send.
- **Do NOT put raw transcript text in a receipt, a log line, or telemetry.**
- **Do NOT describe the Web Speech API path as private.** On Chrome it is cloud-backed
  `[SUPPLIED]`; that is an open owner decision (PART C D-1), not a solved problem.

## 4. Approval bans

- **Do NOT treat `MESSAGE_SEND` as approval to write.** They are separate operations.
- **Do NOT let a streamed delta execute anything.** Deltas are display text.
- **Do NOT validate a grant outside the mutating transaction.** Check-then-act is not replay
  protection under concurrency.
- **Do NOT trust a client-supplied `payloadHash` or `recordVersion`.** Recompute server-side.
- **Do NOT allow a grant to survive a target or payload change.**
- **Do NOT make grant TTL client-configurable** (round-2 **R2-07** flagged an unpinned expiry).

## 5. Feature-specific bans (freestyle)

- **Do NOT render the overlay conditionally.** `{open ? <Overlay/> : null}` unmounts
  `useFreestyleSession`, which purges the buffer on unmount — destroying the dictation on every
  dismissal. It is always mounted; `isOpen` toggles visibility only `[SUPPLIED]`.
- **Do NOT auto-send a dictated draft.** M1 ends at the composer. Sending is the coach's action.
- **Do NOT summarise, classify, or call a model on dictated text in M1.** That is M2, and M2 is
  blocked.
- **Do NOT wire the `consolidating` or `summary` states.** They are declared and unreachable.
- **Do NOT read composer text from a creating closure** — and equally, **do NOT treat a
  render-refreshed ref as atomic**. Use the functional updater (`03-contracts.md` §2).
- **Do NOT purge the buffer on a recoverable recogniser error.** Offer retry; keep the words.
- **Do NOT bind Esc to Discard.** Esc pauses.
- **Do NOT allow two active captures.** One owner, compare-and-set, explicit refusal.
- **Do NOT use press-and-hold, long-press, or any hidden gesture** as the dictation affordance.
- **Do NOT silently swallow a rejected handoff.** Show `02-wireframes.md` §11 — a silent purge is
  indistinguishable from silent data loss.
- **Do NOT claim `requestAnimationFrame` raises a mobile keyboard.** Unproven (`01` §7).
- **Do NOT create a new route file** for anything in this package. M1 adds no routes.
- **Do NOT touch `backend/`** in M1. It is a frontend-only milestone.

## 6. Scope bans

- **Do NOT fix the two known-failing intake tests** as part of this package. They are pre-existing,
  they belong to the intake surface, and their disposition is recorded in `09-tests.md` §6.
  Silently fixing them destroys the baseline that proves S0 changed nothing.
- **Do NOT retire `SwanCoachAssistantPage.tsx` or edit the ~15 stale `PARENT:` comments here.**
  Real, separately tracked, out of scope.
- **Do NOT chase `SC-CR-001` or a "September 13 conversation-runtime packet".** Both verified
  absent (`00-README.md` §5).
- **Do NOT `git add -A` in the shared worktree.** Another agent has uncommitted work in
  `CoachConsoleDock.tsx` `[SUPPLIED]`; stage explicit paths and read the Rule 67 lane files first.
