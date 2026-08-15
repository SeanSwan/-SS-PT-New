---
decision: The three-way hostile review handoff D ordered is COMPLETE. One Medium defect
  confirmed and fixed; one false comment corrected; one reviewer finding disproven; six
  LOW findings carried unverified. The reviewed work is otherwise sound.
status: shipped
supersedes: none
extends: SESSION-HANDOFF-AUTHZ-REVIEW-ME-2026-08-14-D.md
---

# Three-way hostile review — adjudication

**Date:** 2026-08-14 · **Reviewers:** Kimi K3, Tencent HY3, and this agent (Claude Opus 5,
session `main-seae22129`) · **Author under review:** Claude Opus 5, session `main-s65632ef3`
— deliberately excluded per Sean's instruction.
**Scope:** `git diff 1c21f8306..HEAD -- backend/ frontend/` — 10 files, +1358/−22. Re-derived
this session; matches the handoff's claim exactly.
**Fix commit:** `3526a68e0`.

---

## 1. The headline: the limiter did not do what it was built to do

All three reviewers found this independently, which is the only reason I trust it.

`preKeyFetchLimiter` keyed on the **raw path text**; the handler resolves the target with
`parseInt(x, 10)`. parseInt is lenient, so `/keys/902`, `/keys/0902`, `/keys/+902`,
`/keys/902.0` and `/keys/902a` are **five buckets and one victim**. The suite could not see it
because every test it shipped with used a canonical integer — it varied the actor, the target,
and the count, but never the *spelling*, which is the one input the key is derived from.

Kimi rated it "Medium if the handler skips `validationResult`, Low if enforced" and said
explicitly that this must be verified. **I verified it: `validationResult` appears zero times in
`encryptionRoutes.mjs`** (positive control: three sibling route files do use it). So
`param('userId').isInt()` on that route is decorative, and the Medium branch is the live one.

Executed, not reasoned:

| | requests | 429s | prekeys drained from one victim |
|---|---|---|---|
| before | 100 | 0 | **100** |
| after | 72 (18 spellings) | yes | **20** — the limit |

And the property the per-pair keying exists to protect is intact: 40 distinct real victims still
return 200 with zero throttling, so legitimate group fan-out is unaffected.

HY3 reached the same finding but judged the spellings "finite… not unlimited." That is wrong —
`902` followed by arbitrary trailing junk all parses to 902, so the set is unbounded. The
executed probe settled what two models' reasoning got approximately right and precisely wrong.

**Fixed** in `3526a68e0`: the key now resolves the target exactly the way the handler does, and
everything unresolvable shares one bucket instead of minting a store entry per request. Two new
tests fail without the fix.

---

## 2. Adjudication table

**Confirmed and actioned**

| # | Finding | Found by | How I verified | Action |
|---|---|---|---|---|
| F1 | Limiter keys on unvalidated raw param → spelling bypass | Kimi + HY3 + me | executed probe, 100→20 | **FIXED** `3526a68e0` |
| F2 | "Costs many distinct accounts" is arithmetically false | Kimi | arithmetic: 20/h × 24 = 480/day vs ~100 pool | **FIXED** — comment corrected |
| F7 | `windowMs` mutation survives the suite | Kimi | window itself proved correct; the *pin* was missing | **FIXED** — reset-header assertion added |
| F3 | No per-actor ceiling; one account may take 20/h from every user | Kimi + me | design read | Documented as a known gap. **Not built** — a second limiter changes live E2EE behaviour and is Sean's call |
| F4 | MemoryStore is per-process → real budget 20×N behind N replicas | Kimi | no `store` option present | Documented in the comment |
| F5 | IP fallback is spoofable under `trust proxy` | Kimi | **confirmed** `backend/core/app.mjs:44` sets `trust proxy`, 1 | Latent only — branch unreachable behind `protect`. Documented |

**Real observation, impact disproven**

| # | Finding | Found by | Verdict |
|---|---|---|---|
| — | 4 of 5 suites stub `req.user.id` as a **number**; production `protect` sends a **string** (`authMiddleware.mjs:357`, `toStringId`) | HY3 (Kimi concurred) | The type mismatch is **real and verified**. The impact is **disproven**: every controller in the reviewed surface normalizes both sides before comparing — onboarding via `parseUserId`, badge via `parsePositiveInteger` (both call sites), messaging via `Number()`. No decision changes. It remains a genuine test-fidelity gap: these suites would not catch a future bare `===`. |

**Disproven**

| # | Claim | Source | Why it fails |
|---|---|---|---|
| F11 | `TEST_FILE` regex silently excludes `contest.jsx` | Kimi | Wrong twice. The real regex is `/\.(test\|spec)\.(ts\|tsx\|js\|jsx\|mjs\|cjs)$/` — already anchored, and already the fix Kimi proposed. Kimi **quoted a regex that is not in the file**. Even that fabricated regex does not match `contest.jsx` (tested: false). |
| — | express-rate-limit v7 IPv6 `keyGenerator` validation would reject the raw `req.ip` | **me** | Disproven with a positive control: `ipKeyGenerator` / `ERR_ERL_KEY_GEN_IPV6` are absent from the installed 7.5.1 in both dist builds, while the control term `keyGenerator` returns 3. My hypothesis, my miss. |

**Carried, unverified — reviewer hypotheses only (Rule 30), all LOW**

F6 consent suite never tests the `user` role its own header calls the live risk · F8 SQL
assertions are substring scans over author-fed mocks (`toContain("status = 'active'")` passes
against `… OR 1=1 --`) · F9 no invalid-role body probe on participant PATCH · F10
`emergency_dashboard_loaded` and `use_emergency_admin_route` are unverified deletions the
scanner never covers (it guards 2 of the 4 removed flags) · F12 scanner misses
`frontend/index.html` and `public/` · F13 scanner is literal-match only — a tripwire, not a
control, and should say which it is.

I did **not** verify these. Do not treat them as findings until someone does.

---

## 3. What the review confirmed rather than excused

Both paid reviewers volunteered this unprompted, and I agree after reading the suites: the
control-test discipline is real. The `CONTROL —` first test in each suite, the `removeItem`
canary, the walker-reach control, the `.js/.jsx` extension coverage that fixes the earlier false
positive, the "throttled attacker stops *consuming*" test that genuinely catches a
limiter-after-handler mutation, and the `allowSelf: false` movement-screen pin are all honest
work. The defect found here is narrow: the suite varied everything about the limiter except the
one input its key is built from.

The author's own §8 lesson — *every probe carries a positive control* — is what found this. The
suite had controls for whether the route worked; it had none for whether the key was derived
from what the handler actually uses.

---

## 4. Model calibration (Rule 68 — this is how the routing table gets learned)

| Model | Cost | Findings I checked | Real | Disproven | Notes |
|---|---|---|---|---|---|
| **Kimi K3** | **$0.3198** | 7 | 6 | 1 (F11) | Best of the three. Found the headline, and — decisively — *flagged its own uncertainty correctly* ("Medium if the handler skips validationResult — this must be verified"), which is exactly the behaviour that makes a reviewer useful. Its one miss was a **fabricated source quote**, the failure mode to watch. |
| **Tencent HY3** | **$0.0133** | 2 | 2 | 0 | **24× cheaper than Kimi and it still found the headline independently.** Underestimated its severity ("finite spellings" — wrong). Contributed the string-id finding Kimi ranked lower and I had missed entirely. Extraordinary value per dollar. |
| **This agent** | $0 | — | 3 | 1 | Found F1 independently and was the only one to *execute* it; verified the `validationResult` gap Kimi could only conditionalise on; disproved F11 and my own IPv6 hypothesis. |

**The remit override worked exactly as handoff D warned it must.** Both scripts default to a
design remit — `consult-hy3-design.mjs` opens "Give only UI/UX and interaction suggestions" —
and both returned pure security analysis when passed an explicit `--remit`. Neither wasted a
dollar on button spacing. Total spend **$0.333** against a $3 cap.

---

## 5. Verification for this turn

- prekey suite **9/9** (2 of the new tests fail without the fix — red observed before green)
- five authz execution suites **83/83**
- full `tests/api`: **2664 collected, 2 failed** — the 2 are `associationsModelRegistryParity`
  and `phase1bControllers`, both in files this turn did not touch, both reproduced in isolation.
  **Delta vs the handoff's 2661/2: +3 tests, all mine, all passing, zero new failures.**
  Note `memberDirectoryLateralProbe`, listed as failing in handoff D, now **passes** — someone
  fixed it since. Stale-check win; do not carry it forward as broken.
- `node --check` OK; module import executes; `preKeyFetchLimiter` resolves as a function
- frontend `adminBypassFlagsUnwritten.contract.test.ts` **9/9**
- Rule 42: no untracked backend files, no modified-uncommitted backend files
- secret scan CLEAN (pre-commit hook re-scanned staged blobs independently)

---

## 6. What I did NOT do, and why

- **Did not build the per-actor ceiling (F3).** It is real, but a second limiter on a live E2EE
  route changes behaviour for heavy legitimate users. Sean's call, not mine.
- **Did not fix the decorative `validationResult` on `encryptionRoutes.mjs`.** The security
  consequence is closed at the key generator, which is the more robust place — it does not
  depend on middleware ordering, and ordering fragility is what caused this bug. Making the
  validator real would change a live route's error contract (400 where it now 404s) and belongs
  in its own slice. **The decorative validator is still there; treat it as an open finding.**
- **Did not verify F6, F8, F9, F10, F12, F13.** Six LOW reviewer hypotheses, listed above.
- **Did not touch `protect`.** The largest standing gap in this lane — no suite exercises the
  real middleware — is unchanged and remains the highest-value next slice.

---

## 7. Ranked next

1. **Close the `protect` gap.** Unchanged from handoff D §6.2 and still the highest value per
   unit of work: every authz suite in this repo mocks `authMiddleware`, so all of them prove
   authorization *given* a correct `req.user` and none proves `req.user` is correct. HY3's
   string-vs-number finding is a second, independent argument for the same test.
2. **Grep `Number(req.params` and `parseInt(req.params` repo-wide.** Handoff D flagged this as
   latent at `uploadClientPhoto`. This turn proved it was **not** latent where a security
   control consumed it. Anywhere a guard and a handler resolve the same id differently is the
   same bug. This is now an evidenced pattern, not a hypothesis.
3. **Executed coverage for the 21 `router.use`-cleared handlers** — re-derive with
   `node backend/scripts/audit-idor-surface.mjs --verbose | grep '\[router\.use'`.
4. The six carried LOW findings (F6, F8, F9, F10, F12, F13) — cheapest first: F10 and F12 are
   scanner edits.
5. Per-actor ceiling (F3), if Sean wants it.

**Still Sean's, both carried from handoff D §5 and untouched by this turn:** the branch has
never been pushed (a bare `git push` targets `main` — use
`git push origin claude/qa-harness-slice0-20260811:claude/qa-harness-slice0-20260811`), and
**18 of 26 Hermes learning packets exist only on this machine.**
