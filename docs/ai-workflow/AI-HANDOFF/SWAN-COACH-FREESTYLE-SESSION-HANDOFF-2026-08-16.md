---
title: Swan Coach Freestyle — full session handoff
date: 2026-08-16
author: Claude Opus 5 (vs-claude)
status: in-progress — NOT shippable, NOT pushed
linear: SWA-107
branch: wip/comms-notifications-2026-07-05
decision: freestyle dictation capture layer built; privacy transport unresolved
supersedes: none
---

# READ THIS FIRST — you are picking up mid-workstream

You are continuing a long session. Nothing here is on `main`. Nothing is deployed.
Everything below is committed **locally only**, deliberately, because the owner (Sean) set this
sequence and it has not completed:

> **all slices → deep hostile review until it runs dry → THEN push to Render → then a before/after summary.**

**We are at "hostile review, not yet dry."** Two review rounds each found a whole class of defect the
other missed, and the second round found *more* than the first. That is the signature of a surface
that has not converged. Do not push.

---

## 1. WHAT SEAN ASKED FOR (the actual product intent)

Sean is a working personal trainer, 26+ years, who uses SwanStudios **on a gym floor, on a phone,
with his hands busy**. In his words, restructured:

### 1.1 Swan Coach was supposed to be a JARVIS
> "It could control the UI/UX and fill out forms, put all the data in for you. All I should be able
> to do is just talk and dictate."

Coach is not a chatbot that answers. It is an operator that **acts on the UI on his behalf** —
navigates, opens the right surface, fills the fields, picks the client and date — then asks him to
confirm. His hands should never do data entry.

### 1.2 PLAUD-grade transcript intelligence
Sean uses a PLAUD recorder whose app turns messy recordings into something clean:
> "It can take broken notes and demos and put them all together and make one smooth review."

Swan Coach must do that too.

### 1.3 FREESTYLE DICTATE MODE — the actual missing feature
> "A straight freestyle dictate mode where it just allows you to just sit there and just talk to it…
> it can be a long, just gigantic wall of text — but then it's gonna take that, sort it out real nice
> and put it into a summary. And then… ask if it's okay to start applying it to the client records,
> log the workout with the client, etc."

```
FREESTYLE TALK (unbounded, no schema, rambling, self-correcting)
      ↓ CLEAN-UP + CONSOLIDATION (dedupe, order, merge, resolve contradictions)
      ↓ STRUCTURED SUMMARY presented for review/edit
      ↓ EXPLICIT CONFIRMATION ("is it okay to apply this?")
      ↓ APPLY → client records, workout logs, plan edits, notes
```

One session may contain facts about **several clients, several days, several record types**.

### 1.4 Sean's standing mandates
- **Least clicks, least time.** Score every design decision against tap-count.
- Charts/records come from **real logged data**, never mock.
- **Zero PII to LLMs** — IDs and roles only.
- Never "yoga"/"meditation" → say "stretching"/"flexibility".
- Never say "AI" in user-facing copy → it is **Swan Coach**.

---

## 2. RATIFIED DECISIONS (Sean answered these — do NOT relitigate)

| Decision | Ruling | Rationale |
|---|---|---|
| **Contradictions** ("3 sets… actually 4") | **Latest-wins + collapsible trace.** Keep the later value, attach `heard 3, then 4 — kept 4`, collapsed by default, one tap to revert. Earlier value retained until session resolves. Never silently discard. | Silent resolution is cleaner but unauditable — if Coach mishears the correction there is no way to see it |
| **Future-dated items** | **Always route to `plan_edit`, NEVER a workout log.** Not permitted even behind a flag. Copy: "added to plan". | A pre-filled log for a session that never happened is a false record that corrupts progress charts |
| **Duplicate dates** | **Merge/append proposal**, not a failure | Trainers backfill, double-session, and correct |
| **Unplaceable fragments** | **Clarification item**, never dropped | Silent drops are unrecoverable trust damage |

Fable 5 independently CONFIRMED all four on the merits.

---

## 3. VERIFIED GROUND TRUTH ABOUT THE CODEBASE

Sourced from `origin/main`. **Do not contradict without re-verifying.**

### 3.1 Swan Coach is already large
`frontend/src/components/DashBoard/Pages/coach-assistant/` — **210 files**. The proposal→confirm→
execution-receipt spine already exists (`CoachActionProposalCard`, `CoachProposalGateRail`,
`CoachExecutionResultCard`, `CoachWorkoutLoggerReviewCard`, `CoachIntakeWorkspace` + ~18 `CoachIntake*`).

### 3.2 The intake contract is the structural blocker
`hooks/useTranscriptIntake.types.ts`:
```ts
uploadTranscript: (file: File, clientId: number) => Promise<UploadOutcome>;
applyParsedWorkout: (review: TranscriptReviewData) => Promise<ApplyOutcome>;
// TranscriptReviewData: { transcript, parsedWorkout, fileName/Size/MimeType,
//                         clientId: number,  targetWorkoutDate?: string }
// UploadFailure.kind: 'validation'|'rate_limit'|'network'|'server'|'unknown'
//                     |'duplicate_date'|'future_date'
```
**One file, one client bound at upload, one date.** Freestyle needs live stream / N clients / N dates /
N record types. **Binding amendment A9: freestyle runs BESIDE this contract, never through it.** The
existing PLAUD upload contract tests must pass unchanged.

### 3.3 The Jarvis spine EXISTS and is deliberately fenced
`FRONTEND_DISPATCH` is a real migrated proposal type:
- `backend/migrations/20260506120000-create-coach-intake-items.cjs`
- `backend/routes/aiCommandRoutes.mjs:278`
- `backend/services/ai/coachActionProposalClassifier.mjs:49,249,273`
- `backend/services/ai/coachActionProposalService.mjs:35,58,173`
- `backend/services/ai/coachActionProposalPromptContract.mjs:48` — **verbatim: "frontend_dispatch
  payload: use only for draft UI changes, never as a final write path."**

Proposal types: `client_onboarding | workout_log | nutrition_log | client_data_update |
client_profile_coverage_update | frontend_dispatch | clarification | split_plan | plan_edit`

**KEEP THE FENCE.** GLM and Fable both concurred. What was missing is *visibility* — Coach filling a
form in front of Sean with field provenance — not permission.

### 3.4 PLAUD clip-merge already exists
`frontend/src/components/PlaudClipMerge/` — `PlaudClientResolver`, `PlaudDateSplitCandidatePanel`,
`PlaudMergeReview`, `PlaudMergeBoundaryBanner`, etc. **`PlaudClientResolver` and
`PlaudDateSplitCandidatePanel` solve exactly the client/date ambiguity freestyle has** — generalise
them, do not rewrite.

### 3.5 `useVoiceRecorder` has NO `useEffect` at all
Verified by grep. It never releases the MediaStream. This is why `useCoachCapture` exists.

### 3.6 Voice implementations are fragmented
`useVoiceRecorder` + `useGeminiTranscription` (one pipeline), `useCoachBrowserSpeechInput`,
`PlannerVoiceContext`, `BootcampVoiceProposalTray`, `FoodTracker/useNutritionDictation`.
**They are NOT three redundant copies** — RECORD and LIVE are two strategies with different strengths.

---

## 4. WHAT WAS BUILT (7 local commits, none pushed)

| Commit | Slice | State |
|---|---|---|
| `7c8a54186` | S0 blueprint reconcile + S9 chat accessibility/palette | **complete** |
| `7621d4ce5` | S1 `useCoachCapture` — RECORD lifecycle policy | complete |
| `6dba56bf6` | S1b adoption into `VoiceRecordingOverlay` | complete — hot mic closed |
| `75fd6b8a2` | S2 `useFreestyleSession` state machine | complete, write-free |
| `08c5dfd76` | S2b `CoachFreestyleOverlay` + Fable F-1/F-4/F-5/F-6 | complete |
| `134e693e6` | S2c on-device speech; F-2, F-3 | complete |
| `9913d30ac` | S2d GLM security round + privacy retraction | **8 findings still open** |

### 4.1 S9 — chat surface (`Social/Messaging/MessagingStyles.ts`, `MessageThread.tsx`)
All source-verified defects, all fixed:
- own-message bubble was `#8B5CF6` under Frost White = **3.5:1, failing** → 72/28 mix = **5.65:1**
- **zero** `prefers-reduced-motion` guards across 5 keyframes → shared `motionSafe` helper
- `min-height: 520px` beat `calc(100dvh - 210px)` at 375×667, pushing the composer below the fold
- composer was 13px → iOS force-zoom → raised to 16px
- off-palette `#4ECDC4` / `#4A5568` / `#D4A574` → palette tokens
- `SendButton` glowed purple-on-purple → cyan (Dual-Button Glow law)
- unread badge 10px on a surface token → 12px, **9.68:1**
- `ErrorBanner` was a clickable `div` with `role="alert"` and no keyboard path → real 44px button

**A regression I introduced and GLM caught:** my first pass swapped an off-palette tan that *passed*
contrast (7.7:1) for a red that *failed* (3.24–3.71:1 at 11px). Text now uses `--danger-soft-text
#FF8FA3` (7.98–9.13:1); the saturated `--danger-text #C92A54` is reserved for non-text marks.

⚠️ **`--danger-text` has FIVE conflicting fallbacks repo-wide** (`#C92A54`, `#F0938A`, `#f87171`,
`#fca5a5`, `#fff1f2`). Real token drift. Not fixed. Worth a Linear issue.

### 4.2 Files created
```
frontend/src/components/DashBoard/Pages/coach-assistant/
  hooks/useCoachCapture.ts                       RECORD pipeline + lifecycle policy
  hooks/useCoachCapture.lifecycle.test.ts
  hooks/useFreestyleSession.ts                   session state machine (WRITE-FREE)
  hooks/useFreestyleSession.test.ts
  hooks/useFreestyleSpeech.ts                    on-device continuous speech + restart
  CoachFreestyleOverlay.tsx                      listening surface
  CoachFreestyleOverlay.styles.ts
  CoachFreestyleOverlay.hearing.test.tsx
docs/ai-workflow/coach-brain/10-freestyle-intake.md          (review_status: draft)
docs/ai-workflow/AI-HANDOFF/SWAN-COACH-FREESTYLE-RETENTION-CONTRACT-2026-08-16.md (draft)
```

**`useFreestyleSession` is WRITE-FREE by construction** and a test asserts the surface exposes no
write-shaped method. Preserve that — consolidation is S4, apply is S7.

---

## 5. 🚨 THE UNRESOLVED OWNER DECISION — AUDIO PRIVACY

**This is the most important open item. Sean has not decided it.**

Fable found: `transcribe()` uploads recorded **audio** to a server-side model, and that audio has
Sean saying real client names aloud. **Every text-tokenisation design in this repo protects the
transcript and does nothing for the audio.**

I then switched freestyle to the Web Speech API and **wrongly reported the hole closed**. GLM
dismantled that:
1. **Wrong invariant.** "SwanStudios never transmits the audio" is a claim about *our hands*. The
   constraint is "zero PII to models". Chrome's Web Speech streams audio to a **Google cloud
   recogniser**; we invoke it, so PII reaches a model with us as the invoking party.
2. The error copy said **"Use Chrome or Safari"** — recommending the leaking browser.
3. The UI promised "nothing is saved yet" while audio could stream off-device.
4. "No audio blob is created" is a strawman — the threat was always *transmission*.
5. **Zero engineering**: no capability detection, no gate, no fallback. The posture was a comment block.

**Corrected in code** (`9913d30ac`): docblock retracted and rewritten, copy no longer recommends
Chrome, retention copy now says "no record is created until you review it".

**Current honest status: freestyle capture is a TRANSPORT improvement, NOT a privacy guarantee.**

**Options for Sean:**
- **(a) Gate** — capability-detect and refuse cloud-backed recognisers (Safari/WebKit on-device only)
- **(b) On-device model** — WASM/ONNX recogniser bundled with the app
- **(c) Accept-and-document** — explicit signed-off acceptance in the retention contract

**This decision may change what S4 even looks like. Get it answered before building S4.**

---

## 6. OPEN FINDINGS — NOT FIXED

All from GLM-5.3's final review (`docs/ai-workflow/AI-HANDOFF/GLM-FREESTYLE-FINAL-REVIEW-2026-08-16.md`).

### Security
| # | Finding |
|---|---|
| **S2** | `onStopped` snapshot has **no owner and no expiry**. `clearBuffer` purges the hook's array only; the parent's frozen copy survives discard/logout/switch/TTL/unmount. Shared tablet: trainer A taps Done, account switches to B, parent still holds A's fragments. The F-3 "fix" changed immutability, not retention — now two arrays instead of one. **Fix: owner token + expiry on the same purge bus, or persist via S3 and drop the in-memory reference.** |
| **S7** | `role="dialog" aria-modal="true"` with **no focus trap**, no initial focus, no restore. |

### Reliability
| # | Finding |
|---|---|
| **R1** | `rec.onend` clears the pending interim **before** restarting. Safari finalises trailing interims late or never → cumulative word loss across a 10-minute session. **Fix: flush the last non-empty interim through `onPhraseRef` before restart.** |
| **R2** | No backoff. `onerror` ignores everything but `not-allowed`; `onend` restarts immediately → hot start/abort loop in a dead zone (and Chrome's recogniser **needs network**, so the "on-device" path dies exactly when connectivity does). |
| **R3** | `startEngine`'s `catch { setListening(true) }` treats a throw as already-live. UI says "Listening. Talk as long as you need" over a dead engine. |
| **R4** | Auto-start calls `start()` **outside user activation**; iOS Safari requires a gesture. R3 then masks the failure. |
| **R5** | Permission denial never reaches session state: `session.state` stays `'listening'`, the clock climbs, `isQuiet` announces "Still listening. Nothing heard for 47s" — a lie appended to the denial copy. Also `FREESTYLE_SPEECH_DENIED_COPY` says "type your notes instead" and **there is no typing path**. Related: `setError` in `useFreestyleSession` is never called; `'error'` and `'discarded'` are unreachable; the A3 "no gaps in the copy table" claim is currently **false**. |
| **R7** | The TTL sweep *is* a timer (`setInterval` 1s) — throttled/suspended in background tabs. Effective retention can exceed the 24h ceiling. **Fix: re-check on `visibilitychange`/focus.** |

---

## 7. THE S4 BLUEPRINT IS READY TO BUILD

`docs/ai-workflow/AI-HANDOFF/GLM-S4-CONSOLIDATION-DESIGN-2026-08-16.md` — **725 lines**, sections A–H:
algorithm (stage-by-stage, deterministic-vs-model justified), full TypeScript data contract, the PII
tokenisation boundary, prompt contract, failure modes, test plan with fixtures, build order.

Highlights worth preserving:
- **Fail-closed** stance; every tie breaks toward masking
- Four-tier tokeniser in `shared/freestyle/tokeniserCore.mjs`, **imported by frontend AND backend**
- **Server-side verify mode** re-runs the same tokeniser; a client miss → `422
  FREESTYLE_TOKENISATION_MISS` with fragment id only, **before** the model call
- **No prose passthrough** — the model's output has no free-text field reaching the user
- **Model payload allowlist** — `{ utterances:[{id,text}], timezone, startedAtIso }` only
- 23-row adversarial catalogue; the one honest residual hole (lowercase unrostered name) is named,
  with a `CASING_SIGNAL_ABSENT` guard converting it into a degraded-mode downgrade
- `FREESTYLE_MODEL_ENABLED` per-account kill flag → deterministic pipeline with a hard guarantee

⚠️ **GLM designed an elaborate TEXT boundary and did not notice the AUDIO hole.** §5 above may
invalidate parts of this design. Re-read it against Sean's audio decision.

---

## 8. HOW TO VERIFY (exact commands that work in this repo)

```bash
# tsc — bare `npx tsc --noEmit` OOMs on this repo. Always raise the heap:
cd frontend && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit
# → currently exit 0, 0 errors REPO-WIDE (baseline-clean)

cd frontend && npm run build                      # → exit 0
cd frontend && npx vitest run src/components/DashBoard/Pages/coach-assistant --reporter dot
# → 723/725. The 2 failures are PRE-EXISTING (CoachCommandCenterPage content
#   assertions on a stale branch) — PROVEN not ours by reproducing with our files deleted.

bash scripts/scan-secrets.sh <files>              # pre-commit hook runs this too
node scripts/lane.mjs claim --task "..." --files "a,b"   # Rule 67, before editing
node scripts/lane.mjs release
```

**Never chain a required safety check behind a `grep` whose success is "no matches"** — grep exits 1
on zero matches and kills the rest of the command. That silently skipped a secret scan once.

**Consult scripts** (all via OpenRouter except GLM):
```bash
# GLM uses ZAI_API_KEY (already in shell env)
node scripts/consult-glm.mjs --document <in> --out <out> --model glm-5.3 --max-tokens 32000 --remit "..."

# Others need the key exported WITHOUT echoing it (Rule 59):
export OPENROUTER_API_KEY=$(grep '^OPENROUTER_API_KEY=' .env | head -1 | cut -d= -f2- | tr -d '\r"')
node scripts/consult-kimi.mjs      --document <in> --out <out> --confirm-spend   # has spend gate
node scripts/consult-hy3-design.mjs --document <in> --out <out> --confirm-spend  # has spend gate
node scripts/consult-fable.mjs     --document <in> --out <out>   # NO spend gate — calls immediately
node scripts/consult-sol.mjs       --document <in> --out <out>   # NO spend gate
```
⚠️ **Run consults in BACKGROUND.** A foreground timeout killed a Fable call mid-flight (wasted spend).
Costs observed: Kimi $0.21, HY3 $0.006.

---

## 9. ⚠️ BRANCH / DELIVERY PROBLEM — UNRESOLVED, BLOCKS THE PUSH STEP

- Branch: `wip/comms-notifications-2026-07-05`
- **~1948 commits BEHIND `origin/main`**, ~140 ahead
- **Pushing this branch does NOT reach production.** The work needs rebasing or cherry-picking onto main.

Verified mitigations already applied: all edited files were confirmed **content-identical** to
`origin/main` (the apparent diffs were CRLF-only), so the work is valid — but **delivery is unsolved**
and Sean has not answered. **Raise this before attempting any push.**

Also: `origin/main` moved `610295fb4aeb → e89ee80d72f6` (**323 files**) during the session, including
**`WorkoutLoggerCoachTerminal.tsx`** — a Coach terminal inside the workout logger that appears in no
blueprint. The logger↔Coach boundary is more built than any doc assumes.

---

## 10. PARALLEL AGENT / LANE PROTOCOL (Rule 67)

Another agent (Codex, and other Claude sessions) works this **same tree**. Observed this session:
another agent committed `5a670b1ff`, `aae58d4d8` between my commits, and held lane locks on
`docs/ai-workflow/hermes-learning-packets` + hermes scripts.

- **Always** `node scripts/lane.mjs claim` before editing; `release` after.
- **Never `git add -A`** — stage explicit paths only. The tree has ~20 other-lane uncommitted files.
- `.git/index.lock` went stale twice (0 bytes, no live git process). Verify **all three** before
  removing: age, zero size, `tasklist | grep git` empty.

---

## 11. THE MISTAKE PATTERNS — READ THESE, THEY RECURRED

These are the highest-value lessons. Each recurred **after** being written down.

| Pattern | Times | What actually stopped it |
|---|---|---|
| **Trusting a harness that cannot observe the thing** | 4 | Mutation testing only. Writing the lesson down did not work — it recurred three times after being documented |
| **Declaring a defect closed when only one instance/aspect was closed** | 3 (hot mic ×2, audio PII ×1) | Only an independent reviewer with **different priors**. Never my own rounds |
| **Shipping a mechanism with no consumer and calling it a slice** | 3 | Grepping for consumers of my own new module as a distinct review round |
| **Asserting a security property in a comment and treating it as engineered** | 1 | A reviewer asking "where is the code that enforces this?" |

**Operating rules that came out of it — apply these:**
1. **Run new tests against the PRE-FIX code.** Not mutation of the fix — *reversion to the original*.
   If they still pass, they measure nothing. This caught a false-passing test and proved a real one.
2. **Before believing a green mutation result, state what interleaving the harness can produce.**
   `act()` flushes effects synchronously; real native listeners do not. Several guards are
   consequently **unprovable in jsdom** and are labelled `NOT COVERED BY TESTS` in-code. Preserve
   those labels.
3. **A docblock asserting a security property must name the enforcing code, or say nothing does.**
4. **The reviewer who disagrees with your framing is worth more than the one who finds more
   line-level bugs.** Fable found the audio hole by questioning the premise; GLM found the
   perpetual-listen loop by tracing state transitions. Neither found the other's.

---

## 12. WHAT SEAN WANTS NEXT (his exact sequence)

1. **GLM-5.3 AND Codex hostile review on everything** ← *immediate next action*
2. Repeat until it **runs dry** (two consecutive rounds finding nothing)
3. **Then** push to Render
4. **Then** a before/after summary so he can see what changed

He also asked to be reminded of things he owes. **Outstanding owner decisions:**
- 🚨 **The audio privacy decision** (§5) — blocks S4
- Ratify the freestyle retention contract (currently `implementation_authorized: false`)
- Approve `coach-brain/10-freestyle-intake.md` (currently `review_status: draft`, non-ingestible)
- **Is "Marcus" a real client name?** It appears as sample data throughout
  `GLM-COACH-JARVIS-REVIEW-2026-08-15.md`. If real, scrub before that file is pushed (Rule 8)
- The branch/delivery decision (§9)

**Remaining slices:** S3 encrypted store · S4 consolidation (blueprint ready) · S6 resolver
extraction · S7 batch apply · S10 cleanup. Plus the 8 open findings in §6.

---

## 13. KEY ARTEFACTS

| Path | What |
|---|---|
| `GLM-COACH-JARVIS-REVIEW-2026-08-15.md` | 624 lines: hostile review, 4 Mermaid diagrams, 4 wireframe sets (375px + ≥1280px), blueprint diffs, 11-slice build order ⚠️ contains "Marcus J." sample data |
| `GLM-COACH-DESIGN-REVIEW-2026-08-15.md` | 261 lines: line-cited beautification critique, P1–P5 |
| `GLM-S4-CONSOLIDATION-DESIGN-2026-08-16.md` | **725 lines: the S4 blueprint** |
| `GLM-FREESTYLE-FINAL-REVIEW-2026-08-16.md` | The 16 findings; 8 still open |
| `PANEL-FABLE-SWAN-COACH-2026-08-16.md` | SEND-BACK verdict + the audio-PII finding |
| `PANEL-KIMI/HY3/SOL-SWAN-COACH-2026-08-16.md` | Captured, **not yet fully triaged** |
| `SWAN-COACH-V3-UX-WIREFRAMES-2026-08-12.md` | Amended: freestyle IA, Jarvis fill, 9 copy rows, re-pin |
| `SWAN-COACH-V3-ADJUDICATION-AND-AMENDMENTS-2026-08-12.md` | Amended: binding **A9** |
| `.ai-workflow/hermes-inbox/pending/2026081*` | 5 memos with the full mistake ledger |

**Kimi, HY3 and Sol outputs were never fully triaged.** Read them — they are paid and unused.
