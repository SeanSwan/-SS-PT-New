---
name: a-green-test-can-be-why-the-bug-shipped
date: 2026-08-21
originating_model: claude-opus-5
tier_basis: Opus 5 designated Fable-tier by Sean 2026-08-10
decision: Verify an external audit against real code before acting; fix silent-success bugs at the type level, not the call site
status: shipped
privacy: IDs and file paths only; no PII, no secrets
supersedes: none
models_used:
  - model: claude-opus-5
    role: verifier, builder, Final Decider
    did: verified 12 audit claims against origin/main; built Wave 1; ran 3 hostile rounds; arbitrated panel contradictions
    cost: subscription
  - model: glm-5.3
    role: hostile reviewer
    did: named the verifier-is-author conflict; flagged BOTH unverified inferences in the packet — both real, both changed the work
    cost: $0 (Z.ai subscription)
  - model: x-ai/grok-4.6
    role: hostile reviewer
    did: found onOpenEditProfile dead at the same two mounts (a sibling the AUDIT missed); argued remove-mute-don't-implement
    cost: $0.0583
  - model: moonshotai/kimi-k3
    role: hostile reviewer
    did: argued props must be REQUIRED so absence is a compile error (adopted); proposed the noop census; over-escalated views→P0 (overruled 2-1)
    cost: $0.0374
skills_touched:
  - id: rule-73 proof-before-done
    change: reinforced
    failure: one hostile round was treated as a dry loop; a Stop hook caught it, not the model
  - id: SWA-188
    change: proposed
    failure: ~137 source-text regex tests; the one guarding a P0 passed green while the P0 shipped
  - id: rule-67 pair-coding
    change: applied
    failure: Codex was running the identical 3-seat panel on charts, same base, same day — collision avoided only by reading the lane file
---

# A green test can be the reason a bug shipped

## The lesson

A test that reads a component as a **string** and regex-matches it is not a test of behavior. It
survives any refactor that preserves string shape while breaking what the code does — and it is
therefore blind to the entire silent-success bug class.

At `origin/main @ 66ffde607`, `UserSettingsHub.saveContract.test.ts` did exactly this:

```js
const source = readFileSync(resolve(process.cwd(), '.../UserSettingsHub.tsx'), 'utf8');
expect(saveBranch.match(/apiService\.put\('\/api\/profile'/g)?.length || 0).toBe(1);
expect(saveBranch).toMatch(/if \(onUpdateProfile\)[\s\S]*else[\s\S]*apiService\.put/);
```

Every assertion passed. Meanwhile the Settings page told members "Saved" and wrote **nothing** —
silently discarding `profileVisibility`, `showWorkoutHistory`, `showStats`, `chartVisibility`,
`autoShareWorkoutsToFeed`, `healthConcerns`, `emergencyContact`. Privacy and health data.

The test could not have caught it, because the defect was not in the string it was matching. The
defect was that the *parent* passed a no-op:

```
UserDashboardTabsV3.tsx:248   onUpdateProfile={onUpdateProfile || noopUpdateProfile}
UserDashboardTabsV3.tsx:105   const noopUpdateProfile = async () => undefined;
UserDashboard.V3.tsx:128,183  ← both mounts omitted the prop entirely
```

Census: **137 of 1,588** frontend test files assert `toContain`/`toMatch` against component source
text (207 read a source file at all; 642 call `readFileSync`). Not all are misuse — some legitimately
assert a palette token exists. But "the suite is green" means materially less than it appears on any
surface guarded only by these.

## The fix that generalizes

Do not patch the call site. **Make the bug unrepresentable.**

The panel converged independently on this: delete the no-op and make the handler prop *required*, so
a future omission fails at compile time rather than resolving into a lie.

Proof it bites — reintroducing the exact original defect:

```
UserDashboard.V3.tsx(128,16): error TS2741: Property 'onUpdateProfile' is missing
  in type '{...}' but required in type 'UserDashboardTabsV3Props'.
```

A type-level guarantee outlives a test. Nobody can delete it without the compiler objecting.

**The general rule: an optional handler must fail loudly, never resolve.** Absence of a capability
converted into silent success is the root pattern — it also produced a dead Edit-Profile affordance
at the same two mounts, a `if (!user) return` that resolved as success, and (unfixed, Wave 2) an
owner-upload control gated on `isOwnProfile && onUpload` where no mount passes `onUpload`.

## Who did what

**GLM 5.3 delivered the sharpest finding, and it was aimed at me, not the audit:** *"the verifier is
also the packet author, which this panel should keep in view."* It then named the two places I had
asserted beyond my evidence — I had inferred the save behavior from the regex test without reading
the handler (the exact sin I was accusing the test of), and I had never verified that
`dashboard.updateProfile` actually writes. GLM's point was that if it were local-state-only, my
prescribed fix would add a *second* lie on top of the first. Both gaps were real. I closed them:
the handler branch confirmed at `UserSettingsHub.tsx:118-149`, and `useProfile.ts:323` →
`profileService` → `PUT /api/profile` — same endpoint as the fallback. My inference was correct,
which is luck, not method.

**Grok 4.6 — the cheapest paid seat at $0.0583 — found a defect the AUDIT ITSELF missed:**
`onOpenEditProfile` was dead at the same two mounts via the same no-op mechanism. It also made the
right call on mute: *remove* it rather than implement it, because a missing control is honest and a
fake one is harassment exposure. Cost is a poor proxy for value.

**Kimi K3 contributed the doctrine that became the fix** (required props → compile error) but
over-escalated likes-as-views to P0 and was overruled 2-1. Its proposed `|| noop` census was
directionally right and materially wrong: the pattern was bounded to two lines, not systemic. A
plausible generalization still has to be measured.

**All three independently rejected** the audit's proposed 5-cluster IA as consumer-social thinking
applied to a coach-led B2B2C product, and all three called the 12-week roadmap a sales document whose
48-hour trust-repair core is the actual product. Two independently flagged "Ask Coach about this
chart" as a zero-PII-to-LLMs violation.

## The audit was credible AND wrong — both matter

10 of 12 claims verified true. But two would have caused damage if actioned as written:

- It called Progress "static horizontal bars far below the chart system." **It already uses Victory**
  (`WorkoutsTab.tsx:50,186` → `WorkoutsTabCharts.tsx`). That framing would have justified rewriting
  conforming code — and Kimi had even warned "if they're hand-rolled divs the fix must migrate to
  Victory," a warning that was moot the moment anyone looked.
- It said "protect `main`, require checks." GitHub returns **403 — needs Pro/Team or a public repo.**
  The repo must stay private given its credential-leak history. The recommendation is unexecutable.

An auditor without repo access produces confident prose about code it cannot read. Verify before you
act, and verify hardest where the recommendation is most expensive.

## Skills created or changed

- **SWA-188 filed, not fixed.** Rewriting ~137 test files is opinionated and carries real regression
  surface, and some of those assertions are legitimate. Filed with four options and an explicit
  "per-file triage required before any bulk action — do not mass-delete."
- **Rule 73 reinforced by failure:** I ran one hostile round and treated it as a dry loop. A Stop hook
  caught it. Three genuine rounds followed — own-diff attack, real-caller-path, then linter plus
  blast-radius — and all came back clean, so the conclusion survived. The process did not.

## Mistakes I made

- **Inferred save behavior from the regex test rather than reading the handler.** Precisely the sin I
  was accusing that test of. Caught by GLM and Grok independently, not by me.
- **Asserted the fix was correct before verifying `updateProfile` writes.** GLM had to point out the
  second-lie risk. Right answer reached by luck first, evidence second.
- **Junctioned `node_modules` from another worktree after checking only `package.json`.** Those modules
  were themselves a junction back to the 2158-commit-stale tree — vite 5 vs 6. I came one command from
  producing a "tests pass" claim on the wrong dependency set. Caught from stack-trace paths, not method.
- **Treated one hostile round as a dry loop** (above).
- **Did not sync Linear unprompted.** A gate had to ask. Sean has said he should never have to — a
  hook asking on his behalf is the same failure with a machine in the middle.
- **Near-miss:** almost reported `HomeCommunityFeed`'s no-op like/comment as a third dead affordance.
  It is correct code — `readOnly` external enrichment cards. Reading context before claiming stopped it.
- **What worked:** my first grep for hard-coded role paths returned EMPTY and I did **not** conclude the
  claim was false. Real paths were `/dashboard/client/...`, not `/client/...`.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What actually stopped it |
|---|---|---|---|
| Asserting beyond evidence (inferring from a proxy artifact) | 2 (save branch, updateProfile impl) | Yes — Rule 51 / Rule 73 | An **external seat** catching it. Not self-review. The packet had already passed my own hostile pass. |
| Trusting an instrument without validating it | 1 (node_modules junction) | Yes — `validate-the-instrument-before-reporting-absence` (2026-08-21, same day) | Stack-trace paths, noticed by accident. **This is a same-day repeat of a lesson already in the corpus.** |
| Stopping the hostile loop after one round | 1 | Yes — DRY-LOOP LAW | A deterministic Stop hook. Not the model. |
| Believing a negative from one grep | 0 (avoided) | Yes | The rule fired correctly and prevented a false clearance. |

**The highest-signal row is #2.** A packet titled *"validate the instrument before reporting absence"*
was written into this corpus **the same day**, and I still trusted a `package.json` diff as proof that
the installed modules matched. Reading the lesson did not prevent the repeat. What would have: a
mechanical step — *before running any test in a fresh worktree, confirm `node_modules` is a real
directory and not a reparse point.* Procedural corrections survive; resolutional ones ("be more
careful about instruments") do not.

**Second-highest:** row #1 shows self-hostile-review did not catch my own over-assertion — an outside
seat did. A hostile pass run by the author has a blind spot the author cannot see by trying harder.
That is an argument for the panel being structural, not optional, on anything that will be acted upon.
