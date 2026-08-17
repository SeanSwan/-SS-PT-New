# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-BRAIN-ROUND3-PACKET.md
**Tokens:** 1889 in / 15725 out (reasoning: 13436) | total 17614
**Wall:** 237.6s

---

# Round 3 review

## Findings

| ID | severity | claim | evidence | proposed fix |
|---|---|---|---|---|
| — | — | **No new findings.** | checklist below | — |

## What I checked

1. **Palette regex semantics.** `/#[0-9A-Fa-f]{6}\b/g` — the `\b` is doing real work, correctly: 7/8-digit hex (`#12345678`), hex embedded in longer identifiers (`#123456px`), and shorthand (`#fff`) are all excluded; `#123456-based` and end-of-string still match. The `Set` dedup makes this a *unique-token* floor. No pathological cases found.
2. **Null-safety.** Both checks guard `bundle.designMd ?? ''`. Missing/empty designMd → palette check errors loudly (0 tokens); sentinel no-ops silently — correct asymmetry, since the bundle already fails on the palette error. No new throw path exists; the ENOENT-masking failure mode from round 1 cannot recur via this hunk.
3. **Additivity.** Both hunks are pure `errors.push` — no mutation of `bundle`, no early return, adjacent `requirePattern` calls untouched. Structurally cannot *reduce* an error count or flip a pass to fail. Your measured 9/2 and 4/0 baselines are consistent with the code shape.
4. **Placement.** Hunk sits inside `auditWorldEngineBundle`, on the same `errors` array the adjacent `requirePattern` calls use — the function that reports. Error messages are novel strings; no collision with existing message text.
5. **Sentinel.** Case-insensitive, literal em-dash phrase. The two-way proof (clean file false / poisoned string true) is the right proof shape. Evasion and false-positive surfaces characterized in §3.2 below.
6. **Restoration fidelity.** The unique-count is stricter-or-equal to any raw-occurrence counting in the retired script — if the original counted total matches, the restoration is *tighter*, which is the safe direction.
7. **Disposition completeness.** Every listed round-2 finding maps to FIXED / ROUTED / ACCEPTED / FALSE-POSITIVE with evidence. Two recording-hygiene soft spots (not defects) in §3.4.

## Assumptions I could not verify from the diff (HYPOTHESIS)

| ID | claim | basis |
|---|---|---|
| H1 | `bundle.designMd` is the full raw file text, not a parsed subset | Strong proxy: your two-way proof yields 23 unique tokens from the real file |
| H2 | Retired script counted tokens the same way | Not visible; but any divergence makes the new check stricter, not weaker |
| H3 | No consumer indexes the `errors` array positionally or exact-match greps existing messages | New messages are novel strings; collision impossible; positional indexing unlikely but invisible from the hunk |
| H4 | Consult scripts hardcode short names (R2-2 false positive) | Your grep evidence; consistent with the original finding being labeled HYPOTHESIS |
| H5 | Nothing *mechanical* acts on constitution Rule 40 during the post-A window | GLM R2-1 enumerated the 4 refs as constitution (prose) refs; the only mechanical consumer (the mirror check) dies with A. Cheap insurance: one grep for `design.html` across `scripts/` before merge |

## Branch verdicts

| branch | safe to merge? | blocking | checklist |
|---|---|---|---|
| A `@78dfd53c6` | **YES** | none | (1) Record the §2(a) follow-up as a tracked item *before or with* the merge; (2) pre-author the Rule-40 commit text now so landing it is mechanical; (3) run the H5 grep; (4) expect 9/2 and 4/0 to hold on merge — same file states, they will |
| B `@bd8d0a96c` | **No objection from this round** — B is unchanged since the round-2 review; carry that verdict forward | none from this diff | Decide landing order vs A and the Rule-40 follow-up — both touch constitutions. If S18 text is far from Rule 40, no conflict expected, but choose the order deliberately rather than discovering it |

---

## §2(a) — constitution sequencing: right call, with one condition

Holding A buys nothing. Pre-A main is consistent, but the constitution fix *depends on the post-A world* — it cannot be authored meaningfully on a 70-behind branch, and "atomic" would in practice mean stacking the fix on A, which is exactly your same-session follow-up minus the ceremony. The window's real risk is also smaller than it looks: the gate is blind by design, nothing is deploy-linked, and Rule 40's consumers are prose-readers (agents), not executors — assuming H5 holds.

The one thing that makes this sound rather than hopeful: **"same session" is a plan, not a mechanism.** Sessions die mid-window, and then main carries an unacknowledged contradiction that nothing mechanical will ever flag. Record the obligation durably now (issue or an ACTIVE-INDEX line saying "Rule 40 mirror language pending correction"), and pre-write the commit. That converts the window from *contradiction* into *acknowledged in-flight change*, which is the difference that matters.

## §2(b) — no cross-check: recording is sufficient, not negligent

The structural fact your own text states, and it deserves emphasis: the retired check guarded a **different dyad** (design.md ↔ design.html). design.md ↔ SWAN-CINEMATIC-DESIGN-SYSTEM.md was *never* mechanically guarded. No coverage was lost; a latent absence became visible. That reframes the question — you're not shipping a regression, you're documenting a pre-existing hole.

Writing an "ADAPTS" check under fix pressure, without doctrine, is precisely the failure pattern of rounds 1–2: well-intentioned mechanism, unreviewed semantics, defect in the fix. Routing it is the correct move. One hardening: make sure the recorded gap names an owner/trigger the way the external-reference issue did with baseline evidence, so it doesn't become permanent furniture in ACTIVE-INDEX.

## §2(c) — header-derivation triplication: does not block, correctly post-merge

The three copies produce identical output today (titles verified trailing-Review-safe), so no behavioral divergence exists at merge time. The cure — a shared module — requires a common ancestor on main, which makes the consolidation *structurally impossible* before the branches meet. This is definitionally post-merge work. Track it; escalate only if a fourth copy appears before consolidation.

## §3.1 — is ≥20 meaningful?

Meaningful **as what it is**: a gross-loss floor, not an equivalence check. It certifies palette *existence*, not palette *health*. The fence-blindness you flag is real — if retired prose or fenced examples alone held ≥20 unique tokens, the check could never trip even if the live palette section were deleted outright. Whether it has teeth therefore depends on where the 23 tokens live, which I can't see (your poisoned-input proof shows extraction tracks palette content in that case, which is reassuring). Two honest observations:

- Floor 20 vs observed 23 means legitimate consolidation of 4+ near-duplicate colors trips it. That's fail-loud with a clear message and a one-line floor adjustment in the same commit as the palette change — the correct failure direction. It's a tuned-to-current-file constant; know that going in.
- The residual (quiet drift in a file that still yields ≥20 tokens) is exactly recorded gap §2(b). This check was never going to do that job. Don't add fence-awareness here — that's new, unreviewed semantics inside a fix commit, which is the exact pattern that produced the prior defects.

## §3.2 — is the sentinel false comfort?

Worth having, **if understood as a resurrection tripwire rather than a semantic guard**. The dominant real-world regression vectors — reverting the retirement commit, copy-pasting from an old doc, a merge resurrecting an old section — all reproduce the exact string, and the sentinel catches all of them. Evading it requires a human to *deliberately re-express* the retired contract, at which point no sentinel was ever going to stop them; that's doctrine and review's job. Also note the false-positive surface: a future historical note *quoting* the retired phrase fires the check — fail-loud, self-explanatory message, acceptable.

If a commit ever touches this file again for other reasons, `/Tier\s*3\s*[—–:-]\s*Reduced\s*motion/i` buys punctuation tolerance for one line. Don't spin a commit for it — fold it with the trailing-Review regex into a single later "regex hygiene" commit, matching Kimi's own advice pattern.

## §3.3 — placement and count-invariance

Confirmed: inside `auditWorldEngineBundle`, same `errors` array as the adjacent `requirePattern` calls, purely additive, baselines measured and matching main. New errors appear *before* the motion/cinematic/reviewer errors in the array — only matters under H3, which I rate very low.

## §3.4 — anything unfixed and unrecorded?

Among the listed round-2 findings: **no**. Every disposition carries evidence, and the two re-homed assertions are proven both ways, which is the proof shape this workstream should keep using.

Two recording-hygiene soft spots, both hygiene rather than defects:

1. The trailing-Review regex acceptance has no stated durable home — if it lives only in this review, round 5 rediscovers it as "known-but-forgotten." One-line issue.
2. The deferred ledger now holds five items: external-reference contract (tracked ✅), cross-check gap (recorded ✅), trailing-Review regex (untracked ⚠), header-derivation triplication (untracked ⚠), Rule-40 follow-up (intent ⚠). Give all five one home before A merges.

---

**Verdict: clean round.** The diff is a faithful, additive, null-safe restoration with two-way proofs, and all three non-fixes are correct calls rather than evasions — (a) conditional on recording the follow-up, (b) correct because no coverage was lost, (c) correct because the fix is structurally impossible pre-merge. Merge A; carry B forward unchanged.
