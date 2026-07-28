---
decision: Adopt the Launch Readiness Audit charter as the governing spec for the pre-launch /loop — a slice-gated, hostile-review-until-dry sweep across security, correctness, dead code, data integrity, performance, design, and feature gaps, ending in a single verified Render deploy.
status: open
supersedes: none
---

# SwanStudios LAUNCH READINESS AUDIT — Master Prompt & Loop Charter
**Date:** 2026-07-27 · **Author:** Claude (Opus 5) · **Owner:** Sean (CEO) · **Mode:** `/loop`, slice-gated
**Branch:** `claude/launch-audit-20260727` · **Base:** `origin/main@c0c9b7454` (clean, 0 dirty)

---

## 0. Why this document exists

Sean's directive, in his words: *"I need to launch it. I need to be using the site now, today, tomorrow."* He asked for a comprehensive defensive security sweep, dead/incomplete file cleanup, tree reconciliation, and an always-enhancement posture — then asked that this prompt itself be rewritten better than he gave it, with every gap he might have missed filled in.

This is that rewrite. It is the **governing spec** for the loop. Every slice below is executed under it.

The standard, in Sean's metaphor: **combing lice out of hair.** Not "I looked and it seemed fine." Comb, find, remove, comb again, until a full pass finds nothing. That is literally the loop protocol in §3.

---

## 1. THE ENHANCED PROMPT (the ask, sharpened)

> Audit SwanStudios as a production SaaS about to take real paying clients, real minors' data, real payment flows, and real PII — under the assumption that a motivated attacker, a curious logged-in client, a disgruntled competitor, and an ordinary confused user will all touch it in week one.
>
> For every surface, ask six questions in this order:
> 1. **Can it be broken?** (security — auth bypass, impersonation, IDOR, injection, exposure)
> 2. **Is it wrong?** (correctness — logic defects, schema drift, silent data loss, money errors)
> 3. **Is it dead?** (dead/incomplete/orphaned code that lies about what the app does)
> 4. **Is it slow?** (performance — bundle, query, render, network)
> 5. **Is it ugly or confusing?** (design/UX — AAA enterprise bar, least clicks, least time)
> 6. **Is it missing?** (feature gaps — what should exist that doesn't, ranked by value)
>
> Do not report "looks good." Report evidence or report a defect. Every claim carries `[VERIFIED]` with a reproducible command, file:line, or observed response — or it is not a claim.
>
> Posture is **always enhancement**: at every surface, ask "what would enterprise/AAA look like here, and what is the cheapest path to it?" Use the Swan design brain and the Mobbin MCP as the taste reference, not as decoration.

### 1.1 Gaps in the original ask that this charter closes

Sean's prompt named security, dead files, and enhancements. These were **not** named but are launch-blocking and are now in scope:

| # | Gap he didn't name | Why it's launch-blocking |
|---|---|---|
| G1 | **Money-path integrity** | Stripe/cart/commission/package math. A pricing or commission error is a refund + trust event, not a bug. |
| G2 | **Multi-tenant scoping** | Trainer A must never read Client B. This is the #1 SaaS breach class and separate from "login as someone else." |
| G3 | **Minors' data & waiver/PII posture** | Legal exposure. Consent, export, deletion, access rationale. |
| G4 | **Secrets & logging hygiene** | Main just shipped two PII/credential logging fixes (`c324bd1bc`, `c0c9b7454`, SWA-71) — that class is proven live here, so it must be swept, not assumed closed. |
| G5 | **Rate limiting & abuse** | Login brute force, signup spam, AI-endpoint cost abuse (a paid LLM route with no cap is a billing attack). |
| G6 | **Error-state truth (Rule 75)** | The app must not *claim* things it doesn't do. Over-claiming copy on a live surface is a P0. |
| G7 | **Deploy/boot safety (Rule 42)** | Untracked or modified-uncommitted backend files crash Render at boot. This has happened here before. |
| G8 | **Rollback readiness** | If launch goes bad, what's the exact revert? Must exist *before* deploy, not after. |
| G9 | **Cross-agent collision** | 5+ agents are live in parallel (SwanGuard, Swan Coach audit, music, Swan Lens/Kimi, logo). Their work must not be clobbered and mine must not be clobbered. |
| G10 | **Verification capability itself** | `frontend/node_modules` was empty — meaning prior sessions *could not* run frontend tests. A blind gate is worse than no gate. **Fixed in S0.** |
| G11 | **Mobile reality** | Sean's clients train on phones. 320/375/414px must be checked, not assumed. |
| G12 | **Accessibility floor** | Keyboard, focus, contrast, touch targets. Legal + usability, and cheap to fix pre-launch. |
| G13 | **Observability** | When something breaks at 6am with a real client, can we see it? Health, logs, error surfacing. |
| G14 | **First-run/empty state** | A brand-new user on a brand-new account sees the app at its emptiest. That is launch day for every signup. |

---

## 2. GROUND TRUTH (verified 2026-07-27, not assumed)

Established before any slice ran, so the audit plans against reality:

| Fact | Evidence | Verdict |
|---|---|---|
| Production is **up** | `sswanstudios.com` → `200` in 287ms; API `/health` → `{"status":"healthy"}` | `[VERIFIED]` healthy |
| `origin/main` HEAD | `c0c9b7454` (2026-07-27 21:14) | Current, very active |
| The "1000 commits behind" feeling | `wip/comms-notifications-2026-07-05` is **1177 behind / 22 ahead** of `origin/main` | `[VERIFIED]` — real, and it's the *working tree*, not main |
| The "dirty files" feeling | **1216** dirty in that tree: 656 untracked, 355 modified, 205 deleted | `[VERIFIED]` — real |
| Are the dirty files lost work? | Of 294 untracked code files: **140 already exist on `origin/main`** (stale duplicates), **154 do not** | `[VERIFIED]` — mixed; triage required, not blind commit |
| Deleted tracked **code** files | **0** — all 205 deletions are docs/archive | `[VERIFIED]` low risk |
| Codex's launch-hardening work | Worktree `ss-launch-release-20260726` is **clean**; branch 28 behind, 0 ahead | Work landed or was discarded — **not** sitting lost |
| Frontend test capability | `frontend/node_modules` had **0 entries** | `[VERIFIED]` **broken gate — repaired in S0** |
| Backend test capability | `backend/node_modules` 499 entries | Available |
| Parallel agents | ~130 git worktrees registered | Collision risk is real → §5 |

**The headline correction:** `main` itself is *not* behind and *not* dirty. The mess is one stale WIP branch that the terminal happens to sit on. The clean base for launch work is `origin/main`, and this audit runs there.

**The 154 uncommitted files** are a coherent, tested feature set — messaging safety/attachments/moderation/policy, notification delivery/preferences/retry/broadcast, bootcamp intelligence engine, plus ~30 test files. That is a real workstream, not junk. **S3 renders the verdict** (finish / land / archive) — it is not silently discarded and not blindly committed.

---

## 3. THE LOOP PROTOCOL (binding)

Per Sean: *"We're gonna keep doing hostile reviews per slice until we get nothing back. And the only way we can move forward is that a hostile review that we did shows nothing left."*

**For every slice:**

```
1. SCOPE      → state the slice's exact boundary + success criteria
2. EVIDENCE   → gather file:line / executed-command proof BEFORE reasoning
3. BUILD      → implement the fix/upgrade, surgical (Rule 3), matching repo idiom
4. VERIFY     → run the real gates (tests, tsc, build, node --check, live probe)
5. HOSTILE    → switch sides, actively try to break what was just built
6. IF FINDINGS → fix them, GOTO 4      ← the comb passing through again
7. IF DRY     → one CONFIRM round; if that is also dry → slice CLOSED
8. COMMIT     → locally, explicit paths, per-slice revertability (Rule 70)
9. NEXT SLICE
```

**A slice may not close on a first-pass "found nothing."** The bar is **CLEAN×2**: a hostile round that finds nothing, then a confirmation round that also finds nothing. Report the round count.

**No slice closes without PROOF (Rule 74):** current-session, reproducible, shown — executed command output, a failing→passing regression test, or a live probe. `[LIKELY]` is not proof. If something genuinely cannot be verified here (e.g. an authenticated browser journey), that is **disclosed as an unproven gap**, not quietly claimed.

**Push cadence (Rule 70):** commit per slice locally, **do not push per slice**. One batch push at the end → one Render deploy → one deploy verification. Exception: a production-down or security-critical fix ships immediately.

---

## 4. THE SLICES

Ordered by launch risk — the things that can hurt Sean or a client come first.

| # | Slice | Core question | Bar to close |
|---|---|---|---|
| **S0** | Ground truth & salvage triage | What is actually true about the tree, and what verification can I even run? | Clean base + working test gates + salvage map ✅ **DONE** |
| **S1** | **AuthN/AuthZ** | Can anyone become anyone else? | Every role boundary + token path proven; impersonation & IDOR closed |
| **S2** | **Route exposure** | What can an unauthenticated or wrong-role request reach? | Full route inventory classified; admin/money/PII routes provably gated; rate limits on abuse-prone endpoints |
| **S3** | **Dead / broken / incomplete** | Does the code lie about what the app does? | Orphans classified (Rule 33); the 154-file verdict rendered; nothing ships half-wired |
| **S4** | **Data integrity & money** | Can it silently corrupt, lose, or mis-charge? | Schema drift swept (Rule 58); money math proven; PII/minors posture verified |
| **S5** | **Runtime error sweep** | What crashes or fails silently in front of a real user? | Error boundaries, empty/loading/error states, console+network clean on key journeys |
| **S6** | **Performance & responsive** | Is it fast and usable on a phone? | Bundle/query/render budgets; 320/375/414 + desktop matrix |
| **S7** | **Design/UX upgrade** | Is this AAA, or merely acceptable? | Swan design brain + Mobbin reference; least-clicks pass; signature moments |
| **S8** | **Feature gaps** | What should exist for launch that doesn't? | Ranked gap list w/ value rationale; quick wins built, big rocks specced |
| **S9** | **Ship** | Is it provably deployed and healthy? | Batch push → one deploy → health + release-marker verification + rollback plan |

Slices may **split** if evidence shows a sub-area deserves its own dry-loop. Splitting is expected, not a failure — a slice that closes too easily was scoped too narrowly.

---

## 5. PARALLEL-AGENT SAFETY (Rule 67, hard constraint)

Sean has 5+ agents live: **SwanGuard**, **Swan Coach audit**, **music build**, **Swan Lens (Kimi)**, **Swan logo**.

Binding rules for this audit:
- **Work happens in `c:/tmp/ss-launch-audit-20260727`** (isolated worktree off `origin/main`). The shared tree is not touched for edits.
- **Never `git add -A`.** Explicit paths only, every commit.
- **The 1216-file WIP tree is not "cleaned up" by deletion.** Rule 34 forbids blind cleanup; the salvage map (S3) proposes, Sean approves.
- **Read `.ai-workflow/coordination/*.lane.md` before touching any file** another agent may hold.
- **Claim my lane** in `claude.lane.md` so the others can see me.
- Findings that land in another agent's territory are **written to `review-queue.md`**, not unilaterally fixed.

---

## 6. NON-NEGOTIABLE STANDARDS (applied to every slice)

**Security floor:** fail-closed gates; no auth bypass; ownership checks on every read/write of another user's record; no secrets in logs/responses/docs; rate limits on auth, signup, and paid-LLM routes; no PII to LLMs (Rule 8).

**Code floor:** ≤300 lines/file (Rule 4); styled-components only, no MUI (Rule 1); tokens with fallbacks, no hardcoded colors (Rule 6); Victory for charts (Rule 10); existing-pattern-first (Rule 18); sibling sweep with shown grep (Rules 20/54).

**UX floor:** 44px touch targets (Rule 2); dark-first Crystalline Swan (Rule 3); WCAG 4.5:1 (Rule 7); reduced-motion respected (Rule 25); loading/empty/error states always; least clicks, least time.

**Truth floor (Rule 75):** docs, closeout, and **in-app copy** describe what the code does *now*. App copy that over-claims is P0 — make the app tell the truth first, then close the gap.

**Language floor (Rule 34/74):** banned without proof — "should be fixed", "looks good", "safe to delete", "guaranteed deletable", "all done". Replaced with the honest state.

---

## 7. OUTSIDE CONTEXT (Sean-authorized, one run each)

Sean authorized **one Kimi run and one Fable run**. They are spent *after* grounded evidence exists, so they review reality instead of speculating — the highest-leverage use of a paid brain:
- **Kimi** — independent hostile review of the audit's security + correctness findings.
- **Fable** — Final Decider synthesis: what actually blocks launch, what ships, what waits.

Provenance note (Rule 68): neither Opus nor Kimi output is Fable-tier. Only genuine Fable output may feed the Hermes learning corpus.

---

## 8. DEFINITION OF LAUNCH-READY

The audit closes when **all** hold:

- [ ] No known path lets a user read or write another user's data
- [ ] No unauthenticated route reaches admin, money, or PII surfaces
- [ ] Auth, signup, and paid-LLM endpoints are rate-limited
- [ ] Money math (pricing, cart, commission, packages) is proven correct by test
- [ ] No secret or PII appears in logs, responses, or committed docs
- [ ] No shipped surface lies about what it does (Rule 75)
- [ ] Key journeys (signup → login → dashboard → log workout → see progress) work end-to-end with proof
- [ ] Mobile 320/375/414 verified on the surfaces a client actually touches
- [ ] Backend boots clean — Rule 42 audit run, both commands, zero drift
- [ ] Deployed build verified live (health + release marker)
- [ ] Rollback plan written and executable by someone who didn't build it
- [ ] Every slice closed CLEAN×2 with round counts reported

---

## 9. CLOSEOUT CONTRACT

At the end: a Rule 48 phase audit record, a Rule 57 dual-tier summary (plain-English first), a Rule 69 Hermes inbox memo, the Rule 60 next-slice call, and the `DRY-LOOP: CLEAN×2 (rounds: N)` + `PROOF:` markers.

---

*Governing rules: 3, 4, 8, 15, 17, 19, 20, 26–31, 34, 40–42, 44, 51–61, 62, 67, 70, 72, 74, 75.*
