# PANEL SYNTHESIS — trainer-intent lead tagging (SWA-178 option C)

**Three independent hostile reviews. All three returned FAIL.** Every code finding is fixed at
`092075342`. Two findings require a migration and are **held for Sean** rather than executed.

- **Reviewers:** GLM 5.3 (subscription) · Kimi K3 (**$0.0592**) · local Qwen 3.8 (**$0**, on the 5090)
- **Not run:** Grok 4.6 — Sean asked for "GRAC 4.6"; if that meant Grok, **Rule 12 forbids it** (hard
  permanent no on Grok/X-AI anywhere). Awaiting his clarification; the seat is otherwise unfilled.
- **Raw reviews:** `GLM-REVIEW-INTENT-TAG-2026-08-20.md` · `KIMI-REVIEW-INTENT-TAG-2026-08-20.md` ·
  `QWEN-REVIEW-INTENT-TAG-2026-08-20.md`

---

## 1 · Where they converged — highest confidence

| # | Finding | Found by | Status |
|---|---|---|---|
| **H1** | `ContactV3.tsx` AlertBox `#fff` → `var(--text-on-accent, #ffffff)` is a **live visual change** unrelated to the feature, and C7 ("nothing user-visible changed") is therefore FALSE | **all three** | ✅ FIXED — reverted |
| **H2** | The stats sample is **capped at 5000 with no ORDER BY** — past the cap the tally is a nondeterministic undercount | **all three** (Kimi + GLM added the missing ORDER) | ✅ FIXED — `order createdAt DESC` + `sampled`/`sampleCap` |
| **M3** | `intent` frozen in `seedRef` at mount; an SPA param change without remount sends a stale or missing intent | **all three** | ✅ FIXED — `readIntentParam()` at submit |
| **M4/F7** | The aggregator bucketed **any** `prism:intent:*` tag; `Lead.tags` is admin-writable → unbounded key count *and* key length | Kimi, Qwen, GLM | ✅ FIXED — intersected with `CAPTURE_INTENTS` |
| **L6/F8c** | `findOrCreate` race → duplicate leads → double-counted intents | Kimi, Qwen, GLM | ⚠ **HELD** — see §4 |

**H1 is the one that matters most about my own process.** I changed that line *only* to satisfy a
lint rule, having convinced myself the fallback made it render-identical. It does not: the token
resolves to `getReadableAccentText(buttonPrimaryBg)` (`themeUtils.ts:121`) — the colour readable
against the **primary button**, an unrelated surface. On a light-primary theme it yields dark text on
a saturated alert. Three independent readers caught it. A "compliant" fix that changes rendering is
not a safe fix.

## 2 · Unique to one reviewer — where the money was

**GLM 5.3 — F1, NO BACKFILL (nobody else found it, and it is the biggest one).**
Every trainer who has *already* contacted SwanStudios exists only as prose in `Lead.notes`. `byIntent`
launches at **zero for all history**, so "how many trainers knocked" excludes every lead to date —
the same failure class the work exists to kill, one layer up. ⚠ **HELD for Sean** (§4).

**GLM — F4, the frontend was never type-checked.** Correct in substance. My verification claimed
`node --check` on ten files; all ten were `.mjs`. The two `.tsx` files were checked by **no method** —
`tsc` cannot run here (no `node_modules`). GLM's specific worry (a typed payload interface rejecting
`intent`) does **not** materialise: `axios.post(url, { … })` takes an untyped object literal, verified.
The gap is real; that particular consequence is not.

**Kimi K3 — the biggest coverage hole.** The feature is **one property on one call**. Nothing tested
it. A refactor dropping `intent,` reverts everything silently. ✅ FIXED — four supertest cases.

**Kimi — M5, multi-intent undercount.** `tags.find()` counted only the *first* intent tag, so a
repeat submitter through both doors counted once, under whichever tag sat earlier in the array. GLM
found this too (F5). ✅ FIXED — counts every declared intent, deduped per row.

**Kimi — L7, the merge path was prose.** I asserted repeat-lead tagging worked and never showed it.
✅ FIXED — a supertest case now exercises `created: false`.

## 3 · Where reviewers were wrong — recorded for calibration

- **Qwen, "100k distinct keys":** arithmetically impossible. The accumulator is bounded by the 5000
  rows fetched, so ≤5000 buckets. Direction right, magnitude invented.
- **Qwen, C7 reasoning:** argued `HomePage.V4`/`PrismCapture` "may have relied on the absence of the
  `intent` field." No evidence, and the diff shows neither file touched. **Right conclusion, wrong
  argument** — it landed on H1 by luck, then justified it with speculation.
- **GLM, F4 premise:** "`node --check` cannot parse `.tsx`" is true, but I never claimed to run it on
  `.tsx`. The stated verification list was all `.mjs`. Substance right, premise misread.
- **All three** treated the `findOrCreate` race as in-scope; it is genuinely pre-existing and this
  change only rides it. Kimi alone said so explicitly ("not caused by this change… don't block").

## 4 · ⚠ HELD FOR SEAN — both need a migration, so neither was executed

Migrations are blast-radius operations. Proposing, not running.

**(a) Backfill historical trainer leads (GLM F1).** Existing trainer inquiries carry the marker only
as text in `notes`. GLM's sketch:
```sql
UPDATE leads SET tags = tags || '"prism:intent:trainer"'
WHERE notes LIKE '%Subject: Trainer inquiry%' AND NOT tags ? 'prism:intent:trainer';
```
⚠ **Do not run as written.** Unverified against this schema: `tags` is JSONB but the `||` form assumes
a JSONB array literal, `notes` matching is a heuristic that will also catch quoted or forwarded text,
and there is no dry-run count first. Needs: a `SELECT count(*)` preview, a reversible migration, and
Sean's approval. Without it the feature's headline number is silently zero for all history.

**(b) `Lead.email` has NO unique constraint.** Verified: `Lead.mjs:91` declares a **non-unique** index
(`{ fields: ['email'] }`), and no migration adds uniqueness. So `findOrCreate` genuinely can create
duplicate leads under concurrency, which would inflate the intent count. Pre-existing and not caused
here. Adding the constraint could fail outright if duplicates already exist in production — so it
needs a duplicate audit first, then Sean's call.

## 5 · Model calibration (Rule 68)

| Model | Cost | Wall | Findings | Real on verification | Unique high-value | Notable miss / overstatement |
|---|---|---|---|---|---|---|
| **GLM 5.3** | subscription | 196s | 8 | 7 | **F1 backfill** (nobody else), F4 no-typecheck, F8c constraint audit | misread which files I `node --check`'d |
| **Kimi K3** | **$0.0592** | 97s | 9 | 9 | biggest coverage hole; M5; L7 merge path; ORDER BY | none — highest precision of the three |
| **Qwen 3.8** | **$0** | 80s | 7 | 5 | none unique, but independently confirmed both H-severity items | invented a 100k magnitude; speculative C7 argument |

**Routing conclusion.** Kimi was the most precise per finding and cost six cents. GLM was the only one
to leave the diff and ask a *business* question — "what about the leads you already have?" — which was
the highest-value finding in the entire panel and which no amount of code-reading would surface.
Qwen at $0 independently confirmed both high-severity items, which is exactly the corroboration role
it is meant to play. **All three earned their seat; the free one is not the weakest, it is the least
original.** For a diff this size the panel cost $0.06 and found a defect I had introduced myself
twenty minutes earlier and defended in writing.

## 6 · What is now true

Fixed at `092075342`: H1, H2, M3, M4/F7, M5, the passthrough coverage hole, and L7.
Held for Sean: the backfill and the unique constraint (§4).
Still unverifiable here: no `tsc`, no test-runner execution, no HTTP request, no DB write, no browser
— `node_modules` is absent in this worktree. **14/14 assertions executed directly against the real
module**; the committed tests carry the same assertions for CI but have never been run by a runner.
