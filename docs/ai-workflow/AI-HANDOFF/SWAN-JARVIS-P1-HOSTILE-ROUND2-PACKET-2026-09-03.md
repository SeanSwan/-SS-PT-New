---
decision: Hostile round 2 packet for the Swan Coach approval lane (Phase 1 cards 1.0–1.4)
status: open
supersedes: none
---

# Swan Coach approval lane — hostile round 2 packet

**Reviewers:** GLM 5.3 and GLM 5.3-flash, independently.
**Builder:** Claude Opus 5. **Branch:** `claude/jarvis-p0-2-security-20260902` (local, unpushed).
**Scope:** the destructive/safe-write approval lane — mint → read-back → confirm → atomic consume.

Round 1 (both seats) produced 22 + 23 findings against the first implementation.
All were applied. This packet asks you to attack **the fixes themselves**, plus
the four things I flag below as unresolved.

---

## 0. What you are reviewing, and the one thing I most want attacked

The lane's job: a spoken or typed command that would write to a client's record
must be readable, provable, and confirmable exactly once, and **a channel that
can mishear must not be able to authorize an act that crosses client identity**
(the "M3 split").

**Attack this first.** Twice in one session I found a control in this lane that
was *inert by construction* — present, tested, documented, and incapable of ever
firing:

1. `allowedConfirmChannels` was exported, documented as the M3 split, and called
   by nothing. A guard enforced only by a comment.
2. `resolveTierForCommand` read `ctx.routeContext.inputMode`. That property does
   not exist (options live at `ctx.options`), so `inputMode` defaulted to
   `'text'`, `knownSafeChannel` was always true, and `physical` could never be
   true. **The M3 rule had never fired in production.**
3. Fixing (2) was still not enough: **no caller anywhere sends `inputMode`**, so
   the `?? 'text'` default kept manufacturing the safe answer. Fixed by removing
   the default and having callers declare.

Each was invisible to the whole test suite because every test called the tier
function *directly* with `inputMode: 'voice'`, which bypasses the broken caller.

**So the highest-value thing you can do: find the next one.** Which control in
this lane looks enforced but cannot fire? Which default supplies the safe answer
for an input nobody ever sets? Which exported guard has no consumer? Prefer that
question over style, naming, or coverage gaps.

---

## 1. Architecture as it now stands

```
utterance ──▶ classify ──▶ RBAC ──▶ resolve client ──▶ tier ──▶ MINT
                                         │              │        │
                            captures SELECTION vs   decides   stamps signed
                            SPOKEN name (F-05a)    `physical`  requiresPhysicalConfirm
                                                              + clientId
                                                                  │
   sheet ◀── GET /pending/:id ────────────────────────────────────┘
     │  renders the STORED record, computes sha256 render digest
     ▼
   POST /confirm { operationId, renderedDigest, confirmChannel }
     │  ├─ digest recomputed server-side; mismatch ⇒ 400 (observe mode still refuses a WRONG digest)
     │  ├─ requiresPhysicalConfirm && channel ∉ {tap, keyboard} ⇒ 400 physical_confirm_required
     │  └─ HMAC verify ⇒ atomic store.delete() ⇒ execute exactly once
```

**Signed payload** now binds: id, type, endpoint, commandType, params, createdBy,
description, `requiresPhysicalConfirm`, `clientId`, affectedHash.
**Render digest subject:** id, commandType, type, description, affectedCount,
params, clientId, kind. Node↔browser parity pinned by a shared fixture.

---

## 2. Round-1 findings and how each was closed

| # | Finding | Resolution |
|---|---|---|
| F-02 | `already_confirmed` fell through to `burned`, whose exit is a re-mint | own terminal state `confirmed_elsewhere`, no re-issue |
| F-03 | M3 split enforced by a comment + an uncalled helper | stamped at mint (signed), enforced at `/confirm` against a declared channel |
| F-04 | `TERMINAL_GUIDANCE` had no consumer; sheet offered re-issue on `burned` | guidance decides; `burned`/`confirmed_elsewhere` get acknowledge-only |
| F-05a | spoken name discarded without comparison when a selection existed | `ctx.clientIdentity` carries selection + spoken id |
| F-08 | physical polarity keyed on `=== 'voice'` | `!knownSafeChannel` — unproven is not safe |
| F-09 | `roleRequired` string silently nulled by an Array.isArray check | normalized |
| F-10 | every approval event wrote `confirmationState: 'pending'` | per-event state map |
| F-11 | `/cancel` wrote a bare `cancelled`, outside the `approval:` prefix the funnel reads | `approval:cancelled`, floating promise voided |
| F-12 | `clientId`/`kind` outside the render digest | in the digest **and** in the HMAC |
| F-13 | effects keyed on the `input` object; inline literal restarted the arm timer every render | keyed on primitives via `useMemo` |
| F-14 | `cancel()` had no state guard; cancelled mid-submit | guarded to `loading`/`arming`/`ready` |
| F-17 | a picked lane row submitted its DESCRIPTION back through the fuzzy classifier | picked rows carry their exact `type` |
| F-18 | IME: Safari's terminating Enter arrives with `keyCode 229` | both signals checked |
| F-19 | listbox rendered but the input had no combobox contract | full contract + `aria-activedescendant` |
| F-20 | every mounted bar added its own Cmd+K listener | one owner, most-recent-mount wins |
| F-21 | client-side irreversible set duplicating a registry fact | **see §4.3 — the comment was wrong and is corrected; the risk is still open** |
| F-22 | digest comparison not length-pinned | HEX64 pin |

---

## 3. What I found attacking my own fixes (all fixed)

- The **second confirm caller** (`useCoachCommand`, the Command Center transcript
  card) never declared a channel. Fail-closed enforcement would have refused an
  identity-crossing confirm with "tap to confirm" at an operator who just tapped.
  The file already documented this exact hazard for the digest and I shipped the
  same shape anyway.
- **`ctx.routeContext` does not exist** (§0.2) — M3 inert.
- **No caller sends `inputMode`** (§0.3) — M3 still inert after that fix.
- The **non-destructive confirmation lane had zero tests** — no test referenced
  `preparePendingConfirmation`, `retrievePendingConfirmation`, or
  `pending_confirmed`. It is the lane most confirmable commands take.
- A **comment I wrote the same day** claimed the server owns `irreversible`. No
  such concept exists server-side.

---

## 4. UNRESOLVED — attack these, and tell me if I have called any of them wrong

### 4.1 `requiresClientRef: false` skips the identity comparison entirely
`stepResolveClient` returns early when `requiresClientRef !== true`, so
`ctx.clientIdentity` is never populated and the spoken-vs-selected comparison
never runs. **13 of 139 registry commands are confirmable or destructive while
declaring `requiresClientRef !== true`**, five of them destructive and acting on
a person: `delete_workout_plan`, `delete_post`, `block_user_posting`,
`promote_to_trainer`, `revoke_trainer_permission`.

Not fixed because closing it changes escalation behaviour for all 13 and adds a
resolver call — a product decision, not a bug fix. **Questions:** is the fallback
pair (`resolveCommandClientPair`) actually safe for those five, or is it the same
tautology F-05a was created to escape? Is there an exploit path where a misheard
name reaches one of them?

### 4.2 `confirmChannel` is the client's word
A hostile client claims `'tap'` and passes. This closes the ACCIDENTAL path —
ambient speech, a misheard "yes", a surface that never learned the rule — not a
deliberate forgery. I have said so in the code, the tests and the commit.
**Question:** is there a framing under which this is worse than nothing — does it
create a false sense of a control that a reviewer would mistake for authentication?

### 4.3 Irreversibility has no server-side concept
The client-side `IRREVERSIBLE_FALLBACK` set is the only source. It drifts from
the registry, and the drift renders an irreversible action with NO warning before
the confirm. **Question:** how would you rank this against 4.1?

### 4.4 `readBackSlots` and `tierReasons` reach the wire and nothing renders them
The route sends them; no frontend consumer exists (`tier` and `physical` ARE
consumed by the dock). Decoration today, or a real gap?

---

## 5. Verification evidence (so you can attack the evidence, not just the code)

- Full backend baseline gate: **9,990 passed / 4 failed · failing files 7 == baseline 7**, exit 0.
  The gate's own FAIL-line parser was validated against a deliberately broken test.
- Affected backend suites: **292/292** across 41 files. Frontend coach set: **394/394** across 73 files.
- `vite build` exit 0. Import-execution smoke OK on all 7 touched backend modules.
- **Every new security assertion is negative-controlled**: guard disabled, field
  removed from the signed payload, hardcoded list restored, `ctx.routeContext`
  reintroduced — each turns the relevant test red, then green again on restore.
- **NOT PROVEN:** repo-wide `tsc --noEmit` aborts at exit 134 (OOM) in this
  environment, scoped or not. There is no clean type-check to claim. A
  config-less scoped run showed zero diagnostics in the touched files, with every
  error traceable to that invocation's missing path aliases.
- **No live browser journey.** Everything above is unit/integration level.

**Attack the evidence too:** which of these numbers would still be green if the
feature were broken? That question found the inert-M3 bug.

---

## 6. Output I want

Ranked findings. For each: severity, LIVE vs LATENT, the file:line, the concrete
failure scenario (inputs → wrong outcome), and whether a test would have caught
it. Say plainly if a fix I made is wrong or worse than what it replaced. If you
believe a section of §4 is a non-issue, say so and why — I would rather delete a
worry than carry a fake one.
