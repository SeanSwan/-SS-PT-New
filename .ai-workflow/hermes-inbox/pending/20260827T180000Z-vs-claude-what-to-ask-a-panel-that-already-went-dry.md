---
surface: vs-claude
utc: 20260827T180000Z
topic: Swan Coach ownership is pushed and handed off for merge — plus what to ask a review panel that has already reached dry
tags: [swan-coach, authorization, handoff, panel-routing, deploy-readiness]
---

## What I did / learned

- **The workstream is PUSHED and handed off.** Branch
  `claude/coach-endpoint-truth-v2-20260824` @ `97402a75d`, 25 commits, verified on the remote.
  Not merged, not deployed. The merge handoff is
  `docs/ai-workflow/AI-HANDOFF/COACH-OWNERSHIP-MERGE-HANDOFF-2026-08-27.md` and supersedes the
  2026-08-26 one, which now carries a superseded banner rather than reading as current.
- **The transferable lesson from this turn: a panel that has gone DRY is not a spent resource,
  it is a resource pointed at the wrong question.** GLM 5.3 and GLM 5.3 Flash ran seven rounds
  on this code and both returned DRY. Sean's next step is a merge-and-go-live decision, and the
  reflex is to hand them the same brief again. That would spend two seats re-answering a
  question they have already answered twice.
  The unasked questions were never about the code: *is a race shippable given it already exists
  in the live REST route it was copied from; does this cleanup step need to be a script or is a
  manual step enough; what is the rollback if the new denial path misfires; which queued items
  must precede go-live rather than follow it.* None of those are findable by reading a diff, and
  all of them are decisions the seats have the context to inform.
- **Dry means "this artifact has no more defects to give," not "this seat has nothing left."**
  Re-briefing on the same axis produces either silence or manufactured findings, and the second
  is worse — it makes the dryness determination unreadable afterwards.

## Why it matters to Hermes

- When a review reaches dry and work continues, the routing move is to **change the axis**, not
  to change the seat or re-run the brief. Ask what the next decision needs, not what the last
  one needed.
- **Merging to `main` in this repo IS deploying** — Render auto-builds from it. Any "should we
  merge" question is a deploy question and needs a pre-deploy checklist, not a code opinion.
- The handoff carries the checklist that a merge must satisfy. If Hermes is asked "can we ship
  the Coach ownership work", the answer is in §5 of that file, not in a summary of the fixes.

## State right now

- 25 commits pushed; **nothing deployed**; five live cross-tenant defects closed; seven hostile
  rounds to DRY; 9757 backend tests passing against a per-test baseline; 46/46 mutations firing.
- **No CI has ever run any of it** — GitHub Actions is billing-blocked at the account level.
- Top open item is unchanged and is ranked above merging in my own view: an ownership-derivation
  registry field per id-taking command, whose failing list IS the residual-risk inventory. It
  answers whether a second live cross-tenant hole exists among the 138 handlers nobody has read.
- Fable and GPT-5.6 Sol prompts are still outstanding with Sean.

## Mistakes I made

- **Called this turn "not substantial" and skipped the memo, and the gate was right and I was
  wrong.** A merge handoff is a *final plan with transferable facts*, which is explicitly on the
  gate's own list. I had reasoned from "this turn changed no production code" when the gate's
  test is about transferable knowledge, not about lines of code. That is the second time this
  session I applied a gate's narrower phrasing instead of its actual question — the first was
  reading a hook's detection floor as the limit of a duty.
- **Nearly re-briefed two seats on a question they had already answered twice.** Caught while
  writing the handoff's consult section, not before — the reflex was to reuse the working brief
  because it was working.

## External-model calibration

None consulted this turn. Cost: $0.00. Seven-round per-seat calibration is in the previous memo
(`20260827T000000Z-*`).

## Sean owes / blockers

- **Merge/deploy decision**, which is his and is now fully specified in §5 of the handoff.
- **Before that merge:** flush the pending-operations store. Adding `clientId` to the HMAC
  payload invalidates every in-flight signature, and the new denials consume the single-use
  operation, so anything confirmed just before deploy burns with no retry.
- **github.com/settings/billing** — until Actions runs, the merge rests on one machine's word.
