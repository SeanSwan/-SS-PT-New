# Swan Coach Hive-Mind — C5 BUILD HANDOFF

**For:** an executing AI (ChatGPT or equivalent) with **zero prior context**
**From:** Claude Opus 5, who built C0–C4 and authored the C5 design
**Date:** 2026-07-25 · **Repo state:** `origin/main @ 91cb271eb`

---

## ⚠️ READ THIS FIRST — YOUR ROLE

You are the **builder**, not the architect. The design decisions in this document were made deliberately, against a codebase that has repeatedly punished assumption. **Execute them; do not re-derive them.**

Specifically:
- **Do NOT redesign the UI.** Section 6 tells you exactly what to build and why each choice was made. If you think a choice is wrong, say so to Sean — do not silently substitute your own.
- **Do NOT "improve" adjacent code.** Every changed line must trace to this document.
- **Do NOT assume anything in this repo is missing until you have grepped for it.** See §2 — that mistake has been made 8 times in this program.
- **Do NOT claim completion without proof.** See §8 — this repo has a hard rule about it.

If this document does not answer a question, **ask Sean**. Do not guess. Guessing is what this document exists to prevent.

---

## 1. What the system is

Swan Coach is the **hive mind / Jarvis** for a personal-training SaaS. A trainer drives it **by voice, hands busy, on a gym floor, with a client in front of them.** Dictation is the primary input; tapping is the fallback, not the reverse.

Four surfaces are the *hands*; Coach is the *nervous system*: **one command lane, one truthful memory, many effectors.**

The program was split into slices C0–C6. **C0–C4 are built and live on `main`.** Only **C5** remains.

---

## 2. The law of this codebase — learn this before you write anything

**Eight times in this program, something the plan said needed building already existed.**

| # | Plan said | Reality |
|---|---|---|
| 1 | Coach backend missing, must be located | `backend/services/ai/` — 165 files, 19 registries, 49 dispatchers, **134 commands** |
| 2 | Build an eval harness | `backend/eval/` existed, CI-wired (`npm run eval`) |
| 3 | Build eval golden scenarios | Existed, correct, **never imported** for 8 days |
| 4 | Build an event bus | `frontend/src/utils/aiWorkoutEvents.ts` — 4 event families, acknowledge contract |
| 5 | Build a typed-intent schema | `ClassifiedIntentSchema` existed, **with a confidence field** |
| 6 | Coach is intake-blind | It reads **21 client data sources** including pain, movement screen, questionnaire |
| 7 | Build an offline queue | `useOfflineQueue.ts` existed and was wired |
| 8 | (C5) Build the intent+voice bar | `ClientTrainingCommandBar.tsx` already pairs intent + dictation |

**And the inverse also happened:** the plan cited `resolveAudienceFromPath` as *shipped*. It is **not on main** — see §5.

### Your operating rules from this
1. **Before building any component, `grep` for it.** Assume it exists until proven otherwise.
2. **Grep against `origin/main`, not your local tree.** A sibling worktree makes unmerged work look landed. Use `git grep <symbol> origin/main`.
3. **"Does this exist?" is a per-component question, not yes/no.** For C5: the *overlay* is genuinely net-new; the *intent+voice pairing* is not.

---

## 3. What is already built and live (C0–C4) — build ON these, do not rebuild

All verified present on `origin/main @ 91cb271eb`.

### The safety layer (C0.5)
`backend/services/ai/dispatchers/clientScope.mjs` → `resolveCommandClientId(params, ctx)`

Dispatchers receive **two competing client identities**: `params.clientId` (what the speech classifier extracted) and `ctx.resolvedClient.id` (the client the trainer actually selected). **The selected client must always win.** Four dispatchers were writing to the wrong client — one on a *destructive* path (`dispatchCancelSession`, which chose *which session to cancel*). Fixed and shipped.

Enforced by `backend/tests/unit/dispatcherClientScopeInvariant.test.mjs` — an executable law with an **empty allowlist** matching both `params.clientId` and `const { clientId } = params`.

> **You must not break this.** Any new code that resolves a client id goes through `resolveCommandClientId`. The test will fail you otherwise.

### The truthful memory (C2)
| File | Role |
|---|---|
| `frontend/src/utils/coachEventLog.ts` | Append-only bounded intent log. Terminal outcomes are **immutable**. |
| `frontend/src/utils/coachMemoryProjection.ts` | The projection. `believed` / `pending` / `failed` / `unattributed`. |
| `frontend/src/utils/coachIntentRecorder.ts` | Ambient seam binding. Fail-open by design. |
| `frontend/src/utils/aiWorkoutEvents.ts` | The bus (+9 lines: records at the single dispatch seam) |

**The law:** memory is a **projection over the log, never a transcript.** Only `applied` may be stated as fact. `pending` is stated as intent. `failed` must be surfaced. `noop`/`superseded` are in *neither* bucket.

Outcomes: `applied` · `noop` · `unhandled` · `failed` · `superseded` · `awaiting-confirm`.

**Key subtlety:** the dispatch seam distinguishes *"nobody was listening"* (`unhandled`) from *"an effector looked and declined"* (`noop`). They were one boolean before; they are different facts.

**Client scoping is a safety boundary:** an intent with a `null` clientId is **never** folded into a client's memory — it surfaces in `unattributed`. Do not "fix" this by defaulting it to the current client.

### The confirmation contract (C3) — ⚠️ DORMANT ON PURPOSE
`backend/services/ai/voiceConfirmationTier.mjs` → `resolveVoiceConfirmationTier(command, params, ctx)`

Three tiers, **derived** from fields `CommandDefinition` already has:

| Tier | Trigger | Behavior |
|---|---|---|
| `fire_and_forget` | plain, reversible | **No speech.** Earcon + haptic. Undo by voice. |
| `read_back` | parsed **numbers**, clinical text | One-line spoken read-back with a **slot-level** correction |
| `deliberate` | destructive · confirmation-gated · trainer-only reached by a client · **cross-client** · client-scoped with no client resolved | Explicit spoken yes |

**Invariant: tiers only ESCALATE.** Numeric read-back is evaluated *after* the deliberate triggers so a destructive command can never be softened into a silent one.

**It has ZERO consumers, deliberately** — wiring it before a voice surface exists would gate commands behind a confirmation nothing can collect. **C5 is its intended consumer** (Linear SWA-67).

### The intent eval (C4)
`backend/eval/intentResolutionScenarios.mjs` — 9 scenarios in the existing harness (suite 53 → 62). Runs **offline, deterministically** against `deterministicCoachIntakeIntent.mjs` (zero imports, pure regex — no model call).

If you change intent resolution, these must still pass. Especially: an utterance naming nobody must yield `clientRef: null` — **never a guess**.

### The informed context (C1)
`backend/services/ai/intakeCoverage.mjs` — tells Coach what it does **not** know. Coach could not distinguish *"screened, no compensations"* from *"never screened"* and answered with identical confidence either way. Now absence is named explicitly.

---

## 4. What C5 is

**"The one intent bar"** — role-aware `Cmd+K` **and** the voice lane as a *single object*: intent → capability → client → destination.

**Five command surfaces exist today and must converge on it:**
`CoachCommandCenterPage.tsx` · `ClientTrainingCommandBar.tsx` · `SwanCoachActionLauncher.tsx` · `LogFoodCommandCenter.tsx` · `CoachInputBar.tsx`

**Start from `ClientTrainingCommandBar.tsx`** (296 ln) — it already pairs `useCoachCommand` (`:74`) with `useCoachBrowserSpeechInput` (`:173`), placeholder *"Dictate sets, reps, load, pain, notes…"*. **Generalize it. Do not start from scratch.**

---

## 5. 🔴 BLOCKER — resolve before writing code

**`resolveAudienceFromPath` is NOT on `main`.** Verified twice:
- `git grep resolveAudienceFromPath origin/main` → **0 hits**
- `git branch -r --contains cc01296db` → **empty** (unmerged to any remote)

It exists in **3 unpushed commits** on `feat/admin-trainer-normalization`. The plan says C5 must route audience-correct destinations through it. **Building against it will not compile.**

**Sean picks one:**
- **(a)** Land SWA-64 first, then consume it as designed — *recommended; finished work sitting unmerged*
- **(b)** Ship C5 with explicit role props; wire audience routing when SWA-64 merges
- **(c)** Duplicate the resolver — **do not**; that is the drift this program removes

**Do not proceed past this without Sean's answer.**

---

## 6. THE DESIGN — build exactly this

Three directions were designed. Full contract: `docs/ai-workflow/AI-HANDOFF/COACH-HIVE-MIND-C5-DESIGN-CONTRACT-2026-07-25.md`.

### ✅ Recommended: **"The Lane"** + the client chip from "The Lock"

**Pending Sean's confirmation — if he picked a different direction, build that one instead.**

#### The shape
**Not an overlay.** A persistent **56px docked bar** at the bottom of every Coach surface, always visible, always showing the locked client and a mic.

- `Cmd+K` **focuses** the bar — it does **not** open a modal
- Typing or speaking expands it upward into a **5-row** result list
- It collapses on execute
- Collapsed state carries one live token: the pending/unsynced count from the C2 log ("2 not yet synced")
- Long-press the mic → three suggested commands as inline chips

#### Why this shape (do not substitute an overlay)
The definition of done is **a voice-originated set log landing in ≤2 seconds, screen-off, offline-capable.** An overlay you must summon is a **mode-switch**, and a mode-switch fights that goal. A docked bar is already open — keyboard and voice reach the same object with no mode change, and on a phone the trainer's thumb is already on it.

It is also the shortest path from the bar that already exists.

#### The client chip (fused from Direction 1 — NOT optional)
At the **left edge of the bar**, inline: a chip showing the locked client.

- Default: **Midnight Sapphire `#002060`** fill, **Ice Wing `#60C0F0`** edge
- **The moment a typed or spoken command would act on a different client**, the chip flips to **Gilded Fern `#C6A84B`** with a slow 2s pulse, and the primary button's glow inverts

This is the `deliberate` tier (C3) made **visual**. It exists because a wrong-client write was live in production on a destructive command. **This is the single most important element on the surface. Do not remove it to save space.**

Borrowed from Linear's context chip — the palette declares *what it acts on* before you type. Every reference palette examined was keyboard-only; **voice as a co-equal input is Swan's invention, not a borrowed pattern.**

#### Structure
| Phase | Content |
|---|---|
| Orientation | The bar itself + client chip. Nothing to summon. |
| Current state | 5-row grouped results: *Log* / *Review* / *Plan* / *Go to* |
| Progress-insight | Trailing state hint per row from the C2 projection ("3 sets logged today", "no movement screen on file") |
| Next-best-action | Top group is `Suggested`, from intake-coverage gaps + today's session |

Patterns: **C12** glass dock · **C5** compact shelf rows · inline status token · chip row.
Motion: **tier-3 reduced baseline** — height transition only, fully functional under `prefers-reduced-motion`.
Assets: **none.** No Seedance run needed.

#### Row anatomy (from the reference sweep)
- Two-line rows: **label + description** (StackAI)
- Trailing glyph distinguishing *navigate* (`↗`) from *execute* (Juicebox)
- Left accent bar on the active row (Juicebox)
- Footer legend with a **live result count** (Vapi); footer actions change with selection (StackAI)
- Single-letter shortcut chips, right-aligned (Fey)

---

## 7. Hard rules — non-negotiable, from this repo's CLAUDE.md

- **Never call it "AI" user-facing.** It is **Swan Coach**.
- **styled-components only.** No MUI. No Tailwind. Victory for charts only.
- **Palette (Crystalline Swan):** Midnight Sapphire `#002060` · Royal Depth `#003080` · Ice Wing `#60C0F0` · Arctic Cyan `#50A0F0` (**data only — never buttons/glow**) · Gilded Fern `#C6A84B` · Frost White `#E0ECF4` · Swan Lavender `#4070C0` · Wing Purple `#8B5CF6` · Obsidian `#0A0A0F` · Carbon `#141419` · Graphite `#1A1A24`
- **BANNED (retired Galaxy-Swan):** `#0a0a1a` · `#00FFFF` · `#7851A9`
- **Dual-Button Glow:** blue bg → **purple** glow; purple bg → **cyan** glow
- **Tokens with fallback:** `var(--token, #fallback)` — never a bare hex
- **44px minimum touch targets** · WCAG **4.5:1** contrast · `prefers-reduced-motion` respected
- **300-line file cap.** Extract hooks/utils/styles/types before you hit it.
- **Typography:** Plus Jakarta Sans (headings/UI) · Sora (gaming-adjacent UI) · Fira Code (data) · Cormorant Garamond Italic (drama). Never Inter/Roboto/Arial.
- **Zero PII to LLMs** — client IDs only, names mapped client-side.
- **Trainer indispensability:** clients get **read + do, never decide.** Switching the active plan and editing `planData` are trainer-only.
- **Responsive matrix:** 320 · 375 · **414** · 768 · 1024 · 1280 · 1440 · 1920 · **2560** · 3840
- **Commit style:** `type(scope): description`

---

## 8. How this repo requires you to prove work

**You may not say "done," "fixed," or "working" without current-session proof in the same message.**

- Run the tests. Paste the actual output.
- If you cannot run something, **say so explicitly** — do not claim it.
- Hostile-review your own work until a round finds nothing, then run **one more confirming round**.

### The local environment constraint — read this, it will confuse you
**`backend/node_modules` and `frontend/node_modules` are EMPTY.** Neither test runner installs. This is a known pre-existing condition, not something you broke.

Three techniques recover real execution:
1. **Local `vitest` shim** — drop a minimal `describe`/`it`/`expect` module into gitignored `node_modules/vitest` so the **real committed test files run in place**. *Copying tests to a scratch directory does NOT work* — relative imports break.
2. **`node --experimental-strip-types <file>.ts`** — executes TypeScript directly, no build step.
3. **Staged specifier rewrite** — raw Node ESM needs explicit `.ts` extensions; the repo uses extensionless (Vite). Rewrite in a *staged copy*, never in shipped source.

**The line you must not cross:** stub to satisfy an **import**, never to fake a **behaviour**. A `zod` stub was tried here, seen to make real validators return garbage, and **removed**. A greener number bought with a fake validator is worse than an honest gap.

### Tests you must keep green
```
backend/tests/unit/dispatcherClientScopeInvariant.test.mjs    6   ← the wrong-client law
backend/tests/unit/intakeCoverage.test.mjs                    9
backend/tests/unit/intentResolutionEval.test.mjs             17
backend/tests/unit/voiceConfirmationTier.test.mjs            14
frontend/src/utils/coachEventLog.test.ts                     17
frontend/src/components/WorkoutLogger/offlineQueueStore.test.ts 8
frontend/src/components/WorkoutLogger/WorkoutLogger.entropy.test.ts 1
```

### Deploy verification — a real limitation
This repo **publishes no release/commit marker.** `/health` returns only `{status, timestamp, server, checks, message}`. After a push you can confirm the backend is **up and not crash-looping**, and **never** that your commit is the running code. Disclose this; do not claim a verified deploy.

---

## 9. Failure classes this program found — do not reintroduce them

1. **The silent success.** A `catch {}` swallowing an error next to a confident success message. The offline queue told trainers *"Workout saved offline"* when the write had failed. **Absence of a throw is not evidence of persistence — read back and verify.**
2. **The guard regex blind spot** — happened **three times**. A search written for the shape you expect misses the shapes that exist: optional chaining (`a?.b`), destructuring (`const { b } = a`), aliasing (`const w = window; w.b`). **Enumerate access shapes; prove absence by what a surface *does*, not by keyword search.**
3. **The dormant artifact.** Correct code nobody calls. **A dormant file that says so is a plan; one that doesn't is rot.** If you ship a module without a consumer, say so in its header and track it.
4. **Empty ≠ unknown.** Never let "no data" read as "nothing found." Say *"not on file."*
5. **Over-escalation is also a bug.** A confirmation that always fires equals no confirmation. Client ids arrive as strings from some transports — `42` and `'42'` are the **same client**.

---

## 10. Definition of done for C5

1. `Cmd+K` focuses the docked bar on every Coach surface — **no modal**
2. The client chip is always visible and **flips to Gilded Fern** on any cross-client command
3. Voice and keyboard reach the **same object** with no mode change
4. Every executed intent is recorded via `recordCoachIntent` with correct `inputOrigin`
5. `resolveVoiceConfirmationTier` is consumed (SWA-67) — consider **observe-only first** (derive + log the tier without enforcing) to check the distribution against real traffic before gating anything
6. The five existing command surfaces converge on it, or a written plan explains why one cannot
7. Responsive matrix verified, especially **320px** and **414px** (a docked bar on a phone is the hard case)
8. All tests in §8 still green
9. No file over 300 lines
10. Proof pasted, hostile review run to dry

---

## 11. Linear board

| Issue | Meaning |
|---|---|
| **SWA-65** | The Hive-Mind program. Post C5 progress here. |
| **SWA-64** | The audience-resolver blocker (§5) |
| **SWA-67** | Wire the confirmation tier — **C5 is its consumer** |
| **SWA-66** | Over-cap file splits (do not attempt without a runnable test suite) |
| **SWA-63** | The intake pipeline (C1, complete) |

---

## 12. Open decisions Sean owes you before you start

1. **Which direction** — The Lane + chip (recommended), The Lock, or The Console? *(The Console has no mobile answer yet and needs SWA-67 wired — it is a later slice.)*
2. **Audience routing — (a), (b), or (c)** from §5. **This one blocks compilation.**
3. **Does C3's tier go observe-only first, or does C5 ship tier-unaware?**

**Do not begin coding until 1 and 2 are answered.**
